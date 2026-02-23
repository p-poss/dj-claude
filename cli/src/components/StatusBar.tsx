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
        <Text color="#E8704E">[Enter] <Text dimColor>submit</Text>  [Esc] <Text dimColor>pause/play</Text>  [r] <Text dimColor>revert</Text></Text>
      </Box>
    </Box>
  );
}
