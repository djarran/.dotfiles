import assert from "node:assert/strict";
import { chmodSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test, { after } from "node:test";
import { Effect, Stream } from "effect";
import {
  copilotBackend,
  preferredCopilotEffort,
} from "./src/backends/copilot.ts";
import type { SpawnTask } from "./src/domain.ts";

const originalPath = process.env.PATH;
const mockDir = mkdtempSync(join(tmpdir(), "copilot-acp-test-"));
const mockBinary = join(mockDir, process.platform === "win32" ? "copilot.cmd" : "copilot");
const mockAgent = String.raw`#!/usr/bin/env node
const readline = require("node:readline");
const rl = readline.createInterface({ input: process.stdin });
let pendingPrompt;
const send = (message) => process.stdout.write(JSON.stringify({ jsonrpc: "2.0", ...message }) + "\n");
const update = (sessionUpdate) => send({ method: "session/update", params: { sessionId: "mock-session", update: sessionUpdate } });
rl.on("line", (line) => {
  const message = JSON.parse(line);
  if (message.method === "initialize") {
    send({ id: message.id, result: { protocolVersion: 1, agentCapabilities: { loadSession: true }, agentInfo: { name: "Mock Copilot", version: "1" } } });
  } else if (message.method === "session/new") {
    send({ id: message.id, result: {
      sessionId: "mock-session",
      configOptions: [
        { type: "select", id: "model", name: "Model", category: "model", currentValue: "mock-model", options: [{ value: "mock-model", name: "Mock" }] },
        { type: "select", id: "reasoning_effort", name: "Effort", category: "thought_level", currentValue: "low", options: [{ value: "low", name: "Low" }, { value: "high", name: "High" }] }
      ]
    } });
  } else if (message.method === "session/prompt") {
    const text = message.params.prompt.map((part) => part.text || "").join("");
    if (text.includes("wait forever")) {
      pendingPrompt = message.id;
      update({ sessionUpdate: "agent_message_chunk", content: { type: "text", text: "partial" } });
    } else {
      update({ sessionUpdate: "agent_thought_chunk", content: { type: "text", text: "thinking" } });
      update({ sessionUpdate: "tool_call", toolCallId: "tool-1", title: "Inspect files", name: "read", status: "in_progress", rawInput: { path: "README.md" } });
      update({ sessionUpdate: "tool_call_update", toolCallId: "tool-1", status: "completed", rawOutput: "contents" });
      update({ sessionUpdate: "agent_message_chunk", content: { type: "text", text: "mock answer" } });
      update({ sessionUpdate: "usage_update", used: 1234, size: 64000 });
      send({ id: message.id, result: { stopReason: "end_turn" } });
    }
  } else if (message.method === "session/cancel" && pendingPrompt !== undefined) {
    send({ id: pendingPrompt, result: { stopReason: "cancelled" } });
    pendingPrompt = undefined;
  } else if (message.method === "session/load") {
    if (message.params.sessionId === "diverged-session") {
      send({ method: "session/update", params: { sessionId: "diverged-session", update: { sessionUpdate: "user_message_chunk", messageId: "old-user-1", content: { type: "text", text: "later branch turn" } } } });
    }
    send({ id: message.id, result: { configOptions: [] } });
  } else if (message.method === "session/set_config_option") {
    send({ id: message.id, result: { configOptions: [] } });
  }
});
`;
if (process.platform === "win32") {
  writeFileSync(mockBinary, `@node "%~dp0\\mock-agent.cjs" %*\r\n`);
  writeFileSync(join(mockDir, "mock-agent.cjs"), mockAgent.replace(/^#!.*\n/, ""));
} else {
  writeFileSync(mockBinary, mockAgent);
  chmodSync(mockBinary, 0o755);
}
process.env.PATH = `${mockDir}${process.platform === "win32" ? ";" : ":"}${originalPath ?? ""}`;

after(() => {
  process.env.PATH = originalPath;
  rmSync(mockDir, { recursive: true, force: true });
});

test("Copilot maps the shared off effort to ACP/CLI none", () => {
  assert.equal(preferredCopilotEffort("off"), "none");
  assert.equal(preferredCopilotEffort("minimal"), "minimal");
  assert.equal(preferredCopilotEffort("max"), "max");
  assert.equal(preferredCopilotEffort(undefined), undefined);
});

test("Copilot backend exposes the expected capabilities", async () => {
  assert.equal(copilotBackend.name, "copilot");
  assert.deepEqual(copilotBackend.capabilities, {
    steering: false,
    modelSelection: true,
    reasoningEffort: true,
  });
  assert.equal(await Effect.runPromise(copilotBackend.available), true);
});

test("Copilot ACP session translates streamed output, tools, usage, and completion", async () => {
  const task: SpawnTask = {
    prompt: "inspect the project",
    title: "mock Copilot",
    cwd: process.cwd(),
    reasoningEffort: "low",
    parent: { parentCwd: process.cwd(), projectTrusted: false },
  };

  const result = await Effect.runPromise(
    Effect.scoped(
      Effect.gen(function* () {
        const session = yield* copilotBackend.spawn(task);
        const events = yield* session.events.pipe(
          Stream.takeUntil((event) => event._tag === "RunSettled"),
          Stream.runCollect,
        );
        return { meta: yield* session.meta, events };
      }),
    ),
  );

  assert.equal(result.meta.nativeSessionId, "mock-session");
  assert.equal(result.meta.modelLabel, "mock-model");
  assert.equal(result.meta.nativeTurnCount, 1);
  assert.ok(
    result.events.some(
      (event) => event._tag === "AssistantDelta" && event.delta === "mock answer",
    ),
  );
  assert.ok(
    result.events.some(
      (event) => event._tag === "ToolStart" && event.name === "read",
    ),
  );
  assert.ok(
    result.events.some(
      (event) => event._tag === "ToolEnd" && event.isError === false,
    ),
  );
  const thoughtIndex = result.events.findIndex(
    (event) =>
      event._tag === "AssistantMessage" &&
      event.parts.some((part) => part.type === "thinking"),
  );
  const toolIndex = result.events.findIndex((event) => event._tag === "ToolStart");
  const answerIndex = result.events.findIndex(
    (event) =>
      event._tag === "AssistantMessage" &&
      event.parts.some(
        (part) => part.type === "text" && part.text === "mock answer",
      ),
  );
  assert.ok(thoughtIndex >= 0 && thoughtIndex < toolIndex);
  assert.ok(toolIndex < answerIndex);
  assert.ok(
    result.events.some(
      (event) =>
        event._tag === "UsageChanged" &&
        event.tokens === 1234 &&
        event.contextWindow === 64000,
    ),
  );
  assert.ok(
    result.events.some(
      (event) =>
        event._tag === "RunSettled" &&
        event.outcome._tag === "Completed" &&
        event.outcome.finalText === "mock answer",
    ),
  );
});

test("Copilot ACP resumes with session/load without replaying the original prompt", async () => {
  const task: SpawnTask = {
    prompt: "original prompt",
    title: "resume Copilot",
    cwd: process.cwd(),
    parent: { parentCwd: process.cwd(), projectTrusted: false },
  };

  const events = await Effect.runPromise(
    Effect.scoped(
      Effect.gen(function* () {
        const session = yield* copilotBackend.resume(task, {
          backend: "copilot",
          nativeSessionId: "mock-session",
          nativeTurnCount: 0,
          modelLabel: "mock-model",
        });
        yield* session.send("new turn");
        return yield* session.events.pipe(
          Stream.takeUntil((event) => event._tag === "RunSettled"),
          Stream.runCollect,
        );
      }),
    ),
  );

  const users = events.filter((event) => event._tag === "UserMessage");
  assert.deepEqual(users, [{ _tag: "UserMessage", text: "new turn" }]);
  assert.ok(
    events.some(
      (event) =>
        event._tag === "RunSettled" && event.outcome._tag === "Completed",
    ),
  );
});

test("Copilot ACP refuses to resume divergent native history", async () => {
  const task: SpawnTask = {
    prompt: "original prompt",
    title: "diverged Copilot",
    cwd: process.cwd(),
    parent: { parentCwd: process.cwd(), projectTrusted: false },
  };

  await assert.rejects(
    Effect.runPromise(
      Effect.scoped(
        copilotBackend.resume(task, {
          backend: "copilot",
          nativeSessionId: "diverged-session",
          nativeTurnCount: 0,
        }),
      ),
    ),
    /expected checkpoint 0.*cannot roll back divergent history/,
  );
});

test("Copilot ACP cancellation settles with partial output", async () => {
  const task: SpawnTask = {
    prompt: "wait forever",
    title: "cancel Copilot",
    cwd: process.cwd(),
    parent: { parentCwd: process.cwd(), projectTrusted: false },
  };

  const events = await Effect.runPromise(
    Effect.scoped(
      Effect.gen(function* () {
        const session = yield* copilotBackend.spawn(task);
        yield* session.interrupt;
        return yield* session.events.pipe(
          Stream.takeUntil((event) => event._tag === "RunSettled"),
          Stream.runCollect,
        );
      }),
    ),
  );

  assert.ok(
    events.some(
      (event) =>
        event._tag === "RunSettled" &&
        event.outcome._tag === "Interrupted" &&
        event.outcome.partialText === "partial",
    ),
  );
});
