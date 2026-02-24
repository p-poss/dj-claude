import React from 'react';
import { Box, Text } from 'ink';

const WELCOME_TOP = '╔════════════════════════════════════════════╗';
const WELCOME_BTM = '╚════════════════════════════════════════════╝';

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
    statusLabel = 'Booting';
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
      <Text color="#E8704E">{WELCOME_TOP}</Text>
      <Text color="#E8704E">{'║        Welcome to DJ Claude '}<Text dimColor>v 0.1.11</Text>{'        ║'}</Text>
      <Text color="#E8704E">{WELCOME_BTM}</Text>
      <Text color="#E8704E">{BANNER}</Text>
      <Text color="#E8704E" dimColor={dim}>
        {`╔═════════════════════════╗\n║        ${statusSymbol} ${statusLabel.padEnd(14)} ║\n╚═════════════════════════╝`}
      </Text>
    </Box>
  );
}
