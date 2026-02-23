---
description: Evaluate raw Strudel/Tidal code directly — for power users
disable-model-invocation: true
argument-hint: "[code]"
---

Evaluate raw Strudel/Tidal code directly, bypassing AI generation. For power users who want to write their own patterns.

## Usage

The user wants to play raw Strudel code. Call the `play_strudel` MCP tool with their code.

If the user provided arguments after the command, use `$ARGUMENTS` as the Strudel code.
If no arguments were provided, ask the user for the Strudel code they'd like to evaluate.

## Examples

- `/dj-claude:strudel s("bd sd bd sd")`
- `/dj-claude:strudel note("c3 eb3 g3 bb3").sound("sawtooth").lpf(800)`

## Instructions

1. Take the user's Strudel code and call the `play_strudel` tool from the `dj-claude` MCP server with it as the `code` parameter.
2. Return the result to the user — it will show the code that's now playing, or an error if evaluation failed.
