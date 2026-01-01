'use client';

import { useState, useRef, useEffect } from 'react';
import { useVoice } from '@/context/VoiceContext';

export function VoiceSelector() {
  const {
    selectedVoiceName,
    setSelectedVoiceName,
    availableVoices,
    currentVoiceName,
    resolvedAutoVoice,
    ttsProvider,
    setTTSProvider,
    selectedElevenLabsVoice,
    setSelectedElevenLabsVoice,
    elevenLabsVoices,
  } = useVoice();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filter out the voice that Auto resolves to (avoid duplicate)
  const filteredVoices = availableVoices.filter(v => v !== resolvedAutoVoice);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Determine display name based on provider
  const displayName = ttsProvider === 'elevenlabs'
    ? (selectedElevenLabsVoice?.name || 'Select').slice(0, 10).padEnd(10)
    : (currentVoiceName.length > 10 ? currentVoiceName.slice(0, 10) : currentVoiceName.padEnd(10));


  const boxWidth = 15;

  const handleSelectWebSpeech = (voiceName: string | null) => {
    setSelectedVoiceName(voiceName);
    setIsOpen(false);
  };

  const handleSelectElevenLabs = (voiceId: string) => {
    const voice = elevenLabsVoices.find(v => v.id === voiceId);
    if (voice) {
      setSelectedElevenLabsVoice(voice);
    }
    setIsOpen(false);
  };

  // Format voice name for dropdown row (text left, indicator right)
  const formatRow = (name: string) => {
    const paddedName = name.length > 10 ? name.slice(0, 10) : name.padEnd(10);
    return `${paddedName} `;
  };

  return (
    <div ref={dropdownRef} className="relative">
      {/* Trigger button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="group phosphor-glow ascii-box"
        style={{ width: 'fit-content' }}
      >
        <div className={`group-hover:opacity-30 ${isOpen ? 'opacity-30' : ''}`}>
          <pre className="m-0">{'╔' + '═'.repeat(boxWidth) + '╗'}</pre>
          <div className="flex" style={{ fontFamily: 'inherit' }}>
            <pre className="m-0">║</pre>
            <pre className="m-0 flex-1 text-center">{displayName} ▾</pre>
            <pre className="m-0">║</pre>
          </div>
          <pre className="m-0">{'╚' + '═'.repeat(boxWidth) + '╝'}</pre>
        </div>
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div
          className="absolute left-0 z-50 phosphor-glow ascii-box"
          style={{
            top: '100%',
            backgroundColor: 'inherit',
          }}
        >
          <pre className="m-0">{'╔' + '═'.repeat(boxWidth) + '╗'}</pre>

          {/* Provider toggle row */}
          <div className="flex" style={{ fontFamily: 'inherit' }}>
            <pre className="m-0 phosphor-glow">║</pre>
            <pre className="m-0 flex-1 text-center phosphor-glow">
              <button
                onClick={() => setTTSProvider('elevenlabs')}
                className={`phosphor-glow ${ttsProvider === 'elevenlabs' ? 'opacity-100' : 'opacity-30 hover:opacity-100'}`}
              >
                AI
              </button>
              {' │ '}
              <button
                onClick={() => setTTSProvider('web-speech')}
                className={`phosphor-glow ${ttsProvider === 'web-speech' ? 'opacity-100' : 'opacity-30 hover:opacity-100'}`}
              >
                Browser
              </button>
            </pre>
            <pre className="m-0 phosphor-glow">║</pre>
          </div>

          {/* Separator */}
          <pre className="m-0">{'╠' + '═'.repeat(boxWidth) + '╣'}</pre>

          {/* Voice options based on provider */}
          {ttsProvider === 'web-speech' ? (
            <>
              {/* Auto option */}
              <button
                onClick={() => handleSelectWebSpeech(null)}
                className="group block w-full text-left phosphor-glow"
              >
                <div className="flex" style={{ fontFamily: 'inherit' }}>
                  <pre className="m-0 phosphor-glow">║</pre>
                  <pre className="m-0 flex-1 text-center phosphor-glow">
                    {formatRow('Auto')}
                    <span className={selectedVoiceName === null ? '' : 'opacity-0 group-hover:opacity-100'}>▪</span>
                  </pre>
                  <pre className="m-0 phosphor-glow">║</pre>
                </div>
              </button>

              {/* Available browser voices */}
              {filteredVoices.map((voiceName) => (
                <button
                  key={voiceName}
                  onClick={() => handleSelectWebSpeech(voiceName)}
                  className="group block w-full text-left phosphor-glow"
                >
                  <div className="flex" style={{ fontFamily: 'inherit' }}>
                    <pre className="m-0 phosphor-glow">║</pre>
                    <pre className="m-0 flex-1 text-center phosphor-glow">
                      {formatRow(voiceName)}
                      <span className={selectedVoiceName === voiceName ? '' : 'opacity-0 group-hover:opacity-100'}>▪</span>
                    </pre>
                    <pre className="m-0 phosphor-glow">║</pre>
                  </div>
                </button>
              ))}
            </>
          ) : (
            <>
              {/* ElevenLabs voices */}
              {elevenLabsVoices.map((voice) => (
                <button
                  key={voice.id}
                  onClick={() => handleSelectElevenLabs(voice.id)}
                  className="group block w-full text-left phosphor-glow"
                >
                  <div className="flex" style={{ fontFamily: 'inherit' }}>
                    <pre className="m-0 phosphor-glow">║</pre>
                    <pre className="m-0 flex-1 text-center phosphor-glow">
                      {formatRow(voice.name)}
                      <span className={selectedElevenLabsVoice?.id === voice.id ? '' : 'opacity-0 group-hover:opacity-100'}>▪</span>
                    </pre>
                    <pre className="m-0 phosphor-glow">║</pre>
                  </div>
                </button>
              ))}
            </>
          )}

          <pre className="m-0">{'╚' + '═'.repeat(boxWidth) + '╝'}</pre>
        </div>
      )}
    </div>
  );
}
