'use client';

import { useState, useRef, useEffect } from 'react';
import { useVoice } from '@/context/VoiceContext';

export function VoiceSelector() {
  const {
    selectedElevenLabsVoice,
    setSelectedElevenLabsVoice,
    elevenLabsVoices,
  } = useVoice();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  const displayName = (selectedElevenLabsVoice?.name || 'Select').slice(0, 10).padEnd(10);
  const boxWidth = 15;

  const handleSelectVoice = (voiceId: string) => {
    const voice = elevenLabsVoices.find(v => v.id === voiceId);
    if (voice) {
      setSelectedElevenLabsVoice(voice);
    }
    setIsOpen(false);
  };

  // Format voice name for dropdown row
  const formatRow = (name: string) => {
    const paddedName = name.length > 10 ? name.slice(0, 10) : name.padEnd(10);
    return `${paddedName} `;
  };

  return (
    <div ref={dropdownRef} className="relative">
      {/* Trigger button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="group phosphor-glow ascii-box cursor-pointer"
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

          {/* Voice options */}
          {elevenLabsVoices.map((voice) => (
            <button
              key={voice.id}
              onClick={() => handleSelectVoice(voice.id)}
              className="group block w-full text-left phosphor-glow cursor-pointer"
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

          <pre className="m-0">{'╚' + '═'.repeat(boxWidth) + '╝'}</pre>
        </div>
      )}
    </div>
  );
}
