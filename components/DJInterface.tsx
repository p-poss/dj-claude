'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useDJ } from '@/context/DJContext';
import { useClaudeStream } from '@/hooks/useClaudeStream';
import { useCodeParser } from '@/hooks/useCodeParser';
import { StrudelEditor, StrudelEditorAPI } from './StrudelEditor';
import { PromptInput } from './PromptInput';
import { DancingClaude } from './DancingClaude';

export function DJInterface() {
  const { state, dispatch } = useDJ();
  const { streamCode } = useClaudeStream();
  const { isComplete, extractedCode, displayCode } = useCodeParser(state.streamingCode);

  const editorRef = useRef<StrudelEditorAPI>(null);
  const promptInputRef = useRef<HTMLInputElement>(null);
  const hasExecutedRef = useRef(false);
  const [editorReady, setEditorReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  // Update strudel editor code as streaming happens
  // This shows the code being "typed" in the editor
  useEffect(() => {
    if (state.isStreaming && displayCode && editorRef.current) {
      editorRef.current.setCode(displayCode);
    }
  }, [state.isStreaming, displayCode]);

  // Auto-execute when code block is complete
  useEffect(() => {
    if (isComplete && extractedCode && !hasExecutedRef.current && editorRef.current) {
      hasExecutedRef.current = true;

      // Set final code in editor
      editorRef.current.setCode(extractedCode);

      // Small delay to ensure code is set, then evaluate
      // This triggers mini locations (highlighting) and visualizations
      setTimeout(() => {
        editorRef.current?.evaluate(extractedCode)
          .then(() => {
            dispatch({ type: 'CODE_EXECUTED', code: extractedCode });
            setIsPlaying(true);
            setError(null);
          })
          .catch((err) => {
            const errorMsg = String(err);
            dispatch({ type: 'EXECUTION_ERROR', error: errorMsg });
            setError(errorMsg);
          });
      }, 100);
    }
  }, [isComplete, extractedCode, dispatch]);

  // Reset execution flag when new stream starts
  useEffect(() => {
    if (state.isStreaming) {
      hasExecutedRef.current = false;
    }
  }, [state.isStreaming]);

  // Initialize audio context - must be called during user gesture
  const initAudioContext = useCallback(async () => {
    try {
      // Try to get/create Strudel's audio context
      if ((window as any).getAudioContext) {
        const ctx = (window as any).getAudioContext();
        if (ctx?.state === 'suspended') {
          await ctx.resume();
          console.log('Strudel audio context resumed');
        }
      }
      // Also try to start the editor if available
      if (editorRef.current) {
        editorRef.current.start();
      }
    } catch (e) {
      console.log('Audio init:', e);
    }
  }, []);

  // Handle prompt submission
  const handlePromptSubmit = useCallback(async (prompt: string) => {
    try {
      // Initialize audio during user click event
      await initAudioContext();

      await streamCode({
        prompt,
        currentCode: state.currentCode,
        history: state.messages,
      });
    } catch (error) {
      console.error('Stream error:', error);
    }
  }, [streamCode, state.currentCode, state.messages, initAudioContext]);

  // Handle pause
  const handlePause = useCallback(() => {
    if (editorRef.current) {
      editorRef.current.stop();
    }
    setIsPlaying(false);
    dispatch({ type: 'HUSH' });
  }, [dispatch]);

  // Handle play/resume
  const handlePlay = useCallback(async () => {
    if (editorRef.current && state.currentCode) {
      try {
        await editorRef.current.evaluate(state.currentCode);
        setIsPlaying(true);
        setError(null);
      } catch (err) {
        const errorMsg = String(err);
        dispatch({ type: 'EXECUTION_ERROR', error: errorMsg });
        setError(errorMsg);
      }
    }
  }, [state.currentCode, dispatch]);

  // Toggle play/pause
  const handleTogglePlayback = useCallback(() => {
    if (isPlaying) {
      handlePause();
    } else {
      handlePlay();
    }
  }, [isPlaying, handlePause, handlePlay]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Space to toggle play/pause (only when not focused on input)
      if (e.key === ' ' && state.currentCode && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault();
        handleTogglePlayback();
      }
      // Escape to pause
      if (e.key === 'Escape' && isPlaying) {
        handlePause();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, state.currentCode, handleTogglePlayback, handlePause]);

  // Handle editor ready
  const handleEditorReady = useCallback(() => {
    setEditorReady(true);
    dispatch({ type: 'AUDIO_INITIALIZED' });
    // Focus after React re-renders with editorReady=true (input becomes enabled)
    // Use requestAnimationFrame to ensure browser has painted, then focus
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        promptInputRef.current?.focus();
      });
    });
  }, [dispatch]);

  // Handle editor error
  const handleEditorError = useCallback((err: string) => {
    setError(err);
    dispatch({ type: 'EXECUTION_ERROR', error: err });
  }, [dispatch]);

  // Handle export - copy code to clipboard
  const handleExport = useCallback(async () => {
    if (state.currentCode) {
      await navigator.clipboard.writeText(state.currentCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [state.currentCode]);

  // Handle go back - restore previous code
  const handleGoBack = useCallback(async () => {
    if (state.previousCode && editorRef.current) {
      // Set previous code in editor
      editorRef.current.setCode(state.previousCode);

      // Evaluate to play the previous code
      try {
        await editorRef.current.evaluate(state.previousCode);
        dispatch({ type: 'RESTORE_PREVIOUS' });
        setIsPlaying(true);
        setError(null);
      } catch (err) {
        const errorMsg = String(err);
        dispatch({ type: 'EXECUTION_ERROR', error: errorMsg });
        setError(errorMsg);
      }
    }
  }, [state.previousCode, dispatch]);

  return (
    <div className="h-screen flex flex-col bg-neutral-950 gap-3" style={{ padding: '4px 8px' }}>
      {/* ASCII Header - displayed above the editor */}
      {/* Box drawn with separate elements for perfect alignment */}
      <div className="pt-4 pb-2 text-xs text-neutral-500 select-none" style={{ lineHeight: '1.2', fontFamily: 'Menlo, Consolas, "DejaVu Sans Mono", monospace' }}>
        {/* Header row with welcome box and status boxes */}
        <div className="flex items-start justify-between gap-4">
          {/* Welcome box */}
          <div style={{ width: 'fit-content' }}>
            <pre className="m-0">╔{'═'.repeat(46)}╗</pre>
            <div className="flex" style={{ fontFamily: 'inherit' }}>
              <pre className="m-0">║</pre>
              <pre className="m-0 flex-1 text-center">Welcome to DJ Claude</pre>
              <pre className="m-0">║</pre>
            </div>
            <pre className="m-0">╚{'═'.repeat(46)}╝</pre>
          </div>

          {/* Status boxes */}
          <div className="flex items-start gap-2">
            {/* Playing status box */}
            <div style={{ width: 'fit-content' }}>
              <pre className="m-0">╔{'═'.repeat(16)}╗</pre>
              <div className="flex" style={{ fontFamily: 'inherit' }}>
                <pre className="m-0">║</pre>
                <pre className="m-0 flex-1 text-center">
                  {isPlaying ? '● Playing' : '○ Stopped'}
                </pre>
                <pre className="m-0">║</pre>
              </div>
              <pre className="m-0">╚{'═'.repeat(16)}╝</pre>
            </div>

            {/* Audio status box */}
            <div style={{ width: 'fit-content' }}>
              <pre className="m-0">╔{'═'.repeat(16)}╗</pre>
              <div className="flex" style={{ fontFamily: 'inherit' }}>
                <pre className="m-0">║</pre>
                <pre className="m-0 flex-1 text-center">
                  Audio: {editorReady ? 'Ready' : '...'}
                </pre>
                <pre className="m-0">║</pre>
              </div>
              <pre className="m-0">╚{'═'.repeat(16)}╝</pre>
            </div>

            {/* Play/Pause button - show when there's code */}
            {state.currentCode && (
              <button
                onClick={handleTogglePlayback}
                className="group"
                style={{ width: 'fit-content' }}
              >
                <pre className="m-0">╔{'═'.repeat(10)}╗</pre>
                <div className="flex" style={{ fontFamily: 'inherit' }}>
                  <pre className="m-0">║</pre>
                  <pre className="m-0 flex-1 text-center">
                    <span className="group-hover:border group-hover:border-neutral-500">
                      {isPlaying ? '⏸ pause' : '▶ play'}
                    </span>
                  </pre>
                  <pre className="m-0">║</pre>
                </div>
                <pre className="m-0">╚{'═'.repeat(10)}╝</pre>
              </button>
            )}
          </div>
        </div>

        <pre className="m-0">{`
 ██████╗      ██╗     ██████╗██╗      █████╗ ██╗   ██╗██████╗ ███████╗
 ██╔══██╗     ██║    ██╔════╝██║     ██╔══██╗██║   ██║██╔══██╗██╔════╝
 ██║  ██║     ██║    ██║     ██║     ███████║██║   ██║██║  ██║█████╗
 ██║  ██║██   ██║    ██║     ██║     ██╔══██║██║   ██║██║  ██║██╔══╝
 ██████╔╝╚█████╔╝    ╚██████╗███████╗██║  ██║╚██████╔╝██████╔╝███████╗
 ╚═════╝  ╚════╝      ╚═════╝╚══════╝╚═╝  ╚═╝ ╚═════╝ ╚═════╝ ╚══════╝`}</pre>

        {/* Dancing Claude character */}
        <DancingClaude isPlaying={isPlaying} />
      </div>

      {/* Main content area - Strudel Editor as primary view */}
      {/* This enables inline visualizations (pianoroll, scope) and mini locations (active highlighting) */}
      <div className="flex-1 relative" style={{ overflow: 'hidden' }}>
        <StrudelEditor
          ref={editorRef}
          onReady={handleEditorReady}
          onError={handleEditorError}
        />
      </div>

      {/* Bottom section with info button and modal */}
      <div className="relative">
        {/* Prompt input row with info button */}
        <div className="flex items-start gap-2">
          <div className="flex-1">
            <PromptInput
              ref={promptInputRef}
              onSubmit={handlePromptSubmit}
              disabled={state.isStreaming || !editorReady}
              placeholder={editorReady ? "make it darker, add percussion, speed it up..." : "Initializing..."}
            />
          </div>

          {/* Info button */}
          <div
            className="text-xs text-neutral-500 select-none group"
            style={{ lineHeight: '1.2', fontFamily: 'Menlo, Consolas, "DejaVu Sans Mono", monospace' }}
            onMouseEnter={() => setShowInfo(true)}
            onMouseLeave={() => setShowInfo(false)}
          >
            <div style={{ width: 'fit-content' }}>
              <pre className="m-0">╔═══╗</pre>
              <div className="flex" style={{ fontFamily: 'inherit' }}>
                <pre className="m-0">║</pre>
                <pre className="m-0 flex-1 text-center"> i </pre>
                <pre className="m-0">║</pre>
              </div>
              <pre className="m-0">╚═══╝</pre>
            </div>
          </div>
        </div>

        {/* Action buttons - always visible, greyed out when disabled */}
        <div
          className="pb-4 text-xs text-neutral-500 select-none flex gap-2"
          style={{ lineHeight: '1.2', fontFamily: 'Menlo, Consolas, "DejaVu Sans Mono", monospace' }}
        >
          {/* Export button */}
          <button
            onClick={state.currentCode ? handleExport : undefined}
            disabled={!state.currentCode}
            className={state.currentCode ? 'group' : 'opacity-30 cursor-not-allowed'}
            style={{ width: 'fit-content' }}
          >
            <pre className="m-0">╔{'═'.repeat(14)}╗</pre>
            <div className="flex" style={{ fontFamily: 'inherit' }}>
              <pre className="m-0">║</pre>
              <pre className="m-0 flex-1 text-center">
                <span className={state.currentCode ? 'group-hover:border group-hover:border-neutral-500' : ''}>
                  {copied ? 'Copied!' : 'Export'}
                </span>
              </pre>
              <pre className="m-0">║</pre>
            </div>
            <pre className="m-0">╚{'═'.repeat(14)}╝</pre>
          </button>

          {/* Go Back button */}
          <button
            onClick={state.previousCode ? handleGoBack : undefined}
            disabled={!state.previousCode}
            className={state.previousCode ? 'group' : 'opacity-30 cursor-not-allowed'}
            style={{ width: 'fit-content' }}
          >
            <pre className="m-0">╔{'═'.repeat(14)}╗</pre>
            <div className="flex" style={{ fontFamily: 'inherit' }}>
              <pre className="m-0">║</pre>
              <pre className="m-0 flex-1 text-center">
                <span className={state.previousCode ? 'group-hover:border group-hover:border-neutral-500' : ''}>
                  Go Back
                </span>
              </pre>
              <pre className="m-0">║</pre>
            </div>
            <pre className="m-0">╚{'═'.repeat(14)}╝</pre>
          </button>
        </div>

        {/* Info modal - appears on hover, to the left of info button */}
        {showInfo && (
          <div
            className="absolute text-xs text-neutral-500 select-none"
            style={{
              right: 'calc(5ch + 8px)',
              top: 0,
              bottom: 0,
              lineHeight: '1.2',
              fontFamily: 'Menlo, Consolas, "DejaVu Sans Mono", monospace',
              zIndex: 10,
            }}
            onMouseEnter={() => setShowInfo(true)}
            onMouseLeave={() => setShowInfo(false)}
          >
            <div className="h-full flex flex-col bg-neutral-950">
              <pre className="m-0">╔{'═'.repeat(46)}╗</pre>
              <div className="flex-1 flex flex-col">
                <div className="flex" style={{ fontFamily: 'inherit' }}>
                  <pre className="m-0">║</pre>
                  <pre className="m-0 flex-1"> AI-powered live coding music in Strudel</pre>
                  <pre className="m-0">║</pre>
                </div>
                <div className="flex" style={{ fontFamily: 'inherit' }}>
                  <pre className="m-0">║</pre>
                  <pre className="m-0 flex-1">{' '.repeat(46)}</pre>
                  <pre className="m-0">║</pre>
                </div>
                <div className="flex" style={{ fontFamily: 'inherit' }}>
                  <pre className="m-0">║</pre>
                  <pre className="m-0 flex-1"> Created by Patrick Poss</pre>
                  <pre className="m-0">║</pre>
                </div>
                <div className="flex" style={{ fontFamily: 'inherit' }}>
                  <pre className="m-0">║</pre>
                  <pre className="m-0 flex-1"> hey@patrickposs.com</pre>
                  <pre className="m-0">║</pre>
                </div>
              </div>
              <pre className="m-0">╚{'═'.repeat(46)}╝</pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
