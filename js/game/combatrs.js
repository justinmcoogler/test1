// Classic combat (default): RuneScape-style in-world battles.
// Click a creature to engage; you exchange blows automatically on weapon-speed
// timers while free to move. Attack styles route XP, food heals mid-fight,
// specials cost energy/mana, and running away breaks the fight.
import { ENEMY_TYPES } from './enemies.js';
import { ITEMS } from './items.js';
import { emit } from '../core/events.js';
import { clamp } from '../core/math.js';
import { isSolid, BLOCKS } from '../world/blocks.js';

export const RS_STYLES = {
  balanced: { label: 'Balanced', icon: '⚔️', weaponSlot: 'main', kind: 'melee', desc: 'Split XP between Strength, Defense and Vitality.' },
  aggressive: { label: 'Aggressive', icon: '💢', weaponSlot: 'main', kind: 'melee', dmg: 1.15, acc: -3, desc: '+15% damage. Trains Strength.' },
  defensive: { label: 'Defensive', icon: '🛡️', weaponSlot: 'main', kind: 'melee', dmg: 0.85, guard: true, desc: '-15% damage, take less damage. Trains Defense.' },
  ranged: { label: 'Ranged', icon: '🎯', weaponSlot: 'ranged', kind: 'ranged', desc: 'Fight at distance with your bow. Trains Ranged.' },
  magic: { label: 'Magic', icon: '✨', weaponSlot: 'main', kind: 'magic', desc: 'Sling spells (costs mana). Trains Magic.' },
};

export const RS_SPECIALS = {
  power_strike: { label: 'Power Strike', icon: '💥', kind: 'melee', energy: 30, cd: 8, power: 1.7, req: ['strength', 5], desc: 'A heavy blow: +70% damage.' },
  cleave: { label: 'Cleave', icon: '🌀', kind: 'melee', energy: 40, cd: 12, power: 1.15, aoe: true, req: ['strength', 15], desc: 'Strike every foe in reach.' },
  aimed_shot: { label: 'Aimed Shot', icon: '🎯', kind: 'ranged', energy: 30, cd: 8, power: 1.6, acc: 20, req: ['ranged', 5], desc: 'Never rushes, rarely misses.' },
  ember_burst: { label: 'Ember Burst', icon: '🔥', kind: 'magic', mana: 10, cd: 10, power: 1.5, element: 'fire', req: ['magic', 10], desc: 'A roaring gout of flame.' },
  mend: { label: 'Mend', icon: '💚', kind: 'heal', mana: 6, cd: 9, req: ['healing', 1], desc: 'Knit your wounds mid-fight.' },
};

const MELEE_RANGE = 2.4;

export class CombatRS {
  constructor(game) {
    this.game = game;
    this.engaged = new Map();     // entityId → state {entity, nextAtk, telegraph, phase}
    this.target = null;           // entity the player is attacking
    this.playerNextAtk = 0;
    this.style = 'balanced';
    this.cooldowns = {};          // special id → ready-at time (world time)
    this.queuedSpecial = null;
    this.time = 0;
    this.lastLosWarn = 0;
  }

  get active() { return this.engaged.size > 0; }

  availableStyles() {
    const inv = this.game.inventory;
    const out = ['balanced', 'aggressive', 'defensive'];
    if (inv.weapon('ranged')) out.push('ranged');
    if (inv.weapon('magic')) out.push('magic');
    return out;
  }

  availableSpecials() {
    const { skills, inventory } = this.game;
    const style = RS_STYLES[this.style];
    const out = [];
    for (const [id, sp] of Object.entries(RS_SPECIALS)) {
      if (sp.req && skills.level(sp.req[0]) < sp.req[1]) continue;
      if (sp.kind !== 'heal' && sp.kind !== style.kind) continue;
      if (sp.kind === 'ranged' && !inventory.weapon('ranged')) continue;
      if (sp.kind === 'magic' && !inventory.weapon('magic')) continue;
      out.push({ id, ...sp, cdLeft: Math.max(0, (this.cooldowns[id] || 0) - this.time) });
    }
    return out;
  }

