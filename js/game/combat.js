// Tactical turn-based combat on a grid carved out of the live voxel terrain.
// Turn order from speed; move + one action per turn; height, cover, statuses,
// elements, telegraphs, multi-phase bosses.
import { B, BLOCKS, isSolid } from '../world/blocks.js';
import { ENEMY_TYPES } from './enemies.js';
import { mobDropsFor } from './mobconfig.js';
import { ITEMS } from './items.js';
import { emit } from '../core/events.js';
import { clamp } from '../core/math.js';

export const ABILITIES = {
  // ---- player basics (by weapon style) ----
  strike: { label: 'Strike', style: 'melee', range: 1, power: 1, desc: 'A basic melee attack.' },
  shot: { label: 'Loose Arrow', style: 'ranged', range: 6, power: 1, desc: 'A basic ranged attack. Needs line of sight.' },
  spark: { label: 'Emberbolt', style: 'magic', range: 5, power: 1, mana: 3, element: 'fire', frontier: true, desc: 'A dart of flame. Fantasy Frontier only.' },
  // ---- unlockable player abilities ----
  power_strike: { label: 'Power Strike', style: 'melee', range: 1, power: 1.6, energy: 25, cd: 2, accMod: -5, req: ['strength', 5], desc: 'A heavy blow: +60% damage, slightly less accurate.' },
  cleave: { label: 'Cleave', style: 'melee', range: 1, power: 1.1, energy: 35, cd: 3, aoeAdjacent: true, req: ['strength', 15], desc: 'Strike every adjacent enemy.' },
  aimed_shot: { label: 'Aimed Shot', style: 'ranged', range: 6, power: 1.5, energy: 25, cd: 2, accMod: 15, req: ['ranged', 5], desc: 'Take a breath. +50% damage, +15 accuracy.' },
  pinning_shot: { label: 'Pinning Shot', style: 'ranged', range: 6, power: 1.0, energy: 30, cd: 3, status: { id: 'slow', turns: 2, chance: 0.9 }, req: ['ranged', 15], desc: 'Slows the target for 2 turns.' },
  frost_bind: { label: 'Frostbind', style: 'magic', range: 5, power: 0.7, mana: 6, cd: 2, element: 'ice', status: { id: 'slow', turns: 2, chance: 0.9 }, req: ['magic', 5], frontier: true, desc: 'Icy grip: damage + slow. Fantasy Frontier only.' },
  ember_burst: { label: 'Ember Burst', style: 'magic', range: 4, power: 0.9, mana: 10, cd: 3, aoe: 1, element: 'fire', req: ['magic', 10], frontier: true, desc: 'Explodes in a 3×3 area. Fantasy Frontier only.' },
  bandage: { label: 'Bandage', style: 'heal', range: 0, energy: 20, cd: 2, req: ['healing', 1], desc: 'Field first aid — dress wounds. No magic; trains Medicine.' },
  mend: { label: 'Mend', style: 'heal', range: 0, mana: 5, cd: 2, req: ['healing', 1], frontier: true, desc: 'Restore health with a spell. Fantasy Frontier only.' },
  rally: { label: 'Rally', style: 'heal', range: 0, mana: 12, cd: 4, buff: { id: 'atkUp', turns: 3 }, req: ['healing', 15], frontier: true, desc: 'Heal and bolster your attacks. Fantasy Frontier only.' },
  // ---- enemy abilities ----
  tusk_charge: { label: 'Tusk Charge', style: 'melee', range: 3, power: 1.5, telegraph: 'lowers its head, ready to charge…', push: 1, cd: 3 },
  sting_spark: { label: 'Sting Spark', style: 'magic', range: 2, power: 1, element: 'nature' },
  gnaw: { label: 'Gnaw', style: 'melee', range: 1, power: 1.1 },
  toxin_lash: { label: 'Toxin Lash', style: 'melee', range: 1, power: 0.9, status: { id: 'poison', turns: 3, chance: 0.7 } },
  boulder_swat: { label: 'Boulder Swat', style: 'melee', range: 1, power: 1.6, telegraph: 'raises a mossy fist…', cd: 3 },
  fen_bolt: { label: 'Fen Bolt', style: 'magic', range: 4, power: 1, element: 'water' },
  mire_grip: { label: 'Mire Grip', style: 'melee', range: 1, power: 1, status: { id: 'slow', turns: 2, chance: 0.8 } },
  skull_rush: { label: 'Skull Rush', style: 'melee', range: 3, power: 1.5, telegraph: 'paws the ground…', push: 1, cd: 3 },
  shard_spit: { label: 'Shard Spit', style: 'ranged', range: 4, power: 1 },
  sand_slash: { label: 'Sand Slash', style: 'melee', range: 1, power: 1.2 },
  venom_fang: { label: 'Venom Fang', style: 'melee', range: 1, power: 1, status: { id: 'poison', turns: 4, chance: 0.85 } },
  chill_bite: { label: 'Chill Bite', style: 'melee', range: 1, power: 1.1, element: 'ice', status: { id: 'slow', turns: 2, chance: 0.6 } },
  glacial_lance: { label: 'Glacial Lance', style: 'magic', range: 5, power: 1.3, element: 'ice' },
  ember_fling: { label: 'Ember Fling', style: 'ranged', range: 4, power: 1.1, element: 'fire', status: { id: 'burn', turns: 2, chance: 0.5 } },
  molten_smash: { label: 'Molten Smash', style: 'melee', range: 1, power: 1.8, aoeAdjacent: true, element: 'fire', telegraph: 'glows white-hot…', status: { id: 'burn', turns: 2, chance: 0.7 }, cd: 3 },
  corrupt_claw: { label: 'Corrupt Claw', style: 'melee', range: 1, power: 1.3, element: 'shadow', status: { id: 'atkDown', turns: 3, chance: 0.6 } },
  void_gaze: { label: 'Void Gaze', style: 'magic', range: 6, power: 1.4, element: 'shadow', accMod: 10 },
  crunch: { label: 'Crunch', style: 'melee', range: 1, power: 1.3 },
  root_slam: { label: 'Root Slam', style: 'melee', range: 0, power: 1.6, areaTelegraph: 1, element: 'nature', telegraph: 'roots writhe beneath the marked ground…', cd: 4 },
  grasping_roots: { label: 'Grasping Roots', style: 'magic', range: 5, power: 0.5, element: 'nature', status: { id: 'root', turns: 2, chance: 0.85 }, cd: 3 },
};

