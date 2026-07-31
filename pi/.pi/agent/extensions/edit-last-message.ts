import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { AssistantMessage } from "@earendil-works/pi-ai";
import {
  getAgentDir,
  type ExtensionAPI,
} from "@earendil-works/pi-coding-agent";
import { Text } from "@earendil-works/pi-tui";

function textContent(content: unknown): string {
  if (!Array.isArray(content)) return "";

  return content
    .filter(
      (block): block is { type: "text"; text: string } =>
        typeof block === "object" &&
        block !== null &&
        "type" in block &&
        block.type === "text" &&
        "text" in block &&
        typeof block.text === "string",
    )
    .map((block) => block.text)
    .join("\n\n");
}

async function externalEditorCommand(): Promise<string> {
  try {
    const settings = JSON.parse(
      await readFile(join(getAgentDir(), "settings.json"), "utf8"),
    ) as { externalEditor?: unknown };

    if (
      typeof settings.externalEditor === "string" &&
      settings.externalEditor.trim()
    ) {
      return settings.externalEditor.trim();
    }
  } catch {
    // Fall back to the environment or platform default.
  }

  return (
    process.env.VISUAL ??
    process.env.EDITOR ??
    (process.platform === "win32" ? "notepad" : "nano")
  );
}

async function editExternally(content: string): Promise<string | undefined> {
  const directory = await mkdtemp(join(tmpdir(), "pi-edit-last-"));
  const path = join(directory, "response.md");

  try {
    await writeFile(path, content, "utf8");

    const command = await externalEditorCommand();
    const [editor, ...args] = command.split(/\s+/);
    if (!editor) throw new Error("External editor command is empty");

    const exitCode = await new Promise<number | null>((resolve, reject) => {
      const child = spawn(editor, [...args, path], {
        stdio: "inherit",
        shell: process.platform === "win32",
      });
      child.once("error", reject);
      child.once("close", resolve);
    });

    if (exitCode !== 0) return undefined;
    return (await readFile(path, "utf8")).replace(/\n$/, "");
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

export default function editLastMessageExtension(pi: ExtensionAPI) {
  pi.registerCommand("edit-last", {
    description: "Edit the latest assistant response in an external editor",
    handler: async (_args, ctx) => {
      if (ctx.mode !== "tui") {
        ctx.ui.notify("/edit-last requires interactive mode", "error");
        return;
      }

      await ctx.waitForIdle();

      const branch = ctx.sessionManager.getBranch();
      let assistantMessage: AssistantMessage | undefined;

      for (let index = branch.length - 1; index >= 0; index--) {
        const entry = branch[index];
        if (entry?.type === "message" && entry.message.role === "assistant") {
          assistantMessage = entry.message;
          break;
        }
      }

      if (!assistantMessage) {
        ctx.ui.notify("No assistant response to edit", "warning");
        return;
      }

      const markdown = textContent(assistantMessage.content);
      if (!markdown.trim()) {
        ctx.ui.notify("The latest assistant response has no text", "warning");
        return;
      }

      const edited = await ctx.ui.custom<string | undefined>(
        (tui, theme, _keybindings, done) => {
          setTimeout(() => {
            void (async () => {
              tui.stop();
              try {
                done(await editExternally(markdown));
              } catch (error) {
                done(undefined);
                ctx.ui.notify(
                  `Could not open external editor: ${error instanceof Error ? error.message : String(error)}`,
                  "error",
                );
              } finally {
                tui.start();
                tui.requestRender(true);
              }
            })();
          }, 0);

          return new Text(theme.fg("muted", "Opening external editor…"), 1, 1);
        },
      );

      if (edited !== undefined) ctx.ui.setEditorText(edited);
    },
  });
}
