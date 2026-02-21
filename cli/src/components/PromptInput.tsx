import React from 'react';
import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';

interface PromptInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  isDisabled: boolean;
}

export function PromptInput({ value, onChange, onSubmit, isDisabled }: PromptInputProps) {
  return (
    <Box>
      <Text color={isDisabled ? 'gray' : 'green'} bold>{'> '}</Text>
      {isDisabled ? (
        <Text color="gray">Mixing...</Text>
      ) : (
        <TextInput
          value={value}
          onChange={onChange}
          onSubmit={onSubmit}
          placeholder="What do you want to hear?"
        />
      )}
    </Box>
  );
}
