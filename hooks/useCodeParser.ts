'use client';

import { useMemo } from 'react';

interface CodeParserResult {
  isComplete: boolean;
  extractedCode: string;
  displayCode: string;  // Code without markdown backticks for display
  mcCommentary: string; // MC commentary for TTS
  nightMode?: boolean;
  discoMode?: boolean;
  raveMode?: boolean;
  liveMixMode?: boolean;
}

export function useCodeParser(streamingText: string): CodeParserResult {
  return useMemo(() => {
    if (!streamingText) {
      return {
        isComplete: false,
        extractedCode: '',
        displayCode: '',
        mcCommentary: '',
      };
    }

    // Find JSON object in the text (may have prefix text before it)
    const jsonStartIndex = streamingText.indexOf('{');
    if (jsonStartIndex !== -1) {
      const textFromBrace = streamingText.slice(jsonStartIndex);

      // Find the matching closing brace by counting braces
      let braceCount = 0;
      let jsonEndIndex = -1;
      let inString = false;
      let escapeNext = false;

      for (let i = 0; i < textFromBrace.length; i++) {
        const char = textFromBrace[i];

        if (escapeNext) {
          escapeNext = false;
          continue;
        }

        if (char === '\\' && inString) {
          escapeNext = true;
          continue;
        }

        if (char === '"' && !escapeNext) {
          inString = !inString;
          continue;
        }

        if (!inString) {
          if (char === '{') braceCount++;
          if (char === '}') {
            braceCount--;
            if (braceCount === 0) {
              jsonEndIndex = i + 1;
              break;
            }
          }
        }
      }

      // If we found a complete JSON object
      if (jsonEndIndex !== -1) {
        const jsonText = textFromBrace.slice(0, jsonEndIndex);
        try {
          const parsed = JSON.parse(jsonText);
          if (parsed.code && typeof parsed.code === 'string') {
            // Unescape the code (handle \\n -> newlines)
            const code = parsed.code.replace(/\\n/g, '\n');
            return {
              isComplete: true,
              extractedCode: code.trim(),
              displayCode: code.trim(),
              mcCommentary: parsed.mcCommentary || '',
              nightMode: typeof parsed.nightMode === 'boolean' ? parsed.nightMode : undefined,
              discoMode: typeof parsed.discoMode === 'boolean' ? parsed.discoMode : undefined,
              raveMode: typeof parsed.raveMode === 'boolean' ? parsed.raveMode : undefined,
              liveMixMode: typeof parsed.liveMixMode === 'boolean' ? parsed.liveMixMode : undefined,
            };
          }
        } catch {
          // JSON parse failed, continue to try partial extraction
        }
      }

      // JSON started but not complete yet - try to extract partial code for display
      // Match the code field value, handling escaped characters
      const codeMatch = textFromBrace.match(/"code"\s*:\s*"((?:[^"\\]|\\.)*)"/);
      if (codeMatch) {
        const partialCode = codeMatch[1]
          .replace(/\\n/g, '\n')
          .replace(/\\"/g, '"')
          .replace(/\\\\/g, '\\');
        return {
          isComplete: false,
          extractedCode: '',
          displayCode: partialCode,
          mcCommentary: '',
        };
      }

      // Try to extract incomplete code (no closing quote yet)
      const incompleteCodeMatch = textFromBrace.match(/"code"\s*:\s*"((?:[^"\\]|\\.)*)/);
      if (incompleteCodeMatch) {
        const partialCode = incompleteCodeMatch[1]
          .replace(/\\n/g, '\n')
          .replace(/\\"/g, '"')
          .replace(/\\\\/g, '\\');
        return {
          isComplete: false,
          extractedCode: '',
          displayCode: partialCode,
          mcCommentary: '',
        };
      }

      // JSON started but can't extract code yet
      return {
        isComplete: false,
        extractedCode: '',
        displayCode: '',
        mcCommentary: '',
      };
    }

    // Legacy format: markdown code blocks (for backwards compatibility)
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
      mcCommentary: '', // No commentary in legacy format
    };
  }, [streamingText]);
}
