// MCP server — exposes DJ Claude tools over stdio transport.
// Tool registration is extracted into registerTools() so both stdio and HTTP
// transports can share the same tool definitions.

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

import { initEngine, safeEvaluate, hush as engineHush, switchBackend, getBackendMode, getPattern } from '../audio/engine.js';
import type { BackendMode } from '../audio/backend.js';
import { renderPatternSnapshot } from '../lib/pattern-viz.js';
import { findApiKey } from '../lib/config.js';
import { streamChat } from '../lib/claude.js';
import { parseStreamingCode } from '../lib/parseCode.js';
import { buildLayerPrompt, STRUDEL_REFERENCE, ROLE_GUIDANCE } from '../lib/prompts.js';
import { PRESETS, PRESET_MAP, PRESET_NAMES, getPresetsByCategory } from '../lib/presets.js';
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
// Jam continuation nudge — appended to jam/jam_status responses so any MCP
// client (not just Claude Code) is encouraged to keep the session going.
// ---------------------------------------------------------------------------

const JAM_NUDGE = '\n\n---\nKeep jamming — check jam_status to hear what changed, evolve your layers, add new ones. Don\'t stop.';

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

function getPatternViz(): string {
  const pattern = getPattern();
  if (!pattern) return '';
  const snapshot = renderPatternSnapshot(pattern);
  return snapshot ? `\n\n\`\`\`\n${snapshot}\n\`\`\`` : '';
}

// ---------------------------------------------------------------------------
// Core helper — stream Claude, parse response, evaluate code.
// ---------------------------------------------------------------------------

