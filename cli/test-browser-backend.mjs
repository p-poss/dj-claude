#!/usr/bin/env node

// Comprehensive test suite for the --browser audio backend.
// Tests the backend abstraction, browser backend WebSocket protocol,
// browser page HTML, entry point flag parsing, and MCP browser mode.
//
// Run: node test-browser-backend.mjs

import { spawn } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import http from 'node:http';
import WebSocket from 'ws';

const __dirname = dirname(fileURLToPath(import.meta.url));

let failures = 0;
let passes = 0;

function pass(label) { passes++; console.log(`  ✅ ${label}`); }
function fail(label, detail) {
  failures++;
  console.log(`  ❌ ${label}`);
  if (detail) console.log(`     ${typeof detail === 'string' ? detail : JSON.stringify(detail, null, 2).split('\n').join('\n     ')}`);
}

function assert(condition, label, detail) {
  if (condition) pass(label);
  else fail(label, detail);
}

// Fetch helper
function httpGet(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, body, headers: res.headers }));
    }).on('error', reject);
  });
}

// Wait for a condition with timeout
function waitFor(fn, timeoutMs = 5000, intervalMs = 50) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const check = () => {
      const result = fn();
      if (result) return resolve(result);
      if (Date.now() - start > timeoutMs) return reject(new Error('waitFor timed out'));
      setTimeout(check, intervalMs);
    };
    check();
  });
}

// ---------------------------------------------------------------------------
// Test 1: Backend abstraction — createBackend + setBackendMode
// ---------------------------------------------------------------------------
async function testBackendAbstraction() {
  console.log('\n🏗️  1. Backend abstraction (backend.ts)');

  const { createBackend } = await import('./dist/audio/backend.js');

  // createBackend('browser') should return a BrowserAudioBackend
  const browserBackend = await createBackend('browser');
  assert(browserBackend != null, 'createBackend("browser") returns an object');
  assert(typeof browserBackend.init === 'function', 'browser backend has init()');
  assert(typeof browserBackend.evaluate === 'function', 'browser backend has evaluate()');
  assert(typeof browserBackend.safeEvaluate === 'function', 'browser backend has safeEvaluate()');
  assert(typeof browserBackend.hush === 'function', 'browser backend has hush()');
  assert(typeof browserBackend.dispose === 'function', 'browser backend has dispose()');

  // setBackendMode + engine
  const { setBackendMode } = await import('./dist/audio/engine.js');
  assert(typeof setBackendMode === 'function', 'setBackendMode is exported from engine.ts');

  // Calling setBackendMode should not throw
  try {
    setBackendMode('browser');
    setBackendMode('node');
    pass('setBackendMode accepts "browser" and "node"');
  } catch (err) {
    fail('setBackendMode threw', err.message);
  }
}

// ---------------------------------------------------------------------------
// Test 2: Browser page HTML template
// ---------------------------------------------------------------------------
async function testBrowserPage() {
  console.log('\n📄 2. Browser page HTML template (browser-page.ts)');

  const { getPageHtml } = await import('./dist/audio/browser-page.js');

  const html = getPageHtml(12345);

  assert(typeof html === 'string' && html.length > 100, 'getPageHtml returns a non-trivial string');
  assert(html.includes('<!DOCTYPE html>'), 'HTML has doctype');
  assert(html.includes('<title>'), 'HTML has title tag');
  assert(html.includes('12345'), 'HTML contains the WebSocket port');
  assert(html.includes('unpkg.com/@strudel/web@1.2.6'), 'HTML loads pinned Strudel CDN');
  assert(html.includes('Start Audio') || html.includes('start-box'), 'HTML has start button');
  assert(html.includes('WebSocket'), 'HTML contains WebSocket client code');
  assert(html.includes("'ready'"), 'HTML sends ready message');
  assert(html.includes("'evaluate'"), 'HTML handles evaluate messages');
  assert(html.includes("'hush'"), 'HTML handles hush messages');
  assert(html.includes("'ack'"), 'HTML sends ack messages');
  assert(html.includes("'error'"), 'HTML sends error messages');

  // Port changes with different values
  const html2 = getPageHtml(9999);
  assert(html2.includes('9999') && !html2.includes('12345'), 'Port is dynamic based on argument');
}

