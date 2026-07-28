import { join, resolve } from "node:path";
import {
	CONFIG_DIR_NAME,
	getAgentDir,
	isToolCallEventType,
	type ExtensionAPI,
	type ExtensionCommandContext,
	type ExtensionContext,
} from "@earendil-works/pi-coding-agent";
import {
	fuzzyFilter,
	type AutocompleteItem,
	type AutocompleteProvider,
	type AutocompleteSuggestions,
} from "@earendil-works/pi-tui";
import {
	findReferenceMentions,
	isPathInsideReference,
	isSupportedGitRepository,
	isValidGitBranch,
	isValidReferenceAlias,
	loadReferences,
	materializeGitReference,
	renderReferenceGuidance,
	resolvePathInsideReference,
	writeReferenceEntry,
	type ConfigLocation,
	type ReferenceConfigEntry,
	type ReferenceScope,
	type ResolvedReference,
} from "./reference-registry.ts";

const MAX_SUGGESTIONS = 20;
const WRITE_COMMAND_PATTERN =
	/(?:^|[;&|]\s*|\bsudo\s+)(?:rm|mv|cp|install|mkdir|rmdir|touch|chmod|chown|truncate|tee|sed\s+-i|perl\s+-i|git\s+(?:clean|reset|checkout))\b|(?:^|[^<])>>?/;

function configLocations(ctx: ExtensionContext): ConfigLocation[] {
	return [
		{ scope: "global", path: join(getAgentDir(), "references.json"), trusted: true },
		{
			scope: "project",
			path: join(ctx.cwd, CONFIG_DIR_NAME, "references.json"),
			trusted: ctx.isProjectTrusted(),
		},
	];
}

