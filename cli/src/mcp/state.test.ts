import { describe, it, expect, beforeEach } from 'vitest';
import {
  getState,
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
  deleteSnapshot,
  updateAfterPlay,
  updateAfterHush,
} from './state.js';

// Reset state between tests by clearing all mutable parts.
beforeEach(() => {
  clearLayers();
  clearContext();
  // Clear snapshots by deleting each one
  for (const snap of listSnapshots()) {
    deleteSnapshot(snap.name);
  }
  updateAfterHush();
});

// ---------------------------------------------------------------------------
// Layer management
// ---------------------------------------------------------------------------

describe('Layer management', () => {
  it('setLayer stores a layer retrievable via getLayers', () => {
    setLayer('drums', 's("bd sd")');
    const layers = getLayers();
    expect(layers.size).toBe(1);
    const drums = layers.get('drums');
    expect(drums).toBeDefined();
    expect(drums!.role).toBe('drums');
    expect(drums!.code).toBe('s("bd sd")');
    expect(drums!.addedAt).toBeGreaterThan(0);
  });

  it('setLayer overwrites existing layer with same role', () => {
    setLayer('drums', 's("bd sd")');
    setLayer('drums', 's("bd hh sd hh")');
    expect(getLayers().size).toBe(1);
    expect(getLayers().get('drums')!.code).toBe('s("bd hh sd hh")');
  });

  it('setLayer accepts optional metadata', () => {
    setLayer('bass', 'note("c1").s("sawtooth")', {
      addedBy: 'agent-1',
      notes: 'deep sub',
      key: 'C minor',
      tempo: 120,
    });
    const bass = getLayers().get('bass')!;
    expect(bass.addedBy).toBe('agent-1');
    expect(bass.notes).toBe('deep sub');
    expect(bass.key).toBe('C minor');
    expect(bass.tempo).toBe(120);
  });

  it('setLayer without metadata leaves optional fields undefined', () => {
    setLayer('melody', 'note("c4")');
    const melody = getLayers().get('melody')!;
    expect(melody.addedBy).toBeUndefined();
    expect(melody.notes).toBeUndefined();
    expect(melody.key).toBeUndefined();
    expect(melody.tempo).toBeUndefined();
  });

  it('removeLayer deletes a layer and returns true', () => {
    setLayer('drums', 's("bd")');
    expect(removeLayer('drums')).toBe(true);
    expect(getLayers().size).toBe(0);
  });

  it('removeLayer returns false for non-existent role', () => {
    expect(removeLayer('nonexistent')).toBe(false);
  });

  it('clearLayers removes all layers', () => {
    setLayer('drums', 's("bd")');
    setLayer('bass', 'note("c1")');
    setLayer('melody', 'note("c4")');
    clearLayers();
    expect(getLayers().size).toBe(0);
  });

  it('composeLayers returns empty string for no layers', () => {
    expect(composeLayers()).toBe('');
  });

  it('composeLayers returns single layer code without stack()', () => {
    setLayer('drums', 's("bd sd")');
    expect(composeLayers()).toBe('s("bd sd")');
  });

  it('composeLayers wraps multiple layers in stack()', () => {
    setLayer('drums', 's("bd sd")');
    setLayer('bass', 'note("c1")');
    const composed = composeLayers();
    expect(composed).toContain('stack(');
    expect(composed).toContain('/* [drums] */');
    expect(composed).toContain('/* [bass] */');
    expect(composed).toContain('s("bd sd")');
    expect(composed).toContain('note("c1")');
  });
});

// ---------------------------------------------------------------------------
// Coding context
// ---------------------------------------------------------------------------