// ---------------------------------------------------------------------------
// Test 3: BrowserAudioBackend — HTTP server + WebSocket protocol
// ---------------------------------------------------------------------------
async function testBrowserBackendProtocol() {
  console.log('\n🌐 3. BrowserAudioBackend — HTTP server + WebSocket protocol');

  const { BrowserAudioBackend } = await import('./dist/audio/browser-backend.js');
  const backend = new BrowserAudioBackend();

  // Override the browser opening — we don't want to actually open one.
  // The init() method calls openBrowser internally, but we can't easily
  // prevent it. Instead we'll call init() and quickly connect with our
  // own ws client before the timeout matters.

  // Start init in background — it will wait for "ready" from our ws client
  let initResolved = false;
  let initError = null;
  const initPromise = backend.init().then(() => {
    initResolved = true;
  }).catch(err => {
    initError = err;
  });

  // Give the HTTP/WS server a moment to bind
  await new Promise(r => setTimeout(r, 500));

  // Find the port by reading the internal state.
  // We'll try to connect to the HTTP server to find out.
  // The backend serves HTML on localhost, we need to find the port.
  // Since we can't directly access private fields, we try fetching common port range.
  // Actually, let's use a different approach — read stderr to find the port.
  // Better: just access the port from the log output or find it programmatically.

  // The server logs the port to stderr. But since we imported directly, the log
  // went to our own stderr. Let's capture it.
  // Actually, let's take a simpler approach: we'll access _port from the instance
  // since JS doesn't enforce private fields from TS.
  const port = backend.port;  // TS private, but accessible in JS
  assert(typeof port === 'number' && port > 0, `HTTP server bound to port ${port}`);

  // 3a. HTTP GET / returns the HTML page
  const resp = await httpGet(`http://127.0.0.1:${port}/`);
  assert(resp.status === 200, 'GET / returns 200');
  assert(resp.headers['content-type']?.includes('text/html'), 'GET / Content-Type is text/html');
  assert(resp.body.includes('<!DOCTYPE html>'), 'GET / serves HTML page');
  assert(resp.body.includes(`${port}`), 'Served HTML contains correct WS port');

  // 3b. HTTP GET /nonexistent returns 404
  const resp404 = await httpGet(`http://127.0.0.1:${port}/nonexistent`);
  assert(resp404.status === 404, 'GET /nonexistent returns 404');

  // 3c. Connect WebSocket and send ready
  const ws = new WebSocket(`ws://127.0.0.1:${port}`);
  await new Promise((resolve, reject) => {
    ws.on('open', resolve);
    ws.on('error', reject);
    setTimeout(() => reject(new Error('WS connect timeout')), 3000);
  });
  pass('WebSocket connected to server');

  // Send ready — this should unblock init()
  ws.send(JSON.stringify({ type: 'ready' }));
  await new Promise(r => setTimeout(r, 200));
  assert(initResolved, 'init() resolved after browser sent "ready"');
  assert(initError === null, 'init() did not throw');

  // 3d. evaluate() — send code, receive it on WS, reply with ack
  const evalMessages = [];
  ws.on('message', (data) => {
    evalMessages.push(JSON.parse(data.toString()));
  });

  // Call evaluate — it will send an "evaluate" message and wait for "ack"
  let evalResolved = false;
  let evalError = null;
  const evalPromise = backend.evaluate('note("c3").s("triangle")').then(() => {
    evalResolved = true;
  }).catch(err => {
    evalError = err;
  });

  // Wait for the evaluate message to arrive
  await waitFor(() => evalMessages.length > 0);
  const evalMsg = evalMessages[0];

  assert(evalMsg.type === 'evaluate', 'evaluate() sends { type: "evaluate" } over WS');
  assert(evalMsg.code === 'note("c3").s("triangle")', 'evaluate() sends correct code');
  assert(typeof evalMsg.id === 'string' && evalMsg.id.length > 0, 'evaluate() includes a unique id');

  // Reply with ack
  ws.send(JSON.stringify({ type: 'ack', id: evalMsg.id }));
  await new Promise(r => setTimeout(r, 100));
  assert(evalResolved, 'evaluate() promise resolves on ack');
  assert(evalError === null, 'evaluate() did not reject');

  // 3e. evaluate() — error response
  evalMessages.length = 0;
  let evalErrorResult = null;
  const evalErrPromise = backend.evaluate('bad code here').catch(err => {
    evalErrorResult = err;
  });

  await waitFor(() => evalMessages.length > 0);
  const evalMsg2 = evalMessages[0];
  assert(evalMsg2.type === 'evaluate', 'Second evaluate sends message');

  // Reply with error
  ws.send(JSON.stringify({ type: 'error', id: evalMsg2.id, error: 'SyntaxError: bad code' }));
  await new Promise(r => setTimeout(r, 100));
  assert(evalErrorResult instanceof Error, 'evaluate() rejects on error response');
  assert(evalErrorResult.message.includes('SyntaxError'), 'Error message is forwarded from browser');

  // 3f. hush() — sends hush message
  evalMessages.length = 0;
  backend.hush();
  await waitFor(() => evalMessages.length > 0);
  assert(evalMessages[0].type === 'hush', 'hush() sends { type: "hush" } over WS');

  // 3g. safeEvaluate() — success case
  evalMessages.length = 0;
  const safeResultPromise = backend.safeEvaluate('note("e3")', 'note("c3")');
  await waitFor(() => evalMessages.length > 0);
  ws.send(JSON.stringify({ type: 'ack', id: evalMessages[0].id }));
  const safeResult = await safeResultPromise;
  assert(safeResult.success === true, 'safeEvaluate returns { success: true } on ack');
  assert(safeResult.error === undefined, 'safeEvaluate has no error on success');

  // 3h. safeEvaluate() — failure with fallback
  evalMessages.length = 0;
  const safeFallbackPromise = backend.safeEvaluate('broken()', 'note("c3")');
  await waitFor(() => evalMessages.length > 0);
  // Reject new code
  ws.send(JSON.stringify({ type: 'error', id: evalMessages[0].id, error: 'Fail' }));
  // Wait for fallback evaluate
  await waitFor(() => evalMessages.length > 1, 3000);
  // Ack the fallback
  ws.send(JSON.stringify({ type: 'ack', id: evalMessages[1].id }));
  const safeFallback = await safeFallbackPromise;
  assert(safeFallback.success === false, 'safeEvaluate returns { success: false } on error');
  assert(typeof safeFallback.error === 'string', 'safeEvaluate includes error string');
  assert(evalMessages[1].code === 'note("c3")', 'safeEvaluate re-evaluates previousCode on failure');

  // 3i. dispose() — cleans up
  ws.close();
  await new Promise(r => setTimeout(r, 100));
  backend.dispose();
  pass('dispose() completes without throwing');

  // Verify server is closed
  try {
    await httpGet(`http://127.0.0.1:${port}/`);
    fail('HTTP server should be closed after dispose');
  } catch {
    pass('HTTP server is closed after dispose');
  }
}

