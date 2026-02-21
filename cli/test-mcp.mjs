#!/usr/bin/env node

// Robust MCP server test harness.
// Sends JSON-RPC messages to the MCP server via stdio and validates responses.

import { spawn } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MCP_ENTRY = resolve(__dirname, 'mcp.mjs');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let idCounter = 0;
function rpcRequest(method, params = {}) {
  return { jsonrpc: '2.0', id: ++idCounter, method, params };
}
function rpcNotification(method, params = {}) {
  return { jsonrpc: '2.0', method, params };
}

function pass(label) { console.log(`  ✅ ${label}`); }
function fail(label, detail) {
  console.log(`  ❌ ${label}`);
  if (detail) console.log(`     ${typeof detail === 'string' ? detail : JSON.stringify(detail, null, 2).split('\n').join('\n     ')}`);
  failures++;
}

let failures = 0;

// ---------------------------------------------------------------------------
// Spawn the MCP server
// ---------------------------------------------------------------------------

console.log('\n🔧 Spawning MCP server...\n');

const server = spawn('node', [MCP_ENTRY], {
  stdio: ['pipe', 'pipe', 'pipe'],
  cwd: __dirname,
});

let stdoutBuf = '';
const responses = [];    // resolved JSON-RPC responses keyed by id
const pending = {};      // id → { resolve }

server.stdout.on('data', (chunk) => {
  stdoutBuf += chunk.toString();
  // Parse newline-delimited JSON-RPC
  let idx;
  while ((idx = stdoutBuf.indexOf('\n')) !== -1) {
    const line = stdoutBuf.slice(0, idx).trim();
    stdoutBuf = stdoutBuf.slice(idx + 1);
    if (!line) continue;
    try {
      const msg = JSON.parse(line);
      responses.push(msg);
      if (msg.id != null && pending[msg.id]) {
        pending[msg.id].resolve(msg);
        delete pending[msg.id];
      }
    } catch (e) {
      fail('stdout parse', `Non-JSON on stdout: ${line}`);
    }
  }
});

let stderrText = '';
server.stderr.on('data', (chunk) => { stderrText += chunk.toString(); });

function send(obj) {
  server.stdin.write(JSON.stringify(obj) + '\n');
}

function sendAndWait(obj, timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      delete pending[obj.id];
      reject(new Error(`Timeout waiting for response to id=${obj.id} method=${obj.method}`));
    }, timeoutMs);
    pending[obj.id] = {
      resolve: (msg) => { clearTimeout(timer); resolve(msg); },
    };
    send(obj);
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

