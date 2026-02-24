// MCP server — exposes DJ Claude tools over stdio transport.
// Tool registration is extracted into registerTools() so both stdio and HTTP
// transports can share the same tool definitions.

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

import { initEngine, safeEvaluate, hush as engineHush, switchBackend, getBackendMode } from '../audio/engine.js';
import type { BackendMode } from '../audio/backend.js';
import { findApiKey } from '../lib/config.js';
import { streamChat } from '../lib/claude.js';
import { parseStreamingCode } from '../lib/parseCode.js';
import { buildLayerPrompt } from '../lib/prompts.js';
import {
  getState,
  setEngineReady,
  updateAfterPlay,
  updateAfterHush,
  addMessage,
  setAudioMode,
  setLayer,
  removeLayer,
  clearLayers,
  getLayers,
  composeLayers,
} from './state.js';
import { withEvalLock } from './eval-lock.js';

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
// Layer-specific helper — generate a single layer with role-specific prompt.
// ---------------------------------------------------------------------------

async function generateLayerCode(role: string, prompt: string): Promise<{ commentary: string; code: string }> {
  const apiKey = findApiKey();
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY not set. Use play_strudel to play Strudel code directly, or set your API key for AI-generated music.');
  }
  const { messages } = getState();
  const systemPrompt = buildLayerPrompt(role);

  // Build context about existing layers so Claude knows what's already playing
  const layers = getLayers();
  let layerContext = '';
  if (layers.size > 0) {
    const layerList = Array.from(layers.values())
      .map((l) => `[${l.role}]: ${l.code}`)
      .join('\n');
    layerContext = `\n\n[Currently playing layers]\n${layerList}\n\nGenerate the ${role} layer to complement these.`;
  }

  const fullPrompt = `${prompt}${layerContext}`;
  addMessage({ role: 'user', content: `[jam:${role}] ${prompt}` });

  let fullText = '';
  for await (const chunk of streamChat(apiKey, fullPrompt, '', messages, systemPrompt)) {
    fullText += chunk;
  }

  const parsed = parseStreamingCode(fullText);
  const code = parsed.isComplete ? parsed.extractedCode : parsed.displayCode;

  if (!code) {
    throw new Error(`Could not parse Strudel code for ${role} layer from Claude response.`);
  }

  addMessage({ role: 'assistant', content: fullText });
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
// Evolution prompts for live_mix.
// ---------------------------------------------------------------------------

const EVOLUTION_PROMPTS = [
  { type: 'key/scale change', prompt: 'Evolve the current track: shift to a different key or scale. Keep the groove but change the harmonic color.' },
  { type: 'add layers', prompt: 'Evolve the current track: add new layers — extra percussion, a counter-melody, or textural elements. Build up the density.' },
  { type: 'strip back', prompt: 'Evolve the current track: strip it back to a minimal breakdown. Remove layers, leave just a core element or two. Create space.' },
  { type: 'filter sweep', prompt: 'Evolve the current track: introduce a filter sweep or spectral shift. Gradually open or close filters for a dramatic effect.' },
  { type: 'tempo shift', prompt: 'Evolve the current track: subtly shift the tempo or rhythmic feel. Speed up, slow down, or change the swing.' },
  { type: 'genre drift', prompt: 'Evolve the current track: drift toward a different genre while keeping the current vibe as an anchor. Blend styles.' },
  { type: 'rhythmic shift', prompt: 'Evolve the current track: change the rhythmic pattern — new drum patterns, syncopation, polyrhythms, or a completely different groove.' },
  { type: 'texture swap', prompt: 'Evolve the current track: swap out timbres and textures. Replace synths with new sounds, change the sonic palette while keeping the structure.' },
];

function buildSetArc(stages: number): string[] {
  const arcTemplate = [
    'opening',
    'add layers',
    'tempo shift',
    'strip back',
    'genre drift',
    'key/scale change',
    'filter sweep',
    'rhythmic shift',
    'texture swap',
    'add layers',
  ];
  return arcTemplate.slice(1, stages);
}

// ---------------------------------------------------------------------------
// Tool registration — shared by both stdio and HTTP transports.
// ---------------------------------------------------------------------------

