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
| `/dj-claude:hush` | Stop all music |
| `/dj-claude:now-playing` | Check what's currently playing |
| `/dj-claude:strudel [code]` | Evaluate raw Strudel code directly |

## Examples

```
/dj-claude:play jazzy lo-fi beats for late night coding
/dj-claude:vibe focus
/dj-claude:hush
/dj-claude:now-playing
/dj-claude:strudel s("bd sd bd sd").speed(1.5)
```

## Requirements

- An `ANTHROPIC_API_KEY` environment variable (for AI-generated music via `/play` and `/vibe`)
- Audio output on the host machine
- `/strudel` works without an API key since it evaluates code directly
