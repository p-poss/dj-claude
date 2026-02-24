import { describe, it, expect } from 'vitest';
import {
  midiToName,
  noteToSortKey,
  isDrum,
  getNoteValue,
  queryHaps,
  buildDrumGrid,
  buildPianoroll,
  renderPlayheadRow,
  GRID_WIDTH,
  type Hap,
} from './pattern-viz.js';

// --- Helpers to build test haps ---

function drumHap(s: string, begin: number, end: number): Hap {
  return { whole: { begin, end }, value: { s } };
}

function noteHap(note: string | number, begin: number, end: number): Hap {
  return { whole: { begin, end }, value: { note } };
}

function nHap(n: number, begin: number, end: number): Hap {
  return { whole: { begin, end }, value: { n } };
}

// --- midiToName ---

describe('midiToName', () => {
  it('converts middle C (60) to C4', () => {
    expect(midiToName(60)).toBe('C4');
  });

  it('converts A4 (69)', () => {
    expect(midiToName(69)).toBe('A4');
  });

  it('converts sharps correctly', () => {
    expect(midiToName(61)).toBe('C#4');
    expect(midiToName(66)).toBe('F#4');
  });

  it('handles low octaves', () => {
    expect(midiToName(24)).toBe('C1');
    expect(midiToName(0)).toBe('C-1');
  });

  it('handles high octaves', () => {
    expect(midiToName(96)).toBe('C7');
    expect(midiToName(127)).toBe('G9');
  });
});

// --- noteToSortKey ---

describe('noteToSortKey', () => {
  it('returns 0 for C0', () => {
    expect(noteToSortKey('C0')).toBe(0);
  });

  it('sorts C4 < E4 < G4 < C5', () => {
    const keys = ['C4', 'E4', 'G4', 'C5'].map(noteToSortKey);
    for (let i = 1; i < keys.length; i++) {
      expect(keys[i]).toBeGreaterThan(keys[i - 1]);
    }
  });

  it('handles sharps', () => {
    expect(noteToSortKey('C#4')).toBe(noteToSortKey('C4') + 1);
    expect(noteToSortKey('F#3')).toBeGreaterThan(noteToSortKey('F3'));
  });

  it('returns 0 for invalid note names', () => {
    expect(noteToSortKey('invalid')).toBe(0);
    expect(noteToSortKey('')).toBe(0);
  });

  it('handles negative octaves', () => {
    expect(noteToSortKey('C-1')).toBe(-12);
    expect(noteToSortKey('C-1')).toBeLessThan(noteToSortKey('C0'));
  });
});

// --- isDrum ---

describe('isDrum', () => {
  it('returns true for known drum samples', () => {
    expect(isDrum({ value: { s: 'bd' } })).toBe(true);
    expect(isDrum({ value: { s: 'sd' } })).toBe(true);
    expect(isDrum({ value: { s: 'hh' } })).toBe(true);
    expect(isDrum({ value: { s: 'oh' } })).toBe(true);
    expect(isDrum({ value: { s: 'cp' } })).toBe(true);
  });

  it('returns false for non-drum samples', () => {
    expect(isDrum({ value: { s: 'piano' } })).toBe(false);
    expect(isDrum({ value: { s: 'bass' } })).toBe(false);
  });

  it('returns false when s is missing', () => {
    expect(isDrum({ value: { note: 'C4' } })).toBe(false);
    expect(isDrum({ value: {} })).toBe(false);
  });

  it('returns false when s is not a string', () => {
    expect(isDrum({ value: { s: 42 } })).toBe(false);
  });
});

// --- getNoteValue ---

describe('getNoteValue', () => {
  it('returns string note directly', () => {
    expect(getNoteValue({ value: { note: 'C4' } })).toBe('C4');
    expect(getNoteValue({ value: { note: 'G#5' } })).toBe('G#5');
  });

  it('converts numeric note via midiToName', () => {
    expect(getNoteValue({ value: { note: 60 } })).toBe('C4');
    expect(getNoteValue({ value: { note: 69 } })).toBe('A4');
  });

  it('falls back to n property', () => {
    expect(getNoteValue({ value: { n: 60 } })).toBe('C4');
    expect(getNoteValue({ value: { n: 48 } })).toBe('C3');
  });

  it('returns null when no note or n', () => {
    expect(getNoteValue({ value: {} })).toBeNull();
    expect(getNoteValue({ value: { s: 'bd' } })).toBeNull();
  });

  it('prefers note over n', () => {
    expect(getNoteValue({ value: { note: 'E4', n: 60 } })).toBe('E4');
  });
});

