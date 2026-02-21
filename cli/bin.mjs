#!/usr/bin/env node

// Import order matters — polyfill patches globalThis with Web Audio API
// and browser stubs BEFORE Strudel packages try to access them.
await import('./dist/audio/polyfill.js');

// Parse --headless "prompt" [--duration N]
const args = process.argv.slice(2);
const headlessIdx = args.indexOf('--headless');

if (headlessIdx !== -1) {
  const prompt = args[headlessIdx + 1];
  if (!prompt || prompt.startsWith('--')) {
    console.error('Usage: dj-claude --headless "prompt" [--duration N]');
    process.exit(1);
  }
  const durationIdx = args.indexOf('--duration');
  const duration = durationIdx !== -1 ? Number(args[durationIdx + 1]) || 10 : 10;

  const { runHeadless } = await import('./dist/headless.js');
  await runHeadless(prompt, duration);
} else {
  await import('./dist/index.js');
}
