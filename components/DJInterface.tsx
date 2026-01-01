'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useDJ } from '@/context/DJContext';
import { useTheme } from '@/context/ThemeContext';
import { useVoice } from '@/context/VoiceContext';
import { useClaudeStream } from '@/hooks/useClaudeStream';
import { useCodeParser } from '@/hooks/useCodeParser';
import { useTTS } from '@/hooks/useTTS';
import { StrudelEditor, StrudelEditorAPI } from './StrudelEditor';
import { PromptInput } from './PromptInput';
import { DancingClaude } from './DancingClaude';
import { SpeechBubble } from './SpeechBubble';
import { PartyOverlay } from './PartyOverlay';
import { VoiceSelector } from './VoiceSelector';

export function DJInterface() {
  const { state, dispatch } = useDJ();
  const { theme, cycleTheme, toggleSwap, isSwapped } = useTheme();
  const { selectedElevenLabsVoice } = useVoice();
  const { streamCode } = useClaudeStream();
  const { isComplete, extractedCode, displayCode, mcCommentary } = useCodeParser(state.streamingCode);
  const { speak, stop: stopTTS, isSpeaking } = useTTS();

  const editorRef = useRef<StrudelEditorAPI>(null);
  const promptInputRef = useRef<HTMLInputElement>(null);
  const hasExecutedRef = useRef(false);
  const voiceChangeCountRef = useRef(0); // Skip initial render
  const prevMcEnabledRef = useRef(true); // MC starts ON by default
  const speakRef = useRef(speak); // Always keep latest speak function
  speakRef.current = speak; // Update ref on every render
  const [editorReady, setEditorReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [streamingMessageIndex, setStreamingMessageIndex] = useState(0);
  const [currentMcCommentary, setCurrentMcCommentary] = useState('');
  const [mcEnabled, setMcEnabled] = useState(true);
  const [characterOffset, setCharacterOffset] = useState(0);
  const [crtEnabled, setCrtEnabled] = useState(true);
  const [partyEnabled, setPartyEnabled] = useState(false);
  const [partyHue, setPartyHue] = useState(0);

  // Party mode: cycle through rainbow hues
  useEffect(() => {
    if (!partyEnabled) {
      setPartyHue(0);
      return;
    }

    const interval = setInterval(() => {
      setPartyHue((h) => h + 5); // No modulo - CSS handles values > 360
    }, 200); // Smooth color cycling

    return () => clearInterval(interval);
  }, [partyEnabled]);

  // Toggle CRT effects on body element
  useEffect(() => {
    if (crtEnabled) {
      document.body.classList.add('crt-screen');
    } else {
      document.body.classList.remove('crt-screen');
    }
  }, [crtEnabled]);

  // Toggle Party mode effects on body element
  useEffect(() => {
    if (partyEnabled) {
      document.body.classList.add('party-mode');
    } else {
      document.body.classList.remove('party-mode');
    }
  }, [partyEnabled]);

  // Toggle inverted colors on body element
  useEffect(() => {
    if (isSwapped) {
      document.body.classList.add('inverted');
    } else {
      document.body.classList.remove('inverted');
    }
  }, [isSwapped]);

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

  // DJ announcement messages
  const getDjAnnouncement = useCallback(() => {
    const voiceName = selectedElevenLabsVoice?.name || 'Claude';
    const messages = [
      `DJ ${voiceName} in the house!`,
      `DJ ${voiceName} on the ones and twos!`,
      `It's DJ ${voiceName}, dropping the beats!`,
      `DJ ${voiceName} taking over the decks!`,
      `Give it up for DJ ${voiceName}!`,
      `DJ ${voiceName} ready to rock!`,
      `Let's go, DJ ${voiceName}!`,
      `DJ ${voiceName} spinning the tracks!`,
      `Make some noise for DJ ${voiceName}!`,
      `DJ ${voiceName} bringing the vibes!`,
      `It's DJ ${voiceName} time!`,
      `DJ ${voiceName} on the mic!`,
      `Here comes DJ ${voiceName}!`,
      `DJ ${voiceName} is live!`,
      `The one and only, DJ ${voiceName}!`,
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  }, [selectedElevenLabsVoice]);

  // Announce voice change with DJ-themed message
  // Skip first render (initial state)
  useEffect(() => {
    voiceChangeCountRef.current++;
    if (voiceChangeCountRef.current <= 1) {
      return;
    }

    const randomMessage = getDjAnnouncement();
    setCurrentMcCommentary(randomMessage);
    speakRef.current(randomMessage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedElevenLabsVoice]);

  // Announce when MC is turned ON (not on page load)
  useEffect(() => {
    const wasOff = !prevMcEnabledRef.current;
    prevMcEnabledRef.current = mcEnabled;

    if (wasOff && mcEnabled) {
      const randomMessage = getDjAnnouncement();
      setCurrentMcCommentary(randomMessage);
      speak(randomMessage);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mcEnabled, speak]);

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
        }
      }
      // Also try to start the editor if available
      if (editorRef.current) {
        editorRef.current.start();
      }
    } catch {
      // Audio init errors are expected on some browsers
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
    <>
    <div
      className="h-screen flex flex-col gap-3"
      style={{
        padding: '4px 8px',
        backgroundColor: theme.background,
        filter: partyEnabled ? `hue-rotate(${partyHue}deg)` : 'none',
        transition: 'filter 0.05s linear',
      }}
    >
      {/* ASCII Header - displayed above the editor */}
      {/* Box drawn with separate elements for perfect alignment */}
      <div className="pt-4 pb-2 text-xs select-none phosphor-glow" style={{ lineHeight: '1.2', fontFamily: 'Menlo, Consolas, "DejaVu Sans Mono", monospace', color: theme.text }}>
        {/* Header row with welcome box and status boxes */}
        <div className="flex items-start justify-between gap-4">
          {/* Welcome box */}
          <div className="ascii-box" style={{ width: 'fit-content' }}>
            <pre className="m-0">╔{'═'.repeat(45)}╗</pre>
            <div className="flex" style={{ fontFamily: 'inherit' }}>
              <pre className="m-0">║</pre>
              <pre className="m-0 flex-1 text-center">Welcome to DJ Claude <span className="opacity-30">v 2.0.0</span></pre>
              <pre className="m-0">║</pre>
            </div>
            <pre className="m-0">╚{'═'.repeat(45)}╝</pre>
          </div>

          {/* Status boxes */}
          <div className="flex items-start gap-2">
            {/* Playing status box */}
            <div className="ascii-box" style={{ width: 'fit-content' }}>
              <pre className="m-0">╔{'═'.repeat(15)}╗</pre>
              <div className="flex" style={{ fontFamily: 'inherit' }}>
                <pre className="m-0">║</pre>
                <pre className="m-0 flex-1 text-center">
                  {!editorReady ? '◌ Booting Up' : isPlaying ? '● Mixing' : '○ On Deck'}
                </pre>
                <pre className="m-0">║</pre>
              </div>
              <pre className="m-0">╚{'═'.repeat(15)}╝</pre>
            </div>

            {/* MC Mode toggle button */}
            <button
              onClick={handleToggleMC}
              className="group phosphor-glow ascii-box"
              style={{ width: 'fit-content' }}
            >
              <div className="group-hover:opacity-30">
                <pre className="m-0">╔{'═'.repeat(10)}╗</pre>
                <div className="flex" style={{ fontFamily: 'inherit' }}>
                  <pre className="m-0">║</pre>
                  <pre className="m-0 flex-1 text-center">{mcEnabled ? 'MC: On' : 'MC: Off'}</pre>
                  <pre className="m-0">║</pre>
                </div>
                <pre className="m-0">╚{'═'.repeat(10)}╝</pre>
              </div>
            </button>

            {/* Voice Selector - only show when MC is enabled */}
            {mcEnabled && <VoiceSelector />}

            {/* Play/Pause button - show when there's code */}
            {state.currentCode && (
              <button
                onClick={handleTogglePlayback}
                className="group phosphor-glow ascii-box"
                style={{ width: 'fit-content' }}
              >
                <div className="group-hover:opacity-30">
                  <pre className="m-0">╔{'═'.repeat(10)}╗</pre>
                  <div className="flex" style={{ fontFamily: 'inherit' }}>
                    <pre className="m-0">║</pre>
                    <pre className="m-0 flex-1 text-center">{isPlaying ? '⏸ pause' : '▶ play'}</pre>
                    <pre className="m-0">║</pre>
                  </div>
                  <pre className="m-0">╚{'═'.repeat(10)}╝</pre>
                </div>
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
            <DancingClaude isPlaying={isPlaying} isSpeaking={isSpeaking} color={theme.text} />
            <SpeechBubble text={currentMcCommentary} isVisible={isSpeaking || !!currentMcCommentary} color={theme.text} />
          </div>
        </div>
      </div>

      {/* Main content area - Strudel Editor as primary view */}
      {/* This enables inline visualizations (pianoroll, scope) and mini locations (active highlighting) */}
      <div className="flex-1 relative" style={{ minHeight: '35px' }}>
        <StrudelEditor
          ref={editorRef}
          onReady={handleEditorReady}
          onError={handleEditorError}
        />
      </div>

      {/* Bottom section with info button and modal */}
      <div className="relative phosphor-glow">
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
                text: theme.text,
                background: theme.background,
              }}
              crtEnabled={crtEnabled}
            />
          </div>

          {/* Info button with modal */}
          <div
            className="text-xs select-none group relative phosphor-glow"
            style={{
              lineHeight: '1.2',
              fontFamily: 'Menlo, Consolas, "DejaVu Sans Mono", monospace',
              color: theme.text,
            }}
            onMouseEnter={() => setShowInfo(true)}
            onMouseLeave={() => setShowInfo(false)}
          >
            <div className="ascii-box" style={{ width: 'fit-content', opacity: showInfo ? 0 : 1 }}>
              <pre className="m-0">╔═══╗</pre>
              <div className="flex" style={{ fontFamily: 'inherit' }}>
                <pre className="m-0">║</pre>
                <pre className="m-0 flex-1 text-center">i</pre>
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
                  color: theme.text,
                  zIndex: 10,
                }}
              >
                <div className="flex flex-col ascii-box">
                  <pre className="m-0">╔{'═'.repeat(45)}╗</pre>
                  <div className="flex" style={{ fontFamily: 'inherit' }}>
                    <pre className="m-0">║</pre>
                    <pre className="m-0 flex-1"> AI-powered live coding music in Strudel</pre>
                    <pre className="m-0">║</pre>
                  </div>
                  <div className="flex" style={{ fontFamily: 'inherit' }}>
                    <pre className="m-0">║</pre>
                    <a href="https://www.patrickposs.com/" target="_blank" rel="noopener noreferrer" className="flex-1" style={{ cursor: 'pointer', textDecoration: 'none', color: 'inherit' }}><pre className="m-0"> Creator: Patrick Poss (hey@patrickposs.com)</pre></a>
                    <pre className="m-0">║</pre>
                  </div>
                  <pre className="m-0">╚{'═'.repeat(45)}╝</pre>
                </div>
              </div>
            )}
          </div>

          {/* Swap colors button */}
          <button
            onClick={toggleSwap}
            className="text-xs select-none group phosphor-glow ascii-box"
            style={{ lineHeight: '1.2', fontFamily: 'Menlo, Consolas, "DejaVu Sans Mono", monospace', color: theme.text, width: 'fit-content' }}
          >
            <div className="group-hover:opacity-30">
              <pre className="m-0">╔═══╗</pre>
              <div className="flex" style={{ fontFamily: 'inherit' }}>
                <pre className="m-0">║</pre>
                <pre className="m-0 flex-1 text-center">↔</pre>
                <pre className="m-0">║</pre>
              </div>
              <pre className="m-0">╚═══╝</pre>
            </div>
          </button>

          {/* Theme cycle button */}
          <button
            onClick={cycleTheme}
            className="text-xs select-none group phosphor-glow ascii-box"
            style={{ lineHeight: '1.2', fontFamily: 'Menlo, Consolas, "DejaVu Sans Mono", monospace', color: theme.text, width: 'fit-content' }}
          >
            <div className="group-hover:opacity-30">
              <pre className="m-0">╔{'═'.repeat(10)}╗</pre>
              <div className="flex" style={{ fontFamily: 'inherit' }}>
                <pre className="m-0">║</pre>
                <pre className="m-0 flex-1 text-center">Theme</pre>
                <pre className="m-0">║</pre>
              </div>
              <pre className="m-0">╚{'═'.repeat(10)}╝</pre>
            </div>
          </button>

          {/* CRT toggle button */}
          <button
            onClick={() => setCrtEnabled((prev) => !prev)}
            className="text-xs select-none group phosphor-glow ascii-box"
            style={{ lineHeight: '1.2', fontFamily: 'Menlo, Consolas, "DejaVu Sans Mono", monospace', color: theme.text, width: 'fit-content' }}
          >
            <div className="group-hover:opacity-30">
              <pre className="m-0">╔{'═'.repeat(10)}╗</pre>
              <div className="flex" style={{ fontFamily: 'inherit' }}>
                <pre className="m-0">║</pre>
                <pre className="m-0 flex-1 text-center">{crtEnabled ? 'NEON: On' : 'NEON: Off'}</pre>
                <pre className="m-0">║</pre>
              </div>
              <pre className="m-0">╚{'═'.repeat(10)}╝</pre>
            </div>
          </button>

          {/* Party toggle button */}
          <button
            onClick={() => setPartyEnabled((prev) => !prev)}
            className="text-xs select-none group phosphor-glow ascii-box"
            style={{ lineHeight: '1.2', fontFamily: 'Menlo, Consolas, "DejaVu Sans Mono", monospace', color: theme.text, width: 'fit-content' }}
          >
            <div className="group-hover:opacity-30">
              <pre className="m-0">╔{'═'.repeat(11)}╗</pre>
              <div className="flex" style={{ fontFamily: 'inherit' }}>
                <pre className="m-0">║</pre>
                <pre className="m-0 flex-1 text-center">{partyEnabled ? 'PARTY: On' : 'PARTY: Off'}</pre>
                <pre className="m-0">║</pre>
              </div>
              <pre className="m-0">╚{'═'.repeat(11)}╝</pre>
            </div>
          </button>

        </div>

        {/* Action buttons - always visible, greyed out when disabled */}
        <div
          className="pb-4 text-xs select-none flex gap-2 phosphor-glow"
          style={{ lineHeight: '1.2', fontFamily: 'Menlo, Consolas, "DejaVu Sans Mono", monospace', color: theme.text }}
        >
          {/* Export button */}
          <button
            onClick={state.currentCode ? handleExport : undefined}
            disabled={!state.currentCode}
            className={state.currentCode ? 'group phosphor-glow ascii-box' : 'opacity-30 cursor-not-allowed phosphor-glow ascii-box'}
            style={{ width: 'fit-content' }}
          >
            <div className={state.currentCode ? 'group-hover:opacity-30' : ''}>
              <pre className="m-0">╔{'═'.repeat(15)}╗</pre>
              <div className="flex" style={{ fontFamily: 'inherit' }}>
                <pre className="m-0">║</pre>
                <pre className="m-0 flex-1 text-center">{copied ? 'Copied!' : 'Export'}</pre>
                <pre className="m-0">║</pre>
              </div>
              <pre className="m-0">╚{'═'.repeat(15)}╝</pre>
            </div>
          </button>

          {/* Go Back button */}
          <button
            onClick={state.previousCode ? handleGoBack : undefined}
            disabled={!state.previousCode}
            className={state.previousCode ? 'group phosphor-glow ascii-box' : 'opacity-30 cursor-not-allowed phosphor-glow ascii-box'}
            style={{ width: 'fit-content' }}
          >
            <div className={state.previousCode ? 'group-hover:opacity-30' : ''}>
              <pre className="m-0">╔{'═'.repeat(15)}╗</pre>
              <div className="flex" style={{ fontFamily: 'inherit' }}>
                <pre className="m-0">║</pre>
                <pre className="m-0 flex-1 text-center">Go Back</pre>
                <pre className="m-0">║</pre>
              </div>
              <pre className="m-0">╚{'═'.repeat(15)}╝</pre>
            </div>
          </button>
        </div>

      </div>

    </div>

    {/* Party mode overlay */}
    <PartyOverlay enabled={partyEnabled} color={theme.text} hue={partyHue} crtEnabled={crtEnabled} />
    </>
  );
}
