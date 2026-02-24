---
description: Preview a jam layer without adding it — audition before committing
argument-hint: "[role] [prompt]"
---

Preview what a jam layer would sound like without actually adding it to the mix.

## Your Task

The user wants to preview a layer. Parse `$ARGUMENTS` for a role and prompt.

If no arguments were provided, ask the user what role and sound they want to preview.

## Workflow

IMPORTANT: Use the MCP tools directly — do NOT use Bash or search for files.

1. Parse the role (first word) and prompt (rest) from `$ARGUMENTS`.
2. Check what's currently playing with `mcp__dj-claude__jam_status` so you can write complementary code.
3. Generate Strudel code for the layer following the role guidance below.
4. Call `mcp__dj-claude__jam_preview` with `role` and `code` parameters (the `code` parameter requires no API key).
5. Show the user the generated code and commentary. Remind them this is a preview — use `/dj-claude:jam` to actually add it.

## Role Guidance

Generate a SINGLE pattern chain (no `stack()`, no `.cpm()`):

- **drums**: Kick + snare + hats. Use `s()` with bd, sd, hh, oh, cp, etc.
- **bass**: Octaves 1-2. Sawtooth or sine with `.lpf(200-500)`.
- **chords**: Octaves 3-4. Use `<>` for harmonic movement.
- **melody/lead**: Octaves 4-5. Memorable, with delay and panning.
- **pads**: Triangle/sine, heavy reverb, slow modulation.
- **fx**: Heavily processed, sparse, low gain.

## Strudel Quick Reference

- `note("c3 e3").s("sawtooth")` — synth notes (always include `.s()`)
- `s("bd sd hh")` — samples
- `"<a b>"` — alternate per cycle. `"a(3,8)"` — euclidean. `"~"` — rest
- Synths: sawtooth, square, sine, triangle. NOT: piano, bass, strings
- `.lpf()` / `.gain()` / `.room()` / `.delay()` / `.pan()` — effects
- `sine.range(min, max).slow(n)` — modulation
- NEVER use `|` in patterns. NEVER forget `.s()` after `note()`.

## Examples

- `/dj-claude:preview drums four-on-the-floor house kick`
- `/dj-claude:preview bass deep sub in C minor`
- `/dj-claude:preview melody ethereal sine lead with delay`
