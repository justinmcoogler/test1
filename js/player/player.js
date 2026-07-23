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
    this.x = 6.5; this.y = 74; this.z = 6.5;
    this.vx = 0; this.vy = 0; this.vz = 0;
    this.yaw = Math.PI; this.pitch = -0.1;
    this.onGround = false;
    this.inWater = false;
    this.eyeHeight = 1.62;
    this.maxHp = 40; this.hp = 40;
    this.maxEnergy = 100; this.energy = 100;
    this.maxMana = 20; this.mana = 20;
    this.maxAir = 12; this.air = 12;   // seconds of breath underwater
    this.headUnder = false;
    this.sprinting = false;
    this.fallStartVy = 0;
    this.dead = false;
    this.debug = false;   // debug/creative: fly (noclip) + invulnerable
    this.bleeding = 0;    // seconds of open-wound bleeding remaining (real-world wounds)
    this.bleedDps = 0;    // health lost per second while bleeding
    this._bleedTick = 0;
    this.bodyTemp = 0.5;  // 0 = freezing … 0.5 = comfortable … 1 = overheating
    this.tempState = 'ok';// ok | cold | hypothermia | hot | heatstroke
    this._tempTick = 0;
    this.hydration = 100; // 0–100; drink to refill, thirst then dehydration below
    this.hydState = 'ok'; // ok | thirsty | dehydrated
    this.nutrition = { carb: 70, protein: 70, fat: 70, vitamin: 70 }; // food-group balance
    this.wellFed = false; this.malnourished = false;
    this._hydTick = 0; this._nutTick = 0;
  }

  eye() { return [this.x, this.y + this.eyeHeight, this.z]; }

  aabb() {
    return [this.x - W / 2, this.y, this.z - W / 2, this.x + W / 2, this.y + H, this.z + W / 2];
  }

  update(dt, input, world) {
    dt = Math.min(dt, 0.05);
    if (this.debug) { this.hp = this.maxHp; this.dead = false; this.bleeding = 0; this.bleedDps = 0; this.bodyTemp = 0.5; this.tempState = 'ok'; this.hydration = 100; this.hydState = 'ok'; this.malnourished = false; this.flyUpdate(dt, input); return; }
    if (this.dead) return;

    // open wounds bleed until dressed (Medicine) or they clot on their own
    this.tickBleed(dt);
    if (this.dead) return;

    // water state from waist position
    const wasInWater = this.inWater;
    this.inWater = world.isWater(Math.floor(this.x), Math.floor(this.y + 0.9), Math.floor(this.z));
    const feetWater = world.isWater(Math.floor(this.x), Math.floor(this.y + 0.1), Math.floor(this.z));
    if (this.inWater && !wasInWater && this.vy < -2) emit('splash', { x: this.x, y: this.y + 0.6, z: this.z });

    // breath: drain while the head is submerged, drown when it runs out
    this.headUnder = world.isWater(Math.floor(this.x), Math.floor(this.y + 1.55), Math.floor(this.z));
    if (this.headUnder) {
      this.air -= dt;
      if (this.air <= 0) {
        this.air = 0;
        this._drownT = (this._drownT || 0) + dt;
        if (this._drownT >= 1) {
          this._drownT = 0;
          this.damage(3, 'drowning');
        }
      }
    } else {
      this.air = Math.min(this.maxAir, this.air + dt * 3);
      this._drownT = 0;
    }

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

  // Debug/creative flight: no gravity, no collision (noclip). Look-relative
  // horizontal movement; Space climbs, Shift descends. Invulnerability is
  // handled in update()/damage(); this just moves the camera freely.
  flyUpdate(dt, input) {
    this.inWater = false; this.headUnder = false; this.onGround = false;
    this.air = this.maxAir; this.energy = this.maxEnergy; this.sprinting = false;
    let dx, dz;
    if (input.worldMove) { [dx, dz] = input.worldMove; }
    else {
      const [mx, mz] = input.moveVector();
      const sy = Math.sin(this.yaw), cy = Math.cos(this.yaw);
      dx = (-sy * mx) + (cy * mz);
      dz = (-cy * mx) + (-sy * mz);
    }
    const dl = Math.hypot(dx, dz);
    if (dl > 1) { dx /= dl; dz /= dl; }
    const SPEED = 15;
    let dy = 0;
    if (input.jump) dy += 1;
    if (input.sprint) dy -= 1;
    this.x += dx * SPEED * dt;
    this.z += dz * SPEED * dt;
    this.y = clamp(this.y + dy * SPEED * dt, 1, 600);
    this.vx = this.vy = this.vz = 0;
    this.mana = Math.min(this.maxMana, this.mana + 0.4 * dt);
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

  // Open a bleeding wound. Takes the worse of any existing bleed rather than
  // stacking, so repeated hits don't compound into instant death.
  applyBleed(seconds, dps) {
    if (this.debug) return;
    this.bleeding = Math.max(this.bleeding, seconds);
    this.bleedDps = Math.max(this.bleedDps, dps);
  }

  stopBleeding() {
    this.bleeding = 0; this.bleedDps = 0; this._bleedTick = 0;
  }

  // Body temperature drifts toward the felt environment temperature; clothing
  // insulation slows the drift and Constitution widens the comfort band. Outside
  // the band the body chills/overheats — mild states sap stamina, severe states
  // (hypothermia / heatstroke) cost health.
  tickTemperature(dt, target, band, insul = 0) {
    const rate = 0.05 / (1 + insul);
    this.bodyTemp += (target - this.bodyTemp) * Math.min(1, rate * dt);
    const low = 0.5 - band, high = 0.5 + band;
    let cold = 0, hot = 0, state = 'ok';
    if (this.bodyTemp < low) { cold = (low - this.bodyTemp) / Math.max(0.05, low); state = cold > 0.5 ? 'hypothermia' : 'cold'; }
    else if (this.bodyTemp > high) { hot = (this.bodyTemp - high) / Math.max(0.05, 1 - high); state = hot > 0.5 ? 'heatstroke' : 'hot'; }
    this.tempState = state;
    this._tempTick += dt;
    if (this._tempTick >= 1) {
      this._tempTick -= 1;
      if (state === 'cold' || state === 'hot') this.energy = Math.max(0, this.energy - 4);
      else if (state === 'hypothermia') this.damage(Math.max(1, Math.round(cold * 3)), 'the cold');
      else if (state === 'heatstroke') this.damage(Math.max(1, Math.round(hot * 3)), 'the heat');
    }
  }

  // Hydration drains over time (faster when hot or sprinting), refills while
  // wading in water; thirst saps stamina and dehydration costs health.
  tickHydration(dt, hot, sprinting, inWater) {
    if (inWater) {
      this.hydration = Math.min(100, this.hydration + 8 * dt);
    } else {
      let rate = 0.18;
      if (hot) rate *= 1.9;
      if (sprinting) rate += 0.15;
      this.hydration = Math.max(0, this.hydration - rate * dt);
    }
    this.hydState = this.hydration < 10 ? 'dehydrated' : this.hydration < 25 ? 'thirsty' : 'ok';
    this._hydTick += dt;
    if (this._hydTick >= 1) {
      this._hydTick -= 1;
      if (this.hydState === 'thirsty') this.energy = Math.max(0, this.energy - 3);
      else if (this.hydState === 'dehydrated') this.damage(2, 'thirst');
    }
  }

  // Food groups decay slowly (hunger). A balanced, hydrated diet slowly mends;
  // a starved group saps stamina.
  tickNutrition(dt) {
    const g = this.nutrition;
    for (const k of ['carb', 'protein', 'fat', 'vitamin']) g[k] = Math.max(0, g[k] - 0.12 * dt);
    const min = Math.min(g.carb, g.protein, g.fat, g.vitamin);
    const avg = (g.carb + g.protein + g.fat + g.vitamin) / 4;
    this.wellFed = min > 45 && avg > 60;
    this.malnourished = min < 12;
    this._nutTick += dt;
    if (this._nutTick >= 3) {
      this._nutTick -= 3;
      if (this.malnourished) this.energy = Math.max(0, this.energy - 6);
      else if (this.wellFed && this.hydration > 50 && this.bleeding <= 0 && this.tempState === 'ok') this.heal(1);
    }
  }

  // Consume a food/drink def: hydration + food-group nutrients (a plain meal
  // with no explicit nutrients feeds a little carb + protein).
  eat(def) {
    if (def.hydration) this.hydration = Math.min(100, this.hydration + def.hydration);
    const n = def.nutrients || (def.type === 'food' ? { carb: (def.heal || 4) * 0.5, protein: (def.heal || 4) * 0.5 } : null);
    if (n) for (const k in n) if (k in this.nutrition) this.nutrition[k] = Math.min(100, this.nutrition[k] + n[k]);
  }

  tickBleed(dt) {
    if (this.bleeding <= 0) return;
    this.bleeding = Math.max(0, this.bleeding - dt);
    this._bleedTick += dt;
    while (this._bleedTick >= 1) {
      this._bleedTick -= 1;
      this.damage(this.bleedDps, 'bleeding');
      if (this.dead) { this.stopBleeding(); return; }
    }
    if (this.bleeding <= 0) this.stopBleeding();
  }

  damage(amount, source = 'damage') {
    if (this.dead || this.debug) return;
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
    this.stopBleeding();
    this.bodyTemp = 0.5; this.tempState = 'ok'; this._tempTick = 0;
    this.hydration = 100; this.hydState = 'ok';
    this.nutrition = { carb: 70, protein: 70, fat: 70, vitamin: 70 };
    this.wellFed = false; this.malnourished = false;
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