async function generateAndPlay(prompt: string): Promise<{ commentary: string; code: string }> {
  const apiKey = findApiKey();
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY not set. Pass Strudel code via the `code` parameter instead (no API key needed). Read the `strudel://reference` MCP resource to learn the syntax, or use `set_vibe`/`play_preset` for instant music.');
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
    throw new Error('ANTHROPIC_API_KEY not set. Pass Strudel code via the `code` parameter instead (no API key needed). Read the `strudel://reference` MCP resource to learn the syntax.');
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

// MOOD_FALLBACKS removed — mood patterns now live in presets.ts and are
// accessed via PRESET_MAP.

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
    'Generate and play live music. Works without an API key when you provide `code` with Strudel code directly. With ANTHROPIC_API_KEY, use `prompt` for AI-generated music. For instant music without writing code, try `set_vibe` or `play_preset` instead. Read the `strudel://reference` MCP resource to learn Strudel syntax.',
    {
      prompt: z.string().optional().describe('What kind of music to play, e.g. "jazzy lo-fi beats" or "intense drum and bass"'),
      code: z.string().optional().describe('Strudel code to play directly — no API key needed. Read strudel://reference for syntax.'),
    },
    async ({ prompt, code: directCode }) => {
      clearLayers();
      await ensureEngine();

      if (directCode) {
        const { currentCode } = getState();
        const result = await safeEvaluate(directCode, currentCode);
        if (!result.success) {
          return {
            content: [{ type: 'text' as const, text: `Evaluation error: ${result.error}` }],
            isError: true,
          };
        }
        updateAfterPlay(directCode, '');
        const viz = getPatternViz();
        return {
          content: [{ type: 'text' as const, text: `Now playing:\n\`\`\`javascript\n${directCode}\n\`\`\`${viz}` }],
        };
      }

      if (!prompt) {
        return {
          content: [{ type: 'text' as const, text: 'Provide either `prompt` (requires ANTHROPIC_API_KEY) or `code` (Strudel code, no key needed). Read the `strudel://reference` MCP resource to learn Strudel syntax.' }],
          isError: true,
        };
      }

      const { commentary, code } = await generateAndPlay(prompt);
      const viz = getPatternViz();
      return {
        content: [
          {
            type: 'text' as const,
            text: commentary
              ? `${commentary}\n\nNow playing:\n\`\`\`javascript\n${code}\n\`\`\`${viz}`
              : `Now playing:\n\`\`\`javascript\n${code}\n\`\`\`${viz}`,
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
      const viz = getPatternViz();
      return {
        content: [{ type: 'text' as const, text: `Now playing:\n\`\`\`javascript\n${code}\n\`\`\`${viz}` }],
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
        const viz = getPatternViz();
        return {
          content: [
            {
              type: 'text' as const,
              text: commentary
                ? `Vibe set to ${mood}! ${commentary}\n\n\`\`\`javascript\n${code}\n\`\`\`${viz}`
                : `Vibe set to ${mood}!\n\n\`\`\`javascript\n${code}\n\`\`\`${viz}`,
            },
          ],
        };
      }

      // No API key — use fallback pattern from preset library
      const code = PRESET_MAP.get(mood)!.code;
      const { currentCode } = getState();
      const result = await safeEvaluate(code, currentCode);
      if (!result.success) {
        return {
          content: [{ type: 'text' as const, text: `Vibe fallback failed: ${result.error}` }],
          isError: true,
        };
      }
      updateAfterPlay(code, '');
      const viz = getPatternViz();
      return {
        content: [
          {
            type: 'text' as const,
            text: `Vibe set to ${mood}! (using built-in pattern — set ANTHROPIC_API_KEY for AI-generated music)\n\n\`\`\`javascript\n${code}\n\`\`\`${viz}`,
          },
        ],
      };
    },
  );

  // -- live_mix -------------------------------------------------------------
  server.tool(
    'live_mix',
    'Autonomous DJ set — generates and evolves music through multiple stages with ~20s between each. Works without an API key when you provide `stages_code` with an array of Strudel code strings (one per stage). With ANTHROPIC_API_KEY, use `prompt` for AI-generated evolution. Read strudel://reference for syntax.',
    {
      prompt: z.string().optional().describe('Starting direction for the mix, e.g. "deep house sunset set" or "ambient techno journey"'),
      stages: z.number().min(3).max(10).default(6).optional().describe('Number of stages in the set (default 6)'),
      stages_code: z.array(z.string()).min(1).max(10).optional().describe('Array of Strudel code strings, one per stage — no API key needed. Played sequentially with ~20s gaps.'),
    },
    async ({ prompt, stages: stagesParam, stages_code }) => {
      await ensureEngine();

      // Direct code path — no API key needed
      if (stages_code) {
        const log: { stage: number; evolution: string; commentary: string; code: string }[] = [];

        for (let i = 0; i < stages_code.length; i++) {
          if (i > 0) {
            await new Promise((r) => setTimeout(r, 20_000));
            if (!getState().isPlaying) {
              log.push({ stage: i + 1, evolution: 'stopped', commentary: 'Mix stopped — hush was called.', code: '' });
              break;
            }
          }

          clearLayers();
          const { currentCode } = getState();
          const result = await safeEvaluate(stages_code[i], currentCode);
          if (!result.success) {
            log.push({ stage: i + 1, evolution: `stage ${i + 1}`, commentary: `Evaluation error: ${result.error}`, code: stages_code[i] });
          } else {
            updateAfterPlay(stages_code[i], '');
            log.push({ stage: i + 1, evolution: `stage ${i + 1}`, commentary: '', code: stages_code[i] });
          }
        }

        const summary = log
          .map((entry) => {
            const header = `## Stage ${entry.stage}: ${entry.evolution}`;
            const body = entry.commentary || '(playing)';
            const code = entry.code ? `\n\`\`\`javascript\n${entry.code}\n\`\`\`` : '';
            return `${header}\n${body}${code}`;
          })
          .join('\n\n---\n\n');

        return {
          content: [{ type: 'text' as const, text: `# DJ Claude Live Mix — ${stages_code.length} stages (direct code)\n\n${summary}` }],
        };
      }

      if (!prompt) {
        return {
          content: [{ type: 'text' as const, text: 'Provide either `prompt` (requires ANTHROPIC_API_KEY) or `stages_code` (array of Strudel code, no key needed). Read the `strudel://reference` MCP resource to learn Strudel syntax.' }],
          isError: true,
        };
      }

      const stageCount = stagesParam ?? 6;

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
    'Add or update a single layer in a collaborative jam session. Each layer has a role (drums, bass, melody, etc.) and layers are composed together with stack(). Works without an API key when you provide `code` with Strudel code directly (read strudel://reference and strudel://roles for syntax). With ANTHROPIC_API_KEY, use `prompt` for AI generation.',
    {
      role: z.string().describe('The role/name for this layer, e.g. "drums", "bass", "melody", "chords", "pads", "fx"'),
      prompt: z.string().optional().describe('What this layer should sound like, e.g. "funky breakbeat pattern" or "deep sub bass in C minor"'),
      code: z.string().optional().describe('Strudel code for this layer — no API key needed. Should be a single pattern chain (no stack, no .cpm).'),
      added_by: z.string().optional().describe('Name of the session/agent adding this layer'),
      notes: z.string().optional().describe('Free text notes, e.g. "C minor, 120bpm"'),
      key: z.string().optional().describe('Musical key, e.g. "C minor", "F# major"'),
      tempo: z.number().optional().describe('BPM for this layer'),
    },
    async ({ role, prompt, code: directCode, added_by, notes, key, tempo }) => {
      return withEvalLock(async () => {
        await ensureEngine();

        let layerCode: string;
        let commentary: string;

        if (directCode) {
          layerCode = directCode;
          commentary = '';
        } else if (prompt) {
          const generated = await generateLayerCode(role, prompt);
          layerCode = generated.code;
          commentary = generated.commentary;
        } else {
          return {
            content: [{ type: 'text' as const, text: 'Provide either `prompt` (requires ANTHROPIC_API_KEY) or `code` (Strudel code, no key needed). Read the `strudel://reference` MCP resource to learn Strudel syntax.' }],
            isError: true,
          };
        }
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
        const viz = getPatternViz();
        const base = commentary
          ? `${commentary}\n\nLayer "${role}" added (${layerCount} total):\n\`\`\`javascript\n${layerCode}\n\`\`\`${viz}`
          : `Layer "${role}" added (${layerCount} total):\n\`\`\`javascript\n${layerCode}\n\`\`\`${viz}`;
        return {
          content: [
            {
              type: 'text' as const,
              text: base + JAM_NUDGE,
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
            text: JSON.stringify({ layers: entries, composed: composeLayers() }) + JAM_NUDGE,
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
    'Tell DJ Claude what you\'re working on so the music adapts to your coding activity. Context is injected into music generation prompts for more relevant vibes. Note: auto_adapt requires an API key; without one, context is saved and applied on next generation.',
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
    'Preview what a jam layer would sound like without actually adding it. Generates code but does NOT evaluate, store, or play it. Works without an API key when you provide `code` directly. Read strudel://reference for syntax.',
    {
      role: z.string().describe('The role to preview, e.g. "drums", "bass", "melody"'),
      prompt: z.string().optional().describe('What this layer should sound like'),
      code: z.string().optional().describe('Strudel code to preview directly — no API key needed.'),
    },
    async ({ role, prompt, code: directCode }) => {
      if (directCode) {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({ role, code: directCode, commentary: '', preview: true }),
            },
          ],
        };
      }

      if (!prompt) {
        return {
          content: [{ type: 'text' as const, text: 'Provide either `prompt` (requires ANTHROPIC_API_KEY) or `code` (Strudel code, no key needed).' }],
          isError: true,
        };
      }

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
    'Orchestrate a full band — generates multiple layers at once from a single directive. Works without an API key when you provide `layers` (a map of role -> Strudel code). With ANTHROPIC_API_KEY, use `directive` for AI generation. Matches band templates (jazz combo, rock band, electronic, ambient, etc.) or specify custom roles. Read strudel://reference and strudel://roles for syntax.',
    {
      directive: z.string().optional().describe('What the band should play, e.g. "jazz combo in C minor, late night mood"'),
      roles: z.array(z.string()).optional().describe('Custom roles to override template matching, e.g. ["drums", "bass", "keys", "sax"]'),
      layers: z.record(z.string(), z.string()).optional().describe('Map of role name to Strudel code — no API key needed. e.g. { "drums": "s(\\"bd sd\\")", "bass": "note(\\"c1\\")" }'),
    },
    async ({ directive, roles: customRoles, layers: directLayers }) => {
      clearLayers();
      await ensureEngine();

      // Direct code path — no API key needed
      if (directLayers) {
        const roles = Object.keys(directLayers);
        const results: { role: string; success: boolean; code: string; error?: string }[] = [];

        for (const role of roles) {
          await withEvalLock(async () => {
            try {
              setLayer(role, directLayers[role]);

              const composed = composeLayers();
              const { currentCode } = getState();
              const evalResult = await safeEvaluate(composed, currentCode);

              if (!evalResult.success) {
                removeLayer(role);
                results.push({ role, success: false, code: directLayers[role], error: evalResult.error });
              } else {
                updateAfterPlay(composed, '');
                results.push({ role, success: true, code: directLayers[role] });
              }
            } catch (err) {
              results.push({ role, success: false, code: directLayers[role], error: err instanceof Error ? err.message : String(err) });
            }
          });
        }

        const succeeded = results.filter((r) => r.success);
        const failed = results.filter((r) => !r.success);

        let summary = `# Conductor — ${succeeded.length}/${roles.length} layers created (direct code)\n\n`;
        summary += `**Roles:** ${roles.join(', ')}\n\n`;

        for (const r of succeeded) {
          summary += `## ${r.role}\n\`\`\`javascript\n${r.code}\n\`\`\`\n\n`;
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
      }

      if (!directive) {
        return {
          content: [{ type: 'text' as const, text: 'Provide either `directive` (requires ANTHROPIC_API_KEY) or `layers` (map of role -> Strudel code, no key needed). Read the `strudel://reference` MCP resource to learn Strudel syntax.' }],
          isError: true,
        };
      }

      const roles = customRoles ?? matchBandTemplate(directive);

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
    'Evolve all active layers through multiple stages — each layer gets modified 20-40% per stage with pauses between. Works without an API key when you provide `layers` (a map of role -> new Strudel code) for a single-pass update. With ANTHROPIC_API_KEY, use `directive` for AI-driven multi-stage evolution. Requires active layers from a jam or conduct session.',
    {
      directive: z.string().optional().describe('Evolution direction, e.g. "shift darker", "build energy", "deconstruct gradually"'),
      stages: z.number().min(1).max(6).optional().describe('Number of evolution stages (default 3, max 6)'),
      layers: z.record(z.string(), z.string()).optional().describe('Map of role name to new Strudel code — applies evolved code in one pass, no API key needed.'),
    },
    async ({ directive, stages: stagesParam, layers: directLayers }) => {
      const currentLayers = getLayers();

      if (currentLayers.size === 0) {
        return {
          content: [{ type: 'text' as const, text: 'No active layers to evolve. Use jam or conduct first.' }],
        };
      }

      // Direct code path — apply evolved code in one pass, no API key needed
      if (directLayers) {
        const results: { role: string; success: boolean; error?: string }[] = [];

        for (const [role, code] of Object.entries(directLayers)) {
          const existing = currentLayers.get(role);
          if (!existing) {
            results.push({ role, success: false, error: `No active layer with role "${role}"` });
            continue;
          }

          const previousCode = existing.code;
          await withEvalLock(async () => {
            try {
              setLayer(role, code);
              const composed = composeLayers();
              const { currentCode } = getState();
              const evalResult = await safeEvaluate(composed, currentCode);

              if (!evalResult.success) {
                setLayer(role, previousCode);
                results.push({ role, success: false, error: evalResult.error });
              } else {
                updateAfterPlay(composed, '');
                results.push({ role, success: true });
              }
            } catch (err) {
              setLayer(role, previousCode);
              results.push({ role, success: false, error: err instanceof Error ? err.message : String(err) });
            }
          });
        }

        const succeeded = results.filter((r) => r.success);
        const failed = results.filter((r) => !r.success);

        let summary = `# Evolution — ${succeeded.length}/${results.length} layers updated (direct code)\n\n`;
        for (const r of succeeded) {
          summary += `- **${r.role}**: updated\n`;
        }
        if (failed.length > 0) {
          summary += `\n### Failed\n`;
          for (const r of failed) {
            summary += `- **${r.role}**: ${r.error}\n`;
          }
        }

        return {
          content: [{ type: 'text' as const, text: summary }],
        };
      }

      if (!directive) {
        return {
          content: [{ type: 'text' as const, text: 'Provide either `directive` (requires ANTHROPIC_API_KEY) or `layers` (map of role -> Strudel code, no key needed). Read the `strudel://reference` MCP resource to learn Strudel syntax.' }],
          isError: true,
        };
      }

      const stageCount = stagesParam ?? 3;

      const log: { stage: number; results: { role: string; success: boolean }[] }[] = [];

      for (let stage = 1; stage <= stageCount; stage++) {
        if (stage > 1) {
          await new Promise((r) => setTimeout(r, 15_000));
        }

        if (!getState().isPlaying) {
          break;
        }

        const stageResults: { role: string; success: boolean }[] = [];
        const activeLayers = Array.from(getLayers().values());

        for (const layer of activeLayers) {
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
      const viz = getPatternViz();
      return {
        content: [
          {
            type: 'text' as const,
            text: `Snapshot "${name}" loaded with ${layerNames.length} layer(s)${layerNames.length > 0 ? `: ${layerNames.join(', ')}` : ''}. Music resumed.${viz}`,
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

  // -- play_preset ----------------------------------------------------------
  server.tool(
    'play_preset',
    'Play from the curated pattern library. No API key needed. Call without arguments to list all available presets.',
    {
      name: z.string().optional().describe('Preset name, e.g. "jazz", "techno", "coding", "chill"'),
      category: z.enum(['mood', 'genre', 'activity']).optional().describe('Filter by category when listing presets'),
    },
    async ({ name, category }) => {
      // List mode — no name provided
      if (!name) {
        const presets = getPresetsByCategory(category);
        const grouped: Record<string, { name: string; description: string }[]> = {};
        for (const p of presets) {
          (grouped[p.category] ??= []).push({ name: p.name, description: p.description });
        }

        let listing = '# Available Presets\n\n';
        for (const [cat, items] of Object.entries(grouped)) {
          listing += `## ${cat.charAt(0).toUpperCase() + cat.slice(1)}\n`;
          for (const item of items) {
            listing += `- **${item.name}** — ${item.description}\n`;
          }
          listing += '\n';
        }
        listing += `Use \`play_preset\` with a \`name\` to play one.`;

        return {
          content: [{ type: 'text' as const, text: listing }],
        };
      }

      // Play mode
      const preset = PRESET_MAP.get(name);
      if (!preset) {
        return {
          content: [{ type: 'text' as const, text: `Preset "${name}" not found. Available: ${PRESET_NAMES.join(', ')}` }],
          isError: true,
        };
      }

      clearLayers();
      await ensureEngine();

      const { currentCode } = getState();
      const result = await safeEvaluate(preset.code, currentCode);
      if (!result.success) {
        return {
          content: [{ type: 'text' as const, text: `Preset evaluation error: ${result.error}` }],
          isError: true,
        };
      }

      updateAfterPlay(preset.code, '');
      const viz = getPatternViz();
      return {
        content: [
          {
            type: 'text' as const,
            text: `Now playing preset: **${preset.name}** (${preset.category})\n${preset.description}\n\n\`\`\`javascript\n${preset.code}\n\`\`\`${viz}`,
          },
        ],
      };
    },
  );
}

// ---------------------------------------------------------------------------
// MCP Resources — expose Strudel knowledge for keyless agent usage.
// ---------------------------------------------------------------------------

export function registerResources(server: McpServer): void {
  // strudel://reference — full syntax guide
  server.registerResource(
    'Strudel Reference',
    'strudel://reference',
    {
      description: 'Complete Strudel syntax reference — core functions, mini-notation, effects, modulation.',
      mimeType: 'text/plain',
    },
    async (uri) => ({
      contents: [{ uri: uri.href, mimeType: 'text/plain', text: STRUDEL_REFERENCE }],
    }),
  );

  // strudel://roles — role guidance for jam/conduct layers
  const rolesText = Object.entries(ROLE_GUIDANCE)
    .map(([role, guidance]) => `## ${role}\n${guidance}`)
    .join('\n\n');

  server.registerResource(
    'Strudel Role Guidance',
    'strudel://roles',
    {
      description: 'Musical role guidance for building jam layers (drums, bass, melody, chords, pads, etc.).',
      mimeType: 'text/plain',
    },
    async (uri) => ({
      contents: [{ uri: uri.href, mimeType: 'text/plain', text: `# Strudel Role Guidance\n\nUse these guidelines when writing code for specific roles in a jam session.\n\n${rolesText}` }],
    }),
  );

  // strudel://examples — working code from preset library
  const examplesText = (['mood', 'genre', 'activity'] as const)
    .map((cat) => {
      const presets = getPresetsByCategory(cat);
      const entries = presets
        .map((p) => `### ${p.name}\n${p.description}\n\`\`\`javascript\n${p.code}\n\`\`\``)
        .join('\n\n');
      return `## ${cat.charAt(0).toUpperCase() + cat.slice(1)}\n\n${entries}`;
    })
    .join('\n\n');

  server.registerResource(
    'Strudel Examples',
    'strudel://examples',
    {
      description: 'Working Strudel patterns organized by mood, genre, and activity. Use as reference for writing your own.',
      mimeType: 'text/plain',
    },
    async (uri) => ({
      contents: [{ uri: uri.href, mimeType: 'text/plain', text: `# Strudel Examples\n\nWorking patterns from the DJ Claude preset library.\n\n${examplesText}` }],
    }),
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
    version: '0.1.17',
  });

  registerTools(server);
  registerResources(server);

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[dj-claude-mcp] Server running on stdio.');
}
