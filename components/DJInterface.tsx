'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useDJ } from '@/context/DJContext';
import { useTheme } from '@/context/ThemeContext';
import { useVoice } from '@/context/VoiceContext';
import { useClaudeStream } from '@/hooks/useClaudeStream';
import { useCodeParser } from '@/hooks/useCodeParser';
import { useTTS } from '@/hooks/useTTS';
import { StrudelEditor, StrudelEditorAPI } from './StrudelEditor';
import { PromptInput, PromptInputAPI } from './PromptInput';
import { DancingClaude } from './DancingClaude';
import { SpeechBubble } from './SpeechBubble';
import { PartyOverlay } from './PartyOverlay';
import { VoiceSelector } from './VoiceSelector';
import { ClubSelector } from './ClubSelector';

const STREAMING_MESSAGES = [
  '\u00A0\u00A0Mixing...',
  '\u00A0\u00A0Composing...',
  '\u00A0\u00A0Cooking...',
  '\u00A0\u00A0Building the beat...',
  '\u00A0\u00A0Finding the groove...',
  '\u00A0\u00A0Layering sounds...',
  '\u00A0\u00A0Crafting the vibe...',
];

const WELCOME_MESSAGES = [
  "Welcome to the session. Tell me a mood, a genre, or just a weird idea.",
  "DJ Claude, ready and waiting. What are we making today?",
  "The booth is yours. Describe a vibe and I'll bring it to life.",
  "Another day, another beat. What's on your mind?",
  "Live coding, live vibes. Drop me a prompt and let's see what happens.",
  "Algorithms and basslines. Tell me what you're feeling.",
  "Synths are warm, drums are loaded. Give me a direction.",
  "What's the vibe? Chill? Dark? Cosmic? Funky? I'm down for anything.",
  "Hey. I turn words into waveforms. Try me.",
  "The decks are set. Give me something to work with.",
];

const EVOLUTION_PROMPTS = [
  "Evolve this into something fresh. Keep the key and tempo. Modify some elements — swap a synth, shift the rhythm, add or remove a layer. It should feel like a natural transition, not a new track.",
  "Take this pattern and push it forward. Change up the melody or rhythm while keeping the same energy. Smooth transition — like a DJ blending into the next phrase.",
  "Time to switch things up. Keep the foundation but introduce a new element — a different lead sound, a rhythmic variation, or a texture change. Keep it cohesive.",
  "Build on what's playing. Add complexity or strip something back. Change the feel slightly — maybe more driving, maybe more spacious. Natural evolution only.",
  "Remix this live. Keep the tempo and key but rework the arrangement — new patterns, different sounds, shifted emphasis. It should sound like the next chapter of the same set.",
];

const IDLE_HYPE_PHRASES = [
  "Yeah.",
  "Mmmm.",
  "Feel that.",
  "Right there.",
  "That's the one.",
  "Listen to that.",
  "Nice and smooth.",
  "Stay right here.",
  "Beautiful.",
  "Let it breathe.",
  "We're locked in.",
  "Hear that?",
  "This is the moment.",
  "Let it ride.",
  "So good.",
  "Just vibing.",
  "Don't touch a thing.",
  "The groove is alive.",
  "Ride it out.",
  "That's a mood.",
  "We're in the zone.",
  "Ohhh yes.",
  "Keep it rolling.",
  "There it is.",
];

// Reusable inline style objects — created once, shared across all renders
const FIT_CONTENT_STYLE: React.CSSProperties = { width: 'fit-content' };
const FIT_CONTENT_ML_AUTO_STYLE: React.CSSProperties = { width: 'fit-content', marginLeft: 'auto' };
const FONT_INHERIT_STYLE: React.CSSProperties = { fontFamily: 'inherit' };
const FLEX_GAP_STYLE: React.CSSProperties = { columnGap: '8px', rowGap: '0px' };
const DROPDOWN_STYLE: React.CSSProperties = { top: '100%' };
const MIN_HEIGHT_STYLE: React.CSSProperties = { minHeight: '35px' };

const LOGO_RESPONSIVE_STYLES = `
  .logo-full { display: block; }
  .logo-no-e { display: none; }
  .logo-no-de { display: none; }
  .logo-no-ude { display: none; }
  @media (max-width: 524px) {
    .logo-full { display: none; }
    .logo-no-e { display: block; }
  }
  @media (max-width: 460px) {
    .logo-no-e { display: none; }
    .logo-no-de { display: block; }
  }
  @media (max-width: 400px) {
    .logo-no-de { display: none; }
    .logo-no-ude { display: block; }
  }
`;

