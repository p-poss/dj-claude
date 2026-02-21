#!/usr/bin/env node

// MCP entry point for DJ Claude.
// CRITICAL: Redirect console.log to stderr FIRST — MCP uses stdout for
// JSON-RPC and Strudel/cyclist logs write to console.log which would
// corrupt the protocol.
const _origLog = console.log;
console.log = (...args) => console.error(...args);

// Polyfill must run before any Strudel imports.
await import('./dist/audio/polyfill.js');

// Start the MCP server.
const { startServer } = await import('./dist/mcp/server.js');
await startServer();