export const STATUS_INFO = {
  poison: { label: 'Poisoned', icon: 'PSN', dot: 3 },
  burn: { label: 'Burning', icon: 'BRN', dot: 4 },
  slow: { label: 'Slowed', icon: 'SLW' },
  root: { label: 'Rooted', icon: 'RT' },
  stun: { label: 'Stunned', icon: 'STN' },
  atkUp: { label: 'Bolstered', icon: '+ATK' },
  atkDown: { label: 'Weakened', icon: '-ATK' },
  guard: { label: 'Guarding', icon: 'GRD' },
};

const tkey = (gx, gz) => `${gx},${gz}`;

export class Combat {
  constructor(game) {
    this.game = game;   // { world, player, inventory, skills, enemyMgr }
    this.active = false;
  }

  // ---------------------------------------------------------------- setup
  start(enemyEntities, ox, oz) {
    const { world, player, inventory, skills } = this.game;
    this.active = true;
    this.tiles = new Map();
    this.combatants = []; // reset before tile placement reads occupancy
    this.round = 0;       // nextTurn() bumps to 1 on the first wrap
    this.log = [];
    this.result = null;
    this.aiTimer = 0;
    this.aiQueue = [];
    this.pendingEnd = null;
    this.xpByStyle = { melee: 0, ranged: 0, magic: 0 };
    this.damageTaken = 0;
    this.healingCast = 0;
    this.inspected = new Set();

    // --- carve the arena from terrain (BFS over walkable columns) ---
    const originY = Math.round(player.y);
    const startTile = this.findGround(Math.floor(ox), Math.floor(oz), originY);
    const queue = [startTile];
    this.tiles.set(tkey(startTile.gx, startTile.gz), startTile);
    while (queue.length) {
      const t = queue.shift();
      if (Math.abs(t.gx - startTile.gx) + Math.abs(t.gz - startTile.gz) >= 8) continue;
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = t.gx + dx, nz = t.gz + dz;
        if (this.tiles.has(tkey(nx, nz))) continue;
        const nt = this.findGround(nx, nz, t.y);
        if (!nt || Math.abs(nt.y - t.y) > 1) continue;
        this.tiles.set(tkey(nx, nz), nt);
        queue.push(nt);
      }
    }

    // --- combatants ---
    const est = inventory.equipStats();
    const vit = skills.level('vitality');
    player.maxHp = 30 + vit * 2 + est.hp;
    player.hp = Math.min(player.hp, player.maxHp);
    player.maxMana = 20 + skills.level('magic') + est.mana;

    const pt = this.nearestFreeTile(player.x, player.z);
    this.playerC = {
      id: 'player', kind: 'player', label: 'You',
      gx: pt.gx, gz: pt.gz, y: pt.y,
      hp: player.hp, maxHp: player.maxHp,
      statuses: [], cooldowns: {}, defending: false,
      speed: 4 + est.speed + Math.floor(skills.level('vitality') / 10),
      evasion: 5 + est.evasion,
      armor: est.armor, magicResist: est.magicResist,
      blockChance: est.block, crit: est.crit,
    };
    this.combatants = [this.playerC];

    let ei = 0;
    for (const ent of enemyEntities) {
      const def = ent.def || ENEMY_TYPES[ent.type];
      const t = this.nearestFreeTile(ent.x, ent.z);
      if (!t) continue;
      this.combatants.push({
        id: `e${ei++}`, kind: 'enemy', type: ent.type, def, entity: ent,
        label: def.label,
        gx: t.gx, gz: t.gz, y: t.y,
        hp: ent.hp ?? def.hp, maxHp: def.hp,
        atk: def.atk, acc: def.acc, evasion: def.evasion, armor: def.armor,
        speed: def.speed, moveRange: def.moveRange,
        statuses: [], cooldowns: {}, defending: false,
        telegraph: null, phaseIdx: 0,
      });
    }