  engage(entity, byPlayer = false) {
    if (!entity || entity.hp <= 0) return;
    // aggro re-fires every tick — only act on new engagements or target switches
    if (this.engaged.has(entity.id) && (!byPlayer || this.target === entity)) return;
    if (!this.engaged.has(entity.id)) {
      this.engaged.set(entity.id, { entity, nextAtk: this.time + 0.8 + Math.random() * 0.6 });
      entity.rsEngaged = true;
      if (this.engaged.size === 1) emit('rsEngaged', { entity });
      if (entity.def.boss) emit('combatBanner', `${entity.def.label} awakens!`);
    }
    if (byPlayer || !this.target || this.target.hp <= 0) {
      this.target = entity;
      this.playerNextAtk = Math.max(this.playerNextAtk, this.time + 0.35);
    }
    emit('rsUpdate');
  }

  despawnSummons() {
    // boss adds don't linger (or multiply) once the fight resets
    for (const [id, e] of [...this.game.enemyMgr.entities]) {
      if (e.transient) {
        this.game.enemyMgr.entities.delete(id);
        this.engaged.delete(id);
      }
    }
  }

  disengageAll() {
    for (const [, st] of this.engaged) {
      st.entity.rsEngaged = false;
      st.entity.targetX = undefined;
    }
    this.engaged.clear();
    this.target = null;
    this.queuedSpecial = null;
    this.despawnSummons();
    emit('rsUpdate');
    emit('rsCombatOver');
  }

  // ---------------------------------------------------------------- update
  update(dt) {
    this.time += dt;
    const { player, world } = this.game;
    if (!this.active) return;
    if (player.dead) { this.disengageAll(); return; }

    for (const [id, st] of [...this.engaged]) {
      const e = st.entity;
      if (e.hp <= 0 || !this.game.enemyMgr.entities.has(id)) {
        this.engaged.delete(id);
        if (this.target === e) this.target = null;
        continue;
      }
      const dx = player.x - e.x, dz = player.z - e.z;
      const dist = Math.hypot(dx, dz);
      const vdist = Math.abs(player.y - e.y);

      // leash: run far enough and the creature gives up and heals
      if (dist > 17) {
        e.hp = e.def.hp;
        e.rsEngaged = false;
        this.engaged.delete(id);
        if (this.target === e) this.target = null;
        if (e.def.boss) this.despawnSummons();
        emit('rsLog', `${e.def.label} loses interest.`);
        continue;
      }

      const range = e.def.ranged ? (e.def.range || 4) + 0.5 : MELEE_RANGE * 0.8;
      // chase (ground-following, cave-aware)
      if (dist > range && e.def.moveRange > 0) {
        const sp = clamp(0.8 + e.def.speed * 0.22, 1, 3) * dt;
        const nx = e.x + (dx / dist) * sp, nz = e.z + (dz / dist) * sp;
        const gy = world.groundNear(Math.floor(nx), Math.floor(nz), e.y);
        if (gy !== null && Math.abs(gy - e.y) <= 1.6) {
          e.x = nx; e.z = nz; e.y = gy;
        }
        e.yaw = Math.atan2(dx, dz);
      } else {
        e.yaw = Math.atan2(dx, dz);
      }

      // boss mechanics
      if (e.def.boss) this.updateBoss(e, st, dist, dt);

      // telegraphed area attack resolution
      if (st.telegraph && this.time >= st.telegraph.at) {
        const t = st.telegraph;
        st.telegraph = null;
        const pd = Math.hypot(player.x - (t.cx + 0.5), player.z - (t.cz + 0.5));
        if (pd <= t.radius + 0.4 && Math.abs(player.y - t.cy) < 3) {
          this.hitPlayer(e, t.power, 'the crashing slam');
        } else {
          emit('rsLog', `You step clear of ${e.def.label}'s slam!`);
        }
      }

      // enemy auto-attack (must be roughly on your level — no biting through floors)
      if (dist <= range && vdist < 3 && this.time >= st.nextAtk && !st.telegraph) {
        st.nextAtk = this.time + clamp(3.4 - e.def.speed * 0.16, 1.7, 3.4);
        this.enemyAttack(e);
      }
    }

    // player auto-attack
    if (this.target && this.target.hp > 0 && !player.dead) {
      const style = RS_STYLES[this.style];
      const weapon = this.game.inventory.weapon(style.kind === 'melee' ? 'melee' : style.kind);
      const range = style.kind === 'melee' ? MELEE_RANGE : (weapon?.range || 6) + 0.5;
      const dx = this.target.x - player.x, dz = this.target.z - player.z;
      const dist = Math.hypot(dx, dz);
      const vOk = style.kind === 'melee' ? Math.abs(this.target.y - player.y) < 3 : true;
      if (dist <= range && vOk && this.time >= this.playerNextAtk) {
        if (style.kind !== 'melee' && !this.hasLOS(this.target)) {
          if (this.time - this.lastLosWarn > 3) {
            this.lastLosWarn = this.time;
            emit('rsLog', 'No clear line of sight!');
          }
        } else {
          const interval = style.kind === 'magic' ? 3.0 : style.kind === 'ranged' ? 2.7 : 2.4 - (weapon?.spd || 0) * 0.12;
          this.playerNextAtk = this.time + Math.max(1.5, interval);
          this.playerAttack(this.target, weapon, style);
        }
      }
    }
    emit('rsTick');
  }

