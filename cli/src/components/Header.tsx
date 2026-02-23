import React from 'react';
import { Box, Text } from 'ink';

const WELCOME_BOX = [
  '╔═════════════════════════════════════════════╗',
  '║       Welcome to DJ Claude  v 0.1.0        ║',
  '╚═════════════════════════════════════════════╝',
].join('\n');

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
  let statusSymbol = '○';
  let statusLabel = 'On Deck';
  let dim = false;

  if (!audioInitialized) {
    statusSymbol = '◌';
    statusLabel = 'Booting Up';
    dim = true;
  } else if (isStreaming) {
    statusSymbol = '◎';
    statusLabel = 'Mixing';
  } else if (isPlaying) {
    statusSymbol = '●';
    statusLabel = 'Playing';
  }

  return (
    <Box flexDirection="column" alignItems="center">
      <Text color="#E8704E">{WELCOME_BOX}</Text>
      <Text color="#E8704E">{BANNER}</Text>
      <Text color="#E8704E" dimColor={dim}>
        {statusSymbol} {statusLabel}
      </Text>
    </Box>
  );
}
