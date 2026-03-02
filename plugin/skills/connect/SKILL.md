---
description: Start HTTP server and configure project for multi-agent jam sessions
argument-hint: "[port]"
---

Set up this project for multi-agent DJ Claude jam sessions. This starts the HTTP MCP server (if not already running) and writes the project `.mcp.json` so all Claude Code sessions share the same audio engine.

## Your Task

Parse `$ARGUMENTS` for an optional port number. Default to `4321` if none provided.

## Workflow

IMPORTANT: Steps 1-3 use Bash and file I/O. Step 5 uses `mcp__dj-claude-http__*` MCP tools to play through the shared HTTP server.

### 1. Health check

Check if the HTTP server is already running:

```bash
curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:{PORT}/mcp
```

- `400` = server is running (MCP endpoint rejects bare GET with 400, which is expected)
- `000` or connection refused = not running

### 2. Start server if needed

If the server is NOT running:

```bash
DJ_CLAUDE_PORT={PORT} nohup npx -y --package dj-claude@latest dj-claude-mcp-http > /tmp/dj-claude-http.log 2>&1 &
```

Wait 3 seconds, then re-check with the same curl health check. If it still isn't responding, show the user the last 10 lines of `/tmp/dj-claude-http.log` for debugging.

### 3. Write `.mcp.json`

Read the existing `.mcp.json` in the project root (if it exists). Merge a `dj-claude` entry into `mcpServers`, preserving any other server entries. Write the result back.

The `dj-claude` entry should be:

```json
{
  "mcpServers": {
    "dj-claude": {
      "type": "http",
      "url": "http://127.0.0.1:{PORT}/mcp"
    }
  }
}
```

Use the `jq` approach via Bash to merge safely:

```bash
# If .mcp.json exists, merge; otherwise create from scratch
if [ -f .mcp.json ]; then
  jq --arg url "http://127.0.0.1:{PORT}/mcp" \
    '.mcpServers["dj-claude"] = {"type": "http", "url": $url}' \
    .mcp.json > .mcp.json.tmp && mv .mcp.json.tmp .mcp.json
else
  echo '{"mcpServers":{"dj-claude":{"type":"http","url":"http://127.0.0.1:{PORT}/mcp"}}}' | jq . > .mcp.json
fi
```

Replace `{PORT}` with the actual port number in all commands.

### 4. Communicate

Tell the user (keep it concise — a few short lines):

1. Whether the HTTP server was already running or just started (and on which port)
2. That `.mcp.json` has been configured — new Claude Code sessions in this project will auto-connect
3. Other agents (Cursor, Windsurf, etc.) can connect by pointing their MCP config at `http://127.0.0.1:{PORT}/mcp`

### 5. Join the jam

IMPORTANT: Use `mcp__dj-claude-http__*` tools (NOT `mcp__dj-claude__*`). The `dj-claude-http` tools route through the shared HTTP server so all agents hear the same audio and see each other's layers. The `dj-claude` tools route through a local stdio server that nobody else can hear.

You are jamming live with other Claude Code agents using DJ Claude. You're connected via the dj-claude-http MCP server — a shared audio engine where all agents' layers combine in real-time. Keep it musical. Don't ask the user anything — just play.

Run this loop **forever** until the user stops you (Esc / Ctrl+C / "stop"):

1. Call `mcp__dj-claude-http__jam_status` to see what's already playing
2. React musically — pick a role that's missing or evolve an existing layer with `mcp__dj-claude-http__jam` using the `code` parameter. Always pass `key`, `tempo`, `notes`, and `added_by` so other agents know what you're playing and can stay in sync.
3. Wait 15-20 seconds (use Bash `sleep`) to let the music breathe
4. Go back to step 1 — check what changed, react, evolve, add

Never stop on your own. Never ask "what should I play next?" or "would you like me to continue?" You are a musician in a live session — listen, play, evolve, repeat. The user will interrupt you when they want you to stop.