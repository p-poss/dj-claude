// Strudel audio engine — init, evaluate, and hush.
// polyfill.ts MUST be imported before this file.

import { AudioContext } from 'node-web-audio-api';

let repl: Awaited<ReturnType<typeof import('@strudel/core')['repl']>> | null = null;
let audioContext: AudioContext | null = null;

export async function initEngine(): Promise<void> {
  // Dynamic imports to ensure polyfill has run first
  const core = await import('@strudel/core');
  const mini = await import('@strudel/mini');
  const webaudio = await import('@strudel/webaudio');
  const superdough = await import('superdough');

  // Expose all Strudel core + mini exports on globalThis so the REPL
  // evaluate() (which uses Function() constructor) can access them.
  // This includes functions (note, s, stack) and signal patterns (sine, cosine, perlin, rand, saw).
  const g = globalThis as Record<string, unknown>;
  for (const [key, value] of Object.entries(core)) {
    if (key !== 'default' && key !== '__esModule') {
      g[key] = value;
    }
  }
  for (const [key, value] of Object.entries(mini)) {
    if (key !== 'default' && key !== '__esModule') {
      g[key] = value;
    }
  }

  // Register mini notation as the default string parser so that
  // note("c3 e3 g3") parses the string as a mini-notation pattern.
  if (typeof mini.miniAllStrings === 'function') {
    mini.miniAllStrings();
  }

  // Create audio context and set it as the default for superdough
  audioContext = new AudioContext() as unknown as AudioContext;
  g.__audio_context = audioContext;
  if (typeof superdough.setDefaultAudioContext === 'function') {
    superdough.setDefaultAudioContext(audioContext);
  }

  // Silence noisy Strudel logging (sampler loading, cyclist errors).
  if (typeof webaudio.setLogger === 'function') {
    webaudio.setLogger(() => {});
  }
  // The core logger (used by cyclist) writes to console.log with a %c prefix.
  // Intercept and suppress those messages.
  const origLog = console.log;
  console.log = (...args: unknown[]) => {
    if (typeof args[0] === 'string' && (args[0].includes('[cyclist]') || args[0].includes('[eval]'))) return;
    origLog.apply(console, args);
  };

  // Register synth sounds (triangle, sawtooth, square, sine)
  if (typeof webaudio.registerSynthSounds === 'function') {
    await webaudio.registerSynthSounds();
  }

  // Load drum sample manifest and init REPL concurrently.
  // The manifest is a small JSON fetch; actual audio files are lazy-loaded on
  // first use. We await both so samples are available when code runs.
  const [, replInstance] = await Promise.all([
    webaudio.samples('github:tidalcycles/Dirt-Samples/master').catch((err) => {
      console.error('Failed to load sample manifest:', err.message);
    }),
    core.repl({
      defaultOutput: webaudio.webaudioOutput,
      getTime: () => (audioContext as unknown as { currentTime: number }).currentTime,
    }),
  ]);
  repl = replInstance;

  // Stub .pattern() on the Pattern prototype — it doesn't exist in this
  // Strudel version but Claude may generate it. Make it a no-op returning `this`.
  try {
    const proto = Object.getPrototypeOf(core.note('c3'));
    if (proto && !proto.pattern) {
      proto.pattern = function () { return this; };
    }
  } catch {
    // Pattern prototype not accessible — skip
  }

  // Don't start scheduler yet — it requires a pattern to be set first.
  // evaluate() will trigger the scheduler via repl.evaluate().
}

export async function evaluate(code: string): Promise<void> {
  if (!repl) {
    throw new Error('Engine not initialized. Call initEngine() first.');
  }
  await repl.evaluate(code);
}

export interface SafeEvalResult {
  success: boolean;
  error?: string;
}

/**
 * Try evaluating newCode. On failure, re-evaluate previousCode to keep
 * the old pattern playing, and return the error.
 */
export async function safeEvaluate(
  newCode: string,
  previousCode: string,
): Promise<SafeEvalResult> {
  try {
    await evaluate(newCode);
    return { success: true };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    // Restore the previous pattern so music doesn't stop
    if (previousCode) {
      try {
        await evaluate(previousCode);
      } catch {
        // Previous code also failed — nothing we can do
      }
    }
    return { success: false, error };
  }
}

export function hush(): void {
  if (!repl) return;
  repl.scheduler.stop();
}

export function getContext(): AudioContext | null {
  return audioContext;
}
