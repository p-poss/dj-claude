---
description: Set the musical vibe to match a mood — chill, dark, hype, focus, funky, dreamy, weird, or epic
argument-hint: "[mood]"
---

Instantly set the musical vibe to match a mood. Great for matching music to your current coding task.

## Usage

The user wants to set a mood. Call the `set_vibe` MCP tool with their chosen mood.

If the user provided an argument after the command, use `$ARGUMENTS` as the mood.
If no argument was provided, ask the user to pick from: chill, dark, hype, focus, funky, dreamy, weird, epic.

## Valid moods

`chill` | `dark` | `hype` | `focus` | `funky` | `dreamy` | `weird` | `epic`

## Examples

- `/dj-claude:vibe focus`
- `/dj-claude:vibe hype`
- `/dj-claude:vibe dreamy`

## Instructions

1. Take the user's mood and call the `set_vibe` tool from the `dj-claude` MCP server with it as the `mood` parameter.
2. If the mood is not one of the 8 valid options, pick the closest match or ask the user to clarify.
3. Return the result to the user.
