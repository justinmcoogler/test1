// Read it out loud.
//
// Learning Mode is aimed at children who are still learning to read — several
// of the lessons are literally about learning to read — so a lesson written on
// the screen and nowhere else is a lesson locked behind the skill it teaches.
// Every word the guide says is spoken: the story, each step, the hint when it is
// asked for, and the cheer when a step lands.
//
// This is the whole of the speech layer. It is deliberately small and total:
// every call is safe on a platform with no speech at all (node, an old browser,
// a phone with the voice data uninstalled), because a missing voice must degrade
// to a silent game and never to a broken one.
const synth = () => (typeof globalThis !== 'undefined' ? globalThis.speechSynthesis : null);

export function speechAvailable() { return !!synth() && typeof globalThis.SpeechSynthesisUtterance === 'function'; }

let enabled = true;
export function readAloudOn() { return enabled; }
export function setReadAloud(on) { enabled = !!on; if (!enabled) stopSpeaking(); }

// Pick a voice once and keep it: a lesson read by three different voices — the
// list can be repopulated asynchronously mid-session — sounds like three
// different people arguing about the same sum. English, and warmer/lighter
// where the platform offers a choice.
let chosen = null, chosenTried = false;
const PREFERRED = ['samantha', 'karen', 'moira', 'tessa', 'female', 'google uk english female', 'zira'];
function voice() {
  const s = synth();
  if (!s?.getVoices) return null;
  const list = s.getVoices();
  if (!list?.length) { chosenTried = false; return null; }   // not loaded yet — retry next time
  if (chosen && list.includes(chosen)) return chosen;
  if (chosenTried && chosen) return chosen;
  chosenTried = true;
  const en = list.filter((v) => /^en/i.test(v.lang || ''));
  const pool = en.length ? en : list;
  chosen = pool.find((v) => PREFERRED.some((p) => (v.name || '').toLowerCase().includes(p))) || pool[0];
  return chosen;
}

export function stopSpeaking() { try { synth()?.cancel(); } catch { /* no voice, no problem */ } }

// Say these, in order. Later calls interrupt earlier ones by default — a child
// who clicks past a step should not have to wait out the sentence they skipped.
export function speak(text, { interrupt = true, rate = 0.92, pitch = 1.08 } = {}) {
  if (!enabled || !speechAvailable()) return false;
  const lines = (Array.isArray(text) ? text : [text]).filter(Boolean).map(String);
  if (!lines.length) return false;
  const s = synth();
  try {
    if (interrupt) s.cancel();
    for (const line of lines) {
      const u = new globalThis.SpeechSynthesisUtterance(line);
      const v = voice();
      if (v) { u.voice = v; u.lang = v.lang || 'en-US'; }
      u.rate = rate; u.pitch = pitch; u.volume = 1;
      s.speak(u);
    }
    return true;
  } catch {
    return false;                 // speech is a bonus, never a dependency
  }
}
