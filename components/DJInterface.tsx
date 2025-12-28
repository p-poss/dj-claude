'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useDJ } from '@/context/DJContext';
import { useTheme } from '@/context/ThemeContext';
import { useClaudeStream } from '@/hooks/useClaudeStream';
import { useCodeParser } from '@/hooks/useCodeParser';
import { useTTS } from '@/hooks/useTTS';
import { StrudelEditor, StrudelEditorAPI } from './StrudelEditor';
import { PromptInput } from './PromptInput';
import { DancingClaude } from './DancingClaude';
import { SpeechBubble } from './SpeechBubble';

export function DJInterface() {
  const { state, dispatch } = useDJ();
  const { theme, cycleTheme } = useTheme();
  const { streamCode } = useClaudeStream();
  const { isComplete, extractedCode, displayCode, mcCommentary } = useCodeParser(state.streamingCode);
  const { speak, stop: stopTTS, isSpeaking } = useTTS();

  const editorRef = useRef<StrudelEditorAPI>(null);
  const promptInputRef = useRef<HTMLInputElement>(null);
  const hasExecutedRef = useRef(false);
  const [editorReady, setEditorReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [streamingMessageIndex, setStreamingMessageIndex] = useState(0);
  const [currentMcCommentary, setCurrentMcCommentary] = useState('');
  const [mcEnabled, setMcEnabled] = useState(true);
  const [characterOffset, setCharacterOffset] = useState(0);

  // Track cursor position to slide character left/right
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const windowWidth = window.innerWidth;
      const centerX = windowWidth / 2;
      const normalizedX = (e.clientX - centerX) / centerX;
      const offset = normalizedX * 50; // Max 50px in either direction
      setCharacterOffset(offset);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const streamingMessages = [
    'Mixing...',
    'Vibing...',
    'Cooking...',
    'Dropping beats...',
    'Finding the groove...',
  ];

  const welcomeMessages = [
    "Yo! DJ Claude in the booth! Let's make some noise!",
    "What's good! Ready to drop some beats? Let's go!",
    "Ayy, welcome to the session! Tell me what vibe you're feeling!",
    "DJ Claude here! Time to cook up something fire!",
    "Let's gooo! The booth is open, drop me a prompt!",
    "Welcome to the mix! What kind of sound are we making today?",
    "Hey hey! DJ Claude spinning up. What's the vibe?",
    "The decks are hot! Ready when you are, let's create!",
  ];

  // Short hype phrases for idle DJ commentary
  const idleHypePhrases = [
    "Yeah!",
    "Let's go!",
    "Feel that!",
    "Keep it going!",
    "This is it!",
    "Ohhh yes!",
    "That's the groove!",
    "Fire!",
    "Smooth!",
    "Nice!",
    "Here we go!",
    "Feeling it!",
    "Yo!",
    "Ayy!",
    "That's what I'm talking about!",
    "Stay with me!",
    "Love this energy!",
    "Yes yes yes!",
    "Let's dance!",
    "Claude the DJ god!",
  ];

  // Greet user on page load with random welcome message (speech bubble only)
  // Note: TTS is skipped because browsers block audio until user interaction
  useEffect(() => {
    if (editorReady) {
      const timer = setTimeout(() => {
        const randomMessage = welcomeMessages[Math.floor(Math.random() * welcomeMessages.length)];
        setCurrentMcCommentary(randomMessage);
      }, 300);
      return () => clearTimeout(timer);
    }
    // Only run once when editor becomes ready
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editorReady]);

  // Idle DJ commentary - periodically say hype phrases while music plays
  useEffect(() => {
    // Only run when: playing, MC enabled, not streaming, not already speaking
    if (!isPlaying || !mcEnabled || state.isStreaming || isSpeaking) {
      return;
    }

    // Random delay between 12-25 seconds for natural feel
    const getRandomDelay = () => 12000 + Math.random() * 13000;

    const scheduleNextPhrase = () => {
      return setTimeout(() => {
        // Double-check conditions before speaking (state may have changed)
        const randomPhrase = idleHypePhrases[Math.floor(Math.random() * idleHypePhrases.length)];
        setCurrentMcCommentary(randomPhrase);
        speak(randomPhrase);
      }, getRandomDelay());
    };

    const timer = scheduleNextPhrase();
    return () => clearTimeout(timer);
  }, [isPlaying, mcEnabled, state.isStreaming, isSpeaking, speak]);

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

      // Start MC commentary TTS if available and MC mode is enabled
      if (mcCommentary) {
        setCurrentMcCommentary(mcCommentary);
        if (mcEnabled) {
          speak(mcCommentary);
        }
      }

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
  }, [isComplete, extractedCode, mcCommentary, dispatch, speak, mcEnabled]);

  // Reset execution flag and stop TTS when new stream starts
  useEffect(() => {
    if (state.isStreaming) {
      hasExecutedRef.current = false;
      // Stop any ongoing TTS when new stream starts
      stopTTS();
      setCurrentMcCommentary('');
    }
  }, [state.isStreaming, stopTTS]);

  // Clear commentary display after TTS finishes (or after longer delay if MC is off)
  useEffect(() => {
    if (!isSpeaking && currentMcCommentary) {
      // Keep bubble visible for a bit after TTS finishes
      const delay = mcEnabled ? 3000 : 8000;
      const timer = setTimeout(() => setCurrentMcCommentary(''), delay);
      return () => clearTimeout(timer);
    }
  }, [isSpeaking, currentMcCommentary, mcEnabled]);

  // Rotate streaming messages while streaming
  useEffect(() => {
    if (!state.isStreaming) {
      setStreamingMessageIndex(0);
      return;
    }

    const interval = setInterval(() => {
      setStreamingMessageIndex((prev) => (prev + 1) % streamingMessages.length);
    }, 2000);

    return () => clearInterval(interval);
  }, [state.isStreaming, streamingMessages.length]);

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

  // Toggle MC mode (TTS on/off)
  const handleToggleMC = useCallback(() => {
    setMcEnabled((prev) => {
      if (prev) {
        // Turning off - stop any current speech
        stopTTS();
      }
      return !prev;
    });
  }, [stopTTS]);

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
    <div className="h-screen flex flex-col gap-3" style={{ padding: '4px 8px', backgroundColor: theme.background }}>
      {/* ASCII Header - displayed above the editor */}
      {/* Box drawn with separate elements for perfect alignment */}
      <div className="pt-4 pb-2 text-xs select-none" style={{ lineHeight: '1.2', fontFamily: 'Menlo, Consolas, "DejaVu Sans Mono", monospace', color: theme.textMuted }}>
        {/* Header row with welcome box and status boxes */}
        <div className="flex items-start justify-between gap-4">
          {/* Welcome box */}
          <div style={{ width: 'fit-content' }}>
            <pre className="m-0">╔{'═'.repeat(46)}╗</pre>
            <div className="flex" style={{ fontFamily: 'inherit' }}>
              <pre className="m-0">║</pre>
              <pre className="m-0 flex-1 text-center">Welcome to DJ Claude <span className="opacity-30">v 2.0.0</span></pre>
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
                  {!editorReady ? '◌ Booting Up' : isPlaying ? '● Mixing' : '○ On Deck'}
                </pre>
                <pre className="m-0">║</pre>
              </div>
              <pre className="m-0">╚{'═'.repeat(16)}╝</pre>
            </div>

            {/* MC Mode toggle button */}
            <button
              onClick={handleToggleMC}
              className="group"
              style={{ width: 'fit-content' }}
            >
              <pre className="m-0">╔{'═'.repeat(10)}╗</pre>
              <div className="flex" style={{ fontFamily: 'inherit' }}>
                <pre className="m-0">║</pre>
                <pre className="m-0 flex-1 text-center">
                  <span className="group-hover:border group-hover:border-current">
                    {mcEnabled ? 'MC: On' : 'MC: Off'}
                  </span>
                </pre>
                <pre className="m-0">║</pre>
              </div>
              <pre className="m-0">╚{'═'.repeat(10)}╝</pre>
            </button>

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
                    <span className="group-hover:border group-hover:border-current">
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

        {/* Dancing Claude character with speech bubble */}
        <div className="flex justify-center">
          <div
            style={{
              position: 'relative',
              transform: `translateX(${characterOffset}px)`,
              transition: 'transform 0.15s ease-out',
            }}
          >
            <DancingClaude isPlaying={isPlaying} isSpeaking={isSpeaking} color={theme.character} />
            <SpeechBubble text={currentMcCommentary} isVisible={isSpeaking || !!currentMcCommentary} color={theme.textMuted} />
          </div>
        </div>
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
              isStreaming={state.isStreaming}
              placeholder={
                state.isStreaming
                  ? streamingMessages[streamingMessageIndex]
                  : editorReady
                    ? "Make it darker, Add percussion, Speed it up..."
                    : "Initializing..."
              }
              themeColors={{
                text: theme.textMuted,
                textDim: theme.textDim,
                border: theme.border,
              }}
            />
          </div>

          {/* Info button with modal */}
          <div
            className="text-xs select-none group relative"
            style={{ lineHeight: '1.2', fontFamily: 'Menlo, Consolas, "DejaVu Sans Mono", monospace', color: theme.textMuted }}
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

            {/* Info modal - positioned relative to info button */}
            {showInfo && (
              <div
                className="absolute text-xs select-none"
                style={{
                  right: 0,
                  top: 0,
                  lineHeight: '1.2',
                  fontFamily: 'Menlo, Consolas, "DejaVu Sans Mono", monospace',
                  color: theme.textMuted,
                  zIndex: 10,
                }}
              >
                <div className="flex flex-col" style={{ backgroundColor: theme.background }}>
                  <pre className="m-0">╔{'═'.repeat(46)}╗</pre>
                  <div className="flex" style={{ fontFamily: 'inherit' }}>
                    <pre className="m-0">║</pre>
                    <pre className="m-0 flex-1"> AI-powered live coding music in Strudel</pre>
                    <pre className="m-0">║</pre>
                  </div>
                  <div className="flex" style={{ fontFamily: 'inherit' }}>
                    <pre className="m-0">║</pre>
                    <pre className="m-0 flex-1"> Theme: {theme.name}</pre>
                    <pre className="m-0">║</pre>
                  </div>
                  <div className="flex" style={{ fontFamily: 'inherit' }}>
                    <pre className="m-0">║</pre>
                    <a href="https://www.patrickposs.com/" target="_blank" rel="noopener noreferrer" className="flex-1" style={{ cursor: 'pointer', textDecoration: 'none', color: 'inherit' }}><pre className="m-0"> Creator: Patrick Poss (hey@patrickposs.com)</pre></a>
                    <pre className="m-0">║</pre>
                  </div>
                  <pre className="m-0">╚{'═'.repeat(46)}╝</pre>
                </div>
              </div>
            )}
          </div>

          {/* Theme toggle button */}
          <button
            onClick={cycleTheme}
            className="text-xs select-none group"
            style={{ width: 'fit-content', lineHeight: '1.2', fontFamily: 'Menlo, Consolas, "DejaVu Sans Mono", monospace', color: theme.textMuted }}
            title="Change color theme"
          >
            <pre className="m-0">╔{'═'.repeat(8)}╗</pre>
            <div className="flex" style={{ fontFamily: 'inherit' }}>
              <pre className="m-0">║</pre>
              <pre className="m-0 flex-1 text-center">
                <span className="group-hover:border group-hover:border-current">
                  Color
                </span>
              </pre>
              <pre className="m-0">║</pre>
            </div>
            <pre className="m-0">╚{'═'.repeat(8)}╝</pre>
          </button>
        </div>

        {/* Action buttons - always visible, greyed out when disabled */}
        <div
          className="pb-4 text-xs select-none flex gap-2"
          style={{ lineHeight: '1.2', fontFamily: 'Menlo, Consolas, "DejaVu Sans Mono", monospace', color: theme.textMuted }}
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
                <span className={state.currentCode ? 'group-hover:border group-hover:border-current' : ''}>
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
                <span className={state.previousCode ? 'group-hover:border group-hover:border-current' : ''}>
                  Go Back
                </span>
              </pre>
              <pre className="m-0">║</pre>
            </div>
            <pre className="m-0">╚{'═'.repeat(14)}╝</pre>
          </button>
        </div>

      </div>
    </div>
  );
}
