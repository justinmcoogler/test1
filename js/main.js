// Emberveil — main orchestration: boot, game loop, interactions, camera, save.
import { buildAtlas } from './gfx/textures.js';
import { Renderer } from './gfx/renderer.js';
import { World, initSlabSet } from './world/world.js';
import { CHUNK, WORLD_H, SEA } from './world/worldgen.js';
import { B, BLOCKS } from './world/blocks.js';
import { NODE_TYPES, rollNodeDrops } from './game/nodes.js';
import { Player } from './player/player.js';
import { Controls } from './player/controls.js';
import { TouchControls, isTouchDevice } from './player/touch.js';
import { Inventory } from './game/inventory.js';
import { Skills, SKILL_DEFS } from './game/skills.js';
import { ITEMS } from './game/items.js';
import { QuestLog } from './game/quests.js';
import { EnemyManager, ENEMY_TYPES } from './game/enemies.js';
import { Combat } from './game/combat.js';
import { NPC_DEFS } from './game/npcs.js';
import { UI } from './ui/ui.js';
import { hashSeed } from './core/rng.js';
import { on, emit, clearAllListeners } from './core/events.js';
import { clamp } from './core/math.js';
import {
  loadSettings, saveSettings, listSlots, saveSlot, loadSlot, deleteSlot, NUM_SLOTS,
} from './game/save.js';
import { initAudio, setVolumes, SFX } from './core/audio.js';

const $ = (id) => document.getElementById(id);

class Game {
  constructor(slot, seedText, saveData) {
    this.slot = slot;
    this.seedText = seedText;
    this.settings = loadSettings();
    this.canvas = $('game-canvas');
    this.renderer = new Renderer(this.canvas);
    this.world = new World(hashSeed(seedText));
    this.player = new Player();
    this.inventory = new Inventory();
    this.skills = new Skills();
    this.quests = new QuestLog(this.inventory);
    this.enemyMgr = new EnemyManager(this.world);
    this.combat = new Combat(this);
    this.controls = new Controls(this.canvas, this.settings);
    this.touch = isTouchDevice() ? new TouchControls(this.controls, this.settings) : null;
    this.ui = new UI(this);

    this.discovered = new Set();
    this.discoveredItems = new Set(['fernwood_log', 'rough_stone', 'plant_fibre']);
    this.flags = {};
    this.playtime = 0;
    this.dialogueOpen = false;
    this.gather = null;        // active gathering {nodeId, progress, time}
    this.breaking = null;      // active block break {x,y,z,progress,time}
    this.autosaveTimer = 45;
    this.combatCam = null;
    this.combatTarget = null;
    this.renderPositions = new Map(); // combatant id → smooth [x,z]
    this.shake = 0;
    this.lastFacing = null;

    if (saveData) this.restore(saveData);
    else {
      // starter kit: enough to begin the first quest
      this.inventory.add('worn_hatchet', 1);
      this.inventory.add('travel_biscuit', 2);
    }
    this.registerModels();
    this.bindGameEvents();
    this.applySettings();
  }

  // ---------------------------------------------------------------- boot
  async init(onProgress) {
    initSlabSet();
    // spawn placement
    const [sx, sy, sz] = this.world.markers.spawn;
    if (!this._restored) {
      this.player.x = sx + 0.5; this.player.z = sz + 0.5;
    }
    const pcx = Math.floor(this.player.x / CHUNK), pcz = Math.floor(this.player.z / CHUNK);
    const R = 3;
    const total = (2 * R + 1) ** 2;
    let done = 0;
    for (let dz = -R; dz <= R; dz++) {
      for (let dx = -R; dx <= R; dx++) {
        this.world.ensureChunk(pcx + dx, pcz + dz);
        done++;
        onProgress(done / total * 0.6, 'Shaping the world…');
        if (done % 4 === 0) await frame();
      }
    }
    // mesh inner ring
    let meshed = 0;
    for (let dz = -R + 1; dz <= R - 1; dz++) {
      for (let dx = -R + 1; dx <= R - 1; dx++) {
        this.renderer.remeshChunk(this.world, pcx + dx, pcz + dz);
        this.discovered.add(`${pcx + dx},${pcz + dz}`);
        meshed++;
        onProgress(0.6 + meshed / total * 0.4, 'Growing the forests…');
        if (meshed % 2 === 0) await frame();
      }
    }
    if (!this._restored) {
      this.player.y = this.world.surfaceAt(sx, sz) + 1;
    }
    this.enemyMgr.refresh();
    this.enemyMgr.applySavedHp();
    this.recomputeVitals();
    onProgress(1, 'Waking up…');
  }

  registerModels() {
    for (const [type, def] of Object.entries(ENEMY_TYPES)) {
      this.renderer.registerModel(type, def.model);
    }
    for (const [id, def] of Object.entries(NPC_DEFS)) {
      this.renderer.registerModel(`npc_${id}`, def.model);
    }
    this.playerModelVersion = 0;
    this.registerPlayerModel();
  }

