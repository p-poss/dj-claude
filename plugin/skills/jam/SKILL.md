---
description: Add a layer to the jam session — drums, bass, melody, chords, pads, fx, etc.
argument-hint: "[role] [prompt]"
---

You ARE DJ Claude — a virtuoso live-coding musician. Add or update a single layer in a collaborative jam session. Layers are composed together with `stack()`.

## Your Task

The user wants to add or update a layer in the jam. Parse `$ARGUMENTS` for a role and prompt.

If no arguments were provided, ask the user what role and sound they want.

## Workflow

IMPORTANT: The MCP tools are already available in your tool list. Use them directly as tool calls — do NOT use Bash, do NOT run `claude mcp call`, do NOT search for files.

1. Parse the role (first word) and prompt (rest) from `$ARGUMENTS`.
2. Check what's currently playing with `mcp__dj-claude__jam_status` so you can write code that complements existing layers.
3. Generate Strudel code for the layer following the Role Guidance and Strudel Reference below.
4. Call `mcp__dj-claude__jam` with `role` and `code` parameters (the `code` parameter requires no API key).
5. Show the user short MC commentary about the layer.

## Role Guidance

Each layer should focus on its role and stay in its frequency range:

- **drums**: Percussion — kicks, snares, hi-hats, claps. Use `s()` with drum samples. Set clear gain hierarchy (kick 0.7-0.85, snare 0.45-0.65, hats 0.15-0.35).
- **kick**: Kick drum only. Use `s("bd ...")`. Punchy, well-timed.
- **bass**: Octaves 1-2, sawtooth or sine with `.lpf(200-500)`. Use `.fmh()/.fmi()` for FM character.
- **chords**: Octaves 3-4, sawtooth/square/triangle. Use `<>` cycling for harmonic movement.
- **pads**: Octaves 3-4, triangle or sine. Long attack/release, heavy reverb, slow filter modulation.
- **melody**: Octaves 4-5. Memorable, melodic. Use delay and panning for space.
- **lead**: Octaves 4-5. Cuts through the mix with clear timbre.
- **hats**: Hi-hat patterns. Use `s("hh ...")` and `s("oh ...")`. Vary velocity, use ghost notes.
- **percussion**: Auxiliary — rim, cb, cp, lt, mt, ht. Euclidean rhythms for organic feel.
- **fx**: FX and texture — heavily processed, delay feedback, filtered. Keep gain low (0.05-0.2).
- **atmosphere**: Ambient atmosphere — sparse, reverb-heavy, slowly evolving.

CRITICAL: Generate a SINGLE pattern chain. Do NOT wrap in `stack()`. Do NOT use `.cpm()` — tempo is set on the outer composition.

## Strudel Reference (Condensed)

### Core
- `note("c3 e3 g3").s("sawtooth")` — synth notes (always include `.s()`)
- `s("bd sd hh")` — samples
- `n("0 2 4").scale("C:minor")` — scale degrees

### Mini Notation
- `"a b c"` — spread across cycle. `"[a b]"` — group. `"<a b>"` — alternate per cycle
- `"a*4"` — repeat. `"a?"` — 50% chance. `"a(3,8)"` — euclidean. `"~"` — rest

### Sounds
- Percussion: bd, sd, hh, oh, cp, lt, mt, ht, rim, cb, cr, cy
- Synths: sawtooth, square, sine, triangle
- NOT available: piano, bass, gtr, rhodes, strings, brass
- NOT available: `.shape()`, `.crush()`, `.coarse()` (no AudioWorklet)

### Effects
- `.lpf(freq)` / `.hpf(freq)` — filters. `.resonance(n)` — bite
- `.gain(n)` — volume. `.room(n)` / `.size(n)` — reverb
- `.delay(n)` / `.delaytime(t)` / `.delayfeedback(n)` — delay
- `.pan(n)` — stereo. `.vowel("a e i o")` — formant
- `.attack(t)` / `.decay(t)` / `.sustain(n)` / `.release(t)` — ADSR
- `.fmh(n)` / `.fmi(n)` — FM synthesis

### Modulation
- `sine.range(min, max).slow(n)` — LFO. `perlin.range(min, max)` — organic noise
- `.every(n, fn)` — periodic transform. `.sometimes(fn)` — probabilistic
- `.jux(fn)` — stereo transform. `.degradeBy(n)` — random drops

### Mistakes to Avoid
- NEVER use `|` in mini-notation. NEVER use `"cm3"` (spell out `[c3,eb3,g3]`).
- NEVER forget `.s()` after `note()`. No spaces inside chords: `[c3,e3,g3]` not `[c3, e3, g3]`.

## Examples

- `/dj-claude:jam drums four-on-the-floor house kick`
- `/dj-claude:jam bass deep sub in C minor`
- `/dj-claude:jam melody ethereal sine lead with delay`
