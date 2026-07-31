import type {
  PersistedSpawnOptions,
  ReasoningEffort,
  RestoredSubagent,
  SubagentSnapshot,
  TranscriptItem,
  TranscriptPart,
} from "./domain.ts";

export const SUBAGENT_STATE_ENTRY = "subagent-state-v1";
const VERSION = 1 as const;
const MAX_FINAL_TEXT = 64 * 1024;
const MAX_TRANSCRIPT_ITEMS = 128;
const MAX_TRANSCRIPT_TEXT = 16 * 1024;

export type DeliveryState = "pending" | "delivered" | "consumed";

export interface PersistedSubagentState {
  readonly version: typeof VERSION;
  readonly snapshot: SubagentSnapshot;
  readonly options: PersistedSpawnOptions;
  readonly delivery: DeliveryState;
}

function clip(text: string, max = MAX_TRANSCRIPT_TEXT) {
  return text.length <= max ? text : text.slice(-max);
}

function persistPart(part: TranscriptPart): TranscriptPart {
  switch (part.type) {
    case "text":
      return { ...part, text: clip(part.text) };
    case "thinking":
      return { ...part, text: clip(part.text) };
    case "toolCall":
      return {
        ...part,
        argsPreview: part.argsPreview
          ? clip(part.argsPreview)
          : undefined,
      };
  }
}

function persistTranscriptItem(item: TranscriptItem): TranscriptItem {
  switch (item.kind) {
    case "user":
      return { ...item, text: clip(item.text) };
    case "assistant":
      return { ...item, parts: item.parts.map(persistPart) };
    case "toolResult":
      return {
        ...item,
        outputPreview: item.outputPreview
          ? clip(item.outputPreview)
          : undefined,
      };
  }
}

/** Build a bounded checkpoint suitable for a parent-session custom entry. */
export function createPersistedState(
  snapshot: SubagentSnapshot,
  options: PersistedSpawnOptions,
  delivery: DeliveryState,
): PersistedSubagentState {
  return {
    version: VERSION,
    options: { ...options },
    delivery,
    snapshot: {
      ...snapshot,
      meta: { ...snapshot.meta },
      usage:
        snapshot.status === "running"
          ? { contextWindow: snapshot.usage.contextWindow }
          : { ...snapshot.usage },
      transcript:
        snapshot.status === "running"
          ? []
          : snapshot.transcript
              .slice(-MAX_TRANSCRIPT_ITEMS)
              .map(persistTranscriptItem),
      liveAssistant: undefined,
      liveTools: [],
      queued: [],
      finalText:
        snapshot.status === "running"
          ? ""
          : snapshot.finalText.slice(0, MAX_FINAL_TEXT),
      turns: snapshot.status === "running" ? 0 : snapshot.turns,
    },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function isReasoningEffort(value: unknown): value is ReasoningEffort {
  return (
    typeof value === "string" &&
    ["off", "minimal", "low", "medium", "high", "xhigh", "max"].includes(
      value,
    )
  );
}

function parseState(value: unknown): PersistedSubagentState | undefined {
  if (!isRecord(value) || value.version !== VERSION) return undefined;
  const snapshot = value.snapshot;
  if (!isRecord(snapshot)) return undefined;
  if (
    typeof snapshot.id !== "string" ||
    (snapshot.backend !== "pi" &&
      snapshot.backend !== "claude" &&
      snapshot.backend !== "codex") ||
    (snapshot.origin !== "model" && snapshot.origin !== "btw") ||
    typeof snapshot.title !== "string" ||
    typeof snapshot.prompt !== "string" ||
    typeof snapshot.cwd !== "string" ||
    (snapshot.status !== "running" &&
      snapshot.status !== "done" &&
      snapshot.status !== "error") ||
    typeof snapshot.createdAt !== "number" ||
    !isRecord(snapshot.meta) ||
    !isRecord(snapshot.usage) ||
    !Array.isArray(snapshot.transcript) ||
    typeof snapshot.finalText !== "string" ||
    typeof snapshot.turns !== "number"
  ) {
    return undefined;
  }
  const options = isRecord(value.options) ? value.options : {};
  const delivery =
    value.delivery === "delivered" || value.delivery === "consumed"
      ? value.delivery
      : "pending";
  return {
    version: VERSION,
    snapshot: snapshot as unknown as SubagentSnapshot,
    options: {
      model: typeof options.model === "string" ? options.model : undefined,
      reasoningEffort: isReasoningEffort(options.reasoningEffort)
        ? options.reasoningEffort
        : undefined,
    },
    delivery,
  };
}

/** Latest checkpoint per id on the active parent-session branch. */
export function readPersistedStates(
  entries: ReadonlyArray<unknown>,
): Map<string, PersistedSubagentState> {
  const states = new Map<string, PersistedSubagentState>();
  for (const entry of entries) {
    if (!isRecord(entry)) continue;
    if (
      entry.type !== "custom" ||
      entry.customType !== SUBAGENT_STATE_ENTRY
    ) {
      continue;
    }
    const state = parseState(entry.data);
    if (state) states.set(state.snapshot.id, state);
  }
  return states;
}

/** Delivery evidence is authoritative if a crash happened between two writes. */
export function readDeliveredIds(entries: ReadonlyArray<unknown>) {
  const delivered = new Map<string, number | undefined>();
  const consumed = new Map<string, number | undefined>();
  for (const entry of entries) {
    if (!isRecord(entry)) continue;
    if (entry.type === "custom" && entry.customType === "btw-result") {
      const data = isRecord(entry.data) ? entry.data : undefined;
      if (typeof data?.id === "string") {
        delivered.set(
          data.id,
          typeof data.settledAt === "number" ? data.settledAt : undefined,
        );
      }
      continue;
    }
    if (
      entry.type === "custom_message" &&
      entry.customType === "subagent-result"
    ) {
      const details = isRecord(entry.details) ? entry.details : undefined;
      if (typeof details?.id === "string") {
        delivered.set(
          details.id,
          typeof details.settledAt === "number"
            ? details.settledAt
            : undefined,
        );
      }
      continue;
    }
    if (entry.type !== "message" || !isRecord(entry.message)) continue;
    const message = entry.message;
    if (
      message.role === "toolResult" &&
      (message.toolName === "subagent_wait" ||
        message.toolName === "subagent_cancel")
    ) {
      const details = isRecord(message.details) ? message.details : undefined;
      const results = Array.isArray(details?.results) ? details.results : [];
      for (const result of results) {
        if (isRecord(result) && typeof result.id === "string") {
          consumed.set(
            result.id,
            typeof result.settledAt === "number"
              ? result.settledAt
              : undefined,
          );
        }
      }
    }
  }
  return { delivered, consumed };
}

export function toRestoredSubagent(
  state: PersistedSubagentState,
  parent: RestoredSubagent["task"]["parent"],
): RestoredSubagent {
  const staleRunning = state.snapshot.status === "running";
  return {
    snapshot: staleRunning
      ? {
          ...state.snapshot,
          status: "error",
          settledAt: Date.now(),
          errorText: "Parent session exited while this subagent was active",
          liveAssistant: undefined,
          liveTools: [],
          queued: [],
        }
      : state.snapshot,
    task: {
      origin: state.snapshot.origin,
      prompt: state.snapshot.prompt,
      title: state.snapshot.title,
      cwd: state.snapshot.cwd,
      model: state.options.model,
      reasoningEffort: state.options.reasoningEffort,
      parent,
    },
  };
}
