import { describe, it, expect, vi, beforeEach } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerTools, registerResources } from './server.js';
import {
  setLayer,
  clearLayers,
  getLayers,
  composeLayers,
  setContext,
  getContext,
  clearContext,
  saveSnapshot,
  loadSnapshot,
  listSnapshots,
  deleteSnapshot,
  updateAfterPlay,
  updateAfterHush,
  getState,
  setEngineReady,
} from './state.js';

// ---------------------------------------------------------------------------
// Mock heavy dependencies so tests don't need audio engine or API keys.
// ---------------------------------------------------------------------------

vi.mock('../audio/engine.js', () => ({
  initEngine: vi.fn().mockResolvedValue(undefined),
  safeEvaluate: vi.fn().mockResolvedValue({ success: true }),
  hush: vi.fn(),
  switchBackend: vi.fn().mockResolvedValue(undefined),
  getBackendMode: vi.fn().mockReturnValue('node'),
  getPattern: vi.fn().mockReturnValue(null),
}));

vi.mock('../lib/config.js', () => ({
  findApiKey: vi.fn().mockReturnValue('test-key'),
}));

vi.mock('../lib/claude.js', () => ({
  streamChat: vi.fn().mockImplementation(async function* () {
    yield '```javascript\ns("bd sd hh")\n```\n\nDJ Commentary: test beats';
  }),
}));

vi.mock('../lib/parseCode.js', () => ({
  parseStreamingCode: vi.fn().mockReturnValue({
    isComplete: true,
    extractedCode: 's("bd sd hh")',
    displayCode: 's("bd sd hh")',
    mcCommentary: 'test beats',
  }),
}));

vi.mock('../lib/prompts.js', () => ({
  buildLayerPrompt: vi.fn().mockReturnValue('You are a layer generator.'),
  STRUDEL_REFERENCE: 'Mock Strudel reference content',
  ROLE_GUIDANCE: {
    drums: 'Focus on percussion.',
    bass: 'Focus on bass.',
    melody: 'Focus on melody.',
  },
}));