  registerPlayerModel() {
    // Simple voxel adventurer whose colors reflect equipped armor.
    const eq = this.inventory.equipment;
    const colorOf = (slot, fallback) => {
      const e = eq[slot];
      if (!e) return fallback;
      const item = e.item;
      if (item.startsWith('hide')) return [0.55, 0.4, 0.26];
      if (item.startsWith('bronze')) return [0.72, 0.48, 0.25];
      if (item.startsWith('woven')) return [0.5, 0.42, 0.62];
      return fallback;
    };
    const body = colorOf('body', [0.32, 0.5, 0.38]);
    const legs = colorOf('legs', [0.35, 0.32, 0.3]);
    const head = colorOf('head', [0.85, 0.7, 0.55]);
    const boots = colorOf('feet', [0.3, 0.24, 0.18]);
    const boxes = [
      { x: -0.18, y: 0.12, z: -0.1, w: 0.15, h: 0.5, d: 0.2, color: legs },
      { x: 0.03, y: 0.12, z: -0.1, w: 0.15, h: 0.5, d: 0.2, color: legs },
      { x: -0.18, y: 0, z: -0.1, w: 0.15, h: 0.12, d: 0.22, color: boots },
      { x: 0.03, y: 0, z: -0.1, w: 0.15, h: 0.12, d: 0.22, color: boots },
      { x: -0.25, y: 0.62, z: -0.12, w: 0.5, h: 0.6, d: 0.24, color: body },
      { x: -0.37, y: 0.66, z: -0.1, w: 0.11, h: 0.52, d: 0.2, color: colorOf('hands', body) },
      { x: 0.26, y: 0.66, z: -0.1, w: 0.11, h: 0.52, d: 0.2, color: colorOf('hands', body) },
      { x: -0.16, y: 1.22, z: -0.16, w: 0.32, h: 0.32, d: 0.32, color: head },
    ];
    const weapon = eq.main || eq.ranged;
    if (weapon) {
      boxes.push({ x: 0.28, y: 0.7, z: 0.05, w: 0.07, h: 0.7, d: 0.07, color: [0.6, 0.6, 0.65] });
    }
    if (eq.off) {
      boxes.push({ x: -0.48, y: 0.7, z: -0.14, w: 0.08, h: 0.4, d: 0.4, color: [0.5, 0.38, 0.2] });
    }
    this.playerModelVersion++;
    this.playerModelName = `player_v${this.playerModelVersion}`;
    this.renderer.registerModel(this.playerModelName, boxes);
  }

  bindGameEvents() {
    on('itemGained', ({ item }) => this.discoveredItems.add(item));
    on('rightClick', () => this.onSecondary());
    on('interactKey', () => this.tryInteract());
    on('playerDied', () => this.onPlayerDeath());
    on('playerDamaged', () => {
      if (this.settings.screenShake && !this.settings.reducedMotion) this.shake = 0.35;
      SFX.hurt();
    });
    on('equipmentChanged', () => {
      this.recomputeVitals();
      this.registerPlayerModel();
      if (this.combat.active) this.combat.notifyEquipChanged();
    });
    on('levelUp', () => this.recomputeVitals());
    on('combatStart', () => this.onCombatStart());
    on('combatEnd', (e) => this.onCombatEnd(e));
    on('combatFx', (fx) => this.onCombatFx(fx));
    on('questCompleted', () => { this.autosaveTimer = Math.min(this.autosaveTimer, 2); });
    on('nodeDepleted', ({ node }) => {
      const [x, y, z] = [node.x, node.y, node.z];
      this.renderer.spawnParticles(x + 0.5, y + 0.6, z + 0.5, [0.6, 0.6, 0.5], 10, 3, 0.7);
    });
    if (this.touch) {
      this.touch.onTap = () => this.onTapInteract();
      this.touch.onPlace = () => this.onSecondary();
    }
    this.canvas.addEventListener('click', (e) => {
      if (this.combat.active) this.onCombatClick(e.clientX, e.clientY);
    });
    window.addEventListener('resize', () => this.renderer.resize());
    $('respawn-btn').addEventListener('click', () => this.respawn());
  }

  recomputeVitals() {
    const est = this.inventory.equipStats();
    const p = this.player;
    p.maxHp = 30 + this.skills.level('vitality') * 2 + est.hp;
    p.maxMana = 20 + this.skills.level('magic') + est.mana;
    p.hp = Math.min(p.hp, p.maxHp);
  }

  applySettings() {
    const s = this.settings;
    document.documentElement.style.setProperty('--ui-scale', s.uiScale);
    document.documentElement.style.setProperty('--text-scale', s.textScale);
    document.documentElement.classList.toggle('colorblind', s.colorblind);
    document.documentElement.classList.toggle('reduced-motion', s.reducedMotion);
    document.documentElement.classList.toggle('left-handed', s.leftHanded);
    this.renderer.renderDistance = s.renderDistance;
    this.renderer.reducedMotion = s.reducedMotion;
    setVolumes(s);
    saveSettings(s);
  }

  onWindowOpened() {
    this.controls.enabled = false;
    document.exitPointerLock?.();
  }

  onWindowClosed() {
    if (!this.combat.active && !this.dialogueOpen && !this.ui.currentWindow) {
      this.controls.enabled = true;
    }
  }

