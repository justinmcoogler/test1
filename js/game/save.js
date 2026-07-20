// Save slots in localStorage + settings. Autosave handled by main loop.
const SLOT_PREFIX = 'emberveil_slot_';
const SETTINGS_KEY = 'emberveil_settings';
export const NUM_SLOTS = 3;

export const DEFAULT_SETTINGS = {
  tacticalCombat: false, // false = classic auto-exchange battles (default)
  classicCamera: false,  // true = RuneScape-style third-person view + click-to-move
  renderDistance: 4,
  sensitivity: 1,
  invertY: false,
  uiScale: 1,
  textScale: 1,
  reducedMotion: false,
  screenShake: true,
  colorblind: false,
  sprintToggle: false,
  leftHanded: false,
  tapToInteract: true,
  sfxVolume: 0.7,
  musicVolume: 0.35,
  shadows: true,
  graphicsPreset: 'auto', // auto|low|high
  bindings: {},
};

export function loadSettings() {
  // embedded builds (shared artifact page) can't capture the mouse, so the
  // cursor-driven classic view is the sensible fresh default there
  const embeddedDefaults = typeof window !== 'undefined' && window.__EMBEDDED
    ? { ...DEFAULT_SETTINGS, classicCamera: true }
    : DEFAULT_SETTINGS;
  let s;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    s = raw ? { ...embeddedDefaults, ...JSON.parse(raw) } : { ...embeddedDefaults };
  } catch {
    s = { ...embeddedDefaults };
  }
  // Combat is RuneScape-style, full stop. The old tactical-grid toggle could
  // linger in saved settings — override it so no one gets stuck in grid battles.
  s.tacticalCombat = false;
  return s;
}

export function saveSettings(s) {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch { /* private mode */ }
}

export function listSlots() {
  const out = [];
  for (let i = 1; i <= NUM_SLOTS; i++) {
    try {
      const raw = localStorage.getItem(SLOT_PREFIX + i);
      if (!raw) { out.push({ slot: i, empty: true }); continue; }
      const d = JSON.parse(raw);
      out.push({
        slot: i, empty: false,
        seedText: d.meta?.seedText || String(d.world?.seed ?? '?'),
        totalLevel: d.meta?.totalLevel || 0,
        playtime: d.meta?.playtime || 0,
        savedAt: d.meta?.savedAt || 0,
      });
    } catch {
      out.push({ slot: i, empty: true, corrupt: true });
    }
  }
  return out;
}

export function saveSlot(slot, data) {
  try {
    localStorage.setItem(SLOT_PREFIX + slot, JSON.stringify(data));
    return true;
  } catch (e) {
    console.error('save failed', e);
    return false;
  }
}

export function loadSlot(slot) {
  try {
    const raw = localStorage.getItem(SLOT_PREFIX + slot);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function deleteSlot(slot) {
  localStorage.removeItem(SLOT_PREFIX + slot);
}
