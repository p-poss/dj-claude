declare module '@strudel/core' {
  export function repl(options: {
    defaultOutput: unknown;
    getTime: () => number;
  }): Promise<{
    scheduler: { start(): void; stop(): void };
    evaluate(code: string): Promise<unknown>;
  }>;
  export function note(n: string): unknown;
  export function logger(message: string, type?: string, data?: Record<string, unknown>): void;
}

declare module '@strudel/mini' {
  export function miniAllStrings(): void;
  export function mini(input: string): unknown;
  export function m(input: string): unknown;
}

declare module '@strudel/webaudio' {
  export function registerSynthSounds(): Promise<void>;
  export function getAudioContext(): AudioContext;
  export function samples(path: string): Promise<void>;
  export function getSound(name: string): { onTrigger: unknown; data: unknown } | undefined;
  export function registerSound(name: string, onTrigger: unknown, data: unknown): void;
  export function setLogger(fn: (...args: unknown[]) => void): void;
  export const webaudioOutput: unknown;
}

declare module 'superdough' {
  export function setDefaultAudioContext(ctx: unknown): void;
  export function getAudioContext(): unknown;
  export function registerSynthSounds(): Promise<void>;
}

declare module 'ink-text-input' {
  import { FC } from 'react';
  interface TextInputProps {
    value: string;
    onChange: (value: string) => void;
    onSubmit?: (value: string) => void;
    placeholder?: string;
    focus?: boolean;
    mask?: string;
    showCursor?: boolean;
    highlightPastedText?: boolean;
  }
  const TextInput: FC<TextInputProps>;
  export default TextInput;
}
