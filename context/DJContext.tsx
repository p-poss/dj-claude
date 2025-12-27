'use client';

import { createContext, useContext, useReducer, ReactNode } from 'react';
import { DJState, DJAction, Message } from '@/lib/types';

const initialState: DJState = {
  audioInitialized: false,
  isPlaying: false,
  currentCode: '',
  streamingCode: '',
  previousCode: '',
  isStreaming: false,
  streamingError: null,
  executionError: null,
  messages: [],
};

function djReducer(state: DJState, action: DJAction): DJState {
  switch (action.type) {
    case 'AUDIO_INITIALIZED':
      return { ...state, audioInitialized: true };

    case 'START_STREAMING':
      return {
        ...state,
        isStreaming: true,
        streamingCode: '',
        streamingError: null,
        executionError: null,
      };

    case 'APPEND_STREAM':
      return { ...state, streamingCode: state.streamingCode + action.text };

    case 'STREAM_COMPLETE':
      return {
        ...state,
        isStreaming: false,
        messages: [...state.messages, { role: 'assistant', content: action.code }],
      };

    case 'STREAM_ERROR':
      return {
        ...state,
        isStreaming: false,
        streamingError: action.error,
      };

    case 'CODE_EXECUTED':
      return {
        ...state,
        previousCode: state.currentCode,
        currentCode: action.code,
        isPlaying: true,
        executionError: null,
      };

    case 'EXECUTION_ERROR':
      return {
        ...state,
        executionError: action.error,
      };

    case 'ADD_USER_MESSAGE':
      return {
        ...state,
        messages: [...state.messages, { role: 'user', content: action.content }],
      };

    case 'CLEAR_ERROR':
      return {
        ...state,
        streamingError: null,
        executionError: null,
      };

    case 'HUSH':
      return { ...state, isPlaying: false };

    case 'RESTORE_PREVIOUS':
      if (!state.previousCode) return state;
      return {
        ...state,
        currentCode: state.previousCode,
        previousCode: state.currentCode,
      };

    default:
      return state;
  }
}

const DJContext = createContext<{
  state: DJState;
  dispatch: React.Dispatch<DJAction>;
} | null>(null);

export function DJProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(djReducer, initialState);

  return (
    <DJContext.Provider value={{ state, dispatch }}>
      {children}
    </DJContext.Provider>
  );
}

export function useDJ() {
  const context = useContext(DJContext);
  if (!context) {
    throw new Error('useDJ must be used within DJProvider');
  }
  return context;
}
