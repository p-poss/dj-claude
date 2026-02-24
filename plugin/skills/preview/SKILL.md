---
description: Preview a jam layer without adding it — audition before committing
argument-hint: "[role] [prompt]"
---

Preview what a jam layer would sound like without actually adding it to the mix.

## Your Task

The user wants to preview a layer. Parse `$ARGUMENTS` for a role and prompt.

If no arguments were provided, ask the user what role and sound they want to preview.

## Workflow

IMPORTANT: Use the MCP tool directly as `mcp__dj-claude__jam_preview` — do NOT use Bash or search for files.

1. Parse the role (first word) and prompt (rest) from `$ARGUMENTS`.
2. Call `mcp__dj-claude__jam_preview` with `role` and `prompt` parameters.
3. Show the user the generated code and commentary. Remind them this is a preview — use `/dj-claude:jam` to actually add it.

## Examples

- `/dj-claude:preview drums four-on-the-floor house kick`
- `/dj-claude:preview bass deep sub in C minor`
- `/dj-claude:preview melody ethereal sine lead with delay`
