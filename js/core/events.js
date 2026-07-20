// Tiny event bus that decouples game systems (skills ← gathering, quests ← everything).
const listeners = new Map();

export function on(event, fn) {
  if (!listeners.has(event)) listeners.set(event, new Set());
  listeners.get(event).add(fn);
  return () => listeners.get(event)?.delete(fn);
}

export function emit(event, payload) {
  const set = listeners.get(event);
  if (!set) return;
  for (const fn of [...set]) {
    try { fn(payload); }
    catch (e) { console.error(`[events] handler for "${event}" failed`, e); }
  }
}

export function clearAllListeners() {
  listeners.clear();
}
