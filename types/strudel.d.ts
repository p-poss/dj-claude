declare module '@strudel/web' {
  export function initStrudel(options?: { prebake?: () => Promise<void> }): Promise<void>;
  export function evaluate(code: string): Promise<void>;
  export function hush(): void;
}

declare global {
  function initStrudel(options?: { prebake?: () => Promise<void> }): Promise<void>;
  function evaluate(code: string): Promise<void>;
  function hush(): void;
}

export {};
