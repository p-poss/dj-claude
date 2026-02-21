#!/usr/bin/env node

// Test script: verifies audio plays through speakers.
// Run: node test-audio.mjs

console.log('Loading audio polyfill...');
await import('./dist/audio/polyfill.js');

console.log('Initializing Strudel engine...');
const { initEngine, evaluate, hush } = await import('./dist/audio/engine.js');

try {
  await initEngine();
  console.log('Engine ready. Playing test tone for 5 seconds...');
  await evaluate('note("c3 e3 g3").s("triangle")');
  console.log('Sound should be playing now!');

  setTimeout(() => {
    console.log('Stopping...');
    hush();
    console.log('Done. If you heard sound, audio is working!');
    process.exit(0);
  }, 5000);
} catch (err) {
  console.error('Audio test failed:', err);
  process.exit(1);
}
