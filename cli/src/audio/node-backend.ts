// Node audio backend — runs Strudel in-process via node-web-audio-api.
// This is a direct extraction of the logic from the original engine.ts.

import { AudioContext } from 'node-web-audio-api';
import type { AudioBackend, SafeEvalResult } from './backend.js';

export class NodeAudioBackend implements AudioBackend {
  private repl: Awaited<ReturnType<typeof import('@strudel/core')['repl']>> | null = null;
  private audioContext: AudioContext | null = null;

  async init(): Promise<void> {
    const core = await import('@strudel/core');
    const mini = await import('@strudel/mini');
    const webaudio = await import('@strudel/webaudio');
    const superdough = await import('superdough');

    // Expose all Strudel core + mini exports on globalThis so the REPL
    // evaluate() (which uses Function() constructor) can access them.
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

    // Register mini notation as the default string parser
    if (typeof mini.miniAllStrings === 'function') {
      mini.miniAllStrings();
    }

    // Create audio context and set it as the default for superdough
    this.audioContext = new AudioContext({ latencyHint: 'playback', sampleRate: 44100 }) as unknown as AudioContext;
    g.__audio_context = this.audioContext;

    // Master chain: all output -> gain (-6 dB) -> compressor/limiter -> hardware
    const realDestination = this.audioContext.destination;
    const masterGain = this.audioContext.createGain();
    masterGain.gain.value = 0.5;
    const compressor = this.audioContext.createDynamicsCompressor();
    compressor.threshold.value = -10;
    compressor.knee.value = 4;
    compressor.ratio.value = 20;
    compressor.attack.value = 0.001;
    compressor.release.value = 0.05;
    masterGain.connect(compressor);
    compressor.connect(realDestination);
    Object.defineProperty(this.audioContext, 'destination', {
      get: () => masterGain,
      configurable: true,
    });

    if (typeof superdough.setDefaultAudioContext === 'function') {
      superdough.setDefaultAudioContext(this.audioContext);
    }

    // Silence noisy Strudel logging
    if (typeof webaudio.setLogger === 'function') {
      webaudio.setLogger(() => {});
    }
    const origLog = console.log;
    console.log = (...args: unknown[]) => {
      if (typeof args[0] === 'string' && (args[0].includes('[cyclist]') || args[0].includes('[eval]'))) return;
      origLog.apply(console, args);
    };

    // Register synth sounds
    if (typeof webaudio.registerSynthSounds === 'function') {
      await webaudio.registerSynthSounds();
    }

    // Load drum sample manifest and init REPL concurrently
    const [, replInstance] = await Promise.all([
      webaudio.samples('github:tidalcycles/Dirt-Samples/master').catch((err) => {
        console.error('Failed to load sample manifest:', err.message);
      }),
      core.repl({
        defaultOutput: webaudio.webaudioOutput,
        getTime: () => (this.audioContext as unknown as { currentTime: number }).currentTime,
      }),
    ]);
    this.repl = replInstance;

    // Stub .pattern() on Pattern prototype
    try {
      const proto = Object.getPrototypeOf(core.note('c3'));
      if (proto && !proto.pattern) {
        proto.pattern = function () { return this; };
      }
    } catch {
      // Pattern prototype not accessible — skip
    }
  }

  async evaluate(code: string): Promise<void> {
    if (!this.repl) {
      throw new Error('Engine not initialized. Call init() first.');
    }
    await this.repl.evaluate(code);
  }

  async safeEvaluate(newCode: string, previousCode: string): Promise<SafeEvalResult> {
    try {
      await this.evaluate(newCode);
      return { success: true };
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      if (previousCode) {
        try {
          await this.evaluate(previousCode);
        } catch {
          // Previous code also failed — nothing we can do
        }
      }
      return { success: false, error };
    }
  }

  hush(): void {
    if (!this.repl) return;
    this.repl.scheduler.stop();
  }

  dispose(): void {
    this.hush();
    this.audioContext = null;
    this.repl = null;
  }
}
