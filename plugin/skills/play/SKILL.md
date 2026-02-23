---
description: Play music from a description — genre, mood, activity, or anything creative
argument-hint: "[prompt]"
---

Play music by describing what you want to hear. DJ Claude will compose a Strudel pattern and play it through the speakers.

## Usage

The user wants to play music. Call the `play_music` MCP tool with their prompt.

If the user provided arguments after the command, use `$ARGUMENTS` as the prompt directly.
If no arguments were provided, ask the user what kind of music they'd like to hear.

## Examples

- `/dj-claude:play jazzy lo-fi beats`
- `/dj-claude:play something epic for a big refactor`
- `/dj-claude:play chill ambient for late night coding`

## Instructions

1. Take the user's description and call the `play_music` tool from the `dj-claude` MCP server with it as the `prompt` parameter.
2. Return the result to the user — it will contain DJ commentary and the Strudel code that's now playing.
