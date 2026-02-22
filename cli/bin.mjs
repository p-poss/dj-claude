#!/usr/bin/env node

const args = process.argv.slice(2);
const browserMode = args.includes('--browser');

// Import order matters — polyfill patches globalThis with Web Audio API
// and browser stubs BEFORE Strudel packages try to access them.
// In browser mode the polyfill is not needed (Strudel runs in the browser).
if (!browserMode) {
  await import('./dist/audio/polyfill.js');
}

// Set backend mode before any engine initialization
if (browserMode) {
  const { setBackendMode } = await import('./dist/audio/engine.js');
  setBackendMode('browser');
}

// Parse --headless "prompt" [--duration N]
const headlessIdx = args.indexOf('--headless');

if (headlessIdx !== -1) {
  const prompt = args[headlessIdx + 1];
  if (!prompt || prompt.startsWith('--')) {
    console.error('Usage: dj-claude --headless "prompt" [--duration N] [--browser]');
    process.exit(1);
  }
  const durationIdx = args.indexOf('--duration');
  const duration = durationIdx !== -1 ? Number(args[durationIdx + 1]) || 10 : 10;

  const { runHeadless } = await import('./dist/headless.js');
  await runHeadless(prompt, duration, browserMode ? 'browser' : 'node');
} else {
  await import('./dist/index.js');
}
