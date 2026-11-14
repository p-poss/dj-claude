// Node audio backend — runs Strudel in-process via node-web-audio-api.
// This is a direct extraction of the logic from the original engine.ts.

import { AudioContext } from 'node-web-audio-api';
import type { AudioBackend, SafeEvalResult, VisualizationData } from './backend.js';

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

    // Load @strudel/tonal: importing it registers .scale(), .voicing(),
    // .transpose() etc. on Pattern. Without it any code using them throws
    // "n(...).scale is not a function" — and the prompts recommend .scale().
    // (The browser backend gets tonal via the @strudel/web bundle.)
    try {
      const tonal = await import('@strudel/tonal');
      for (const [key, value] of Object.entries(tonal)) {
        if (key !== 'default' && key !== '__esModule') {
          g[key] = value;
        }
      }
    } catch (err) {
      console.error(
        '[dj-claude] Failed to load @strudel/tonal; .scale()/.voicing() unavailable:',
        err instanceof Error ? err.message : err,
      );
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
    // superdough's output bus reads destination.maxChannelCount and sets
    // destination.channelCount, so make the master gain look like a (stereo)
    // destination node.
    Object.defineProperty(masterGain, 'maxChannelCount', {
      value: realDestination.channelCount,
      configurable: true,
    });
    Object.defineProperty(this.audioContext, 'destination', {
      get: () => masterGain,
      configurable: true,
    });

    // superdough 1.1.0's setDefaultAudioContext() ignores its argument and
    // always does `new AudioContext()`. Passing our context therefore gave
    // superdough a SECOND context: all sound bypassed the master chain above,
    // and the scheduler (this context's clock) and the synths (the other
    // context's clock) could drift apart, after which superdough drops every
    // note as "cannot schedule sounds in the past". Hand it our context by
    // making that constructor call return it.
    if (typeof superdough.setDefaultAudioContext === 'function') {
      const ownContext = this.audioContext;
      const GlobalAudioContext = g.AudioContext;
      g.AudioContext = function () { return ownContext; };
      try {
        superdough.setDefaultAudioContext(ownContext);
      } finally {
        g.AudioContext = GlobalAudioContext;
      }
    }
    if (typeof superdough.getAudioContext === 'function' && superdough.getAudioContext() !== this.audioContext) {
      console.error('[dj-claude] Warning: superdough is not using the backend AudioContext; master chain bypassed.');
    }
    // Rebuild superdough's cached output bus and effect nodes on this context;
    // otherwise they still point at the previous (closed) context after a
    // backend switch (switch_audio browser -> node).
    if (typeof superdough.resetGlobalEffects === 'function') {
      superdough.resetGlobalEffects();
    }
    if (typeof superdough.initializeAudioOutput === 'function') {
      superdough.initializeAudioOutput();
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
        // Schedule against the clock superdough actually plays on.
        getTime: () => ((typeof superdough.getAudioContext === 'function'
          ? superdough.getAudioContext()
          : this.audioContext) as { currentTime: number }).currentTime,
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
    // Strudel's repl.evaluate() catches errors internally (after hushing) and
    // only records them in state.evalError, so failures looked like success:
    // play_strudel reported "Now playing" over silence and safeEvaluate never
    // rolled back. Re-throw so callers see the error.
    const evalError = (this.repl as any).state?.evalError;
    if (evalError) {
      throw evalError instanceof Error ? evalError : new Error(String(evalError));
    }
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

  getVisualizationData(): VisualizationData | null {
    if (!this.repl) return null;
    const scheduler = this.repl.scheduler as any;
    return {
      currentTime: typeof scheduler.now === 'function' ? scheduler.now() : 0,
      cps: scheduler.cps ?? 0.5,
      isStarted: scheduler.started ?? false,
    };
  }

  getPattern(): unknown | null {
    if (!(this.repl as any)?.state?.pattern) return null;
    return (this.repl as any).state.pattern;
  }

  dispose(): void {
    this.hush();
    if (this.audioContext) {
      this.audioContext.close();
    }
    this.audioContext = null;
    this.repl = null;
  }
}
