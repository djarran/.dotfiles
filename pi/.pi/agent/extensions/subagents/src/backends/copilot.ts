/**
 * GitHub Copilot CLI backend — ACP client over `copilot --acp`.
 *
 * One scoped Copilot process owns one persistent ACP session. ACP
 * `session/update` notifications are translated into normalized SubagentEvents;
 * prompts sent while a turn is active are queued as follow-up turns. Persisted
 * sessions are reopened with `session/load`, and cancellation uses
 * `session/cancel` with a local deadline followed by process-tree teardown.
 */

import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { Readable, Writable } from "node:stream";
import * as acp from "@agentclientprotocol/sdk";
import type { Cause, Scope } from "effect";
import { Effect, Queue, Stream } from "effect";
import type { SubagentBackend, SubagentSession } from "../backend.ts";
import type {
  ReasoningEffort,
  RunOutcome,
  SpawnTask,
  SubagentEvent,
  SubagentMeta,
  TranscriptPart,
} from "../domain.ts";
import { SendError, SpawnError } from "../domain.ts";

const REQUEST_TIMEOUT_MS = 30_000;
const INTERRUPT_FALLBACK_MS = 2_000;
const FORCE_KILL_AFTER_MS = 2_000;
const PREVIEW_MAX_LENGTH = 4_096;

type JsonRecord = Record<string, unknown>;

interface ToolState {
  name: string;
  argsPreview?: string;
  outputPreview?: string;
  ended: boolean;
}

let cachedCopilotBinary: string | null | undefined;

