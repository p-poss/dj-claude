---
description: Start HTTP server and configure project for multi-agent jam sessions
argument-hint: "[port]"
---

Set up this project for multi-agent DJ Claude jam sessions. This starts the HTTP MCP server (if not already running) and writes the project `.mcp.json` so all Claude Code sessions share the same audio engine.

## Your Task

Parse `$ARGUMENTS` for an optional port number. Default to `4321` if none provided.

## Workflow

IMPORTANT: Steps 1-3 use Bash and file I/O. Step 5 uses `mcp__dj-claude__*` MCP tools to start playing.

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
3. That the **current session** needs an MCP restart to pick up the HTTP config — they should run `/mcp` and restart the dj-claude server, or just start a new session
4. Other agents (Cursor, Windsurf, etc.) can connect by pointing their MCP config at `http://127.0.0.1:{PORT}/mcp`

### 5. Start playing

After setup, immediately kick off music so the jam session isn't empty. Call `mcp__dj-claude__set_vibe` with a mood (e.g. `"chill"` or `"focus"`), or call `mcp__dj-claude__jam` to add a layer. This gets audio flowing right away so the user hears something and other agents that connect will join an active session.