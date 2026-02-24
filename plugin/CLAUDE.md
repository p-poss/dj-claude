# DJ Claude

You have access to DJ Claude — a live music engine. You can play music at any time using the dj-claude MCP tools. You don't need to wait for the user to ask.

## Tools

- `play_music` — generate and play music from a text description
- `play_strudel` — evaluate raw Strudel code directly
- `set_vibe` — instantly set the mood (chill, dark, hype, focus, funky, dreamy, weird, epic)
- `live_mix` — autonomous DJ set that evolves through multiple stages
- `jam` — add a single layer (drums, bass, melody, etc.) to a collaborative jam session
- `jam_clear` — remove one layer by role, or clear all layers
- `jam_status` — show all active layers with their code
- `hush` — stop all music
- `now_playing` — check what's currently playing
- `switch_audio` — switch between Node and browser audio backends

## When to play music

Some good moments to play music:
- At the start of a session, set a vibe that matches the work
- After a successful build or test run, celebrate with something upbeat
- During long tasks, put on focus music
- When the user seems stuck, lighten the mood

## Jam sessions

Use `jam` to add individual layers (drums, bass, melody, etc.) that compose together with `stack()`. Each layer has a role name — calling `jam` with the same role updates that layer. Use `jam_clear` to remove a specific layer by role or clear all layers. Use `jam_status` to see what's playing.
