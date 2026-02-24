import React, { useReducer, useEffect, useState, useCallback } from 'react';
import { Box, useApp, useInput } from 'ink';
import { Header } from './components/Header.js';
import { PromptInput } from './components/PromptInput.js';
import { DancingClaude } from './components/DancingClaude.js';
import { SpeechBubble } from './components/SpeechBubble.js';
import { StatusBar } from './components/StatusBar.js';
import { CodeDisplay } from './components/CodeDisplay.js';
import { PatternDisplay } from './components/PatternDisplay.js';
import { djReducer, initialState } from './lib/reducer.js';
import { parseStreamingCode } from './lib/parseCode.js';
import { handlePrompt } from './lib/session.js';
import { initEngine, evaluate, hush } from './audio/engine.js';

interface AppProps {
  apiKey: string;
}

export function App({ apiKey }: AppProps) {
  const { exit } = useApp();
  const [state, dispatch] = useReducer(djReducer, initialState);
  const [input, setInput] = useState('');

  // Init audio engine on mount
  useEffect(() => {
    initEngine()
      .then(() => dispatch({ type: 'AUDIO_INITIALIZED' }))
      .catch((err) =>
        dispatch({ type: 'STREAM_ERROR', error: `Audio init failed: ${err.message}` })
      );
  }, []);

  // Handle submit — delegates to session.ts for streaming + parsing + evaluation
  const handleSubmit = useCallback(
    async (prompt: string) => {
      if (!prompt.trim() || state.isStreaming) return;
      const trimmed = prompt.trim();
      setInput('');
      dispatch({ type: 'ADD_USER_MESSAGE', content: trimmed });
      await handlePrompt(apiKey, trimmed, state.currentCode, state.messages, dispatch);
    },
    [apiKey, state.currentCode, state.messages, state.isStreaming],
  );

  // Global keyboard shortcuts
  useInput((ch, key) => {
    if (ch === 'q' && !state.isStreaming) {
      hush();
      exit();
      return;
    }

    if (key.escape) {
      if (state.isPlaying) {
        hush();
        dispatch({ type: 'HUSH' });
      } else if (state.currentCode) {
        evaluate(state.currentCode).catch(() => {});
        dispatch({ type: 'CODE_EXECUTED', code: state.currentCode });
      }
      return;
    }

    if (ch === 'r' && !state.isStreaming && state.previousCode) {
      dispatch({ type: 'RESTORE_PREVIOUS' });
      evaluate(state.previousCode).catch(() => {});
      return;
    }
  });

  // Show streaming code preview
  const streamParse = state.isStreaming
    ? parseStreamingCode(state.streamingCode)
    : null;

  const displayError = state.streamingError || state.executionError;

  return (
    <Box flexDirection="column" padding={1}>
      <Header
        isPlaying={state.isPlaying}
        isStreaming={state.isStreaming}
        audioInitialized={state.audioInitialized}
      />

      <Box marginY={1} justifyContent="center">
        <DancingClaude isPlaying={state.isPlaying} />
      </Box>

      {state.mcCommentary && (
        <Box justifyContent="center" marginBottom={1}>
          <SpeechBubble text={state.mcCommentary} />
        </Box>
      )}

      {state.isPlaying && state.audioInitialized && (
        <Box marginY={1} justifyContent="center">
          <PatternDisplay isPlaying={state.isPlaying} />
        </Box>
      )}

      {state.isStreaming && streamParse?.displayCode && (
        <CodeDisplay code={streamParse.displayCode} label="Incoming" />
      )}

      {!state.isStreaming && state.currentCode && (
        <CodeDisplay code={state.currentCode} />
      )}

      <Box marginTop={1}>
        <PromptInput
          value={input}
          onChange={setInput}
          onSubmit={handleSubmit}
          isDisabled={state.isStreaming}
        />
      </Box>

      <Box marginTop={1}>
        <StatusBar error={displayError} />
      </Box>
    </Box>
  );
}