function executable(file: string) {
  try {
    fs.accessSync(file, fs.constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

function resolveCopilotBinary() {
  if (cachedCopilotBinary !== undefined)
    return cachedCopilotBinary ?? undefined;
  const names =
    process.platform === "win32"
      ? ["copilot.exe", "copilot.cmd", "copilot"]
      : ["copilot"];
  for (const directory of (process.env.PATH ?? "").split(path.delimiter)) {
    if (!directory) continue;
    for (const name of names) {
      const candidate = path.join(directory, name);
      if (executable(candidate)) {
        cachedCopilotBinary = candidate;
        return candidate;
      }
    }
  }
  cachedCopilotBinary = null;
  return undefined;
}

function record(value: unknown): JsonRecord | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : undefined;
}

function boundedError(error: unknown) {
  return (error instanceof Error ? error.message : String(error)).slice(0, 4096);
}

function singleLine(text: string) {
  const flattened = text.replace(/\s+/g, " ").trim();
  return flattened ? flattened.slice(0, PREVIEW_MAX_LENGTH) : undefined;
}

function safeJson(value: unknown) {
  try {
    const text = JSON.stringify(value);
    return text && text !== "{}" ? singleLine(text) : undefined;
  } catch {
    return undefined;
  }
}

export function preferredCopilotEffort(
  effort: ReasoningEffort | undefined,
): string | undefined {
  if (effort === "off") return "none";
  return effort;
}

function flattenConfigValues(option: acp.SessionConfigOption) {
  if (option.type !== "select") return [];
  return option.options.flatMap((candidate) =>
    "options" in candidate ? candidate.options : [candidate],
  );
}

function findConfigOption(
  options: ReadonlyArray<acp.SessionConfigOption> | null | undefined,
  category: string,
  id: string,
) {
  return options?.find(
    (option) => option.category === category || option.id === id,
  );
}

function closestEffort(
  requested: ReasoningEffort | undefined,
  option: acp.SessionConfigOption | undefined,
) {
  const preferred = preferredCopilotEffort(requested);
  if (!preferred || !option || option.type !== "select") return preferred;
  const supported = flattenConfigValues(option).map((value) => value.value);
  if (supported.includes(preferred)) return preferred;

  const scale = ["none", "minimal", "low", "medium", "high", "xhigh", "max"];
  const target = scale.indexOf(preferred);
  return supported
    .map((value) => ({ value, index: scale.indexOf(value) }))
    .filter((candidate) => candidate.index >= 0)
    .sort((a, b) => {
      const distance = Math.abs(a.index - target) - Math.abs(b.index - target);
      if (distance !== 0) return distance;
      return requested === "off" ? a.index - b.index : b.index - a.index;
    })[0]?.value;
}

function contentText(content: acp.ContentBlock) {
  if (content.type === "text") return content.text;
  if (content.type === "resource" && "text" in content.resource)
    return content.resource.text;
  return undefined;
}

function toolContentPreview(content: ReadonlyArray<acp.ToolCallContent> | null | undefined) {
  const pieces = (content ?? []).flatMap((item) => {
    if (item.type === "content") {
      const text = contentText(item.content);
      return text ? [text] : [];
    }
    if (item.type === "diff") return [item.path];
    if (item.type === "terminal") return [`terminal ${item.terminalId}`];
    return [];
  });
  return singleLine(pieces.join("\n"));
}

function toolOutputPreview(update: acp.ToolCall | acp.ToolCallUpdate) {
  return (
    safeJson(update.rawOutput) ??
    toolContentPreview(update.content) ??
    ("locations" in update && update.locations
      ? singleLine(update.locations.map((location) => location.path).join(", "))
      : undefined)
  );
}

function copilotSessionPath(sessionId: string) {
  const home = process.env.COPILOT_HOME || path.join(os.homedir(), ".copilot");
  return path.join(home, "session-state", sessionId);
}

function withTimeout<A>(operation: Promise<A>, timeoutMs: number, label: string) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(
      () => reject(new Error(`Copilot ACP ${label} timed out.`)),
      timeoutMs,
    );
  });
  return Promise.race([operation, timeout]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

const makeCopilotSession = (
  task: SpawnTask,
  resumeMeta?: SubagentMeta,
): Effect.Effect<SubagentSession, SpawnError, Scope.Scope> =>
  Effect.gen(function* () {
    const binary = resolveCopilotBinary();
    if (!binary) {
      return yield* new SpawnError({
        message: "copilot executable was not found on PATH.",
      });
    }

    const events = yield* Queue.make<SubagentEvent, Cause.Done>();
    const emit = (event: SubagentEvent) => Queue.offerUnsafe(events, event);

    const effort = preferredCopilotEffort(task.reasoningEffort);
    const args = [
      "--acp",
      "--allow-all-tools",
      "--allow-all-urls",
      // Keep nested orchestration under this extension's global manager/cap.
      "--excluded-tools=task",
      "--excluded-tools=fleet",
      "--no-ask-user",
      "--no-auto-update",
      "--no-remote",
      "--no-remote-export",
      "--no-color",
      ...(task.parent.projectTrusted ? [] : ["--no-custom-instructions"]),
      "-C",
      task.cwd,
      ...(task.model ? ["--model", task.model] : []),
      ...(effort ? ["--effort", effort] : []),
    ];

    const child = yield* Effect.try({
      try: () =>
        spawn(binary, args, {
          cwd: task.cwd,
          env: process.env,
          stdio: ["pipe", "pipe", "pipe"],
          windowsHide: true,
          detached: process.platform !== "win32",
        }),
      catch: (error) => new SpawnError({ message: boundedError(error) }),
    });

    const state = {
      closed: false,
      closing: false,
      exited: false,
      eventsEnded: false,
      activeRun: false,
      interruptRequested: false,
      runSerial: 0,
      text: "",
      finalText: "",
      thinking: "",
      pendingPrompts: [] as string[],
      tools: new Map<string, ToolState>(),
      stderr: "",
      configOptions: undefined as
        | ReadonlyArray<acp.SessionConfigOption>
        | undefined,
      loading: false,
      loadedUserMessageIds: new Set<string>(),
      loadedAnonymousUserMessages: 0,
      settleWaiters: new Set<() => void>(),
      meta: {
        backend: "copilot",
        modelLabel: task.model,
        ...resumeMeta,
      } satisfies SubagentMeta as SubagentMeta,
    };

    const queuedView = () =>
      state.pendingPrompts.map((text) => ({
        text,
        kind: "follow-up" as const,
      }));

    const updateMeta = (patch: Partial<SubagentMeta>) => {
      state.meta = { ...state.meta, ...patch };
      emit({ _tag: "MetaChanged", meta: patch });
    };

    const applyConfigOptions = (
      options: ReadonlyArray<acp.SessionConfigOption> | null | undefined,
    ) => {
      if (!options) return;
      state.configOptions = options;
      const model = findConfigOption(options, "model", "model");
      if (model?.type === "select" && model.currentValue !== state.meta.modelLabel)
        updateMeta({ modelLabel: model.currentValue });
    };

    const flushAssistantMessage = () => {
      const parts: TranscriptPart[] = [];
      if (state.thinking) parts.push({ type: "thinking", text: state.thinking });
      if (state.text) parts.push({ type: "text", text: state.text });
      if (parts.length > 0) emit({ _tag: "AssistantMessage", parts });
      state.text = "";
      state.thinking = "";
    };

    const emitToolEnd = (toolId: string, fallbackError = false) => {
      const tool = state.tools.get(toolId);
      if (!tool || tool.ended) return;
      tool.ended = true;
      emit({
        _tag: "ToolEnd",
        toolId,
        name: tool.name,
        isError: fallbackError,
        outputPreview: tool.outputPreview,
      });
    };

    const handleToolCall = (update: acp.ToolCall) => {
      flushAssistantMessage();
      const name = update.name ?? update.title ?? update.kind ?? "tool";
      const argsPreview = safeJson(update.rawInput);
      const outputPreview = toolOutputPreview(update);
      state.tools.set(update.toolCallId, {
        name,
        argsPreview,
        outputPreview,
        ended: false,
      });
      const part: TranscriptPart = {
        type: "toolCall",
        toolId: update.toolCallId,
        name,
        argsPreview,
      };
      emit({ _tag: "AssistantMessage", parts: [part] });
      emit({
        _tag: "ToolStart",
        toolId: update.toolCallId,
        name,
        argsPreview,
      });
      if (outputPreview) {
        emit({
          _tag: "ToolUpdate",
          toolId: update.toolCallId,
          outputPreview,
        });
      }
      if (update.status === "completed" || update.status === "failed")
        emitToolEnd(update.toolCallId, update.status === "failed");
    };

    const handleToolUpdate = (update: acp.ToolCallUpdate) => {
      let tool = state.tools.get(update.toolCallId);
      if (!tool) {
        flushAssistantMessage();
        const name = update.name ?? update.title ?? update.kind ?? "tool";
        tool = {
          name,
          argsPreview: safeJson(update.rawInput),
          outputPreview: toolOutputPreview(update),
          ended: false,
        };
        state.tools.set(update.toolCallId, tool);
        const part: TranscriptPart = {
          type: "toolCall",
          toolId: update.toolCallId,
          name,
          argsPreview: tool.argsPreview,
        };
        emit({ _tag: "AssistantMessage", parts: [part] });
        emit({
          _tag: "ToolStart",
          toolId: update.toolCallId,
          name,
          argsPreview: tool.argsPreview,
        });
      }
      tool.name = update.name ?? update.title ?? tool.name;
      tool.argsPreview = safeJson(update.rawInput) ?? tool.argsPreview;
      tool.outputPreview = toolOutputPreview(update) ?? tool.outputPreview;
      if (tool.outputPreview) {
        emit({
          _tag: "ToolUpdate",
          toolId: update.toolCallId,
          outputPreview: tool.outputPreview,
        });
      }
      if (update.status === "completed" || update.status === "failed")
        emitToolEnd(update.toolCallId, update.status === "failed");
    };

    const handleSessionUpdate = (params: acp.SessionNotification) => {
      if (
        state.closed ||
        (state.meta.nativeSessionId &&
          params.sessionId !== state.meta.nativeSessionId)
      )
        return;
      const update = params.update;
      if (update.sessionUpdate === "config_option_update") {
        applyConfigOptions(update.configOptions);
        return;
      }
      // session/load replays prior conversation updates. Count native user
      // messages so an older parent branch cannot silently load later child
      // turns, but do not duplicate replayed content in the parent snapshot.
      if (state.loading) {
        if (update.sessionUpdate === "user_message_chunk") {
          if (update.messageId) state.loadedUserMessageIds.add(update.messageId);
          else state.loadedAnonymousUserMessages++;
        }
        return;
      }
      if (!state.activeRun) return;

      switch (update.sessionUpdate) {
        case "agent_message_chunk": {
          const text = contentText(update.content);
          if (text) {
            state.text += text;
            state.finalText += text;
            emit({ _tag: "AssistantDelta", kind: "text", delta: text });
          }
          break;
        }
        case "agent_thought_chunk": {
          const text = contentText(update.content);
          if (text) {
            state.thinking += text;
            emit({ _tag: "AssistantDelta", kind: "thinking", delta: text });
          }
          break;
        }
        case "tool_call":
          handleToolCall(update);
          break;
        case "tool_call_update":
          handleToolUpdate(update);
          break;
        case "usage_update":
          updateMeta({ contextWindow: update.size });
          emit({
            _tag: "UsageChanged",
            tokens: update.used,
            contextWindow: update.size,
          });
          break;
      }
    };

    const permissionResponse = (
      _request: acp.ClientRequestContext<acp.RequestPermissionRequest>,
    ): acp.RequestPermissionResponse => {
      // Required headless permissions are explicit process flags. Any request
      // beyond those flags (notably access outside cwd) fails closed.
      return { outcome: { outcome: "cancelled" } };
    };

    const app = acp
      .client({ name: "pi-subagents" })
      .onRequest(acp.methods.client.session.requestPermission, permissionResponse)
      .onNotification(acp.methods.client.session.update, ({ params }) =>
        handleSessionUpdate(params),
      );
    // Node's web-stream declarations currently differ slightly from the DOM
    // declarations used by the ACP SDK, though both carry Uint8Array chunks.
    const stream = acp.ndJsonStream(
      Writable.toWeb(child.stdin) as unknown as WritableStream<Uint8Array>,
      Readable.toWeb(child.stdout) as unknown as ReadableStream<Uint8Array>,
    );
    const connection = app.connect(stream);
    const agent = connection.agent;

    let startRun!: (text: string) => void;

    const startNextQueued = () => {
      if (state.closed || state.activeRun) return;
      const next = state.pendingPrompts.shift();
      if (next === undefined) return;
      emit({ _tag: "QueueChanged", queued: queuedView() });
      startRun(next);
    };

    const settleRun = (outcome: RunOutcome, serial = state.runSerial) => {
      if (!state.activeRun || serial !== state.runSerial) return;
      flushAssistantMessage();
      for (const [toolId, tool] of state.tools) {
        if (!tool.ended) emitToolEnd(toolId, outcome._tag !== "Completed");
      }

      state.activeRun = false;
      state.interruptRequested = false;
      state.tools.clear();
      emit({ _tag: "RunSettled", outcome });
      for (const waiter of state.settleWaiters) waiter();
      state.settleWaiters.clear();
      queueMicrotask(startNextQueued);
    };

    const waitForSettlement = (serial: number) => {
      if (!state.activeRun || serial !== state.runSerial) return Promise.resolve();
      return new Promise<void>((resolve) => {
        const waiter = () => {
          state.settleWaiters.delete(waiter);
          resolve();
        };
        state.settleWaiters.add(waiter);
      });
    };

    startRun = (text: string) => {
      if (state.closed || state.activeRun || !state.meta.nativeSessionId) return;
      const serial = ++state.runSerial;
      state.activeRun = true;
      state.interruptRequested = false;
      state.text = "";
      state.finalText = "";
      state.thinking = "";
      state.tools.clear();
      emit({ _tag: "UserMessage", text });
      emit({ _tag: "RunStarted" });

      void agent
        .request(acp.methods.agent.session.prompt, {
          sessionId: state.meta.nativeSessionId,
          prompt: [{ type: "text", text }],
        })
        .then(
          (result) => {
            if (!state.activeRun || serial !== state.runSerial) return;
            state.meta = {
              ...state.meta,
              nativeTurnCount: (state.meta.nativeTurnCount ?? 0) + 1,
            };
            emit({
              _tag: "MetaChanged",
              meta: { nativeTurnCount: state.meta.nativeTurnCount },
            });
            const partialText = state.finalText || undefined;
            if (state.interruptRequested || result.stopReason === "cancelled") {
              settleRun({ _tag: "Interrupted", partialText }, serial);
            } else if (result.stopReason === "end_turn") {
              settleRun(
                { _tag: "Completed", finalText: state.finalText },
                serial,
              );
            } else {
              settleRun(
                {
                  _tag: "Failed",
                  errorText: `Copilot stopped with ${result.stopReason}`,
                  partialText,
                },
                serial,
              );
            }
          },
          (error) => {
            if (!state.activeRun || serial !== state.runSerial) return;
            settleRun(
              state.interruptRequested
                ? {
                    _tag: "Interrupted",
                    partialText: state.finalText || undefined,
                  }
                : {
                    _tag: "Failed",
                    errorText: boundedError(error),
                    partialText: state.finalText || undefined,
                  },
              serial,
            );
          },
        );
    };

    const endEvents = () => {
      if (state.eventsEnded) return;
      state.eventsEnded = true;
      Queue.endUnsafe(events);
    };

    const failForProcessExit = (detail: string) => {
      if (state.exited) return;
      state.exited = true;
      if (state.closing) return;
      state.closed = true;
      state.pendingPrompts = [];
      emit({ _tag: "QueueChanged", queued: [] });
      if (state.activeRun) {
        settleRun({
          _tag: "Failed",
          errorText: boundedError(detail),
          partialText: state.finalText || undefined,
        });
      } else {
        emit({ _tag: "BackendError", message: boundedError(detail) });
      }
      endEvents();
    };

    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk: string) => {
      state.stderr = `${state.stderr}${chunk}`.slice(-4096);
    });
    child.once("error", (error) =>
      failForProcessExit(`Copilot ACP failed: ${boundedError(error)}`),
    );
    child.once("exit", (code, signal) => {
      const suffix = singleLine(state.stderr);
      failForProcessExit(
        `Copilot ACP exited (${signal ?? `code ${code ?? "unknown"}`})${suffix ? `: ${suffix}` : ""}`,
      );
    });
    void connection.closed.then(() => {
      if (state.closing || state.closed) return;
      const detail = "Copilot ACP connection closed unexpectedly";
      state.closed = true;
      state.pendingPrompts = [];
      emit({ _tag: "QueueChanged", queued: [] });
      if (state.activeRun) {
        settleRun({
          _tag: "Failed",
          errorText: detail,
          partialText: state.finalText || undefined,
        });
      } else {
        emit({ _tag: "BackendError", message: detail });
      }
      endEvents();
      void terminateChild(child, () => state.exited);
    });

    yield* Effect.addFinalizer(() =>
      Effect.promise(async () => {
        if (state.closing) return;
        state.closing = true;
        if (state.activeRun) {
          settleRun({
            _tag: "Interrupted",
            partialText: state.finalText || undefined,
          });
        }
        state.closed = true;
        state.pendingPrompts = [];
        connection.close();
        child.stdin.end();
        await waitForExit(child, () => state.exited, 250);
        await terminateChild(child, () => state.exited);
        endEvents();
      }),
    );

    const initialized = yield* Effect.tryPromise({
      try: () =>
        withTimeout(
          agent.request(acp.methods.agent.initialize, {
            protocolVersion: acp.PROTOCOL_VERSION,
            clientCapabilities: {},
            clientInfo: { name: "pi-subagents", version: "2.0.0" },
          }),
          REQUEST_TIMEOUT_MS,
          "initialize",
        ),
      catch: (error) => new SpawnError({ message: boundedError(error) }),
    });

    if (initialized.protocolVersion !== acp.PROTOCOL_VERSION) {
      return yield* new SpawnError({
        message: `Copilot selected unsupported ACP protocol version ${initialized.protocolVersion}.`,
      });
    }
    if (resumeMeta?.nativeSessionId && !initialized.agentCapabilities?.loadSession) {
      return yield* new SpawnError({
        message: "Copilot ACP does not support session/load.",
      });
    }

    const sessionResult = yield* Effect.tryPromise({
      try: async () => {
        if (resumeMeta?.nativeSessionId) {
          if (resumeMeta.nativeTurnCount === undefined) {
            throw new Error(
              "Persisted Copilot session has no native turn checkpoint.",
            );
          }
          state.meta = {
            ...state.meta,
            nativeSessionId: resumeMeta.nativeSessionId,
          };
          state.loading = true;
          let loaded: acp.LoadSessionResponse;
          try {
            loaded = await withTimeout(
              agent.request(acp.methods.agent.session.load, {
                sessionId: resumeMeta.nativeSessionId,
                cwd: task.cwd,
                mcpServers: [],
              }),
              REQUEST_TIMEOUT_MS,
              "session/load",
            );
          } finally {
            state.loading = false;
          }
          const loadedTurnCount =
            state.loadedUserMessageIds.size + state.loadedAnonymousUserMessages;
          if (loadedTurnCount !== resumeMeta.nativeTurnCount) {
            throw new Error(
              `Persisted Copilot session has ${loadedTurnCount} turns, expected checkpoint ${resumeMeta.nativeTurnCount}; ACP cannot roll back divergent history.`,
            );
          }
          return { sessionId: resumeMeta.nativeSessionId, ...loaded };
        }
        return withTimeout(
          agent.request(acp.methods.agent.session.new, {
            cwd: task.cwd,
            mcpServers: [],
          }),
          REQUEST_TIMEOUT_MS,
          "session/new",
        );
      },
      catch: (error) =>
        new SpawnError({
          message: `${boundedError(error)}${initialized.authMethods?.length ? " Run `copilot login` if authentication is required." : ""}`,
        }),
    });

    const sessionId = sessionResult.sessionId;
    if (!sessionId) {
      return yield* new SpawnError({
        message: "Copilot ACP returned no session id.",
      });
    }

    state.meta = {
      ...resumeMeta,
      backend: "copilot",
      modelLabel: task.model ?? resumeMeta?.modelLabel,
      nativeSessionId: sessionId,
      nativeTurnCount: resumeMeta?.nativeTurnCount ?? 0,
      sessionFilePath: copilotSessionPath(sessionId),
    };
    applyConfigOptions(sessionResult.configOptions);

    // Copilot also exposes its current model in a currently non-standard
    // `models` response member. Config options remain the portable fallback.
    const models = record(record(sessionResult)?.models);
    const currentModel =
      typeof models?.currentModelId === "string"
        ? models.currentModelId
        : undefined;
    if (currentModel) state.meta = { ...state.meta, modelLabel: currentModel };

    const configure = async () => {
      let options = state.configOptions;
      const modelOption = findConfigOption(options, "model", "model");
      if (task.model && modelOption?.type === "select") {
        const supported = flattenConfigValues(modelOption).map(
          (value) => value.value,
        );
        if (!supported.includes(task.model)) {
          throw new Error(
            `Copilot model "${task.model}" is unavailable. Supported: ${supported.join(", ") || "none"}.`,
          );
        }
        if (modelOption.currentValue !== task.model) {
          const response = await agent.request(
            acp.methods.agent.session.setConfigOption,
            { sessionId, configId: modelOption.id, value: task.model },
          );
          options = response.configOptions;
          applyConfigOptions(options);
        }
      }

      const effortOption = findConfigOption(
        options,
        "thought_level",
        "reasoning_effort",
      );
      const selectedEffort = closestEffort(task.reasoningEffort, effortOption);
      if (
        selectedEffort &&
        effortOption?.type === "select" &&
        effortOption.currentValue !== selectedEffort
      ) {
        const response = await agent.request(
          acp.methods.agent.session.setConfigOption,
          {
            sessionId,
            configId: effortOption.id,
            value: selectedEffort,
          },
        );
        applyConfigOptions(response.configOptions);
      }
    };

    yield* Effect.tryPromise({
      try: () => withTimeout(configure(), REQUEST_TIMEOUT_MS, "configuration"),
      catch: (error) => new SpawnError({ message: boundedError(error) }),
    });

    emit({ _tag: "MetaChanged", meta: state.meta });
    if (!resumeMeta) startRun(task.prompt);

    return {
      meta: Effect.sync(() => state.meta),
      events: Stream.fromQueue(events),
      send: (text) =>
        Effect.suspend((): Effect.Effect<void, SendError> => {
          if (state.closed) {
            return new SendError({ message: "Subagent session is closed." });
          }
          if (state.activeRun) {
            state.pendingPrompts.push(text);
            emit({ _tag: "QueueChanged", queued: queuedView() });
            return Effect.void;
          }
          return Effect.sync(() => startRun(text));
        }),
      interrupt: Effect.promise(async () => {
        if (state.closed || !state.activeRun || !state.meta.nativeSessionId)
          return;
        const serial = state.runSerial;
        const settled = waitForSettlement(serial);
        state.pendingPrompts = [];
        emit({ _tag: "QueueChanged", queued: [] });
        state.interruptRequested = true;
        try {
          await agent.notify(acp.methods.agent.session.cancel, {
            sessionId: state.meta.nativeSessionId,
          });
        } catch (error) {
          if (!state.closed)
            emit({ _tag: "BackendError", message: boundedError(error) });
        }

        let interruptDeadline: ReturnType<typeof setTimeout> | undefined;
        const acknowledged = await Promise.race([
          settled.then(() => true),
          new Promise<false>((resolve) => {
            interruptDeadline = setTimeout(
              () => resolve(false),
              INTERRUPT_FALLBACK_MS,
            );
          }),
        ]).finally(() => {
          if (interruptDeadline) clearTimeout(interruptDeadline);
        });
        if (acknowledged || !state.activeRun || serial !== state.runSerial) return;

        settleRun(
          { _tag: "Interrupted", partialText: state.finalText || undefined },
          serial,
        );
        // Do not expose an idle-looking session while a native turn may still
        // be executing. Close first, then wait for process-tree teardown.
        state.closed = true;
        connection.close();
        child.stdin.end();
        await terminateChild(child, () => state.exited);
        endEvents();
      }),
    } satisfies SubagentSession;
  });

