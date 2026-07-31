import assert from "node:assert/strict";
import test from "node:test";
import { Effect } from "effect";
import { codexBackend } from "./src/backends/codex.ts";
import type { ParentContext, SpawnTask } from "./src/domain.ts";
import { SubagentManager } from "./src/manager.ts";
import { createSubagentRuntime, runTool } from "./src/runtime.ts";

const parent: ParentContext = {
  parentCwd: process.cwd(),
  projectTrusted: false,
};

function task(prompt: string): SpawnTask {
  return {
    prompt,
    title: "live Codex test",
    cwd: process.cwd(),
    parent,
  };
}

function deadline<A>(operation: Promise<A>, timeoutMs: number) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(
      () => reject(new Error(`Live Codex test exceeded ${timeoutMs}ms`)),
      timeoutMs,
    );
  });
  return Promise.race([operation, timeout]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

async function codexAvailable() {
  return Effect.runPromise(codexBackend.available);
}

test(
  "Codex backend completes a live manager run",
  { timeout: 75_000 },
  async (t) => {
    if (!(await codexAvailable())) {
      t.skip("codex executable is unavailable");
      return;
    }

    const runtime = createSubagentRuntime();
    try {
      const manager = await runtime.runPromise(SubagentManager);
      const spawned = await runTool(
        runtime,
        manager.spawn("codex", task("Reply with exactly: hello codex")),
      );

      await deadline(runTool(runtime, manager.waitFor([spawned.id])), 60_000);
      const done = manager.view.get(spawned.id);
      assert.equal(done?.status, "done");
      assert.match(done?.finalText ?? "", /hello codex/i);
      assert.equal(done?.meta.backend, "codex");
      assert.ok(done?.meta.nativeSessionId);
      assert.ok(done?.meta.sessionFilePath);
    } finally {
      await runtime.dispose();
    }
  },
);

test(
  "Codex backend resumes a persisted thread for another turn",
  { timeout: 120_000 },
  async (t) => {
    if (!(await codexAvailable())) {
      t.skip("codex executable is unavailable");
      return;
    }

    const firstRuntime = createSubagentRuntime();
    let persisted;
    try {
      const first = await firstRuntime.runPromise(SubagentManager);
      const spawned = await runTool(
        firstRuntime,
        first.spawn("codex", task("Reply with exactly: first codex turn")),
      );
      await deadline(runTool(firstRuntime, first.waitFor([spawned.id])), 60_000);
      persisted = first.view.get(spawned.id);
      assert.ok(persisted);
      assert.equal(persisted.meta.nativeTurnCount, 1);
    } finally {
      await firstRuntime.dispose();
    }

    const secondRuntime = createSubagentRuntime();
    try {
      const second = await secondRuntime.runPromise(SubagentManager);
      await runTool(
        secondRuntime,
        second.restore([{ snapshot: persisted, task: task("Reply with exactly: first codex turn") }]),
      );
      await runTool(secondRuntime, second.send(persisted.id, "Reply with exactly: second codex turn"));
      await deadline(runTool(secondRuntime, second.waitFor([persisted.id])), 60_000);
      assert.match(second.view.get(persisted.id)?.finalText ?? "", /second codex turn/i);
      assert.equal(second.view.get(persisted.id)?.meta.nativeTurnCount, 2);
    } finally {
      await secondRuntime.dispose();
    }
  },
);

test(
  "Codex backend interrupt settles a live manager run",
  { timeout: 30_000 },
  async (t) => {
    if (!(await codexAvailable())) {
      t.skip("codex executable is unavailable");
      return;
    }

    const runtime = createSubagentRuntime();
    try {
      const manager = await runtime.runPromise(SubagentManager);
      const spawned = await runTool(
        runtime,
        manager.spawn(
          "codex",
          task("Run `sleep 30`, then reply with the word finished."),
        ),
      );

      await new Promise((resolve) => setTimeout(resolve, 250));
      const result = await deadline(
        runTool(runtime, manager.cancel([spawned.id])),
        10_000,
      );
      assert.equal(result[0]?.cancelled, true);
      assert.equal(manager.view.get(spawned.id)?.status, "error");
      assert.equal(manager.view.get(spawned.id)?.errorText, "Run was aborted");
    } finally {
      await runtime.dispose();
    }
  },
);
