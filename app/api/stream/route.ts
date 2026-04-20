import Anthropic from '@anthropic-ai/sdk';
import { SYSTEM_PROMPT } from '@/lib/prompts';
import { Message } from '@/lib/types';

export const runtime = 'nodejs';
export const maxDuration = 60;

const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 60_000;
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  entry.count++;
  if (rateLimitMap.size > 500) {
    for (const [k, v] of rateLimitMap) {
      if (now > v.resetAt) rateLimitMap.delete(k);
    }
  }
  return entry.count > RATE_LIMIT;
}

function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  const allowed = (process.env.ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return allowed.includes(origin);
}

export async function POST(request: Request) {
  try {
    if (!isAllowedOrigin(request.headers.get('origin'))) {
      return new Response('Forbidden', { status: 403 });
    }

    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      request.headers.get('x-real-ip') ??
      'unknown';
    if (isRateLimited(ip)) {
      return new Response('Too many requests', { status: 429 });
    }

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
      max_tokens: 16384,
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
