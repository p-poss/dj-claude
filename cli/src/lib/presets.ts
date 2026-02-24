// Curated preset pattern library — moods, genres, and activities.
// All presets use .cpm() (cycles per minute) with the convention that
// 2 beats per cycle is the norm. cpm * 2 = approximate BPM.
// Patterns use ~4 events per cycle (eighth-note resolution).

export interface Preset {
  name: string;
  category: 'mood' | 'genre' | 'activity';
  description: string;
  code: string;
}

export const PRESETS: Preset[] = [
  // -------------------------------------------------------------------------
  // Moods — rich, layered, with modulation and movement
  // -------------------------------------------------------------------------
  {
    name: 'chill',
    category: 'mood',
    description: 'Relaxing lo-fi vibes — soft pads, gentle rhythms, mellow atmosphere.',
    code: `stack(
  note("<[db3,f3,ab3,c4] [ab2,c3,eb3,gb3] [gb2,bb2,db3,f3] [ab2,c3,eb3,ab3]>/2")
    .s("triangle")
    .lpf(sine.range(400, 1200).slow(8))
    .room(0.7).size(0.9)
    .gain(0.3),
  note("<db2 ab1 gb2 ab2>/2")
    .s("sawtooth")
    .lpf(250)
    .gain(0.5),
  note("<ab4 ~ [f4 gb4] ~> <~ db5 ~ [c5 bb4]>/4")
    .s("sine")
    .gain(0.12)
    .delay(0.5).delaytime(0.375).delayfeedback(0.5)
    .pan(sine.slow(5)),
  s("bd ~ [~ bd] ~")
    .gain(0.6)
    .lpf(800),
  s("~ ~ sd? ~")
    .gain(0.25)
    .room(0.5),
  s("[~ hh]*2")
    .gain(sine.range(0.08, 0.22).slow(4))
    .lpf(3000)
    .pan(sine.slow(3)),
  s("rim(3,8)")
    .gain(0.08)
    .pan(0.7)
    .delay(0.3).delayfeedback(0.4)
).cpm(52)`,
  },
  {
    name: 'dark',
    category: 'mood',
    description: 'Moody and brooding — minor keys, heavy bass, atmospheric textures.',
    code: `stack(
  note("<c1 c1 [c1 db1] c1>/2")
    .s("sine")
    .fmh(2).fmi(sine.range(1, 5).slow(4))
    .lpf(sine.range(80, 400).slow(8))
    .gain(0.65),
  note("<[c3,eb3,gb3] [c3,eb3,gb3] [db3,f3,ab3] [bb2,db3,e3]>/2")
    .s("sawtooth")
    .lpf(600)
    .attack(0.01).decay(0.3).sustain(0.1).release(0.4)
    .room(0.8).size(0.95)
    .gain(0.22),
  note("<c4 ~ eb4 ~> <~ db4 ~ bb3>/4")
    .s("sine")
    .fmh(3).fmi(1.5)
    .gain(0.12)
    .delay(0.5).delaytime(0.333).delayfeedback(0.6)
    .pan(sine.slow(5)),
  s("bd ~ bd ~")
    .gain(0.8),
  s("~ ~ [~ cp] ~")
    .gain(0.45)
    .room(0.4)
    .every(4, x => x.fast(2)),
  s("hh*4")
    .gain("<0.2 0.25 0.3 0.25>")
    .lpf(2500)
    .pan(sine.fast(2)),
  s("cb(5,8)")
    .gain(0.12)
    .lpf(sine.range(800, 3000).slow(8))
    .resonance(0.3)
).cpm(67).hpf(30)`,
  },
  {
    name: 'hype',
    category: 'mood',
    description: 'High energy — driving beats, punchy bass, adrenaline-pumping.',
    code: `stack(
  s("bd ~ bd ~")
    .gain(0.8),
  s("~ ~ sd ~")
    .gain(0.6)
    .room(0.15)
    .every(4, x => x.fast(2)),
  s("hh*8")
    .gain(saw.range(0.15, 0.35).slow(2))
    .lpf(5000),
  s("~ cp ~ cp")
    .gain(0.5),
  note("<c2 c2 eb2 c2> <f2 c2 eb2 g2>/2")
    .s("sawtooth")
    .lpf(sine.range(400, 1800).slow(4))
    .gain(0.55),
  note("<[c3,eb3,g3] [f3,ab3,c4]>/2")
    .s("square")
    .lpf(2500)
    .attack(0.005).decay(0.12).sustain(0.05).release(0.1)
    .gain(0.3)
    .superimpose(x => x.add(12).gain(0.15)),
  note("<g4 ~ [eb4 f4] g4> <c5 bb4 ~ ab4>/4")
    .s("square")
    .lpf(3000)
    .gain(0.18)
    .delay(0.2).delaytime(0.125)
).cpm(70)`,
  },
  {
    name: 'focus',
    category: 'mood',
    description: 'Deep focus — minimal, repetitive, non-distracting ambient pulse.',
    code: `stack(
  note("<[c4,e4,g4,b4] [a3,c4,e4,g4] [f3,a3,c4,e4] [g3,b3,d4,f4]>/4")
    .s("sine")
    .lpf(sine.range(500, 1800).slow(16))
    .room(0.8).size(0.95)
    .gain(0.2),
  note("<c2 a1 f1 g1>/4")
    .s("sine")
    .gain(0.2),
  note("e5(3,8)")
    .s("triangle")
    .gain(0.05)
    .delay(0.6).delayfeedback(0.6).delaytime(0.5)
    .pan(sine.slow(7))
    .room(0.8),
  note("<g5 ~ ~ ~>/4")
    .s("sine")
    .gain(0.03)
    .room(0.9).size(0.99)
    .pan(perlin.range(0.2, 0.8)),
  s("bd ~ ~ ~")
    .gain(0.35)
    .lpf(600)
    .room(0.3)
).cpm(48)`,
  },
  {
    name: 'funky',
    category: 'mood',
    description: 'Groovy — syncopated rhythms, bouncy basslines, playful melodies.',
    code: `stack(
  n("0 ~ 0 ~ ~ 3 ~ 5")
    .scale("D:dorian")
    .s("sawtooth")
    .lpf(900)
    .gain(0.55),
  n("<[0,2,4,6] ~ [3,5,7,9] [~ [4,6,8,10]]>/2")
    .scale("D:dorian")
    .s("square")
    .lpf(1800)
    .attack(0.005).decay(0.15).sustain(0.05).release(0.1)
    .gain(0.28)
    .room(0.2)
    .superimpose(x => x.add(12).gain(0.15)),
  n("<7 ~ 9 [8 7]> <~ 4 ~ 5>/4")
    .scale("D:dorian")
    .s("square")
    .lpf(2500)
    .gain(0.18)
    .delay(0.2).delaytime(0.125),
  s("bd ~ [bd ~] [~ bd]")
    .gain(0.75),
  s("~ sd ~ [sd ~ sd?]")
    .gain(0.55)
    .room(0.15),
  s("[~ hh]*2")
    .gain(0.3)
    .lpf(4000),
  s("cb(5,8)")
    .gain(perlin.range(0.05, 0.18))
    .pan(sine.slow(2))
    .every(3, x => x.rev())
).swing(0.6).cpm(62).hpf(40)`,
  },
  {
    name: 'dreamy',
    category: 'mood',
    description: 'Ethereal and otherworldly — lush reverb, floating pads, gentle arpeggios.',
    code: `stack(
  note("<[f3,a3,c4,e4] [c3,e3,g3,b3] [a2,c3,e3,g3] [d3,f3,a3,c4]>/4")
    .s("triangle")
    .lpf(sine.range(500, 2000).slow(16))
    .room(0.9).size(0.98)
    .gain(0.25),
  note("<f2 c2 a1 d2>/4")
    .s("sine")
    .gain(0.3),
  note("[f3,a3,c4,e4]")
    .arp("up")
    .s("sine")
    .lpf(2000)
    .gain(0.1)
    .delay(0.6).delaytime(0.5).delayfeedback(0.65)
    .pan(sine.slow(7)),
  note("c6(3,8)")
    .s("triangle")
    .gain(0.04)
    .delay(0.7).delaytime(0.666).delayfeedback(0.5)
    .pan(perlin.range(0, 1))
    .room(0.9),
  s("~ ~ hh? ~")
    .gain(0.08)
    .lpf(2000)
    .delay(0.5).delayfeedback(0.4)
    .room(0.6),
  s("bd/2")
    .gain(0.4)
    .room(0.5)
    .lpf(400)
).cpm(45)`,
  },
  {
    name: 'weird',
    category: 'mood',
    description: 'Experimental and glitchy — unusual sounds, unpredictable rhythms.',
    code: `stack(
  note("<c2 f#2 bb1 e2>/2")
    .s("sine")
    .fmh(3).fmi(sine.range(0.5, 6).slow(5))
    .lpf(sine.range(100, 500).slow(7))
    .gain(0.55),
  note("<[c3,f#3,bb3] [e3,bb3,d4] [ab2,d3,g3] [f#3,c4,e4]>/2")
    .s("square")
    .lpf(sine.range(800, 3000).slow(6))
    .vowel("<a e i o>")
    .resonance(0.4)
    .gain(0.2)
    .jux(x => x.rev()),
  note("<c4 f#4 ~ bb4> <~ e4 ab4 ~>/2")
    .s("sine")
    .fmh(5).fmi(2)
    .gain(0.15)
    .sometimes(x => x.speed(1.5))
    .delay(0.4).delayfeedback(0.6),
  s("bd(3,8)")
    .gain(0.65)
    .sometimes(x => x.speed(0.8)),
  s("sd(5,8)?")
    .gain(0.35)
    .room(0.4)
    .pan(rand),
  s("hh(7,16)")
    .gain(perlin.range(0.05, 0.25))
    .pan(sine.fast(3))
    .lpf(sine.range(1000, 5000).slow(3)),
  s("rim(5,12)")
    .gain(0.1)
    .delay(0.5).delayfeedback(0.7)
    .jux(x => x.fast(1.5))
    .degradeBy(0.3)
).cpm(58)`,
  },
  {
    name: 'epic',
    category: 'mood',
    description: 'Cinematic and powerful — big builds, soaring melodies, legendary feel.',
    code: `stack(
  note("<bb1 bb1 gb1 ab1>/2")
    .s("sawtooth")
    .lpf(sine.range(100, 500).slow(8))
    .gain(0.6),
  note("<[bb2,d3,f3] [bb2,d3,f3] [gb2,bb2,db3] [ab2,c3,eb3]>/2")
    .s("sawtooth")
    .lpf(sine.range(600, 2500).slow(16))
    .room(0.7).size(0.9)
    .gain(0.3)
    .superimpose(x => x.add(12).gain(0.15)),
  note("<f4 ~ [d4 eb4] f4> <bb4 ab4 ~ gb4>/4")
    .s("square")
    .lpf(3000)
    .gain(0.2)
    .phaser(0.3)
    .delay(0.3).delaytime(0.25),
  s("bd ~ bd ~")
    .gain(0.8),
  s("~ ~ sd ~")
    .gain(0.6)
    .room(0.4).size(0.7),
  s("hh*4")
    .gain(sine.range(0.12, 0.3).slow(8))
    .lpf(4000),
  s("~ ~ ~ cp")
    .gain(0.4)
    .room(0.5)
    .every(4, x => x.fast(2)),
  s("cr/4")
    .gain(0.1)
    .room(0.9).size(0.99)
    .speed(0.5)
).cpm(64).jux(x => x.rev()).hpf(30)`,
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
  note("<c2 f2 bb1 eb2>/2")
    .s("sawtooth").lpf(400).gain(0.45),
  note("<g4 ~ [e4 f4] ~> <~ bb4 ~ [a4 g4]>/4")
    .s("sine").gain(0.12)
    .delay(0.4).delaytime(0.375).delayfeedback(0.4)
    .pan(sine.slow(5)),
  s("bd ~ [~ bd] ~")
    .gain(0.5),
  s("~ ~ sd? ~")
    .gain(0.3).room(0.4),
  s("hh hh [~ hh] hh")
    .gain(0.2).lpf(3500)
    .degradeBy(0.15),
  s("rim(3,8)")
    .gain(0.1).pan(0.7)
    .delay(0.2).delayfeedback(0.3)
).cpm(55)`,
  },
  {
    name: 'house',
    category: 'genre',
    description: 'Classic house — four-on-the-floor, off-beat hats, filtered chords.',
    code: `stack(
  s("bd ~ bd ~")
    .gain(0.75),
  s("~ ~ cp ~")
    .gain(0.45).room(0.3),
  s("~ hh ~ hh")
    .gain(0.25).lpf(4500),
  s("oh/2")
    .gain(0.12).lpf(3000),
  note("<[c3,eb3,g3] ~ [ab2,c3,eb3] ~>/2")
    .s("sawtooth")
    .lpf(sine.range(600, 2000).slow(8))
    .gain(0.3),
  note("c2 ~ ~ [c2 ~]")
    .s("sawtooth").lpf(300).gain(0.5)
).cpm(62)`,
  },
  {
    name: 'techno',
    category: 'genre',
    description: 'Driving techno — industrial percussion, heavy filter automation.',
    code: `stack(
  s("bd ~ bd ~")
    .gain(0.8),
  s("~ ~ sd [~ sd]")
    .gain(0.4).room(0.2),
  s("hh*4")
    .gain(sine.range(0.15, 0.3).slow(4))
    .lpf(3000),
  s("cb(5,8)")
    .gain(0.15)
    .lpf(sine.range(800, 4000).slow(8))
    .resonance(0.3),
  note("c1 ~ c1 ~")
    .s("sawtooth")
    .lpf(sine.range(100, 600).slow(16))
    .gain(0.55),
  s("oh/4")
    .gain(0.12).room(0.5)
    .delay(0.3).delayfeedback(0.3)
).cpm(68)`,
  },
  {
    name: 'ambient',
    category: 'genre',
    description: 'Atmospheric ambient — floating pads, deep reverb, slow evolution.',
    code: `stack(
  note("<[c4,e4,g4,b4] [a3,c4,e4,g4] [f3,a3,c4,e4] [g3,b3,d4,f4]>/4")
    .s("sine").room(0.9).size(0.95).gain(0.2)
    .lpf(sine.range(500, 2000).slow(16)),
  note("<c2 a1 f1 g1>/4")
    .s("sine").gain(0.25),
  note("e5(3,8)")
    .s("triangle").gain(0.06)
    .delay(0.6).delayfeedback(0.6)
    .pan(sine.slow(7)).room(0.8),
  note("<g5 ~ ~ b5>/4")
    .s("sine").gain(0.03)
    .room(0.9).size(0.99)
    .pan(perlin.range(0.2, 0.8)),
  s("bd/2")
    .gain(0.3).lpf(400).room(0.5)
).slow(2).cpm(50)`,
  },
  {
    name: 'dnb',
    category: 'genre',
    description: 'Drum and bass — fast breakbeats, deep sub bass, complex rhythms.',
    code: `stack(
  s("bd ~ [~ bd] ~")
    .gain(0.7),
  s("~ ~ sd ~")
    .gain(0.55).room(0.3),
  s("[hh [~ hh]]*2")
    .gain(0.25).lpf(5000),
  s("~ cp ~ ~")
    .gain(0.4).room(0.3),
  note("c1 ~ ~ c1")
    .s("sine").gain(0.6).lpf(200),
  note("<c4 ~ eb4 ~> <~ g4 ~ f4>/2")
    .s("square").lpf(2500).gain(0.15)
    .delay(0.3).delayfeedback(0.3)
).cpm(88)`,
  },
  {
    name: 'lo-fi',
    category: 'genre',
    description: 'Lo-fi hip-hop — muffled warmth, jazzy chords, tape-style beats.',
    code: `stack(
  note("<[c3,eb3,g3,bb3] [f3,ab3,c4,eb4] [ab2,c3,eb3,g3] [bb2,d3,f3,ab3]>/2")
    .s("triangle").lpf(700).gain(0.3).room(0.5),
  note("<c2 f2 ab1 bb1>/2")
    .s("sawtooth").lpf(250).gain(0.4),
  note("<eb4 ~ [c4 d4] ~> <~ g4 ~ f4>/4")
    .s("sine").gain(0.1)
    .delay(0.4).delayfeedback(0.5)
    .lpf(1200).pan(sine.slow(5)),
  s("bd ~ [~ bd] sd")
    .gain(0.5).lpf(800),
  s("[~ hh]*2")
    .gain(0.15).lpf(2000),
  s("~ ~ rim ~")
    .gain(0.08).room(0.4)
    .delay(0.3).delayfeedback(0.3)
).cpm(52)`,
  },
  {
    name: 'trap',
    category: 'genre',
    description: 'Trap beats — 808 bass, rolling hi-hats, half-time groove.',
    code: `stack(
  note("c1 ~ ~ ~")
    .s("sawtooth").lpf(180).gain(0.6),
  s("bd ~ ~ ~ [~ bd] ~ ~ ~")
    .gain(0.7),
  s("~ ~ ~ ~ sd ~ ~ ~")
    .gain(0.55).room(0.3),
  s("hh*8")
    .gain(sine.range(0.1, 0.35).slow(2))
    .lpf(4000),
  s("~ ~ oh ~ ~ ~ ~ oh")
    .gain(0.15).lpf(3000),
  note("<[c3,eb3,g3] ~ ~ ~>/2")
    .s("square").lpf(1500).gain(0.15)
    .room(0.4)
).cpm(70)`,
  },
  {
    name: 'disco',
    category: 'genre',
    description: 'Disco groove — syncopated bass, open hats on off-beats, chord stabs.',
    code: `stack(
  s("bd ~ bd ~")
    .gain(0.7),
  s("~ oh ~ oh")
    .gain(0.25).lpf(4000),
  s("~ ~ cp ~")
    .gain(0.45),
  note("c3 ~ [c3 eb3] ~ f3 ~ [eb3 c3] ~")
    .s("sawtooth").lpf(1500).gain(0.4),
  note("<[c4,eb4,g4] ~ [f4,ab4,c5] ~>/2")
    .s("square").lpf(2500).gain(0.2)
    .attack(0.005).decay(0.15).sustain(0.05).release(0.1),
  s("rim(3,8)")
    .gain(0.1).pan(sine.slow(3))
).cpm(60)`,
  },
  {
    name: 'synthwave',
    category: 'genre',
    description: 'Retro synthwave — saw pads, arpeggiated sequences, 80s vibes.',
    code: `stack(
  note("<[c3,eb3,g3] [ab2,c3,eb3] [f2,ab2,c3] [g2,bb2,d3]>/2")
    .s("sawtooth")
    .lpf(sine.range(400, 1800).slow(8))
    .gain(0.3).room(0.6).phaser(0.4),
  note("[c4,eb4,g4,bb4]")
    .arp("up").s("square")
    .lpf(2000).gain(0.15)
    .delay(0.3).delayfeedback(0.4),
  note("<c2 ab1 f1 g1>/2")
    .s("sawtooth").lpf(300).gain(0.45),
  s("bd ~ bd ~")
    .gain(0.6),
  s("~ ~ sd ~")
    .gain(0.4).room(0.3),
  s("[~ hh]*2")
    .gain(0.2).lpf(3500)
).cpm(57)`,
  },
  {
    name: 'breakbeat',
    category: 'genre',
    description: 'Breakbeat — syncopated drums, chopped breaks, heavy bass.',
    code: `stack(
  s("bd ~ [bd ~] [~ bd]")
    .gain(0.7),
  s("~ ~ sd [~ sd]")
    .gain(0.55).room(0.2),
  s("[hh [~ hh]] hh [hh [hh oh]] [hh ~]")
    .gain(0.25).lpf(4500),
  s("cp(3,8)")
    .gain(0.3).room(0.3)
    .every(4, x => x.fast(2)),
  note("c2 ~ eb2 ~")
    .s("sawtooth").lpf(500).gain(0.5),
  note("<c4 eb4 ~ f4> <~ g4 bb4 ~>/2")
    .s("square").lpf(2000).gain(0.2)
    .delay(0.25).delayfeedback(0.3)
).cpm(65)`,
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
    .s("triangle")
    .lpf(sine.range(600, 1400).slow(16))
    .gain(0.15).room(0.7)
    .delay(0.4).delayfeedback(0.4),
  note("<c2 ~ a1 ~>/4")
    .s("sine").gain(0.2),
  note("g5(3,8)")
    .s("sine").gain(0.04)
    .delay(0.5).delayfeedback(0.5)
    .pan(sine.slow(5)).room(0.8),
  s("~ ~ hh ~")
    .gain(0.08).lpf(2000)
    .delay(0.5).delayfeedback(0.3),
  s("bd ~ ~ ~")
    .gain(0.35).lpf(600)
).cpm(48)`,
  },
  {
    name: 'studying',
    category: 'activity',
    description: 'Study music — calm lo-fi with gentle movement, keeps focus without distraction.',
    code: `stack(
  note("<[c3,eb3,g3,bb3] [f3,ab3,c4] [ab2,c3,eb3] [bb2,d3,f3]>/2")
    .s("triangle").lpf(700).gain(0.2).room(0.6),
  note("<c2 f2 ab1 bb1>/2")
    .s("sine").lpf(300).gain(0.25),
  note("g4(3,8)")
    .s("sine").gain(0.05)
    .delay(0.5).delayfeedback(0.5)
    .pan(sine.slow(5)),
  s("bd ~ [~ bd] ~")
    .gain(0.4).lpf(600),
  s("[~ hh]*2")
    .gain(0.1).lpf(1800),
  s("~ ~ rim? ~")
    .gain(0.06).room(0.4)
    .delay(0.3).delayfeedback(0.3)
).cpm(50)`,
  },
  {
    name: 'workout',
    category: 'activity',
    description: 'Workout energy — driving beats, high BPM, motivating intensity.',
    code: `stack(
  s("bd ~ bd ~")
    .gain(0.8),
  s("~ ~ sd [sd sd]")
    .gain(0.55).room(0.2),
  s("hh*8")
    .gain(sine.range(0.15, 0.35).slow(2))
    .lpf(5000),
  s("~ cp ~ cp")
    .gain(0.4),
  note("c2 c2 eb2 c2 f2 c2 eb2 g2")
    .s("sawtooth").lpf(1200).gain(0.45),
  note("<[c3,eb3,g3] [f3,ab3,c4]>/2")
    .s("square").lpf(2500).gain(0.25)
).cpm(70)`,
  },
  {
    name: 'relaxing',
    category: 'activity',
    description: 'Deep relaxation — slow, warm, meditative ambient soundscape.',
    code: `stack(
  note("<[c4,e4,g4,b4] [a3,c4,e4] [f3,a3,c4,e4] [g3,b3,d4]>/4")
    .s("sine").room(0.9).size(0.95).gain(0.15)
    .lpf(sine.range(400, 1200).slow(16)),
  note("<c2 a1 f1 g1>/4")
    .s("sine").gain(0.2),
  note("e5(3,8)")
    .s("triangle").gain(0.04)
    .delay(0.6).delayfeedback(0.5)
    .pan(sine.slow(7)).room(0.8),
  note("<b5 ~ g5 ~>/4")
    .s("sine").gain(0.03)
    .room(0.9).size(0.99)
    .pan(perlin.range(0.2, 0.8))
).slow(2).cpm(42)`,
  },
];

export const PRESET_MAP = new Map(PRESETS.map((p) => [p.name, p]));
export const PRESET_NAMES = PRESETS.map((p) => p.name);

export function getPresetsByCategory(category?: Preset['category']): Preset[] {
  if (!category) return PRESETS;
  return PRESETS.filter((p) => p.category === category);
}
