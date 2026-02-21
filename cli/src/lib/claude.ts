import Anthropic from '@anthropic-ai/sdk';
import { SYSTEM_PROMPT } from './prompts.js';
import type { Message } from './types.js';

let anthropic: Anthropic | null = null;

function getClient(apiKey: string): Anthropic {
  if (!anthropic) {
    // dangerouslyAllowBrowser: the audio polyfill sets globalThis.window
    // (needed at runtime by Strudel's cyclist scheduler), which makes the
    // SDK think we're in a browser. We're actually in Node.
    anthropic = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
  }
  return anthropic;
}

export async function* streamChat(
  apiKey: string,
  prompt: string,
  currentCode: string,
  history: Message[],
): AsyncGenerator<string> {
  const client = getClient(apiKey);

  // Build messages with recent history for continuity (last 6 exchanges)
  const messages: Anthropic.MessageParam[] = [];

  const recentHistory = history.slice(-12);
  for (const msg of recentHistory) {
    messages.push({ role: msg.role, content: msg.content });
  }

  // Add current prompt with context about what's playing
  if (currentCode) {
    messages.push({
      role: 'user',
      content: `[Currently playing]\n\`\`\`javascript\n${currentCode}\n\`\`\`\n\nUser request: ${prompt}`,
    });
  } else {
    messages.push({ role: 'user', content: prompt });
  }

  const stream = await client.messages.stream({
    model: 'claude-sonnet-4-6',
    max_tokens: 8192,
    system: SYSTEM_PROMPT,
    messages,
  });

  for await (const event of stream) {
    if (
      event.type === 'content_block_delta' &&
      event.delta.type === 'text_delta'
    ) {
      yield event.delta.text;
    }
  }
}
