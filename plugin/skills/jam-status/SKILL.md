---
description: Show all active layers in the current jam session
---

Show all active layers in the current jam session with their role names and code.

## Workflow

IMPORTANT: Use the MCP tool directly as `mcp__dj-claude__jam_status` — do NOT use Bash or search for files.

1. Call `mcp__dj-claude__jam_status`.
2. Display the layers to the user in a readable format.
3. If no layers are active, let the user know and suggest using `/dj-claude:jam` to add some.
