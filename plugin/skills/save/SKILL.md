---
description: Save the current mix as a named snapshot
argument-hint: "[name]"
---

Save the current mix (all layers and composed code) as a named snapshot for later recall.

## Your Task

The user wants to save a snapshot. Parse `$ARGUMENTS` for the snapshot name.

If no arguments were provided, ask the user for a name.

## Workflow

IMPORTANT: Use the MCP tool directly as `mcp__dj-claude__snapshot_save` — do NOT use Bash or search for files.

1. Call `mcp__dj-claude__snapshot_save` with the `name` from `$ARGUMENTS`.
2. Confirm the snapshot was saved.

## Examples

- `/dj-claude:save verse1`
- `/dj-claude:save chill-mix`
- `/dj-claude:save drop`