function extractReferenceToken(textBeforeCursor: string): string | undefined {
	return textBeforeCursor.match(/(?:^|[\s([{"'])@([A-Za-z0-9._-]*)$/)?.[1];
}

function autocompleteItem(reference: ResolvedReference): AutocompleteItem {
	const source = reference.type === "git" ? reference.repository : reference.path;
	return {
		value: `@${reference.name}`,
		label: `@${reference.name}`,
		description: reference.description ?? source,
	};
}

export function createReferenceAutocompleteProvider(
	current: AutocompleteProvider,
	getReferences: () => ResolvedReference[],
): AutocompleteProvider {
	return {
		async getSuggestions(lines, cursorLine, cursorCol, options): Promise<AutocompleteSuggestions | null> {
			const token = extractReferenceToken((lines[cursorLine] ?? "").slice(0, cursorCol));
			if (token === undefined) return current.getSuggestions(lines, cursorLine, cursorCol, options);

			const visible = getReferences().filter((reference) => !reference.hidden);
			const matches = (token
				? fuzzyFilter(visible, token, (reference) => `${reference.name} ${reference.description ?? ""}`)
				: visible
			)
				.slice(0, MAX_SUGGESTIONS)
				.map(autocompleteItem);
			if (options.signal.aborted || matches.length === 0) {
				return current.getSuggestions(lines, cursorLine, cursorCol, options);
			}
			return { prefix: `@${token}`, items: matches };
		},

		applyCompletion(lines, cursorLine, cursorCol, item, prefix) {
			return current.applyCompletion(lines, cursorLine, cursorCol, item, prefix);
		},

		shouldTriggerFileCompletion(lines, cursorLine, cursorCol) {
			return current.shouldTriggerFileCompletion?.(lines, cursorLine, cursorCol) ?? true;
		},
	};
}

function formatReference(reference: ResolvedReference): string {
	const status = reference.available ? "ready" : `unavailable${reference.error ? `: ${reference.error}` : ""}`;
	const source =
		reference.type === "git"
			? `${reference.repository}${reference.branch ? `#${reference.branch}` : ""}`
			: reference.path;
	const flags = [reference.scope, reference.readOnly ? "read-only" : "writable", reference.hidden ? "hidden" : undefined]
		.filter((value) => value !== undefined)
		.join(", ");
	return `@${reference.name}\n  ${source}\n  ${flags}; ${status}${reference.description ? `\n  ${reference.description}` : ""}`;
}

function commandHelp(): string {
	return [
		"Reference commands:",
		"  /reference list",
		"  /reference add",
		"  /reference remove [alias]",
		"  /reference refresh [alias]",
	].join("\n");
}

function commandParts(args: string): { action: string; value?: string } {
	const [action = "list", value] = args.trim().split(/\s+/, 2);
	return { action: action.toLowerCase(), value };
}

function directReferencePath(value: string, references: ResolvedReference[]): string | undefined {
	if (!value.startsWith("@")) return undefined;
	const slash = value.indexOf("/");
	const name = value.slice(1, slash === -1 ? undefined : slash);
	const reference = references.find((item) => item.name === name);
	if (!reference) return undefined;
	return resolvePathInsideReference(reference.path, slash === -1 ? undefined : value.slice(slash + 1));
}

async function selectScope(ctx: ExtensionCommandContext): Promise<ReferenceScope | undefined> {
	if (!ctx.isProjectTrusted()) return "global";
	const selected = await ctx.ui.select("Reference scope", ["project", "global"]);
	return selected === "project" || selected === "global" ? selected : undefined;
}

async function addReference(
	ctx: ExtensionCommandContext,
	references: ResolvedReference[],
	reload: () => Promise<void>,
): Promise<void> {
	if (ctx.mode !== "tui") {
		ctx.ui.notify("/reference add requires TUI mode", "error");
		return;
	}

	const name = (await ctx.ui.input("Reference alias", "docs"))?.trim();
	if (!name) return;
	if (!isValidReferenceAlias(name)) {
		ctx.ui.notify("Aliases may contain only letters, numbers, dots, underscores, and hyphens", "error");
		return;
	}
	if (references.some((reference) => reference.name === name)) {
		const overwrite = await ctx.ui.confirm("Replace reference?", `@${name} already exists. Replace it?`);
		if (!overwrite) return;
	}

	const type = await ctx.ui.select("Reference type", ["local directory", "Git repository"]);
	if (!type) return;
	const scope = await selectScope(ctx);
	if (!scope) return;
	const description = (await ctx.ui.input("Description (optional)"))?.trim() || undefined;
	const hidden = await ctx.ui.confirm("Hidden reference", "Hide this reference from @ autocomplete?");
	const writable = await ctx.ui.confirm("Writable reference", "Allow edit and write tools to modify this reference?");
	let entry: ReferenceConfigEntry;

	if (type === "local directory") {
		const path = (await ctx.ui.input("Directory path", "../shared-docs"))?.trim();
		if (!path) return;
		entry = { path, description, hidden, readOnly: !writable };
	} else {
		const repository = (await ctx.ui.input("Git repository URL", "https://github.com/org/repo.git"))?.trim();
		if (!repository) return;
		if (!isSupportedGitRepository(repository)) {
			ctx.ui.notify("Use an HTTPS, SSH, or git@ repository URL", "error");
			return;
		}
		const branch = (await ctx.ui.input("Branch (optional)"))?.trim() || undefined;
		if (branch !== undefined && !isValidGitBranch(branch)) {
			ctx.ui.notify("Invalid Git branch", "error");
			return;
		}
		entry = { repository, branch, description, hidden, readOnly: !writable };
	}

	const configPath =
		scope === "project" ? join(ctx.cwd, CONFIG_DIR_NAME, "references.json") : join(getAgentDir(), "references.json");
	await writeReferenceEntry(configPath, name, entry);
	await reload();
	ctx.ui.notify(`Added @${name} to ${scope} references`, "info");
}

async function removeReference(
	ctx: ExtensionCommandContext,
	name: string | undefined,
	references: ResolvedReference[],
	reload: () => Promise<void>,
): Promise<void> {
	let selected = name;
	if (!selected && ctx.hasUI) {
		selected = await ctx.ui.select(
			"Remove reference",
			references.map((reference) => reference.name),
		);
	}
	if (!selected) {
		ctx.ui.notify("Usage: /reference remove <alias>", "warning");
		return;
	}
	const reference = references.find((item) => item.name === selected);
	if (!reference) {
		ctx.ui.notify(`Unknown reference: @${selected}`, "error");
		return;
	}
	if (ctx.hasUI) {
		const confirmed = await ctx.ui.confirm("Remove reference?", `Remove @${reference.name} from ${reference.scope} references?`);
		if (!confirmed) return;
	}
	await writeReferenceEntry(reference.configPath, reference.name, undefined);
	await reload();
	ctx.ui.notify(`Removed @${reference.name}`, "info");
}

export default function referencesExtension(pi: ExtensionAPI): void {
	let references: ResolvedReference[] = [];
	let lastContext: ExtensionContext | undefined;

	const refresh = async (ctx: ExtensionContext, onlyName?: string, updateGit = true): Promise<void> => {
		lastContext = ctx;
		const loaded = await loadReferences(configLocations(ctx), getAgentDir());
		const next = await Promise.all(
			loaded.references.map(async (reference) => {
				if (
					!updateGit ||
					reference.type !== "git" ||
					(onlyName !== undefined && reference.name !== onlyName)
				) {
					return reference;
				}
				return materializeGitReference(pi, reference, ctx.signal);
			}),
		);
		if (onlyName !== undefined) {
			const previous = new Map(references.map((reference) => [reference.name, reference]));
			references = next.map((reference) =>
				reference.name === onlyName || reference.type !== "git" ? reference : (previous.get(reference.name) ?? reference),
			);
		} else {
			references = next;
		}
		if (loaded.diagnostics.length > 0 && ctx.hasUI) {
			ctx.ui.notify(
				loaded.diagnostics.map((diagnostic) => `${diagnostic.path}: ${diagnostic.message}`).join("\n"),
				"warning",
			);
		}
	};

	pi.on("session_start", async (_event, ctx) => {
		await refresh(ctx, undefined, false);
		if (ctx.mode === "tui") {
			ctx.ui.addAutocompleteProvider((current) => createReferenceAutocompleteProvider(current, () => references));
		}
	});

	pi.on("before_agent_start", async (event) => {
		const mentions = findReferenceMentions(event.prompt, references);
		const guidance = renderReferenceGuidance(references, mentions);
		if (!guidance) return;
		return { systemPrompt: `${event.systemPrompt}\n\n${guidance}` };
	});

	pi.on("tool_call", async (event) => {
		if (
			isToolCallEventType("read", event) ||
			isToolCallEventType("ls", event) ||
			isToolCallEventType("find", event) ||
			isToolCallEventType("grep", event)
		) {
			const path = event.input.path;
			if (path) {
				const resolvedPath = directReferencePath(path, references);
				if (resolvedPath) event.input.path = resolvedPath;
			}
			return;
		}

		if (isToolCallEventType("edit", event) || isToolCallEventType("write", event)) {
			const resolvedAlias = directReferencePath(event.input.path, references);
			if (resolvedAlias) event.input.path = resolvedAlias;
			const absolutePath = resolve(lastContext?.cwd ?? process.cwd(), event.input.path);
			const reference = references.find(
				(item) => item.readOnly && isPathInsideReference(absolutePath, item),
			);
			if (reference) return { block: true, reason: `@${reference.name} is configured as read-only` };
			return;
		}

		if (isToolCallEventType("bash", event) && WRITE_COMMAND_PATTERN.test(event.input.command)) {
			const reference = references.find(
				(item) =>
					item.readOnly &&
					(event.input.command.includes(item.path) || event.input.command.includes(`@${item.name}`)),
			);
			if (reference) return { block: true, reason: `@${reference.name} is configured as read-only` };
		}
	});

	pi.registerCommand("reference", {
		description: "List, add, remove, or refresh project references",
		getArgumentCompletions: (prefix) => {
			const values = ["list", "add", "remove", "refresh"];
			const [action, value = ""] = prefix.split(/\s+/, 2);
			if (action === "remove" || action === "refresh") {
				return references
					.filter((reference) => reference.name.startsWith(value))
					.map((reference) => ({ value: `${action} ${reference.name}`, label: reference.name }));
			}
			const matches = values.filter((value) => value.startsWith(prefix));
			return matches.length > 0 ? matches.map((value) => ({ value, label: value })) : null;
		},
		handler: async (args, ctx) => {
			const { action, value } = commandParts(args);
			if (action === "list") {
				ctx.ui.notify(
					references.length > 0 ? references.map(formatReference).join("\n\n") : "No references configured",
					"info",
				);
				return;
			}
			if (action === "add") {
				await addReference(ctx, references, () => refresh(ctx));
				return;
			}
			if (action === "remove") {
				await removeReference(ctx, value, references, () => refresh(ctx, undefined, false));
				return;
			}
			if (action === "refresh") {
				if (value && !references.some((reference) => reference.name === value)) {
					ctx.ui.notify(`Unknown reference: @${value}`, "error");
					return;
				}
				await refresh(ctx, value);
				ctx.ui.notify(value ? `Refreshed @${value}` : "Refreshed references", "info");
				return;
			}
			ctx.ui.notify(commandHelp(), "warning");
		},
	});
}
