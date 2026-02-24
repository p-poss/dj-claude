---
description: Restore a previously saved mix snapshot
argument-hint: "[name]"
---

Load a previously saved mix snapshot — restores all layers and resumes playback.

## Your Task

The user wants to load a snapshot. Parse `$ARGUMENTS` for the snapshot name.

If no arguments were provided, call `mcp__dj-claude__snapshot_list` first to show available snapshots, then ask the user which one to load.

## Workflow

IMPORTANT: Use the MCP tools directly as `mcp__dj-claude__snapshot_load` and `mcp__dj-claude__snapshot_list` — do NOT use Bash or search for files.

1. If no name provided, call `mcp__dj-claude__snapshot_list` to show options.
2. Call `mcp__dj-claude__snapshot_load` with the `name` from `$ARGUMENTS`.
3. Confirm the snapshot was loaded and music resumed.

## Examples

- `/dj-claude:load verse1`
- `/dj-claude:load chill-mix`
