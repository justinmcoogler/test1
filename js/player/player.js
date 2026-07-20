// First-person player: AABB physics against the voxel world, vitals, stats.
import { clamp } from '../core/math.js';
import { emit } from '../core/events.js';

const GRAVITY = -23;
const JUMP_VEL = 8.1;
const WALK = 4.4;
const SPRINT = 6.4;
const SWIM = 2.6;
const ACCEL = 42;
const AIR_ACCEL = 9;
const W = 0.6, H = 1.8;

export class Player {
  constructor() {
    this.x = 6.5; this.y = 40; this.z = 6.5;
    this.vx = 0; this.vy = 0; this.vz = 0;
    this.yaw = Math.PI; this.pitch = -0.1;
    this.onGround = false;
    this.inWater = false;
    this.eyeHeight = 1.62;
    this.maxHp = 40; this.hp = 40;
    this.maxEnergy = 100; this.energy = 100;
    this.maxMana = 20; this.mana = 20;
    this.sprinting = false;
    this.fallStartVy = 0;
    this.dead = false;
  }

  eye() { return [this.x, this.y + this.eyeHeight, this.z]; }

  aabb() {
    return [this.x - W / 2, this.y, this.z - W / 2, this.x + W / 2, this.y + H, this.z + W / 2];
  }

  update(dt, input, world) {
    if (this.dead) return;
    dt = Math.min(dt, 0.05);

    // water state from waist position
    this.inWater = world.isWater(Math.floor(this.x), Math.floor(this.y + 0.9), Math.floor(this.z));
    const feetWater = world.isWater(Math.floor(this.x), Math.floor(this.y + 0.1), Math.floor(this.z));

    // --- movement intent ---
    let dx, dz;
    if (input.worldMove) {
      // classic mode supplies a world-space direction (click-to-move / camera-relative WASD)
      [dx, dz] = input.worldMove;
    } else {
      const [mx, mz] = input.moveVector(); // forward, strafe in [-1,1]
      const sy = Math.sin(this.yaw), cy = Math.cos(this.yaw);
      // forward is -Z at yaw 0
      dx = (-sy * mx) + (cy * mz);
      dz = (-cy * mx) + (-sy * mz);
    }
    const dl = Math.hypot(dx, dz);
    if (dl > 1) { dx /= dl; dz /= dl; }

    const wantsSprint = input.sprint && dl > 0.1 && this.energy > 2 && !this.inWater;
    this.sprinting = wantsSprint;
    const speed = this.inWater ? SWIM : (wantsSprint ? SPRINT : WALK);
    if (wantsSprint) this.energy = Math.max(0, this.energy - 7 * dt);
    else this.energy = Math.min(this.maxEnergy, this.energy + 6 * dt);
    this.mana = Math.min(this.maxMana, this.mana + 0.4 * dt);

    const accel = this.onGround || this.inWater ? ACCEL : AIR_ACCEL;
    this.vx += (dx * speed - this.vx) * Math.min(1, accel * dt / speed || 0);
    this.vz += (dz * speed - this.vz) * Math.min(1, accel * dt / speed || 0);
    if (dl < 0.05 && (this.onGround || this.inWater)) {
      this.vx *= Math.max(0, 1 - 12 * dt);
      this.vz *= Math.max(0, 1 - 12 * dt);
    }

    // --- vertical ---
    if (this.inWater || feetWater) {
      this.vy += GRAVITY * 0.12 * dt;
      this.vy *= Math.max(0, 1 - 3.2 * dt);
      if (input.jump) this.vy = Math.min(this.vy + 26 * dt, 3.2);
    } else {
      this.vy += GRAVITY * dt;
      if (input.jump && this.onGround) {
        this.vy = JUMP_VEL;
        this.onGround = false;
      }
    }
    this.vy = clamp(this.vy, -40, 12);

    // --- integrate with collision, axis by axis ---
    const prevVy = this.vy;
    this.moveAxis(world, this.vx * dt, 0, 0);
    this.moveAxis(world, 0, 0, this.vz * dt);
    const wasFalling = this.vy < -11;
    const fallSpeed = -this.vy;
    this.moveAxis(world, 0, this.vy * dt, 0);

    // fall damage on landing
    if (this.onGround && wasFalling && !this.inWater && !feetWater) {
      const dmg = Math.floor((fallSpeed - 12) * 2.2);
      if (dmg > 0) this.damage(dmg, 'the fall');
    }

    // never sink below world
    if (this.y < 0.5) { this.y = 0.5; this.vy = 0; this.onGround = true; }
  }

