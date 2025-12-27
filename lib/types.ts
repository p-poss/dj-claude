export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export interface DJState {
  // Audio State
  audioInitialized: boolean;
  isPlaying: boolean;

  // Code State
  currentCode: string;        // Currently playing pattern
  streamingCode: string;      // Code being streamed (may be partial)
  previousCode: string;       // Previous pattern (for dimmed display)

  // Streaming State
  isStreaming: boolean;
  streamingError: string | null;
  executionError: string | null;

  // Conversation State
  messages: Message[];        // Full conversation history for Claude
}

export type DJAction =
  | { type: 'AUDIO_INITIALIZED' }
  | { type: 'START_STREAMING' }
  | { type: 'APPEND_STREAM'; text: string }
  | { type: 'STREAM_COMPLETE'; code: string }
  | { type: 'STREAM_ERROR'; error: string }
  | { type: 'CODE_EXECUTED'; code: string }
  | { type: 'EXECUTION_ERROR'; error: string }
  | { type: 'ADD_USER_MESSAGE'; content: string }
  | { type: 'CLEAR_ERROR' }
  | { type: 'HUSH' }
  | { type: 'RESTORE_PREVIOUS' };
