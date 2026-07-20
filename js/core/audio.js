// Original synthesized audio: no samples, everything from oscillators/noise.
let ctx = null;
let sfxGain = null, musicGain = null;
let musicTimer = null;

export function initAudio(settings) {
  const ensure = () => {
    if (ctx) return;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      sfxGain = ctx.createGain();
      musicGain = ctx.createGain();
      sfxGain.connect(ctx.destination);
      musicGain.connect(ctx.destination);
      setVolumes(settings);
      startMusic();
    } catch { /* audio unavailable */ }
  };
  // browsers require a gesture before audio starts
  const kick = () => { ensure(); ctx?.resume?.(); };
  window.addEventListener('pointerdown', kick, { once: true });
  window.addEventListener('keydown', kick, { once: true });
}

export function setVolumes(settings) {
  if (!ctx) return;
  sfxGain.gain.value = settings.sfxVolume ?? 0.7;
  musicGain.gain.value = settings.musicVolume ?? 0.35;
}

function noise(duration) {
  const buf = ctx.createBuffer(1, ctx.sampleRate * duration, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  return src;
}

function env(gainNode, t0, attack, peak, decay) {
  gainNode.gain.setValueAtTime(0.0001, t0);
  gainNode.gain.linearRampToValueAtTime(peak, t0 + attack);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, t0 + attack + decay);
}

function blip(freq, dur, type = 'square', peak = 0.15, slide = 0) {
  if (!ctx) return;
  const t0 = ctx.currentTime;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t0 + dur);
  env(g, t0, 0.005, peak, dur);
  o.connect(g); g.connect(sfxGain);
  o.start(t0); o.stop(t0 + dur + 0.05);
}

function thud(freq, dur, peak = 0.25) {
  if (!ctx) return;
  const t0 = ctx.currentTime;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(freq, t0);
  o.frequency.exponentialRampToValueAtTime(Math.max(25, freq * 0.4), t0 + dur);
  env(g, t0, 0.004, peak, dur);
  o.connect(g); g.connect(sfxGain);
  o.start(t0); o.stop(t0 + dur + 0.05);
}

function crunch(dur = 0.15, filterFreq = 900, peak = 0.2) {
  if (!ctx) return;
  const t0 = ctx.currentTime;
  const src = noise(dur);
  const f = ctx.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = filterFreq;
  const g = ctx.createGain();
  env(g, t0, 0.003, peak, dur);
  src.connect(f); f.connect(g); g.connect(sfxGain);
  src.start(t0);
}

export const SFX = {
  uiClick: () => blip(660, 0.05, 'square', 0.08),
  uiOpen: () => blip(440, 0.08, 'triangle', 0.1, 220),
  chop: () => { thud(180, 0.1, 0.2); crunch(0.08, 1400, 0.12); },
  mineHit: () => { crunch(0.06, 2400, 0.15); thud(320, 0.05, 0.1); },
  dig: () => crunch(0.12, 700, 0.18),
  breakBlock: () => { crunch(0.2, 1000, 0.25); thud(120, 0.15, 0.2); },
  place: () => thud(240, 0.08, 0.15),
  pickup: () => blip(880, 0.07, 'sine', 0.1, 240),
  splash: () => crunch(0.25, 500, 0.18),
  xp: () => blip(1040, 0.09, 'sine', 0.07, 180),
  levelUp: () => { blip(523, 0.12, 'triangle', 0.14); setTimeout(() => blip(659, 0.12, 'triangle', 0.14), 110); setTimeout(() => blip(784, 0.2, 'triangle', 0.16), 220); },
  questDone: () => { blip(587, 0.12, 'triangle', 0.13); setTimeout(() => blip(880, 0.22, 'triangle', 0.15), 130); },
  swing: () => { if (!ctx) return; const s = noise(0.09); const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1800; const g = ctx.createGain(); env(g, ctx.currentTime, 0.01, 0.09, 0.08); s.connect(f); f.connect(g); g.connect(sfxGain); s.start(); },
  hit: () => { thud(140, 0.12, 0.26); crunch(0.06, 900, 0.1); },
  hurt: () => thud(90, 0.25, 0.3),
  miss: () => blip(300, 0.08, 'sine', 0.06, -120),
  heal: () => blip(520, 0.18, 'sine', 0.1, 260),
  victory: () => { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => blip(f, 0.16, 'triangle', 0.14), i * 130)); },
  defeat: () => { [330, 262, 196].forEach((f, i) => setTimeout(() => thud(f, 0.3, 0.2), i * 220)); },
  respawnNode: () => blip(700, 0.1, 'sine', 0.06, 200),
  toolBreak: () => { crunch(0.18, 3000, 0.2); thud(100, 0.2, 0.18); },
  bossRoar: () => { thud(60, 0.7, 0.35); setTimeout(() => crunch(0.4, 400, 0.25), 100); },
};

// Gentle ambient loop: slow arpeggios over a drifting chord progression.
const CHORDS = [
  [220, 277, 330], [196, 247, 294], [175, 220, 262], [147, 196, 247],
];
let chordIdx = 0;

function playChordPad() {
  if (!ctx) return;
  const chord = CHORDS[chordIdx % CHORDS.length];
  chordIdx++;
  const t0 = ctx.currentTime;
  for (const f of chord) {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(0.05, t0 + 2.5);
    g.gain.linearRampToValueAtTime(0.0001, t0 + 7.5);
    o.connect(g); g.connect(musicGain);
    o.start(t0); o.stop(t0 + 8);
  }
  // sparse melody notes
  const mel = chord[Math.floor(Math.random() * chord.length)] * 2;
  setTimeout(() => {
    if (!ctx) return;
    const o = ctx.createOscillator(); const g = ctx.createGain();
    o.type = 'triangle'; o.frequency.value = mel * (Math.random() < 0.5 ? 1 : 1.5);
    env(g, ctx.currentTime, 0.4, 0.035, 2.2);
    o.connect(g); g.connect(musicGain);
    o.start(); o.stop(ctx.currentTime + 3);
  }, 2000 + Math.random() * 3000);
}

function startMusic() {
  if (musicTimer) return;
  playChordPad();
  musicTimer = setInterval(playChordPad, 7000);
}