    // --- initiative ---
    for (const c of this.combatants) {
      c.initiative = c.speed + Math.random() * 4 + (c.kind === 'player' ? skills.level('vitality') * 0.15 : 0);
    }
    this.combatants.sort((a, b) => b.initiative - a.initiative);
    this.turnIdx = -1;
    this.usedMove = false;
    this.usedAction = false;
    this.addLog(`Battle begins! ${this.combatants.filter(c => c.kind === 'enemy').map(c => c.label).join(', ')}`);
    emit('combatStart', {});
    this.nextTurn();
  }

  findGround(gx, gz, nearY) {
    const world = this.game.world;
    for (let dy = 3; dy >= -4; dy--) {
      const y = nearY + dy;
      const below = world.getBlock(gx, y - 1, gz);
      if (!isSolid(below)) continue;
      if (BLOCKS[below]?.shape === 'liquid') continue;
      if (isSolid(world.getBlock(gx, y, gz)) || isSolid(world.getBlock(gx, y + 1, gz))) continue;
      if (world.getBlock(gx, y, gz) === B.water) return null;
      return { gx, gz, y, hazard: below === B.campfire || world.getBlock(gx, y, gz) === B.lava };
    }
    return null;
  }

  nearestFreeTile(x, z) {
    let best = null, bestD = Infinity;
    for (const t of this.tiles.values()) {
      if (this.combatants?.some((c) => c.hp > 0 && c.gx === t.gx && c.gz === t.gz)) continue;
      const d = Math.hypot(t.gx + 0.5 - x, t.gz + 0.5 - z);
      if (d < bestD) { best = t; bestD = d; }
    }
    return best;
  }

  tileAt(gx, gz) { return this.tiles.get(tkey(gx, gz)); }
  occupant(gx, gz) { return this.combatants.find((c) => c.hp > 0 && c.gx === gx && c.gz === gz); }
  current() { return this.combatants[this.turnIdx]; }
  enemies() { return this.combatants.filter((c) => c.kind === 'enemy' && c.hp > 0); }

  addLog(text) {
    this.log.push(text);
    if (this.log.length > 40) this.log.shift();
    emit('combatLog', text);
  }

  // ---------------------------------------------------------------- turns
  nextTurn() {
    if (this.checkEnd()) return;
    for (let i = 0; i < this.combatants.length + 1; i++) {
      this.turnIdx = (this.turnIdx + 1) % this.combatants.length;
      if (this.turnIdx === 0) this.round++;
      const c = this.current();
      if (c.hp <= 0) continue;

      // tick statuses at the start of the combatant's turn
      let skip = false;
      for (const st of [...c.statuses]) {
        const info = STATUS_INFO[st.id];
        if (info?.dot) {
          this.applyDamage(c, info.dot, null, `${info.label}`);
          if (c.hp <= 0) { skip = true; }
        }
        if (st.id === 'stun') skip = true;
        st.turns--;
        if (st.turns <= 0) c.statuses.splice(c.statuses.indexOf(st), 1);
      }
      if (this.checkEnd()) return;
      if (skip && c.hp > 0) { this.addLog(`${c.label} can't act this turn.`); continue; }
      if (c.hp <= 0) continue;

      c.defending = false;
      for (const k of Object.keys(c.cooldowns)) {
        if (c.cooldowns[k] > 0) c.cooldowns[k]--;
      }
      // hazard tiles bite
      const tile = this.tileAt(c.gx, c.gz);
      if (tile?.hazard) this.applyDamage(c, 2, null, 'the burning ground');
      if (this.checkEnd()) return;
      if (c.hp <= 0) continue;

      if (c.kind === 'player') {
        this.usedMove = false;
        this.usedAction = false;
        const { player, skills } = this.game;
        player.energy = Math.min(player.maxEnergy, player.energy + 15);
        player.mana = Math.min(player.maxMana, player.mana + 2);
        this.playerC.hp = Math.min(this.playerC.hp, this.playerC.maxHp);
        emit('combatUpdate');
        return; // wait for UI input
      }
      // enemy: queue AI with readable pacing
      this.aiQueue = this.planEnemyTurn(c);
      this.aiTimer = 0.45;
      emit('combatUpdate');
      return;
    }
  }

  update(dt) {
    if (!this.active) return;
    if (this.pendingEnd) {
      this.pendingEnd.t -= dt;
      if (this.pendingEnd.t <= 0) this.finish(this.pendingEnd.result);
      return;
    }
    if (this.aiQueue.length) {
      this.aiTimer -= dt;
      if (this.aiTimer <= 0) {
        const step = this.aiQueue.shift();
        step();
        this.aiTimer = 0.55;
        emit('combatUpdate');
        if (!this.aiQueue.length && this.active && !this.pendingEnd) this.nextTurn();
      }
    }
  }

  // ---------------------------------------------------------------- movement
  reachableTiles(c, allowance) {
    // BFS with move allowance; can't pass through occupied tiles
    const out = new Map();
    const q = [{ gx: c.gx, gz: c.gz, d: 0 }];
    out.set(tkey(c.gx, c.gz), 0);
    while (q.length) {
      const cur = q.shift();
      if (cur.d >= allowance) continue;
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = cur.gx + dx, nz = cur.gz + dz;
        const k = tkey(nx, nz);
        if (out.has(k)) continue;
        const t = this.tiles.get(k);
        if (!t) continue;
        const from = this.tileAt(cur.gx, cur.gz);
        if (Math.abs(t.y - from.y) > 1) continue;
        if (this.occupant(nx, nz)) continue;
        out.set(k, cur.d + 1);
        q.push({ gx: nx, gz: nz, d: cur.d + 1 });
      }
    }
    out.delete(tkey(c.gx, c.gz));
    return out;
  }

  moveAllowance(c) {
    let allow = c.kind === 'player' ? 3 + Math.floor(c.speed / 5) : c.moveRange;
    if (c.statuses.some((s) => s.id === 'slow')) allow = Math.min(allow, Math.max(1, allow - 2));
    if (c.statuses.some((s) => s.id === 'root')) allow = 0;
    return allow;
  }

  getMovableTiles() {
    const c = this.playerC;
    if (this.usedMove || this.current() !== c) return new Map();
    return this.reachableTiles(c, this.moveAllowance(c));
  }

  doMove(gx, gz) {
    const c = this.playerC;
    if (this.current() !== c || this.usedMove) return false;
    const reach = this.getMovableTiles();
    if (!reach.has(tkey(gx, gz))) return false;
    const t = this.tileAt(gx, gz);
    c.gx = gx; c.gz = gz; c.y = t.y;
    this.usedMove = true;
    emit('combatUpdate');
    return true;
  }

  // ---------------------------------------------------------------- player stats & abilities
  playerAbilities() {
    const { inventory, skills, player } = this.game;
    const list = [];
    const melee = inventory.weapon('melee');
    const rangedW = inventory.weapon('ranged');
    // basic attack from whatever is available (fists count as weak melee)
    list.push({ id: 'strike', ...ABILITIES.strike, available: true });
    if (rangedW) list.push({ id: 'shot', ...ABILITIES.shot, range: rangedW.range || 6, available: true });
    for (const [id, ab] of Object.entries(ABILITIES)) {
      if (!ab.req) continue;
      if (ab.frontier) continue;                         // no magic in real-world play
      const [skill, lvl] = ab.req;
      if (skills.level(skill) < lvl) continue;
      if (ab.style === 'melee' && !melee) continue;
      if (ab.style === 'ranged' && !rangedW) continue;
      if (ab.style === 'magic') continue;
      list.push({ id, ...ab, range: ab.range ?? (ab.style === 'ranged' ? (rangedW?.range || 6) : ab.range), available: true });
    }
    // annotate availability
    for (const ab of list) {
      const cd = this.playerC.cooldowns[ab.id] || 0;
      ab.cdLeft = cd;
      ab.blocked =
        cd > 0 ? `Cooldown ${cd}` :
        ab.energy && player.energy < ab.energy ? 'Not enough energy' :
        ab.mana && player.mana < ab.mana ? 'Not enough mana' :
        this.usedAction ? 'Action used' : null;
    }
    return list;
  }

  playerStyleStats(style) {
    const { inventory, skills } = this.game;
    const w = inventory.weapon(style);
    const est = inventory.equipStats();
    if (style === 'melee') {
      const base = w ? w.atk : 1.5;
      return {
        atk: base + skills.level('strength') * 0.4,
        acc: 60 + (w?.acc || 0) + skills.level('strength') * 0.5,
        crit: 5 + (w?.crit || 0) + est.crit + skills.level('vitality') * 0.1,
        skill: 'strength', weaponSlot: w ? 'main' : null, // bare fists wear nothing down
      };
    }
    if (style === 'ranged') {
      return {
        atk: (w?.atk || 0) + skills.level('ranged') * 0.4,
        acc: 58 + (w?.acc || 0) + skills.level('ranged') * 0.6,
        crit: 5 + (w?.crit || 0) + est.crit + skills.level('vitality') * 0.1,
        skill: 'ranged', weaponSlot: 'ranged',
      };
    }
    return {
      atk: (w?.atk || 2) + skills.level('magic') * 0.45 + est.magic,
      acc: 62 + (w?.acc || 0) + skills.level('magic') * 0.5,
      crit: 4 + est.crit + skills.level('vitality') * 0.1,
      skill: 'magic', weaponSlot: 'main',
    };
  }

  // hit chance + damage preview (also used by UI)
  preview(attacker, target, ability) {
    const stats = attacker.kind === 'player'
      ? this.playerStyleStats(ability.style)
      : { atk: attacker.atk, acc: attacker.acc, crit: 5 };
    let acc = stats.acc + (ability.accMod || 0) - (target.evasion || 0);
    const at = this.tileAt(attacker.gx, attacker.gz), tt = this.tileAt(target.gx, target.gz);
    let heightBonus = 0;
    if (at && tt) {
      if (at.y > tt.y) { acc += 8; heightBonus = 0.1; }
      else if (at.y < tt.y) acc -= 5;
    }
    if (ability.style !== 'melee' && this.hasCover(attacker, target)) acc -= 15;
    const hitChance = clamp(acc, 5, 95);

    let dmg = stats.atk * (ability.power || 1);
    dmg *= 1 + heightBonus;
    if (attacker.statuses?.some((s) => s.id === 'atkUp')) dmg *= 1.25;
    if (attacker.statuses?.some((s) => s.id === 'atkDown')) dmg *= 0.75;
    // elements
    const el = ability.element;
    const tdef = target.def;
    if (el && tdef) {
      if (tdef.weak?.includes(el)) dmg *= 1.3;
      if (tdef.resist?.includes(el)) dmg *= 0.7;
    }
    if (el && target.kind === 'player') {
      dmg *= 1 - (target.magicResist || 0) / 100;
    }
    const armor = target.armor || 0;
    dmg *= 1 - armor / (armor + 30);
    if (target.defending) dmg *= 0.5;
    return {
      hitChance,
      dmgMin: Math.max(1, Math.round(dmg * 0.85)),
      dmgMax: Math.max(1, Math.round(dmg * 1.15)),
      crit: stats.crit,
    };
  }

  hasCover(attacker, target) {
    // block adjacent to target along the attack line at head height
    const world = this.game.world;
    const dx = attacker.gx - target.gx, dz = attacker.gz - target.gz;
    const sx = Math.sign(dx), sz = Math.sign(dz);
    const tt = this.tileAt(target.gx, target.gz);
    if (!tt) return false;
    const cx = target.gx + sx, cz = target.gz + sz;
    return isSolid(world.getBlock(cx, tt.y + 1, cz)) || isSolid(world.getBlock(cx, tt.y, cz));
  }

  losClear(a, b) {
    const world = this.game.world;
    const at = this.tileAt(a.gx, a.gz), bt = this.tileAt(b.gx, b.gz);
    if (!at || !bt) return false;
    const x0 = a.gx + 0.5, z0 = a.gz + 0.5, y0 = at.y + 1.2;
    const x1 = b.gx + 0.5, z1 = b.gz + 0.5, y1 = bt.y + 1.2;
    const steps = Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(z1 - z0)) * 2);
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      const bx = Math.floor(x0 + (x1 - x0) * t);
      const by = Math.floor(y0 + (y1 - y0) * t);
      const bz = Math.floor(z0 + (z1 - z0) * t);
      if ((bx === a.gx && bz === a.gz) || (bx === b.gx && bz === b.gz)) continue;
      const id = world.getBlock(bx, by, bz);
      if (isSolid(id) && BLOCKS[id].opaque) return false;
    }
    return true;
  }

  distTiles(a, b) { return Math.abs(a.gx - b.gx) + Math.abs(a.gz - b.gz); }

  getAbilityTargets(abilityId) {
    const ab = this.playerAbilities().find((a) => a.id === abilityId);
    if (!ab) return [];
    if (ab.style === 'heal') return [this.playerC.id];
    const out = [];
    for (const e of this.enemies()) {
      const d = this.distTiles(this.playerC, e);
      if (d > (ab.range || 1)) continue;
      if (ab.style !== 'melee' && !this.losClear(this.playerC, e)) continue;
      out.push(e.id);
    }
    return out;
  }

  doAbility(abilityId, targetId) {
    if (this.current() !== this.playerC || this.usedAction) return false;
    const ab = this.playerAbilities().find((a) => a.id === abilityId);
    if (!ab || ab.blocked) return false;
    const { player, skills } = this.game;

    if (ab.style === 'heal') {
      if (ab.mana) player.mana -= ab.mana;
      if (ab.energy) player.energy = Math.max(0, player.energy - ab.energy);
      if (abilityId === 'bandage') player.stopBleeding?.(); // real first aid staunches wounds
      const heal = abilityId === 'rally' ? 12 + skills.level('healing') : 8 + Math.round(skills.level('healing') * 0.8);
      this.playerC.hp = Math.min(this.playerC.maxHp, this.playerC.hp + heal);
      player.hp = this.playerC.hp;
      this.healingCast += heal;
      skills.addXp('healing', Math.round(heal * 1.2));
      if (ab.buff) this.playerC.statuses.push({ id: ab.buff.id, turns: ab.buff.turns });
      this.addLog(`You ${ab.label.toLowerCase()} for ${heal} health.`);
      emit('combatFx', { kind: 'heal', target: this.playerC });
    } else {
      const target = this.combatants.find((c) => c.id === targetId);
      if (!target || target.hp <= 0) return false;
      if (!this.getAbilityTargets(abilityId).includes(targetId)) return false;
      if (ab.energy) player.energy -= ab.energy;
      if (ab.mana) player.mana -= ab.mana;
      const targets = ab.aoeAdjacent
        ? this.enemies().filter((e) => this.distTiles(this.playerC, e) <= 1)
        : ab.aoe
          ? this.enemies().filter((e) => Math.abs(e.gx - target.gx) <= ab.aoe && Math.abs(e.gz - target.gz) <= ab.aoe)
          : [target];
      for (const t of targets) this.resolveAttack(this.playerC, t, ab);
      // weapon durability
      const stats = this.playerStyleStats(ab.style);
      if (stats.weaponSlot) this.game.inventory.damageEquipped(stats.weaponSlot, 1);
    }
    if (ab.cd) this.playerC.cooldowns[abilityId] = ab.cd;
    this.usedAction = true;
    emit('combatUpdate');
    if (!this.checkEnd() && this.usedMove) { /* player may still end turn manually */ }
    return true;
  }

  resolveAttack(attacker, target, ability) {
    const pv = this.preview(attacker, target, ability);
    const roll = Math.random() * 100;
    const label = attacker.kind === 'player' ? 'You' : attacker.label;
    const tlabel = target.kind === 'player' ? 'you' : target.label;
    emit('combatFx', { kind: 'attack', attacker, target, style: ability.style });

    if (roll > pv.hitChance) {
      this.addLog(`${label} use${attacker.kind === 'player' ? '' : 's'} ${ability.label} — ${tlabel} evade${target.kind === 'player' ? '' : 's'}!`);
      return;
    }
    if (target.kind === 'player' && target.blockChance && Math.random() * 100 < target.blockChance) {
      this.addLog(`You block the ${ability.label}!`);
      this.game.skills.addXp('defense', 6);
      return;
    }
    let dmg = pv.dmgMin + Math.random() * (pv.dmgMax - pv.dmgMin);
    const isCrit = Math.random() * 100 < pv.crit;
    if (isCrit) dmg *= 1.6;
    dmg = Math.max(1, Math.round(dmg));
    this.applyDamage(target, dmg, attacker, ability.label, isCrit);

    if (attacker.kind === 'player') {
      const stats = this.playerStyleStats(ability.style);
      this.xpByStyle[ability.style] = (this.xpByStyle[ability.style] || 0) + dmg;
      this.game.skills.addXp(stats.skill, Math.round(dmg * 1.5));
    }
    // status application
    if (ability.status && target.hp > 0 && Math.random() < ability.status.chance) {
      target.statuses.push({ id: ability.status.id, turns: ability.status.turns });
      this.addLog(`${tlabel} ${target.kind === 'player' ? 'are' : 'is'} ${STATUS_INFO[ability.status.id].label.toLowerCase()}!`);
    }
    // push
    if (ability.push && target.hp > 0) {
      const dx = Math.sign(target.gx - attacker.gx), dz = Math.sign(target.gz - attacker.gz);
      const nt = this.tileAt(target.gx + dx, target.gz + dz);
      if (nt && !this.occupant(nt.gx, nt.gz) && Math.abs(nt.y - target.y) <= 1) {
        target.gx = nt.gx; target.gz = nt.gz; target.y = nt.y;
        if (nt.hazard) this.applyDamage(target, 3, attacker, 'the hazard below');
      }
    }
  }

  applyDamage(target, dmg, source, label, isCrit = false) {
    target.hp = Math.max(0, target.hp - dmg);
    const tlabel = target.kind === 'player' ? 'You' : target.label;
    this.addLog(`${isCrit ? 'CRITICAL! ' : ''}${tlabel} take${target.kind === 'player' ? '' : 's'} ${dmg} damage${label ? ` from ${label}` : ''}.`);
    emit('combatFx', { kind: 'damage', target, dmg, crit: isCrit });
    if (target.kind === 'player') {
      if (this.game.player.debug) { target.hp = target.maxHp; return; } // debug: invulnerable
      this.game.player.hp = target.hp;
      this.damageTaken += dmg;
      if (target.defending) this.game.skills.addXp('defense', Math.round(dmg * 1.5));
      else this.game.skills.addXp('defense', Math.round(dmg * 0.5));
      this.game.skills.addXp('vitality', Math.round(dmg * 0.4));
    }
    if (target.hp <= 0) {
      this.addLog(`${tlabel} ${target.kind === 'player' ? 'fall' : 'falls'}!`);
      if (target.kind === 'enemy') this.onEnemyDown(target);
    }
    // boss phase check
    if (target.kind === 'enemy' && target.def.phases && target.hp > 0) {
      const ph = target.def.phases[target.phaseIdx];
      if (ph && target.hp / target.maxHp <= ph.at) {
        target.phaseIdx++;
        target.atk += ph.addAtk || 0;
        if (ph.banner) { this.addLog(`${ph.banner}`); emit('combatBanner', ph.banner); }
        for (const summonType of ph.summon || []) {
          const t = this.nearestFreeTile(target.gx + 0.5 + (Math.random() * 4 - 2), target.gz + 0.5 + (Math.random() * 4 - 2));
          if (!t) continue;
          const def = ENEMY_TYPES[summonType];
          this.combatants.push({
            id: `s${Math.floor(Math.random() * 1e6)}`, kind: 'enemy', type: summonType, def,
            label: def.label, gx: t.gx, gz: t.gz, y: t.y,
            hp: def.hp, maxHp: def.hp, atk: def.atk, acc: def.acc,
            evasion: def.evasion, armor: def.armor, speed: def.speed, moveRange: def.moveRange,
            statuses: [], cooldowns: {}, defending: false, telegraph: null, phaseIdx: 0, summoned: true,
          });
        }
      }
    }
  }

  onEnemyDown(c) {
    emit('combatFx', { kind: 'death', target: c });
  }

  doDefend() {
    if (this.current() !== this.playerC || this.usedAction) return false;
    this.playerC.defending = true;
    this.playerC.statuses.push({ id: 'guard', turns: 1 });
    this.usedAction = true;
    this.addLog('You brace behind your guard.');
    this.game.skills.addXp('defense', 3);
    emit('combatUpdate');
    return true;
  }

  useItem(slotIdx) {
    if (this.current() !== this.playerC || this.usedAction) return false;
    const { inventory, player } = this.game;
    const s = inventory.slots[slotIdx];
    if (!s) return false;
    const def = ITEMS[s.item];
    if (def.type !== 'food' && def.type !== 'potion') return false;
    if (def.heal) {
      this.playerC.hp = Math.min(this.playerC.maxHp, this.playerC.hp + def.heal);
      player.hp = this.playerC.hp;
    }
    if (def.energy) player.energy = Math.min(player.maxEnergy, player.energy + def.energy);
    if (def.mana) player.mana = Math.min(player.maxMana, player.mana + def.mana);
    if (def.cures) this.playerC.statuses = this.playerC.statuses.filter((st) => !def.cures.includes(st.id));
    inventory.removeSlot(slotIdx, 1);
    this.usedAction = true;
    this.addLog(`You use ${def.label}.`);
    emit('combatUpdate');
    return true;
  }

  doInspect(targetId) {
    const t = this.combatants.find((c) => c.id === targetId);
    if (!t || t.kind !== 'enemy') return null;
    if (!this.inspected.has(targetId)) {
      this.inspected.add(targetId);
      this.game.skills.addXp('vitality', 8);
    }
    const lvl = this.game.skills.level('vitality');
    return {
      label: t.label, hp: t.hp, maxHp: t.maxHp,
      desc: t.def.desc, recommend: t.def.recommend,
      stats: lvl >= 1 ? { atk: t.atk, armor: t.armor, evasion: t.evasion, speed: t.speed } : null,
      elements: lvl >= 5 ? { weak: t.def.weak || [], resist: t.def.resist || [] } : null,
      intent: lvl >= 10 && t.telegraph ? `About to use ${ABILITIES[t.telegraph.ability].label}!` : null,
      statuses: t.statuses,
    };
  }

  attemptFlee() {
    if (this.current() !== this.playerC || this.usedAction) return false;
    const avgSpeed = this.enemies().reduce((s, e) => s + e.speed, 0) / Math.max(1, this.enemies().length);
    const chance = clamp(0.5 + (this.playerC.speed - avgSpeed) * 0.06, 0.2, 0.9);
    this.usedAction = true;
    if (Math.random() < chance) {
      this.addLog('You slip away from the fight!');
      this.pendingEnd = { t: 0.8, result: 'fled' };
      emit('combatUpdate');
    } else {
      this.addLog('You fail to get away!');
      this.endTurn();
    }
    return true;
  }

  notifyEquipChanged() {
    if (!this.active || this.current() !== this.playerC) return;
    const est = this.game.inventory.equipStats();
    const c = this.playerC;
    c.armor = est.armor; c.evasion = 5 + est.evasion; c.magicResist = est.magicResist;
    c.blockChance = est.block; c.crit = est.crit;
    this.usedAction = true;
    this.addLog('You adjust your equipment.');
    emit('combatUpdate');
  }

  endTurn() {
    if (this.current() !== this.playerC) return;
    this.nextTurn();
  }

  // ---------------------------------------------------------------- enemy AI
  planEnemyTurn(c) {
    const steps = [];
    const player = this.playerC;

    // passive creatures (training dummies) never fight back
    if (c.def.behavior === 'passive' || c.def.atk <= 0) {
      steps.push(() => this.addLog(`${c.label} sways gently.`));
      return steps;
    }

    // resolve a telegraphed attack first
    if (c.telegraph) {
      const tg = c.telegraph;
      c.telegraph = null;
      steps.push(() => {
        const ab = ABILITIES[tg.ability];
        if (ab.areaTelegraph != null) {
          // hits marked tiles
          const inArea = Math.abs(player.gx - tg.cx) <= ab.areaTelegraph && Math.abs(player.gz - tg.cz) <= ab.areaTelegraph;
          this.addLog(`${c.label} unleashes ${ab.label}!`);
          if (inArea) this.resolveAttack(c, player, ab);
          else this.addLog('You moved clear of the blast!');
        } else {
          if (this.distTiles(c, player) <= (ab.range || 1)) this.resolveAttack(c, player, ab);
          else this.addLog(`${c.label}'s ${ab.label} misses its moment.`);
        }
        if (ab.cd) c.cooldowns[tg.ability] = ab.cd;
      });
      return steps;
    }

    // choose an ability
    const abilityIds = (c.def.abilities || []).filter((id) => !(c.cooldowns[id] > 0));
    const basic = { label: 'attack', style: c.def.ranged ? 'ranged' : 'melee', range: c.def.ranged ? (c.def.range || 4) : 1, power: 1 };
    let chosen = null;
    for (const id of abilityIds) {
      const ab = ABILITIES[id];
      if (ab.telegraph && Math.random() < 0.6) { chosen = { id, ab }; break; }
      if (!ab.telegraph && Math.random() < 0.5) { chosen = { id, ab }; break; }
    }

    // movement toward player if out of range
    const targetRange = chosen ? (chosen.ab.range || 1) : basic.range;
    steps.push(() => {
      let allow = this.moveAllowance(c);
      while (allow > 0 && this.distTiles(c, player) > targetRange) {
        const options = [[1, 0], [-1, 0], [0, 1], [0, -1]]
          .map(([dx, dz]) => ({ gx: c.gx + dx, gz: c.gz + dz }))
          .filter((p) => {
            const t = this.tileAt(p.gx, p.gz);
            return t && !this.occupant(p.gx, p.gz) && Math.abs(t.y - c.y) <= 1;
          })
          .sort((a, b) =>
            (Math.abs(a.gx - player.gx) + Math.abs(a.gz - player.gz)) -
            (Math.abs(b.gx - player.gx) + Math.abs(b.gz - player.gz)));
        if (!options.length) break;
        const best = options[0];
        if (Math.abs(best.gx - player.gx) + Math.abs(best.gz - player.gz) >= this.distTiles(c, player)) break;
        const t = this.tileAt(best.gx, best.gz);
        c.gx = best.gx; c.gz = best.gz; c.y = t.y;
        allow--;
      }
    });

    // attack / telegraph
    steps.push(() => {
      if (c.hp <= 0) return;
      const d = this.distTiles(c, player);
      if (chosen && chosen.ab.telegraph) {
        if (chosen.ab.areaTelegraph != null) {
          c.telegraph = { ability: chosen.id, cx: player.gx, cz: player.gz };
          this.addLog(`${c.label} ${chosen.ab.telegraph}`);
        } else if (d <= (chosen.ab.range || 1) + 1) {
          c.telegraph = { ability: chosen.id };
          this.addLog(`${c.label} ${chosen.ab.telegraph}`);
        } else if (d <= basic.range && this.canReach(c, player, basic)) {
          this.resolveAttack(c, player, basic);
        }
        return;
      }
      const ab = chosen ? chosen.ab : basic;
      const abRange = ab.range || 1;
      if (d <= abRange && this.canReach(c, player, ab)) {
        this.resolveAttack(c, player, ab);
        if (chosen && ab.cd) c.cooldowns[chosen.id] = ab.cd;
      } else if (d <= basic.range && this.canReach(c, player, basic)) {
        this.resolveAttack(c, player, basic);
      } else {
        this.addLog(`${c.label} watches for an opening.`);
      }
    });
    return steps;
  }

  canReach(attacker, target, ability) {
    if (ability.style === 'melee') return true;
    return this.losClear(attacker, target);
  }

  // telegraphed danger tiles for UI display
  dangerTiles() {
    const out = [];
    for (const c of this.enemies()) {
      if (c.telegraph) {
        const ab = ABILITIES[c.telegraph.ability];
        if (ab.areaTelegraph != null && c.telegraph.cx !== undefined) {
          for (let dx = -ab.areaTelegraph; dx <= ab.areaTelegraph; dx++) {
            for (let dz = -ab.areaTelegraph; dz <= ab.areaTelegraph; dz++) {
              const t = this.tileAt(c.telegraph.cx + dx, c.telegraph.cz + dz);
              if (t) out.push(t);
            }
          }
        }
      }
    }
    return out;
  }

  // ---------------------------------------------------------------- ending
  checkEnd() {
    if (!this.active || this.pendingEnd) return true;
    if (this.playerC.hp <= 0) {
      this.pendingEnd = { t: 1.2, result: 'lost' };
      return true;
    }
    if (this.enemies().length === 0) {
      this.pendingEnd = { t: 0.9, result: 'won' };
      return true;
    }
    return false;
  }

  finish(result) {
    const { skills, inventory, enemyMgr, player } = this.game;
    this.pendingEnd = null;
    this.result = result;

    if (result === 'won') {
      let totalXp = 0, huntXp = 0, coins = 0;
      const loot = [];
      for (const c of this.combatants) {
        if (c.kind !== 'enemy') continue;
        totalXp += c.def.xp || 0;
        if (c.def.huntXp) huntXp += c.def.huntXp;
        coins += Math.round((5 + (c.def.tier || 0) * 12) * (0.7 + Math.random() * 0.6));
        for (const d of mobDropsFor(c.type)) { // admin-editable drop table (mobconfig)
          if (Math.random() < d.chance) {
            const qty = d.qty[0] + Math.floor(Math.random() * (d.qty[1] - d.qty[0] + 1));
            loot.push({ item: d.item, qty });
          }
        }
        if (c.entity) enemyMgr.markKilled(c.entity);
      }
      // XP split across combat skills
      const styleTotal = Object.values(this.xpByStyle).reduce((a, b) => a + b, 0) || 1;
      for (const [style, dealt] of Object.entries(this.xpByStyle)) {
        if (dealt <= 0) continue;
        const skill = style === 'melee' ? 'strength' : style;
        skills.addXp(skill, Math.round(totalXp * 0.5 * (dealt / styleTotal)));
      }
      skills.addXp('vitality', Math.round(totalXp * 0.2));
      skills.addXp('defense', Math.round(totalXp * 0.15));
      skills.addXp('vitality', Math.round(totalXp * 0.15));
      if (huntXp) skills.addXp('hunting', huntXp);
      for (const l of loot) inventory.add(l.item, l.qty);
      inventory.add('coin', coins);
      this.addLog(`Victory! +${coins} coins.`);
      emit('combatEnd', { result, loot, coins, types: this.combatants.filter((c) => c.kind === 'enemy').map((c) => c.type) });
    } else if (result === 'fled') {
      for (const c of this.combatants) {
        if (c.kind !== 'enemy' || !c.entity || c.summoned) continue;
        if (c.hp <= 0) enemyMgr.markKilled(c.entity); // slain before you ran
        else c.entity.hp = c.hp;
      }
      emit('combatEnd', { result });
    } else {
      emit('combatEnd', { result });
    }
    player.hp = Math.max(player.hp, result === 'lost' ? 0 : 1);
    this.active = false;
  }
}