// ---------------------------------------------------------------------------
// Test 4: Evaluate timeout (10s)
// ---------------------------------------------------------------------------
async function testEvaluateTimeout() {
  console.log('\n⏱️  4. Evaluate timeout');

  const { BrowserAudioBackend } = await import('./dist/audio/browser-backend.js');
  const backend = new BrowserAudioBackend();

  // Start init in background
  const initPromise = backend.init();
  await new Promise(r => setTimeout(r, 500));

  const port = backend.port;
  const ws = new WebSocket(`ws://127.0.0.1:${port}`);
  await new Promise((resolve, reject) => {
    ws.on('open', resolve);
    ws.on('error', reject);
    setTimeout(() => reject(new Error('WS connect timeout')), 3000);
  });

  // Send ready to unblock init
  ws.send(JSON.stringify({ type: 'ready' }));
  await initPromise;

  // Consume messages but do NOT ack
  ws.on('message', () => {});

  // evaluate should timeout after 10s
  const start = Date.now();
  let timeoutError = null;
  try {
    await backend.evaluate('note("c3")');
  } catch (err) {
    timeoutError = err;
  }
  const elapsed = Date.now() - start;

  assert(timeoutError !== null, 'evaluate() rejects on timeout');
  assert(timeoutError.message.includes('timed out'), `Timeout error message: "${timeoutError.message}"`);
  assert(elapsed >= 9000 && elapsed <= 12000, `Timeout took ~10s (actual: ${elapsed}ms)`);

  ws.close();
  backend.dispose();
}

