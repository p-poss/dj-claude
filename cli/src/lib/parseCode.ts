export interface ParseResult {
  isComplete: boolean;
  extractedCode: string;
  displayCode: string;
  mcCommentary: string;
}

const EMPTY: ParseResult = {
  isComplete: false,
  extractedCode: '',
  displayCode: '',
  mcCommentary: '',
};

export function parseStreamingCode(streamingText: string): ParseResult {
  if (!streamingText) return EMPTY;

  const jsonStartIndex = streamingText.indexOf('{');
  if (jsonStartIndex === -1) return EMPTY;

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

  // Complete JSON object found
  if (jsonEndIndex !== -1) {
    const jsonText = textFromBrace.slice(0, jsonEndIndex);
    try {
      const parsed = JSON.parse(jsonText);
      if (parsed.code && typeof parsed.code === 'string') {
        const code = parsed.code.replace(/\\n/g, '\n');
        return {
          isComplete: true,
          extractedCode: code.trim(),
          displayCode: code.trim(),
          mcCommentary: parsed.mcCommentary || '',
        };
      }
    } catch {
      // JSON parse failed, try partial extraction below
    }
  }

  // Partial: extract code field if present
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

  // Incomplete code field (no closing quote yet)
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

  return EMPTY;
}
