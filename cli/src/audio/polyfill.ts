// Audio polyfill — MUST be imported before any Strudel packages.
// Patches globalThis with Web Audio API from node-web-audio-api
// and stubs browser globals that Strudel/superdough expect.

import * as webAudio from 'node-web-audio-api';

// Assign all Web Audio API exports to globalThis
const g = globalThis as Record<string, unknown>;
for (const [key, value] of Object.entries(webAudio)) {
  g[key] = value;
}

// Event target support for window/globalThis
const windowListeners: Record<string, Function[]> = {};
if (!g.addEventListener) {
  g.addEventListener = (type: string, fn: Function) => {
    (windowListeners[type] ??= []).push(fn);
  };
}
if (!g.removeEventListener) {
  g.removeEventListener = (type: string, fn: Function) => {
    const arr = windowListeners[type];
    if (arr) windowListeners[type] = arr.filter((f) => f !== fn);
  };
}
if (!g.dispatchEvent) {
  g.dispatchEvent = (event: { type: string }) => {
    for (const fn of windowListeners[event.type] ?? []) fn(event);
    return true;
  };
}

// Stub browser globals that superdough/Strudel check for
if (typeof globalThis.window === 'undefined') {
  g.window = globalThis;
}

if (typeof globalThis.document === 'undefined') {
  const listeners: Record<string, Function[]> = {};
  g.document = {
    createElement: () => ({}),
    createElementNS: () => ({}),
    addEventListener: (type: string, fn: Function) => {
      (listeners[type] ??= []).push(fn);
    },
    removeEventListener: (type: string, fn: Function) => {
      const arr = listeners[type];
      if (arr) listeners[type] = arr.filter((f) => f !== fn);
    },
    dispatchEvent: (event: { type: string }) => {
      for (const fn of listeners[event.type] ?? []) fn(event);
      return true;
    },
    querySelector: () => null,
    querySelectorAll: () => [],
    body: { appendChild: () => {}, removeChild: () => {} },
    head: { appendChild: () => {} },
  };
}

if (typeof globalThis.CustomEvent === 'undefined') {
  g.CustomEvent = class CustomEvent extends Event {
    detail: unknown;
    constructor(type: string, params?: { detail?: unknown }) {
      super(type);
      this.detail = params?.detail;
    }
  } as unknown as typeof CustomEvent;
}

if (typeof globalThis.navigator === 'undefined') {
  g.navigator = { userAgent: 'node' };
}

if (typeof globalThis.requestAnimationFrame === 'undefined') {
  g.requestAnimationFrame = (cb: FrameRequestCallback) => setTimeout(cb, 16) as unknown as number;
  g.cancelAnimationFrame = (id: number) => clearTimeout(id);
}

// Stub AudioWorkletNode so that AudioWorklet-based effects (.shape(), .crush(),
// .coarse(), etc.) become silent passthroughs instead of throwing.
if (!g.AudioWorkletNode) {
  g.AudioWorkletNode = class AudioWorkletNode {
    connect() { return this; }
    disconnect() {}
    addEventListener() {}
    removeEventListener() {}
    get port() {
      return { postMessage() {}, onmessage: null, addEventListener() {}, removeEventListener() {} };
    }
    get parameters() {
      return new Map();
    }
    get numberOfInputs() { return 1; }
    get numberOfOutputs() { return 1; }
  };
}

// Patch AudioContext prototype with effects that superdough expects
const AudioCtx = webAudio.AudioContext as unknown as { prototype: Record<string, unknown> };

if (!AudioCtx.prototype.createReverb) {
  AudioCtx.prototype.createReverb = function (this: AudioContext) {
    // Create a simple reverb using ConvolverNode with generated impulse
    const convolver = this.createConvolver();
    const sampleRate = this.sampleRate;
    const length = sampleRate * 2; // 2 second reverb tail
    const impulse = this.createBuffer(2, length, sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = impulse.getChannelData(ch);
      for (let i = 0; i < length; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2);
      }
    }
    convolver.buffer = impulse;
    return convolver;
  };
}

if (!AudioCtx.prototype.createFeedbackDelay) {
  AudioCtx.prototype.createFeedbackDelay = function (this: AudioContext, maxDelay = 1) {
    const delay = this.createDelay(maxDelay);
    const feedback = this.createGain();
    feedback.gain.value = 0.3;
    delay.connect(feedback);
    feedback.connect(delay);
    return Object.assign(delay, { feedback });
  };
}

export {};
