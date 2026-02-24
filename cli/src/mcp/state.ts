// MCP server state — lightweight singleton matching DJState shape.

import type { Message } from '../lib/types.js';

import type { BackendMode } from '../audio/backend.js';

export interface Layer {
  role: string;
  code: string;
  addedAt: number;
}

interface MCPState {
  engineReady: boolean;
  isPlaying: boolean;
  currentCode: string;
  previousCode: string;
  mcCommentary: string;
  messages: Message[];
  audioMode: BackendMode;
  layers: Map<string, Layer>;
}

const state: MCPState = {
  engineReady: false,
  isPlaying: false,
  currentCode: '',
  previousCode: '',
  mcCommentary: '',
  messages: [],
  audioMode: 'node',
  layers: new Map(),
};

export function getState(): Readonly<MCPState> {
  return state;
}

export function setEngineReady(): void {
  state.engineReady = true;
}

export function updateAfterPlay(code: string, commentary: string): void {
  state.previousCode = state.currentCode;
  state.currentCode = code;
  state.isPlaying = true;
  state.mcCommentary = commentary;
}

export function updateAfterHush(): void {
  state.isPlaying = false;
}

export function setAudioMode(mode: BackendMode): void {
  state.audioMode = mode;
}

export function addMessage(msg: Message): void {
  state.messages.push(msg);
  // Keep last 12 messages (6 exchanges) to match claude.ts behavior
  if (state.messages.length > 12) {
    state.messages = state.messages.slice(-12);
  }
}

// ---------------------------------------------------------------------------
// Layer management — for jam tools.
// ---------------------------------------------------------------------------

export function setLayer(role: string, code: string): void {
  state.layers.set(role, { role, code, addedAt: Date.now() });
}

export function removeLayer(role: string): boolean {
  return state.layers.delete(role);
}

export function clearLayers(): void {
  state.layers.clear();
}

export function getLayers(): ReadonlyMap<string, Layer> {
  return state.layers;
}

export function composeLayers(): string {
  const entries = Array.from(state.layers.values());
  if (entries.length === 0) return '';
  if (entries.length === 1) return entries[0].code;
  const inner = entries
    .map((l) => `/* [${l.role}] */ ${l.code}`)
    .join(',\n  ');
  return `stack(\n  ${inner}\n)`;
}
