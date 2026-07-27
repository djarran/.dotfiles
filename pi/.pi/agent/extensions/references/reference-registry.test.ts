import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";
import {
	findReferenceMentions,
	gitReferenceCachePath,
	isSupportedGitRepository,
	isValidGitBranch,
	isValidReferenceAlias,
	loadReferences,
	parseReferencesConfig,
	readReferencesConfig,
	renderReferenceGuidance,
	resolvePathInsideReference,
	writeReferenceEntry,
	type LocalReference,
} from "./reference-registry.ts";

test("validates aliases, repositories, and branches", () => {
	assert.equal(isValidReferenceAlias("api.docs-v2"), true);
	assert.equal(isValidReferenceAlias("api/docs"), false);
	assert.equal(isValidReferenceAlias("api docs"), false);
	assert.equal(isSupportedGitRepository("https://github.com/acme/docs.git"), true);
	assert.equal(isSupportedGitRepository("git@github.com:acme/docs.git"), true);
	assert.equal(isSupportedGitRepository("file:///tmp/docs"), false);
	assert.equal(isValidGitBranch("feature/docs"), true);
	assert.equal(isValidGitBranch("../escape"), false);
	assert.equal(isValidGitBranch("-main"), false);
});

test("parses strict reference configuration", () => {
	assert.deepEqual(
		parseReferencesConfig({
			references: {
				docs: "../docs",
				upstream: { repository: "https://github.com/acme/docs.git", branch: "main" },
			},
		}),
		{
			references: {
				docs: "../docs",
				upstream: {
					repository: "https://github.com/acme/docs.git",
					branch: "main",
				},
			},
		},
	);
	assert.throws(
		() => parseReferencesConfig({ references: { bad: { path: "docs", repository: "https://example.com/x" } } }),
		/exactly one/,
	);
});

test("merges global and trusted project references", async (context) => {
	const root = await mkdtemp(join(tmpdir(), "pi-references-"));
	context.after(() => rm(root, { recursive: true, force: true }));
	const agentDir = join(root, "agent");
	const projectDir = join(root, "project");
	const globalDocs = join(root, "global-docs");
	const projectDocs = join(projectDir, "docs");
	await Promise.all([
		mkdir(agentDir),
		mkdir(join(projectDir, ".pi"), { recursive: true }),
		mkdir(globalDocs),
		mkdir(projectDocs, { recursive: true }),
	]);
	const globalConfig = join(agentDir, "references.json");
	const projectConfig = join(projectDir, ".pi", "references.json");
	await writeFile(globalConfig, JSON.stringify({ references: { docs: { path: "../global-docs" }, global: "../global-docs" } }));
	await writeFile(projectConfig, JSON.stringify({ references: { docs: { path: "../docs", description: "Project docs" } } }));

	const loaded = await loadReferences(
		[
			{ scope: "global", path: globalConfig, trusted: true },
			{ scope: "project", path: projectConfig, trusted: true },
		],
		agentDir,
	);
	assert.equal(loaded.diagnostics.length, 0);
	assert.deepEqual(loaded.references.map((reference) => reference.name), ["docs", "global"]);
	const docs = loaded.references.find((reference) => reference.name === "docs");
	assert.equal(docs?.scope, "project");
	assert.equal(docs?.path, projectDocs);
	assert.equal(docs?.available, true);

	const untrusted = await loadReferences(
		[
			{ scope: "global", path: globalConfig, trusted: true },
			{ scope: "project", path: projectConfig, trusted: false },
		],
		agentDir,
	);
	assert.equal(untrusted.references.find((reference) => reference.name === "docs")?.scope, "global");
});

test("resolves mentions and rejects traversal", () => {
	const reference: LocalReference = {
		type: "local",
		name: "docs",
		path: "/tmp/project/docs",
		sourcePath: "docs",
		description: "Documentation & examples",
		hidden: false,
		readOnly: true,
		scope: "project",
		configPath: "/tmp/project/.pi/references.json",
		available: true,
	};
	assert.equal(resolvePathInsideReference(reference.path, "guide/start.md"), "/tmp/project/docs/guide/start.md");
	assert.equal(resolvePathInsideReference(reference.path, "../../secret"), undefined);
	assert.deepEqual(
		findReferenceMentions("Read @docs/guide/start.md, then answer.", [reference]).map((mention) => ({
			raw: mention.raw,
			path: mention.path,
		})),
		[{ raw: "@docs/guide/start.md", path: "/tmp/project/docs/guide/start.md" }],
	);
	assert.equal(findReferenceMentions("Email a@docs.example", [reference]).length, 0);
	const guidance = renderReferenceGuidance([reference], findReferenceMentions("Use @docs", [reference]));
	assert.match(guidance ?? "", /Documentation &amp; examples/);
	assert.match(guidance ?? "", /<resolved>\/tmp\/project\/docs<\/resolved>/);
});

test("writes and removes entries without replacing unrelated entries", async (context) => {
	const root = await mkdtemp(join(tmpdir(), "pi-references-write-"));
	context.after(() => rm(root, { recursive: true, force: true }));
	const path = join(root, ".pi", "references.json");
	await writeReferenceEntry(path, "docs", { path: "../docs", description: "Docs" });
	await writeReferenceEntry(path, "api", { path: "../api" });
	await writeReferenceEntry(path, "docs", undefined);
	assert.deepEqual(await readReferencesConfig(path), { references: { api: { path: "../api" } } });
	assert.match(await readFile(path, "utf8"), /\n$/);
});

test("uses stable, branch-specific Git cache paths", () => {
	const first = gitReferenceCachePath("/tmp/agent", "https://github.com/acme/docs.git", "main");
	assert.equal(first, gitReferenceCachePath("/tmp/agent", "https://github.com/acme/docs.git", "main"));
	assert.notEqual(first, gitReferenceCachePath("/tmp/agent", "https://github.com/acme/docs.git", "next"));
	assert.equal(resolve(first).startsWith("/tmp/agent/references/git/"), true);
});