  updateBoss(e, st, dist, dt) {
    // phase trigger: summon rootlings at half health
    if (!st.phase && e.hp <= e.def.hp / 2) {
      st.phase = 1;
      e.enraged = true;
      emit('combatBanner', 'The golem groans — roots burst from the floor!');
      for (let i = 0; i < 2; i++) {
        const ang = Math.random() * Math.PI * 2;
        const sx = e.x + Math.cos(ang) * 2, sz = e.z + Math.sin(ang) * 2;
        const gy = this.game.world.groundNear(Math.floor(sx), Math.floor(sz), e.y) ?? e.y;
        const id = `summon:${Math.floor(Math.random() * 1e9)}`;
        const def = ENEMY_TYPES.rootling;
        const ent = {
          id, type: 'rootling', def,
          x: sx, y: gy, z: sz, homeX: sx, homeZ: sz,
          yaw: 0, hp: def.hp, wanderT: 99, transient: true,
        };
        this.game.enemyMgr.entities.set(id, ent);
        this.engage(ent);
      }
    }
    // telegraphed slam on a cycle when the player is close
    st.slamT = (st.slamT || 6) - dt;
    if (st.slamT <= 0 && dist < 6 && !st.telegraph) {
      st.slamT = 8 + Math.random() * 3;
      const p = this.game.player;
      st.telegraph = {
        at: this.time + 1.5,
        cx: Math.floor(p.x), cy: Math.round(p.y), cz: Math.floor(p.z),
        radius: 1.6, power: 1.7,
      };
      emit('rsLog', '⚠️ The ground trembles beneath you — MOVE!');
    }
  }

  hasLOS(e) {
    const eye = this.game.player.eye();
    const tx = e.x, ty = e.y + 0.8, tz = e.z;
    const dx = tx - eye[0], dy = ty - eye[1], dz = tz - eye[2];
    const d = Math.hypot(dx, dy, dz) || 1;
    const hit = this.game.world.raycast(eye[0], eye[1], eye[2], dx / d, dy / d, dz / d, d - 0.5, false);
    return !hit || !BLOCKS[hit.id]?.opaque;
  }

  // ---------------------------------------------------------------- attacks
  playerStats(style, weapon) {
    const { skills, inventory } = this.game;
    const est = inventory.equipStats();
    if (style.kind === 'ranged') {
      return { max: (weapon?.atk || 1) + skills.level('ranged') * 0.4, acc: 62 + (weapon?.acc || 0) + skills.level('ranged') * 0.6, crit: 5 + (weapon?.crit || 0) + est.crit, skill: 'ranged', slot: 'ranged' };
    }
    if (style.kind === 'magic') {
      return { max: (weapon?.atk || 2) + skills.level('magic') * 0.45 + est.magic, acc: 65 + (weapon?.acc || 0) + skills.level('magic') * 0.5, crit: 4 + est.crit, skill: 'magic', slot: 'main', mana: 2 };
    }
    return { max: (weapon ? weapon.atk : 1.5) + skills.level('strength') * 0.4, acc: 62 + (weapon?.acc || 0) + skills.level('strength') * 0.5 + (style.acc || 0), crit: 5 + (weapon?.crit || 0) + est.crit, skill: 'strength', slot: 'main' };
  }