// ---------------------------------------------------------------------------
// Test 5: Command queuing when browser not connected
// ---------------------------------------------------------------------------
async function testCommandQueuing() {
  console.log('\n📬 5. Command queuing (browser not connected)');

  const { BrowserAudioBackend } = await import('./dist/audio/browser-backend.js');
  const backend = new BrowserAudioBackend();

  // Start init — server starts but no browser connected yet
  const initPromise = backend.init();
  await new Promise(r => setTimeout(r, 500));

  const port = backend.port;

  // Calling evaluate before connection should queue without throwing
  // (the promise resolves immediately since there's no socket)
  let queued = false;
  try {
    await backend.evaluate('note("c3")');
    queued = true;
  } catch {
    queued = false;
  }
  assert(queued, 'evaluate() before connection resolves (queued)');

  // Now connect as the browser and send ready
  const ws = new WebSocket(`ws://127.0.0.1:${port}`);
  await new Promise((resolve, reject) => {
    ws.on('open', resolve);
    ws.on('error', reject);
    setTimeout(() => reject(new Error('WS connect timeout')), 3000);
  });

  const receivedMessages = [];
  ws.on('message', (data) => {
    receivedMessages.push(JSON.parse(data.toString()));
  });

  ws.send(JSON.stringify({ type: 'ready' }));
  await initPromise;

  // Wait for queued messages + replay to arrive
  await new Promise(r => setTimeout(r, 500));

  // The backend should have flushed the queue AND replayed currentCode
  // Queue had one evaluate, and currentCode was set, so we may get
  // the queue flush + a replay evaluate
  const evaluateMessages = receivedMessages.filter(m => m.type === 'evaluate');
  assert(evaluateMessages.length >= 1, `Queued commands flushed on connect (got ${evaluateMessages.length} evaluate messages)`);
  assert(evaluateMessages.some(m => m.code === 'note("c3")'), 'Queued code was sent to browser');

  ws.close();
  backend.dispose();
}

