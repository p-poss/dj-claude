// Curated preset pattern library — moods, genres, and activities.
// Mood presets are migrated from the inline MOOD_FALLBACKS in server.ts.

export interface Preset {
  name: string;
  category: 'mood' | 'genre' | 'activity';
  description: string;
  code: string;
}

export const PRESETS: Preset[] = [
  // -------------------------------------------------------------------------
  // Moods (migrated from MOOD_FALLBACKS)
  // -------------------------------------------------------------------------
  {
    name: 'chill',
    category: 'mood',
    description: 'Relaxing lo-fi vibes — soft pads, gentle rhythms, mellow atmosphere.',
    code: `stack(
  note("c3 eb3 g3 bb3").s("sawtooth").lpf(800).gain(0.3).room(0.5).delay(0.25),
  s("bd ~ sd ~").gain(0.5),
  s("hh*8").gain(0.2).lpf(3000)
).cps(0.45)`,
  },
  {
    name: 'dark',
    category: 'mood',
    description: 'Moody and brooding — minor keys, heavy bass, atmospheric textures.',
    code: `stack(
  note("c2 ~ eb2 ~").s("sawtooth").lpf(400).gain(0.5),
  note("c4 eb4 g4 c5").s("square").lpf(1200).gain(0.15).room(0.7).delay(0.3),
  s("bd bd ~ bd sd ~ bd ~").gain(0.6),
  s("hh*4").gain(0.15).lpf(2000)
).cps(0.5)`,
  },
  {
    name: 'hype',
    category: 'mood',
    description: 'High energy — driving beats, punchy bass, adrenaline-pumping.',
    code: `stack(
  s("bd bd sd bd bd sd bd sd").gain(0.7),
  s("hh*16").gain(0.3).lpf(5000),
  note("c3 c3 eb3 c3 f3 c3 eb3 g3").s("sawtooth").lpf(2000).gain(0.4),
  s("~ cp ~ cp").gain(0.5)
).cps(0.7)`,
  },
  {
    name: 'focus',
    category: 'mood',
    description: 'Deep focus — minimal, repetitive, non-distracting ambient pulse.',
    code: `stack(
  note("c4 eb4 g4 bb4 c5 bb4 g4 eb4").s("triangle").lpf(1500).gain(0.15).room(0.6).delay(0.4),
  note("c2 ~ ~ g2 ~ ~ c2 ~").s("sine").gain(0.2)
).cps(0.35)`,
  },
  {
    name: 'funky',
    category: 'mood',
    description: 'Groovy — syncopated rhythms, bouncy basslines, playful melodies.',
    code: `stack(
  s("bd ~ bd sd ~ bd sd ~").gain(0.6),
  s("~ hh hh ~ hh hh ~ hh").gain(0.3).lpf(4000),
  note("c3 ~ eb3 c3 ~ f3 eb3 ~").s("sawtooth").lpf(1800).gain(0.35),
  s("~ ~ cp ~ ~ ~ cp ~").gain(0.4)
).cps(0.55)`,
  },
  {
    name: 'dreamy',
    category: 'mood',
    description: 'Ethereal and otherworldly — lush reverb, floating pads, gentle arpeggios.',
    code: `stack(
  note("c4 e4 g4 b4 c5 b4 g4 e4").s("sine").room(0.8).gain(0.15).delay(0.5),
  note("c3 g3 e3 b3").s("triangle").lpf(800).gain(0.1).room(0.7),
  s("~ ~ hh ~").gain(0.1).lpf(2000).delay(0.6)
).cps(0.3)`,
  },
  {
    name: 'weird',
    category: 'mood',
    description: 'Experimental and glitchy — unusual sounds, unpredictable rhythms.',
    code: `stack(
  note("c3 f#3 bb3 e4 ab2 d4 g#3 db4").s("square").lpf(2500).gain(0.25).room(0.4),
  s("bd ~ cp ~ bd bd ~ sd").gain(0.5),
  s("hh hh oh hh ~ hh oh ~").gain(0.2).lpf(3000).delay(0.3)
).cps(0.5)`,
  },
  {
    name: 'epic',
    category: 'mood',
    description: 'Cinematic and powerful — big builds, soaring melodies, legendary feel.',
    code: `stack(
  s("bd ~ ~ bd sd ~ bd sd").gain(0.7),
  s("hh*8").gain(0.25).lpf(4000),
  note("c3 g3 c4 g3 eb3 bb3 eb4 bb3").s("sawtooth").lpf(2000).gain(0.4).room(0.5),
  note("c5 eb5 g5 c6").s("square").lpf(3000).gain(0.2).room(0.6).delay(0.25),
  s("~ ~ ~ cp").gain(0.5)
).cps(0.6)`,
  },

  // -------------------------------------------------------------------------
  // Genres
  // -------------------------------------------------------------------------
  {
    name: 'jazz',
    category: 'genre',
    description: 'Smooth jazz combo — extended chords, walking bass, brushed drums.',
    code: `stack(
  note("<[c3,e3,g3,bb3] [f3,a3,c4,eb4] [bb2,d3,f3,a3] [eb3,g3,bb3,d4]>/2")
    .s("triangle").lpf(1800).gain(0.3).room(0.5),
  note("<c2 f2 bb1 eb2>/2").s("sawtooth").lpf(400).gain(0.45),
  s("hh hh [~ hh] hh").gain(0.2).lpf(3500).degradeBy(0.15),
  s("~ sd ~ sd?").gain(0.3).room(0.4),
  s("bd ~ [~ bd] ~").gain(0.5),
  s("rim(3,8)").gain(0.12).pan(0.7).delay(0.2)
).cps(0.45)`,
  },
  {
    name: 'house',
    category: 'genre',
    description: 'Classic house — four-on-the-floor, off-beat hats, filtered chords.',
    code: `stack(
  s("bd*4").gain(0.75),
  s("~ cp ~ cp").gain(0.45).room(0.3),
  s("~ hh ~ hh ~ [hh oh] ~ hh").gain(0.25).lpf(4500),
  note("<[c3,eb3,g3] ~ [ab2,c3,eb3] ~>/2")
    .s("sawtooth").lpf(sine.range(600, 2000).slow(8)).gain(0.3),
  note("c2 ~ c2 ~ ~ c2 ~ ~").s("sawtooth").lpf(300).gain(0.5)
).cps(0.55)`,
  },
  {
    name: 'techno',
    category: 'genre',
    description: 'Driving techno — industrial percussion, heavy filter automation.',
    code: `stack(
  s("bd*4").gain(0.8),
  s("~ sd ~ [sd ~]").gain(0.4).room(0.2),
  s("hh*8").gain(sine.range(0.15, 0.3).slow(4)).lpf(3000),
  s("cb(5,8)").gain(0.15).lpf(sine.range(800, 4000).slow(8)).resonance(0.3),
  note("c1 ~ c1 ~ ~ c1 ~ c1").s("sawtooth").lpf(sine.range(100, 600).slow(16)).gain(0.55),
  s("oh/4").gain(0.12).room(0.5).delay(0.3)
).cps(0.65)`,
  },
  {
    name: 'ambient',
    category: 'genre',
    description: 'Atmospheric ambient — floating pads, deep reverb, slow evolution.',
    code: `stack(
  note("<[c4,e4,g4,b4] [a3,c4,e4,g4] [f3,a3,c4,e4] [g3,b3,d4,f4]>/4")
    .s("sine").room(0.9).size(0.95).gain(0.2)
    .lpf(sine.range(500, 2000).slow(16)),
  note("<c2 a1 f1 g1>/4").s("sine").gain(0.25),
  note("e5(3,8)").s("triangle").gain(0.06).delay(0.6).delayfeedback(0.6)
    .pan(sine.slow(7)).room(0.8)
).slow(2).cps(0.35)`,
  },
  {
    name: 'dnb',
    category: 'genre',
    description: 'Drum and bass — fast breakbeats, deep sub bass, complex rhythms.',
    code: `stack(
  s("bd ~ [~ bd] ~ sd ~ [~ sd] bd").gain(0.7),
  s("[hh hh] hh [hh [hh oh]] hh").gain(0.25).lpf(5000),
  s("~ cp ~ ~").gain(0.4).room(0.3),
  note("c1 ~ ~ c1 ~ ~ c1 ~").s("sine").gain(0.6).lpf(200),
  note("<c4 ~ eb4 ~> <~ g4 ~ f4>/2").s("square").lpf(2500).gain(0.15).delay(0.3)
).cps(0.85)`,
  },
  {
    name: 'lo-fi',
    category: 'genre',
    description: 'Lo-fi hip-hop — muffled warmth, jazzy chords, tape-style beats.',
    code: `stack(
  note("<[c3,eb3,g3,bb3] [f3,ab3,c4,eb4] [ab2,c3,eb3,g3] [bb2,d3,f3,ab3]>/2")
    .s("triangle").lpf(700).gain(0.3).room(0.5),
  note("<c2 f2 ab1 bb1>/2").s("sawtooth").lpf(250).gain(0.4),
  s("bd ~ [~ bd] sd").gain(0.5).lpf(800),
  s("[~ hh]*4").gain(0.15).lpf(2000),
  s("~ ~ rim ~").gain(0.1).room(0.4).delay(0.3)
).cps(0.42)`,
  },
  {
    name: 'trap',
    category: 'genre',
    description: 'Trap beats — 808 bass, rolling hi-hats, half-time groove.',
    code: `stack(
  note("c1 ~ ~ ~ ~ ~ c1 ~").s("sawtooth").lpf(180).gain(0.6),
  s("bd ~ ~ ~ [~ bd] ~ ~ ~").gain(0.7),
  s("~ ~ ~ ~ sd ~ ~ ~").gain(0.55).room(0.3),
  s("hh*16").gain(sine.range(0.1, 0.35).slow(2)).lpf(4000),
  s("~ ~ oh ~ ~ ~ ~ oh").gain(0.15).lpf(3000)
).cps(0.55)`,
  },
  {
    name: 'disco',
    category: 'genre',
    description: 'Disco groove — syncopated bass, open hats on off-beats, chord stabs.',
    code: `stack(
  s("bd*4").gain(0.7),
  s("~ oh ~ oh").gain(0.25).lpf(4000),
  s("~ cp ~ cp").gain(0.45),
  note("c3 ~ [c3 eb3] ~ f3 ~ [eb3 c3] ~").s("sawtooth").lpf(1500).gain(0.4),
  note("<[c4,eb4,g4] ~ [f4,ab4,c5] ~>/2")
    .s("square").lpf(2500).gain(0.2)
    .attack(0.005).decay(0.15).sustain(0.05).release(0.1)
).cps(0.58)`,
  },
  {
    name: 'synthwave',
    category: 'genre',
    description: 'Retro synthwave — saw pads, arpeggiated sequences, 80s vibes.',
    code: `stack(
  note("<[c3,eb3,g3] [ab2,c3,eb3] [f2,ab2,c3] [g2,bb2,d3]>/2")
    .s("sawtooth").lpf(sine.range(400, 1800).slow(8)).gain(0.3).room(0.6).phaser(0.4),
  note("[c4,eb4,g4,bb4]").arp("up").s("square").lpf(2000).gain(0.15).delay(0.3),
  note("<c2 ab1 f1 g1>/2").s("sawtooth").lpf(300).gain(0.45),
  s("bd*4").gain(0.6),
  s("~ sd ~ sd").gain(0.4).room(0.3),
  s("[~ hh]*4").gain(0.2).lpf(3500)
).cps(0.55)`,
  },
  {
    name: 'breakbeat',
    category: 'genre',
    description: 'Breakbeat — syncopated drums, chopped breaks, heavy bass.',
    code: `stack(
  s("bd ~ [bd ~] [~ bd] sd ~ [~ sd] ~").gain(0.7),
  s("[hh [~ hh]] [hh hh] [hh [hh oh]] [hh ~]").gain(0.25).lpf(4500),
  s("cp(3,8)").gain(0.3).room(0.3).every(4, x => x.fast(2)),
  note("c2 ~ eb2 ~ c2 ~ f2 ~").s("sawtooth").lpf(500).gain(0.5),
  note("<c4 eb4 ~ f4> <~ g4 bb4 ~>/2").s("square").lpf(2000).gain(0.2).delay(0.25)
).cps(0.6)`,
  },

  // -------------------------------------------------------------------------
  // Activities
  // -------------------------------------------------------------------------
  {
    name: 'coding',
    category: 'activity',
    description: 'Music for coding — focused, minimal, non-distracting ambient pulse.',
    code: `stack(
  note("<[c4,e4,g4,b4] [a3,c4,e4,g4]>/4")
    .s("triangle").lpf(sine.range(600, 1400).slow(16)).gain(0.15).room(0.7).delay(0.4),
  note("<c2 ~ a1 ~>/4").s("sine").gain(0.2),
  s("~ ~ hh ~").gain(0.08).lpf(2000).delay(0.5),
  s("bd ~ ~ ~").gain(0.35).lpf(600)
).cps(0.35)`,
  },
  {
    name: 'studying',
    category: 'activity',
    description: 'Study music — calm lo-fi with gentle movement, keeps focus without distraction.',
    code: `stack(
  note("<[c3,eb3,g3,bb3] [f3,ab3,c4] [ab2,c3,eb3] [bb2,d3,f3]>/2")
    .s("triangle").lpf(700).gain(0.2).room(0.6),
  note("<c2 f2 ab1 bb1>/2").s("sine").lpf(300).gain(0.25),
  s("bd ~ [~ bd] ~").gain(0.4).lpf(600),
  s("[~ hh]*4").gain(0.1).lpf(1800),
  note("g4(3,8)").s("sine").gain(0.05).delay(0.5).delayfeedback(0.5).pan(sine.slow(5))
).cps(0.4)`,
  },
  {
    name: 'workout',
    category: 'activity',
    description: 'Workout energy — driving beats, high BPM, motivating intensity.',
    code: `stack(
  s("bd*4").gain(0.8),
  s("~ sd ~ [sd sd]").gain(0.55).room(0.2),
  s("hh*16").gain(sine.range(0.15, 0.35).slow(2)).lpf(5000),
  note("c2 c2 eb2 c2 f2 c2 eb2 g2").s("sawtooth").lpf(1200).gain(0.45),
  note("<[c3,eb3,g3] [f3,ab3,c4]>/2").s("square").lpf(2500).gain(0.25),
  s("~ cp ~ cp").gain(0.4)
).cps(0.7)`,
  },
  {
    name: 'relaxing',
    category: 'activity',
    description: 'Deep relaxation — slow, warm, meditative ambient soundscape.',
    code: `stack(
  note("<[c4,e4,g4,b4] [a3,c4,e4] [f3,a3,c4,e4] [g3,b3,d4]>/4")
    .s("sine").room(0.9).size(0.95).gain(0.15)
    .lpf(sine.range(400, 1200).slow(16)),
  note("<c2 a1 f1 g1>/4").s("sine").gain(0.2),
  note("e5(3,8)").s("triangle").gain(0.04).delay(0.6).delayfeedback(0.5)
    .pan(sine.slow(7)).room(0.8)
).slow(2).cps(0.3)`,
  },
];

export const PRESET_MAP = new Map(PRESETS.map((p) => [p.name, p]));
export const PRESET_NAMES = PRESETS.map((p) => p.name);

export function getPresetsByCategory(category?: Preset['category']): Preset[] {
  if (!category) return PRESETS;
  return PRESETS.filter((p) => p.category === category);
}
