// MCP server — exposes DJ Claude as 5 tools over stdio transport.

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

import { initEngine, safeEvaluate, hush as engineHush, switchBackend, getBackendMode } from '../audio/engine.js';
import type { BackendMode } from '../audio/backend.js';
import { findApiKey } from '../lib/config.js';
import { streamChat } from '../lib/claude.js';
import { parseStreamingCode } from '../lib/parseCode.js';
import {
  getState,
  setEngineReady,
  updateAfterPlay,
  updateAfterHush,
  addMessage,
  setAudioMode,
} from './state.js';

// ---------------------------------------------------------------------------
// Engine initialization — kicked off eagerly (node) or lazily (browser).
// ---------------------------------------------------------------------------

let enginePromise: Promise<void> | null = null;
let browserMode = false;

function startEngine(): void {
  enginePromise = initEngine()
    .then(() => {
      setEngineReady();
      console.error('[dj-claude-mcp] Audio engine ready.');
    })
    .catch((err) => {
      console.error('[dj-claude-mcp] Engine init failed:', err);
    });
}

async function ensureEngine(): Promise<void> {
  if (!enginePromise) startEngine();
  await enginePromise;
  if (!getState().engineReady) {
    throw new Error('Audio engine failed to initialize.');
  }
}

// ---------------------------------------------------------------------------
// Core helper — stream Claude, parse response, evaluate code.
// ---------------------------------------------------------------------------

async function generateAndPlay(prompt: string): Promise<{ commentary: string; code: string }> {
  const apiKey = findApiKey();
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY not set. Use play_strudel to play Strudel code directly, or set your API key for AI-generated music.');
  }
  const { currentCode, messages } = getState();

  addMessage({ role: 'user', content: prompt });

  let fullText = '';
  for await (const chunk of streamChat(apiKey, prompt, currentCode, messages)) {
    fullText += chunk;
  }

  const parsed = parseStreamingCode(fullText);
  const code = parsed.isComplete ? parsed.extractedCode : parsed.displayCode;

  if (!code) {
    throw new Error('Could not parse Strudel code from Claude response.');
  }

  addMessage({ role: 'assistant', content: fullText });

  await ensureEngine();
  const result = await safeEvaluate(code, currentCode);
  if (!result.success) {
    throw new Error(`Strudel evaluation error: ${result.error}`);
  }

  updateAfterPlay(code, parsed.mcCommentary);
  return { commentary: parsed.mcCommentary, code };
}

// ---------------------------------------------------------------------------
// Mood → prompt mapping for set_vibe.
// ---------------------------------------------------------------------------

const MOOD_PROMPTS: Record<string, string> = {
  chill: 'Play something chill and relaxing — lo-fi beats, soft pads, gentle rhythms. Keep it mellow.',
  dark: 'Play something dark and moody — minor keys, heavy bass, atmospheric textures. Brooding and intense.',
  hype: 'Play something hype and energetic — driving beats, punchy bass, high energy. Get the adrenaline going!',
  focus: 'Play deep focus music — minimal, repetitive, non-distracting. Ambient textures with a subtle pulse. Perfect for coding.',
  funky: 'Play something funky — groovy basslines, syncopated rhythms, playful melodies. Make it bounce!',
  dreamy: 'Play something dreamy and ethereal — lush reverb, floating pads, gentle arpeggios. Otherworldly and beautiful.',
  weird: 'Play something weird and experimental — unusual sounds, unpredictable rhythms, glitchy textures. Push boundaries!',
  epic: 'Play something epic and cinematic — big builds, soaring melodies, powerful drums. Make it feel legendary.',
};

// ---------------------------------------------------------------------------
// MCP server setup.
// ---------------------------------------------------------------------------

const server = new McpServer({
  name: 'dj-claude',
  version: '0.1.9',
});

// -- play_music -----------------------------------------------------------
server.tool(
  'play_music',
  'Generate and play live music. Describe what you want to hear — a genre, mood, activity, or anything creative. DJ Claude will compose a Strudel pattern and play it through the speakers.',
  { prompt: z.string().describe('What kind of music to play, e.g. "jazzy lo-fi beats" or "intense drum and bass"') },
  async ({ prompt }) => {
    await ensureEngine();
    const { commentary, code } = await generateAndPlay(prompt);
    return {
      content: [
        {
          type: 'text' as const,
          text: commentary
            ? `${commentary}\n\nNow playing:\n\`\`\`javascript\n${code}\n\`\`\``
            : `Now playing:\n\`\`\`javascript\n${code}\n\`\`\``,
        },
      ],
    };
  },
);

