export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export interface DJState {
  audioInitialized: boolean;
  isPlaying: boolean;
  currentCode: string;
  streamingCode: string;
  previousCode: string;
  isStreaming: boolean;
  streamingError: string | null;
  executionError: string | null;
  mcCommentary: string;
  messages: Message[];
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
  | { type: 'SET_MC_COMMENTARY'; text: string }
  | { type: 'CLEAR_ERROR' }
  | { type: 'HUSH' }
  | { type: 'RESTORE_PREVIOUS' };