function killTree(
  child: ChildProcessWithoutNullStreams,
  signal: NodeJS.Signals,
) {
  if (process.platform === "win32" && child.pid) {
    try {
      const killer = spawn(
        "taskkill",
        [
          "/pid",
          String(child.pid),
          "/T",
          ...(signal === "SIGKILL" ? ["/F"] : []),
        ],
        { stdio: "ignore", windowsHide: true },
      );
      const killDirect = () => {
        try {
          child.kill(signal);
        } catch {
          // Process may already be gone.
        }
      };
      killer.once("error", killDirect);
      killer.once("exit", (code) => {
        if (code !== 0) killDirect();
      });
      killer.unref();
      return;
    } catch {
      // Fall through to a direct signal.
    }
  }
  if (process.platform !== "win32" && child.pid) {
    try {
      process.kill(-child.pid, signal);
      return;
    } catch {
      // The group may already be gone.
    }
  }
  try {
    child.kill(signal);
  } catch {
    // Process may already be gone.
  }
}

function waitForExit(
  child: ChildProcessWithoutNullStreams,
  exited: () => boolean,
  timeoutMs: number,
) {
  if (exited()) return Promise.resolve();
  return new Promise<void>((resolve) => {
    let done = false;
    const timer = setTimeout(finish, timeoutMs);
    function finish() {
      if (done) return;
      done = true;
      clearTimeout(timer);
      child.off("exit", finish);
      resolve();
    }
    child.once("exit", finish);
  });
}