// -- play_strudel ---------------------------------------------------------
server.tool(
  'play_strudel',
  'Evaluate raw Strudel/Tidal code directly, bypassing Claude generation. Use this when you already have Strudel code to play.',
  { code: z.string().describe('Strudel/Tidal code to evaluate') },
  async ({ code }) => {
    await ensureEngine();
    const { currentCode } = getState();
    const result = await safeEvaluate(code, currentCode);
    if (!result.success) {
      return {
        content: [{ type: 'text' as const, text: `Evaluation error: ${result.error}` }],
        isError: true,
      };
    }
    updateAfterPlay(code, '');
    return {
      content: [{ type: 'text' as const, text: `Now playing:\n\`\`\`javascript\n${code}\n\`\`\`` }],
    };
  },
);

// -- set_vibe -------------------------------------------------------------
server.tool(
  'set_vibe',
  'Instantly set the musical vibe to match a mood. Great for matching music to the current coding task.',
  {
    mood: z.enum(['chill', 'dark', 'hype', 'focus', 'funky', 'dreamy', 'weird', 'epic'])
      .describe('The mood/vibe to set'),
  },
  async ({ mood }) => {
    await ensureEngine();
    const prompt = MOOD_PROMPTS[mood];
    const { commentary, code } = await generateAndPlay(prompt);
    return {
      content: [
        {
          type: 'text' as const,
          text: commentary
            ? `Vibe set to ${mood}! ${commentary}\n\n\`\`\`javascript\n${code}\n\`\`\``
            : `Vibe set to ${mood}!\n\n\`\`\`javascript\n${code}\n\`\`\``,
        },
      ],
    };
  },
);

// -- hush -----------------------------------------------------------------
server.tool(
  'hush',
  'Stop all music playback immediately.',
  {},
  async () => {
    await ensureEngine();
    engineHush();
    updateAfterHush();
    return {
      content: [{ type: 'text' as const, text: 'Music stopped.' }],
    };
  },
);

// -- switch_audio ---------------------------------------------------------
server.tool(
  'switch_audio',
  'Switch the audio backend at runtime between Node (terminal) and Browser (higher quality, opens a browser tab).',
  {
    mode: z.enum(['node', 'browser']).describe('The audio backend to switch to: "node" for terminal audio, "browser" for browser tab audio'),
  },
  async ({ mode }) => {
    const current = getBackendMode();
    if (mode === current) {
      return {
        content: [{ type: 'text' as const, text: `Already using ${mode} audio backend.` }],
      };
    }

    const { currentCode, isPlaying } = getState();

    // switchBackend() disposes the old backend (which hushes internally)
    await switchBackend(mode as BackendMode);
    enginePromise = Promise.resolve();
    setEngineReady();
    setAudioMode(mode as BackendMode);

    // Replay on the new backend if music was playing
    if (isPlaying && currentCode) {
      const result = await safeEvaluate(currentCode, '');
      if (!result.success) {
        updateAfterHush();
      }
    }

    return {
      content: [{ type: 'text' as const, text: `Switched to ${mode} audio backend.${isPlaying && currentCode ? ' Music resumed.' : ''}` }],
    };
  },
);

// -- now_playing ----------------------------------------------------------
server.tool(
  'now_playing',
  'Check what music is currently playing, including the Strudel code and DJ commentary.',
  {},
  async () => {
    const { isPlaying, currentCode, mcCommentary, audioMode } = getState();
    if (!isPlaying || !currentCode) {
      return {
        content: [{ type: 'text' as const, text: `Nothing is currently playing. Audio backend: ${audioMode}` }],
      };
    }
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({ isPlaying, currentCode, mcCommentary, audioMode }, null, 2),
        },
      ],
    };
  },
);

// ---------------------------------------------------------------------------
// Start.
// ---------------------------------------------------------------------------

export async function startServer(isBrowserMode = false): Promise<void> {
  browserMode = isBrowserMode;
  setAudioMode(browserMode ? 'browser' : 'node');

  // In node mode, kick off engine init eagerly.
  // In browser mode, defer until first tool call (opening a browser on
  // MCP startup before any music is requested would be surprising).
  if (!browserMode) {
    startEngine();
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[dj-claude-mcp] Server running on stdio.');
}