// --- queryHaps ---

describe('queryHaps', () => {
  it('calls queryArc on the pattern', () => {
    const mockHaps: Hap[] = [drumHap('bd', 0, 0.25)];
    const pattern = {
      queryArc: (s: number, e: number) => {
        expect(s).toBe(0);
        expect(e).toBe(1);
        return mockHaps;
      },
    };
    expect(queryHaps(pattern, 0, 1)).toEqual(mockHaps);
  });

  it('returns empty array when pattern has no queryArc', () => {
    expect(queryHaps({}, 0, 1)).toEqual([]);
    expect(queryHaps(null, 0, 1)).toEqual([]);
    expect(queryHaps(undefined, 0, 1)).toEqual([]);
  });

  it('returns empty array when queryArc throws', () => {
    const pattern = {
      queryArc: () => { throw new Error('boom'); },
    };
    expect(queryHaps(pattern, 0, 1)).toEqual([]);
  });
});

// --- buildDrumGrid ---

describe('buildDrumGrid', () => {
  it('places drum onsets at correct columns', () => {
    // 4 evenly-spaced bd hits in cycle 0-1
    const haps = [
      drumHap('bd', 0, 0.25),
      drumHap('bd', 0.25, 0.5),
      drumHap('bd', 0.5, 0.75),
      drumHap('bd', 0.75, 1),
    ];
    const grid = buildDrumGrid(haps, 0);
    expect(grid.size).toBe(1);
    const row = grid.get('bd')!;
    expect(row.length).toBe(GRID_WIDTH);
    // Onsets at columns 0, 8, 16, 24 (32 cols / 4 beats)
    expect(row[0]).toBe(true);
    expect(row[8]).toBe(true);
    expect(row[16]).toBe(true);
    expect(row[24]).toBe(true);
    // Check an off-beat column is false
    expect(row[1]).toBe(false);
    expect(row[4]).toBe(false);
  });

  it('creates separate rows for different drums', () => {
    const haps = [
      drumHap('bd', 0, 0.5),
      drumHap('sd', 0.5, 1),
    ];
    const grid = buildDrumGrid(haps, 0);
    expect(grid.size).toBe(2);
    expect(grid.has('bd')).toBe(true);
    expect(grid.has('sd')).toBe(true);
    expect(grid.get('bd')![0]).toBe(true);
    expect(grid.get('sd')![16]).toBe(true);
  });

  it('handles haps without whole (continuous events)', () => {
    const hap: Hap = { value: { s: 'bd' } }; // no whole
    const grid = buildDrumGrid([hap], 0);
    // Row exists but all false since there's no onset time
    expect(grid.get('bd')!.every((v) => !v)).toBe(true);
  });

  it('ignores onsets outside the grid range', () => {
    // Onset in cycle 2 but cycleStart is 0
    const hap = drumHap('bd', 2.5, 2.75);
    const grid = buildDrumGrid([hap], 0);
    expect(grid.get('bd')!.every((v) => !v)).toBe(true);
  });

  it('handles non-zero cycleStart', () => {
    const hap = drumHap('bd', 3.5, 3.75);
    const grid = buildDrumGrid([hap], 3);
    // 0.5 * 32 = column 16
    expect(grid.get('bd')![16]).toBe(true);
  });

  it('returns empty map for empty haps array', () => {
    const grid = buildDrumGrid([], 0);
    expect(grid.size).toBe(0);
  });
});

// --- buildPianoroll ---

