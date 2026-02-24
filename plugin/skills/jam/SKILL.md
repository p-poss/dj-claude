---
description: Add a layer to the jam session — drums, bass, melody, chords, pads, fx, etc.
argument-hint: "[role] [prompt]"
---

Add or update a single layer in a collaborative jam session. Layers are composed together with `stack()`.

## Your Task

The user wants to add or update a layer in the jam. Parse `$ARGUMENTS` for a role and prompt.

If no arguments were provided, ask the user what role and sound they want.

## Workflow

IMPORTANT: Use the MCP tool directly as `mcp__dj-claude__jam` — do NOT use Bash or search for files.

1. Parse the role (first word) and prompt (rest) from `$ARGUMENTS`. Common roles: drums, bass, melody, chords, pads, lead, hats, percussion, fx, atmosphere.
2. Call `mcp__dj-claude__jam` with `role` and `prompt` parameters.
3. Show the user short MC commentary about the layer that was added.

## Examples

- `/dj-claude:jam drums four-on-the-floor house kick`
- `/dj-claude:jam bass deep sub in C minor`
- `/dj-claude:jam melody ethereal sine lead with delay`
