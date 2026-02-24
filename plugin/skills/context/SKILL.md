---
description: Tell DJ Claude what you're working on so the music adapts
argument-hint: "[activity]"
---

Set coding context so DJ Claude generates music that matches your current activity.

## Your Task

The user wants to set their coding context. Parse `$ARGUMENTS` for the activity description.

If no arguments were provided, ask the user what they're working on.

## Workflow

IMPORTANT: Use the MCP tool directly as `mcp__dj-claude__set_context` — do NOT use Bash or search for files.

1. Call `mcp__dj-claude__set_context` with:
   - `activity`: the user's description of what they're doing
   - `auto_adapt`: set to `true` if music is currently playing (check with `mcp__dj-claude__now_playing` first)
2. Confirm the context was set.

## Examples

- `/dj-claude:context debugging test failures`
- `/dj-claude:context writing a new REST API`
- `/dj-claude:context reviewing pull requests`