export function registerTools(server: McpServer): void {
  // -- play_music -----------------------------------------------------------
  server.tool(
    'play_music',
    'Generate and play live music. Describe what you want to hear — a genre, mood, activity, or anything creative. DJ Claude will compose a Strudel pattern and play it through the speakers.',
    { prompt: z.string().describe('What kind of music to play, e.g. "jazzy lo-fi beats" or "intense drum and bass"') },
    async ({ prompt }) => {
      clearLayers();
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
      clearLayers();
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
      clearLayers();
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

  // -- live_mix -------------------------------------------------------------
  server.tool(
    'live_mix',
    'Autonomous DJ set — generates and evolves music through multiple stages with ~20s between each. Runs as a long tool call. Call hush to stop early.',
    {
      prompt: z.string().describe('Starting direction for the mix, e.g. "deep house sunset set" or "ambient techno journey"'),
      stages: z.number().min(3).max(10).default(6).optional().describe('Number of stages in the set (default 6)'),
    },
    async ({ prompt, stages: stagesParam }) => {
      const stageCount = stagesParam ?? 6;
      await ensureEngine();

      const opening = await generateAndPlay(prompt);
      const log: { stage: number; evolution: string; commentary: string; code: string }[] = [
        { stage: 1, evolution: 'opening', commentary: opening.commentary, code: opening.code },
      ];

      const arc = buildSetArc(stageCount);

      for (let i = 0; i < arc.length; i++) {
        await new Promise((r) => setTimeout(r, 20_000));

        if (!getState().isPlaying) {
          log.push({ stage: i + 2, evolution: 'stopped', commentary: 'Mix stopped — hush was called.', code: '' });
          break;
        }

        const evolutionType = arc[i];
        const evo = EVOLUTION_PROMPTS.find((e) => e.type === evolutionType) ?? EVOLUTION_PROMPTS[i % EVOLUTION_PROMPTS.length];

        try {
          const result = await generateAndPlay(evo.prompt);
          log.push({ stage: i + 2, evolution: evo.type, commentary: result.commentary, code: result.code });
        } catch (err) {
          log.push({ stage: i + 2, evolution: evo.type, commentary: `Error: ${err instanceof Error ? err.message : String(err)}`, code: '' });
        }
      }

      const summary = log
        .map((entry) => {
          const header = `## Stage ${entry.stage}: ${entry.evolution}`;
          const body = entry.commentary || '(no commentary)';
          const code = entry.code ? `\n\`\`\`javascript\n${entry.code}\n\`\`\`` : '';
          return `${header}\n${body}${code}`;
        })
        .join('\n\n---\n\n');

      return {
        content: [
          {
            type: 'text' as const,
            text: `# DJ Claude Live Mix — ${stageCount} stages\n\n${summary}`,
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
      clearLayers();
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

      await switchBackend(mode as BackendMode);
      enginePromise = Promise.resolve();
      setEngineReady();
      setAudioMode(mode as BackendMode);

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

      const layers = getLayers();
      const layerInfo = layers.size > 0
        ? { layers: Object.fromEntries(Array.from(layers.entries()).map(([k, v]) => [k, v.code])) }
        : {};

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({ isPlaying, currentCode, mcCommentary, audioMode, ...layerInfo }, null, 2),
          },
        ],
      };
    },
  );

  // -- jam ------------------------------------------------------------------
  server.tool(
    'jam',
    'Add or update a single layer in a collaborative jam session. Each layer has a role (drums, bass, melody, etc.) and layers are composed together with stack(). Use this for building music incrementally or multi-agent collaboration.',
    {
      role: z.string().describe('The role/name for this layer, e.g. "drums", "bass", "melody", "chords", "pads", "fx"'),
      prompt: z.string().describe('What this layer should sound like, e.g. "funky breakbeat pattern" or "deep sub bass in C minor"'),
    },
    async ({ role, prompt }) => {
      return withEvalLock(async () => {
        await ensureEngine();

        const { commentary, code: layerCode } = await generateLayerCode(role, prompt);
        setLayer(role, layerCode);

        const composed = composeLayers();
        const { currentCode } = getState();
        const result = await safeEvaluate(composed, currentCode);

        if (!result.success) {
          // Rollback on eval failure
          removeLayer(role);
          return {
            content: [{ type: 'text' as const, text: `Failed to add ${role} layer: ${result.error}` }],
            isError: true,
          };
        }

        updateAfterPlay(composed, commentary);

        const layerCount = getLayers().size;
        return {
          content: [
            {
              type: 'text' as const,
              text: commentary
                ? `${commentary}\n\nLayer "${role}" added (${layerCount} total):\n\`\`\`javascript\n${layerCode}\n\`\`\``
                : `Layer "${role}" added (${layerCount} total):\n\`\`\`javascript\n${layerCode}\n\`\`\``,
            },
          ],
        };
      });
    },
  );

  // -- jam_clear ------------------------------------------------------------
  server.tool(
    'jam_clear',
    'Remove one or all layers from the jam session. If no role is specified, all layers are cleared.',
    {
      role: z.string().optional().describe('The role to remove (e.g. "drums"). Omit to clear all layers.'),
    },
    async ({ role }) => {
      await ensureEngine();

      if (role) {
        const existed = removeLayer(role);
        if (!existed) {
          return {
            content: [{ type: 'text' as const, text: `No layer with role "${role}" found.` }],
          };
        }
      } else {
        clearLayers();
      }

      const composed = composeLayers();
      if (composed) {
        const { currentCode } = getState();
        const result = await safeEvaluate(composed, currentCode);
        if (!result.success) {
          return {
            content: [{ type: 'text' as const, text: `Layer removed but recomposition failed: ${result.error}` }],
            isError: true,
          };
        }
        updateAfterPlay(composed, '');
        const remaining = getLayers().size;
        return {
          content: [{ type: 'text' as const, text: role ? `Layer "${role}" removed. ${remaining} layer(s) remaining.` : 'All layers cleared.' }],
        };
      } else {
        // No layers left — hush
        engineHush();
        updateAfterHush();
        return {
          content: [{ type: 'text' as const, text: role ? `Layer "${role}" removed. No layers remaining — music stopped.` : 'All layers cleared. Music stopped.' }],
        };
      }
    },
  );

  // -- jam_status -----------------------------------------------------------
  server.tool(
    'jam_status',
    'Show all active layers in the current jam session with their role names and code.',
    {},
    async () => {
      const layers = getLayers();
      if (layers.size === 0) {
        return {
          content: [{ type: 'text' as const, text: 'No active layers. Use the jam tool to add layers.' }],
        };
      }

      const entries = Array.from(layers.values()).map((l) => ({
        role: l.role,
        code: l.code,
        addedAt: new Date(l.addedAt).toISOString(),
      }));

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({ layers: entries, composed: composeLayers() }, null, 2),
          },
        ],
      };
    },
  );
}

// ---------------------------------------------------------------------------
// Start — stdio transport.
// ---------------------------------------------------------------------------

export async function startServer(isBrowserMode = false): Promise<void> {
  browserMode = isBrowserMode;
  setAudioMode(browserMode ? 'browser' : 'node');

  if (!browserMode) {
    startEngine();
  }

  const server = new McpServer({
    name: 'dj-claude',
    version: '0.1.13',
  });

  registerTools(server);

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[dj-claude-mcp] Server running on stdio.');
}
