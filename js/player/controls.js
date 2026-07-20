// Desktop input: keyboard + pointer-lock mouse. Remappable bindings.
import { clamp } from '../core/math.js';
import { emit } from '../core/events.js';

export const DEFAULT_BINDINGS = {
  forward: 'KeyW', back: 'KeyS', left: 'KeyA', right: 'KeyD',
  jump: 'Space', sprint: 'ShiftLeft',
  inventory: 'KeyE', skills: 'KeyK', crafting: 'KeyC', quests: 'KeyJ',
  map: 'KeyM', settings: 'KeyO', interact: 'KeyF', camera: 'KeyV',
};

export class Controls {
  constructor(canvas, settings) {
    this.canvas = canvas;
    this.settings = settings;
    this.keys = new Set();
    this.bindings = { ...DEFAULT_BINDINGS, ...(settings.bindings || {}) };
    this.mouseDX = 0; this.mouseDY = 0;
    this.leftDown = false; this.rightDown = false;
    this.pointerLocked = false;
    this.enabled = true;       // false while menus/combat/dialogue are open
    this.sprintToggled = false;
    this.classicMode = false;  // RuneScape-style camera: no pointer lock
    this.orbitDX = 0; this.orbitDY = 0;   // classic-mode camera drag
    this.worldMove = null;                // classic-mode world-space steering
    this.orbitDragging = false;

    document.addEventListener('keydown', (e) => this.onKey(e, true));
    document.addEventListener('keyup', (e) => this.onKey(e, false));
    canvas.addEventListener('mousedown', (e) => {
      if (!this.enabled) return;
      if (this.classicMode) {
        if (e.button === 1) { this.orbitDragging = true; e.preventDefault(); }
        if (e.button === 2) emit('rightClick', { x: e.clientX, y: e.clientY });
        return; // left clicks are handled by the canvas click listener
      }
      if (!this.pointerLocked) { canvas.requestPointerLock?.(); return; }
      if (e.button === 0) this.leftDown = true;
      if (e.button === 2) { this.rightDown = true; emit('rightClick'); }
    });
    document.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.leftDown = false;
      if (e.button === 2) this.rightDown = false;
      if (e.button === 1) this.orbitDragging = false;
    });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    document.addEventListener('pointerlockchange', () => {
      this.pointerLocked = document.pointerLockElement === canvas;
      if (!this.pointerLocked) { this.leftDown = false; this.rightDown = false; }
    });
    document.addEventListener('mousemove', (e) => {
      if (!this.enabled) return;
      if (this.classicMode) {
        if (this.orbitDragging) { this.orbitDX += e.movementX; this.orbitDY += e.movementY; }
        return;
      }
      if (!this.pointerLocked) return;
      this.mouseDX += e.movementX;
      this.mouseDY += e.movementY;
    });
    canvas.addEventListener('wheel', (e) => {
      if (!this.enabled) return;
      emit('wheelScroll', Math.sign(e.deltaY));
      e.preventDefault();
    }, { passive: false });
  }

  onKey(e, down) {
    if (e.repeat) return;
    const tag = document.activeElement?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    if (down) this.keys.add(e.code); else this.keys.delete(e.code);

    if (!down) return;
    const b = this.bindings;
    if (e.code === 'Escape') { emit('escapePressed'); return; }
    if (/^Digit[1-8]$/.test(e.code)) { emit('hotbarSelect', parseInt(e.code.slice(5), 10) - 1); return; }
    if (!this.enabled) {
      // window shortcuts still toggle their window closed
      for (const win of ['inventory', 'skills', 'crafting', 'quests', 'map', 'settings']) {
        if (e.code === b[win]) { emit('toggleWindow', win); return; }
      }
      return;
    }
    if (e.code === b.interact) emit('interactKey');
    if (e.code === b.camera) emit('toggleCamera');
    if (e.code === b.sprint && this.settings.sprintToggle) this.sprintToggled = !this.sprintToggled;
    for (const win of ['inventory', 'skills', 'crafting', 'quests', 'map', 'settings']) {
      if (e.code === b[win]) emit('toggleWindow', win);
    }
  }

  // returns [forward, strafe] each -1..1
  moveVector() {
    if (!this.enabled) return [0, 0];
    const b = this.bindings;
    let f = 0, s = 0;
    if (this.keys.has(b.forward)) f += 1;
    if (this.keys.has(b.back)) f -= 1;
    if (this.keys.has(b.right)) s += 1;
    if (this.keys.has(b.left)) s -= 1;
    // merged externally with touch joystick
    if (this.touchMove) { f += this.touchMove[0]; s += this.touchMove[1]; }
    return [clamp(f, -1, 1), clamp(s, -1, 1)];
  }

  get jump() {
    return this.enabled && (this.keys.has(this.bindings.jump) || this.touchJump === true);
  }

  get sprint() {
    if (!this.enabled) return false;
    if (this.settings.sprintToggle) return this.sprintToggled || this.touchSprint === true;
    return this.keys.has(this.bindings.sprint) || this.touchSprint === true;
  }

  // consume accumulated mouse deltas, returns [dyaw, dpitch] in radians
  consumeLook() {
    const sens = (this.settings.sensitivity ?? 1) * 0.0024;
    const inv = this.settings.invertY ? -1 : 1;
    const dyaw = -this.mouseDX * sens + (this.touchLookDX || 0);
    const dpitch = -this.mouseDY * sens * inv + (this.touchLookDY || 0);
    this.mouseDX = 0; this.mouseDY = 0;
    this.touchLookDX = 0; this.touchLookDY = 0;
    return [dyaw, dpitch];
  }

  // classic mode: camera-orbit deltas from drag / arrow keys / touch drag
  consumeOrbit(dt) {
    const sens = (this.settings.sensitivity ?? 1) * 0.005;
    let dyaw = -this.orbitDX * sens + (this.touchLookDX || 0);
    let dpitch = -this.orbitDY * sens + (this.touchLookDY || 0);
    if (this.enabled) {
      if (this.keys.has('ArrowLeft')) dyaw += 2.2 * dt;
      if (this.keys.has('ArrowRight')) dyaw -= 2.2 * dt;
      if (this.keys.has('ArrowUp')) dpitch -= 1.6 * dt;
      if (this.keys.has('ArrowDown')) dpitch += 1.6 * dt;
    }
    this.orbitDX = 0; this.orbitDY = 0;
    this.touchLookDX = 0; this.touchLookDY = 0;
    return [dyaw, dpitch];
  }

  get primaryHeld() {
    return this.enabled && (this.leftDown || this.touchAction === true);
  }
}
