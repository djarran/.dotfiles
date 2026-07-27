# References extension

Registers named local directories and Git repositories that can be mentioned in Pi prompts.

## Session usage

List configured references:

```text
/reference list
```

Add one interactively:

```text
/reference add
```

Then mention it in a prompt:

```text
Summarize @docs
Compare @upstream/src/auth.ts with our implementation
```

Typing `@` opens autocomplete for non-hidden references. A mention does not inject the whole directory. It gives the model the resolved path so it can inspect relevant files with `ls`, `find`, `grep`, and `read`.

Other commands:

```text
/reference remove docs
/reference refresh
/reference refresh upstream
```

`refresh` reloads configuration and updates Git checkouts.

## Configuration

The `/reference add` wizard writes either project configuration:

```text
<project>/.pi/references.json
```

or global configuration:

```text
~/.pi/agent/references.json
```

Configuration can also be edited directly:

```json
{
  "references": {
    "docs": {
      "path": "../docs",
      "description": "Project documentation"
    },
    "upstream": {
      "repository": "https://github.com/acme/project.git",
      "branch": "main",
      "description": "Upstream source"
    }
  }
}
```

Relative local paths are resolved from the `references.json` file. Project entries override global entries with the same alias.

Entry options:

- `description`: advertises the reference to the model even when it is not explicitly mentioned.
- `hidden`: excludes the alias from autocomplete; direct mentions still work.
- `readOnly`: blocks `edit`, `write`, and recognizable mutating shell commands targeting the reference. Defaults to `true`.

String shorthand creates a read-only local reference:

```json
{
  "references": {
    "docs": "../docs"
  }
}
```

Git repositories are cached under `~/.pi/agent/references/git/` (or the configured Pi agent directory). Missing repositories are cloned; existing checkouts are fetched and reset to the configured remote branch during refresh.

Aliases may contain letters, numbers, dots, underscores, and hyphens.