const DJ_ANNOUNCEMENT_TEMPLATES: ((name: string) => string)[] = [
  (name) => `DJ ${name} in the building.`,
  (name) => `Switching it up. DJ ${name} on the mic.`,
  (name) => `DJ ${name}, taking over.`,
  (name) => `Give it up for DJ ${name}.`,
  (name) => `New voice, same energy. DJ ${name} is here.`,
  (name) => `DJ ${name}, reporting for duty.`,
  (name) => `The one and only, DJ ${name}.`,
  (name) => `DJ ${name} on the ones and twos.`,
  (name) => `And just like that, DJ ${name} is live.`,
  (name) => `DJ ${name} has entered the booth.`,
  (name) => `Ladies and gentlemen, DJ ${name}.`,
  (name) => `DJ ${name} on the decks.`,
  (name) => `DJ ${name} in the mix.`,
  (name) => `The booth belongs to ${name} tonight.`,
  (name) => `You're now rocking with ${name}.`,
];

export function DJInterface() {
  const { state, dispatch } = useDJ();
  const { theme, toggleSwap, isSwapped, setSwapped } = useTheme();
  const { selectedElevenLabsVoice } = useVoice();
  const { streamCode } = useClaudeStream();
  const { isComplete, extractedCode, displayCode, mcCommentary, nightMode, discoMode, raveMode, liveMixMode } = useCodeParser(state.streamingCode);
  const { speak, stop: stopTTS, isSpeaking } = useTTS();

  const editorRef = useRef<StrudelEditorAPI>(null);
  const promptInputRef = useRef<PromptInputAPI>(null);
  const infoRef = useRef<HTMLDivElement>(null);
  const hasExecutedRef = useRef(false);
  const voiceChangeCountRef = useRef(0); // Skip initial render
  const prevMcEnabledRef = useRef(true); // MC starts ON by default
  const speakRef = useRef(speak); // Always keep latest speak function
  speakRef.current = speak; // Update ref on every render
  const bingBongTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [editorReady, setEditorReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [infoPinned, setInfoPinned] = useState(false);
  const [streamingMessageIndex, setStreamingMessageIndex] = useState(0);
  const [currentMcCommentary, setCurrentMcCommentary] = useState('');
  const [mcEnabled, setMcEnabled] = useState(true);
  const characterContainerRef = useRef<HTMLDivElement>(null);
  const [crtEnabled, setCrtEnabled] = useState(false);
  const [partyEnabled, setPartyEnabled] = useState(false);
  const [splashVisible, setSplashVisible] = useState(true);
  const [splashMounted, setSplashMounted] = useState(true);
  const [promptCount, setPromptCount] = useState(0);
  const [promptHasValue, setPromptHasValue] = useState(false);
  const [liveMixActive, setLiveMixActive] = useState(false);
  const liveMixTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentCodeRef = useRef(state.currentCode);
  currentCodeRef.current = state.currentCode;
  const messagesRef = useRef(state.messages);
  messagesRef.current = state.messages;
  const streamCodeRef = useRef(streamCode);
  streamCodeRef.current = streamCode;
  const isStreamingRef = useRef(state.isStreaming);
  isStreamingRef.current = state.isStreaming;
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;

  // Splash screen fade out
  useEffect(() => {
    // Start fade out after a brief delay
    const fadeTimer = setTimeout(() => {
      setSplashVisible(false);
    }, 800);

    // Remove from DOM after fade animation completes
    const removeTimer = setTimeout(() => {
      setSplashMounted(false);
    }, 1300); // 800ms delay + 500ms fade

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
    };
  }, []);

  // Close info modal when clicking outside (only when pinned)
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (infoRef.current && !infoRef.current.contains(e.target as Node)) {
        setShowInfo(false);
        setInfoPinned(false);
      }
    };
    if (infoPinned) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [infoPinned]);

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

  // Track cursor/touch position to slide character (inverted direction)
  // Uses ref-based DOM update to avoid re-rendering the entire tree on every mousemove
  useEffect(() => {
    const updateOffset = (clientX: number) => {
      const centerX = window.innerWidth / 2;
      const offset = ((clientX - centerX) / centerX) * -119;
      if (characterContainerRef.current) {
        characterContainerRef.current.style.transform = `translateX(${offset}px)`;
      }
    };

    const onMouse = (e: MouseEvent) => updateOffset(e.clientX);
    const onTouch = (e: TouchEvent) => e.touches[0] && updateOffset(e.touches[0].clientX);

    window.addEventListener('mousemove', onMouse);
    window.addEventListener('touchmove', onTouch);
    return () => {
      window.removeEventListener('mousemove', onMouse);
      window.removeEventListener('touchmove', onTouch);
    };
  }, []);

  // Greet user on page load with random welcome message (speech bubble only)
  // Note: TTS is skipped because browsers block audio until user interaction
  useEffect(() => {
    if (editorReady) {
      const timer = setTimeout(() => {
        const randomMessage = WELCOME_MESSAGES[Math.floor(Math.random() * WELCOME_MESSAGES.length)];
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
        const randomPhrase = IDLE_HYPE_PHRASES[Math.floor(Math.random() * IDLE_HYPE_PHRASES.length)];
        setCurrentMcCommentary(randomPhrase);
        speakRef.current(randomPhrase);
      }, getRandomDelay());
    };

    const timer = scheduleNextPhrase();
    return () => clearTimeout(timer);
  }, [isPlaying, mcEnabled, state.isStreaming, isSpeaking]);

  // Live mix auto-evolution loop
  // Uses refs to avoid re-triggering on every state change
  useEffect(() => {
    if (!liveMixActive || !currentCodeRef.current) return;

    let cancelled = false;

    const scheduleEvolution = () => {
      liveMixTimerRef.current = setTimeout(async () => {
        if (cancelled || !currentCodeRef.current || isStreamingRef.current) return;

        const prompt = EVOLUTION_PROMPTS[Math.floor(Math.random() * EVOLUTION_PROMPTS.length)];
        setPromptCount(c => c + 1);
        try {
          await streamCodeRef.current({
            prompt,
            currentCode: currentCodeRef.current,
            history: messagesRef.current,
          });
        } catch (err) {
          console.error('Live mix evolution error:', err);
        }

        // Schedule next evolution after this one completes
        if (!cancelled) {
          scheduleEvolution();
        }
      }, 45000 + Math.random() * 30000);
    };

    scheduleEvolution();

    return () => {
      cancelled = true;
      if (liveMixTimerRef.current) clearTimeout(liveMixTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveMixActive]);

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

      // Apply visual mode controls from agent response
      if (typeof nightMode === 'boolean') setSwapped(nightMode);
      if (typeof discoMode === 'boolean') setPartyEnabled(discoMode);
      if (typeof raveMode === 'boolean') setCrtEnabled(raveMode);
      if (typeof liveMixMode === 'boolean') setLiveMixActive(liveMixMode);

      // Start MC commentary TTS if available and MC mode is enabled
      if (mcCommentary) {
        setCurrentMcCommentary(mcCommentary);
        if (mcEnabled) {
          speakRef.current(mcCommentary);
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
  }, [isComplete, extractedCode, mcCommentary, nightMode, discoMode, raveMode, liveMixMode, dispatch, mcEnabled, setSwapped, promptCount]);

  // Reset execution flag and stop TTS when new stream starts
  // Refocus input when streaming ends
  const wasStreamingRef = useRef(false);
  useEffect(() => {
    if (state.isStreaming) {
      hasExecutedRef.current = false;
      wasStreamingRef.current = true;
      // Stop any ongoing TTS when new stream starts
      stopTTS();
      setCurrentMcCommentary('');
    } else if (wasStreamingRef.current) {
      // Streaming just ended - refocus the input
      wasStreamingRef.current = false;
      requestAnimationFrame(() => {
        promptInputRef.current?.focus();
      });
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
    const template = DJ_ANNOUNCEMENT_TEMPLATES[Math.floor(Math.random() * DJ_ANNOUNCEMENT_TEMPLATES.length)];
    return template(voiceName);
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
      setStreamingMessageIndex((prev) => (prev + 1) % STREAMING_MESSAGES.length);
    }, 2000);

    return () => clearInterval(interval);
  }, [state.isStreaming, STREAMING_MESSAGES.length]);

  // Unlock audio for Safari - must be called synchronously during user gesture
  // This unlocks both Web Audio API (for Strudel) and HTMLAudioElement (for TTS)
  const unlockAudio = useCallback(() => {
    try {
      // === PART 1: Unlock Web Audio API (for Strudel) ===
      const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        // Try to get Strudel's audio context first
        let ctx = (window as any).getAudioContext?.();

        // If Strudel doesn't have one yet, create one to unlock audio
        if (!ctx) {
          ctx = new AudioCtx();
          // Store it so Strudel can find it later
          (window as any).__djClaudeAudioContext = ctx;
        }

        // Resume if suspended (this is the key for Safari)
        if (ctx.state === 'suspended') {
          ctx.resume();
        }

        // Play a silent buffer to fully unlock Web Audio on iOS Safari
        const buffer = ctx.createBuffer(1, 1, 22050);
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.start(0);
      }

      // === PART 2: Unlock HTMLAudioElement (for TTS) ===
      // Create and play a silent audio to unlock media playback
      // This allows subsequent audio.play() calls to work without user gesture
      const silentAudio = new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA');
      silentAudio.volume = 0;
      silentAudio.play().catch(() => {
        // Ignore errors - this is just to unlock audio
      });

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
    // IMPORTANT: Unlock audio SYNCHRONOUSLY at the start of the user gesture
    // This must happen before any await to satisfy Safari's autoplay policy
    unlockAudio();

    // Increment prompt count to ensure auto-execute effect runs for each new prompt
    setPromptCount(c => c + 1);

    try {
      await streamCode({
        prompt,
        currentCode: state.currentCode,
        history: state.messages,
      });
    } catch (error) {
      console.error('Stream error:', error);
    }
  }, [streamCode, state.currentCode, state.messages, unlockAudio]);

  // Handle pause
  const handlePause = useCallback(() => {
    if (editorRef.current) {
      editorRef.current.stop();
    }
    setIsPlaying(false);
    setLiveMixActive(false);
    // Prevent auto-execute of any in-flight stream from overriding the pause
    hasExecutedRef.current = true;
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

  // Keyboard shortcuts — uses refs for frequently-changing state to avoid listener churn
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Space to toggle play/pause (only when not focused on input)
      if (e.key === ' ' && currentCodeRef.current && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault();
        if (isPlayingRef.current) {
          handlePause();
        } else {
          handlePlay();
        }
      }
      // Escape to pause
      if (e.key === 'Escape' && isPlayingRef.current) {
        handlePause();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePause, handlePlay]);

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

      // Prevent auto-execute of any in-flight stream from overriding the revert
      hasExecutedRef.current = true;

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

  const handleBingBong = useCallback((headphonesGoingDown: boolean) => {
    const message = headphonesGoingDown ? 'Do you like my hat?' : 'And we\'re back.';
    setCurrentMcCommentary(message);
    speak(message);
    if (bingBongTimerRef.current) clearTimeout(bingBongTimerRef.current);
    bingBongTimerRef.current = setTimeout(() => setCurrentMcCommentary(''), 3000);
  }, [speak]);

  const handleToggleLiveMix = useCallback(() => {
    unlockAudio();
    setLiveMixActive(prev => !prev);
  }, [unlockAudio]);

  return (
    <div className={partyEnabled ? 'party-hue-cycle' : ''}>
    <div
      data-testid="dj-interface"
      className="flex flex-col gap-3"
      style={{
        height: '100dvh',
        padding: '4px 8px',
        backgroundColor: theme.background,
      }}
    >
      {/* ASCII Header - displayed above the editor */}
      {/* Box drawn with separate elements for perfect alignment */}
      <div className="pt-4 pb-2 text-xs select-none phosphor-glow" style={{ lineHeight: '1.2', fontFamily: 'Menlo, Consolas, "DejaVu Sans Mono", monospace', color: theme.text }}>
        <div className="flex flex-wrap items-start justify-between" style={FLEX_GAP_STYLE}>

          {/* Container A: Logo / Status / Controls */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0px' }}>
            {/* Row 1: Welcome box + On Deck status (hidden on mobile) */}
            <div className="hidden md:flex flex-wrap items-start" style={FLEX_GAP_STYLE}>
              {/* Welcome box */}
              <div className="ascii-box" style={FIT_CONTENT_STYLE}>
                <pre className="m-0">╔{'═'.repeat(45)}╗</pre>
                <div className="flex" style={FONT_INHERIT_STYLE}>
                  <pre className="m-0">║</pre>
                  <pre className="m-0 flex-1 text-center">Welcome to DJ Claude <span className="opacity-30">v 0.1.17</span></pre>
                  <pre className="m-0">║</pre>
                </div>
                <pre className="m-0">╚{'═'.repeat(45)}╝</pre>
              </div>

              {/* Playing status box */}
              <div className="ascii-box" style={FIT_CONTENT_STYLE}>
                <pre className="m-0">╔{'═'.repeat(20)}╗</pre>
                <div className="flex" style={FONT_INHERIT_STYLE}>
                  <pre className="m-0">║</pre>
                  <pre className="m-0 flex-1 text-center">
                    {!editorReady ? '◌ Booting Up' : state.isStreaming ? <><span className="queuing-pulse">◎</span> Queuing</> : isPlaying ? '● Mixing' : state.currentCode ? '○ On Break' : '○ On Deck'}
                  </pre>
                  <pre className="m-0">║</pre>
                </div>
                <pre className="m-0">╚{'═'.repeat(20)}╝</pre>
              </div>
            </div>

            {/* Row 2: DJ Claude ASCII Logo - responsive letter hiding */}
            <div>
              <style>{LOGO_RESPONSIVE_STYLES}</style>
              <pre className="m-0 logo-full">{`
 ██████╗      ██╗     ██████╗██╗      █████╗ ██╗   ██╗██████╗ ███████╗
 ██╔══██╗     ██║    ██╔════╝██║     ██╔══██╗██║   ██║██╔══██╗██╔════╝
 ██║  ██║     ██║    ██║     ██║     ███████║██║   ██║██║  ██║█████╗
 ██║  ██║██   ██║    ██║     ██║     ██╔══██║██║   ██║██║  ██║██╔══╝
 ██████╔╝╚█████╔╝    ╚██████╗███████╗██║  ██║╚██████╔╝██████╔╝███████╗
 ╚═════╝  ╚════╝      ╚═════╝╚══════╝╚═╝  ╚═╝ ╚═════╝ ╚═════╝ ╚══════╝`}</pre>
              <pre className="m-0 logo-no-e">{`
 ██████╗      ██╗     ██████╗██╗      █████╗ ██╗   ██╗
 ██╔══██╗     ██║    ██╔════╝██║     ██╔══██╗██║   ██║
 ██║  ██║     ██║    ██║     ██║     ███████║██║   ██║
 ██║  ██║██   ██║    ██║     ██║     ██╔══██║██║   ██║
 ██████╔╝╚█████╔╝    ╚██████╗███████╗██║  ██║╚██████╔╝██████╗
 ╚═════╝  ╚════╝      ╚═════╝╚══════╝╚═╝  ╚═╝ ╚═════╝ ╚═════╝`}</pre>
              <pre className="m-0 logo-no-de">{`
 ██████╗      ██╗     ██████╗██╗      █████╗
 ██╔══██╗     ██║    ██╔════╝██║     ██╔══██╗
 ██║  ██║     ██║    ██║     ██║     ███████║
 ██║  ██║██   ██║    ██║     ██║     ██╔══██║
 ██████╔╝╚█████╔╝    ╚██████╗███████╗██║  ██║ ██████╗
 ╚═════╝  ╚════╝      ╚═════╝╚══════╝╚═╝  ╚═╝ ╚═════╝`}</pre>
              <pre className="m-0 logo-no-ude">{`
 ██████╗      ██╗     ██████╗██╗      █████╗
 ██╔══██╗     ██║    ██╔════╝██║     ██╔══██╗
 ██║  ██║     ██║    ██║     ██║     ███████║
 ██║  ██║██   ██║    ██║     ██║     ██╔══██║
 ██████╔╝╚█████╔╝    ╚██████╗███████╗██║  ██║
 ╚═════╝  ╚════╝      ╚═════╝╚══════╝╚═╝  ╚═╝`}</pre>
            </div>

            {/* Row 3: Night, Disco, Rave */}
            <div className="flex flex-wrap items-start" style={FLEX_GAP_STYLE}>
              {/* Night toggle button */}
              <button
                onClick={toggleSwap}
                data-testid="flip-toggle"
                aria-label="Toggle color flip"
                aria-pressed={isSwapped}
                className="group phosphor-glow ascii-box cursor-pointer"
                style={FIT_CONTENT_STYLE}
              >
                <div className="group-hover:opacity-30">
                  <pre className="m-0">╔{'═'.repeat(15)}╗</pre>
                  <div className="flex" style={FONT_INHERIT_STYLE}>
                    <pre className="m-0">║</pre>
                    <pre className="m-0 flex-1 text-center">{isSwapped ? 'NIGHT: Off' : 'NIGHT: On'}</pre>
                    <pre className="m-0">║</pre>
                  </div>
                  <pre className="m-0">╚{'═'.repeat(15)}╝</pre>
                </div>
              </button>

              {/* Disco toggle button */}
              <button
                onClick={() => setPartyEnabled((prev) => !prev)}
                data-testid="disco-toggle"
                aria-label="Toggle disco mode"
                aria-pressed={partyEnabled}
                className="group phosphor-glow ascii-box cursor-pointer"
                style={FIT_CONTENT_STYLE}
              >
                <div className="group-hover:opacity-30">
                  <pre className="m-0">╔{'═'.repeat(15)}╗</pre>
                  <div className="flex" style={FONT_INHERIT_STYLE}>
                    <pre className="m-0">║</pre>
                    <pre className="m-0 flex-1 text-center">{partyEnabled ? 'DISCO: On' : 'DISCO: Off'}</pre>
                    <pre className="m-0">║</pre>
                  </div>
                  <pre className="m-0">╚{'═'.repeat(15)}╝</pre>
                </div>
              </button>

              {/* Rave toggle button */}
              <button
                onClick={() => setCrtEnabled((prev) => !prev)}
                data-testid="rave-toggle"
                aria-label="Toggle rave mode"
                aria-pressed={crtEnabled}
                className="group phosphor-glow ascii-box cursor-pointer"
                style={FIT_CONTENT_STYLE}
              >
                <div className="group-hover:opacity-30">
                  <pre className="m-0">╔{'═'.repeat(15)}╗</pre>
                  <div className="flex" style={FONT_INHERIT_STYLE}>
                    <pre className="m-0">║</pre>
                    <pre className="m-0 flex-1 text-center">{crtEnabled ? 'RAVE: On' : 'RAVE: Off'}</pre>
                    <pre className="m-0">║</pre>
                  </div>
                  <pre className="m-0">╚{'═'.repeat(15)}╝</pre>
                </div>
              </button>

            </div>
          </div>

          {/* Container B: Info + MC */}
          <div className="flex flex-wrap items-start" style={FLEX_GAP_STYLE}>
            {/* Info button with modal */}
            <div ref={infoRef} className="relative"
              onMouseEnter={() => { if (!infoPinned) setShowInfo(true); }}
              onMouseLeave={() => { if (!infoPinned) setShowInfo(false); }}
            >
              <button
                onClick={() => {
                  if (infoPinned) {
                    setInfoPinned(false);
                    setShowInfo(false);
                  } else {
                    setInfoPinned(true);
                    setShowInfo(true);
                  }
                }}
                data-testid="info-button"
                aria-label="Show info"
                className="group phosphor-glow ascii-box cursor-pointer"
                style={FIT_CONTENT_STYLE}
              >
                <div className={`group-hover:opacity-30 ${showInfo ? 'opacity-30' : ''}`}>
                  <pre className="m-0">╔═══╗</pre>
                  <div className="flex" style={FONT_INHERIT_STYLE}>
                    <pre className="m-0">║</pre>
                    <pre className="m-0 flex-1 text-center">i</pre>
                    <pre className="m-0">║</pre>
                  </div>
                  <pre className="m-0">╚═══╝</pre>
                </div>
              </button>

              {/* Info modal - positioned below info button */}
              {showInfo && (
                <div
                  className="absolute left-0 z-50 phosphor-glow ascii-box"
                  style={DROPDOWN_STYLE}
                >
                  <pre className="m-0">╔{'═'.repeat(45)}╗</pre>
                  <div className="flex" style={FONT_INHERIT_STYLE}>
                    <pre className="m-0">║</pre>
                    <pre className="m-0 flex-1"> • Agentic live coding music in Strudel</pre>
                    <pre className="m-0">║</pre>
                  </div>
                  <div className="flex" style={FONT_INHERIT_STYLE}>
                    <pre className="m-0">║</pre>
                    <pre className="m-0 flex-1"> • Claude Code: /install plugin dj-claude</pre>
                    <pre className="m-0">║</pre>
                  </div>
                  <div className="flex" style={FONT_INHERIT_STYLE}>
                    <pre className="m-0">║</pre>
                    <pre className="m-0 flex-1"> • AI agents can now DJ while they work</pre>
                    <pre className="m-0">║</pre>
                  </div>
                  <div className="flex" style={FONT_INHERIT_STYLE}>
                    <pre className="m-0">║</pre>
                    <a href="https://github.com/p-poss/dj-claude" target="_blank" rel="noopener noreferrer" className="flex-1" style={{ cursor: 'pointer', textDecoration: 'none', color: 'inherit' }}><pre className="m-0"> GITHUB: github.com/p-poss/dj-claude</pre></a>
                    <pre className="m-0">║</pre>
                  </div>
                  <div className="flex" style={FONT_INHERIT_STYLE}>
                    <pre className="m-0">║</pre>
                    <pre className="m-0 flex-1"> DISCLAIMER: Non-official Anthropic product</pre>
                    <pre className="m-0">║</pre>
                  </div>
                  <pre className="m-0">╚{'═'.repeat(45)}╝</pre>
                </div>
              )}
            </div>

            {/* Club theme selector */}
            <ClubSelector />

            {/* MC Voice Selector */}
            <VoiceSelector mcEnabled={mcEnabled} onToggleMC={(enabled) => {
              if (!enabled) {
                stopTTS();
              }
              setMcEnabled(enabled);
            }} />
          </div>

        </div>

      </div>

      {/* Dancing Claude character with speech bubble */}
      <div className="flex justify-center">
        <div
          ref={characterContainerRef}
          style={{
            position: 'relative',
            transition: 'transform 0.15s ease-out',
          }}
        >
          <DancingClaude isPlaying={isPlaying} isSpeaking={isSpeaking} color={theme.text} crtEnabled={crtEnabled} onClickCharacter={handleBingBong} />
          <SpeechBubble text={currentMcCommentary} isVisible={isSpeaking || !!currentMcCommentary} color={theme.text} />
        </div>
      </div>

      {/* Bottom section with info button and modal */}
      <div className="relative phosphor-glow">
        {/* Prompt input row with info button */}
        <div className="flex items-start gap-2">
          <div className="flex-1">
            <PromptInput
              ref={promptInputRef}
              onSubmit={handlePromptSubmit}
              disabled={state.isStreaming || !editorReady || liveMixActive}
              isStreaming={state.isStreaming}
              placeholder={
                liveMixActive
                  ? '\u00A0\u00A0LIVE MIX active — toggle off to take control'
                  : state.isStreaming
                    ? STREAMING_MESSAGES[streamingMessageIndex]
                    : editorReady
                      ? "Make it darker, Add percussion, Speed it up..."
                      : "Initializing..."
              }
              themeColors={{
                text: theme.text,
                background: theme.background,
              }}
              crtEnabled={crtEnabled}
              onHasValueChange={setPromptHasValue}
            />
          </div>

          {/* Submit button - mobile only */}
          <button
            onClick={() => promptInputRef.current?.submit()}
            disabled={!promptHasValue || state.isStreaming || !editorReady || liveMixActive}
            data-testid="submit-button"
            aria-label="Submit"
            aria-disabled={!promptHasValue || state.isStreaming || !editorReady || liveMixActive}
            className={`group phosphor-glow ascii-box text-xs select-none ${promptHasValue && !state.isStreaming && editorReady && !liveMixActive ? 'cursor-pointer' : 'cursor-not-allowed'}`}
            style={{ width: 'fit-content', lineHeight: '1.2', fontFamily: 'Menlo, Consolas, "DejaVu Sans Mono", monospace', color: theme.text, opacity: promptHasValue && !state.isStreaming && editorReady && !liveMixActive ? 1 : 0.3 }}
          >
            <div className={promptHasValue && !state.isStreaming && editorReady && !liveMixActive ? 'group-hover:opacity-30' : ''}>
              <pre className="m-0">╔═══╗</pre>
              <div className="flex" style={FONT_INHERIT_STYLE}>
                <pre className="m-0">║</pre>
                <pre className="m-0 flex-1 text-center">↓</pre>
                <pre className="m-0">║</pre>
              </div>
              <pre className="m-0">╚═══╝</pre>
            </div>
          </button>
        </div>

      </div>

      {/* Main content area - Strudel Editor as primary view */}
      {/* This enables inline visualizations (pianoroll, scope) and mini locations (active highlighting) */}
      <div className="flex-1 relative" style={MIN_HEIGHT_STYLE}>
        <StrudelEditor
          ref={editorRef}
          onReady={handleEditorReady}
          onError={handleEditorError}
        />
        {/* Overlay to block editor interaction until first prompt */}
        {state.messages.length === 0 && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: 20,
              cursor: 'not-allowed',
            }}
          />
        )}
      </div>

      {/* Action buttons - always visible, greyed out when disabled */}
      <div
        className="pb-4 text-xs select-none flex gap-2 phosphor-glow"
        style={{ lineHeight: '1.2', fontFamily: 'Menlo, Consolas, "DejaVu Sans Mono", monospace', color: theme.text }}
      >
        {/* Play/Pause button - left-aligned */}
        <button
          onClick={state.currentCode ? handleTogglePlayback : undefined}
          disabled={!state.currentCode}
          data-testid="play-pause-button"
          aria-label={isPlaying ? 'Pause music' : 'Play music'}
          aria-disabled={!state.currentCode}
          className={state.currentCode ? 'group phosphor-glow ascii-box cursor-pointer' : 'opacity-30 cursor-not-allowed phosphor-glow ascii-box'}
          style={FIT_CONTENT_STYLE}
        >
          <div className={state.currentCode ? 'group-hover:opacity-30' : ''}>
            <pre className="m-0">╔{'═'.repeat(15)}╗</pre>
            <div className="flex" style={FONT_INHERIT_STYLE}>
              <pre className="m-0">║</pre>
              <pre className="m-0 flex-1 text-center">{isPlaying ? '▪ PAUSE' : '▶ PLAY'}</pre>
              <pre className="m-0">║</pre>
            </div>
            <pre className="m-0">╚{'═'.repeat(15)}╝</pre>
          </div>
        </button>

        {/* Live Mix toggle button */}
        <button
          onClick={state.currentCode ? handleToggleLiveMix : undefined}
          disabled={!state.currentCode}
          data-testid="live-mix-button"
          aria-label={liveMixActive ? 'Stop live mix' : 'Start live mix'}
          aria-pressed={liveMixActive}
          aria-disabled={!state.currentCode}
          className={state.currentCode ? 'group phosphor-glow ascii-box cursor-pointer' : 'opacity-30 cursor-not-allowed phosphor-glow ascii-box'}
          style={FIT_CONTENT_STYLE}
        >
          <div className={state.currentCode ? 'group-hover:opacity-30' : ''}>
            <pre className="m-0">╔{'═'.repeat(20)}╗</pre>
            <div className="flex" style={FONT_INHERIT_STYLE}>
              <pre className="m-0">║</pre>
              <pre className="m-0 flex-1 text-center">{liveMixActive ? 'LIVE MIX: On' : 'LIVE MIX: Off'}</pre>
              <pre className="m-0">║</pre>
            </div>
            <pre className="m-0">╚{'═'.repeat(20)}╝</pre>
          </div>
        </button>

        {/* Re-run button - mobile only */}
        <button
          onClick={state.currentCode ? handlePlay : undefined}
          disabled={!state.currentCode}
          data-testid="rerun-button"
          aria-label="Re-run"
          aria-disabled={!state.currentCode}
          className={`md:hidden ${state.currentCode ? 'group phosphor-glow ascii-box cursor-pointer' : 'opacity-30 cursor-not-allowed phosphor-glow ascii-box'}`}
          style={FIT_CONTENT_ML_AUTO_STYLE}
        >
          <div className={state.currentCode ? 'group-hover:opacity-30' : ''}>
            <pre className="m-0">╔═══╗</pre>
            <div className="flex" style={FONT_INHERIT_STYLE}>
              <pre className="m-0">║</pre>
              <pre className="m-0 flex-1 text-center">⟳</pre>
              <pre className="m-0">║</pre>
            </div>
            <pre className="m-0">╚═══╝</pre>
          </div>
        </button>

        {/* Revert button - right-aligned on desktop (re-run takes ml-auto on mobile) */}
        <button
          onClick={state.previousCode ? handleGoBack : undefined}
          disabled={!state.previousCode}
          data-testid="revert-button"
          aria-label="Revert to previous code"
          aria-disabled={!state.previousCode}
          className={`md:!ml-auto ${state.previousCode ? 'group phosphor-glow ascii-box cursor-pointer' : 'opacity-30 cursor-not-allowed phosphor-glow ascii-box'}`}
          style={FIT_CONTENT_STYLE}
        >
          <div className={state.previousCode ? 'group-hover:opacity-30' : ''}>
            {/* Mobile: icon only */}
            <div className="md:hidden">
              <pre className="m-0">╔═══╗</pre>
              <div className="flex" style={FONT_INHERIT_STYLE}>
                <pre className="m-0">║</pre>
                <pre className="m-0 flex-1 text-center">↩</pre>
                <pre className="m-0">║</pre>
              </div>
              <pre className="m-0">╚═══╝</pre>
            </div>
            {/* Desktop: full label */}
            <div className="hidden md:block">
              <pre className="m-0">╔{'═'.repeat(15)}╗</pre>
              <div className="flex" style={FONT_INHERIT_STYLE}>
                <pre className="m-0">║</pre>
                <pre className="m-0 flex-1 text-center">↩ REVERT</pre>
                <pre className="m-0">║</pre>
              </div>
              <pre className="m-0">╚{'═'.repeat(15)}╝</pre>
            </div>
          </div>
        </button>

        {/* Export button */}
        <button
          onClick={state.currentCode ? handleExport : undefined}
          disabled={!state.currentCode}
          data-testid="export-button"
          aria-label="Copy code to clipboard"
          aria-disabled={!state.currentCode}
          className={state.currentCode ? 'group phosphor-glow ascii-box cursor-pointer' : 'opacity-30 cursor-not-allowed phosphor-glow ascii-box'}
          style={FIT_CONTENT_STYLE}
        >
          <div className={state.currentCode ? 'group-hover:opacity-30' : ''}>
            {/* Mobile: icon only */}
            <div className="md:hidden">
              <pre className="m-0">╔═══╗</pre>
              <div className="flex" style={FONT_INHERIT_STYLE}>
                <pre className="m-0">║</pre>
                <pre className="m-0 flex-1 text-center">{copied ? '✓' : '⎘'}</pre>
                <pre className="m-0">║</pre>
              </div>
              <pre className="m-0">╚═══╝</pre>
            </div>
            {/* Desktop: full label */}
            <div className="hidden md:block">
              <pre className="m-0">╔{'═'.repeat(15)}╗</pre>
              <div className="flex" style={FONT_INHERIT_STYLE}>
                <pre className="m-0">║</pre>
                <pre className="m-0 flex-1 text-center">{copied ? '✓ COPIED!' : '⎘ EXPORT'}</pre>
                <pre className="m-0">║</pre>
              </div>
              <pre className="m-0">╚{'═'.repeat(15)}╝</pre>
            </div>
          </div>
        </button>
      </div>

    </div>

    {/* Party mode overlay */}
    <PartyOverlay enabled={partyEnabled} color={theme.text} />

    {/* Splash screen - fades out on load */}
    {splashMounted && (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: theme.background,
          zIndex: 9999,
          opacity: splashVisible ? 1 : 0,
          transition: 'opacity 500ms ease-out',
          pointerEvents: splashVisible ? 'auto' : 'none',
        }}
      />
    )}
    </div>
  );
}
