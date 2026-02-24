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

## Examples

```
/dj-claude:play jazzy lo-fi beats for late night coding
/dj-claude:vibe focus
/dj-claude:hush
/dj-claude:now-playing
/dj-claude:strudel s("bd sd bd sd").speed(1.5)
```

## Requirements

- Audio output on the host machine
- No API key needed — the plugin uses Claude Code's built-in model

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
      "mcp__dj-claude__jam_status"
    ]
  }
}
```

This auto-allows all music tools while still prompting for everything else.