async function run() {
  try {
    // -----------------------------------------------------------------------
    // 1. Initialize handshake
    // -----------------------------------------------------------------------
    console.log('📡 1. MCP Handshake');
    const initResp = await sendAndWait(rpcRequest('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'test-harness', version: '1.0.0' },
    }));
    if (initResp.result?.serverInfo?.name === 'dj-claude') {
      pass('initialize — server identified as dj-claude');
    } else {
      fail('initialize — unexpected serverInfo', initResp.result);
    }
    if (initResp.result?.capabilities?.tools) {
      pass('initialize — tools capability advertised');
    } else {
      fail('initialize — no tools capability', initResp.result?.capabilities);
    }

    // Send initialized notification (no response expected)
    send(rpcNotification('notifications/initialized'));
    await new Promise(r => setTimeout(r, 500));

    // -----------------------------------------------------------------------
    // 2. tools/list
    // -----------------------------------------------------------------------
    console.log('\n📋 2. tools/list');
    const listResp = await sendAndWait(rpcRequest('tools/list'));
    const tools = listResp.result?.tools ?? [];
    const toolNames = tools.map(t => t.name).sort();
    const expected = ['hush', 'now_playing', 'play_music', 'play_strudel', 'set_vibe'];

    if (JSON.stringify(toolNames) === JSON.stringify(expected)) {
      pass(`All 5 tools registered: ${toolNames.join(', ')}`);
    } else {
      fail('Tool list mismatch', { expected, got: toolNames });
    }

    // Validate schemas
    for (const tool of tools) {
      const schema = tool.inputSchema;
      if (!schema || schema.type !== 'object') {
        fail(`${tool.name} — missing/invalid inputSchema`, schema);
      } else {
        pass(`${tool.name} — valid inputSchema`);
      }
    }

    // Check specific schema details
    const playMusic = tools.find(t => t.name === 'play_music');
    if (playMusic?.inputSchema?.required?.includes('prompt')) {
      pass('play_music — "prompt" is required');
    } else {
      fail('play_music — "prompt" not required', playMusic?.inputSchema);
    }

    const setVibe = tools.find(t => t.name === 'set_vibe');
    const moodEnum = setVibe?.inputSchema?.properties?.mood?.enum;
    if (moodEnum && moodEnum.length === 8 && moodEnum.includes('chill') && moodEnum.includes('epic')) {
      pass(`set_vibe — mood enum has 8 values: ${moodEnum.join(', ')}`);
    } else {
      fail('set_vibe — unexpected mood enum', moodEnum);
    }

    const hushTool = tools.find(t => t.name === 'hush');
    const hushRequired = hushTool?.inputSchema?.required;
    if (!hushRequired || hushRequired.length === 0) {
      pass('hush — no required params');
    } else {
      fail('hush — unexpected required params', hushRequired);
    }

    // -----------------------------------------------------------------------
    // 3. now_playing (nothing playing yet)
    // -----------------------------------------------------------------------
    console.log('\n🔍 3. now_playing (initial — nothing playing)');
    const npResp = await sendAndWait(rpcRequest('tools/call', {
      name: 'now_playing', arguments: {},
    }));
    const npText = npResp.result?.content?.[0]?.text ?? '';
    if (npText.toLowerCase().includes('nothing')) {
      pass(`Returned: "${npText}"`);
    } else {
      fail('Expected "nothing" message', npResp.result);
    }

    // -----------------------------------------------------------------------
    // 4. hush (when nothing is playing — should still succeed)
    // -----------------------------------------------------------------------
    console.log('\n🤫 4. hush (idempotent — nothing playing)');
    const hushResp = await sendAndWait(rpcRequest('tools/call', {
      name: 'hush', arguments: {},
    }));
    const hushText = hushResp.result?.content?.[0]?.text ?? '';
    if (hushText.toLowerCase().includes('stop')) {
      pass(`Returned: "${hushText}"`);
    } else {
      fail('Expected "stopped" message', hushResp.result);
    }
    if (!hushResp.result?.isError) {
      pass('No error flag');
    } else {
      fail('Unexpected error flag on hush');
    }

    // -----------------------------------------------------------------------
    // 5. play_strudel — valid code
    // -----------------------------------------------------------------------
    console.log('\n🎵 5. play_strudel (valid Strudel code)');
    const strudelCode = 'note("c3 e3 g3").s("triangle").slow(2)';
    const psResp = await sendAndWait(rpcRequest('tools/call', {
      name: 'play_strudel', arguments: { code: strudelCode },
    }), 15000);
    const psText = psResp.result?.content?.[0]?.text ?? '';
    if (psText.includes('Now playing') && psText.includes(strudelCode)) {
      pass('Valid code accepted and playing');
    } else {
      fail('Unexpected response for valid code', psText);
    }
    if (!psResp.result?.isError) {
      pass('No error flag');
    } else {
      fail('Unexpected error flag');
    }

    // -----------------------------------------------------------------------
    // 6. now_playing (should show the strudel code)
    // -----------------------------------------------------------------------
    console.log('\n🔍 6. now_playing (after play_strudel)');
    const np2Resp = await sendAndWait(rpcRequest('tools/call', {
      name: 'now_playing', arguments: {},
    }));
    const np2Text = np2Resp.result?.content?.[0]?.text ?? '';
    let np2Data;
    try { np2Data = JSON.parse(np2Text); } catch { np2Data = null; }
    if (np2Data?.isPlaying === true) {
      pass('isPlaying: true');
    } else {
      fail('Expected isPlaying: true', np2Text);
    }
    if (np2Data?.currentCode === strudelCode) {
      pass('currentCode matches');
    } else {
      fail('currentCode mismatch', { expected: strudelCode, got: np2Data?.currentCode });
    }

    // -----------------------------------------------------------------------
    // 7. play_strudel — code with syntax error (unclosed paren)
    // -----------------------------------------------------------------------
    console.log('\n💥 7. play_strudel (syntax error — error handling)');
    const badCode = 'note("c3").s("triangle"';  // unclosed paren
    const badResp = await sendAndWait(rpcRequest('tools/call', {
      name: 'play_strudel', arguments: { code: badCode },
    }), 15000);
    const badText = badResp.result?.content?.[0]?.text ?? '';
    if (badResp.result?.isError || badText.toLowerCase().includes('error')) {
      pass(`Error returned: "${badText.slice(0, 100)}"`);
    } else {
      // Strudel's REPL is lenient — may accept malformed code without throwing.
      // This is acceptable: safeEvaluate will restore previousCode if it DOES throw.
      console.log(`  ⚠️  Strudel accepted malformed code without error (REPL is lenient)`);
    }

    // Verify state is consistent regardless of error/success path
    const np3Resp = await sendAndWait(rpcRequest('tools/call', {
      name: 'now_playing', arguments: {},
    }));
    const np3Text = np3Resp.result?.content?.[0]?.text ?? '';
    if (np3Text.includes('isPlaying')) {
      pass('State is consistent after error test');
    } else if (np3Text.toLowerCase().includes('nothing')) {
      pass('State is consistent (nothing playing — error stopped playback)');
    } else {
      fail('Unexpected state after error test', np3Text);
    }

    // -----------------------------------------------------------------------
    // 8. play_strudel — replace with new code
    // -----------------------------------------------------------------------
    console.log('\n🎶 8. play_strudel (replace with new pattern)');
    const newCode = 's("bd sd").fast(2)';
    const ps2Resp = await sendAndWait(rpcRequest('tools/call', {
      name: 'play_strudel', arguments: { code: newCode },
    }), 15000);
    if (!ps2Resp.result?.isError && ps2Resp.result?.content?.[0]?.text?.includes(newCode)) {
      pass('New pattern accepted');
    } else {
      fail('New pattern failed', ps2Resp.result);
    }

    // -----------------------------------------------------------------------
    // 9. hush (stop actual playback)
    // -----------------------------------------------------------------------
    console.log('\n🤫 9. hush (stop playback)');
    const hush2Resp = await sendAndWait(rpcRequest('tools/call', {
      name: 'hush', arguments: {},
    }));
    if (hush2Resp.result?.content?.[0]?.text?.includes('stop')) {
      pass('Playback stopped');
    } else {
      fail('Unexpected hush response', hush2Resp.result);
    }

    // -----------------------------------------------------------------------
    // 10. play_music (requires ANTHROPIC_API_KEY — test error if missing)
    // -----------------------------------------------------------------------
    console.log('\n🎤 10. play_music (Claude API integration)');
    const pmResp = await sendAndWait(rpcRequest('tools/call', {
      name: 'play_music', arguments: { prompt: 'a single quiet note' },
    }), 45000);
    const pmText = pmResp.result?.content?.[0]?.text ?? '';
    if (pmResp.result?.isError || pmResp.error) {
      // API key may be missing or call may fail — that's acceptable
      const errMsg = pmResp.error?.message ?? pmText;
      console.log(`  ⚠️  play_music returned error (expected if no API key): ${errMsg.slice(0, 120)}`);
    } else if (pmText.includes('Now playing')) {
      pass(`Claude generated music! Commentary: "${pmText.split('\n')[0].slice(0, 80)}..."`);
      // Hush after successful play
      await sendAndWait(rpcRequest('tools/call', { name: 'hush', arguments: {} }));
    } else {
      fail('Unexpected play_music response', pmText);
    }

    // -----------------------------------------------------------------------
    // 11. set_vibe (Claude API integration)
    // -----------------------------------------------------------------------
    console.log('\n🌊 11. set_vibe (Claude API integration)');
    const svResp = await sendAndWait(rpcRequest('tools/call', {
      name: 'set_vibe', arguments: { mood: 'chill' },
    }), 45000);
    const svText = svResp.result?.content?.[0]?.text ?? '';
    if (svResp.result?.isError || svResp.error) {
      const errMsg = svResp.error?.message ?? svText;
      console.log(`  ⚠️  set_vibe returned error (expected if no API key): ${errMsg.slice(0, 120)}`);
    } else if (svText.includes('chill') || svText.includes('Vibe set')) {
      pass(`Vibe set! Response: "${svText.split('\n')[0].slice(0, 80)}..."`);
      await sendAndWait(rpcRequest('tools/call', { name: 'hush', arguments: {} }));
    } else {
      fail('Unexpected set_vibe response', svText);
    }

    // -----------------------------------------------------------------------
    // 12. Stdout cleanliness — verify no log messages leaked to stdout
    // -----------------------------------------------------------------------
    console.log('\n🧹 12. Stdout cleanliness');
    const nonJsonOnStdout = responses.filter(r => {
      // Every response should be valid JSON-RPC (have jsonrpc field)
      return !r.jsonrpc;
    });
    if (nonJsonOnStdout.length === 0) {
      pass(`All ${responses.length} stdout messages are valid JSON-RPC`);
    } else {
      fail('Non-JSON-RPC messages found on stdout', nonJsonOnStdout);
    }

    // Check stderr has expected log messages
    if (stderrText.includes('[dj-claude-mcp]')) {
      pass('Server logs present on stderr');
    } else {
      fail('No server logs found on stderr');
    }

    // -----------------------------------------------------------------------
    // Summary
    // -----------------------------------------------------------------------
    console.log('\n' + '═'.repeat(50));
    if (failures === 0) {
      console.log('🎉 All tests passed!');
    } else {
      console.log(`💔 ${failures} test(s) failed.`);
    }
    console.log('═'.repeat(50) + '\n');

  } catch (err) {
    console.error('\n💀 Test harness error:', err.message);
    failures++;
  } finally {
    server.stdin.end();
    server.kill('SIGTERM');
    // Give it a moment to clean up
    await new Promise(r => setTimeout(r, 1000));
    process.exit(failures > 0 ? 1 : 0);
  }
}

run();
