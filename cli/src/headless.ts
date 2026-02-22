// Headless entry point — no Ink/React, console output only.
// Usage: node bin.mjs --headless "chill beats" --duration 10

import { getApiKey } from './lib/config.js';
import { streamChat } from './lib/claude.js';
import { parseStreamingCode } from './lib/parseCode.js';
import { initEngine, safeEvaluate, hush, setBackendMode } from './audio/engine.js';
import type { BackendMode } from './audio/backend.js';

export async function runHeadless(prompt: string, durationSec: number, mode: BackendMode = 'node'): Promise<void> {
  const apiKey = getApiKey();

  setBackendMode(mode);

  console.log('[dj-claude] Initializing audio engine...');
  if (mode === 'browser') {
    console.log('[dj-claude] Browser mode — click "Start Audio" in the browser tab.');
  }
  await initEngine();
  console.log('[dj-claude] Audio ready. Streaming from Claude...');

  let fullText = '';
  for await (const chunk of streamChat(apiKey, prompt, '', [])) {
    fullText += chunk;
  }

  const parsed = parseStreamingCode(fullText);
  const code = parsed.isComplete ? parsed.extractedCode : parsed.displayCode;

  if (!code) {
    console.error('[dj-claude] Could not parse code from Claude response.');
    process.exit(1);
  }

  if (parsed.mcCommentary) {
    console.log(`[dj-claude] ${parsed.mcCommentary}`);
  }

  console.log('[dj-claude] Evaluating code...');
  const result = await safeEvaluate(code, '');
  if (!result.success) {
    console.error(`[dj-claude] Evaluation error: ${result.error}`);
    process.exit(1);
  }

  console.log(`[dj-claude] Playing for ${durationSec}s...`);
  await new Promise((resolve) => setTimeout(resolve, durationSec * 1000));

  hush();
  console.log('[dj-claude] Done.');
  process.exit(0);
}