beforeEach(() => {
  clearLayers();
  clearContext();
  for (const snap of listSnapshots()) {
    deleteSnapshot(snap.name);
  }
  // Reset currentCode by playing empty, then hushing
  updateAfterPlay('', '');
  updateAfterHush();
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Tool registration — verify correct count
// ---------------------------------------------------------------------------

describe('Tool registration', () => {
  it('registers exactly 20 tools', () => {
    const server = new McpServer({ name: 'test', version: '0.0.1' });
    const toolSpy = vi.spyOn(server, 'tool');
    registerTools(server);
    expect(toolSpy).toHaveBeenCalledTimes(20);
  });

  it('registers all expected tool names', () => {
    const server = new McpServer({ name: 'test', version: '0.0.1' });
    const toolSpy = vi.spyOn(server, 'tool');
    registerTools(server);

    const registeredNames = toolSpy.mock.calls.map((call) => call[0]);
    const expectedTools = [
      'play_music',
      'play_strudel',
      'set_vibe',
      'live_mix',
      'hush',
      'switch_audio',
      'now_playing',
      'jam',
      'jam_clear',
      'jam_status',
      'set_context',
      'jam_preview',
      'mix_analysis',
      'conduct',
      'conduct_evolve',
      'snapshot_save',
      'snapshot_load',
      'snapshot_list',
      'export_code',
      'play_preset',
    ];

    for (const name of expectedTools) {
      expect(registeredNames).toContain(name);
    }
  });
});

// ---------------------------------------------------------------------------
// Mix analysis — test via exported analyzeLayer/generateSuggestions indirectly
// by calling the tool handler. We test the logic by manipulating layers and
// invoking the analysis through the registered tool.
// ---------------------------------------------------------------------------

describe('Mix analysis logic', () => {
  // Helper: register tools and extract a tool handler by name
  function getToolHandler(toolName: string) {
    const server = new McpServer({ name: 'test', version: '0.0.1' });
    const toolSpy = vi.spyOn(server, 'tool');
    registerTools(server);
    const call = toolSpy.mock.calls.find((c) => c[0] === toolName);
    if (!call) throw new Error(`Tool ${toolName} not found`);
    // The handler is the last argument
    return call[call.length - 1] as (...args: unknown[]) => Promise<{ content: { type: string; text: string }[] }>;
  }

  it('returns empty message when no layers', async () => {
    const handler = getToolHandler('mix_analysis');
    const result = await handler({});
    expect(result.content[0].text).toContain('No active layers');
  });

  it('detects frequency bands from note octaves', async () => {
    setLayer('bass', 'note("c1 e1 g1").s("sawtooth").lpf(200).gain(0.6)');
    setLayer('lead', 'note("c5 e5 g5").s("triangle").gain(0.3)');

    const handler = getToolHandler('mix_analysis');
    const result = await handler({});
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed.totalLayers).toBe(2);
    expect(parsed.layers.length).toBe(2);

    const bassAnalysis = parsed.layers.find((l: { role: string }) => l.role === 'bass');
    expect(bassAnalysis.frequencyBand).toBe('low');
    expect(bassAnalysis.octaveRange).toBe('1');
    expect(bassAnalysis.effects).toContain('lpf');
    expect(bassAnalysis.gainLevel).toBe(0.6);

    const leadAnalysis = parsed.layers.find((l: { role: string }) => l.role === 'lead');
    expect(leadAnalysis.frequencyBand).toBe('high');
    expect(leadAnalysis.octaveRange).toBe('5');
  });

  it('detects percussion frequency band', async () => {
    setLayer('drums', 's("bd sd hh oh").gain(0.8)');
    const handler = getToolHandler('mix_analysis');
    const result = await handler({});
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.layers[0].frequencyBand).toBe('percussion');
  });

  it('detects multiple effects', async () => {
    setLayer('pads', 'note("c3 e3 g3").s("triangle").room(0.5).delay(0.3).pan(0.3).vowel("a e").phaser(0.4)');
    const handler = getToolHandler('mix_analysis');
    const result = await handler({});
    const parsed = JSON.parse(result.content[0].text);
    const effects = parsed.layers[0].effects;
    expect(effects).toContain('reverb');
    expect(effects).toContain('delay');
    expect(effects).toContain('pan');
    expect(effects).toContain('vowel');
    expect(effects).toContain('phaser');
  });

  it('generates suggestion when missing bass range', async () => {
    setLayer('lead', 'note("c5 e5").s("triangle")');
    setLayer('chords', 'note("c4 e4 g4").s("sawtooth")');
    setLayer('hats', 's("hh hh oh hh")');
    const handler = getToolHandler('mix_analysis');
    const result = await handler({});
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.suggestions.some((s: string) => s.includes('bass range'))).toBe(true);
  });

  it('generates suggestion when all gains too high', async () => {
    setLayer('drums', 's("bd sd").gain(0.9)');
    setLayer('bass', 'note("c1").s("sawtooth").gain(0.85)');
    setLayer('lead', 'note("c4").s("triangle").gain(0.8)');
    const handler = getToolHandler('mix_analysis');
    const result = await handler({});
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.suggestions.some((s: string) => s.includes('gains'))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Band template matching (conductor)
// ---------------------------------------------------------------------------

describe('Conductor band templates', () => {
  function getToolHandler(toolName: string) {
    const server = new McpServer({ name: 'test', version: '0.0.1' });
    const toolSpy = vi.spyOn(server, 'tool');
    registerTools(server);
    const call = toolSpy.mock.calls.find((c) => c[0] === toolName);
    return call![call!.length - 1] as (...args: unknown[]) => Promise<{ content: { type: string; text: string }[] }>;
  }

  it('conduct creates layers matching jazz combo template', async () => {
    // We need to mock the engine init
    const { initEngine } = await import('../audio/engine.js');
    const { setEngineReady } = await import('./state.js');
    setEngineReady();

    const handler = getToolHandler('conduct');
    const result = await handler({ directive: 'jazz combo in C minor', roles: undefined });
    const text = result.content[0].text;

    // Should mention all 4 jazz combo roles
    expect(text).toContain('drums');
    expect(text).toContain('bass');
    expect(text).toContain('chords');
    expect(text).toContain('melody');
  });

  it('conduct with custom roles uses those instead of template', async () => {
    const { setEngineReady } = await import('./state.js');
    setEngineReady();

    const handler = getToolHandler('conduct');
    const result = await handler({ directive: 'custom setup', roles: ['keys', 'sax'] });
    const text = result.content[0].text;

    expect(text).toContain('keys');
    expect(text).toContain('sax');
  });
});

// ---------------------------------------------------------------------------
// Snapshot tools — end-to-end through tool handlers
// ---------------------------------------------------------------------------

describe('Snapshot tools', () => {
  function getToolHandler(toolName: string) {
    const server = new McpServer({ name: 'test', version: '0.0.1' });
    const toolSpy = vi.spyOn(server, 'tool');
    registerTools(server);
    const call = toolSpy.mock.calls.find((c) => c[0] === toolName);
    return call![call!.length - 1] as (...args: unknown[]) => Promise<{ content: { type: string; text: string }[]; isError?: boolean }>;
  }

  it('snapshot_save saves current mix', async () => {
    setLayer('drums', 's("bd sd")');
    updateAfterPlay('s("bd sd")', 'test');

    const handler = getToolHandler('snapshot_save');
    const result = await handler({ name: 'test-save' });
    expect(result.content[0].text).toContain('Snapshot "test-save" saved');
    expect(result.content[0].text).toContain('drums');
  });

  it('snapshot_save rejects when nothing playing', async () => {
    const handler = getToolHandler('snapshot_save');
    const result = await handler({ name: 'empty' });
    expect(result.content[0].text).toContain('Nothing to save');
  });

  it('snapshot_list returns empty initially', async () => {
    const handler = getToolHandler('snapshot_list');
    const result = await handler({});
    expect(result.content[0].text).toContain('No snapshots saved');
  });

  it('snapshot_list shows saved snapshots', async () => {
    setLayer('drums', 's("bd")');
    updateAfterPlay('s("bd")', '');
    saveSnapshot('list-test-1');
    saveSnapshot('list-test-2');

    const handler = getToolHandler('snapshot_list');
    const result = await handler({});
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.length).toBe(2);
    expect(parsed.map((s: { name: string }) => s.name)).toContain('list-test-1');
    expect(parsed.map((s: { name: string }) => s.name)).toContain('list-test-2');
  });

  it('snapshot_load restores layers and evaluates', async () => {
    const { setEngineReady } = await import('./state.js');
    setEngineReady();

    setLayer('drums', 's("bd sd")');
    setLayer('bass', 'note("c1")');
    updateAfterPlay('stack(s("bd sd"), note("c1"))', '');
    saveSnapshot('load-test');

    clearLayers();
    updateAfterHush();

    const handler = getToolHandler('snapshot_load');
    const result = await handler({ name: 'load-test' });
    expect(result.content[0].text).toContain('Snapshot "load-test" loaded');
    expect(result.content[0].text).toContain('drums');
    expect(result.content[0].text).toContain('bass');

    // Layers should be restored
    expect(getLayers().size).toBe(2);
  });

  it('snapshot_load returns error for non-existent snapshot', async () => {
    const handler = getToolHandler('snapshot_load');
    const result = await handler({ name: 'nope' });
    expect(result.content[0].text).toContain('not found');
  });

  it('snapshot_load lists available snapshots on miss', async () => {
    setLayer('drums', 's("bd")');
    updateAfterPlay('s("bd")', '');
    saveSnapshot('exists-1');
    saveSnapshot('exists-2');

    const handler = getToolHandler('snapshot_load');
    const result = await handler({ name: 'nope' });
    expect(result.content[0].text).toContain('exists-1');
    expect(result.content[0].text).toContain('exists-2');
  });
});

// ---------------------------------------------------------------------------
// Export code tool
// ---------------------------------------------------------------------------

describe('Export code tool', () => {
  function getToolHandler(toolName: string) {
    const server = new McpServer({ name: 'test', version: '0.0.1' });
    const toolSpy = vi.spyOn(server, 'tool');
    registerTools(server);
    const call = toolSpy.mock.calls.find((c) => c[0] === toolName);
    return call![call!.length - 1] as (...args: unknown[]) => Promise<{ content: { type: string; text: string }[] }>;
  }

  it('returns nothing when no code playing', async () => {
    const handler = getToolHandler('export_code');
    const result = await handler({});
    expect(result.content[0].text).toContain('Nothing to export');
  });

  it('exports code with header comments', async () => {
    setLayer('drums', 's("bd sd")');
    setLayer('bass', 'note("c1")');
    updateAfterPlay('stack(s("bd sd"), note("c1"))', '');

    const handler = getToolHandler('export_code');
    const result = await handler({});
    const text = result.content[0].text;

    expect(text).toContain('// DJ Claude Export');
    expect(text).toContain('// Layers: drums, bass');
    expect(text).toContain('stack(s("bd sd"), note("c1"))');
  });
});

// ---------------------------------------------------------------------------
// Set context tool
// ---------------------------------------------------------------------------

describe('Set context tool', () => {
  function getToolHandler(toolName: string) {
    const server = new McpServer({ name: 'test', version: '0.0.1' });
    const toolSpy = vi.spyOn(server, 'tool');
    registerTools(server);
    const call = toolSpy.mock.calls.find((c) => c[0] === toolName);
    return call![call!.length - 1] as (...args: unknown[]) => Promise<{ content: { type: string; text: string }[] }>;
  }

  it('sets context without auto_adapt', async () => {
    const handler = getToolHandler('set_context');
    const result = await handler({ activity: 'debugging tests', auto_adapt: undefined });
    expect(result.content[0].text).toContain('Context set to "debugging tests"');
    expect(getContext()!.activity).toBe('debugging tests');
    expect(getContext()!.autoAdapt).toBe(false);
  });

  it('context is included in now_playing response', async () => {
    setContext('writing API', false);
    updateAfterPlay('s("bd")', 'test');
    // Manually mark as playing
    const state = getState();
    // state.isPlaying is set by updateAfterPlay

    const handler = getToolHandler('now_playing');
    const result = await handler({});
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.codingContext).toBe('writing API');
  });
});

// ---------------------------------------------------------------------------
// Jam preview tool
// ---------------------------------------------------------------------------

describe('Jam preview tool', () => {
  function getToolHandler(toolName: string) {
    const server = new McpServer({ name: 'test', version: '0.0.1' });
    const toolSpy = vi.spyOn(server, 'tool');
    registerTools(server);
    const call = toolSpy.mock.calls.find((c) => c[0] === toolName);
    return call![call!.length - 1] as (...args: unknown[]) => Promise<{ content: { type: string; text: string }[] }>;
  }

  it('returns preview without adding layer to state', async () => {
    const handler = getToolHandler('jam_preview');
    const result = await handler({ role: 'drums', prompt: 'four on the floor' });
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed.role).toBe('drums');
    expect(parsed.code).toBeDefined();
    expect(parsed.preview).toBe(true);

    // Most importantly: no layers should be stored
    expect(getLayers().size).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Jam with metadata (extended params)
// ---------------------------------------------------------------------------

describe('Jam with metadata', () => {
  function getToolHandler(toolName: string) {
    const server = new McpServer({ name: 'test', version: '0.0.1' });
    const toolSpy = vi.spyOn(server, 'tool');
    registerTools(server);
    const call = toolSpy.mock.calls.find((c) => c[0] === toolName);
    return call![call!.length - 1] as (...args: unknown[]) => Promise<{ content: { type: string; text: string }[] }>;
  }

  it('jam stores metadata on layer', async () => {
    const { setEngineReady } = await import('./state.js');
    setEngineReady();

    const handler = getToolHandler('jam');
    await handler({
      role: 'bass',
      prompt: 'deep sub',
      added_by: 'agent-1',
      notes: 'keep it low',
      key: 'C minor',
      tempo: 120,
    });

    const bass = getLayers().get('bass');
    expect(bass).toBeDefined();
    expect(bass!.addedBy).toBe('agent-1');
    expect(bass!.notes).toBe('keep it low');
    expect(bass!.key).toBe('C minor');
    expect(bass!.tempo).toBe(120);
  });

  it('jam without metadata still works (backward compat)', async () => {
    const { setEngineReady } = await import('./state.js');
    setEngineReady();

    const handler = getToolHandler('jam');
    await handler({
      role: 'drums',
      prompt: 'kick pattern',
      added_by: undefined,
      notes: undefined,
      key: undefined,
      tempo: undefined,
    });

    const drums = getLayers().get('drums');
    expect(drums).toBeDefined();
    expect(drums!.code).toBeDefined();
  });

  it('jam_status includes metadata when present', async () => {
    setLayer('bass', 'note("c1")', {
      addedBy: 'agent-1',
      notes: 'deep sub',
      key: 'C minor',
      tempo: 120,
    });

    const handler = getToolHandler('jam_status');
    const result = await handler({});
    const parsed = JSON.parse(result.content[0].text);
    const bassEntry = parsed.layers.find((l: { role: string }) => l.role === 'bass');

    expect(bassEntry.addedBy).toBe('agent-1');
    expect(bassEntry.notes).toBe('deep sub');
    expect(bassEntry.key).toBe('C minor');
    expect(bassEntry.tempo).toBe(120);
  });

  it('jam_status omits metadata fields when not set', async () => {
    setLayer('drums', 's("bd sd")');

    const handler = getToolHandler('jam_status');
    const result = await handler({});
    const parsed = JSON.parse(result.content[0].text);
    const drumsEntry = parsed.layers.find((l: { role: string }) => l.role === 'drums');

    expect(drumsEntry.addedBy).toBeUndefined();
    expect(drumsEntry.notes).toBeUndefined();
    expect(drumsEntry.key).toBeUndefined();
    expect(drumsEntry.tempo).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Play preset tool
// ---------------------------------------------------------------------------

describe('Play preset tool', () => {
  function getToolHandler(toolName: string) {
    const server = new McpServer({ name: 'test', version: '0.0.1' });
    const toolSpy = vi.spyOn(server, 'tool');
    registerTools(server);
    const call = toolSpy.mock.calls.find((c) => c[0] === toolName);
    return call![call!.length - 1] as (...args: unknown[]) => Promise<{ content: { type: string; text: string }[]; isError?: boolean }>;
  }

  it('lists all presets when called without a name', async () => {
    const handler = getToolHandler('play_preset');
    const result = await handler({ name: undefined, category: undefined });
    const text = result.content[0].text;

    expect(text).toContain('Available Presets');
    expect(text).toContain('jazz');
    expect(text).toContain('chill');
    expect(text).toContain('coding');
  });

  it('filters presets by category', async () => {
    const handler = getToolHandler('play_preset');
    const result = await handler({ name: undefined, category: 'genre' });
    const text = result.content[0].text;

    expect(text).toContain('jazz');
    expect(text).toContain('techno');
    // Should not contain activity-only presets at top level
    expect(text).not.toContain('## Mood');
  });

  it('plays a preset by name', async () => {
    setEngineReady();

    const handler = getToolHandler('play_preset');
    const result = await handler({ name: 'jazz', category: undefined });
    const text = result.content[0].text;

    expect(text).toContain('jazz');
    expect(text).toContain('genre');
    expect(result.isError).toBeFalsy();
  });

  it('returns error for unknown preset', async () => {
    const handler = getToolHandler('play_preset');
    const result = await handler({ name: 'nonexistent', category: undefined });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('not found');
    expect(result.content[0].text).toContain('Available');
  });
});

// ---------------------------------------------------------------------------
// Direct code parameters (keyless operation)
// ---------------------------------------------------------------------------

describe('Direct code parameters', () => {
  function getToolHandler(toolName: string) {
    const server = new McpServer({ name: 'test', version: '0.0.1' });
    const toolSpy = vi.spyOn(server, 'tool');
    registerTools(server);
    const call = toolSpy.mock.calls.find((c) => c[0] === toolName);
    return call![call!.length - 1] as (...args: unknown[]) => Promise<{ content: { type: string; text: string }[]; isError?: boolean }>;
  }

  it('play_music with code skips AI generation', async () => {
    setEngineReady();

    const handler = getToolHandler('play_music');
    const result = await handler({ prompt: undefined, code: 's("bd sd hh")' });

    expect(result.content[0].text).toContain('Now playing');
    expect(result.content[0].text).toContain('s("bd sd hh")');
    expect(result.isError).toBeFalsy();
  });

  it('play_music with neither prompt nor code returns error', async () => {
    const handler = getToolHandler('play_music');
    const result = await handler({ prompt: undefined, code: undefined });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('prompt');
    expect(result.content[0].text).toContain('code');
  });

  it('jam with code skips AI generation', async () => {
    setEngineReady();

    const handler = getToolHandler('jam');
    const result = await handler({
      role: 'drums',
      prompt: undefined,
      code: 's("bd sd")',
      added_by: undefined,
      notes: undefined,
      key: undefined,
      tempo: undefined,
    });

    expect(result.content[0].text).toContain('drums');
    expect(result.isError).toBeFalsy();
    expect(getLayers().has('drums')).toBe(true);
  });

  it('jam with neither prompt nor code returns error', async () => {
    setEngineReady();

    const handler = getToolHandler('jam');
    const result = await handler({
      role: 'drums',
      prompt: undefined,
      code: undefined,
      added_by: undefined,
      notes: undefined,
      key: undefined,
      tempo: undefined,
    });

    expect(result.isError).toBe(true);
  });

  it('jam_preview with code returns preview without AI', async () => {
    const handler = getToolHandler('jam_preview');
    const result = await handler({ role: 'bass', prompt: undefined, code: 'note("c1").s("sine")' });
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed.role).toBe('bass');
    expect(parsed.code).toBe('note("c1").s("sine")');
    expect(parsed.preview).toBe(true);
    expect(getLayers().size).toBe(0);
  });

  it('conduct with layers creates band without AI', async () => {
    setEngineReady();

    const handler = getToolHandler('conduct');
    const result = await handler({
      directive: undefined,
      roles: undefined,
      layers: { drums: 's("bd sd")', bass: 'note("c1").s("sine")' },
    });
    const text = result.content[0].text;

    expect(text).toContain('drums');
    expect(text).toContain('bass');
    expect(text).toContain('direct code');
    expect(getLayers().size).toBe(2);
  });

  it('conduct with neither directive nor layers returns error', async () => {
    const handler = getToolHandler('conduct');
    const result = await handler({ directive: undefined, roles: undefined, layers: undefined });

    expect(result.isError).toBe(true);
  });

  it('conduct_evolve with layers updates existing layers without AI', async () => {
    setEngineReady();
    setLayer('drums', 's("bd sd")');
    setLayer('bass', 'note("c1")');
    updateAfterPlay('stack(s("bd sd"), note("c1"))', '');

    const handler = getToolHandler('conduct_evolve');
    const result = await handler({
      directive: undefined,
      stages: undefined,
      layers: { drums: 's("bd sd hh")' },
    });
    const text = result.content[0].text;

    expect(text).toContain('drums');
    expect(text).toContain('updated');
  });

  it('conduct_evolve with layers skips non-existent roles', async () => {
    setEngineReady();
    setLayer('drums', 's("bd sd")');
    updateAfterPlay('s("bd sd")', '');

    const handler = getToolHandler('conduct_evolve');
    const result = await handler({
      directive: undefined,
      stages: undefined,
      layers: { nonexistent: 's("bd")' },
    });
    const text = result.content[0].text;

    expect(text).toContain('Failed');
    expect(text).toContain('nonexistent');
  });

  it('conduct_evolve with neither directive nor layers returns error', async () => {
    setLayer('drums', 's("bd sd")');

    const handler = getToolHandler('conduct_evolve');
    const result = await handler({ directive: undefined, stages: undefined, layers: undefined });

    expect(result.isError).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// MCP Resources
// ---------------------------------------------------------------------------

describe('MCP Resources', () => {
  it('registers 3 resources', () => {
    const server = new McpServer({ name: 'test', version: '0.0.1' });
    const resourceSpy = vi.spyOn(server, 'registerResource');
    registerResources(server);
    expect(resourceSpy).toHaveBeenCalledTimes(3);
  });

  it('registers strudel://reference resource', () => {
    const server = new McpServer({ name: 'test', version: '0.0.1' });
    const resourceSpy = vi.spyOn(server, 'registerResource');
    registerResources(server);

    const calls = resourceSpy.mock.calls;
    const refCall = calls.find((c) => String(c[1]) === 'strudel://reference');
    expect(refCall).toBeDefined();
    expect(refCall![0]).toBe('Strudel Reference');
  });

  it('registers strudel://roles resource', () => {
    const server = new McpServer({ name: 'test', version: '0.0.1' });
    const resourceSpy = vi.spyOn(server, 'registerResource');
    registerResources(server);

    const calls = resourceSpy.mock.calls;
    const rolesCall = calls.find((c) => String(c[1]) === 'strudel://roles');
    expect(rolesCall).toBeDefined();
    expect(rolesCall![0]).toBe('Strudel Role Guidance');
  });

  it('registers strudel://examples resource', () => {
    const server = new McpServer({ name: 'test', version: '0.0.1' });
    const resourceSpy = vi.spyOn(server, 'registerResource');
    registerResources(server);

    const calls = resourceSpy.mock.calls;
    const examplesCall = calls.find((c) => String(c[1]) === 'strudel://examples');
    expect(examplesCall).toBeDefined();
    expect(examplesCall![0]).toBe('Strudel Examples');
  });

  it('strudel://reference callback returns content', async () => {
    const server = new McpServer({ name: 'test', version: '0.0.1' });
    const resourceSpy = vi.spyOn(server, 'registerResource');
    registerResources(server);

    const calls = resourceSpy.mock.calls;
    const refCall = calls.find((c) => String(c[1]) === 'strudel://reference');
    // The callback is the last argument
    const callback = refCall![refCall!.length - 1] as (uri: URL) => Promise<{ contents: { uri: string; text: string }[] }>;
    const result = await callback(new URL('strudel://reference'));

    expect(result.contents).toHaveLength(1);
    expect(result.contents[0].text).toContain('Strudel');
  });

  it('strudel://roles callback returns role guidance', async () => {
    const server = new McpServer({ name: 'test', version: '0.0.1' });
    const resourceSpy = vi.spyOn(server, 'registerResource');
    registerResources(server);

    const calls = resourceSpy.mock.calls;
    const rolesCall = calls.find((c) => String(c[1]) === 'strudel://roles');
    const callback = rolesCall![rolesCall!.length - 1] as (uri: URL) => Promise<{ contents: { uri: string; text: string }[] }>;
    const result = await callback(new URL('strudel://roles'));

    expect(result.contents).toHaveLength(1);
    expect(result.contents[0].text).toContain('drums');
    expect(result.contents[0].text).toContain('bass');
  });

  it('strudel://examples callback returns preset examples', async () => {
    const server = new McpServer({ name: 'test', version: '0.0.1' });
    const resourceSpy = vi.spyOn(server, 'registerResource');
    registerResources(server);

    const calls = resourceSpy.mock.calls;
    const exCall = calls.find((c) => String(c[1]) === 'strudel://examples');
    const callback = exCall![exCall!.length - 1] as (uri: URL) => Promise<{ contents: { uri: string; text: string }[] }>;
    const result = await callback(new URL('strudel://examples'));

    expect(result.contents).toHaveLength(1);
    const text = result.contents[0].text;
    expect(text).toContain('Mood');
    expect(text).toContain('Genre');
    expect(text).toContain('Activity');
    expect(text).toContain('jazz');
    expect(text).toContain('chill');
  });
});

// ---------------------------------------------------------------------------
// Evaluation failure paths on direct code params
// ---------------------------------------------------------------------------

describe('Evaluation failure paths', () => {
  function getToolHandler(toolName: string) {
    const server = new McpServer({ name: 'test', version: '0.0.1' });
    const toolSpy = vi.spyOn(server, 'tool');
    registerTools(server);
    const call = toolSpy.mock.calls.find((c) => c[0] === toolName);
    return call![call!.length - 1] as (...args: unknown[]) => Promise<{ content: { type: string; text: string }[]; isError?: boolean }>;
  }

  it('play_music with bad code returns eval error', async () => {
    setEngineReady();
    const { safeEvaluate } = await import('../audio/engine.js');
    vi.mocked(safeEvaluate).mockResolvedValueOnce({ success: false, error: 'SyntaxError: bad code' } as never);

    const handler = getToolHandler('play_music');
    const result = await handler({ prompt: undefined, code: 'invalid((' });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Evaluation error');
  });

  it('jam with bad code rolls back layer', async () => {
    setEngineReady();
    const { safeEvaluate } = await import('../audio/engine.js');
    vi.mocked(safeEvaluate).mockResolvedValueOnce({ success: false, error: 'parse error' } as never);

    const handler = getToolHandler('jam');
    const result = await handler({
      role: 'drums',
      prompt: undefined,
      code: 'invalid((',
      added_by: undefined,
      notes: undefined,
      key: undefined,
      tempo: undefined,
    });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Failed');
    // Layer should be rolled back
    expect(getLayers().has('drums')).toBe(false);
  });

  it('play_preset with eval failure returns error', async () => {
    setEngineReady();
    const { safeEvaluate } = await import('../audio/engine.js');
    vi.mocked(safeEvaluate).mockResolvedValueOnce({ success: false, error: 'engine error' } as never);

    const handler = getToolHandler('play_preset');
    const result = await handler({ name: 'jazz', category: undefined });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Preset evaluation error');
  });
});

// ---------------------------------------------------------------------------
// set_vibe without API key (fallback to preset)
// ---------------------------------------------------------------------------

describe('set_vibe fallback (no API key)', () => {
  function getToolHandler(toolName: string) {
    const server = new McpServer({ name: 'test', version: '0.0.1' });
    const toolSpy = vi.spyOn(server, 'tool');
    registerTools(server);
    const call = toolSpy.mock.calls.find((c) => c[0] === toolName);
    return call![call!.length - 1] as (...args: unknown[]) => Promise<{ content: { type: string; text: string }[]; isError?: boolean }>;
  }

  it('uses preset pattern when no API key', async () => {
    setEngineReady();
    const { findApiKey } = await import('../lib/config.js');
    vi.mocked(findApiKey).mockReturnValueOnce(undefined as unknown as string);

    const handler = getToolHandler('set_vibe');
    const result = await handler({ mood: 'chill' });

    expect(result.content[0].text).toContain('Vibe set to chill');
    expect(result.content[0].text).toContain('built-in pattern');
    expect(result.isError).toBeFalsy();
  });

  it('returns error when fallback eval fails', async () => {
    setEngineReady();
    const { findApiKey } = await import('../lib/config.js');
    const { safeEvaluate } = await import('../audio/engine.js');
    vi.mocked(findApiKey).mockReturnValueOnce(undefined as unknown as string);
    vi.mocked(safeEvaluate).mockResolvedValueOnce({ success: false, error: 'engine error' } as never);

    const handler = getToolHandler('set_vibe');
    const result = await handler({ mood: 'chill' });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Vibe fallback failed');
  });
});

// ---------------------------------------------------------------------------
// live_mix with stages_code
// ---------------------------------------------------------------------------

describe('live_mix with stages_code', () => {
  function getToolHandler(toolName: string) {
    const server = new McpServer({ name: 'test', version: '0.0.1' });
    const toolSpy = vi.spyOn(server, 'tool');
    registerTools(server);
    const call = toolSpy.mock.calls.find((c) => c[0] === toolName);
    return call![call!.length - 1] as (...args: unknown[]) => Promise<{ content: { type: string; text: string }[] }>;
  }

  it('plays single stage without delay', async () => {
    setEngineReady();

    const handler = getToolHandler('live_mix');
    const result = await handler({
      prompt: undefined,
      stages: undefined,
      stages_code: ['s("bd sd hh")'],
    });
    const text = result.content[0].text;

    expect(text).toContain('Live Mix');
    expect(text).toContain('Stage 1');
    expect(text).toContain('direct code');
    expect(text).toContain('s("bd sd hh")');
  });

  it('returns error when neither prompt nor stages_code', async () => {
    const handler = getToolHandler('live_mix');
    const result = await handler({
      prompt: undefined,
      stages: undefined,
      stages_code: undefined,
    }) as { content: { type: string; text: string }[]; isError?: boolean };

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('prompt');
    expect(result.content[0].text).toContain('stages_code');
  });
});

// ---------------------------------------------------------------------------
// conduct_evolve with layers — state verification
// ---------------------------------------------------------------------------

describe('conduct_evolve with layers (state verification)', () => {
  function getToolHandler(toolName: string) {
    const server = new McpServer({ name: 'test', version: '0.0.1' });
    const toolSpy = vi.spyOn(server, 'tool');
    registerTools(server);
    const call = toolSpy.mock.calls.find((c) => c[0] === toolName);
    return call![call!.length - 1] as (...args: unknown[]) => Promise<{ content: { type: string; text: string }[]; isError?: boolean }>;
  }

  it('updates layer code in state on success', async () => {
    setEngineReady();
    setLayer('drums', 's("bd sd")');
    updateAfterPlay('s("bd sd")', '');

    const handler = getToolHandler('conduct_evolve');
    await handler({
      directive: undefined,
      stages: undefined,
      layers: { drums: 's("bd sd hh oh")' },
    });

    // Verify the layer code was actually updated in state
    const drums = getLayers().get('drums');
    expect(drums).toBeDefined();
    expect(drums!.code).toBe('s("bd sd hh oh")');
  });

  it('rolls back layer on eval failure', async () => {
    setEngineReady();
    setLayer('drums', 's("bd sd")');
    updateAfterPlay('s("bd sd")', '');

    const { safeEvaluate } = await import('../audio/engine.js');
    vi.mocked(safeEvaluate).mockResolvedValueOnce({ success: false, error: 'eval error' } as never);

    const handler = getToolHandler('conduct_evolve');
    await handler({
      directive: undefined,
      stages: undefined,
      layers: { drums: 's("invalid")' },
    });

    // Layer should be rolled back to original
    const drums = getLayers().get('drums');
    expect(drums).toBeDefined();
    expect(drums!.code).toBe('s("bd sd")');
  });
});
