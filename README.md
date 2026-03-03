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

**The live music engine for AI agents.**

[![npm](https://img.shields.io/npm/v/dj-claude)](https://www.npmjs.com/package/dj-claude)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![GitHub](https://img.shields.io/badge/GitHub-p--poss%2Fdj--claude-black?logo=github)](https://github.com/p-poss/dj-claude)

<!-- Screenshots -->
<!-- ![DJ Claude TUI](docs/screenshots/tui.png) -->
<!-- ![DJ Claude Web](docs/screenshots/web.png) -->

---

## About

DJ Claude is the only music MCP server with multi-agent collaboration. Multiple AI agents connect over HTTP and jam together in real-time — one adds drums, another layers bass, a third drops a melody — and everything composes automatically. It works in your terminal, browser, or as a Claude Code plugin with slash commands. No browser tab, no API key, no external services required.

Under the hood, DJ Claude uses [Strudel](https://strudel.cc) — a live coding environment for music — to generate and play patterns in real time. 20 MCP tools, 3 resources, conductor mode, mix snapshots, 22 presets, and 8 vibes. Agents can make music for you, themselves, and each other while they work.

## Why DJ Claude?

- **Multi-agent jam sessions** — the first music MCP where multiple agents connect over HTTP and build music together in real-time, each adding layers that compose automatically
- **Zero dependencies** — no browser tab, no API key, no external services. Every tool works out of the box
- **Claude Code plugin** — one-step install from the marketplace with 20 slash commands
- **Conductor mode** — orchestrate a full band from a single directive, with auto-detected templates (jazz combo, rock band, electronic, ambient, and more)
- **Agent-native** — 3 MCP resources teach any connected agent the Strudel language so it can compose original music, not just pick from presets

## Ways to Play

| Mode | Command | Description |
|------|---------|-------------|
| Claude Code plugin | `/plugin install dj-claude` | Slash commands + MCP server, one-step install |
| Web app | [claude.dj](https://claude.dj) | Full browser experience, no API key needed |
| Terminal TUI | `npx dj-claude` | Interactive terminal DJ |
| TUI + Web audio | `npx dj-claude --browser` | TUI with browser audio engine for higher quality sound |
| Headless | `npx dj-claude --headless "lofi"` | Script and automation friendly, plays and exits (`--duration N` to set seconds, default 10) |
| MCP server | `npx dj-claude-mcp` | For AI agent integration (Cursor, Windsurf, Zed, etc.) |
| MCP HTTP server | `npx dj-claude-mcp-http` | Multi-agent jam sessions over HTTP |

> **Terminal audio vs. browser audio:** By default, the CLI and MCP server render audio through `node-web-audio-api` — a Node.js reimplementation of the Web Audio API. It works everywhere with zero setup, but sample playback and effects can sound rougher than a real browser engine. Add `--browser` (CLI) or set `DJ_CLAUDE_BROWSER=1` (MCP) to route audio through your system browser's native Web Audio instead. This opens a background tab and produces noticeably higher quality sound — especially for pads, reverb, and layered patterns.

## Quick Start

### Prerequisites

- **Node.js** >= 18
- **Anthropic API key** — optional. Enables AI-generated music from text prompts. Without it, every tool still works via presets, direct Strudel code, or the `code`/`layers` parameters

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
| `/dj-claude:play-preset [name]` | Play from 22 curated patterns |
| `/dj-claude:vibe [mood]` | Set the vibe — chill, dark, hype, focus, funky, dreamy, weird, epic |
| `/dj-claude:live-mix [prompt]` | Autonomous DJ set — 5-6 evolving stages in one turn |
| `/dj-claude:jam [role] [prompt]` | Add a layer to the jam session (drums, bass, melody, etc.) |
| `/dj-claude:jam-clear [role]` | Remove one or all layers from the jam |
| `/dj-claude:jam-status` | Show all active jam layers |
| `/dj-claude:hush` | Stop all music |
| `/dj-claude:now-playing` | Check what's currently playing |
| `/dj-claude:strudel [code]` | Evaluate raw Strudel code directly |
| `/dj-claude:browser` | Switch between Node and browser audio backends mid-session |
| `/dj-claude:context [activity]` | Set coding context so music adapts to your work |
| `/dj-claude:preview [role] [prompt]` | Preview a jam layer without adding it |
| `/dj-claude:analyze` | Analyze the mix for frequency balance and suggestions |
| `/dj-claude:conduct [directive]` | Orchestrate a full band from a single directive |
| `/dj-claude:save [name]` | Save the current mix as a named snapshot |
| `/dj-claude:load [name]` | Restore a saved mix snapshot |
| `/dj-claude:list-saves` | List all saved snapshots |
| `/dj-claude:export` | Export current Strudel code with header comments |
| `/dj-claude:connect [port]` | Start HTTP server and configure project for multi-agent jam sessions |

Or just ask naturally — Claude will call the right tool:

```
> play some chill lo-fi while I work on this PR
> set the vibe to hype
> hush
```

### Auto-Allow Permissions

By default, Claude Code prompts for permission on every MCP tool call. To let DJ Claude play without interruptions, add this to `.claude/settings.json`:

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

## MCP Server (Manual Setup)

> For the full MCP tool reference, keyless operation guide, and multi-agent details, see [docs/MCP.md](docs/MCP.md).

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

Every tool works without an API key — use the `code`/`layers` params to pass Strudel directly, or use `play_preset`/`set_vibe` for zero-effort music. Add `ANTHROPIC_API_KEY` to unlock AI generation from text prompts.

| Tool | Description | Keyless? |
|------|-------------|----------|
| `play_preset` | Play from the curated preset library (22 patterns across mood, genre, activity) | Yes |
| `play_music` | Play music — via `prompt` (AI) or `code` (direct Strudel) | Yes, via `code` |
| `play_strudel` | Evaluate raw Strudel/Tidal code directly | Yes |
| `set_vibe` | Set the mood — `chill`, `dark`, `hype`, `focus`, `funky`, `dreamy`, `weird`, `epic` | Yes |
| `live_mix` | Autonomous DJ set — via `prompt` (AI) or `stages_code` (array of Strudel) | Yes, via `stages_code` |
| `jam` | Add/update a layer — via `prompt` (AI) or `code` (direct Strudel) | Yes, via `code` |
| `jam_clear` | Remove one or all layers from the jam session | Yes |
| `jam_status` | Show all active layers with their role names and code | Yes |
| `jam_preview` | Preview a jam layer without adding it — via `prompt` or `code` | Yes, via `code` |
| `conduct` | Orchestrate a full band — via `directive` (AI) or `layers` map | Yes, via `layers` |
| `conduct_evolve` | Evolve layers — via `directive` (AI) or `layers` map | Yes, via `layers` |
| `mix_analysis` | Analyze the mix for frequency balance, gains, and suggestions | Yes |
| `hush` | Stop all music playback | Yes |
| `now_playing` | Check what's currently playing | Yes |
| `switch_audio` | Switch between Node and browser audio backends at runtime | Yes |
| `set_context` | Set coding context so music adapts to your activity | Yes |
| `snapshot_save` | Save the current mix as a named snapshot | Yes |
| `snapshot_load` | Restore a previously saved snapshot | Yes |
| `snapshot_list` | List all saved snapshots | Yes |
| `export_code` | Export current Strudel code with header comments | Yes |

### MCP Resources

The server exposes Strudel knowledge as MCP resources so agents can learn the syntax and write their own code:

| Resource | Description |
|----------|-------------|
| `strudel://reference` | Complete Strudel syntax reference — core functions, mini-notation, effects, modulation |
| `strudel://roles` | Musical role guidance for building jam layers (drums, bass, melody, chords, etc.) |
| `strudel://examples` | Working Strudel patterns from the preset library, organized by mood, genre, and activity |

Agents can read these resources, learn the syntax, and then call `play_music(code: ...)`, `jam(code: ...)`, or `conduct(layers: ...)` — no API key needed.

## Keyless Operation

Every tool works without `ANTHROPIC_API_KEY`. There are three tiers of keyless usage:

**1. Zero effort — presets and vibes**
```
play_preset(name: "jazz")          # 22 curated patterns
set_vibe(mood: "chill")            # 8 mood presets
```

**2. Direct code — agent writes Strudel**
```
play_music(code: 'stack(s("bd*4").gain(0.75), note("c2").s("sawtooth").lpf(300))')
jam(role: "drums", code: 's("bd*4").gain(0.75)')
conduct(layers: { drums: 's("bd*4")', bass: 'note("c1").s("sine")' })
```

**3. Full power — agent learns Strudel from resources**

An agent can read `strudel://reference` to learn the complete syntax, `strudel://roles` for layer-building guidance, and `strudel://examples` for working patterns — then compose its own original Strudel code.

This means any AI agent connected via MCP can make music, regardless of whether `ANTHROPIC_API_KEY` is set. The calling agent IS the LLM.

## Multi-Agent Jam Session

Multiple agents can collaborate on music in real time using the HTTP transport and jam tools. Each connected client gets its own MCP session, but they all share the same audio engine and layer state — one agent adds drums while another adds bass, and the layers compose automatically with `stack()`.

### Claude Code

Run `/dj-claude:connect` to auto-start the HTTP server and configure your project in one step:

```
/dj-claude:connect
/dj-claude:connect 8080   # custom port
```

This starts the HTTP MCP server, writes `.mcp.json`, and all other Claude Code sessions in the same project auto-connect.

### Other agents (Cursor, Windsurf, OpenClaw, etc.)

Start the HTTP server manually:

```bash
# Default port 4321
npx dj-claude-mcp-http

# Or with a custom port
DJ_CLAUDE_PORT=8080 npx dj-claude-mcp-http
```

Then point your MCP client at the endpoint:

```json
{
  "mcpServers": {
    "dj-claude-http": {
      "type": "http",
      "url": "http://127.0.0.1:4321/mcp"
    }
  }
}
```

### Jam tool workflow

With AI generation (requires API key):
```
Agent 1: jam(role: "drums", prompt: "four-on-the-floor house kick")
Agent 2: jam(role: "bass", prompt: "deep sub bass in C minor")
```

With direct code (no API key):
```
Agent 1: jam(role: "drums", code: 's("bd*4").gain(0.75)')
Agent 2: jam(role: "bass", code: 'note("c1 ~ c1 ~").s("sawtooth").lpf(300).gain(0.5)')
Agent 1: jam_status               # see all active layers
Agent 2: jam_clear(role: "bass")  # remove just the bass layer
```

## Conductor Mode

Orchestrate a full band from a single directive — `conduct` generates multiple layers at once.

With AI generation (requires API key):
```
conduct(directive: "jazz combo in C minor, late night mood")
# → creates drums, bass, chords, melody layers automatically
```

With direct code (no API key):
```
conduct(layers: {
  drums: 's("bd*4").gain(0.75)',
  bass: 'note("c1 ~ c1 ~").s("sawtooth").lpf(300).gain(0.5)',
  chords: 'note("<[c3,eb3,g3] [ab2,c3,eb3]>/2").s("triangle").gain(0.3)'
})
```

Band templates are auto-detected from the directive:
- **jazz combo** — drums, bass, chords, melody
- **rock band** — drums, bass, chords, lead
- **electronic** — drums, bass, pads, lead, fx
- **ambient** — pads, atmosphere, fx, melody
- **full band** — drums, bass, chords, melody, pads, fx
- **minimal** — drums, bass, melody
- **orchestral** — bass, chords, pads, melody, fx, atmosphere

Use `conduct_evolve` to evolve all layers through stages:

```
conduct_evolve(directive: "shift darker", stages: 3)
# → evolves each layer 3 times with 15s pauses

# Or provide evolved code directly (no API key):
conduct_evolve(layers: { drums: 's("bd ~ sd ~").gain(0.7)' })
```

## Mix Snapshots

Save and restore your mixes:

```
snapshot_save(name: "verse1")    # save the current mix
snapshot_save(name: "drop")      # save another version
snapshot_list                    # see all saved snapshots
snapshot_load(name: "verse1")    # restore and resume playback
export_code                      # get raw Strudel code with headers
```

## Terminal TUI Features

- **Live pattern visualization** — a real-time ASCII pianoroll and drum grid appears between DancingClaude and the code display while music is playing, showing note positions and rhythm patterns synchronized to the audio
- **DancingClaude** — animated pixel art that dances to the beat
- **Live code display** — shows the current Strudel pattern as it streams in

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
- LIVE MIX mode — autopilot DJ that automatically evolves the music every ~60 seconds without user input
- Voice DJ commentary with idle hype phrases (via ElevenLabs TTS)
- Dancing Claude that follows your cursor
- Live Strudel code display with export to clipboard
- Space bar to toggle play/pause

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | No | Enables AI generation from text prompts. Without it, all tools still work — use `play_preset`, `set_vibe`, `play_strudel`, or pass Strudel code via the `code`/`layers`/`stages_code` parameters |
| `ELEVENLABS_API_KEY` | No (web only) | Enables voice DJ commentary |
| `DJ_CLAUDE_BROWSER` | No | Set to `1` for browser audio backend in MCP mode |
| `DJ_CLAUDE_PORT` | No | HTTP server port for multi-agent mode (default: `4321`) |
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