function terminateChild(
  child: ChildProcessWithoutNullStreams,
  exited: () => boolean,
) {
  if (exited()) return Promise.resolve();
  return new Promise<void>((resolve) => {
    let done = false;
    let forceTimer: ReturnType<typeof setTimeout> | undefined;
    let lastTimer: ReturnType<typeof setTimeout> | undefined;
    const finish = () => {
      if (done) return;
      done = true;
      if (forceTimer) clearTimeout(forceTimer);
      if (lastTimer) clearTimeout(lastTimer);
      resolve();
    };
    child.once("exit", finish);
    killTree(child, "SIGTERM");
    forceTimer = setTimeout(() => {
      if (!exited()) killTree(child, "SIGKILL");
    }, FORCE_KILL_AFTER_MS);
    lastTimer = setTimeout(finish, FORCE_KILL_AFTER_MS + 500);
  });
}

export const copilotBackend: SubagentBackend = {
  name: "copilot",
  capabilities: {
    steering: false,
    modelSelection: true,
    reasoningEffort: true,
  },
  available: Effect.sync(() => resolveCopilotBinary() !== undefined),
  spawn: (task) => makeCopilotSession(task),
  resume: (task, meta) =>
    meta.nativeSessionId
      ? makeCopilotSession(task, meta)
      : Effect.fail(
          new SpawnError({
            message: "Persisted Copilot session has no ACP session id.",
          }),
        ),
};
