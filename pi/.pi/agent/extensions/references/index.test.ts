import assert from "node:assert/strict";
import test from "node:test";
import type { AutocompleteProvider } from "@earendil-works/pi-tui";
import { createReferenceAutocompleteProvider } from "./index.ts";
import type { LocalReference } from "./reference-registry.ts";

const current: AutocompleteProvider = {
	async getSuggestions() {
		return { prefix: "fallback", items: [{ value: "fallback", label: "fallback" }] };
	},
	applyCompletion(lines, cursorLine, cursorCol) {
		return { lines, cursorLine, cursorCol };
	},
};

function reference(name: string, hidden = false): LocalReference {
	return {
		type: "local",
		name,
		path: `/tmp/${name}`,
		sourcePath: name,
		description: `${name} documentation`,
		hidden,
		readOnly: true,
		scope: "project",
		configPath: "/tmp/.pi/references.json",
		available: true,
	};
}

test("completes visible reference aliases", async () => {
	const provider = createReferenceAutocompleteProvider(current, () => [reference("docs"), reference("hidden", true)]);
	const result = await provider.getSuggestions(["Read @do"], 0, 8, { signal: new AbortController().signal });
	assert.equal(result?.prefix, "@do");
	assert.deepEqual(result?.items.map((item) => item.value), ["@docs"]);
});

test("delegates autocomplete outside reference syntax", async () => {
	const provider = createReferenceAutocompleteProvider(current, () => [reference("docs")]);
	const result = await provider.getSuggestions(["Read docs"], 0, 9, { signal: new AbortController().signal });
	assert.equal(result?.prefix, "fallback");
});
