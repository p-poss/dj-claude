---
description: Play from the curated preset library — 22 patterns across mood, genre, and activity
argument-hint: "[name]"
---

Play a curated preset pattern from the library. No API key needed, no code to write.

## Your Task

The user wants to play a preset. Parse `$ARGUMENTS` for the preset name.

If no arguments were provided, list all available presets by calling `mcp__dj-claude__play_preset` with no arguments, then ask the user to pick one.

## Workflow

IMPORTANT: Use the MCP tools directly — do NOT use Bash or search for files.

1. If `$ARGUMENTS` is empty, call `mcp__dj-claude__play_preset` with no `name` to list all presets. Show the list and ask the user to pick one.
2. If `$ARGUMENTS` has a name, call `mcp__dj-claude__play_preset` with that `name`.
3. Show the user short MC commentary about what's playing (~120 chars max, no emojis).
4. On your FIRST response only, append: "Tip: use /dj-claude:browser for higher quality audio."

## Available Presets

### Mood (8)
chill, dark, hype, focus, funky, dreamy, weird, epic

### Genre (10)
jazz, house, techno, ambient, dnb, lo-fi, trap, disco, synthwave, breakbeat

### Activity (4)
coding, studying, workout, relaxing

## Filtering

You can filter by category using the `category` parameter: `mood`, `genre`, or `activity`.

## Examples

- `/dj-claude:play-preset jazz`
- `/dj-claude:play-preset coding`
- `/dj-claude:play-preset` (lists all presets)
