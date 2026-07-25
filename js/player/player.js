// First-person player: AABB physics against the voxel world, vitals, stats.
import { clamp } from '../core/math.js';
import { emit } from '../core/events.js';
import { DIVE_RATE } from '../game/mounts.js';

const GRAVITY = -23;
const JUMP_VEL = 8.1;
const WALK = 4.4;
const SPRINT = 6.4;
const SWIM = 2.6;
const ACCEL = 42;
const AIR_ACCEL = 9;
const W = 0.6, H = 1.8;
// Blocks this low (carpet 1/16, a closed trapdoor 2/16) hold you up from above
// but never block a horizontal step — you walk over them instead of the edge
// stopping you dead.
const WALKOVER = 0.2;
// How high a ledge you walk straight up instead of having to jump. A full block
// plus a hair, because a one-block riser is the unit this world is built in:
// js/game/pathfind.js routes over anything `ny - cur.y <= 1`, the roads grade to
// a maximum one-block step, and every stair flight in js/world/town.js is
// one-block risers. Before this existed the pathfinder and the physics disagreed
// — click-to-move would route you up a stair and hop it, while walking into the
// same stair on WASD stopped you dead against what is, to the collider, a full
// cube (SHAPE_COLLISION.stairs is 1). Steps and staircases were unwalkable by
// hand. Stepping is strictly a grounded move; in the air you still have to jump.
const STEP_H = 1.05;

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
    this.mountDef = null; // MOUNTS entry while riding, else null (js/game/mounts.js)
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
    // Riding replaces walking entirely — see rideUpdate. Checked before
    // debug flight so a creative-mode player still gets noclip.
    if (!this.debug && this.mountDef) { this.rideUpdate(dt, input, world, this.mountDef); return; }
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

  // Riding. Unlike debug flight this COLLIDES: you land on an island, you are
  // stopped by its keel, and you can be swatted out of the air. The differences
  // from walking are that gravity is replaced by the mount holding altitude, and
  // that the mount has a hard CEILING it will not climb past — which is what
  // makes the sky bands a progression rather than one unlock (js/game/mounts.js).
  //
  // `def` is a MOUNTS entry. A ground mount (flying:false) just walks faster:
  // it falls under gravity and cannot leave the floor, so the same code path
  // teaches the controls you will fly with.
  rideUpdate(dt, input, world, def) {
    this.inWater = false; this.headUnder = false;
    this.air = this.maxAir; this.sprinting = false;

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

    if (!def.flying) {
      // A horse. Gravity as usual, just quicker over the ground.
      this.vx = dx * def.speed; this.vz = dz * def.speed;
      this.vy += GRAVITY * dt;
      if (input.jump && this.onGround) { this.vy = JUMP_VEL; this.onGround = false; }
      this.vy = clamp(this.vy, -40, 12);
      this.moveAxis(world, this.vx * dt, 0, 0);
      this.moveAxis(world, 0, 0, this.vz * dt);
      this.moveAxis(world, 0, this.vy * dt, 0);
      if (this.y < 0.5) { this.y = 0.5; this.vy = 0; this.onGround = true; }
      return;
    }

    // Flying. Space climbs, Shift dives, and letting go of both holds altitude —
    // no gravity, so a mount cannot drop you by accident.
    let dy = 0;
    if (input.jump) dy += def.climb;
    if (input.sprint) dy -= DIVE_RATE;
    // The ceiling. It is a soft stop rather than a wall: the climb is refused,
    // the mount keeps flying level, and descending always works — so a ceiling
    // can strand nobody, wherever they are when they hit it.
    if (dy > 0 && this.y >= def.ceiling) dy = 0;
    if (dy > 0 && this.y + dy * dt > def.ceiling) dy = (def.ceiling - this.y) / dt;

    this.vx = dx * def.speed; this.vz = dz * def.speed; this.vy = dy;
    this.moveAxis(world, this.vx * dt, 0, 0);
    this.moveAxis(world, 0, 0, this.vz * dt);
    this.moveAxis(world, 0, dy * dt, 0);
    // Landing on an island sets onGround through moveAxis; riders take no fall
    // damage, because the mount is doing the falling.
    this.fallStartVy = 0;
    if (this.y < 0.5) { this.y = 0.5; this.onGround = true; }
  }

  // Is the player's box clear of the world at this position? Used by the step-up
  // to check a candidate stance before committing to it, so we never step into a
  // low doorway head or a shelf and end up inside geometry.
  fits(world, x, y, z) {
    const x0 = Math.floor(x - W / 2), x1 = Math.floor(x + W / 2 - 1e-7);
    const y0 = Math.max(0, Math.floor(y + 1e-4)), y1 = Math.floor(y + H - 1e-7);
    const z0 = Math.floor(z - W / 2), z1 = Math.floor(z + W / 2 - 1e-7);
    for (let bx = x0; bx <= x1; bx++) {
      for (let by = y0; by <= y1; by++) {
        for (let bz = z0; bz <= z1; bz++) {
          const ch = world.collisionHeight(bx, by, bz);
          if (ch <= 0) continue;
          if (by + ch <= y + 1e-4) continue;   // entirely below the feet: it's floor, not an obstruction
          return false;
        }
      }
    }
    return true;
  }

  moveAxis(world, ax, ay, az) {
    this.x += ax; this.y += ay; this.z += az;
    if (ay < 0) this.onGround = false;

    for (let iter = 0; iter < 3; iter++) {
      const [minX, minY, minZ, maxX, maxY, maxZ] = this.aabb();
      const x0 = Math.floor(minX), x1 = Math.floor(maxX - 1e-7);
      const y0 = Math.max(0, Math.floor(minY)), y1 = Math.floor(maxY - 1e-7);
      const z0 = Math.floor(minZ), z1 = Math.floor(maxZ - 1e-7);
      let hit = false, stepped = false;
      for (let bx = x0; bx <= x1 && !hit; bx++) {
        for (let by = y0; by <= y1 && !hit; by++) {
          for (let bz = z0; bz <= z1 && !hit; bz++) {
            const ch = world.collisionHeight(bx, by, bz);
            if (ch <= 0) continue;
            if ((ax !== 0 || az !== 0) && ch <= WALKOVER) continue; // walk over low lips, don't bump them
            const blockTop = by + ch;
            if (minX >= bx + 1 || maxX <= bx || minZ >= bz + 1 || maxZ <= bz) continue;
            if (minY >= blockTop || maxY <= by) continue;
            hit = true;
            // Before treating it as a wall: can we just step up onto it? Only
            // from the ground, only up to STEP_H, only if the whole body fits at
            // the new height, and only onto a STAIR OR SLAB. A full block is a
            // wall you jump — auto-stepping those made every kerb, ledge and
            // one-block terrain rise climbable by walking into it, which is not
            // what a step is. Keeping the horizontal position means the step
            // costs no speed, so a staircase feels like a ramp, not a hop.
            if ((ax !== 0 || az !== 0) && this.onGround && this.vy <= 0
                && world.isStep(bx, by, bz)) {
              const rise = blockTop - this.y;
              if (rise > 0 && rise <= STEP_H && this.fits(world, this.x, blockTop + 1e-4, this.z)) {
                this.y = blockTop + 1e-4;
                this.vy = 0;
                this.onGround = true;
                stepped = true;
                break;                 // the box just moved; rescan from the new stance
              }
            }
            if (ax > 0) { this.x = bx - W / 2 - 1e-4; this.vx = 0; }
            else if (ax < 0) { this.x = bx + 1 + W / 2 + 1e-4; this.vx = 0; }
            else if (az > 0) { this.z = bz - W / 2 - 1e-4; this.vz = 0; }
            else if (az < 0) { this.z = bz + 1 + W / 2 + 1e-4; this.vz = 0; }
            else if (ay > 0) { this.y = by - H - 1e-4; this.vy = 0; }
            else { this.y = blockTop + 1e-4; this.vy = 0; this.onGround = true; } // falling or stuck: pop onto the block
          }
        }
      }
      if (stepped) continue;   // re-resolve against a freshly computed box
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
      if (state === 'cold' || state === 'hot') {
        this.energy = Math.max(0, this.energy - 4);
      } else if (state === 'hypothermia' || state === 'heatstroke') {
        // Exposure weakens but won't kill outright: it can't drop you below 20%
        // HP. You're incapacitated and must warm up / cool down — cold alone
        // never finishes an unprepared player, but it leaves you easy prey.
        const floor = this.maxHp * 0.2;
        const sev = state === 'hypothermia' ? cold : hot;
        const dmg = Math.min(Math.max(1, Math.round(sev * 2)), this.hp - floor);
        if (dmg > 0) this.damage(dmg, state === 'hypothermia' ? 'the cold' : 'the heat');
      }
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
    // x/y/z may be absent: a character carried into a NEW world arrives with a
    // body but no coordinate (js/game/characters.js), and main.js then seats
    // them at that world's spawn. Keeping the current value rather than taking
    // `undefined` is what makes that land somewhere real instead of at NaN.
    Object.assign(this, {
      x: d.x ?? this.x, y: d.y ?? this.y, z: d.z ?? this.z,
      yaw: d.yaw ?? Math.PI, pitch: d.pitch ?? 0,
      hp: Math.max(1, d.hp ?? this.maxHp), maxHp: d.maxHp ?? 40,
      energy: d.energy ?? 100, mana: d.mana ?? 20, maxMana: d.maxMana ?? 20,
    });
  }
}
