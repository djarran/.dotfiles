import assert from "node:assert/strict";
import test from "node:test";
import type { ParentContext, SubagentSnapshot } from "./src/domain.ts";
import {
  createPersistedState,
  readDeliveredIds,
  readPersistedStates,
  SUBAGENT_STATE_ENTRY,
  toRestoredSubagent,
} from "./src/persistence.ts";

function snapshot(status: SubagentSnapshot["status"]): SubagentSnapshot {
  return {
    id: "sa-7",
    origin: "model",
    backend: "claude",
    title: "persist me",
    prompt: "investigate",
    cwd: "/tmp/project",
    status,
    createdAt: 10,
    meta: {
      backend: "claude",
      nativeSessionId: "session-1",
      sessionFilePath: "/tmp/session.jsonl",
    },
    usage: { tokens: 100, contextWindow: 200_000 },
    transcript: [{ kind: "user", text: "investigate" }],
    liveTools: [],
    queued: [],
    finalText: status === "done" ? "answer" : "",
    turns: status === "done" ? 1 : 0,
  };
}

function custom(data: unknown) {
  return { type: "custom", customType: SUBAGENT_STATE_ENTRY, data };
}

test("persistence reduces the active branch to the latest checkpoint", () => {
  const first = createPersistedState(snapshot("running"), {}, "pending");
  const done = createPersistedState(snapshot("done"), { model: "sonnet" }, "delivered");
  const states = readPersistedStates([custom(first), custom(done)]);
  assert.equal(states.size, 1);
  assert.equal(states.get("sa-7")?.snapshot.status, "done");
  assert.equal(states.get("sa-7")?.options.model, "sonnet");
});

test("persistence accepts Copilot backend checkpoints", () => {
  const base = snapshot("done");
  const copilot: SubagentSnapshot = {
    ...base,
    backend: "copilot",
    meta: {
      backend: "copilot",
      nativeSessionId: "copilot-session-1",
      nativeTurnCount: 3,
      sessionFilePath: "/tmp/copilot-session",
    },
  };
  const states = readPersistedStates([
    custom(createPersistedState(copilot, {}, "pending")),
  ]);
  assert.equal(states.get("sa-7")?.snapshot.backend, "copilot");
  assert.equal(
    states.get("sa-7")?.snapshot.meta.nativeSessionId,
    "copilot-session-1",
  );
  assert.equal(states.get("sa-7")?.snapshot.meta.nativeTurnCount, 3);
});

test("delivery evidence repairs a checkpoint written before result delivery", () => {
  const evidence = readDeliveredIds([
    {
      type: "custom_message",
      customType: "subagent-result",
      details: { id: "sa-7", settledAt: 70 },
    },
    {
      type: "message",
      message: {
        role: "toolResult",
        toolName: "subagent_wait",
        details: { results: [{ id: "sa-8", settledAt: 80 }] },
      },
    },
  ]);
  assert.deepEqual([...evidence.delivered], [["sa-7", 70]]);
  assert.deepEqual([...evidence.consumed], [["sa-8", 80]]);
});

test("a stale running checkpoint restores as interrupted without replaying", () => {
  const state = createPersistedState(snapshot("running"), {}, "pending");
  const parent: ParentContext = {
    parentCwd: "/tmp/project",
    projectTrusted: false,
  };
  const restored = toRestoredSubagent(state, parent);
  assert.equal(restored.snapshot.status, "error");
  assert.match(restored.snapshot.errorText ?? "", /exited while.*active/);
  assert.equal(restored.task.prompt, "investigate");
});
