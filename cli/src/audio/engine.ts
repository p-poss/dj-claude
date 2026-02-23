// Strudel audio engine — thin wrapper around AudioBackend.
// polyfill.ts MUST be imported before this file when using 'node' mode.

import type { AudioBackend, SafeEvalResult, BackendMode } from './backend.js';
import { createBackend } from './backend.js';

export type { SafeEvalResult };

let backend: AudioBackend | null = null;
let currentMode: BackendMode = 'node';

export function setBackendMode(mode: BackendMode): void {
  currentMode = mode;
}

export async function initEngine(): Promise<void> {
  backend = await createBackend(currentMode);
  await backend.init();
}

export async function evaluate(code: string): Promise<void> {
  if (!backend) {
    throw new Error('Engine not initialized. Call initEngine() first.');
  }
  await backend.evaluate(code);
}

export async function safeEvaluate(
  newCode: string,
  previousCode: string,
): Promise<SafeEvalResult> {
  if (!backend) {
    throw new Error('Engine not initialized. Call initEngine() first.');
  }
  return backend.safeEvaluate(newCode, previousCode);
}

export function getBackendMode(): BackendMode {
  return currentMode;
}

export async function switchBackend(mode: BackendMode): Promise<void> {
  if (backend) {
    backend.dispose();
    backend = null;
  }
  setBackendMode(mode);
  await initEngine();
}

export function hush(): void {
  if (!backend) return;
  backend.hush();
}
