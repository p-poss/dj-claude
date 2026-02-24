# DJ Claude — Claude Code Plugin

Live-code music while you work. AI-powered music generation through Strudel patterns.

## Installation

### From the marketplace

```
/plugin marketplace add p-poss/dj-claude
/plugin install dj-claude@dj-claude-marketplace
```

### Local (for development)

```bash
claude --plugin-dir ./plugin
```

## Slash Commands

| Command | Description |
|---------|-------------|
| `/dj-claude:play [prompt]` | Play music from a description |
| `/dj-claude:vibe [mood]` | Set the vibe — chill, dark, hype, focus, funky, dreamy, weird, epic |
| `/dj-claude:live-mix [prompt]` | Autonomous DJ set — 5-6 evolving stages in one turn |
| `/dj-claude:jam [role] [prompt]` | Add a layer to the jam session (drums, bass, melody, etc.) |
| `/dj-claude:jam-clear [role]` | Remove one or all layers from the jam |
| `/dj-claude:jam-status` | Show all active jam layers |
| `/dj-claude:hush` | Stop all music |
| `/dj-claude:now-playing` | Check what's currently playing |
| `/dj-claude:strudel [code]` | Evaluate raw Strudel code directly |
| `/dj-claude:browser` | Switch to browser audio for higher quality playback |
| `/dj-claude:context [activity]` | Set coding context so music adapts to your work |
| `/dj-claude:preview [role] [prompt]` | Preview a jam layer without adding it |
| `/dj-claude:analyze` | Analyze the mix for frequency balance and suggestions |
| `/dj-claude:conduct [directive]` | Orchestrate a full band from a single directive |
| `/dj-claude:save [name]` | Save the current mix as a named snapshot |
| `/dj-claude:load [name]` | Restore a saved mix snapshot |
| `/dj-claude:list-saves` | List all saved snapshots |
| `/dj-claude:export` | Export current Strudel code with header comments |

## Examples

```
/dj-claude:play jazzy lo-fi beats for late night coding
/dj-claude:vibe focus
/dj-claude:jam drums four-on-the-floor house kick
/dj-claude:conduct jazz combo in C minor, late night mood
/dj-claude:hush
```

## Requirements

- Audio output on the host machine
- No API key needed — all tools work without `ANTHROPIC_API_KEY` via presets, direct Strudel code, or the `code`/`layers` parameters. Set the key to enable AI generation from text prompts.

## Auto-Allow Permissions

By default, Claude Code prompts for permission on every MCP tool call. To let DJ Claude play music without interruptions, add this to your project's `.claude/settings.json`:

```json
{
  "permissions": {
    "allow": [
      "mcp__dj-claude__play_music",
      "mcp__dj-claude__play_strudel",
      "mcp__dj-claude__set_vibe",
      "mcp__dj-claude__live_mix",
      "mcp__dj-claude__hush",
      "mcp__dj-claude__now_playing",
      "mcp__dj-claude__jam",
      "mcp__dj-claude__jam_clear",
      "mcp__dj-claude__jam_status",
      "mcp__dj-claude__set_context",
      "mcp__dj-claude__jam_preview",
      "mcp__dj-claude__mix_analysis",
      "mcp__dj-claude__conduct",
      "mcp__dj-claude__conduct_evolve",
      "mcp__dj-claude__snapshot_save",
      "mcp__dj-claude__snapshot_load",
      "mcp__dj-claude__snapshot_list",
      "mcp__dj-claude__export_code",
      "mcp__dj-claude__play_preset",
      "mcp__dj-claude__switch_audio"
    ]
  }
}
```

This auto-allows all music tools while still prompting for everything else.
