import Anthropic from '@anthropic-ai/sdk';
import { SYSTEM_PROMPT } from '@/lib/prompts';
import { Message } from '@/lib/types';

export async function POST(request: Request) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return new Response('ANTHROPIC_API_KEY not configured', { status: 500 });
    }

    const anthropic = new Anthropic({ apiKey });

    const { prompt, currentCode, history } = await request.json() as {
      prompt: string;
      currentCode: string;
      history: Message[];
    };

    if (!prompt) {
      return new Response('Prompt is required', { status: 400 });
    }

    // Build messages array with context
    const messages: Anthropic.MessageParam[] = [];

    // Add recent history for continuity (last 6 exchanges = 12 messages)
    const recentHistory = history.slice(-12);
    for (const msg of recentHistory) {
      messages.push({
        role: msg.role,
        content: msg.content,
      });
    }

    // Add current prompt with context about what's playing
    if (currentCode) {
      messages.push({
        role: 'user',
        content: `[Currently playing]\n\`\`\`javascript\n${currentCode}\n\`\`\`\n\nUser request: ${prompt}`,
      });
    } else {
      messages.push({
        role: 'user',
        content: prompt,
      });
    }

    // Create streaming response
    const stream = await anthropic.messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens: 8192,
      system: SYSTEM_PROMPT,
      messages,
    });

    // Convert to ReadableStream for Next.js
    const encoder = new TextEncoder();

    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (event.type === 'content_block_delta' &&
                event.delta.type === 'text_delta') {
              controller.enqueue(encoder.encode(event.delta.text));
            }
          }
          controller.close();
        } catch (error) {
          console.error('Stream error:', error);
          controller.error(error);
        }
      },
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('API route error:', error);
    return new Response(
      `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      { status: 500 }
    );
  }
}
