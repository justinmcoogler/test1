// Mobile touch controls: virtual joystick, camera drag, context action buttons.
export function isTouchDevice() {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

export class TouchControls {
  constructor(controls, settings) {
    this.controls = controls;
    this.settings = settings;
    this.root = document.getElementById('touch-ui');
    this.joyBase = document.getElementById('joystick-base');
    this.joyKnob = document.getElementById('joystick-knob');
    this.camZone = document.getElementById('camera-zone');
    this.joyZone = document.getElementById('joystick-zone');
    this.btnJump = document.getElementById('btn-jump');
    this.btnSprint = document.getElementById('btn-sprint');
    this.btnAction = document.getElementById('btn-action');
    this.btnPlace = document.getElementById('btn-place');
    this.joyPointer = null;
    this.camPointer = null;
    this.camLast = null;
    this.sprintOn = false;
    this.onTap = null; // set by main: short taps interact/select
    this.bind();
  }

  show() { this.root.classList.remove('hidden'); }
  hide() { this.root.classList.add('hidden'); }

  bind() {
    const c = this.controls;
    // --- joystick ---
    this.joyZone.addEventListener('pointerdown', (e) => {
      if (this.joyPointer !== null) return;
      this.joyPointer = e.pointerId;
      this.joyZone.setPointerCapture(e.pointerId);
      this.moveKnob(e);
    });
    this.joyZone.addEventListener('pointermove', (e) => {
      if (e.pointerId !== this.joyPointer) return;
      this.moveKnob(e);
    });
    const endJoy = (e) => {
      if (e.pointerId !== this.joyPointer) return;
      this.joyPointer = null;
      c.touchMove = null;
      this.joyKnob.style.transform = 'translate(-50%, -50%)';
    };
    this.joyZone.addEventListener('pointerup', endJoy);
    this.joyZone.addEventListener('pointercancel', endJoy);

    // --- camera drag + tap detect ---
    this.camZone.addEventListener('pointerdown', (e) => {
      if (this.camPointer !== null) return;
      this.camPointer = e.pointerId;
      this.camZone.setPointerCapture(e.pointerId);
      this.camLast = [e.clientX, e.clientY];
      this.camStart = [e.clientX, e.clientY, performance.now()];
    });
    this.camZone.addEventListener('pointermove', (e) => {
      if (e.pointerId !== this.camPointer || !this.camLast) return;
      const sens = (this.settings.sensitivity ?? 1) * 0.005;
      const inv = this.settings.invertY ? -1 : 1;
      c.touchLookDX = (c.touchLookDX || 0) - (e.clientX - this.camLast[0]) * sens;
      c.touchLookDY = (c.touchLookDY || 0) - (e.clientY - this.camLast[1]) * sens * inv;
      this.camLast = [e.clientX, e.clientY];
    });
    const endCam = (e) => {
      if (e.pointerId !== this.camPointer) return;
      if (this.camStart) {
        const dt = performance.now() - this.camStart[2];
        const dist = Math.hypot(e.clientX - this.camStart[0], e.clientY - this.camStart[1]);
        if (dt < 260 && dist < 12 && this.settings.tapToInteract && this.onTap) this.onTap();
      }
      this.camPointer = null;
      this.camLast = null;
    };
    this.camZone.addEventListener('pointerup', endCam);
    this.camZone.addEventListener('pointercancel', endCam);

    // --- buttons ---
    const hold = (el, prop) => {
      el.addEventListener('pointerdown', (e) => { e.preventDefault(); c[prop] = true; el.classList.add('on'); });
      const off = () => { c[prop] = false; el.classList.remove('on'); };
      el.addEventListener('pointerup', off);
      el.addEventListener('pointercancel', off);
      el.addEventListener('pointerleave', off);
    };
    hold(this.btnJump, 'touchJump');
    hold(this.btnAction, 'touchAction');
    this.btnSprint.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this.sprintOn = !this.sprintOn;
      c.touchSprint = this.sprintOn;
      this.btnSprint.classList.toggle('on', this.sprintOn);
    });
    this.onPlace = null; // set by main
    this.btnPlace.addEventListener('pointerdown', (e) => { e.preventDefault(); this.onPlace?.(); });
  }

  moveKnob(e) {
    const rect = this.joyBase.getBoundingClientRect();
    const cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
    let dx = e.clientX - cx, dy = e.clientY - cy;
    const max = rect.width / 2;
    const len = Math.hypot(dx, dy);
    if (len > max) { dx = dx / len * max; dy = dy / len * max; }
    this.joyKnob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    // forward = -dy, strafe = dx
    this.controls.touchMove = [-dy / max, dx / max];
  }
}
