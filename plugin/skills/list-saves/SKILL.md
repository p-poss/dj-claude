---
description: List all saved mix snapshots
argument-hint: ""
---

List all saved mix snapshots with their names, layer counts, and timestamps.

## Your Task

The user wants to see their saved snapshots.

## Workflow

IMPORTANT: Use the MCP tool directly as `mcp__dj-claude__snapshot_list` — do NOT use Bash or search for files.

1. Call `mcp__dj-claude__snapshot_list` (no parameters needed).
2. Present the snapshots in a readable format.
3. If no snapshots exist, suggest using `/dj-claude:save` to save the current mix.

## Example

- `/dj-claude:list-saves`
