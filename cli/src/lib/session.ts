import type { DJAction } from './types.js';
import type { Message } from './types.js';
import { streamChat } from './claude.js';
import { parseStreamingCode } from './parseCode.js';
import { safeEvaluate } from '../audio/engine.js';

async function evalAndDispatch(
  code: string,
  previousCode: string,
  dispatch: (action: DJAction) => void,
): Promise<void> {
  const result = await safeEvaluate(code, previousCode);
  if (result.success) {
    dispatch({ type: 'CODE_EXECUTED', code });
  } else {
    dispatch({ type: 'EXECUTION_ERROR', error: result.error! });
  }
}

export async function handlePrompt(
  apiKey: string,
  prompt: string,
  currentCode: string,
  messages: Message[],
  dispatch: (action: DJAction) => void,
): Promise<void> {
  dispatch({ type: 'START_STREAMING' });

  try {
    let fullText = '';

    for await (const chunk of streamChat(apiKey, prompt, currentCode, messages)) {
      fullText += chunk;
      dispatch({ type: 'APPEND_STREAM', text: chunk });

      const parsed = parseStreamingCode(fullText);
      if (parsed.isComplete) {
        dispatch({ type: 'STREAM_COMPLETE', code: fullText });
        dispatch({ type: 'SET_MC_COMMENTARY', text: parsed.mcCommentary });
        await evalAndDispatch(parsed.extractedCode, currentCode, dispatch);
        return;
      }
    }

    // Stream ended without complete parse — try anyway
    const finalParse = parseStreamingCode(fullText);
    if (finalParse.displayCode) {
      dispatch({ type: 'STREAM_COMPLETE', code: fullText });
      await evalAndDispatch(finalParse.displayCode, currentCode, dispatch);
    } else {
      dispatch({ type: 'STREAM_ERROR', error: 'Could not parse response from Claude' });
    }
  } catch (err) {
    dispatch({
      type: 'STREAM_ERROR',
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
