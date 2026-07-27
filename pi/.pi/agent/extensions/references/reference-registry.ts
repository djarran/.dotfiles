import { createHash } from "node:crypto";
import { access, mkdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { withFileMutationQueue } from "@earendil-works/pi-coding-agent";

export type ReferenceScope = "global" | "project";

export interface LocalReferenceConfig {
	path: string;
	description?: string;
	hidden?: boolean;
	readOnly?: boolean;
}

export interface GitReferenceConfig {
	repository: string;
	branch?: string;
	description?: string;
	hidden?: boolean;
	readOnly?: boolean;
}

export type ReferenceConfigEntry = string | LocalReferenceConfig | GitReferenceConfig;

export interface ReferencesConfig {
	references?: Record<string, ReferenceConfigEntry>;
}

interface ReferenceBase {
	name: string;
	path: string;
	description?: string;
	hidden: boolean;
	readOnly: boolean;
	scope: ReferenceScope;
	configPath: string;
	available: boolean;
	error?: string;
}

export interface LocalReference extends ReferenceBase {
	type: "local";
	sourcePath: string;
}

export interface GitReference extends ReferenceBase {
	type: "git";
	repository: string;
	branch?: string;
}

export type ResolvedReference = LocalReference | GitReference;

export interface ConfigLocation {
	scope: ReferenceScope;
	path: string;
	trusted: boolean;
}

export interface ConfigDiagnostic {
	path: string;
	message: string;
}

export interface LoadReferencesResult {
	references: ResolvedReference[];
	diagnostics: ConfigDiagnostic[];
}

export interface ReferenceMention {
	raw: string;
	name: string;
	suffix?: string;
	path: string;
	reference: ResolvedReference;
}

const ALIAS_PATTERN = /^[A-Za-z0-9._-]+$/;
const MENTION_PATTERN = /(^|[\s([{"'])@([A-Za-z0-9._-]+)(\/[^\s,;:!?)}\]"']*)?/g;

export function isValidReferenceAlias(name: string): boolean {
	return ALIAS_PATTERN.test(name);
}

export function expandHome(value: string): string {
	if (value === "~") return homedir();
	if (value.startsWith("~/")) return join(homedir(), value.slice(2));
	return value;
}

export function resolveLocalReferencePath(value: string, configPath: string): string {
	const expanded = expandHome(value);
	return isAbsolute(expanded) ? resolve(expanded) : resolve(dirname(configPath), expanded);
}

export function gitReferenceCachePath(agentDir: string, repository: string, branch?: string): string {
	const id = createHash("sha256")
		.update(`${repository}\0${branch ?? ""}`)
		.digest("hex")
		.slice(0, 20);
	return join(agentDir, "references", "git", id);
}

export function isSupportedGitRepository(repository: string): boolean {
	return /^(?:https?:\/\/|ssh:\/\/|git@[^:]+:)[^\s]+$/.test(repository);
}

export function isValidGitBranch(branch: string): boolean {
	return (
		branch.length > 0 &&
		!branch.startsWith("-") &&
		!branch.endsWith(".") &&
		!branch.endsWith("/") &&
		!branch.includes("..") &&
		!branch.includes("@{") &&
		!/[\s~^:?*[\\\u0000-\u001f\u007f]/.test(branch)
	);
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function optionalBoolean(value: unknown, field: string): boolean | undefined {
	if (value === undefined) return undefined;
	if (typeof value !== "boolean") throw new Error(`${field} must be a boolean`);
	return value;
}

function optionalString(value: unknown, field: string): string | undefined {
	if (value === undefined) return undefined;
	if (typeof value !== "string") throw new Error(`${field} must be a string`);
	return value;
}

function parseConfigEntry(value: unknown): ReferenceConfigEntry {
	if (typeof value === "string") return value;
	if (!isRecord(value)) throw new Error("entry must be a string or object");

	const path = optionalString(value.path, "path");
	const repository = optionalString(value.repository, "repository");
	if ((path === undefined) === (repository === undefined)) {
		throw new Error("entry must contain exactly one of path or repository");
	}

	const description = optionalString(value.description, "description");
	const hidden = optionalBoolean(value.hidden, "hidden");
	const readOnly = optionalBoolean(value.readOnly, "readOnly");
	const options = {
		...(description === undefined ? {} : { description }),
		...(hidden === undefined ? {} : { hidden }),
		...(readOnly === undefined ? {} : { readOnly }),
	};
	if (path !== undefined) return { path, ...options };

	const branch = optionalString(value.branch, "branch");
	return {
		repository: repository!,
		...(branch === undefined ? {} : { branch }),
		...options,
	};
}

export function parseReferencesConfig(value: unknown): ReferencesConfig {
	if (!isRecord(value)) throw new Error("config must be a JSON object");
	if (value.references === undefined) return {};
	if (!isRecord(value.references)) throw new Error("references must be a JSON object");

	const references: Record<string, ReferenceConfigEntry> = {};
	for (const [name, entry] of Object.entries(value.references)) references[name] = parseConfigEntry(entry);
	return { references };
}

export async function readReferencesConfig(path: string): Promise<ReferencesConfig> {
	try {
		return parseReferencesConfig(JSON.parse(await readFile(path, "utf8")));
	} catch (error) {
		if (isNodeError(error) && error.code === "ENOENT") return {};
		throw error;
	}
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
	return error instanceof Error && "code" in error;
}

function isLocalEntry(entry: ReferenceConfigEntry): entry is string | LocalReferenceConfig {
	return typeof entry === "string" || "path" in entry;
}

async function localAvailability(path: string): Promise<{ available: boolean; error?: string }> {
	try {
		const info = await stat(path);
		return info.isDirectory() ? { available: true } : { available: false, error: "path is not a directory" };
	} catch (error) {
		return { available: false, error: error instanceof Error ? error.message : String(error) };
	}
}

export async function loadReferences(
	locations: ConfigLocation[],
	agentDir: string,
): Promise<LoadReferencesResult> {
	const merged = new Map<string, ResolvedReference>();
	const diagnostics: ConfigDiagnostic[] = [];

	for (const location of locations) {
		if (!location.trusted) continue;
		let config: ReferencesConfig;
		try {
			config = await readReferencesConfig(location.path);
		} catch (error) {
			diagnostics.push({ path: location.path, message: error instanceof Error ? error.message : String(error) });
			continue;
		}

		for (const [name, entry] of Object.entries(config.references ?? {})) {
			if (!isValidReferenceAlias(name)) {
				diagnostics.push({ path: location.path, message: `ignored invalid reference alias: ${name}` });
				continue;
			}

			if (isLocalEntry(entry)) {
				const sourcePath = typeof entry === "string" ? entry : entry.path;
				const path = resolveLocalReferencePath(sourcePath, location.path);
				const availability = await localAvailability(path);
				merged.set(name, {
					type: "local",
					name,
					path,
					sourcePath,
					description: typeof entry === "string" ? undefined : entry.description,
					hidden: typeof entry === "string" ? false : (entry.hidden ?? false),
					readOnly: typeof entry === "string" ? true : (entry.readOnly ?? true),
					scope: location.scope,
					configPath: location.path,
					...availability,
				});
				continue;
			}

			if (!isSupportedGitRepository(entry.repository)) {
				diagnostics.push({ path: location.path, message: `${name}: unsupported Git repository URL` });
				continue;
			}
			if (entry.branch !== undefined && !isValidGitBranch(entry.branch)) {
				diagnostics.push({ path: location.path, message: `${name}: invalid Git branch` });
				continue;
			}
			const path = gitReferenceCachePath(agentDir, entry.repository, entry.branch);
			merged.set(name, {
				type: "git",
				name,
				path,
				repository: entry.repository,
				branch: entry.branch,
				description: entry.description,
				hidden: entry.hidden ?? false,
				readOnly: entry.readOnly ?? true,
				scope: location.scope,
				configPath: location.path,
				available: false,
			});
		}
	}

	return { references: [...merged.values()].sort((a, b) => a.name.localeCompare(b.name)), diagnostics };
}

async function wait(ms: number, signal?: AbortSignal): Promise<void> {
	await new Promise<void>((resolvePromise, reject) => {
		if (signal?.aborted) {
			reject(new Error("Operation aborted"));
			return;
		}
		const timer = setTimeout(resolvePromise, ms);
		signal?.addEventListener(
			"abort",
			() => {
				clearTimeout(timer);
				reject(new Error("Operation aborted"));
			},
			{ once: true },
		);
	});
}

async function acquireCacheLock(path: string, signal?: AbortSignal): Promise<() => Promise<void>> {
	const lockPath = `${path}.lock`;
	await mkdir(dirname(lockPath), { recursive: true });
	const deadline = Date.now() + 30_000;
	while (true) {
		try {
			await mkdir(lockPath);
			return () => rm(lockPath, { recursive: true, force: true });
		} catch (error) {
			if (!isNodeError(error) || error.code !== "EEXIST") throw error;
			if (Date.now() >= deadline) throw new Error(`timed out waiting for reference cache lock: ${lockPath}`);
			await wait(100, signal);
		}
	}
}

export async function materializeGitReference(
	pi: ExtensionAPI,
	reference: GitReference,
	signal?: AbortSignal,
): Promise<GitReference> {
	const release = await acquireCacheLock(reference.path, signal);
	try {
		let exists = true;
		try {
			await access(join(reference.path, ".git"));
		} catch {
			exists = false;
		}

		let result;
		if (!exists) {
			await rm(reference.path, { recursive: true, force: true });
			await mkdir(dirname(reference.path), { recursive: true });
			const args = ["clone", "--depth", "1"];
			if (reference.branch) args.push("--branch", reference.branch);
			args.push("--", reference.repository, reference.path);
			result = await pi.exec("git", args, { signal, timeout: 120_000 });
		} else {
			const refspec = reference.branch ? `refs/heads/${reference.branch}` : "HEAD";
			result = await pi.exec("git", ["fetch", "--depth", "1", "origin", refspec], {
				cwd: reference.path,
				signal,
				timeout: 120_000,
			});
			if (result.code === 0) {
				result = await pi.exec("git", ["checkout", "--detach", "FETCH_HEAD"], {
					cwd: reference.path,
					signal,
					timeout: 30_000,
				});
			}
			if (result.code === 0) {
				result = await pi.exec("git", ["reset", "--hard", "FETCH_HEAD"], {
					cwd: reference.path,
					signal,
					timeout: 30_000,
				});
			}
		}

		if (result.code !== 0) {
			return {
				...reference,
				available: false,
				error: result.stderr.trim() || `git exited with code ${result.code}`,
			};
		}
		return { ...reference, available: true, error: undefined };
	} catch (error) {
		return { ...reference, available: false, error: error instanceof Error ? error.message : String(error) };
	} finally {
		await release();
	}
}

export async function writeReferenceEntry(
	configPath: string,
	name: string,
	entry: ReferenceConfigEntry | undefined,
): Promise<void> {
	await withFileMutationQueue(configPath, async () => {
		const config = await readReferencesConfig(configPath);
		const references = { ...(config.references ?? {}) };
		if (entry === undefined) delete references[name];
		else references[name] = entry;
		await mkdir(dirname(configPath), { recursive: true });
		const temporaryPath = `${configPath}.${process.pid}.${Date.now()}.tmp`;
		await writeFile(temporaryPath, `${JSON.stringify({ references }, null, 2)}\n`, "utf8");
		try {
			await rename(temporaryPath, configPath);
		} catch (error) {
			await rm(temporaryPath, { force: true });
			throw error;
		}
	});
}

export function resolvePathInsideReference(root: string, suffix?: string): string | undefined {
	if (!suffix) return root;
	const candidate = resolve(root, suffix.replace(/^\/+/, ""));
	const relativePath = relative(root, candidate);
	if (relativePath === "" || (!relativePath.startsWith("..") && !isAbsolute(relativePath))) return candidate;
	return undefined;
}

export function findReferenceMentions(text: string, references: ResolvedReference[]): ReferenceMention[] {
	const byName = new Map(references.map((reference) => [reference.name, reference]));
	const mentions: ReferenceMention[] = [];
	MENTION_PATTERN.lastIndex = 0;
	let match = MENTION_PATTERN.exec(text);
	while (match) {
		const name = match[2];
		const reference = name ? byName.get(name) : undefined;
		if (reference) {
			const suffix = match[3]?.slice(1);
			const path = resolvePathInsideReference(reference.path, suffix);
			if (path) mentions.push({ raw: `@${name}${match[3] ?? ""}`, name, suffix, path, reference });
		}
		match = MENTION_PATTERN.exec(text);
	}
	return mentions;
}

export function isPathInsideReference(path: string, reference: ResolvedReference): boolean {
	const absolutePath = resolve(path);
	const relativePath = relative(reference.path, absolutePath);
	return relativePath === "" || (!relativePath.startsWith("..") && !isAbsolute(relativePath));
}

function escapeXml(value: string): string {
	return value.replace(/[<>&'\"]/g, (character) => {
		const replacements: Record<string, string> = {
			"<": "&lt;",
			">": "&gt;",
			"&": "&amp;",
			"'": "&apos;",
			'"': "&quot;",
		};
		return replacements[character] ?? character;
	});
}

export function renderReferenceGuidance(
	references: ResolvedReference[],
	mentions: ReferenceMention[],
): string | undefined {
	const advertised = references.filter((reference) => reference.description !== undefined);
	const visible = new Map(advertised.map((reference) => [reference.name, reference]));
	for (const mention of mentions) visible.set(mention.name, mention.reference);
	if (visible.size === 0) return undefined;

	const lines = [
		"Project references provide additional directories that can be accessed when relevant.",
		"<available_references>",
	];
	for (const reference of [...visible.values()].sort((a, b) => a.name.localeCompare(b.name))) {
		lines.push(
			"  <reference>",
			`    <name>${escapeXml(reference.name)}</name>`,
			`    <path>${escapeXml(reference.path)}</path>`,
			...(reference.description === undefined
				? []
				: [`    <description>${escapeXml(reference.description)}</description>`]),
			`    <available>${reference.available}</available>`,
			"  </reference>",
		);
	}
	lines.push("</available_references>");

	if (mentions.length > 0) {
		lines.push("", "The user referenced these paths:", "<referenced_paths>");
		for (const mention of mentions) {
			lines.push(
				"  <path>",
				`    <mention>${escapeXml(mention.raw)}</mention>`,
				`    <resolved>${escapeXml(mention.path)}</resolved>`,
				"  </path>",
			);
		}
		lines.push("</referenced_paths>");
	}

	lines.push("Use ls, find, grep, and read to inspect reference contents. Do not assume their contents are already in context.");
	return lines.join("\n");
}
