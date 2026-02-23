import React, { useState, useEffect } from 'react';
import { Box, Text, useStdout } from 'ink';
import { OrangeTextInput } from './OrangeTextInput.js';

interface PromptInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  isDisabled: boolean;
}

export function PromptInput({ value, onChange, onSubmit, isDisabled }: PromptInputProps) {
  const { stdout } = useStdout();
  const [cols, setCols] = useState(stdout.columns || 50);

  useEffect(() => {
    const onResize = () => setCols(stdout.columns || 50);
    stdout.on('resize', onResize);
    return () => { stdout.off('resize', onResize); };
  }, [stdout]);

  return (
    <Box flexDirection="column">
      <Text color="#E8704E">{'─'.repeat(Math.max(cols - 2, 10))}</Text>
      <Box>
        <Text color="#E8704E" bold dimColor={isDisabled}>{'> '}</Text>
        {isDisabled ? (
          <Text color="#E8704E" dimColor>Mixing...</Text>
        ) : (
          <OrangeTextInput
            value={value}
            onChange={onChange}
            onSubmit={onSubmit}
            placeholder="What do you want to hear?"
          />
        )}
      </Box>
      <Text color="#E8704E">{'─'.repeat(Math.max(cols - 2, 10))}</Text>
    </Box>
  );
}
