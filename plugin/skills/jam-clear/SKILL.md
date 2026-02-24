---
description: Remove one or all layers from the jam session
argument-hint: "[role]"
---

Remove a layer from the jam session by role, or clear all layers if no role is specified.

## Workflow

IMPORTANT: Use the MCP tool directly as `mcp__dj-claude__jam_clear` — do NOT use Bash or search for files.

1. If `$ARGUMENTS` is provided, use it as the `role` parameter.
2. If no arguments, call without a role to clear all layers.
3. Confirm to the user what was removed.

## Examples

- `/dj-claude:jam-clear drums` — remove just the drums layer
- `/dj-claude:jam-clear` — clear all layers and stop music
