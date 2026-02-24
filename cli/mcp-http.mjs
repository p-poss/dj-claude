#!/usr/bin/env node

// MCP HTTP entry point for DJ Claude — multi-agent jam sessions.
// CRITICAL: Redirect console.log to stderr FIRST — Strudel/cyclist logs
// write to console.log which would corrupt stdout output.
const _origLog = console.log;
console.log = (...args) => console.error(...args);

const browserMode = process.env.DJ_CLAUDE_BROWSER === '1';

// Polyfill must run before any Strudel imports.
if (!browserMode) {
  await import('./dist/audio/polyfill.js');
}

// Set backend mode before engine initialization
if (browserMode) {
  const { setBackendMode } = await import('./dist/audio/engine.js');
  setBackendMode('browser');
}

// Start the HTTP MCP server.
const { startHttpServer } = await import('./dist/mcp/http.js');
await startHttpServer(browserMode);
