import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";

const execFileAsync = promisify(execFile);
const DARK_THEME = "kanagawa-wave";
const LIGHT_THEME = "kanagawa-lotus";

async function systemTheme() {
  const { stdout } = await execFileAsync("gsettings", ["get", "org.gnome.desktop.interface", "color-scheme"]);
  return stdout.includes("prefer-dark") ? DARK_THEME : LIGHT_THEME;
}

export default function (pi: ExtensionAPI) {
  let timer: ReturnType<typeof setInterval> | undefined;
  let current: string | undefined;
  let running = false;

  async function sync(ctx: ExtensionContext) {
    if (running) return;
    running = true;
    const next = await systemTheme().catch(() => undefined);
    running = false;
    if (!next || next === current) return;
    const result = ctx.ui.setTheme(next);
    if (!result.success) {
      ctx.ui.notify(`Unable to select ${next}: ${result.error}`, "error");
      return;
    }
    current = next;
  }

  pi.on("session_start", async (_event, ctx) => {
    if (ctx.mode !== "tui") return;
    await sync(ctx);
    timer = setInterval(() => void sync(ctx), 2000);
    timer.unref?.();
  });

  pi.on("session_shutdown", () => {
    if (timer) clearInterval(timer);
    timer = undefined;
  });
}
