import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import { getVisualizationData, getPattern } from '../audio/engine.js';
import {
  GRID_WIDTH,
  DRUM_NAMES,
  queryHaps,
  isDrum,
  getNoteValue,
  noteToSortKey,
  buildDrumGrid,
  buildPianoroll,
  renderPlayheadRow,
} from '../lib/pattern-viz.js';

interface PatternDisplayProps {
  isPlaying: boolean;
}

export function PatternDisplay({ isPlaying }: PatternDisplayProps) {
  const [drumGrid, setDrumGrid] = useState<Map<string, boolean[]>>(new Map());
  const [pianoGrid, setPianoGrid] = useState<Map<string, boolean[]>>(new Map());
  const [playheadCol, setPlayheadCol] = useState(0);

  useEffect(() => {
    if (!isPlaying) {
      setDrumGrid(new Map());
      setPianoGrid(new Map());
      setPlayheadCol(0);
      return;
    }

    const interval = setInterval(() => {
      const vizData = getVisualizationData();
      const pattern = getPattern();
      if (!vizData || !vizData.isStarted || !pattern) {
        setDrumGrid(new Map());
        setPianoGrid(new Map());
        return;
      }

      const cyclePos = vizData.currentTime;
      const cycleStart = Math.floor(cyclePos);
      const cycleEnd = cycleStart + 1;

      const haps = queryHaps(pattern, cycleStart, cycleEnd);
      const drums = haps.filter(isDrum);
      const melodic = haps.filter((h) => !isDrum(h) && getNoteValue(h) !== null);

      setDrumGrid(buildDrumGrid(drums, cycleStart));
      setPianoGrid(buildPianoroll(melodic, cycleStart));

      const frac = cyclePos - cycleStart;
      setPlayheadCol(Math.min(GRID_WIDTH - 1, Math.floor(frac * GRID_WIDTH)));
    }, 150);

    return () => clearInterval(interval);
  }, [isPlaying]);

  const hasDrums = drumGrid.size > 0;
  const hasMelody = pianoGrid.size > 0;

  if (!hasDrums && !hasMelody) return null;

  // Sort piano notes high to low
  const sortedNotes = [...pianoGrid.keys()].sort((a, b) => noteToSortKey(b) - noteToSortKey(a));
  // Limit to 8 rows
  const visibleNotes = sortedNotes.slice(0, 8);

  // Sort drums by canonical order
  const sortedDrums = [...drumGrid.keys()].sort(
    (a, b) => DRUM_NAMES.indexOf(a) - DRUM_NAMES.indexOf(b),
  );

  return (
    <Box flexDirection="column" alignItems="center">
      {hasDrums && (
        <Box flexDirection="column">
          {sortedDrums.map((name) => {
            const row = drumGrid.get(name)!;
            const pad = name.padEnd(4);
            const cells = row
              .map((on, i) => {
                if (i === playheadCol) return on ? '◆' : '▏';
                return on ? '●' : '·';
              })
              .join('');
            return (
              <Text key={name} color="#E8704E">
                {pad}{cells}
              </Text>
            );
          })}
          <Text color="#E8704E" dimColor>
            {renderPlayheadRow('', playheadCol)}
          </Text>
        </Box>
      )}
      {hasMelody && (
        <Box flexDirection="column" marginTop={hasDrums ? 1 : 0}>
          {visibleNotes.map((note) => {
            const row = pianoGrid.get(note)!;
            const pad = note.padEnd(4);
            const cells = row
              .map((on, i) => {
                if (i === playheadCol) return on ? '▊' : '▏';
                return on ? '█' : '░';
              })
              .join('');
            return (
              <Text key={note} color="#E8704E">
                {pad}{cells}
              </Text>
            );
          })}
          <Text color="#E8704E" dimColor>
            {renderPlayheadRow('', playheadCol)}
          </Text>
        </Box>
      )}
    </Box>
  );
}
