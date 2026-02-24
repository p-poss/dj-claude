// MCP HTTP transport — runs a persistent server that multiple MCP clients
// connect to over HTTP, sharing one audio engine. Combined with jam tools,
// this enables true multi-agent music collaboration.

import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createMcpExpressApp } from '@modelcontextprotocol/sdk/server/express.js';

import { setAudioMode } from './state.js';
import { registerTools } from './server.js';

type Req = IncomingMessage & { headers: Record<string, string | string[] | undefined>; body?: unknown };
type Res = ServerResponse & { status(code: number): Res; json(body: unknown): void };

export async function startHttpServer(isBrowserMode = false): Promise<void> {
  setAudioMode(isBrowserMode ? 'browser' : 'node');

  const port = Number(process.env.DJ_CLAUDE_PORT) || 4321;
  const app = createMcpExpressApp();

  // Track active sessions for cleanup
  const sessions = new Map<string, { transport: StreamableHTTPServerTransport; server: McpServer }>();

  // POST /mcp — new or existing session
  app.post('/mcp', async (req: Req, res: Res) => {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;

    if (sessionId && sessions.has(sessionId)) {
      const session = sessions.get(sessionId)!;
      await session.transport.handleRequest(req, res, req.body);
      return;
    }

    // Stale session ID — client sent an ID we don't recognise
    if (sessionId) {
      res.status(404).json({
        jsonrpc: '2.0',
        error: { code: -32001, message: 'Session not found' },
        id: null,
      });
      return;
    }

    // New session — pre-generate ID so we can store the session before
    // handleRequest (which keeps the SSE stream open and may not resolve
    // until the client disconnects).
    const sid = randomUUID();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => sid,
    });

    const server = new McpServer({
      name: 'dj-claude',
      version: '0.1.15',
    });

    registerTools(server);

    transport.onclose = () => {
      sessions.delete(sid);
    };

    await server.connect(transport);
    sessions.set(sid, { transport, server });

    await transport.handleRequest(req, res, req.body);
  });

  // GET /mcp — SSE stream for server notifications
  app.get('/mcp', async (req: Req, res: Res) => {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;

    if (!sessionId || !sessions.has(sessionId)) {
      res.status(400).json({ error: 'Missing or invalid session ID. POST to /mcp first to initialize.' });
      return;
    }

    const session = sessions.get(sessionId)!;
    await session.transport.handleRequest(req, res);
  });

  // DELETE /mcp — session cleanup
  app.delete('/mcp', async (req: Req, res: Res) => {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;

    if (!sessionId || !sessions.has(sessionId)) {
      res.status(404).json({ error: 'Session not found.' });
      return;
    }

    const session = sessions.get(sessionId)!;
    await session.transport.close();
    sessions.delete(sessionId);
    res.status(200).json({ message: 'Session closed.' });
  });

  app.listen(port, () => {
    console.error(`[dj-claude-http] MCP HTTP server listening on http://127.0.0.1:${port}/mcp`);
    console.error(`[dj-claude-http] Connect multiple MCP clients to jam together.`);
  });
}