  // ---------------------------------------------------------------- loop
  start() {
    let last = performance.now();
    const loop = (now) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      try {
        this.tick(dt);
      } catch (e) {
        console.error('tick error', e);
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  tick(dt) {
    this.playtime += dt;
    const p = this.player;

    // input → camera
    if (!this.combat.active) {
      const [dyaw, dpitch] = this.controls.consumeLook();
      p.yaw += dyaw;
      p.pitch = clamp(p.pitch + dpitch, -Math.PI / 2 + 0.05, Math.PI / 2 - 0.05);
      p.update(dt, this.controls, this.world);
    } else {
      this.controls.consumeLook();
    }

    this.world.update(dt);
    this.streamChunks();
    this.enemyMgr.refresh();
    this.enemyMgr.update(dt, p, this.combat.active);
    this.combat.update(dt);

    // aggro check
    if (!this.combat.active && !p.dead && !this.dialogueOpen && !this.ui.currentWindow && !this.disableAggro) {
      const aggro = this.enemyMgr.checkAggro(p);
      if (aggro) this.startCombat(aggro);
    }

    // interactions (exploration only)
    if (!this.combat.active && !p.dead) {
      this.updateInteraction(dt);
      this.quests.checkReach(p.x, p.z, p.y, this.world.markers);
    } else {
      this.ui.setPrompt(null);
      this.ui.setGatherProgress(null);
    }

    // autosave
    this.autosaveTimer -= dt;
    if (this.autosaveTimer <= 0 && !this.combat.active) {
      this.autosaveTimer = 45;
      this.saveGame();
    }

    // fog: underground darkening
    const eyeY = p.y + p.eyeHeight;
    const surf = this.world.surfaceAt(Math.floor(p.x), Math.floor(p.z));
    const underground = eyeY < surf - 3 || (eyeY < SEA - 2);
    this.renderer.fogMix += ((underground ? 1 : 0) - this.renderer.fogMix) * Math.min(1, dt * 2);

    // camera
    this.shake = Math.max(0, this.shake - dt);
    const shakeAmt = this.shake > 0 ? this.shake * 0.15 : 0;
    const sx = (Math.random() - 0.5) * shakeAmt, sy = (Math.random() - 0.5) * shakeAmt;
    if (this.combat.active && this.combatCam) {
      const { eye, target } = this.combatCam;
      this.renderer.setOrbitCamera([eye[0] + sx, eye[1] + sy, eye[2]], target);
    } else {
      const eye = p.eye();
      this.renderer.setFPSCamera([eye[0] + sx, eye[1] + sy, eye[2]], p.yaw, p.pitch);
    }

    // draw
    this.renderer.draw(this.world, {
      dt,
      entities: this.collectEntities(dt),
      tiles: this.combat.active ? this.ui.getCombatTiles() : [],
      selection: this.currentSelection,
      markers: this.collectMarkers(),
    });

    // HUD
    this.ui.renderVitals();
    this.ui.drawCompass();
    if ((this.minimapTick = (this.minimapTick || 0) + dt) > 0.5) {
      this.minimapTick = 0;
      this.ui.drawMinimap();
    }
    this.updateWorldLabels();
  }

  // ---------------------------------------------------------------- chunks
  streamChunks() {
    const p = this.player;
    const pcx = Math.floor(p.x / CHUNK), pcz = Math.floor(p.z / CHUNK);
    const R = this.settings.renderDistance;
    // generate data in a spiral, budget per frame
    let budget = 2;
    outer:
    for (let r = 0; r <= R + 1 && budget > 0; r++) {
      for (let dz = -r; dz <= r && budget > 0; dz++) {
        for (let dx = -r; dx <= r && budget > 0; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
          const cx = pcx + dx, cz = pcz + dz;
          if (!this.world.hasChunk(cx, cz)) {
            this.world.ensureChunk(cx, cz);
            budget--;
          }
        }
      }
    }
    // mesh: dirty chunks first, then unmeshed with all neighbors present
    let meshBudget = 2;
    for (const key of [...this.world.dirtyChunks]) {
      if (meshBudget <= 0) break;
      const [cx, cz] = key.split(',').map(Number);
      this.world.dirtyChunks.delete(key);
      if (this.world.hasChunk(cx, cz)) {
        this.renderer.remeshChunk(this.world, cx, cz);
        meshBudget--;
      }
    }
    for (let r = 0; r <= R && meshBudget > 0; r++) {
      for (let dz = -r; dz <= r && meshBudget > 0; dz++) {
        for (let dx = -r; dx <= r && meshBudget > 0; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
          const cx = pcx + dx, cz = pcz + dz;
          if (this.renderer.hasMesh(cx, cz) || !this.world.hasChunk(cx, cz)) continue;
          if (!this.world.hasChunk(cx - 1, cz) || !this.world.hasChunk(cx + 1, cz) ||
              !this.world.hasChunk(cx, cz - 1) || !this.world.hasChunk(cx, cz + 1)) continue;
          this.renderer.remeshChunk(this.world, cx, cz);
          this.discovered.add(`${cx},${cz}`);
          meshBudget--;
        }
      }
    }
    // unload far
    if ((this.unloadTick = (this.unloadTick || 0) + 1) % 120 === 0) {
      const removed = this.world.unloadFar(p.x, p.z, R + 3);
      for (const key of removed) this.renderer.dropChunk(key);
    }
  }

  // ---------------------------------------------------------------- interaction
  facingRay() {
    const p = this.player;
    const eye = p.eye();
    const cp = Math.cos(p.pitch), spt = Math.sin(p.pitch);
    const dx = -Math.sin(p.yaw) * cp, dy = spt, dz = -Math.cos(p.yaw) * cp;
    return this.world.raycast(eye[0], eye[1], eye[2], dx, dy, dz, 5);
  }

  updateInteraction(dt) {
    if (this.dialogueOpen || this.ui.currentWindow) {
      this.ui.setPrompt(null);
      this.ui.setGatherProgress(null);
      this.currentSelection = null;
      return;
    }
    const hit = this.facingRay();
    this.currentSelection = hit && !hit.node ? { x: hit.x, y: hit.y, z: hit.z } : null;
    const touchMode = !!this.touch;
    const actionBtn = touchMode ? '✦' : 'LMB';

    // nearby NPC in ray direction?
    const npcNear = this.npcInFront();
    const enemyNear = this.enemyInFront();

    let prompt = null;
    if (npcNear) {
      prompt = `${touchMode ? 'Tap ✦' : 'F / Right-click'}: Talk to ${NPC_DEFS[npcNear.id].label}`;
      this.currentSelection = null;
    } else if (enemyNear && enemyNear.def.behavior !== 'passive') {
      prompt = `${touchMode ? 'Tap ✦' : 'Click'}: Engage ${enemyNear.def.label}`;
    } else if (enemyNear) {
      prompt = `${touchMode ? 'Tap ✦' : 'Click'}: Attack ${enemyNear.def.label}`;
    } else if (hit) {
      prompt = this.promptForHit(hit, actionBtn, touchMode);
    }

    // chest / station prompts override
    if (hit && !hit.node) {
      const def = BLOCKS[hit.id];
      if (def && ['workbench', 'furnace', 'anvil_block', 'campfire', 'alchemy_table', 'loom_block', 'enchant_altar', 'construction_bench'].includes(def.name)) {
        prompt = `${touchMode ? 'Tap ✦' : 'F / Right-click'}: Use ${def.label}`;
      } else if (def?.name === 'chest_block') {
        prompt = `${touchMode ? 'Tap ✦' : 'F / Right-click'}: Open chest`;
      }
    }
    this.ui.setPrompt(prompt);

    // primary action (hold): gather node / attack enemy / break block
    if (this.controls.primaryHeld) {
      if (enemyNear) {
        this.startCombat(enemyNear);
        return;
      }
      if (hit?.node) this.updateGathering(hit.node, dt);
      else if (hit) this.updateBreaking(hit, dt);
      else { this.gather = null; this.breaking = null; this.ui.setGatherProgress(null); }
    } else {
      if (this.gather || this.breaking) this.ui.setGatherProgress(null);
      this.gather = null;
      this.breaking = null;
    }
  }

  promptForHit(hit, actionBtn, touchMode) {
    if (hit.node) {
      const node = hit.node;
      const def = node.def;
      const st = this.world.nodeState(node.id);
      if (st.state === 'depleted') {
        const left = Math.max(0, Math.ceil(st.respawnAt - this.world.time));
        return `${def.label} — regrowing (${left}s)`;
      }
      const lvl = this.skills.level(def.skill);
      if (lvl < def.level) return `${def.label}\nRequires ${SKILL_DEFS[def.skill].label} ${def.level} (you: ${lvl})`;
      if (def.tool && !this.inventory.bestTool(def.tool)) return `${def.label}\nRequires a ${def.tool}`;
      const tierNeed = def.level >= 40 ? 3 : def.level >= 25 ? 2 : 1;
      const tool = def.tool ? this.inventory.bestTool(def.tool) : null;
      if (tool && ITEMS[tool.stack.item].tier < tierNeed) return `${def.label}\nYour ${def.tool} is too crude (tier ${tierNeed} needed)`;
      return `Hold ${actionBtn}: ${gatherVerb(def)} ${def.label} (${SKILL_DEFS[def.skill].label} ${def.level})`;
    }
    const bdef = BLOCKS[hit.id];
    if (!bdef || bdef.hardness === Infinity) return null;
    const sel = this.inventory.selectedStack();
    const selDef = sel ? ITEMS[sel.item] : null;
    let s = `Hold ${actionBtn}: Break ${bdef.label}`;
    if (selDef?.block) s += `\n${touchMode ? '▣' : 'RMB'}: Place ${selDef.label}`;
    return s;
  }

  npcInFront() {
    const p = this.player;
    for (const npc of this.world.structure.npcs) {
      const dx = npc.x + 0.5 - p.x, dz = npc.z + 0.5 - p.z;
      const d = Math.hypot(dx, dz);
      if (d > 3.5 || Math.abs(npc.y - p.y) > 2) continue;
      const ang = Math.atan2(-dx, -dz);
      let rel = ang - p.yaw;
      while (rel > Math.PI) rel -= 2 * Math.PI;
      while (rel < -Math.PI) rel += 2 * Math.PI;
      if (Math.abs(rel) < 0.6) return npc;
    }
    return null;
  }

  enemyInFront() {
    const p = this.player;
    let best = null, bestRel = 0.5;
    for (const e of this.enemyMgr.entities.values()) {
      const dx = e.x - p.x, dz = e.z - p.z;
      const d = Math.hypot(dx, dz);
      if (d > 4.2 || Math.abs(e.y - p.y) > 2.5) continue;
      const ang = Math.atan2(-dx, -dz);
      let rel = Math.abs(normAngle(ang - p.yaw));
      if (rel < bestRel) { best = e; bestRel = rel; }
    }
    return best;
  }

  updateGathering(node, dt) {
    const def = node.def;
    const st = this.world.nodeState(node.id);
    this.breaking = null;
    if (!st || st.state !== 'ready') { this.gather = null; this.ui.setGatherProgress(null); return; }
    const lvl = this.skills.level(def.skill);
    if (lvl < def.level) { this.gather = null; return; }
    let toolStack = null, toolDef = null;
    if (def.tool) {
      const t = this.inventory.bestTool(def.tool);
      if (!t) { this.gather = null; return; }
      toolStack = t.stack;
      toolDef = ITEMS[toolStack.item];
      const tierNeed = def.level >= 40 ? 3 : def.level >= 25 ? 2 : 1;
      if (toolDef.tier < tierNeed) { this.gather = null; return; }
    }

    if (!this.gather || this.gather.nodeId !== node.id) {
      const est = this.inventory.equipStats();
      let time = def.time * this.skills.gatherTimeMult(def.skill);
      time /= (toolDef?.power || 1);
      time /= (1 + est.gather);
      time *= 0.85 + Math.random() * 0.3;             // natural variance
      if (this.player.energy < 8) time *= 1.35;       // fatigue
      this.gather = { nodeId: node.id, progress: 0, time: Math.max(0.5, time), node, toolStack };
    }
    const g = this.gather;
    g.progress += dt;
    this.ui.setGatherProgress(Math.min(1, g.progress / g.time), gatherVerb(def) + '…');
    if ((this.gatherFxT = (this.gatherFxT || 0) + dt) > 0.4) {
      this.gatherFxT = 0;
      const colors = { tree: [0.5, 0.35, 0.2], ore: [0.6, 0.6, 0.62], plant: [0.3, 0.6, 0.3], water: [0.4, 0.6, 0.9], ground: [0.6, 0.5, 0.35], farm: [0.7, 0.65, 0.3] };
      this.renderer.spawnParticles(node.x + 0.5, node.y + 0.7, node.z + 0.5, colors[def.kind] || [0.5, 0.5, 0.5], 4, 2, 0.5);
      if (def.kind === 'tree') SFX.chop();
      else if (def.kind === 'ore') SFX.mineHit();
      else if (def.kind === 'water') SFX.splash();
      else SFX.dig();
    }
    if (g.progress >= g.time) {
      this.completeGather(node, toolStack);
      this.gather = null;
      this.ui.setGatherProgress(null);
    }
  }

  completeGather(node, toolStack) {
    const def = node.def;
    const lvl = this.skills.level(def.skill);
    const crit = Math.random() < this.skills.critChance(def.skill);
    const drops = rollNodeDrops(def, lvl, Math.random, crit ? 0.5 : 0);
    for (const d of drops) {
      this.inventory.add(d.item, crit ? d.qty * 2 : d.qty);
    }
    this.skills.addXp(def.skill, def.xp * (crit ? 1.5 : 1));
    if (crit) this.ui.toast('✨ Critical gather! Double yield', 'gold');
    if (toolStack) this.inventory.damageTool(toolStack, 1);
    this.player.energy = Math.max(0, this.player.energy - 3);
    this.world.depleteCharge(node);
    emit('nodeGathered', { nodeType: node.type });
    SFX.pickup();
  }

  updateBreaking(hit, dt) {
    const def = BLOCKS[hit.id];
    this.gather = null;
    if (!def || def.hardness === Infinity || def.shape === 'liquid') { this.breaking = null; return; }
    // tool speed
    let power = 0.55; // bare hands
    if (def.tool) {
      const t = this.inventory.bestTool(def.tool);
      if (t) power = ITEMS[t.stack.item].power * 1.15;
      this._breakTool = t?.stack || null;
    } else {
      power = 1;
      this._breakTool = null;
    }
    if (!this.breaking || this.breaking.x !== hit.x || this.breaking.y !== hit.y || this.breaking.z !== hit.z) {
      this.breaking = { x: hit.x, y: hit.y, z: hit.z, progress: 0, time: def.hardness / power };
    }
    const b = this.breaking;
    b.progress += dt;
    this.ui.setGatherProgress(Math.min(1, b.progress / b.time), `Breaking ${def.label}…`);
    if ((this.breakFxT = (this.breakFxT || 0) + dt) > 0.35) {
      this.breakFxT = 0;
      this.renderer.spawnParticles(hit.x + 0.5, hit.y + 0.5, hit.z + 0.5, [0.55, 0.5, 0.45], 3, 2, 0.4);
      SFX.mineHit();
    }
    if (b.progress >= b.time) {
      this.breakBlock(hit.x, hit.y, hit.z, def);
      this.breaking = null;
      this.ui.setGatherProgress(null);
    }
  }

  breakBlock(x, y, z, def) {
    this.world.setBlock(x, y, z, B.air, true);
    this.renderer.spawnParticles(x + 0.5, y + 0.5, z + 0.5, [0.5, 0.45, 0.4], 10, 3, 0.6);
    SFX.breakBlock();
    if (def.drops) this.inventory.add(def.drops, 1);
    if (def.tool === 'pickaxe') this.skills.addXp('mining', 3);
    if (def.tool === 'axe' && def.name !== 'workbench') this.skills.addXp('woodcutting', 2);
    if (this._breakTool) this.inventory.damageTool(this._breakTool, 1);
    emit('blockBroken', { x, y, z, block: def.name });
    // breaking a player chest? spill contents
    if (def.name === 'chest_block') {
      const chest = this.world.getChestAt(x, y, z);
      if (chest) {
        for (const c of this.world.openChest(chest.id)) this.inventory.add(c.item, c.qty);
        this.world.chestContents.delete(chest.id);
        this.world.chestMeta.delete(chest.id);
      }
    }
  }

  onSecondary() {
    if (this.combat.active || this.player.dead || this.dialogueOpen || this.ui.currentWindow) return;
    // interactables first
    if (this.tryInteract(true)) return;
    // place block
    const hit = this.facingRay();
    if (!hit || hit.node) return;
    const sel = this.inventory.selectedStack();
    const def = sel ? ITEMS[sel.item] : null;
    if (!def?.block) return;
    const px = hit.x + hit.face[0], py = hit.y + hit.face[1], pz = hit.z + hit.face[2];
    if (py < 1 || py >= WORLD_H) return;
    const existing = this.world.getBlock(px, py, pz);
    if (existing !== B.air && BLOCKS[existing].solid) return;
    // don't place inside yourself
    const p = this.player;
    const [minX, minY, minZ, maxX, maxY, maxZ] = p.aabb();
    const blockDef = BLOCKS[B[def.block]];
    if (blockDef.solid &&
        px + 1 > minX && px < maxX && py + 1 > minY && py < maxY && pz + 1 > minZ && pz < maxZ) return;
    if (this.world.nodeAt(px, py, pz)) return;
    this.world.setBlock(px, py, pz, B[def.block], true);
    this.inventory.removeSlot(this.inventory.selected, 1);
    if (def.block === 'chest_block') this.world.registerPlayerChest(px, py, pz);
    this.skills.addXp('construction', 2);
    emit('blockPlaced', { x: px, y: py, z: pz, block: def.block });
    SFX.place();
  }

  tryInteract(silent = false) {
    if (this.combat.active || this.player.dead) return false;
    const npc = this.npcInFront();
    if (npc) {
      this.quests.talkedTo(npc.id);
      this.ui.showDialogue(NPC_DEFS[npc.id].dialogue);
      emit('talkedTo', { npc: npc.id });
      return true;
    }
    const hit = this.facingRay();
    if (!hit || hit.node) return false;
    const def = BLOCKS[hit.id];
    if (!def) return false;
    if (['workbench', 'furnace', 'anvil_block', 'campfire', 'alchemy_table', 'loom_block', 'enchant_altar', 'construction_bench'].includes(def.name)) {
      this.ui.openWindow('crafting');
      return true;
    }
    if (def.name === 'chest_block') {
      const chest = this.world.getChestAt(hit.x, hit.y, hit.z);
      const id = chest ? chest.id : this.world.registerPlayerChest(hit.x, hit.y, hit.z);
      const meta = this.world.chestMeta.get(id);
      if (meta?.requiresBossDead && !this.flags[meta.requiresBossDead]) {
        this.ui.toast('The chest is bound shut by living roots… defeat the guardian.', 'warn');
        return true;
      }
      this.ui.openChestUI(id);
      emit('chestOpened', { id });
      return true;
    }
    return false;
  }

  onTapInteract() {
    if (this.combat.active) return; // combat taps handled by canvas click
    if (this.dialogueOpen || this.ui.currentWindow) return;
    const enemy = this.enemyInFront();
    if (enemy) { this.startCombat(enemy); return; }
    this.tryInteract();
  }

  useItem(slotIdx) {
    const s = this.inventory.slots[slotIdx];
    if (!s) return;
    const def = ITEMS[s.item];
    if (s.item === 'waterlogged_cache') {
      this.inventory.removeSlot(slotIdx, 1);
      const roll = Math.random();
      if (roll < 0.4) this.inventory.add('old_coin', 2 + Math.floor(Math.random() * 4));
      else if (roll < 0.7) this.inventory.add('rough_gem', 1);
      else if (roll < 0.9) this.inventory.add('relic_fragment', 1);
      else this.inventory.add('coin', 25);
      this.skills.addXp('archaeology', 20);
      return;
    }
    if (def.type !== 'food' && def.type !== 'potion') return;
    if (def.heal) this.player.heal(def.heal);
    if (def.energy) this.player.energy = Math.min(this.player.maxEnergy, this.player.energy + def.energy);
    if (def.mana) this.player.mana = Math.min(this.player.maxMana, this.player.mana + def.mana);
    this.inventory.removeSlot(slotIdx, 1);
    SFX.pickup();
  }

  nearbyStations() {
    const p = this.player;
    const out = new Set();
    const px = Math.floor(p.x), py = Math.floor(p.y), pz = Math.floor(p.z);
    const names = ['workbench', 'furnace', 'anvil_block', 'campfire', 'alchemy_table', 'loom_block', 'enchant_altar', 'construction_bench'];
    for (let dy = -2; dy <= 2; dy++) {
      for (let dz = -5; dz <= 5; dz++) {
        for (let dx = -5; dx <= 5; dx++) {
          const id = this.world.getBlock(px + dx, py + dy, pz + dz);
          const def = BLOCKS[id];
          if (def && names.includes(def.name)) out.add(def.name);
        }
      }
    }
    return out;
  }

  // ---------------------------------------------------------------- combat glue
  startCombat(enemyEntity) {
    if (this.combat.active) return;
    const group = this.enemyMgr.nearbyGroup(enemyEntity.x, enemyEntity.z, 5)
      .filter((e) => e.def.behavior !== 'passive' || e === enemyEntity)
      .slice(0, 4);
    this.combat.start(group, enemyEntity.x, enemyEntity.z);
  }

  onCombatStart() {
    this.controls.enabled = false;
    document.body.classList.add('in-combat');
    document.exitPointerLock?.();
    this.ui.closeWindow();
    this.ui.hideDialogue();
    this.touch?.hide();
    this.combatTarget = null;
    this.renderPositions.clear();
    // orbit camera over the arena
    const tiles = [...this.combat.tiles.values()];
    let cx = 0, cy = 0, cz = 0;
    for (const t of tiles) { cx += t.gx + 0.5; cy += t.y; cz += t.gz + 0.5; }
    cx /= tiles.length; cy /= tiles.length; cz /= tiles.length;
    const yaw = this.player.yaw;
    const dist = 11;
    this.combatCam = {
      target: [cx, cy + 1, cz],
      eye: [cx + Math.sin(yaw) * dist, cy + 9.5, cz + Math.cos(yaw) * dist],
    };
    this.ui.showCombat();
    SFX.swing();
  }

  onCombatEnd({ result }) {
    this.ui.hideCombat();
    document.body.classList.remove('in-combat');
    this.combatCam = null;
    if (this.touch && !this.player.dead) this.touch.show();
    if (result === 'won') {
      SFX.victory();
      for (const t of this.combat.combatants.filter((c) => c.kind === 'enemy')) {
        if (t.type === 'rootbound_golem') {
          this.flags.boss_rootbound = true;
          this.ui.toast('🏆 The Rootgrave falls silent…', 'gold');
        }
      }
      this.autosaveTimer = Math.min(this.autosaveTimer, 2);
    } else if (result === 'lost') {
      SFX.defeat();
      this.player.dead = true;
      this.player.hp = 0;
      this.onPlayerDeath();
      return;
    }
    if (!this.player.dead) this.controls.enabled = true;
  }

  onCombatFx(fx) {
    const c = fx.target;
    if (!c) return;
    const t = this.combat.tileAt?.(c.gx, c.gz);
    const pos = t ? [t.gx + 0.5, t.y + 0.8, t.gz + 0.5] : null;
    if (!pos) return;
    if (fx.kind === 'damage') {
      this.renderer.spawnParticles(pos[0], pos[1], pos[2], fx.crit ? [1, 0.8, 0.2] : [0.9, 0.2, 0.2], fx.crit ? 14 : 8, 2.5, 0.5);
      c.flashT = 0.25;
      if (c.kind === 'player' && this.settings.screenShake && !this.settings.reducedMotion) this.shake = 0.3;
      SFX.hit();
    } else if (fx.kind === 'heal') {
      this.renderer.spawnParticles(pos[0], pos[1], pos[2], [0.4, 0.9, 0.5], 10, 1.8, 0.7);
      SFX.heal();
    } else if (fx.kind === 'death') {
      this.renderer.spawnParticles(pos[0], pos[1], pos[2], [0.3, 0.3, 0.3], 18, 3, 0.8);
    } else if (fx.kind === 'attack') {
      SFX.swing();
    }
  }

  onCombatClick(sx, sy) {
    const combat = this.combat;
    if (!combat.active || combat.current() !== combat.playerC) return;
    // nearest projected tile / combatant to the click
    const pick = (positions) => {
      let best = null, bestD = 44;
      for (const p of positions) {
        const pr = this.renderer.project(p.x, p.y, p.z);
        if (!pr) continue;
        const d = Math.hypot(pr[0] - sx, pr[1] - sy);
        if (d < bestD) { best = p; bestD = d; }
      }
      return best;
    };
    const mode = this.ui.combatMode;
    if (mode === 'move') {
      const reach = combat.getMovableTiles();
      const opts = [...reach.keys()].map((k) => {
        const t = combat.tiles.get(k);
        return { x: t.gx + 0.5, y: t.y, z: t.gz + 0.5, gx: t.gx, gz: t.gz };
      });
      const chosen = pick(opts);
      if (chosen) {
        combat.doMove(chosen.gx, chosen.gz);
        this.ui.combatMode = null;
        this.ui.renderCombat();
      }
      return;
    }
    // clicking enemies (target select / ability / inspect)
    const enemies = combat.enemies().map((e) => {
      const t = combat.tileAt(e.gx, e.gz);
      return { x: e.gx + 0.5, y: t ? t.y + 1 : e.y, z: e.gz + 0.5, id: e.id };
    });
    const chosen = pick(enemies);
    if (!chosen) { this.ui.showTargetInfo(null); return; }
    const enemy = combat.combatants.find((c) => c.id === chosen.id);
    if (this.ui.inspectMode || !mode?.ability) {
      const info = combat.doInspect(chosen.id);
      const basic = combat.playerAbilities()[0];
      this.ui.showTargetInfo(info, combat.preview(combat.playerC, enemy, basic));
      return;
    }
    if (mode?.ability) {
      const abilityDef = combat.playerAbilities().find((a) => a.id === mode.ability);
      if (this.combatTarget !== chosen.id) {
        this.combatTarget = chosen.id;
        const info = combat.doInspect(chosen.id);
        this.ui.showTargetInfo(info, combat.preview(combat.playerC, enemy, abilityDef));
        return;
      }
      if (combat.doAbility(mode.ability, chosen.id)) {
        this.ui.combatMode = null;
        this.combatTarget = null;
        this.ui.showTargetInfo(null);
        this.ui.renderCombat();
      }
    }
  }

  onPlayerDeath() {
    this.controls.enabled = false;
    this.touch?.hide();
    const lost = Math.floor(this.inventory.coins * 0.1);
    if (lost > 0) this.inventory.remove('coin', lost);
    $('death-text').textContent = lost > 0 ? `You dropped ${lost} coins in the chaos.` : 'The world spins, then fades…';
    $('death-screen').classList.remove('hidden');
  }

  respawn() {
    $('death-screen').classList.add('hidden');
    const [sx, sy, sz] = this.world.markers.spawn;
    this.player.respawnAt(sx + 0.5, this.world.surfaceAt(sx, sz) + 1, sz + 0.5);
    this.controls.enabled = true;
    this.touch?.show();
    this.saveGame();
  }

  // ---------------------------------------------------------------- rendering glue
  collectEntities(dt) {
    const out = [];
    if (this.combat.active) {
      for (const c of this.combat.combatants) {
        if (c.hp <= 0) continue;
        const t = this.combat.tileAt(c.gx, c.gz);
        if (!t) continue;
        // smooth movement
        let rp = this.renderPositions.get(c.id);
        const tx = t.gx + 0.5, tz = t.gz + 0.5;
        if (!rp) { rp = { x: tx, z: tz, y: t.y }; this.renderPositions.set(c.id, rp); }
        rp.x += (tx - rp.x) * Math.min(1, dt * 8);
        rp.z += (tz - rp.z) * Math.min(1, dt * 8);
        rp.y += (t.y - rp.y) * Math.min(1, dt * 8);
        c.flashT = Math.max(0, (c.flashT || 0) - dt);
        const facing = c.kind === 'player'
          ? Math.atan2((this.combat.enemies()[0]?.gx ?? c.gx) - c.gx, (this.combat.enemies()[0]?.gz ?? c.gz) - c.gz)
          : Math.atan2(this.combat.playerC.gx - c.gx, this.combat.playerC.gz - c.gz);
        out.push({
          model: c.kind === 'player' ? this.playerModelName : c.type,
          x: rp.x, y: rp.y, z: rp.z, yaw: facing,
          tint: c.flashT > 0 ? [0.6, 0.1, 0.1] : (c.telegraph ? [0.25, 0.05, 0.05] : [0, 0, 0]),
        });
      }
    } else {
      for (const e of this.enemyMgr.entities.values()) {
        const d = Math.hypot(e.x - this.player.x, e.z - this.player.z);
        if (d > 40) continue;
        out.push({ model: e.type, x: e.x, y: e.y, z: e.z, yaw: e.yaw, tint: [0, 0, 0] });
      }
    }
    for (const npc of this.world.structure.npcs) {
      out.push({ model: `npc_${npc.id}`, x: npc.x + 0.5, y: npc.y, z: npc.z + 0.5, yaw: Math.atan2(this.player.x - npc.x, this.player.z - npc.z), tint: [0, 0, 0] });
    }
    return out;
  }

  collectMarkers() {
    const out = [];
    for (const [, chunk] of this.world.chunks) {
      for (const node of chunk.nodes) {
        if (node.def.kind !== 'water') continue;
        const st = this.world.nodeState(node.id);
        if (st?.state !== 'ready') continue;
        const d = Math.hypot(node.x - this.player.x, node.z - this.player.z);
        if (d > 40) continue;
        out.push({ x: node.x, y: node.y - 0.85, z: node.z, color: [0.5, 0.75, 1] });
      }
    }
    return out;
  }

  labelVisible(x, y, z) {
    // occlude labels behind solid terrain
    const eye = this.combat.active && this.combatCam ? this.combatCam.eye : this.player.eye();
    const dx = x - eye[0], dy = y - eye[1], dz = z - eye[2];
    const dist = Math.hypot(dx, dy, dz);
    if (dist < 0.5) return true;
    const hit = this.world.raycast(eye[0], eye[1], eye[2], dx / dist, dy / dist, dz / dist, dist - 0.6, false);
    return !hit || !BLOCKS[hit.id]?.opaque;
  }

  updateWorldLabels() {
    const labels = [];
    if (this.combat.active) {
      for (const c of this.combat.combatants) {
        if (c.kind !== 'enemy' || c.hp <= 0) continue;
        const rp = this.renderPositions.get(c.id);
        const t = this.combat.tileAt(c.gx, c.gz);
        if (!rp || !t) continue;
        labels.push({
          x: rp.x, y: t.y + 2.2, z: rp.z,
          name: c.label, hpFrac: c.hp / c.maxHp,
          intent: c.telegraph ? '⚠️' : null,
          color: c.def.boss ? '#e2b13c' : '#ffb0a0',
        });
      }
    } else {
      for (const npc of this.world.structure.npcs) {
        const d = Math.hypot(npc.x - this.player.x, npc.z - this.player.z);
        if (d > 22) continue;
        if (!this.labelVisible(npc.x + 0.5, npc.y + 1.6, npc.z + 0.5)) continue;
        const def = NPC_DEFS[npc.id];
        const hasQuest = this.quests.availableFrom(npc.id).length > 0;
        const turnIn = this.quests.activeFrom(npc.id).some((q) => this.quests.readyToTurnIn(q, npc.id));
        labels.push({
          x: npc.x + 0.5, y: npc.y + 2, z: npc.z + 0.5,
          name: `${turnIn ? '✅ ' : hasQuest ? '❗ ' : ''}${def.label}`,
          sub: def.role, color: '#ffe9a8',
        });
      }
      for (const e of this.enemyMgr.entities.values()) {
        const d = Math.hypot(e.x - this.player.x, e.z - this.player.z);
        if (d > 18) continue;
        if (!this.labelVisible(e.x, e.y + 1.2, e.z)) continue;
        labels.push({
          x: e.x, y: e.y + 1.6, z: e.z,
          name: e.def.label,
          sub: e.def.behavior === 'aggressive' ? 'hostile' : e.def.behavior === 'defensive' ? 'wary' : 'harmless',
          hpFrac: e.hp < e.def.hp ? e.hp / e.def.hp : null,
          color: e.def.behavior === 'aggressive' ? '#ff9a8a' : '#d8e2c8',
        });
      }
    }
    this.ui.updateLabels(labels);
  }

  // ---------------------------------------------------------------- save
  saveGame() {
    const data = {
      meta: {
        seedText: this.seedText,
        savedAt: Date.now(),
        playtime: Math.round(this.playtime),
        totalLevel: this.skills.totalLevel(),
        version: 1,
      },
      world: this.world.serialize(),
      player: this.player.serialize(),
      inventory: this.inventory.serialize(),
      skills: this.skills.serialize(),
      quests: this.quests.serialize(),
      enemies: this.enemyMgr.serialize(),
      flags: this.flags,
      discovered: [...this.discovered],
      discoveredItems: [...this.discoveredItems],
    };
    saveSlot(this.slot, data);
  }

  restore(d) {
    this._restored = true;
    this.world.deserialize(d.world);
    this.player.deserialize(d.player);
    this.inventory.deserialize(d.inventory);
    this.skills.deserialize(d.skills);
    this.quests.deserialize(d.quests);
    this.enemyMgr.deserialize(d.enemies);
    this.flags = d.flags || {};
    this.discovered = new Set(d.discovered || []);
    this.discoveredItems = new Set(d.discoveredItems || []);
    this.playtime = d.meta?.playtime || 0;
  }
}

function gatherVerb(def) {
  return { tree: 'Chop', ore: 'Mine', plant: 'Gather', water: 'Fish', ground: 'Excavate', farm: 'Harvest' }[def.kind] || 'Gather';
}

function normAngle(a) {
  while (a > Math.PI) a -= 2 * Math.PI;
  while (a < -Math.PI) a += 2 * Math.PI;
  return a;
}

const frame = () => new Promise((r) => requestAnimationFrame(r));

// ---------------------------------------------------------------- title flow
function renderTitle() {
  const slotsEl = $('save-slots');
  const slots = listSlots();
  slotsEl.innerHTML = '';
  for (const s of slots) {
    const b = document.createElement('button');
    b.className = 'slot-btn';
    if (s.empty) {
      b.innerHTML = `<span>Slot ${s.slot} — <b>New Adventure</b></span><span class="slot-sub">start fresh</span>`;
    } else {
      const mins = Math.floor(s.playtime / 60);
      b.innerHTML = `<span>Slot ${s.slot} — <b>Continue</b><br><span class="slot-sub">Total level ${s.totalLevel} · ${mins}m played · seed "${s.seedText}"</span></span><span class="slot-del" title="Delete save">🗑</span>`;
    }
    b.addEventListener('click', (e) => {
      if (e.target.classList.contains('slot-del')) {
        if (confirm(`Delete save in slot ${s.slot}?`)) { deleteSlot(s.slot); renderTitle(); }
        return;
      }
      startGame(s.slot, s.empty);
    });
    slotsEl.appendChild(b);
  }
  $('title-hint').textContent = isTouchDevice()
    ? 'Left stick to move · drag right side to look · ✦ to gather and fight'
    : 'WASD to move · mouse to look · hold left click to gather · E for inventory';
}

async function startGame(slot, isNew) {
  const seedInput = $('seed-input').value.trim();
  let saveData = null;
  let seedText;
  if (isNew) {
    seedText = seedInput || `${Math.floor(Math.random() * 999999)}`;
  } else {
    saveData = loadSlot(slot);
    seedText = saveData?.meta?.seedText || saveData?.world?.seed?.toString() || '0';
  }
  $('title-screen').classList.add('hidden');
  $('loading-screen').classList.remove('hidden');

  buildAtlas();
  const game = new Game(slot, seedText, saveData);
  window.__game = game; // for automated tests & debugging
  const crafting = await import('./game/crafting.js');
  window.__crafting = crafting;
  await game.init((frac, text) => {
    $('loading-fill').style.width = `${Math.round(frac * 100)}%`;
    $('loading-text').textContent = text;
  });
  $('loading-screen').classList.add('hidden');
  $('hud').classList.remove('hidden');
  if (game.touch) game.touch.show();
  game.ui.renderHotbar();
  game.ui.renderQuestTracker();
  game.saveGame();
  game.start();
}

initAudio(loadSettings());
renderTitle();
window.addEventListener('error', (e) => console.error('[emberveil]', e.message));
