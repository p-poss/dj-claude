'use client';

import { useMemo } from 'react';

interface CodeParserResult {
  isComplete: boolean;
  extractedCode: string;
  displayCode: string;  // Code without markdown backticks for display
}

export function useCodeParser(streamingText: string): CodeParserResult {
  return useMemo(() => {
    if (!streamingText) {
      return {
        isComplete: false,
        extractedCode: '',
        displayCode: '',
      };
    }

    // Count backtick groups (```)
    const backtickMatches = streamingText.match(/```/g) || [];
    const backtickCount = backtickMatches.length;

    // Has at least opening and closing ```
    const isComplete = backtickCount >= 2;

    // Extract code if complete
    let extractedCode = '';
    if (isComplete) {
      const codeBlockRegex = /```(?:javascript|js)?\s*\n?([\s\S]*?)```/;
      const match = streamingText.match(codeBlockRegex);
      if (match) {
        extractedCode = match[1].trim();
      }
    }

    // Display code: show content inside code block (without backticks and language tag)
    let displayCode = streamingText;

    // Check if we have an opening code fence
    const openingMatch = streamingText.match(/```(?:javascript|js)?\s*\n?/);
    if (openingMatch) {
      // Get content after the opening fence
      const afterOpening = streamingText.slice(openingMatch.index! + openingMatch[0].length);
      // Remove closing fence if present
      displayCode = afterOpening.replace(/```\s*$/, '');
    }

    return {
      isComplete,
      extractedCode,
      displayCode: displayCode.trim(),
    };
  }, [streamingText]);
}