  playerAttack(target, weapon, style, special = null) {
    const { skills, player, inventory } = this.game;
    const stats = this.playerStats(style, weapon);
    if (stats.mana) {
      if (player.mana < stats.mana) { emit('rsLog', 'Out of mana — you jab with the staff instead.'); stats.max *= 0.4; }
      else player.mana -= stats.mana;
    }
    const targets = special?.aoe
      ? [...this.engaged.values()].map((s) => s.entity).filter((e) => e.hp > 0 && Math.hypot(e.x - player.x, e.z - player.z) <= MELEE_RANGE + 0.6)
      : [target];
    for (const t of targets) {
      const acc = clamp(stats.acc + (special?.acc || 0) - t.def.evasion, 5, 95);
      let splat, color;
      if (Math.random() * 100 > acc) {
        splat = '0'; color = '#7aa7e8';
        emit('rsLog', `You miss the ${t.def.label}.`);
      } else {
        let dmg = stats.max * (style.dmg || 1) * (special?.power || 1);
        const el = special?.element;
        if (el && t.def.weak?.includes(el)) dmg *= 1.3;
        if (el && t.def.resist?.includes(el)) dmg *= 0.7;
        dmg *= 1 - t.def.armor / (t.def.armor + 30);
        dmg *= 0.7 + Math.random() * 0.6;
        const crit = Math.random() * 100 < stats.crit;
        if (crit) dmg *= 1.6;
        dmg = Math.max(1, Math.round(dmg));
        t.hp -= dmg;
        splat = crit ? `💥${dmg}` : `${dmg}`;
        color = crit ? '#ffd166' : '#ff5d5d';
        // XP routing by style, RS-style
        const xp = dmg * 1.8;
        if (this.style === 'balanced') {
          skills.addXp('strength', xp / 2);
          skills.addXp('defense', xp / 2);
        } else if (this.style === 'defensive') {
          skills.addXp('defense', xp);
        } else {
          skills.addXp(stats.skill, xp);
        }
        skills.addXp('vitality', dmg * 0.6);
      }
      this.game.addHitsplat(t.x, t.y + 1.6, t.z, splat, color);
      if (t.hp <= 0) this.kill(t);
    }
    inventory.damageEquipped(stats.slot, 1);
    emit('rsAttack', { style: style.kind });
  }

  enemyAttack(e) {
    if (e.def.atk <= 0) return; // practice dummies just take it
    const { player, inventory, skills } = this.game;
    const est = inventory.equipStats();
    const defensive = this.style === 'defensive';
    const evasion = 5 + est.evasion + (defensive ? 5 : 0);
    const acc = clamp(e.def.acc - evasion - skills.level('defense') * 0.3, 5, 95);
    if (!this.target) this.target = e; // auto-retaliate
    if (Math.random() * 100 > acc) {
      this.game.addHitsplat(player.x, player.y + 2.0, player.z, '0', '#7aa7e8');
      emit('rsLog', `${e.def.label} misses you.`);
      if (defensive) skills.addXp('defense', 4);
      return;
    }
    if (est.block && Math.random() * 100 < est.block) {
      emit('rsLog', `🛡️ You block ${e.def.label}'s attack!`);
      skills.addXp('defense', 6);
      return;
    }
    this.hitPlayer(e, 1, e.def.label);
  }

  hitPlayer(e, power, sourceLabel) {
    const { player, inventory, skills } = this.game;
    const est = inventory.equipStats();
    const armor = est.armor + (this.style === 'defensive' ? 2 : 0);
    const atk = e.def.atk + (e.enraged ? 4 : 0);
    let dmg = atk * power * (1 - armor / (armor + 30));
    dmg *= 0.7 + Math.random() * 0.6;
    dmg = Math.max(1, Math.round(dmg));
    player.damage(dmg, sourceLabel);
    emit('rsPlayerHit', { dmg });
    skills.addXp('defense', dmg * (this.style === 'defensive' ? 1.2 : 0.4));
  }

