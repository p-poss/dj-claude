#!/usr/bin/env node

// MCP entry point for DJ Claude.
// CRITICAL: Redirect console.log to stderr FIRST — MCP uses stdout for
// JSON-RPC and Strudel/cyclist logs write to console.log which would
// corrupt the protocol.
const _origLog = console.log;
console.log = (...args) => console.error(...args);

const browserMode = process.env.DJ_CLAUDE_BROWSER === '1';

// Polyfill must run before any Strudel imports.
// In browser mode the polyfill is not needed (Strudel runs in the browser).
if (!browserMode) {
  await import('./dist/audio/polyfill.js');
}

// Set backend mode before engine initialization
if (browserMode) {
  const { setBackendMode } = await import('./dist/audio/engine.js');
  setBackendMode('browser');
}

// Start the MCP server.
const { startServer } = await import('./dist/mcp/server.js');
await startServer(browserMode);