// ---------------------------------------------------------------------------
// Test 6: Reconnection replays current code
// ---------------------------------------------------------------------------
async function testReconnection() {
  console.log('\n🔄 6. Reconnection — replays current code');

  const { BrowserAudioBackend } = await import('./dist/audio/browser-backend.js');
  const backend = new BrowserAudioBackend();

  const initPromise = backend.init();
  await new Promise(r => setTimeout(r, 500));

  const port = backend.port;

  // First connection
  const ws1 = new WebSocket(`ws://127.0.0.1:${port}`);
  await new Promise((resolve, reject) => {
    ws1.on('open', resolve);
    ws1.on('error', reject);
    setTimeout(() => reject(new Error('WS connect timeout')), 3000);
  });

  const ws1Messages = [];
  ws1.on('message', (data) => {
    ws1Messages.push(JSON.parse(data.toString()));
  });

  ws1.send(JSON.stringify({ type: 'ready' }));
  await initPromise;

  // Evaluate some code
  const evalPromise = backend.evaluate('s("bd sd hh cp")');
  await waitFor(() => ws1Messages.length > 0);
  ws1.send(JSON.stringify({ type: 'ack', id: ws1Messages[0].id }));
  await evalPromise;
  pass('First connection: code evaluated');

  // Disconnect first client
  ws1.close();
  await new Promise(r => setTimeout(r, 300));

  // Second connection (simulating browser reload/reconnect)
  const ws2 = new WebSocket(`ws://127.0.0.1:${port}`);
  await new Promise((resolve, reject) => {
    ws2.on('open', resolve);
    ws2.on('error', reject);
    setTimeout(() => reject(new Error('WS connect timeout')), 3000);
  });

  const ws2Messages = [];
  ws2.on('message', (data) => {
    ws2Messages.push(JSON.parse(data.toString()));
  });

  ws2.send(JSON.stringify({ type: 'ready' }));

  // Should replay currentCode
  await waitFor(() => ws2Messages.length > 0, 3000);
  const replayMsg = ws2Messages.find(m => m.type === 'evaluate');
  assert(replayMsg != null, 'Reconnection triggers code replay');
  assert(replayMsg?.code === 's("bd sd hh cp")', 'Replayed code matches last evaluated code');

  ws2.close();
  backend.dispose();
}

// ---------------------------------------------------------------------------
// Test 7: bin.mjs --browser flag parsing
// ---------------------------------------------------------------------------
async function testBinBrowserFlag() {
  console.log('\n🚩 7. bin.mjs --browser flag parsing');

  // We can't fully run bin.mjs (it starts the TUI), but we can verify
  // the flag parsing by checking the file contents.
  const { readFileSync } = await import('fs');
  const binContent = readFileSync(resolve(__dirname, 'bin.mjs'), 'utf-8');

  assert(binContent.includes("'--browser'"), 'bin.mjs checks for --browser flag');
  assert(binContent.includes("setBackendMode('browser')"), 'bin.mjs calls setBackendMode("browser")');
  assert(binContent.includes('!browserMode'), 'bin.mjs conditionally skips polyfill');
  assert(binContent.includes('runHeadless(prompt, duration, browserMode'), 'bin.mjs passes mode to runHeadless');
}

// ---------------------------------------------------------------------------
// Test 8: mcp.mjs DJ_CLAUDE_BROWSER env var
// ---------------------------------------------------------------------------
async function testMcpBrowserEnv() {
  console.log('\n🌍 8. mcp.mjs DJ_CLAUDE_BROWSER env var');

  const { readFileSync } = await import('fs');
  const mcpContent = readFileSync(resolve(__dirname, 'mcp.mjs'), 'utf-8');

  assert(mcpContent.includes('DJ_CLAUDE_BROWSER'), 'mcp.mjs reads DJ_CLAUDE_BROWSER env var');
  assert(mcpContent.includes("=== '1'"), 'mcp.mjs checks for DJ_CLAUDE_BROWSER=1');
  assert(mcpContent.includes("setBackendMode('browser')"), 'mcp.mjs calls setBackendMode("browser")');
  assert(mcpContent.includes('startServer(browserMode)'), 'mcp.mjs passes browserMode to startServer');
  assert(mcpContent.includes('!browserMode'), 'mcp.mjs conditionally skips polyfill');
}

// ---------------------------------------------------------------------------
// Test 9: MCP server lazy init in browser mode
// ---------------------------------------------------------------------------
async function testMcpLazyInit() {
  console.log('\n💤 9. MCP server — lazy init in browser mode');

  const { readFileSync } = await import('fs');
  const serverContent = readFileSync(resolve(__dirname, 'src/mcp/server.ts'), 'utf-8');

  assert(serverContent.includes('isBrowserMode'), 'server.ts accepts isBrowserMode parameter');
  assert(serverContent.includes('!browserMode'), 'server.ts conditionally skips eager init');
  assert(serverContent.includes('ensureEngine'), 'server.ts uses ensureEngine for lazy init');
}