  moveAxis(world, ax, ay, az) {
    this.x += ax; this.y += ay; this.z += az;
    if (ay < 0) this.onGround = false;

    for (let iter = 0; iter < 3; iter++) {
      const [minX, minY, minZ, maxX, maxY, maxZ] = this.aabb();
      const x0 = Math.floor(minX), x1 = Math.floor(maxX - 1e-7);
      const y0 = Math.max(0, Math.floor(minY)), y1 = Math.floor(maxY - 1e-7);
      const z0 = Math.floor(minZ), z1 = Math.floor(maxZ - 1e-7);
      let hit = false;
      for (let bx = x0; bx <= x1 && !hit; bx++) {
        for (let by = y0; by <= y1 && !hit; by++) {
          for (let bz = z0; bz <= z1 && !hit; bz++) {
            const ch = world.collisionHeight(bx, by, bz);
            if (ch <= 0) continue;
            const blockTop = by + ch;
            if (minX >= bx + 1 || maxX <= bx || minZ >= bz + 1 || maxZ <= bz) continue;
            if (minY >= blockTop || maxY <= by) continue;
            hit = true;
            if (ax > 0) { this.x = bx - W / 2 - 1e-4; this.vx = 0; }
            else if (ax < 0) { this.x = bx + 1 + W / 2 + 1e-4; this.vx = 0; }
            else if (az > 0) { this.z = bz - W / 2 - 1e-4; this.vz = 0; }
            else if (az < 0) { this.z = bz + 1 + W / 2 + 1e-4; this.vz = 0; }
            else if (ay > 0) { this.y = by - H - 1e-4; this.vy = 0; }
            else { this.y = blockTop + 1e-4; this.vy = 0; this.onGround = true; } // falling or stuck: pop onto the block
          }
        }
      }
      if (!hit) break;
    }
  }

  damage(amount, source = 'damage') {
    if (this.dead) return;
    this.hp = Math.max(0, this.hp - amount);
    emit('playerDamaged', { amount, source });
    if (this.hp <= 0) {
      this.dead = true;
      emit('playerDied', { source });
    }
  }

  heal(amount) {
    this.hp = Math.min(this.maxHp, this.hp + amount);
  }

  respawnAt(x, y, z) {
    this.x = x; this.y = y; this.z = z;
    this.vx = this.vy = this.vz = 0;
    this.hp = this.maxHp;
    this.energy = this.maxEnergy;
    this.dead = false;
  }

  serialize() {
    return {
      x: +this.x.toFixed(2), y: +this.y.toFixed(2), z: +this.z.toFixed(2),
      yaw: +this.yaw.toFixed(3), pitch: +this.pitch.toFixed(3),
      hp: this.hp, maxHp: this.maxHp, energy: Math.round(this.energy),
      mana: Math.round(this.mana), maxMana: this.maxMana,
    };
  }

  deserialize(d) {
    Object.assign(this, {
      x: d.x, y: d.y, z: d.z, yaw: d.yaw ?? Math.PI, pitch: d.pitch ?? 0,
      hp: Math.max(1, d.hp ?? this.maxHp), maxHp: d.maxHp ?? 40,
      energy: d.energy ?? 100, mana: d.mana ?? 20, maxMana: d.maxMana ?? 20,
    });
  }
}