describe('buildPianoroll', () => {
  it('places notes spanning correct columns', () => {
    // Half-note from 0 to 0.5
    const haps = [noteHap('C4', 0, 0.5)];
    const grid = buildPianoroll(haps, 0);
    expect(grid.size).toBe(1);
    const row = grid.get('C4')!;
    // Columns 0-15 should be true (first half)
    for (let i = 0; i < 16; i++) {
      expect(row[i]).toBe(true);
    }
    // Columns 16-31 should be false (second half)
    for (let i = 16; i < GRID_WIDTH; i++) {
      expect(row[i]).toBe(false);
    }
  });

  it('creates separate rows for different pitches', () => {
    const haps = [
      noteHap('C4', 0, 0.25),
      noteHap('E4', 0.25, 0.5),
      noteHap('G4', 0.5, 0.75),
      noteHap('C5', 0.75, 1),
    ];
    const grid = buildPianoroll(haps, 0);
    expect(grid.size).toBe(4);
    expect(grid.has('C4')).toBe(true);
    expect(grid.has('E4')).toBe(true);
    expect(grid.has('G4')).toBe(true);
    expect(grid.has('C5')).toBe(true);
  });

  it('converts numeric note values via midiToName', () => {
    const haps = [noteHap(60, 0, 0.5)]; // MIDI 60 = C4
    const grid = buildPianoroll(haps, 0);
    expect(grid.has('C4')).toBe(true);
  });

  it('uses n property when note is absent', () => {
    const haps = [nHap(60, 0, 0.5)];
    const grid = buildPianoroll(haps, 0);
    expect(grid.has('C4')).toBe(true);
  });

  it('skips haps with no note value', () => {
    const haps: Hap[] = [{ whole: { begin: 0, end: 0.5 }, value: { s: 'bd' } }];
    const grid = buildPianoroll(haps, 0);
    expect(grid.size).toBe(0);
  });

  it('skips haps without whole', () => {
    const haps: Hap[] = [{ value: { note: 'C4' } }];
    const grid = buildPianoroll(haps, 0);
    // Row exists but all false
    expect(grid.get('C4')!.every((v) => !v)).toBe(true);
  });

  it('clamps columns to grid bounds', () => {
    // Note starts before cycleStart
    const haps = [noteHap('C4', -0.5, 0.25)];
    const grid = buildPianoroll(haps, 0);
    const row = grid.get('C4')!;
    // Should start at column 0 (clamped), extend to column 8
    expect(row[0]).toBe(true);
    // Should not have set any negative indices (they'd be out of bounds)
    expect(row.length).toBe(GRID_WIDTH);
  });

  it('handles non-zero cycleStart', () => {
    const haps = [noteHap('G4', 5.0, 5.5)];
    const grid = buildPianoroll(haps, 5);
    const row = grid.get('G4')!;
    // 0.0 to 0.5 in relative terms → columns 0-15
    for (let i = 0; i < 16; i++) {
      expect(row[i]).toBe(true);
    }
    for (let i = 16; i < GRID_WIDTH; i++) {
      expect(row[i]).toBe(false);
    }
  });

  it('returns empty map for empty haps', () => {
    const grid = buildPianoroll([], 0);
    expect(grid.size).toBe(0);
  });
});

// --- renderPlayheadRow ---

describe('renderPlayheadRow', () => {
  it('renders playhead marker at correct position', () => {
    const row = renderPlayheadRow('', 0);
    // 4-char padded label + 32-char grid
    expect(row.length).toBe(4 + GRID_WIDTH);
    expect(row[4]).toBe('▏'); // playhead at col 0
    expect(row[5]).toBe('─'); // rest is dashes
  });

  it('places playhead in the middle', () => {
    const row = renderPlayheadRow('', 16);
    expect(row[4 + 16]).toBe('▏');
    expect(row[4 + 15]).toBe('─');
    expect(row[4 + 17]).toBe('─');
  });

  it('pads label to 4 chars', () => {
    const row = renderPlayheadRow('bd', 0);
    expect(row.slice(0, 4)).toBe('bd  ');
  });

  it('handles last column', () => {
    const row = renderPlayheadRow('', GRID_WIDTH - 1);
    expect(row[4 + GRID_WIDTH - 1]).toBe('▏');
  });
});