// ---------------------------------------------------------------------------
// Test 10: headless.ts accepts mode parameter
// ---------------------------------------------------------------------------
async function testHeadlessMode() {
  console.log('\n🖥️  10. headless.ts — backend mode parameter');

  const { readFileSync } = await import('fs');
  const headlessContent = readFileSync(resolve(__dirname, 'src/headless.ts'), 'utf-8');

  assert(headlessContent.includes("mode: BackendMode = 'node'"), 'headless.ts accepts mode parameter with node default');
  assert(headlessContent.includes('setBackendMode(mode)'), 'headless.ts calls setBackendMode');
  assert(headlessContent.includes("mode === 'browser'"), 'headless.ts checks for browser mode');
  assert(headlessContent.includes('click') || headlessContent.includes('Click'), 'headless.ts logs browser click instruction');
}

// ---------------------------------------------------------------------------
// Test 11: Node backend still works (no regression)
// ---------------------------------------------------------------------------
async function testNodeBackendRegression() {
  console.log('\n🔊 11. Node backend — no regression');

  // Load polyfill first (needed for node backend)
  await import('./dist/audio/polyfill.js');

  const { NodeAudioBackend } = await import('./dist/audio/node-backend.js');

  const backend = new NodeAudioBackend();
  assert(typeof backend.init === 'function', 'NodeAudioBackend has init()');
  assert(typeof backend.evaluate === 'function', 'NodeAudioBackend has evaluate()');
  assert(typeof backend.safeEvaluate === 'function', 'NodeAudioBackend has safeEvaluate()');
  assert(typeof backend.hush === 'function', 'NodeAudioBackend has hush()');
  assert(typeof backend.dispose === 'function', 'NodeAudioBackend has dispose()');

  // Init the node backend and play a quick note
  await backend.init();
  pass('NodeAudioBackend.init() succeeds');

  await backend.evaluate('note("c3").s("triangle")');
  pass('NodeAudioBackend.evaluate() succeeds');

  const result = await backend.safeEvaluate('note("e3")', 'note("c3")');
  assert(result.success === true, 'NodeAudioBackend.safeEvaluate() returns success');

  backend.hush();
  pass('NodeAudioBackend.hush() succeeds');

  backend.dispose();
  pass('NodeAudioBackend.dispose() succeeds');
}

