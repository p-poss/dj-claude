// MCP server state — lightweight singleton matching DJState shape.

import type { Message } from '../lib/types.js';

import type { BackendMode } from '../audio/backend.js';

export interface Layer {
  role: string;
  code: string;
  addedAt: number;
  addedBy?: string;
  notes?: string;
  key?: string;
  tempo?: number;
}

export interface LayerMetadata {
  addedBy?: string;
  notes?: string;
  key?: string;
  tempo?: number;
}

export interface CodingContext {
  activity: string;
  updatedAt: number;
  autoAdapt: boolean;
}

export interface Snapshot {
  name: string;
  layers: Map<string, Layer>;
  composedCode: string;
  currentCode: string;
  savedAt: number;
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
  context: CodingContext | null;
  snapshots: Map<string, Snapshot>;
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
  context: null,
  snapshots: new Map(),
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

export function setLayer(role: string, code: string, metadata?: LayerMetadata): void {
  state.layers.set(role, {
    role,
    code,
    addedAt: Date.now(),
    addedBy: metadata?.addedBy,
    notes: metadata?.notes,
    key: metadata?.key,
    tempo: metadata?.tempo,
  });
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

// ---------------------------------------------------------------------------
// Coding context — for reactive DJ.
// ---------------------------------------------------------------------------

export function setContext(activity: string, autoAdapt: boolean): void {
  state.context = { activity, updatedAt: Date.now(), autoAdapt };
}

export function getContext(): CodingContext | null {
  return state.context;
}

export function clearContext(): void {
  state.context = null;
}

// ---------------------------------------------------------------------------
// Snapshots — mix persistence.
// ---------------------------------------------------------------------------

export function saveSnapshot(name: string): Snapshot {
  const layersCopy = new Map<string, Layer>();
  for (const [k, v] of state.layers) {
    layersCopy.set(k, { ...v });
  }
  const snapshot: Snapshot = {
    name,
    layers: layersCopy,
    composedCode: composeLayers(),
    currentCode: state.currentCode,
    savedAt: Date.now(),
  };
  state.snapshots.set(name, snapshot);
  return snapshot;
}

export function loadSnapshot(name: string): Snapshot | null {
  const snapshot = state.snapshots.get(name);
  if (!snapshot) return null;
  state.layers.clear();
  for (const [k, v] of snapshot.layers) {
    state.layers.set(k, { ...v });
  }
  return snapshot;
}

export function listSnapshots(): Snapshot[] {
  return Array.from(state.snapshots.values());
}

export function deleteSnapshot(name: string): boolean {
  return state.snapshots.delete(name);
}
