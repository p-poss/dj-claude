import Anthropic from '@anthropic-ai/sdk';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { createHash } from 'node:crypto';
import { SYSTEM_PROMPT } from '@/lib/prompts';
import { Message } from '@/lib/types';

export const runtime = 'nodejs';
export const maxDuration = 60;

const MAX_TOKENS = 8000;
const HISTORY_WINDOW = 8;
const TURNSTILE_VERIFY_URL =
  'https://challenges.cloudflare.com/turnstile/v0/siteverify';

// Rate limiting: prefer Upstash Redis (survives Vercel cold starts and works
// across instances). Fall back to a per-instance in-memory map when not
// configured so dev/preview still work.

const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

const upstashRateLimits =
  upstashUrl && upstashToken
    ? (() => {
        const redis = new Redis({ url: upstashUrl, token: upstashToken });
        return {
          burst: new Ratelimit({
            redis,
            limiter: Ratelimit.slidingWindow(3, '10 m'),
            analytics: false,
            prefix: 'dj:stream:burst',
          }),
          daily: new Ratelimit({
            redis,
            limiter: Ratelimit.slidingWindow(15, '1 d'),
            analytics: false,
            prefix: 'dj:stream:daily',
          }),
        };
      })()
    : null;

const FALLBACK_LIMIT = 10;
const FALLBACK_WINDOW_MS = 60_000;
const fallbackRateMap = new Map<
  string,
  { count: number; resetAt: number }
>();

async function checkRateLimit(
  ip: string,
): Promise<{ ok: boolean; reason?: string }> {
  if (upstashRateLimits) {
    const burst = await upstashRateLimits.burst.limit(ip);
    if (!burst.success) return { ok: false, reason: 'burst' };
    const daily = await upstashRateLimits.daily.limit(ip);
    if (!daily.success) return { ok: false, reason: 'daily' };
    return { ok: true };
  }
  const now = Date.now();
  const entry = fallbackRateMap.get(ip);
  if (!entry || now > entry.resetAt) {
    fallbackRateMap.set(ip, {
      count: 1,
      resetAt: now + FALLBACK_WINDOW_MS,
    });
    return { ok: true };
  }
  entry.count++;
  if (fallbackRateMap.size > 500) {
    for (const [k, v] of fallbackRateMap) {
      if (now > v.resetAt) fallbackRateMap.delete(k);
    }
  }
  if (entry.count > FALLBACK_LIMIT) return { ok: false, reason: 'burst' };
  return { ok: true };
}

function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  const allowed = (process.env.ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return allowed.includes(origin);
}

async function verifyTurnstile(
  token: string | undefined,
  ip: string,
): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true;
  if (!token) return false;
  try {
    const form = new URLSearchParams();
    form.append('secret', secret);
    form.append('response', token);
    form.append('remoteip', ip);
    const res = await fetch(TURNSTILE_VERIFY_URL, {
      method: 'POST',
      body: form,
    });
    const data: unknown = await res.json();
    return !!(
      data &&
      typeof data === 'object' &&
      'success' in data &&
      (data as { success: boolean }).success
    );
  } catch (err) {
    console.error('[stream] turnstile verify failed', err);
    return false;
  }
}

function getClientIp(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'unknown'
  );
}

function hashPrompt(prompt: string): string {
  return createHash('sha256').update(prompt).digest('hex').slice(0, 12);
}

export async function POST(request: Request) {
  const startedAt = Date.now();
  const ip = getClientIp(request);
  const ua = request.headers.get('user-agent') ?? '';
  const origin = request.headers.get('origin');

  try {
    if (!isAllowedOrigin(origin)) {
      return new Response('Forbidden', { status: 403 });
    }

    const limitResult = await checkRateLimit(ip);
    if (!limitResult.ok) {
      console.warn(
        JSON.stringify({
          event: 'stream.rate_limited',
          reason: limitResult.reason,
          ip,
          ua,
          origin,
        }),
      );
      return new Response('Too many requests', { status: 429 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return new Response('ANTHROPIC_API_KEY not configured', {
        status: 500,
      });
    }

    const { prompt, currentCode, history, turnstileToken } =
      (await request.json()) as {
        prompt: string;
        currentCode: string;
        history: Message[];
        turnstileToken?: string;
      };

    if (!prompt) {
      return new Response('Prompt is required', { status: 400 });
    }

    if (!(await verifyTurnstile(turnstileToken, ip))) {
      console.warn(
        JSON.stringify({
          event: 'stream.turnstile_failed',
          ip,
          ua,
          origin,
          prompt_hash: hashPrompt(prompt),
        }),
      );
      return new Response('Verification required', { status: 403 });
    }

    const anthropic = new Anthropic({ apiKey });

    const messages: Anthropic.MessageParam[] = [];
    const recentHistory = history.slice(-HISTORY_WINDOW);
    for (const msg of recentHistory) {
      messages.push({ role: msg.role, content: msg.content });
    }

    if (currentCode) {
      messages.push({
        role: 'user',
        content: `[Currently playing]\n\`\`\`javascript\n${currentCode}\n\`\`\`\n\nUser request: ${prompt}`,
      });
    } else {
      messages.push({ role: 'user', content: prompt });
    }

    const stream = await anthropic.messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens: MAX_TOKENS,
      system: SYSTEM_PROMPT,
      messages,
    });

    const encoder = new TextEncoder();

    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (
              event.type === 'content_block_delta' &&
              event.delta.type === 'text_delta'
            ) {
              controller.enqueue(encoder.encode(event.delta.text));
            }
          }
          const finalMessage = await stream.finalMessage();
          console.log(
            JSON.stringify({
              event: 'stream.ok',
              ip,
              ua,
              origin,
              prompt_hash: hashPrompt(prompt),
              input_tokens: finalMessage.usage.input_tokens,
              output_tokens: finalMessage.usage.output_tokens,
              duration_ms: Date.now() - startedAt,
            }),
          );
          controller.close();
        } catch (error) {
          console.error(
            JSON.stringify({
              event: 'stream.error',
              ip,
              error:
                error instanceof Error ? error.message : String(error),
            }),
          );
          controller.error(error);
        }
      },
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    console.error('API route error:', error);
    return new Response(
      `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      { status: 500 },
    );
  }
}
