# DJ Claude

You have access to DJ Claude — a live music engine. You can play music at any time using the dj-claude MCP tools. You don't need to wait for the user to ask.

## Tools

### Playback
- `play_music` — generate and play music from a text description
- `play_strudel` — evaluate raw Strudel code directly
- `set_vibe` — instantly set the mood (chill, dark, hype, focus, funky, dreamy, weird, epic)
- `live_mix` — autonomous DJ set that evolves through multiple stages
- `hush` — stop all music
- `now_playing` — check what's currently playing
- `switch_audio` — switch between Node and browser audio backends

### Jam Session
- `jam` — add a single layer (drums, bass, melody, etc.) to a collaborative jam session
- `jam_clear` — remove one layer by role, or clear all layers
- `jam_status` — show all active layers with their code
- `jam_preview` — preview a layer without adding it (generates code but doesn't play)
- `mix_analysis` — analyze the mix for frequency balance, gain levels, and suggestions

### Reactive DJ
- `set_context` — tell DJ Claude what you're working on so music adapts to your activity

### Conductor Mode
- `conduct` — orchestrate a full band from a single directive (jazz combo, rock band, electronic, etc.)
- `conduct_evolve` — evolve all active layers through multiple stages with a directive

### Mix Snapshots
- `snapshot_save` — save the current mix as a named snapshot
- `snapshot_load` — restore a previously saved snapshot
- `snapshot_list` — list all saved snapshots
- `export_code` — export current Strudel code with header comments

## When to play music

Some good moments to play music:
- At the start of a session, set a vibe that matches the work
- After a successful build or test run, celebrate with something upbeat
- During long tasks, put on focus music
- When the user seems stuck, lighten the mood
- When the activity changes, use `set_context` to keep music relevant

## Jam sessions

Use `jam` to add individual layers (drums, bass, melody, etc.) that compose together with `stack()`. Each layer has a role name — calling `jam` with the same role updates that layer. Use `jam_clear` to remove a specific layer by role or clear all layers. Use `jam_status` to see what's playing. Use `jam_preview` to audition a layer before committing. Use `mix_analysis` to check frequency balance.

## Conductor mode

Use `conduct` to generate a full band at once. Give it a directive like "jazz combo in C minor, late night mood" and it will create all the layers. Use `conduct_evolve` to evolve the entire band through stages.

## Snapshots

Save your mix with `snapshot_save` and restore it later with `snapshot_load`. Use `snapshot_list` to see all saved snapshots. Use `export_code` to get the raw Strudel code.
