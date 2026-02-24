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
  setContext,
  getContext,
  clearContext,
  saveSnapshot,
  loadSnapshot,
  listSnapshots,
} from './state.js';
import type { LayerMetadata } from './state.js';
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

  // Inject coding context if available
  const ctx = getContext();
  const contextPrefix = ctx ? `[Coding context: ${ctx.activity}] ` : '';
  const fullPrompt = `${contextPrefix}${prompt}`;

  addMessage({ role: 'user', content: fullPrompt });

  let fullText = '';
  for await (const chunk of streamChat(apiKey, fullPrompt, currentCode, messages)) {
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
      .map((l) => {
        const meta = [l.key && `key: ${l.key}`, l.tempo && `${l.tempo}bpm`, l.notes].filter(Boolean).join(', ');
        return `[${l.role}]${meta ? ` (${meta})` : ''}: ${l.code}`;
      })
      .join('\n');
    layerContext = `\n\n[Currently playing layers]\n${layerList}\n\nGenerate the ${role} layer to complement these.`;
  }

  // Inject coding context if available
  const ctx = getContext();
  const contextSection = ctx ? `\n\n[Coding context: ${ctx.activity}]` : '';

  const fullPrompt = `${prompt}${layerContext}${contextSection}`;
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

// Pre-baked Strudel patterns for each mood — used when no API key is available.
const MOOD_FALLBACKS: Record<string, string> = {
  chill: `stack(
  note("c3 eb3 g3 bb3").s("sawtooth").lpf(800).gain(0.3).room(0.5).delay(0.25),
  s("bd ~ sd ~").gain(0.5),
  s("hh*8").gain(0.2).lpf(3000)
).cps(0.45)`,
  dark: `stack(
  note("c2 ~ eb2 ~").s("sawtooth").lpf(400).gain(0.5),
  note("c4 eb4 g4 c5").s("square").lpf(1200).gain(0.15).room(0.7).delay(0.3),
  s("bd bd ~ bd sd ~ bd ~").gain(0.6),
  s("hh*4").gain(0.15).lpf(2000)
).cps(0.5)`,
  hype: `stack(
  s("bd bd sd bd bd sd bd sd").gain(0.7),
  s("hh*16").gain(0.3).lpf(5000),
  note("c3 c3 eb3 c3 f3 c3 eb3 g3").s("sawtooth").lpf(2000).gain(0.4),
  s("~ cp ~ cp").gain(0.5)
).cps(0.7)`,
  focus: `stack(
  note("c4 eb4 g4 bb4 c5 bb4 g4 eb4").s("triangle").lpf(1500).gain(0.15).room(0.6).delay(0.4),
  note("c2 ~ ~ g2 ~ ~ c2 ~").s("sine").gain(0.2)
).cps(0.35)`,
  funky: `stack(
  s("bd ~ bd sd ~ bd sd ~").gain(0.6),
  s("~ hh hh ~ hh hh ~ hh").gain(0.3).lpf(4000),
  note("c3 ~ eb3 c3 ~ f3 eb3 ~").s("sawtooth").lpf(1800).gain(0.35),
  s("~ ~ cp ~ ~ ~ cp ~").gain(0.4)
).cps(0.55)`,
  dreamy: `stack(
  note("c4 e4 g4 b4 c5 b4 g4 e4").s("sine").room(0.8).gain(0.15).delay(0.5),
  note("c3 g3 e3 b3").s("triangle").lpf(800).gain(0.1).room(0.7),
  s("~ ~ hh ~").gain(0.1).lpf(2000).delay(0.6)
).cps(0.3)`,
  weird: `stack(
  note("c3 f#3 bb3 e4 ab2 d4 g#3 db4").s("square").lpf(2500).gain(0.25).room(0.4),
  s("bd ~ cp ~ bd bd ~ sd").gain(0.5),
  s("hh hh oh hh ~ hh oh ~").gain(0.2).lpf(3000).delay(0.3)
).cps(0.5)`,
  epic: `stack(
  s("bd ~ ~ bd sd ~ bd sd").gain(0.7),
  s("hh*8").gain(0.25).lpf(4000),
  note("c3 g3 c4 g3 eb3 bb3 eb4 bb3").s("sawtooth").lpf(2000).gain(0.4).room(0.5),
  note("c5 eb5 g5 c6").s("square").lpf(3000).gain(0.2).room(0.6).delay(0.25),
  s("~ ~ ~ cp").gain(0.5)
).cps(0.6)`,
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
// Band templates for conductor mode.
// ---------------------------------------------------------------------------

const BAND_TEMPLATES: Record<string, string[]> = {
  'jazz combo': ['drums', 'bass', 'chords', 'melody'],
  'rock band': ['drums', 'bass', 'chords', 'lead'],
  'electronic': ['drums', 'bass', 'pads', 'lead', 'fx'],
  'ambient': ['pads', 'atmosphere', 'fx', 'melody'],
  'full band': ['drums', 'bass', 'chords', 'melody', 'pads', 'fx'],
  'minimal': ['drums', 'bass', 'melody'],
  'orchestral': ['bass', 'chords', 'pads', 'melody', 'fx', 'atmosphere'],
};

function matchBandTemplate(directive: string): string[] {
  const lower = directive.toLowerCase();
  for (const [name, roles] of Object.entries(BAND_TEMPLATES)) {
    if (lower.includes(name)) return roles;
  }
  return BAND_TEMPLATES['full band'];
}

// ---------------------------------------------------------------------------
// Mix analysis helpers.
// ---------------------------------------------------------------------------

function analyzeLayer(role: string, code: string) {
  const analysis: {
    role: string;
    octaveRange: string | null;
    effects: string[];
    gainLevel: number | null;
    frequencyBand: string;
  } = {
    role,
    octaveRange: null,
    effects: [],
    gainLevel: null,
    frequencyBand: 'mid',
  };

  // Detect octave ranges from note names like c3, eb4, etc.
  const noteMatches = code.match(/[a-g][#b]?\d/gi);
  if (noteMatches) {
    const octaves = noteMatches.map((n) => parseInt(n.slice(-1), 10));
    const min = Math.min(...octaves);
    const max = Math.max(...octaves);
    analysis.octaveRange = min === max ? `${min}` : `${min}-${max}`;
    if (max <= 2) analysis.frequencyBand = 'low';
    else if (min >= 4) analysis.frequencyBand = 'high';
    else analysis.frequencyBand = 'mid';
  }

  // Detect samples (percussion is typically mid-range)
  if (/\bs\s*\(\s*["'](?:bd|sd|hh|oh|cp|lt|mt|ht|rim|cb|cr|cy)/.test(code)) {
    analysis.frequencyBand = 'percussion';
  }

  // Detect effects
  const effectPatterns: [string, RegExp][] = [
    ['lpf', /\.lpf\(/],
    ['hpf', /\.hpf\(/],
    ['reverb', /\.room\(/],
    ['delay', /\.delay\(/],
    ['pan', /\.pan\(/],
    ['vowel', /\.vowel\(/],
    ['phaser', /\.phaser\(/],
    ['vibrato', /\.vibrato\(/],
    ['tremolo', /\.tremolo\(/],
    ['fm', /\.fmh\(|\.fmi\(/],
  ];
  for (const [name, re] of effectPatterns) {
    if (re.test(code)) analysis.effects.push(name);
  }

  // Detect gain level
  const gainMatch = code.match(/\.gain\(\s*([\d.]+)\s*\)/);
  if (gainMatch) {
    analysis.gainLevel = parseFloat(gainMatch[1]);
  }

  return analysis;
}

function generateSuggestions(layerAnalyses: ReturnType<typeof analyzeLayer>[]): string[] {
  const suggestions: string[] = [];
  const bands = layerAnalyses.map((l) => l.frequencyBand);

  if (!bands.includes('low')) {
    suggestions.push('Missing bass range — consider adding a bass layer with notes in octave 1-2.');
  }
  if (!bands.includes('high') && layerAnalyses.length >= 3) {
    suggestions.push('No high-range layer — consider adding a melody or lead in octave 4-5.');
  }

  const gains = layerAnalyses.map((l) => l.gainLevel).filter((g): g is number => g !== null);
  if (gains.length > 0 && gains.every((g) => g > 0.7)) {
    suggestions.push('All gains are above 0.7 — consider lowering some layers for better dynamic range.');
  }
  if (gains.length > 0 && gains.every((g) => g < 0.2)) {
    suggestions.push('All gains are very low — the mix may be too quiet.');
  }

  const effectCounts = new Map<string, number>();
  for (const l of layerAnalyses) {
    for (const e of l.effects) {
      effectCounts.set(e, (effectCounts.get(e) ?? 0) + 1);
    }
  }
  if (!effectCounts.has('reverb') && layerAnalyses.length >= 3) {
    suggestions.push('No reverb on any layer — adding room/size to pads or leads can add depth.');
  }
  if (!effectCounts.has('lpf') && !effectCounts.has('hpf') && layerAnalyses.length >= 3) {
    suggestions.push('No frequency filtering — using lpf/hpf can help separate layers in the mix.');
  }

  return suggestions;
}

// ---------------------------------------------------------------------------
// Tool registration — shared by both stdio and HTTP transports.
// ---------------------------------------------------------------------------

export function registerTools(server: McpServer): void {
  // -- play_music -----------------------------------------------------------
  server.tool(
    'play_music',
    'Generate and play live music. Describe what you want to hear — a genre, mood, activity, or anything creative. DJ Claude will compose a Strudel pattern and play it through the speakers. Requires ANTHROPIC_API_KEY. If no API key is set, use play_strudel to write and play Strudel code directly, or use set_vibe for instant mood-based music without a key.',
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
    'Evaluate raw Strudel/Tidal code directly, bypassing Claude generation. Use this when you already have Strudel code to play. No API key needed — this is the best option when ANTHROPIC_API_KEY is not set. You can write Strudel patterns using functions like note(), s(), stack(), and mini-notation strings.',
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
    'Instantly set the musical vibe to match a mood. Great for matching music to the current coding task. Works without an API key using built-in patterns. If you want more creative/custom music and can write Strudel code yourself, prefer play_strudel instead.',
    {
      mood: z.enum(['chill', 'dark', 'hype', 'focus', 'funky', 'dreamy', 'weird', 'epic'])
        .describe('The mood/vibe to set'),
    },
    async ({ mood }) => {
      clearLayers();
      await ensureEngine();

      // Try AI generation first, fall back to pre-baked pattern
      const apiKey = findApiKey();
      if (apiKey) {
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
      }

      // No API key — use fallback pattern
      const code = MOOD_FALLBACKS[mood];
      const { currentCode } = getState();
      const result = await safeEvaluate(code, currentCode);
      if (!result.success) {
        return {
          content: [{ type: 'text' as const, text: `Vibe fallback failed: ${result.error}` }],
          isError: true,
        };
      }
      updateAfterPlay(code, '');
      return {
        content: [
          {
            type: 'text' as const,
            text: `Vibe set to ${mood}! (using built-in pattern — set ANTHROPIC_API_KEY for AI-generated music)\n\n\`\`\`javascript\n${code}\n\`\`\``,
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

      const ctx = getContext();
      const contextInfo = ctx ? { codingContext: ctx.activity } : {};

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({ isPlaying, currentCode, mcCommentary, audioMode, ...layerInfo, ...contextInfo }),
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
      added_by: z.string().optional().describe('Name of the session/agent adding this layer'),
      notes: z.string().optional().describe('Free text notes, e.g. "C minor, 120bpm"'),
      key: z.string().optional().describe('Musical key, e.g. "C minor", "F# major"'),
      tempo: z.number().optional().describe('BPM for this layer'),
    },
    async ({ role, prompt, added_by, notes, key, tempo }) => {
      return withEvalLock(async () => {
        await ensureEngine();

        const { commentary, code: layerCode } = await generateLayerCode(role, prompt);
        const metadata: LayerMetadata = {};
        if (added_by) metadata.addedBy = added_by;
        if (notes) metadata.notes = notes;
        if (key) metadata.key = key;
        if (tempo) metadata.tempo = tempo;
        setLayer(role, layerCode, metadata);

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

      const entries = Array.from(layers.values()).map((l) => {
        const entry: Record<string, unknown> = {
          role: l.role,
          code: l.code,
          addedAt: new Date(l.addedAt).toISOString(),
        };
        if (l.addedBy) entry.addedBy = l.addedBy;
        if (l.notes) entry.notes = l.notes;
        if (l.key) entry.key = l.key;
        if (l.tempo) entry.tempo = l.tempo;
        return entry;
      });

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({ layers: entries, composed: composeLayers() }),
          },
        ],
      };
    },
  );

  // =========================================================================
  // Feature Set 1 — Reactive DJ
  // =========================================================================

  // -- set_context ----------------------------------------------------------
  server.tool(
    'set_context',
    'Tell DJ Claude what you\'re working on so the music adapts to your coding activity. Context is injected into music generation prompts for more relevant vibes.',
    {
      activity: z.string().describe('What you\'re doing, e.g. "debugging test failures", "writing a new API endpoint", "reviewing PRs"'),
      auto_adapt: z.boolean().optional().describe('If true and music is playing, immediately generate a transition to match the new context (default false)'),
    },
    async ({ activity, auto_adapt }) => {
      const shouldAdapt = auto_adapt ?? false;
      setContext(activity, shouldAdapt);

      if (shouldAdapt && getState().isPlaying) {
        try {
          const { commentary, code } = await generateAndPlay(
            `The coding activity just changed to: ${activity}. Smoothly transition the current music to match this new context.`,
          );
          return {
            content: [
              {
                type: 'text' as const,
                text: `Context set to "${activity}" — music adapting!\n\n${commentary}\n\n\`\`\`javascript\n${code}\n\`\`\``,
              },
            ],
          };
        } catch {
          return {
            content: [{ type: 'text' as const, text: `Context set to "${activity}". Auto-adapt failed (no API key?). Music will reflect context on next generation.` }],
          };
        }
      }

      return {
        content: [{ type: 'text' as const, text: `Context set to "${activity}". Music will reflect this on next generation.` }],
      };
    },
  );

  // =========================================================================
  // Feature Set 2 — Jam Coordination
  // =========================================================================

  // -- jam_preview ----------------------------------------------------------
  server.tool(
    'jam_preview',
    'Preview what a jam layer would sound like without actually adding it. Generates code but does NOT evaluate, store, or play it. Use this to audition ideas before committing.',
    {
      role: z.string().describe('The role to preview, e.g. "drums", "bass", "melody"'),
      prompt: z.string().describe('What this layer should sound like'),
    },
    async ({ role, prompt }) => {
      const { commentary, code } = await generateLayerCode(role, prompt);
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({ role, code, commentary, preview: true }),
          },
        ],
      };
    },
  );

  // -- mix_analysis ---------------------------------------------------------
  server.tool(
    'mix_analysis',
    'Analyze the current jam mix — detects octave ranges, effects, gain levels, and frequency band occupancy across all layers. Returns suggestions for improving the mix. No API key needed.',
    {},
    async () => {
      const layers = getLayers();
      if (layers.size === 0) {
        return {
          content: [{ type: 'text' as const, text: 'No active layers to analyze. Use the jam tool to add layers first.' }],
        };
      }

      const layerAnalyses = Array.from(layers.values()).map((l) => analyzeLayer(l.role, l.code));
      const suggestions = generateSuggestions(layerAnalyses);

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({ layers: layerAnalyses, suggestions, totalLayers: layers.size }),
          },
        ],
      };
    },
  );

  // =========================================================================
  // Feature Set 3 — Conductor Mode
  // =========================================================================

  // -- conduct --------------------------------------------------------------
  server.tool(
    'conduct',
    'Orchestrate a full band — generates multiple layers at once from a single directive. Matches band templates (jazz combo, rock band, electronic, ambient, etc.) or specify custom roles. Clears existing layers first.',
    {
      directive: z.string().describe('What the band should play, e.g. "jazz combo in C minor, late night mood" or "electronic ambient with evolving textures"'),
      roles: z.array(z.string()).optional().describe('Custom roles to override template matching, e.g. ["drums", "bass", "keys", "sax"]'),
    },
    async ({ directive, roles: customRoles }) => {
      const roles = customRoles ?? matchBandTemplate(directive);

      clearLayers();
      await ensureEngine();

      const results: { role: string; success: boolean; commentary: string; code: string; error?: string }[] = [];

      for (const role of roles) {
        await withEvalLock(async () => {
          try {
            const { commentary, code: layerCode } = await generateLayerCode(role, `${directive} — generate the ${role} part.`);
            setLayer(role, layerCode);

            const composed = composeLayers();
            const { currentCode } = getState();
            const evalResult = await safeEvaluate(composed, currentCode);

            if (!evalResult.success) {
              removeLayer(role);
              results.push({ role, success: false, commentary: '', code: '', error: evalResult.error });
            } else {
              updateAfterPlay(composed, commentary);
              results.push({ role, success: true, commentary, code: layerCode });
            }
          } catch (err) {
            results.push({ role, success: false, commentary: '', code: '', error: err instanceof Error ? err.message : String(err) });
          }
        });
      }

      const succeeded = results.filter((r) => r.success);
      const failed = results.filter((r) => !r.success);

      let summary = `# Conductor — ${succeeded.length}/${roles.length} layers created\n\n`;
      summary += `**Directive:** ${directive}\n`;
      summary += `**Template:** ${roles.join(', ')}\n\n`;

      for (const r of succeeded) {
        summary += `## ${r.role}\n`;
        if (r.commentary) summary += `${r.commentary}\n`;
        summary += `\`\`\`javascript\n${r.code}\n\`\`\`\n\n`;
      }

      if (failed.length > 0) {
        summary += `### Skipped\n`;
        for (const r of failed) {
          summary += `- **${r.role}**: ${r.error}\n`;
        }
      }

      return {
        content: [{ type: 'text' as const, text: summary }],
      };
    },
  );

  // -- conduct_evolve -------------------------------------------------------
  server.tool(
    'conduct_evolve',
    'Evolve all active layers through multiple stages — each layer gets modified 20-40% per stage with pauses between. Requires active layers from a jam or conduct session.',
    {
      directive: z.string().describe('Evolution direction, e.g. "shift darker", "build energy", "deconstruct gradually"'),
      stages: z.number().min(1).max(6).optional().describe('Number of evolution stages (default 3, max 6)'),
    },
    async ({ directive, stages: stagesParam }) => {
      const stageCount = stagesParam ?? 3;
      const layers = getLayers();

      if (layers.size === 0) {
        return {
          content: [{ type: 'text' as const, text: 'No active layers to evolve. Use jam or conduct first.' }],
        };
      }

      const log: { stage: number; results: { role: string; success: boolean }[] }[] = [];

      for (let stage = 1; stage <= stageCount; stage++) {
        if (stage > 1) {
          await new Promise((r) => setTimeout(r, 15_000));
        }

        if (!getState().isPlaying) {
          break;
        }

        const stageResults: { role: string; success: boolean }[] = [];
        const currentLayers = Array.from(getLayers().values());

        for (const layer of currentLayers) {
          const previousCode = layer.code;

          await withEvalLock(async () => {
            try {
              const { code: newCode } = await generateLayerCode(
                layer.role,
                `Evolve the ${layer.role} part — ${directive}. Modify 20-40% of the pattern while keeping coherence with the other layers. Stage ${stage}/${stageCount}.`,
              );
              setLayer(layer.role, newCode);

              const composed = composeLayers();
              const { currentCode } = getState();
              const evalResult = await safeEvaluate(composed, currentCode);

              if (!evalResult.success) {
                // Rollback this layer
                setLayer(layer.role, previousCode);
                stageResults.push({ role: layer.role, success: false });
              } else {
                updateAfterPlay(composed, '');
                stageResults.push({ role: layer.role, success: true });
              }
            } catch {
              // Rollback on error
              setLayer(layer.role, previousCode);
              stageResults.push({ role: layer.role, success: false });
            }
          });
        }

        log.push({ stage, results: stageResults });
      }

      let summary = `# Evolution — "${directive}" across ${log.length} stage(s)\n\n`;
      for (const entry of log) {
        const ok = entry.results.filter((r) => r.success).length;
        const total = entry.results.length;
        summary += `**Stage ${entry.stage}:** ${ok}/${total} layers evolved\n`;
      }

      return {
        content: [{ type: 'text' as const, text: summary }],
      };
    },
  );

  // =========================================================================
  // Feature Set 4 — Mix as Artifact
  // =========================================================================

  // -- snapshot_save --------------------------------------------------------
  server.tool(
    'snapshot_save',
    'Save the current mix (all layers + composed code) as a named snapshot. No API key needed.',
    {
      name: z.string().describe('Name for this snapshot, e.g. "verse1", "drop", "chill-mix"'),
    },
    async ({ name }) => {
      const layers = getLayers();
      if (layers.size === 0 && !getState().currentCode) {
        return {
          content: [{ type: 'text' as const, text: 'Nothing to save — no layers or code playing.' }],
        };
      }

      const snapshot = saveSnapshot(name);
      const layerNames = Array.from(snapshot.layers.keys());
      return {
        content: [
          {
            type: 'text' as const,
            text: `Snapshot "${name}" saved with ${layerNames.length} layer(s)${layerNames.length > 0 ? `: ${layerNames.join(', ')}` : ''}.`,
          },
        ],
      };
    },
  );

  // -- snapshot_load --------------------------------------------------------
  server.tool(
    'snapshot_load',
    'Restore a previously saved mix snapshot — loads all layers and resumes playback. No API key needed.',
    {
      name: z.string().describe('Name of the snapshot to load'),
    },
    async ({ name }) => {
      const snapshot = loadSnapshot(name);
      if (!snapshot) {
        const available = listSnapshots().map((s) => s.name);
        return {
          content: [
            {
              type: 'text' as const,
              text: available.length > 0
                ? `Snapshot "${name}" not found. Available: ${available.join(', ')}`
                : `Snapshot "${name}" not found. No snapshots saved yet.`,
            },
          ],
        };
      }

      // Evaluate the snapshot's code to resume playback
      const codeToPlay = snapshot.composedCode || snapshot.currentCode;
      if (codeToPlay) {
        await ensureEngine();
        const result = await safeEvaluate(codeToPlay, getState().currentCode);
        if (!result.success) {
          return {
            content: [{ type: 'text' as const, text: `Snapshot "${name}" loaded but evaluation failed: ${result.error}` }],
            isError: true,
          };
        }
        updateAfterPlay(codeToPlay, '');
      }

      const layerNames = Array.from(snapshot.layers.keys());
      return {
        content: [
          {
            type: 'text' as const,
            text: `Snapshot "${name}" loaded with ${layerNames.length} layer(s)${layerNames.length > 0 ? `: ${layerNames.join(', ')}` : ''}. Music resumed.`,
          },
        ],
      };
    },
  );

  // -- snapshot_list --------------------------------------------------------
  server.tool(
    'snapshot_list',
    'List all saved mix snapshots. No API key needed.',
    {},
    async () => {
      const snapshots = listSnapshots();
      if (snapshots.length === 0) {
        return {
          content: [{ type: 'text' as const, text: 'No snapshots saved yet. Use snapshot_save to save the current mix.' }],
        };
      }

      const list = snapshots.map((s) => ({
        name: s.name,
        layers: Array.from(s.layers.keys()),
        savedAt: new Date(s.savedAt).toISOString(),
      }));

      return {
        content: [{ type: 'text' as const, text: JSON.stringify(list) }],
      };
    },
  );

  // -- export_code ----------------------------------------------------------
  server.tool(
    'export_code',
    'Export the current Strudel code with header comments showing date and layer names. No API key needed.',
    {},
    async () => {
      const { currentCode, isPlaying } = getState();
      if (!currentCode) {
        return {
          content: [{ type: 'text' as const, text: 'Nothing to export — no code playing.' }],
        };
      }

      const layers = getLayers();
      const layerNames = Array.from(layers.keys());
      const date = new Date().toISOString();

      let exported = `// DJ Claude Export — ${date}\n`;
      if (layerNames.length > 0) {
        exported += `// Layers: ${layerNames.join(', ')}\n`;
      }
      exported += `// Status: ${isPlaying ? 'playing' : 'stopped'}\n\n`;
      exported += currentCode;

      return {
        content: [{ type: 'text' as const, text: exported }],
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
    version: '0.1.15',
  });

  registerTools(server);

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[dj-claude-mcp] Server running on stdio.');
}
