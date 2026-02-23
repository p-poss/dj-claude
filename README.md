```
     _  _                _                 _
  __| |(_)        ___  | |  __ _  _   _  __| |  ___
 / _` || |       / __| | | / _` || | | |/ _` | / _ \
| (_| || |  _   | (__  | || (_| || |_| | (_| ||  __/
 \__,_|| | (_)   \___| |_| \__,_| \__,_|\__,_| \___|
      _/ |
     |__/
```

# DJ Claude

**Live coding music for AI agents — in the CLI or web.**

[![npm](https://img.shields.io/npm/v/dj-claude)](https://www.npmjs.com/package/dj-claude)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![GitHub](https://img.shields.io/badge/GitHub-p--poss%2Fdj--claude-black?logo=github)](https://github.com/p-poss/dj-claude)

<!-- Screenshots -->
<!-- ![DJ Claude TUI](docs/screenshots/tui.png) -->
<!-- ![DJ Claude Web](docs/screenshots/web.png) -->

---

## About

DJ Claude uses [Strudel](https://strudel.cc) — a live coding environment for music — to generate and play patterns in real time. It works in your terminal, browser, or as an MCP server for any AI agent. Agents can now make music for you, themselves, and each other while they work.

## Ways to Play

| Mode | Command | Description |
|------|---------|-------------|
| Claude Code plugin | `/plugin install dj-claude` | Slash commands + MCP server, one-step install |
| Web app | [claude.dj](https://claude.dj) | Full browser experience, no API key needed |
| Terminal TUI | `npx dj-claude` | Interactive terminal DJ |
| TUI + Web audio | `npx dj-claude --browser` | TUI with browser audio engine for higher quality sound |
| Headless | `npx dj-claude --headless "lofi"` | Script and automation friendly, plays and exits (`--duration N` to set seconds, default 10) |
| MCP server | `npx dj-claude-mcp` | For AI agent integration (Cursor, Windsurf, Zed, etc.) |

> **Terminal audio vs. browser audio:** By default, the CLI and MCP server render audio through `node-web-audio-api` — a Node.js reimplementation of the Web Audio API. It works everywhere with zero setup, but sample playback and effects can sound rougher than a real browser engine. Add `--browser` (CLI) or set `DJ_CLAUDE_BROWSER=1` (MCP) to route audio through your system browser's native Web Audio instead. This opens a background tab and produces noticeably higher quality sound — especially for pads, reverb, and layered patterns.

## Quick Start

### Prerequisites

- **Node.js** >= 18
- **Anthropic API key** (not needed for the web app at [claude.dj](https://claude.dj))

### Install & Run

```bash
# Set your API key (or add to a .env file)
export ANTHROPIC_API_KEY=sk-ant-...

# Launch the terminal DJ
npx dj-claude
```

Or install globally:

```bash
npm i -g dj-claude
dj-claude
```

Or go headless for scripting:

```bash
npx dj-claude --headless "jazzy lo-fi beats" --duration 30
```

## Claude Code Plugin

The easiest way to use DJ Claude with Claude Code. Installs the MCP server and gives you slash commands.

### Install

```
/plugin marketplace add p-poss/dj-claude
/plugin install dj-claude@dj-claude-marketplace
```

### Slash Commands

| Command | Description |
|---------|-------------|
| `/dj-claude:play [prompt]` | Play music from a description |
| `/dj-claude:vibe [mood]` | Set the vibe — chill, dark, hype, focus, funky, dreamy, weird, epic |
| `/dj-claude:hush` | Stop all music |
| `/dj-claude:now-playing` | Check what's currently playing |
| `/dj-claude:strudel [code]` | Evaluate raw Strudel code directly |
| `/dj-claude:browser` | Switch between Node and browser audio backends mid-session |

Or just ask naturally — Claude will call the right tool:

```
> play some chill lo-fi while I work on this PR
> set the vibe to hype
> hush
```

## MCP Server (Manual Setup)

If you prefer manual configuration, or want to use DJ Claude with other MCP clients (Cursor, Windsurf, Zed, etc.), add this to your `.mcp.json`:

```json
{
  "mcpServers": {
    "dj-claude": {
      "command": "npx",
      "args": ["-y", "dj-claude-mcp"]
    }
  }
}
```

For higher quality audio through the browser's Web Audio engine:

```json
{
  "mcpServers": {
    "dj-claude": {
      "command": "npx",
      "args": ["-y", "dj-claude-mcp"],
      "env": {
        "DJ_CLAUDE_BROWSER": "1"
      }
    }
  }
}
```

### MCP Tools

| Tool | Description |
|------|-------------|
| `play_music` | Generate and play music from a text prompt |
| `play_strudel` | Evaluate raw Strudel/Tidal code directly |
| `set_vibe` | Set the mood — `chill`, `dark`, `hype`, `focus`, `funky`, `dreamy`, `weird`, `epic` |
| `hush` | Stop all music playback |
| `now_playing` | Check what's currently playing |
| `switch_audio` | Switch between Node and browser audio backends at runtime |

## Keyboard Shortcuts (TUI)

| Key | Action |
|-----|--------|
| `Enter` | Submit prompt |
| `q` | Quit |
| `Esc` | Pause / resume music |
| `r` | Revert to previous pattern |

## Web App

Visit [claude.dj](https://claude.dj) for the full browser experience — no API key or install needed.

Features:
- 5 club themes — Anthropic, Gemini, Codex, Fairlight, OpenClaw
- NIGHT mode (color inversion), DISCO mode (rainbow hue cycling), RAVE mode (glow + CRT scanlines)
- Voice DJ commentary with idle hype phrases (via ElevenLabs TTS)
- Dancing Claude that follows your cursor
- Live Strudel code display with export to clipboard
- Space bar to toggle play/pause

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | Yes (CLI / MCP) | Your Anthropic API key |
| `ELEVENLABS_API_KEY` | No (web only) | Enables voice DJ commentary |
| `DJ_CLAUDE_BROWSER` | No | Set to `1` for browser audio backend in MCP mode |
| `DJ_CLAUDE_MODEL` | No | Claude model for CLI/MCP (default: `claude-sonnet-4-6`) |
| `DJ_CLAUDE_MAX_TOKENS` | No | Max response tokens for CLI/MCP (default: `16384`) |

The CLI also loads `.env` and `.env.local` files from your project directory automatically.

## Architecture

DJ Claude is a Next.js app with a companion CLI package:

- **`/app`** — Next.js web frontend ([claude.dj](https://claude.dj))
- **`/cli`** — Terminal TUI (Ink/React) and MCP server
- **`/cli/src/mcp`** — MCP tool definitions and JSON-RPC server
- **`/cli/src/audio`** — Strudel audio engine (node + browser backends)
- **`/cli/src/lib`** — Shared utilities, Claude API client, prompt generation
- **`/plugin`** — Claude Code plugin (skills, MCP config, marketplace)

Music is generated by Claude composing [Strudel](https://strudel.cc) live-coding patterns, which are then evaluated in real-time through either the Node `node-web-audio-api` backend or the browser's native Web Audio API.

## Platform Support

Works on macOS, Windows, and Linux. On Linux, the Node audio backend (`node-web-audio-api`) requires [JACK](https://jackaudio.org/) or [PipeWire-JACK](https://pipewire.org/) — vanilla ALSA/PulseAudio alone won't work with the prebuilt binaries. Use `--browser` mode to bypass this by routing audio through your browser instead.

## Creator

Built by [Patrick Poss](https://patrickposs.com) — [hey@patrickposs.com](mailto:hey@patrickposs.com)

## License

[MIT](LICENSE)
