---
description: Orchestrate a full band from a single directive
argument-hint: "[directive]"
---

Conduct a full band — generates multiple layers at once from a single musical directive.

## Your Task

The user wants to conduct a full band. Parse `$ARGUMENTS` for the directive.

If no arguments were provided, ask the user what kind of band and mood they want.

## Workflow

IMPORTANT: Use the MCP tool directly as `mcp__dj-claude__conduct` — do NOT use Bash or search for files.

1. Call `mcp__dj-claude__conduct` with the `directive` from `$ARGUMENTS`.
   - Optionally pass `roles` if the user specifies custom instruments.
2. Show the user a summary of all layers created.

## Band Templates

The conductor auto-detects these templates from the directive:
- **jazz combo** — drums, bass, chords, melody
- **rock band** — drums, bass, chords, lead
- **electronic** — drums, bass, pads, lead, fx
- **ambient** — pads, atmosphere, fx, melody
- **full band** — drums, bass, chords, melody, pads, fx
- **minimal** — drums, bass, melody
- **orchestral** — bass, chords, pads, melody, fx, atmosphere

## Examples

- `/dj-claude:conduct jazz combo in C minor, late night mood`
- `/dj-claude:conduct electronic ambient with evolving textures`
- `/dj-claude:conduct rock band, energetic punk vibes`