describe('Coding context', () => {
  it('starts as null', () => {
    expect(getContext()).toBeNull();
  });

  it('setContext stores and getContext retrieves', () => {
    setContext('debugging tests', true);
    const ctx = getContext();
    expect(ctx).not.toBeNull();
    expect(ctx!.activity).toBe('debugging tests');
    expect(ctx!.autoAdapt).toBe(true);
    expect(ctx!.updatedAt).toBeGreaterThan(0);
  });

  it('setContext overwrites previous context', () => {
    setContext('debugging', false);
    setContext('writing API', true);
    const ctx = getContext();
    expect(ctx!.activity).toBe('writing API');
    expect(ctx!.autoAdapt).toBe(true);
  });

  it('clearContext resets to null', () => {
    setContext('debugging', false);
    clearContext();
    expect(getContext()).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Snapshots
// ---------------------------------------------------------------------------

describe('Snapshots', () => {
  it('listSnapshots returns empty array initially', () => {
    expect(listSnapshots()).toEqual([]);
  });

  it('saveSnapshot captures current layers and code', () => {
    setLayer('drums', 's("bd sd")');
    setLayer('bass', 'note("c1")');
    updateAfterPlay('stack(s("bd sd"), note("c1"))', 'test');

    const snap = saveSnapshot('test-snap');
    expect(snap.name).toBe('test-snap');
    expect(snap.layers.size).toBe(2);
    expect(snap.layers.get('drums')!.code).toBe('s("bd sd")');
    expect(snap.layers.get('bass')!.code).toBe('note("c1")');
    expect(snap.composedCode).toContain('stack(');
    expect(snap.currentCode).toBe('stack(s("bd sd"), note("c1"))');
    expect(snap.savedAt).toBeGreaterThan(0);
  });

  it('saveSnapshot creates independent copy of layers', () => {
    setLayer('drums', 's("bd")');
    saveSnapshot('snap1');

    // Modify current layers after save
    setLayer('drums', 's("bd sd hh")');
    setLayer('bass', 'note("c1")');

    // Snapshot should be unchanged
    const snaps = listSnapshots();
    expect(snaps.length).toBe(1);
    expect(snaps[0].layers.size).toBe(1);
    expect(snaps[0].layers.get('drums')!.code).toBe('s("bd")');
  });

  it('listSnapshots returns all saved snapshots', () => {
    setLayer('drums', 's("bd")');
    saveSnapshot('snap1');
    saveSnapshot('snap2');
    saveSnapshot('snap3');
    const snaps = listSnapshots();
    expect(snaps.length).toBe(3);
    expect(snaps.map((s) => s.name)).toEqual(expect.arrayContaining(['snap1', 'snap2', 'snap3']));
  });

  it('loadSnapshot restores layers into state', () => {
    setLayer('drums', 's("bd sd")');
    setLayer('bass', 'note("c1")');
    saveSnapshot('restore-test');

    // Clear and verify empty
    clearLayers();
    expect(getLayers().size).toBe(0);

    // Load and verify restored
    const snap = loadSnapshot('restore-test');
    expect(snap).not.toBeNull();
    expect(getLayers().size).toBe(2);
    expect(getLayers().get('drums')!.code).toBe('s("bd sd")');
    expect(getLayers().get('bass')!.code).toBe('note("c1")');
  });

  it('loadSnapshot returns null for non-existent name', () => {
    expect(loadSnapshot('does-not-exist')).toBeNull();
  });

  it('loadSnapshot replaces current layers entirely', () => {
    setLayer('drums', 's("bd")');
    saveSnapshot('snap-a');

    clearLayers();
    setLayer('melody', 'note("c5")');
    setLayer('pads', 'note("c3 e3 g3")');
    expect(getLayers().size).toBe(2);

    loadSnapshot('snap-a');
    expect(getLayers().size).toBe(1);
    expect(getLayers().has('drums')).toBe(true);
    expect(getLayers().has('melody')).toBe(false);
    expect(getLayers().has('pads')).toBe(false);
  });

  it('deleteSnapshot removes a snapshot and returns true', () => {
    setLayer('drums', 's("bd")');
    saveSnapshot('del-test');
    expect(deleteSnapshot('del-test')).toBe(true);
    expect(listSnapshots().length).toBe(0);
  });

  it('deleteSnapshot returns false for non-existent name', () => {
    expect(deleteSnapshot('nope')).toBe(false);
  });

  it('saveSnapshot overwrites existing snapshot with same name', () => {
    setLayer('drums', 's("bd")');
    saveSnapshot('overwrite-test');

    clearLayers();
    setLayer('bass', 'note("c1")');
    saveSnapshot('overwrite-test');

    const snaps = listSnapshots();
    expect(snaps.length).toBe(1);
    expect(snaps[0].layers.size).toBe(1);
    expect(snaps[0].layers.has('bass')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Backward compatibility — original Layer interface still works
// ---------------------------------------------------------------------------

describe('Backward compatibility', () => {
  it('setLayer with 2 args (no metadata) still works', () => {
    setLayer('drums', 's("bd sd")');
    const layer = getLayers().get('drums')!;
    expect(layer.role).toBe('drums');
    expect(layer.code).toBe('s("bd sd")');
    expect(layer.addedAt).toBeGreaterThan(0);
  });

  it('composeLayers format is unchanged for single layer', () => {
    setLayer('drums', 's("bd sd hh")');
    expect(composeLayers()).toBe('s("bd sd hh")');
  });

  it('composeLayers format is unchanged for multiple layers', () => {
    setLayer('drums', 's("bd sd")');
    setLayer('bass', 'note("c1")');
    const composed = composeLayers();
    // Should be: stack(\n  /* [drums] */ ...,\n  /* [bass] */ ...\n)
    expect(composed).toMatch(/^stack\(\n/);
    expect(composed).toMatch(/\n\)$/);
  });
});