  kill(entity) {
    const { skills, inventory, enemyMgr } = this.game;
    const def = entity.def;
    emit('rsLog', `☠️ You defeat the ${def.label}!`);
    // kill bonus xp to the active style
    const bonus = (def.xp || 10) * 0.6;
    const stats = this.playerStats(RS_STYLES[this.style], null);
    if (this.style === 'balanced') {
      skills.addXp('strength', bonus / 2);
      skills.addXp('defense', bonus / 2);
    } else skills.addXp(this.style === 'defensive' ? 'defense' : stats.skill, bonus);
    skills.addXp('vitality', (def.xp || 10) * 0.25);
    skills.addXp('tactics', (def.xp || 10) * 0.15);
    if (def.huntXp) skills.addXp('hunting', def.huntXp);
    // loot
    const loot = [];
    for (const d of def.drops || []) {
      if (Math.random() < d.chance) {
        const qty = d.qty[0] + Math.floor(Math.random() * (d.qty[1] - d.qty[0] + 1));
        inventory.add(d.item, qty);
        loot.push({ item: d.item, qty });
      }
    }
    const coins = Math.round((5 + (def.tier || 0) * 12) * (0.7 + Math.random() * 0.6));
    inventory.add('coin', coins);
    this.engaged.delete(entity.id);
    if (this.target === entity) {
      this.target = [...this.engaged.values()][0]?.entity || null;
    }
    if (entity.transient) enemyMgr.entities.delete(entity.id);
    else enemyMgr.markKilled(entity);
    emit('combatEnd', { result: 'won', types: [entity.type], rs: true, loot, coins });
    if (!this.active) emit('rsCombatOver');
    emit('rsUpdate');
  }

  // ---------------------------------------------------------------- specials
  useSpecial(id) {
    const sp = RS_SPECIALS[id];
    const { player, skills, inventory } = this.game;
    if (!sp) return false;
    if ((this.cooldowns[id] || 0) > this.time) return false;
    if (sp.energy && player.energy < sp.energy) { emit('rsLog', 'Not enough energy.'); return false; }
    if (sp.mana && player.mana < sp.mana) { emit('rsLog', 'Not enough mana.'); return false; }

    if (sp.kind === 'heal') {
      player.mana -= sp.mana;
      const heal = 8 + Math.round(skills.level('healing') * 0.8);
      player.heal(heal);
      skills.addXp('healing', heal * 1.2);
      this.game.addHitsplat(player.x, player.y + 2.0, player.z, `+${heal}`, '#6cbf5a');
      this.cooldowns[id] = this.time + sp.cd;
      emit('rsUpdate');
      return true;
    }
    if (!this.target || this.target.hp <= 0) { emit('rsLog', 'No target.'); return false; }
    const style = RS_STYLES[this.style];
    if (sp.kind !== style.kind) { emit('rsLog', `Switch to a ${sp.kind} style first.`); return false; }
    const weapon = inventory.weapon(style.kind === 'melee' ? 'melee' : style.kind);
    const range = style.kind === 'melee' ? MELEE_RANGE : (weapon?.range || 6) + 0.5;
    const dist = Math.hypot(this.target.x - player.x, this.target.z - player.z);
    if (dist > range) { emit('rsLog', 'Too far away!'); return false; }
    if (sp.energy) player.energy -= sp.energy;
    this.cooldowns[id] = this.time + sp.cd;
    this.playerAttack(this.target, weapon, style, sp);
    this.playerNextAtk = this.time + 1.2;
    emit('rsUpdate');
    return true;
  }

  telegraphTiles() {
    const out = [];
    for (const [, st] of this.engaged) {
      const t = st.telegraph;
      if (!t) continue;
      const r = Math.ceil(t.radius);
      for (let dx = -r; dx <= r; dx++) {
        for (let dz = -r; dz <= r; dz++) {
          if (Math.hypot(dx, dz) > t.radius + 0.3) continue;
          const x = t.cx + dx, z = t.cz + dz;
          const gy = this.game.world.groundNear(x, z, t.cy) ?? t.cy;
          out.push({ x, y: gy, z, color: [0.95, 0.4, 0.1] });
        }
      }
    }
    return out;
  }
}
