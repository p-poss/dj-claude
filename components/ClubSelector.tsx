'use client';

import { useState, useRef, useEffect, useSyncExternalStore } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { themes } from '@/context/ThemeContext';

interface ClubSelectorProps {
  onOpenChange?: (isOpen: boolean) => void;
}

export function ClubSelector({ onOpenChange }: ClubSelectorProps) {
  const { themeName, themeIndex, selectTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        onOpenChange?.(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const displayName = 'CLUB: ' + themeName.slice(0, 10).padEnd(10);
  const isNarrow = useSyncExternalStore(
    (cb) => { window.addEventListener('resize', cb); return () => window.removeEventListener('resize', cb); },
    () => window.innerWidth <= 400,
    () => false
  );
  const boxWidth = isNarrow ? 19 : 20;

  const handleSelectTheme = (index: number) => {
    selectTheme(index);
    setIsOpen(false);
    onOpenChange?.(false);
  };

  // Format theme name for dropdown row
  const formatRow = (name: string) => {
    const paddedName = name.length > 10 ? name.slice(0, 10) : name.padEnd(10);
    return `${paddedName} `;
  };

  return (
    <div ref={dropdownRef} className="relative">
      {/* Trigger button */}
      <button
        onClick={() => { const next = !isOpen; setIsOpen(next); onOpenChange?.(next); }}
        data-testid="club-selector"
        aria-expanded={isOpen}
        aria-label="Select club theme"
        className="group phosphor-glow ascii-box cursor-pointer"
        style={{ width: 'fit-content' }}
      >
        <div className={`group-hover:opacity-30 ${isOpen ? 'opacity-30' : ''}`}>
          <pre className="m-0">{'╔' + '═'.repeat(boxWidth) + '╗'}</pre>
          <div className="flex" style={{ fontFamily: 'inherit' }}>
            <pre className="m-0">║</pre>
            <pre className="m-0 flex-1 flex justify-between"><span>{' ' + displayName}</span><span>▾ </span></pre>
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

          {/* Theme options */}
          {themes.map((theme, index) => (
            <button
              key={theme.name}
              onClick={() => handleSelectTheme(index)}
              data-testid="club-option"
              data-value={theme.name}
              aria-selected={themeIndex === index}
              className="group block w-full text-left phosphor-glow cursor-pointer"
            >
              <div className="flex" style={{ fontFamily: 'inherit' }}>
                <pre className="m-0 phosphor-glow">║</pre>
                <pre className="m-0 flex-1 phosphor-glow flex justify-between">
                  <span>{' ' + formatRow(theme.name)}</span>
                  <span className={themeIndex === index ? '' : 'opacity-0 group-hover:opacity-100'}>▪ </span>
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