// ---------------------------------------------------------------------------
// Test 12: MCP server in node mode (existing tests still pass)
// ---------------------------------------------------------------------------
async function testMcpNodeMode() {
  console.log('\n📡 12. MCP server — node mode (regression)');

  const server = spawn('node', [resolve(__dirname, 'mcp.mjs')], {
    stdio: ['pipe', 'pipe', 'pipe'],
    cwd: __dirname,
  });

  let stdoutBuf = '';
  const pending = {};

  server.stdout.on('data', (chunk) => {
    stdoutBuf += chunk.toString();
    let idx;
    while ((idx = stdoutBuf.indexOf('\n')) !== -1) {
      const line = stdoutBuf.slice(0, idx).trim();
      stdoutBuf = stdoutBuf.slice(idx + 1);
      if (!line) continue;
      try {
        const msg = JSON.parse(line);
        if (msg.id != null && pending[msg.id]) {
          pending[msg.id].resolve(msg);
          delete pending[msg.id];
        }
      } catch { /* ignore */ }
    }
  });

  let idCounter = 0;
  function sendAndWait(method, params = {}, timeoutMs = 30000) {
    const id = ++idCounter;
    const obj = { jsonrpc: '2.0', id, method, params };
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        delete pending[id];
        reject(new Error(`Timeout: ${method}`));
      }, timeoutMs);
      pending[id] = {
        resolve: (msg) => { clearTimeout(timer); resolve(msg); },
      };
      server.stdin.write(JSON.stringify(obj) + '\n');
    });
  }

  try {
    // Initialize
    const initResp = await sendAndWait('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'test', version: '1.0.0' },
    });
    assert(initResp.result?.serverInfo?.name === 'dj-claude', 'MCP init — server identified');
    server.stdin.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized', params: {} }) + '\n');
    await new Promise(r => setTimeout(r, 500));

    // tools/list
    const listResp = await sendAndWait('tools/list');
    const toolNames = (listResp.result?.tools ?? []).map(t => t.name).sort();
    assert(JSON.stringify(toolNames) === JSON.stringify(['hush', 'now_playing', 'play_music', 'play_strudel', 'set_vibe']),
      `All 5 tools present: ${toolNames.join(', ')}`);

    // play_strudel
    const psResp = await sendAndWait('tools/call', {
      name: 'play_strudel',
      arguments: { code: 'note("c3 e3 g3").s("triangle").slow(2)' },
    }, 15000);
    assert(!psResp.result?.isError, 'play_strudel succeeds');

    // hush
    const hushResp = await sendAndWait('tools/call', { name: 'hush', arguments: {} });
    assert(hushResp.result?.content?.[0]?.text?.includes('stop'), 'hush succeeds');

    pass('MCP node mode — all basic operations work');
  } catch (err) {
    fail('MCP node mode test error', err.message);
  } finally {
    server.stdin.end();
    server.kill('SIGTERM');
    await new Promise(r => setTimeout(r, 1000));
  }
}

// ---------------------------------------------------------------------------
// Test 13: Multiple evaluate calls — only latest resolves
// ---------------------------------------------------------------------------
async function testRapidEvaluateCalls() {
  console.log('\n⚡ 13. Rapid evaluate calls — all resolve independently');

  const { BrowserAudioBackend } = await import('./dist/audio/browser-backend.js');
  const backend = new BrowserAudioBackend();

  const initPromise = backend.init();
  await new Promise(r => setTimeout(r, 500));

  const port = backend.port;
  const ws = new WebSocket(`ws://127.0.0.1:${port}`);
  await new Promise((resolve, reject) => {
    ws.on('open', resolve);
    ws.on('error', reject);
    setTimeout(() => reject(new Error('WS connect timeout')), 3000);
  });

  const messages = [];
  ws.on('message', (data) => {
    messages.push(JSON.parse(data.toString()));
  });

  ws.send(JSON.stringify({ type: 'ready' }));
  await initPromise;

  // Fire 3 rapid evaluate calls
  const results = [];
  const p1 = backend.evaluate('code1').then(() => results.push('code1'));
  const p2 = backend.evaluate('code2').then(() => results.push('code2'));
  const p3 = backend.evaluate('code3').then(() => results.push('code3'));

  // Wait for all 3 messages to arrive
  await waitFor(() => messages.length >= 3);
  assert(messages.length === 3, `Received all 3 evaluate messages (got ${messages.length})`);

  // Ack all 3 — each should resolve independently
  for (const msg of messages) {
    ws.send(JSON.stringify({ type: 'ack', id: msg.id }));
  }

  await Promise.all([p1, p2, p3]);
  assert(results.length === 3, 'All 3 evaluate promises resolved');
  pass('Rapid evaluate calls handled correctly');

  ws.close();
  backend.dispose();
}

