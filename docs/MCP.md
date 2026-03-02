# DJ Claude MCP Guide

Tools, resources, and keyless operation for AI agents.

---

## The API Key Question

**`ANTHROPIC_API_KEY` is fully optional.** Here's the split:

| With API key | Without API key |
|---|---|
| Text prompts like `"jazzy lo-fi beats"` get sent to Claude, which generates Strudel code | Every tool still works — you use presets, direct Strudel code, or the agent writes its own |

The key insight: the AI agent calling these MCP tools **is already an LLM**. It doesn't need a second LLM call to generate code — it just needs to know Strudel syntax. That's what the MCP resources provide.

---

## Three Tiers of Keyless Operation

### Tier 1: Zero Effort — Presets & Vibes

No code, no API key, no learning. Just pick a name:

```
play_preset(name: "jazz")        // 22 curated patterns
set_vibe(mood: "focus")          // 8 mood presets
```

**22 presets available:**
- **Moods (8):** chill, dark, hype, focus, funky, dreamy, weird, epic
- **Genres (10):** jazz, house, techno, ambient, dnb, lo-fi, trap, disco, synthwave, breakbeat
- **Activities (4):** coding, studying, workout, relaxing

`set_vibe` will use AI generation if a key is available, falling back to the preset if not. `play_preset` always uses the preset — it's deterministic.

### Tier 2: Direct Code — Pass Strudel In

Six tools accept a `code`, `layers`, or `stages_code` parameter that bypasses AI generation entirely:

