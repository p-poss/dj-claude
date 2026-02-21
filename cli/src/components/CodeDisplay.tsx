import React from 'react';
import { Box, Text } from 'ink';

interface CodeDisplayProps {
  code: string;
  label?: string;
}

export function CodeDisplay({ code, label = 'Now playing' }: CodeDisplayProps) {
  if (!code) return null;

  // Truncate to fit terminal — show first ~15 lines
  const lines = code.split('\n');
  const shown = lines.slice(0, 15);
  const truncated = lines.length > 15;

  return (
    <Box flexDirection="column" marginTop={1}>
      <Text color="magenta" bold dimColor>{'── '}{label}{' ──'}</Text>
      <Box flexDirection="column" paddingLeft={1}>
        {shown.map((line, i) => (
          <Text key={i} color="gray">{line}</Text>
        ))}
        {truncated && <Text color="gray" dimColor>  ... ({lines.length - 15} more lines)</Text>}
      </Box>
    </Box>
  );
}
