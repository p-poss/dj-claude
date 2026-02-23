// Custom TextInput that renders everything in #E8704E instead of chalk.grey.
// Based on ink-text-input but with hardcoded orange colors.

import React, { useState, useEffect } from 'react';
import { Text, useInput } from 'ink';
import chalk from 'chalk';

const ORANGE = chalk.hex('#E8704E');
const DIM_ORANGE = chalk.hex('#E8704E').dim;
const CURSOR = chalk.bgHex('#E8704E').hex('#FFFFFF');

interface Props {
  value: string;
  placeholder?: string;
  focus?: boolean;
  showCursor?: boolean;
  onChange: (value: string) => void;
  onSubmit?: (value: string) => void;
}

export function OrangeTextInput({
  value: originalValue,
  placeholder = '',
  focus = true,
  showCursor = true,
  onChange,
  onSubmit,
}: Props) {
  const [state, setState] = useState({
    cursorOffset: (originalValue || '').length,
    cursorWidth: 0,
  });

  const { cursorOffset, cursorWidth } = state;

  useEffect(() => {
    setState((prev) => {
      if (!focus || !showCursor) return prev;
      const newValue = originalValue || '';
      if (prev.cursorOffset > newValue.length - 1) {
        return { cursorOffset: newValue.length, cursorWidth: 0 };
      }
      return prev;
    });
  }, [originalValue, focus, showCursor]);

  const cursorActualWidth = 0;
  const value = originalValue;
  let renderedValue = value;
  let renderedPlaceholder = placeholder ? DIM_ORANGE(placeholder) : undefined;

  if (showCursor && focus) {
    renderedPlaceholder =
      placeholder.length > 0
        ? CURSOR(placeholder[0]) + DIM_ORANGE(placeholder.slice(1))
        : CURSOR(' ');

    renderedValue = value.length > 0 ? '' : CURSOR(' ');

    let i = 0;
    for (const char of value) {
      renderedValue +=
        i >= cursorOffset - cursorActualWidth && i <= cursorOffset
          ? CURSOR(char)
          : ORANGE(char);
      i++;
    }

    if (value.length > 0 && cursorOffset === value.length) {
      renderedValue += CURSOR(' ');
    }
  }

  useInput(
    (input, key) => {
      if (
        key.upArrow ||
        key.downArrow ||
        (key.ctrl && input === 'c') ||
        key.tab ||
        (key.shift && key.tab)
      ) {
        return;
      }

      if (key.return) {
        onSubmit?.(originalValue);
        return;
      }

      let nextCursorOffset = cursorOffset;
      let nextValue = originalValue;
      let nextCursorWidth = 0;

      if (key.leftArrow) {
        if (showCursor) nextCursorOffset--;
      } else if (key.rightArrow) {
        if (showCursor) nextCursorOffset++;
      } else if (key.backspace || key.delete) {
        if (cursorOffset > 0) {
          nextValue =
            originalValue.slice(0, cursorOffset - 1) +
            originalValue.slice(cursorOffset, originalValue.length);
          nextCursorOffset--;
        }
      } else {
        nextValue =
          originalValue.slice(0, cursorOffset) +
          input +
          originalValue.slice(cursorOffset, originalValue.length);
        nextCursorOffset += input.length;
        if (input.length > 1) nextCursorWidth = input.length;
      }

      if (nextCursorOffset < 0) nextCursorOffset = 0;
      if (nextCursorOffset > nextValue.length)
        nextCursorOffset = nextValue.length;

      setState({ cursorOffset: nextCursorOffset, cursorWidth: nextCursorWidth });

      if (nextValue !== originalValue) onChange(nextValue);
    },
    { isActive: focus },
  );

  return (
    <Text>
      {placeholder
        ? value.length > 0
          ? renderedValue
          : renderedPlaceholder
        : renderedValue}
    </Text>
  );
}
