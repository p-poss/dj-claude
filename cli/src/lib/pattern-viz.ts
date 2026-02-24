// Pure helper functions for pattern visualization grid rendering.

export interface Hap {
  whole?: { begin: number; end: number };
  value: Record<string, unknown>;
}

export const GRID_WIDTH = 32;
export const DRUM_NAMES = ['bd', 'sd', 'hh', 'oh', 'cp', 'lt', 'mt', 'ht', 'rim', 'cb'];

export function midiToName(midi: number): string {
  const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const octave = Math.floor(midi / 12) - 1;
  const name = names[midi % 12];
  return `${name}${octave}`;
}

export function noteToSortKey(name: string): number {
  const match = name.match(/^([A-G]#?)(-?\d+)$/);
  if (!match) return 0;
  const noteMap: Record<string, number> = {
    'C': 0, 'C#': 1, 'D': 2, 'D#': 3, 'E': 4, 'F': 5,
    'F#': 6, 'G': 7, 'G#': 8, 'A': 9, 'A#': 10, 'B': 11,
  };
  return parseInt(match[2]) * 12 + (noteMap[match[1]] ?? 0);
}

export function isDrum(hap: Hap): boolean {
  const s = hap.value?.s;
  return typeof s === 'string' && DRUM_NAMES.includes(s);
}

export function getNoteValue(hap: Hap): string | null {
  const note = hap.value?.note;
  if (typeof note === 'string') return note;
  if (typeof note === 'number') return midiToName(note);
  const n = hap.value?.n;
  if (typeof n === 'number') return midiToName(n);
  return null;
}

export function queryHaps(pattern: unknown, start: number, end: number): Hap[] {
  try {
    const p = pattern as { queryArc?: (s: number, e: number) => Hap[] };
    if (typeof p?.queryArc === 'function') {
      return p.queryArc(start, end);
    }
  } catch {
    // Pattern query failed — return empty
  }
  return [];
}

export function buildDrumGrid(haps: Hap[], cycleStart: number): Map<string, boolean[]> {
  const grid = new Map<string, boolean[]>();
  for (const hap of haps) {
    const s = hap.value?.s as string;
    if (!grid.has(s)) {
      grid.set(s, new Array(GRID_WIDTH).fill(false));
    }
    if (hap.whole) {
      const col = Math.floor((hap.whole.begin - cycleStart) * GRID_WIDTH);
      if (col >= 0 && col < GRID_WIDTH) {
        grid.get(s)![col] = true;
      }
    }
  }
  return grid;
}

export function buildPianoroll(haps: Hap[], cycleStart: number): Map<string, boolean[]> {
  const grid = new Map<string, boolean[]>();
  for (const hap of haps) {
    const note = getNoteValue(hap);
    if (!note) continue;
    if (!grid.has(note)) {
      grid.set(note, new Array(GRID_WIDTH).fill(false));
    }
    if (hap.whole) {
      const begin = hap.whole.begin - cycleStart;
      const end = hap.whole.end - cycleStart;
      const colStart = Math.max(0, Math.floor(begin * GRID_WIDTH));
      const colEnd = Math.min(GRID_WIDTH, Math.ceil(end * GRID_WIDTH));
      const row = grid.get(note)!;
      for (let c = colStart; c < colEnd; c++) {
        row[c] = true;
      }
    }
  }
  return grid;
}

export function renderPlayheadRow(label: string, playheadCol: number): string {
  const pad = label.padEnd(4);
  let row = '';
  for (let i = 0; i < GRID_WIDTH; i++) {
    row += i === playheadCol ? '▏' : '─';
  }
  return `${pad}${row}`;
}
