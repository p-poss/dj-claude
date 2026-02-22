// AudioBackend abstraction — allows swapping between node and browser audio.

export interface SafeEvalResult {
  success: boolean;
  error?: string;
}

export interface AudioBackend {
  init(): Promise<void>;
  evaluate(code: string): Promise<void>;
  safeEvaluate(newCode: string, previousCode: string): Promise<SafeEvalResult>;
  hush(): void;
  dispose(): void;
}

export type BackendMode = 'node' | 'browser';

export async function createBackend(mode: BackendMode): Promise<AudioBackend> {
  if (mode === 'browser') {
    const { BrowserAudioBackend } = await import('./browser-backend.js');
    return new BrowserAudioBackend();
  }
  const { NodeAudioBackend } = await import('./node-backend.js');
  return new NodeAudioBackend();
}
