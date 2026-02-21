import React from 'react';
import { Box, Text } from 'ink';

const BANNER = [
  ' ██████╗      ██╗     ██████╗██╗      █████╗ ██╗   ██╗██████╗ ███████╗',
  ' ██╔══██╗     ██║    ██╔════╝██║     ██╔══██╗██║   ██║██╔══██╗██╔════╝',
  ' ██║  ██║     ██║    ██║     ██║     ███████║██║   ██║██║  ██║█████╗',
  ' ██║  ██║██   ██║    ██║     ██║     ██╔══██║██║   ██║██║  ██║██╔══╝',
  ' ██████╔╝╚█████╔╝    ╚██████╗███████╗██║  ██║╚██████╔╝██████╔╝███████╗',
  ' ╚═════╝  ╚════╝      ╚═════╝╚══════╝╚═╝  ╚═╝ ╚═════╝ ╚═════╝ ╚══════╝',
].join('\n');

interface HeaderProps {
  isPlaying: boolean;
  isStreaming: boolean;
  audioInitialized: boolean;
}

export function Header({ isPlaying, isStreaming, audioInitialized }: HeaderProps) {
  let status = 'READY';
  let statusColor: string = 'gray';

  if (!audioInitialized) {
    status = 'LOADING...';
    statusColor = 'yellow';
  } else if (isStreaming) {
    status = 'MIXING...';
    statusColor = 'magenta';
  } else if (isPlaying) {
    status = 'PLAYING';
    statusColor = 'green';
  }

  return (
    <Box flexDirection="column" alignItems="center">
      <Text color="cyan">{BANNER}</Text>
      <Text>
        {'  '}Status: <Text color={statusColor} bold>{status}</Text>
      </Text>
    </Box>
  );
}