// ---------------------------------------------------------------------------
// Test 14: hush() clears currentCode so reconnect doesn't replay
// ---------------------------------------------------------------------------
async function testHushClearsCode() {
  console.log('\n🤫 14. hush() clears currentCode — no replay on reconnect');

  const { BrowserAudioBackend } = await import('./dist/audio/browser-backend.js');
  const backend = new BrowserAudioBackend();

  const initPromise = backend.init();
  await new Promise(r => setTimeout(r, 500));

  const port = backend.port;

  // First connection
  const ws1 = new WebSocket(`ws://127.0.0.1:${port}`);
  await new Promise((resolve, reject) => {
    ws1.on('open', resolve);
    ws1.on('error', reject);
  });

  const ws1Msgs = [];
  ws1.on('message', (data) => ws1Msgs.push(JSON.parse(data.toString())));

  ws1.send(JSON.stringify({ type: 'ready' }));
  await initPromise;

  // Evaluate code
  const evalP = backend.evaluate('s("bd")');
  await waitFor(() => ws1Msgs.length > 0);
  ws1.send(JSON.stringify({ type: 'ack', id: ws1Msgs[0].id }));
  await evalP;

  // Hush — should clear currentCode
  backend.hush();
  await new Promise(r => setTimeout(r, 100));

  // Disconnect and reconnect
  ws1.close();
  await new Promise(r => setTimeout(r, 300));

  const ws2 = new WebSocket(`ws://127.0.0.1:${port}`);
  await new Promise((resolve, reject) => {
    ws2.on('open', resolve);
    ws2.on('error', reject);
  });

  const ws2Msgs = [];
  ws2.on('message', (data) => ws2Msgs.push(JSON.parse(data.toString())));

  ws2.send(JSON.stringify({ type: 'ready' }));
  await new Promise(r => setTimeout(r, 500));

  const replayMessages = ws2Msgs.filter(m => m.type === 'evaluate');
  assert(replayMessages.length === 0, 'No code replayed after hush (currentCode was cleared)');

  ws2.close();
  backend.dispose();
}

// ---------------------------------------------------------------------------
// Test 15: dispose() rejects pending evaluations
// ---------------------------------------------------------------------------
async function testDisposeRejectsPending() {
  console.log('\n🧹 15. dispose() rejects pending evaluations');

  const { BrowserAudioBackend } = await import('./dist/audio/browser-backend.js');
  const backend = new BrowserAudioBackend();

  const initPromise = backend.init();
  await new Promise(r => setTimeout(r, 500));

  const port = backend.port;
  const ws = new WebSocket(`ws://127.0.0.1:${port}`);
  await new Promise((resolve, reject) => {
    ws.on('open', resolve);
    ws.on('error', reject);
  });

  ws.on('message', () => {}); // consume but don't ack
  ws.send(JSON.stringify({ type: 'ready' }));
  await initPromise;

  // Start an evaluate that will never be acked
  let disposeError = null;
  const evalPromise = backend.evaluate('note("c3")').catch(err => {
    disposeError = err;
  });

  await new Promise(r => setTimeout(r, 200));

  // Dispose while evaluate is pending
  backend.dispose();
  await evalPromise;

  assert(disposeError !== null, 'Pending evaluate rejected on dispose');
  assert(disposeError.message.includes('disposed'), `Error message: "${disposeError.message}"`);

  ws.close();
}

// ---------------------------------------------------------------------------
// Run all tests
// ---------------------------------------------------------------------------
async function run() {
  const start = Date.now();

  try {
    await testBackendAbstraction();
    await testBrowserPage();
    await testBrowserBackendProtocol();
    await testEvaluateTimeout();
    await testCommandQueuing();
    await testReconnection();
    await testBinBrowserFlag();
    await testMcpBrowserEnv();
    await testMcpLazyInit();
    await testHeadlessMode();
    await testNodeBackendRegression();
    await testMcpNodeMode();
    await testRapidEvaluateCalls();
    await testHushClearsCode();
    await testDisposeRejectsPending();
  } catch (err) {
    fail('Uncaught test error', err.stack || err.message);
  }

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log('\n' + '═'.repeat(50));
  if (failures === 0) {
    console.log(`🎉 All ${passes} tests passed! (${elapsed}s)`);
  } else {
    console.log(`💔 ${failures} failed, ${passes} passed (${elapsed}s)`);
  }
  console.log('═'.repeat(50) + '\n');
  process.exit(failures > 0 ? 1 : 0);
}

run();
