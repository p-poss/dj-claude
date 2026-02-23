import React from 'react';
import { Box, Text } from 'ink';

interface StatusBarProps {
  error?: string | null;
}

export function StatusBar({ error }: StatusBarProps) {
  return (
    <Box flexDirection="column">
      {error && (
        <Box marginBottom={1}>
          <Text color="#E8704E">✕ {error}</Text>
        </Box>
      )}
      <Box>
        <Text color="#E8704E" dimColor>
          [Enter] submit  [q] quit  [Esc] pause  [r] revert
        </Text>
      </Box>
    </Box>
  );
}