| Tool | Keyless param | What it accepts |
|---|---|---|
| `play_music` | `code` | A Strudel expression |
| `jam` | `code` | A single-layer pattern chain |
| `jam_preview` | `code` | A single-layer pattern chain (doesn't play) |
| `live_mix` | `stages_code` | Array of Strudel strings, one per stage |
| `conduct` | `layers` | `{ "drums": "...", "bass": "...", ... }` map |
| `conduct_evolve` | `layers` | `{ "drums": "...", "bass": "..." }` map (updates existing) |

Example — an agent builds a full band with no API key:
```
conduct(layers: {
  drums: 's("bd*4").gain(0.75)',
  bass: 'note("c1 ~ c1 ~").s("sawtooth").lpf(300).gain(0.5)',
  chords: 'note("<[c3,eb3,g3] [ab2,c3,eb3]>/2").s("triangle").gain(0.3)'
})
```

### Tier 3: Full Power — Agent Learns Strudel

Three MCP resources teach any connected agent the Strudel language:

| Resource URI | Content |
|---|---|
| `strudel://reference` | Complete syntax reference — core functions, mini-notation, effects, modulation, common mistakes |
| `strudel://roles` | Role guidance for jam layers — what drums, bass, melody, chords, pads, fx should sound like |
| `strudel://examples` | All 22 preset patterns as working code examples |

An agent (Claude, GPT, Gemini, whatever) reads these resources, learns the syntax, and then writes its own original Strudel — composing novel music that goes far beyond the presets. No API key involved at any point.

---

## All 20 Tools

### Playback

| Tool | Key needed? | What it does |
|---|---|---|
| `play_music` | Only for `prompt` | Play music via text prompt (AI) or `code` (direct) |
| `play_strudel` | No | Evaluate raw Strudel code directly |
| `set_vibe` | Optional | Set mood (8 options). Uses AI if key exists, preset if not |
| `play_preset` | No | Play from the 22-pattern preset library. No args = list all |
| `live_mix` | Only for `prompt` | Multi-stage DJ set via `prompt` (AI) or `stages_code` (direct) |
| `hush` | No | Stop all music immediately |

### Jam Session (collaborative layers)

| Tool | Key needed? | What it does |
|---|---|---|
| `jam` | Only for `prompt` | Add/update a layer via `prompt` (AI) or `code` (direct). Layers compose via `stack()` |
| `jam_clear` | No | Remove one layer by role, or all layers |
| `jam_status` | No | Show all active layers with code and metadata |
| `jam_preview` | Only for `prompt` | Preview a layer without adding it. Returns code but doesn't play |
| `mix_analysis` | No | Analyze frequency bands, gains, effects across all layers. Returns suggestions |

### Conductor (orchestrate a full band)

| Tool | Key needed? | What it does |
|---|---|---|
| `conduct` | Only for `directive` | Create multiple layers at once. Auto-detects band template (jazz combo, rock band, electronic, etc.) or pass `layers` map directly |
| `conduct_evolve` | Only for `directive` | Evolve existing layers through stages. Pass `layers` map for single-pass update, or `directive` for AI-driven multi-stage evolution with 15s pauses |

### Context & Snapshots

| Tool | Key needed? | What it does |
|---|---|---|
| `set_context` | Optional | Tell DJ Claude what you're coding. Injects into future prompts. With `auto_adapt: true` + key, generates a transition immediately |
| `now_playing` | No | Returns current code, commentary, layers, context |
| `switch_audio` | No | Toggle between `node` (terminal) and `browser` (higher quality) audio backends |
| `snapshot_save` | No | Save current mix as a named snapshot |
| `snapshot_load` | No | Restore a snapshot and resume playback |
| `snapshot_list` | No | List all saved snapshots |
| `export_code` | No | Export Strudel code with date/layer header comments |

---

## MCP Resources

| Resource | Description |
|---|---|
| `strudel://reference` | Complete Strudel syntax reference — core functions, mini-notation, effects, modulation |
| `strudel://roles` | Musical role guidance for building jam layers (drums, bass, melody, chords, pads, fx, etc.) |
| `strudel://examples` | Working Strudel patterns from the preset library, organized by mood, genre, and activity |

---

## How Agents Proactively Make Music

### Inside Claude Code (Plugin)

The plugin installs via `/plugin install dj-claude` and configures the MCP server automatically. Two hooks drive proactive behavior:

**SessionStart hook** — When a Claude Code session begins, the plugin can suggest setting a vibe. Claude sees the DJ tools in its tool list and can offer to play music.

**PostToolUse hook** — After certain events (like a successful build or passing tests), the hook nudges Claude to react musically. Claude sees these nudges and can call `set_vibe` or `set_context` on its own.

**Slash commands** give the user direct control (`/dj-claude:play`, `/dj-claude:vibe`, `/dj-claude:conduct`, `/dj-claude:hush`, `/dj-claude:connect`, etc.), but Claude doesn't need them. Because the MCP tools are in its tool list, Claude can proactively call them during normal conversation. If you say "play some music while I work on this PR", Claude will call `set_vibe` or `play_music` on its own. If it sees the context hook after a build, it might set the vibe to `focus` without being asked.

The auto-allow permissions list in `.claude/settings.json` controls whether Claude needs to ask permission for each tool call or can play freely.

### Outside Claude Code (Any MCP Client)

Any MCP client — Cursor, Windsurf, Zed, a custom agent built with the MCP SDK — connects to DJ Claude's MCP server via:

**Stdio transport** (single agent):
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

**HTTP transport** (multi-agent jam sessions):
```json
{
  "mcpServers": {
    "dj-claude": {
      "type": "http",
      "url": "http://127.0.0.1:4321/mcp"
    }
  }
}
```

Once connected, the agent sees 20 tools and 3 resources. Whether the agent plays music proactively depends on:

1. **The agent's own system prompt** — If instructed to "play background music while working", it will
2. **Tool descriptions** — Each tool's description is self-explanatory. An agent reading the tool list understands what's available
3. **MCP resources** — An agent can read `strudel://reference` to learn Strudel and start composing without any human input

### Multi-Agent Collaboration

In Claude Code, run `/dj-claude:connect` to auto-start the HTTP server and configure your project. For other agents, start the server manually and point your MCP config at `http://127.0.0.1:4321/mcp`.

Multiple agents connect to the same HTTP server, sharing one audio engine:

```
Agent 1: jam(role: "drums", code: 's("bd*4").gain(0.75)')
Agent 2: jam(role: "bass", code: 'note("c1 ~ c1 ~").s("sawtooth").lpf(300)')
Agent 1: jam_status                    // see what everyone's playing
Agent 2: mix_analysis                  // get frequency balance suggestions
Agent 1: conduct_evolve(layers: { drums: 's("bd ~ sd ~").gain(0.7)' })
```

Layers stack automatically. Agents can see each other's contributions, analyze the mix, and evolve the music collaboratively.

---

## The Autonomy Spectrum

From least to most agent autonomy:

1. **User-driven** — User types `/dj-claude:play techno` or calls `play_preset(name: "techno")`
2. **Agent-assisted** — User says "play something chill", agent picks `set_vibe(mood: "chill")`
3. **Agent-reactive** — Agent sees a build succeed, proactively calls `set_vibe(mood: "hype")` via hook nudge
4. **Agent-creative** — Agent reads `strudel://reference`, learns Strudel syntax, writes its own original patterns via `play_music(code: ...)` or `conduct(layers: {...})`
5. **Multi-agent jam** — Multiple agents independently add layers, evolve the mix, and respond to each other's additions via the HTTP transport

At every level, no API key is required.
