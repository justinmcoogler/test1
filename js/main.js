// Sproutlands — main orchestration: boot, game loop, interactions, camera, save.
import { buildAtlas } from './gfx/textures.js';
import { Renderer } from './gfx/renderer.js';
import { World, initSlabSet } from './world/world.js';
import { Weather } from './world/weather.js';
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
import { CombatRS } from './game/combatrs.js';
import { NPC_DEFS } from './game/npcs.js';
import { UI } from './ui/ui.js';
import { registerMob, injectSpawnRules, fetchMobFiles, evaluatePose } from './game/mobloader.js';
import { findPath } from './game/pathfind.js';
import { icon as pixelIcon } from './gfx/icons.js';
import { applyTexturePack } from './gfx/textures.js';
import { buildRig, playerAnimations } from './game/rigs.js';
import { buildPlayerSkinCanvas, partBoxUV, swatchUV, preloadPlayerSkins } from './gfx/playerskin.js';
import { MOB_REMAKES } from './game/mobremakes/index.js';
import { registerRemadeMob, preloadMobSkins, mobSkinOverride } from './game/mobremake.js';
import { registerImportedMobs } from './game/mobpack.js';
import { registerProps } from './game/proppack.js';
import { EducationManager } from './game/education.js';
import { LessonRunner } from './game/lessons.js';
import { hashSeed } from './core/rng.js';
import { on, emit, clearAllListeners } from './core/events.js';
import { clamp } from './core/math.js';
import {
  loadSettings, saveSettings, listSlots, saveSlot, loadSlot, deleteSlot, NUM_SLOTS,
} from './game/save.js';
import { initAudio, setVolumes, setMusicMood, setNightAmbience, SFX } from './core/audio.js';

const $ = (id) => document.getElementById(id);

class Game {
  constructor(slot, seedText, saveData) {
    this.slot = slot;
    this.seedText = seedText;
    this.settings = loadSettings();
    this.canvas = $('game-canvas');
    this.renderer = new Renderer(this.canvas);
    // blit the real 32×32 art pack over the procedural atlas, then re-upload
    applyTexturePack().then((ok) => { if (ok) this.renderer.refreshAtlas(); });
    this.world = new World(hashSeed(seedText));
    this.weather = new Weather(this.world.seed);
    this.player = new Player();
    this.inventory = new Inventory();
    this.skills = new Skills();
    this.quests = new QuestLog(this.inventory, this.skills);
    this.enemyMgr = new EnemyManager(this.world);
    this.combat = new Combat(this);
    this.combatRS = new CombatRS(this);
    this.education = new EducationManager(); // dormant in free play; see docs/EDUCATION.md
    this.hitsplats = [];
    this.splatId = 0;
    this.controls = new Controls(this.canvas, this.settings);
    this.touch = isTouchDevice() ? new TouchControls(this.controls, this.settings) : null;
    this.ui = new UI(this);
    this.lessons = new LessonRunner(this); // kids' Learning Mode engine (rides education)

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
    // classic (RuneScape-style) camera state
    this.camYaw = Math.PI;
    this.camPitch = -0.85;
    this.camDist = 10;
    this.moveTarget = null;      // {x, z} click-to-move destination
    this.pendingInteract = null; // {kind, ...} action to run on arrival
    this.autoGatherNode = null;
    this.autoBreak = null;       // {x, y, z} block to break on arrival
    this.blockedTime = 0;
    this.modelYaw = Math.PI;

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
    onProgress(0, 'Waking Brookhollow…');
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
    } else {
      // Save-compat: pre-128 saves stored an absolute y from the old 64-tall
      // world, which now lands the player deep inside the taller terrain. If
      // their feet are inside a solid block, snap up to standable ground.
      const px = Math.floor(this.player.x), pz = Math.floor(this.player.z);
      if (this.world.collisionHeight(px, Math.floor(this.player.y), pz) > 0) {
        const gy = this.world.groundNear(px, pz, this.player.y);
        this.player.y = gy ?? this.world.surfaceAt(px, pz) + 1;
        this.player.vy = 0;
      }
    }
    this.enemyMgr.refresh();
    this.enemyMgr.applySavedHp();
    this.recomputeVitals();
    this.lessons.resume(); // re-show any in-progress lesson prompt after a load
    onProgress(1, 'Waking up…');
  }

  registerModels() {
    window.__remakes = MOB_REMAKES; // dev/harness access (framing, audits)
    for (const [type, def] of Object.entries(ENEMY_TYPES)) {
      if (def.custom) continue; // imported mobs register through the mob loader
      if (MOB_REMAKES[type]) { registerRemadeMob(this.renderer, type, MOB_REMAKES[type]); continue; }
      const rig = buildRig(type, def);
      if (rig) this.renderer.registerAnimatedModel(type, rig.parts, rig.animations);
      else this.renderer.registerModel(type, def.model, def.skin);
    }
    for (const [id, def] of Object.entries(NPC_DEFS)) {
      // villagers share the player skeleton: rig the standard box layout
      // (legs 0-1, torso 2, arms 3-4, head 5, extras) into animated parts
      const PX = 1.8 / 32;
      const m = def.model;
      if (!m[5].texFront) m[5].texFront = 'skin_face';
      const headIdx = new Set([5, ...(def.headExtra || [])]);
      const limbIdx = new Set([0, 1, 3, 4]);
      const parts = [
        { id: 'body', pivot: [0, 12 * PX, 0], boxes: m.filter((b, i) => !headIdx.has(i) && !limbIdx.has(i)), tex: 'skin_cloth' },
        { id: 'leg_l', pivot: [-2 * PX, 12 * PX, 0], boxes: [m[0]], tex: 'skin_cloth' },
        { id: 'leg_r', pivot: [2 * PX, 12 * PX, 0], boxes: [m[1]], tex: 'skin_cloth' },
        { id: 'arm_l', pivot: [-6 * PX, 23 * PX, 0], boxes: [m[3]], tex: 'skin_cloth' },
        { id: 'arm_r', pivot: [6 * PX, 23 * PX, 0], boxes: [m[4]], tex: 'skin_cloth' },
        { id: 'head', pivot: [0, 24 * PX, 0], boxes: m.filter((b, i) => headIdx.has(i)), tex: 'skin_solid' },
      ];
      this.renderer.registerAnimatedModel(`npc_${id}`, parts, { idle: playerAnimations().idle });
    }
    this.playerModelVersion = 0;
    this.registerPlayerModel();
    // If real 64×64 player art (skin_player_base / skin_armor_*) is bundled,
    // decode it once and repaint the skin; a no-op until those PNGs exist.
    preloadPlayerSkins().then((n) => { if (n) this.registerPlayerModel(); });
    // Same for per-creature mob skins (mob_<type>.png) — re-register any remade
    // mob whose real art just decoded.
    preloadMobSkins().then((n) => {
      if (!n) return;
      for (const [type, def] of Object.entries(MOB_REMAKES)) {
        if (mobSkinOverride(type)) registerRemadeMob(this.renderer, type, def);
      }
    });
    // Imported Blockbench models (assets/mobs/*.bbmodel drop-ins + the licensed
    // pack in js/gfx/mobpack-imported.js) fully replace a type's model — decoded
    // + registered async once ready. Pack mobs are admin-activated, not spawned.
    registerImportedMobs(this.renderer).then((done) => {
      if (done.length) console.log(`[mobpack] ${done.length} imported model(s) active`);
    });
    // Nature-prop forage models (js/gfx/proppack.js) — static 3D props scattered
    // by worldgen and drawn in the entity pass; remesh nearby chunks once ready
    // so any already-generated prop cells pick up their model.
    registerProps(this.renderer).then((done) => {
      if (done.length) { console.log(`[proppack] ${done.length} prop model(s) active`); this.propsReady = true; }
    });
  }

  registerPlayerModel() {
    // The adventurer wears its gear: buildPlayerSkinCanvas paints the equipped
    // armour and held weapon/shield onto one 96×64 skin, and each body box maps
    // its faces into that skin (Minecraft-style). See js/gfx/playerskin.js.
    const eq = this.inventory.equipment;
    const canvas = buildPlayerSkinCanvas(eq);
    const tex = this.renderer.createMobTexture(canvas);

    // Blocky-humanoid geometry (MC proportions: head 8³, torso 8×12×4,
    // arms/legs 4×12×4), scaled to the 1.8-block collision height. color=[1,1,1]
    // so the skin shows as painted (the renderer shades it by face brightness).
    const PX = 1.8 / 32;
    const W = [1, 1, 1];
    const B = (fx, fy, fz, w, h, d, uv) => ({
      x: fx * PX, y: fy * PX, z: fz * PX, w: w * PX, h: h * PX, d: d * PX, color: W, uv,
    });
    const legL = [B(-4, 0, -2, 4, 12, 4, partBoxUV('leg_l'))];
    const legR = [B(0, 0, -2, 4, 12, 4, partBoxUV('leg_r'))];
    const torso = [B(-4, 12, -2, 8, 12, 4, partBoxUV('body'))];
    const armL = [B(-8, 12, -2, 4, 12, 4, partBoxUV('arm_l'))];
    const armR = [B(4, 12, -2, 4, 12, 4, partBoxUV('arm_r'))];
    const headBoxes = [B(-4, 24, -4, 8, 8, 8, partBoxUV('head'))];
    // held weapon: a small 3D model in the right fist, coloured by material
    // (via the skin swatches); it swings with the right arm. Shape by class.
    const weapon = eq.main || eq.ranged;
    if (weapon) {
      const wclass = ITEMS[weapon.item]?.wclass;
      if (wclass === 'ranged') {                       // a bow held upright
        armR.push(B(6, 4, 2.5, 1, 8, 1, swatchUV('grip')));   // lower limb
        armR.push(B(6, 12, 2.5, 1, 8, 1, swatchUV('grip')));  // upper limb
        armR.push(B(5.4, 10, 2.6, 1.4, 4, 1, swatchUV('blade'))); // riser
      } else if (wclass === 'magic') {                 // a staff with a glowing tip
        armR.push(B(5.6, 4, 2.5, 1.2, 16, 1.2, swatchUV('grip')));
        armR.push(B(5.2, 19, 2.1, 2, 2, 2, swatchUV('blade')));
      } else {                                         // melee: hilt, guard, blade
        armR.push(B(5.2, 9, 2.5, 1.6, 5, 1.6, swatchUV('grip')));       // grip
        armR.push(B(3.6, 13.5, 2.2, 5, 1.4, 2, swatchUV('grip')));      // crossguard
        armR.push(B(5.4, 14.5, 2.7, 1.2, 10, 1.2, swatchUV('blade')));  // blade (up)
      }
    }
    // shield: a broad plate on the outside of the left arm, with a rim
    if (eq.off) {
      armL.push(B(-11, 11, -4, 1.4, 10, 9, swatchUV('shield')));   // face
      armL.push(B(-11.2, 14, -2, 1.2, 4, 3, swatchUV('rim')));     // central boss
    }

    // rigged parts: legs swing at the hip, arms at the shoulder, head at the neck
    const parts = [
      { id: 'body', pivot: [0, 12 * PX, 0], boxes: torso },
      { id: 'leg_l', pivot: [-2 * PX, 12 * PX, 0], boxes: legL },
      { id: 'leg_r', pivot: [2 * PX, 12 * PX, 0], boxes: legR },
      { id: 'arm_l', pivot: [-6 * PX, 23 * PX, 0], boxes: armL },
      { id: 'arm_r', pivot: [6 * PX, 23 * PX, 0], boxes: armR },
      { id: 'head', pivot: [0, 24 * PX, 0], boxes: headBoxes },
    ];
    if (this.playerModelName) this.renderer.deleteModel(this.playerModelName);
    this.playerModelVersion++;
    this.playerModelName = `player_v${this.playerModelVersion}`;
    this.renderer.registerAnimatedModel(this.playerModelName, parts, playerAnimations(), tex);
  }

  bindGameEvents() {
    on('itemGained', ({ item }) => this.discoveredItems.add(item));
    on('rightClick', (pos) => this.onSecondary(pos));
    on('interactKey', () => this.tryInteract());
    // education-mode gates (invisible until a save switches to education mode)
    on('playtimeExhausted', () => {
      this.playtimeLocked = true;
      this.controls.enabled = false;
      this.combatRS.disengageAll();
      this.touch?.hide();
      this.ui.closeWindow();
      this.showPlaytimeLock();
      this.saveGame();
    });
    on('playtimeUnlocked', () => {
      this.playtimeLocked = false;
      document.getElementById('playtime-lock')?.remove();
      if (!this.player.dead) this.controls.enabled = true;
      this.touch?.show();
      this.ui.toast(`Play time added — ${this.education.balanceMinutes()} minutes banked!`, 'gold');
    });
    on('playtimeLow', ({ secondsLeft }) => {
      this.ui.toast(`${Math.ceil(secondsLeft / 60)} min of play time left — finish a lesson to bank more`, 'warn');
    });
    on('pointerLockFailed', () => {
      // embedded pages (iframes) often deny mouse capture. First person still
      // works there — the view follows the mouse freely — so stay put; never
      // yank the player into the classic camera mid-fight.
      if (this.settings.classicCamera || this._plNoteShown) return;
      this._plNoteShown = true;
      this.ui.toast('Free-look: the view follows your mouse (no capture here). Click and hold to gather or fight.', '');
    });
    on('toggleDebug', () => {
      const p = this.player;
      p.debug = !p.debug;
      if (p.debug) { p.dead = false; p.hp = p.maxHp; }
      let badge = document.getElementById('debug-badge');
      if (!badge) {
        badge = document.createElement('div');
        badge.id = 'debug-badge';
        badge.style.cssText = 'position:fixed;top:6px;left:50%;transform:translateX(-50%);z-index:60;' +
          'background:rgba(226,177,60,0.92);color:#241a04;font:700 12px system-ui,sans-serif;' +
          'padding:3px 12px;border-radius:6px;pointer-events:none;letter-spacing:1px;white-space:nowrap;';
        badge.textContent = '✈ DEBUG — Space up · Shift down · invulnerable · noclip';
        document.body.appendChild(badge);
      }
      badge.style.display = p.debug ? 'block' : 'none';
      this.ui?.toast?.(`Debug mode ${p.debug ? 'ON' : 'OFF'}`, p.debug ? 'gold' : 'warn');
    });
    on('toggleCamera', () => {
      this.settings.classicCamera = !this.settings.classicCamera;
      this.applySettings();
      if (this.settings.classicCamera) {
        this.camYaw = this.player.yaw;
        document.exitPointerLock?.();
      }
      this.ui.toast(this.settings.classicCamera ? 'Classic view — click to move, double-click to mine' : 'First-person view', 'gold');
    });
    on('wheelScroll', (dir) => {
      if (this.settings.classicCamera && !this.combat.active && !this.ui.currentWindow) {
        this.camDist = clamp(this.camDist + dir * 1.2, 5, 18);
      } else {
        emit('hotbarScroll', dir);
      }
    });
    on('rsAttack', () => {
      // your own swing animation
      this.playerAttackT = 0.45;
      this.playerAttackStart = this.world.time;
    });
    on('splash', ({ x, y, z }) => {
      this.renderer.spawnParticles(x, y, z, [0.55, 0.7, 0.95], 14, 3, 0.6, 0.1);
      SFX.splash();
    });
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
      this.touch.onTap = (x, y) => {
        if (this.settings.classicCamera && !this.combat.active) this.onClassicClick(x, y);
        else this.onTapInteract();
      };
      this.touch.onLongPress = (x, y) => {
        if (this.settings.classicCamera && !this.combat.active) this.onClassicClick(x, y, true);
      };
      this.touch.onPlace = () => this.onSecondary();
    }
    this.canvas.addEventListener('click', (e) => {
      if (this.combat.active) { this.onCombatClick(e.clientX, e.clientY); return; }
      // click-to-move is third-person (classic camera) ONLY — a first-person
      // click just attacks/interacts with whatever you're aiming at, and never
      // switches the camera
      if (this.settings.classicCamera) {
        this.onClassicClick(e.clientX, e.clientY, e.shiftKey);
      } else {
        if (this.controls.consumeClickSuppress()) return; // that "click" was a free-look drag
        this.onTapInteract();
      }
    });
    // Classic view: a plain click walks; to MINE/harvest a block (or crop) you
    // double-click it (or shift-click, or long-press on touch). Right-click is
    // reserved for placing, so a dedicated break gesture was missing.
    this.canvas.addEventListener('dblclick', (e) => {
      if (this.combat.active || !this.settings.classicCamera) return;
      this.onClassicClick(e.clientX, e.clientY, true);
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

  // Warmth from a nearby campfire or lava (0…~0.32), sampled on a throttle.
  computeFireWarmth(p) {
    const gx = Math.floor(p.x), gy = Math.floor(p.y), gz = Math.floor(p.z);
    let best = 0;
    for (let dx = -3; dx <= 3; dx++) {
      for (let dy = -1; dy <= 2; dy++) {
        for (let dz = -3; dz <= 3; dz++) {
          const b = this.world.getBlock(gx + dx, gy + dy, gz + dz);
          if (b === B.campfire || b === B.lava) {
            const w = 0.32 * Math.max(0, 1 - Math.hypot(dx, dy, dz) / 4.5);
            if (w > best) best = w;
          }
        }
      }
    }
    return best;
  }

  applySettings() {
    const s = this.settings;
    document.documentElement.style.setProperty('--ui-scale', s.uiScale);
    document.documentElement.style.setProperty('--text-scale', s.textScale);
    document.documentElement.classList.toggle('colorblind', s.colorblind);
    document.documentElement.classList.toggle('reduced-motion', s.reducedMotion);
    document.documentElement.classList.toggle('left-handed', s.leftHanded);
    this.renderer.renderDistance = s.renderDistance;
    this.renderer.dynamicResolution = s.dynamicResolution !== false;
    if (s.dynamicResolution === false && this.renderer.renderScale !== 1) { this.renderer.renderScale = 1; this.renderer.resize(); }
    this.renderer.reducedMotion = s.reducedMotion;
    this.renderer.highQuality = s.highGraphics === true || s.graphicsPreset === 'high'; // gradient sky + sun/moon/stars
    document.body.classList.toggle('classic-cam', !!s.classicCamera);
    if (s.classicCamera) document.exitPointerLock?.();
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
    // FPS badge: average over ~0.5s windows so the number is readable, not a blur
    let fpsAccum = 0, fpsFrames = 0;
    const fpsEl = document.getElementById('fps-badge');
    const loop = (now) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      try {
        this.renderer.adaptResolution(dt); // scale internal resolution to keep FPS smooth
        this.tick(dt);
      } catch (e) {
        console.error('tick error', e);
      }
      if (fpsEl) {
        fpsAccum += dt; fpsFrames++;
        if (fpsAccum >= 0.5) {
          const fps = Math.round(fpsFrames / fpsAccum);
          fpsEl.textContent = `${fps} FPS`;
          fpsEl.className = fps < 30 ? 'bad' : fps < 50 ? 'low' : '';
          fpsAccum = 0; fpsFrames = 0;
        }
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  tick(dt) {
    this.playtime += dt;
    const p = this.player;

    // input → camera & movement
    const classic = this.settings.classicCamera;
    this.controls.classicMode = classic;
    if (!this.combat.active) {
      if (classic) {
        const [dyaw, dpitch] = this.controls.consumeOrbit(dt);
        this.camYaw += dyaw;
        this.camPitch = clamp(this.camPitch + dpitch, -1.45, -0.25);
        this.updateClassicMovement(dt);
      } else {
        const [dyaw, dpitch] = this.controls.consumeLook(dt);
        p.yaw += dyaw;
        p.pitch = clamp(p.pitch + dpitch, -Math.PI / 2 + 0.05, Math.PI / 2 - 0.05);
        this.controls.worldMove = null;
        this.moveTarget = null;
        this.pendingInteract = null;
        this.autoGatherNode = null;
        this.autoBreak = null;
      }
      p.update(dt, this.controls, this.world);
    } else {
      this.controls.consumeLook();
      this.controls.consumeOrbit(dt);
      this.controls.worldMove = null;
    }

    this.world.update(dt);
    this.streamChunks();
    // enemyMgr.refresh() rescans every spawn in every loaded chunk (allocating a
    // Set + two array spreads); it's idempotent, so ~2.5 Hz is plenty. New
    // spawns/despawns appear within 0.4s — chunks stream in over seconds anyway.
    this._refreshAccum = (this._refreshAccum ?? 1) + dt;
    if (this._refreshAccum >= 0.4) { this._refreshAccum = 0; this.enemyMgr.refresh(); }
    this.enemyMgr.update(dt, p, this.combat.active);
    this.combat.update(dt);
    this.combatRS.update(dt);
    this.playerAttackT = Math.max(0, (this.playerAttackT || 0) - dt);
    // age out hitsplats
    for (let i = this.hitsplats.length - 1; i >= 0; i--) {
      this.hitsplats[i].life -= dt;
      if (this.hitsplats[i].life <= 0) this.hitsplats.splice(i, 1);
    }
    if ((this.rsCdTick = (this.rsCdTick || 0) + dt) > 0.25) {
      this.rsCdTick = 0;
      this.ui.refreshRSCooldowns();
    }

    // aggro check
    if (!this.combat.active && !p.dead && !this.dialogueOpen && !this.ui.currentWindow && !this.disableAggro) {
      if (this.settings.tacticalCombat) {
        const aggro = this.enemyMgr.checkAggro(p);
        if (aggro) this.startCombat(aggro);
      } else {
        // classic combat is multi-engagement: everything hostile in range piles on.
        // Hostiles grow bolder in the dark.
        const aggroMult = this.world.isNight() ? 1.5 : 1;
        for (const e of this.enemyMgr.entities.values()) {
          if (e.rsEngaged || e.def.behavior !== 'aggressive' || !e.def.aggroRange) continue;
          const d = Math.hypot(p.x - e.x, p.z - e.z);
          if (d < e.def.aggroRange * aggroMult && Math.abs(p.y - e.y) < 3) this.combatRS.engage(e);
        }
      }
    }

    // interactions (exploration only)
    if (!this.combat.active && !p.dead) {
      if (classic) {
        this.currentSelection = null;
        this.updateClassicInteraction(dt);
      } else {
        this.updateInteraction(dt);
      }
      this.quests.checkReach(p.x, p.z, p.y, this.world.markers);
    } else {
      this.ui.setPrompt(null);
      this.ui.setGatherProgress(null);
    }

    // quest helper: a dotted trail on the ground toward the current objective
    if (!this.combat.active && !p.dead) this.updateQuestTrail(dt);
    else this.trailDots = null;

    // education/playtime clock (no-op in free play)
    this.education.update(dt, !p.dead && !this.ui.currentWindow && !this.dialogueOpen && !this.playtimeLocked);

    // autosave (never mid-battle or on the death screen)
    this.autosaveTimer -= dt;
    if (this.autosaveTimer <= 0 && !this.combat.active && !p.dead) {
      this.autosaveTimer = 45;
      this.saveGame();
    }

    // weather & seasons: local biome climate drives a slow-moving weather front.
    // temperatureAt/moistureAt are two 3-octave fbm2 calls; the front is slowly
    // eased, so sampling at ~4 Hz (or when the player crosses to a new column) is
    // indistinguishable and skips the noise every other frame. Reused below for
    // the survival felt-temperature too, instead of sampling a second time.
    const cx = Math.floor(p.x), cz = Math.floor(p.z);
    this._climAccum = (this._climAccum || 0) + dt;
    if (!this._clim || this._climAccum >= 0.25 || cx !== this._climX || cz !== this._climZ) {
      this._climAccum = 0; this._climX = cx; this._climZ = cz;
      this._clim = { temp: this.world.gen.temperatureAt(cx, cz), moist: this.world.gen.moistureAt(cx, cz) };
    }
    const btemp = this._clim.temp;
    this.weather.update(dt, this.world.time, { temp: btemp, moist: this._clim.moist });
    const wr = this.weather.renderState();
    // per-biome atmospheric colour grade: warm/amber in the heat, cool/blue in the cold
    const grade = [1 + (btemp - 0.5) * 0.16, 1 + (btemp - 0.5) * 0.02, 1 - (btemp - 0.5) * 0.16];

    // day/night clock drives sky light, fog and the music mood (weather dims it)
    this.renderer.daylight = this.world.daylight() * wr.day;
    // sun sweeps east→overhead→west across the day; the sky shader draws the disc
    const sa = (this.world.dayPhase() - 0.25) * Math.PI * 2;
    this.renderer.sunDir = [Math.cos(sa), Math.sin(sa), 0.25];
    if ((this._moodTick = (this._moodTick || 0) + dt) > 1) {
      this._moodTick = 0;
      const night = this.world.isNight();
      setMusicMood(this.combatRS.active || this.combat.active ? 'combat' : night ? 'night' : 'day');
      setNightAmbience(night && !p.dead);
    }

    // fog: underground darkening
    const eyeY = p.y + p.eyeHeight;
    const surf = this.world.surfaceAt(Math.floor(p.x), Math.floor(p.z));
    const underground = eyeY < surf - 3 || (eyeY < SEA - 2);
    this.renderer.fogMix += ((underground ? 1 : 0) - this.renderer.fogMix) * Math.min(1, dt * 2);

    // Survival (temperature, hydration, nutrition) is throttled to ~5 Hz with an
    // accumulated dt — same integrated result at a fraction of the per-frame cost,
    // which keeps the frame budget (and click-to-move travel) healthy on weak GPUs.
    this._survAccum = (this._survAccum || 0) + dt;
    if (this._survAccum >= 0.2 && !p.debug && !p.dead) {
      const sdt = this._survAccum; this._survAccum = 0;
      this._fireWarmth = this.computeFireWarmth(p);
      const est = this.inventory.equipStats();
      const warmth = (est.warmth || 0) * 0.03 + est.armor * 0.012; // insulation proxy
      // Wide comfort band: unprepared cold/heat is a slow pressure (find a fire /
      // clothes), not a quick death. Constitution widens it further.
      const band = 0.24 + this.skills.level('vitality') * 0.0012;
      let felt;
      if (underground) {
        felt = 0.45;
      } else {
        felt = btemp // cached biome temperature (same 4 Hz sample as the weather front)
          + this.weather.tempOffset()
          - (1 - this.world.daylight()) * 0.10
          - Math.max(0, (p.y - SEA) / 220);
        if (p.inWater) felt -= 0.08;
        if (p.sprinting) felt += 0.02;
        felt += this._fireWarmth || 0;
      }
      p.tickTemperature(sdt, clamp(felt + warmth, 0, 1), band, warmth * 4);
      const hot = p.tempState === 'hot' || p.tempState === 'heatstroke';
      p.tickHydration(sdt, hot, p.sprinting, p.inWater);
      p.tickNutrition(sdt);
    } else if (this._survAccum >= 0.2) {
      this._survAccum = 0; // discard accrued time while dead/in debug
    }

    // camera
    this.shake = Math.max(0, this.shake - dt);
    const shakeAmt = this.shake > 0 ? this.shake * 0.15 : 0;
    const sx = (Math.random() - 0.5) * shakeAmt, sy = (Math.random() - 0.5) * shakeAmt;
    if (this.combat.active && this.combatCam) {
      const { eye, target } = this.combatCam;
      this.renderer.setOrbitCamera([eye[0] + sx, eye[1] + sy, eye[2]], target);
    } else if (classic) {
      const { eye, target } = this.classicCameraEye();
      this.renderer.setOrbitCamera([eye[0] + sx, eye[1] + sy, eye[2]], target);
    } else {
      const eye = p.eye();
      this.renderer.setFPSCamera([eye[0] + sx, eye[1] + sy, eye[2]], p.yaw, p.pitch);
    }

    // draw
    const overlayTiles = this.combat.active
      ? this.ui.getCombatTiles()
      : [
        ...this.combatRS.telegraphTiles(),
        ...(this.destMarker ? [{ x: this.destMarker.x, y: this.destMarker.y, z: this.destMarker.z, color: [1, 0.85, 0.3] }] : []),
      ];
    this.renderer.draw(this.world, {
      dt,
      entities: this.collectEntities(dt),
      tiles: overlayTiles,
      selection: this.currentSelection,
      markers: this.collectMarkers(),
      dots: (!this.combat.active && this.trailDots) || null,
      // weather only over open sky — caves keep their own darkness
      weather: underground ? null : wr,
      grade: underground ? null : grade,
    });

    // HUD
    this.ui.renderVitals();
    this.ui.drawCompass();
    if ((this.minimapTick = (this.minimapTick || 0) + dt) > 0.5) {
      this.minimapTick = 0;
      this.ui.drawMinimap();
    }
    this.updateWorldLabels();
    this.ui.updateHitsplats(this.hitsplats);
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
    // mesh: dirty chunks first (deferred until their neighbors exist so AO and
    // sky light never bake against phantom air), then first-time meshes
    const neighborsLoaded = (cx, cz) =>
      this.world.hasChunk(cx - 1, cz) && this.world.hasChunk(cx + 1, cz) &&
      this.world.hasChunk(cx, cz - 1) && this.world.hasChunk(cx, cz + 1) &&
      this.world.hasChunk(cx - 1, cz - 1) && this.world.hasChunk(cx + 1, cz - 1) &&
      this.world.hasChunk(cx - 1, cz + 1) && this.world.hasChunk(cx + 1, cz + 1);
    let meshBudget = 2;
    for (const key of [...this.world.dirtyChunks]) {
      if (meshBudget <= 0) break;
      const [cx, cz] = key.split(',').map(Number);
      if (!this.world.hasChunk(cx, cz)) { this.world.dirtyChunks.delete(key); continue; }
      if (!neighborsLoaded(cx, cz)) continue; // defer until neighbors stream in
      this.world.dirtyChunks.delete(key);
      this.renderer.remeshChunk(this.world, cx, cz);
      meshBudget--;
    }
    for (let r = 0; r <= R && meshBudget > 0; r++) {
      for (let dz = -r; dz <= r && meshBudget > 0; dz++) {
        for (let dx = -r; dx <= r && meshBudget > 0; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
          const cx = pcx + dx, cz = pcz + dz;
          if (this.renderer.hasMesh(cx, cz) || !this.world.hasChunk(cx, cz)) continue;
          if (!neighborsLoaded(cx, cz)) continue;
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

  // ---------------------------------------------------------------- classic camera mode
  updateClassicMovement(dt) {
    const p = this.player;
    const c = this.controls;
    // WASD moves relative to the camera and cancels click-to-move
    const [f, s] = c.moveVector();
    if (Math.abs(f) > 0.05 || Math.abs(s) > 0.05) {
      this.cancelClassicActions();
      this.travelDest = null;
      const sy = Math.sin(this.camYaw), cy = Math.cos(this.camYaw);
      c.worldMove = [(-sy * f) + (cy * s), (-cy * f) + (-sy * s)];
    } else if (this.moveTarget) {
      // follow computed waypoints first; the raw target is the last leg
      while (this.movePath?.length) {
        const wp = this.movePath[0];
        if (Math.hypot(wp.x + 0.5 - p.x, wp.z + 0.5 - p.z) < 0.5) this.movePath.shift();
        else break;
      }
      const via = this.movePath?.length ? { x: this.movePath[0].x + 0.5, z: this.movePath[0].z + 0.5 } : this.moveTarget;
      const dx = this.moveTarget.x - p.x, dz = this.moveTarget.z - p.z;
      const d = Math.hypot(dx, dz);
      const arriveDist = this.pendingInteract ? (this.pendingInteract.range || 0.45) : 0.45;
      if (d <= arriveDist) {
        c.worldMove = null;
        this.moveTarget = null;
        this.movePath = null;
        this.blockedTime = 0;
        this.executePendingInteract();
      } else {
        const vdx = via.x - p.x, vdz = via.z - p.z;
        const vd = Math.hypot(vdx, vdz) || 1;
        c.worldMove = [vdx / vd, vdz / vd];
        // auto-hop 1-block steps when we stop making progress — but only when
        // there's actually room to complete the hop. Under a low tree canopy the
        // leaves overhead would cap the jump and the walker would bounce in place
        // forever; in that case leave blockedTime to run the walk down to a clean
        // "can't reach that" instead of jittering.
        const speed = Math.hypot(p.vx, p.vz);
        if (p.onGround && speed < 0.6) {
          this.blockedTime += dt;
          if (this.blockedTime > 0.18) {
            if (this.canAutoHop(c.worldMove)) { p.vy = 8.1; p.onGround = false; }
            this.blockedTime = 0;
            this.moveTargetTimeout -= 0.8; // stalled hops shouldn't extend the walk
          }
        } else {
          this.blockedTime = 0;
        }
        this.moveTargetTimeout -= dt;
        if (this.moveTargetTimeout <= 0) {
          this.cancelClassicActions();
          this.ui.toast("Can't reach that.", 'warn');
        }
      }
    } else if (this.travelDest && !this.combatRS.active && !this.pendingInteract) {
      c.worldMove = null;
      this.nextTravelLeg();
    } else {
      c.worldMove = null;
      // auto-follow your combat target like the old game
      const rsTarget = this.combatRS.active ? this.combatRS.target : null;
      if (rsTarget && rsTarget.hp > 0 && this.combatRS.style !== 'ranged' && this.combatRS.style !== 'magic') {
        const dx = rsTarget.x - p.x, dz = rsTarget.z - p.z;
        const d = Math.hypot(dx, dz);
        if (d > 2.0) c.worldMove = [dx / d, dz / d];
      }
    }
    // face the direction of travel
    if (c.worldMove) this.modelYaw = Math.atan2(c.worldMove[0], c.worldMove[1]);
  }

  // A stalled auto-walk should only hop a step it can actually clear: there must
  // be headroom above the player to rise (else a leaf canopy caps the jump) and
  // a mountable 1-block step ahead with a clear landing on top of it.
  canAutoHop(dir) {
    if (!dir) return false;
    const p = this.player, w = this.world;
    const feetY = Math.floor(p.y + 0.02);
    // room over our own head to rise into
    if (w.collisionHeight(Math.floor(p.x), feetY + 2, Math.floor(p.z)) > 0) return false;
    const ax = Math.floor(p.x + dir[0] * 0.7), az = Math.floor(p.z + dir[1] * 0.7);
    const stepAhead = w.collisionHeight(ax, feetY, az) > 0;        // a step/wall to mount
    const landingClear = w.collisionHeight(ax, feetY + 1, az) === 0 // stand on it…
                      && w.collisionHeight(ax, feetY + 2, az) === 0; // …with headroom
    return stepAhead && landingClear;
  }

  // Long-distance map travel: walk leg by leg, recomputing as chunks stream in.
  nextTravelLeg() {
    const [tx, , tz] = this.travelDest;
    const p = this.player;
    if (Math.hypot(tx - p.x, tz - p.z) < 3.5) {
      this.travelDest = null;
      this.ui.toast('You have arrived.', 'gold');
      return;
    }
    const path = findPath(this.world, p.x, p.z, p.y, tx, tz, { maxExpand: 5000, goalRadius: 2 });
    if (!path || !path.length) {
      this.travelDest = null;
      this.ui.toast("No walkable route from here.", 'warn');
      return;
    }
    const last = path[path.length - 1];
    // two legs in a row ending at the same spot = genuinely stuck
    if (this._lastLegEnd && Math.hypot(last.x - this._lastLegEnd[0], last.z - this._lastLegEnd[1]) < 1.5) {
      this._travelStuck = (this._travelStuck || 0) + 1;
    } else this._travelStuck = 0;
    this._lastLegEnd = [last.x, last.z];
    if (this._travelStuck >= 2) {
      this.travelDest = null;
      this.ui.toast('The way ahead is blocked — this is as close as it gets on foot.', 'warn');
      return;
    }
    this.moveTarget = { x: last.x + 0.5, z: last.z + 0.5 };
    this.movePath = path.slice(0, -1);
    this.moveTargetTimeout = 30;
  }

  cancelClassicActions() {
    this.moveTarget = null;
    this.movePath = null;
    this.pendingInteract = null;
    this.autoGatherNode = null;
    this.autoBreak = null;
    this.gather = null;
    this.breaking = null;
    this.ui.setGatherProgress(null);
  }

  // ray from the classic camera through a screen point
  screenRay(sx, sy) {
    const v = this.renderer.view;
    const eye = this.renderer.camPos;
    const w = this.canvas.clientWidth, h = this.canvas.clientHeight;
    const ndcX = (sx / w) * 2 - 1;
    const ndcY = 1 - (sy / h) * 2;
    const tanHalf = Math.tan(this.renderer.fov / 2);
    const right = [v[0], v[4], v[8]];
    const up = [v[1], v[5], v[9]];
    const fwd = [-v[2], -v[6], -v[10]];
    const aspect = w / h;
    const dir = [
      fwd[0] + right[0] * ndcX * tanHalf * aspect + up[0] * ndcY * tanHalf,
      fwd[1] + right[1] * ndcX * tanHalf * aspect + up[1] * ndcY * tanHalf,
      fwd[2] + right[2] * ndcX * tanHalf * aspect + up[2] * ndcY * tanHalf,
    ];
    const l = Math.hypot(...dir) || 1;
    return { eye, dir: [dir[0] / l, dir[1] / l, dir[2] / l] };
  }

  onClassicClick(sx, sy, isBreak = false) {
    if (this.controls.consumeClickSuppress()) return; // that "click" was a camera drag
    if (this.player.dead || this.dialogueOpen || this.ui.currentWindow || this.combat.active) return;
    this.travelDest = null; // a manual click overrides map travel
    // 1. creatures & NPCs first (screen-space pick, like tapping them)
    const pickables = [];
    for (const e of this.enemyMgr.entities.values()) {
      const d = Math.hypot(e.x - this.player.x, e.z - this.player.z);
      if (d > 30) continue;
      pickables.push({ kind: 'enemy', ref: e, x: e.x, y: e.y + 0.8, z: e.z });
    }
    for (const npc of this.world.structure.npcs) {
      pickables.push({ kind: 'npc', ref: npc, x: npc.x + 0.5, y: npc.y + 1, z: npc.z + 0.5 });
    }
    let best = null, bestD = 30;
    for (const pk of pickables) {
      const pr = this.renderer.project(pk.x, pk.y, pk.z);
      if (!pr) continue;
      const d = Math.hypot(pr[0] - sx, pr[1] - sy);
      if (d < bestD) { best = pk; bestD = d; }
    }
    if (best && !isBreak) {
      if (best.kind === 'enemy') {
        this.pendingInteract = { kind: 'enemy', entity: best.ref, range: 2.6 };
        this.walkTo(best.ref.x, best.ref.z, 12);
      } else {
        this.pendingInteract = { kind: 'npc', npc: best.ref, range: 3.0 };
        this.walkTo(best.ref.x + 0.5, best.ref.z + 0.5, 12);
      }
      return;
    }

    // 2. world raycast
    const { eye, dir } = this.screenRay(sx, sy);
    const hit = this.world.raycast(eye[0], eye[1], eye[2], dir[0], dir[1], dir[2], 60);
    if (!hit) return;

    // clicking a resource node walks over and gathers it
    if (hit.node && !isBreak) {
      const st = this.world.nodeState(hit.node.id);
      if (st?.state === 'depleted') {
        const left = Math.max(0, Math.ceil(st.respawnAt - this.world.time));
        this.ui.toast(`${hit.node.def.label} — regrowing (${left}s)`, '');
        return;
      }
      const blocked = this.gatherBlockedReason(hit.node.def);
      if (blocked) { this.warnGather(hit.node.id + blocked, blocked); return; }
      this.pendingInteract = { kind: 'node', node: hit.node, range: 3.0 };
      this.walkTo(hit.node.x + 0.5, hit.node.z + 0.5, 14);
      return;
    }
    const bdef = BLOCKS[hit.id];
    // planted crops harvest on a plain click, like nodes
    if (bdef && (bdef.name === 'crop_ripe' || bdef.name === 'crop_young') && !isBreak) {
      this.pendingInteract = { kind: 'break', x: hit.x, y: hit.y, z: hit.z, range: 3.2 };
      this.walkTo(hit.x + 0.5, hit.z + 0.5, 12);
      return;
    }
    const stations = ['workbench', 'furnace', 'anvil_block', 'campfire', 'alchemy_table', 'loom_block', 'enchant_altar', 'construction_bench'];
    if (bdef && (stations.includes(bdef.name) || bdef.name === 'chest_block') && !isBreak) {
      this.pendingInteract = { kind: bdef.name === 'chest_block' ? 'chest' : 'station', x: hit.x, y: hit.y, z: hit.z, range: 3.2 };
      this.walkTo(hit.x + 0.5, hit.z + 0.5, 12);
      return;
    }
    // a door: walk up and swing it open/closed
    if (bdef && bdef.shape === 'door' && !isBreak) {
      this.pendingInteract = { kind: 'door', x: hit.x, y: hit.y, z: hit.z, range: 2.6 };
      this.walkTo(hit.x + 0.5, hit.z + 0.5, 12);
      return;
    }
    if (isBreak) {
      // shift+click / long-press: walk over and break the block
      if (!bdef || bdef.hardness === Infinity || bdef.shape === 'liquid') return;
      this.pendingInteract = { kind: 'break', x: hit.x, y: hit.y, z: hit.z, range: 3.6 };
      this.walkTo(hit.x + 0.5, hit.z + 0.5, 12);
      return;
    }
    // plain ground click → walk to the clicked spot
    const tx = hit.x + hit.face[0], tz = hit.z + hit.face[2];
    const standX = hit.face[1] === 1 ? hit.x : tx;
    const standZ = hit.face[1] === 1 ? hit.z : tz;
    this.pendingInteract = null;
    this.autoGatherNode = null;
    this.autoBreak = null;
    this.walkTo(standX + 0.5, standZ + 0.5, 16);
  }

  // set a click-to-move destination, routed along a computed path when possible
  walkTo(x, z, timeout = 14) {
    this.moveTarget = { x, z };
    this.moveTargetTimeout = timeout;
    const p = this.player;
    const path = findPath(this.world, p.x, p.z, p.y, x, z, { maxExpand: 3500 });
    // intermediate waypoints steer around trees/walls; the final cell is moveTarget
    this.movePath = path && path.length > 1 ? path.slice(0, -1) : null;
    this.markDestination(x, z);
  }

  markDestination(x, z) {
    const y = this.world.groundNear(Math.floor(x), Math.floor(z), this.player.y) ?? this.player.y;
    this.destMarker = { x: Math.floor(x), y, z: Math.floor(z), t: 1.6 };
    this.renderer.spawnParticles(x, y + 0.4, z, [1, 0.85, 0.3], 6, 1.2, 0.5, 0.06);
    SFX.uiClick();
  }

  executePendingInteract() {
    const pi = this.pendingInteract;
    this.pendingInteract = null;
    if (!pi) return;
    if (pi.kind === 'enemy') {
      if (this.enemyMgr.entities.has(pi.entity.id)) this.startCombat(pi.entity);
    } else if (pi.kind === 'npc') {
      this.quests.talkedTo(pi.npc.id);
      this.ui.showDialogue(NPC_DEFS[pi.npc.id].dialogue);
      emit('talkedTo', { npc: pi.npc.id });
    } else if (pi.kind === 'node') {
      this.autoGatherNode = pi.node;
    } else if (pi.kind === 'station') {
      this.ui.openWindow('crafting');
    } else if (pi.kind === 'chest') {
      const chest = this.world.getChestAt(pi.x, pi.y, pi.z);
      const id = chest ? chest.id : this.world.registerPlayerChest(pi.x, pi.y, pi.z);
      const meta = this.world.chestMeta.get(id);
      if (meta?.requiresBossDead && !this.flags[meta.requiresBossDead]) {
        this.ui.toast('The chest is bound shut by living roots… defeat the guardian.', 'warn');
        return;
      }
      this.ui.openChestUI(id);
      emit('chestOpened', { id });
    } else if (pi.kind === 'break') {
      this.autoBreak = { x: pi.x, y: pi.y, z: pi.z };
    } else if (pi.kind === 'door') {
      const f = this.world.facingAt(pi.x, pi.y, pi.z);
      this.world.setFacing(pi.x, pi.y, pi.z, f ^ 8); // swing open/closed
      SFX.place();
    }
  }

  // classic-mode interaction loop: auto-gather / auto-break the chosen target
  updateClassicInteraction(dt) {
    if (this.destMarker) {
      this.destMarker.t -= dt;
      if (this.destMarker.t <= 0) this.destMarker = null;
    }
    if (this.combatRS.active) {
      this.autoGatherNode = null;
      this.autoBreak = null;
      this.gather = null;
      this.breaking = null;
      this.ui.setGatherProgress(null);
      this.ui.setPrompt(null);
      return;
    }
    const p = this.player;
    if (this.autoGatherNode) {
      this.ui.setPrompt(null); // arrived — no longer "Walking…"
      const node = this.autoGatherNode;
      const st = this.world.nodeState(node.id);
      const d = Math.hypot(node.x + 0.5 - p.x, node.z + 0.5 - p.z);
      if (!st || d > 3.6 || !this.world.nodesById.has(node.id)) {
        this.autoGatherNode = null;
        this.gather = null;
        this.ui.setGatherProgress(null);
      } else if (st.state === 'depleted') {
        this.autoGatherNode = null;
        this.gather = null;
        this.ui.setGatherProgress(null);
        this.ui.setPrompt(null);
      } else {
        this.modelYaw = Math.atan2(node.x + 0.5 - p.x, node.z + 0.5 - p.z);
        this.updateGathering(node, dt); // shows progress, grants xp, handles tools
      }
      return;
    }
    if (this.autoBreak) {
      this.ui.setPrompt(null); // arrived — no longer "Walking…"
      const b = this.autoBreak;
      const id = this.world.getBlock(b.x, b.y, b.z);
      const def = BLOCKS[id];
      const d = Math.hypot(b.x + 0.5 - p.x, b.z + 0.5 - p.z);
      if (!def || id === B.air || def.hardness === Infinity || d > 4) {
        this.autoBreak = null;
        this.breaking = null;
        this.ui.setGatherProgress(null);
      } else {
        this.modelYaw = Math.atan2(b.x + 0.5 - p.x, b.z + 0.5 - p.z);
        this.currentSelection = { x: b.x, y: b.y, z: b.z };
        this.updateBreaking({ x: b.x, y: b.y, z: b.z, id }, dt);
        if (this.world.getBlock(b.x, b.y, b.z) === B.air) this.autoBreak = null;
      }
      return;
    }
    this.ui.setPrompt(this.moveTarget && this.pendingInteract ? 'Walking…' : null);
    if (!this.breaking && !this.gather) this.ui.setGatherProgress(null);
  }

  // Recompute the guide-dot trail toward the map destination (if any) or the
  // tracked quest objective. Pathfinding is throttled; dots render every frame.
  updateQuestTrail(dt) {
    this._trailT = (this._trailT || 0) - dt;
    if (this.settings.questTrail === false) { this.trailDots = null; return; }
    const dest = this.travelDest || this.quests.trackedMarker(this.world.markers)?.pos || null;
    if (!dest) { this.trailDots = null; return; }
    const p = this.player;
    if (Math.hypot(dest[0] - p.x, dest[2] - p.z) < 6) { this.trailDots = null; return; }
    if (this._trailT > 0) return;
    this._trailT = 1.5;
    const path = findPath(this.world, p.x, p.z, p.y, dest[0], dest[2], { maxExpand: 3500, goalRadius: 2 });
    if (!path || path.length < 4) { this.trailDots = null; return; }
    const dots = [];
    for (let i = 2; i < path.length && dots.length < 22; i += 2) dots.push(path[i]);
    this.trailDots = dots;
  }

  // Map travel: remember the spot; classic view walks there on its own,
  // first-person follows the guide dots.
  setTravelDest(wx, wz) {
    const wy = (this.world.hasChunk(Math.floor(wx / CHUNK), Math.floor(wz / CHUNK))
      ? this.world.surfaceAt(Math.floor(wx), Math.floor(wz))
      : this.world.gen.heightAt(Math.floor(wx), Math.floor(wz))) + 1;
    this.travelDest = [Math.floor(wx) + 0.5, wy, Math.floor(wz) + 0.5];
    this._lastLegEnd = null;
    this._travelStuck = 0;
    this._trailT = 0;
    this.cancelClassicActions();
    this.ui.toast(this.settings.classicCamera
      ? 'Walking to the marked spot — click anywhere to stop.'
      : 'Spot marked — follow the gold dots.', 'gold');
  }

  // classic-mode camera: orbit the player, pulled in when terrain blocks the view
  classicCameraEye() {
    const p = this.player;
    const target = [p.x, p.y + 1.4, p.z];
    const cp = Math.cos(this.camPitch), sp = Math.sin(this.camPitch);
    const dir = [Math.sin(this.camYaw) * cp, -sp, Math.cos(this.camYaw) * cp];
    let dist = this.camDist;
    for (let t = 1.0; t < this.camDist; t += 0.25) {
      const bx = Math.floor(target[0] + dir[0] * t);
      const by = Math.floor(target[1] + dir[1] * t);
      const bz = Math.floor(target[2] + dir[2] * t);
      const id = this.world.getBlock(bx, by, bz);
      if (id !== B.air && BLOCKS[id]?.opaque) { dist = Math.max(1.2, t - 0.4); break; }
    }
    return { eye: [target[0] + dir[0] * dist, target[1] + dir[1] * dist, target[2] + dir[2] * dist], target };
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
    const actionBtn = touchMode ? 'Action' : 'LMB';

    // nearby NPC in ray direction?
    const npcNear = this.npcInFront();
    const enemyNear = this.enemyInFront();

    let prompt = null;
    if (npcNear) {
      prompt = `${touchMode ? 'Tap Action' : 'F / Right-click'}: Talk to ${NPC_DEFS[npcNear.id].label}`;
      this.currentSelection = null;
    } else if (enemyNear && enemyNear.def.behavior !== 'passive') {
      prompt = `${touchMode ? 'Tap Action' : 'Click'}: Engage ${enemyNear.def.label}`;
    } else if (enemyNear) {
      prompt = `${touchMode ? 'Tap Action' : 'Click'}: Attack ${enemyNear.def.label}`;
    } else if (hit) {
      prompt = this.promptForHit(hit, actionBtn, touchMode);
    }

    // chest / station prompts override
    if (hit && !hit.node) {
      const def = BLOCKS[hit.id];
      if (def && ['workbench', 'furnace', 'anvil_block', 'campfire', 'alchemy_table', 'loom_block', 'enchant_altar', 'construction_bench'].includes(def.name)) {
        prompt = `${touchMode ? 'Tap Action' : 'F / Right-click'}: Use ${def.label}`;
      } else if (def?.name === 'chest_block') {
        prompt = `${touchMode ? 'Tap Action' : 'F / Right-click'}: Open chest`;
      }
    }
    this.ui.setPrompt(prompt);

    // classic combat: no skilling while creatures are on you
    if (this.combatRS.active) {
      if (this.controls.primaryHeld && enemyNear) this.startCombat(enemyNear); // switch target
      this.ui.setPrompt(enemyNear && enemyNear !== this.combatRS.target ? `Click: switch target to ${enemyNear.def.label}` : null);
      this.ui.setGatherProgress(null);
      this.gather = null;
      this.breaking = null;
      return;
    }

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
    if (selDef?.block) s += `\n${touchMode ? 'Place button' : 'RMB'}: Place ${selDef.label}`;
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

  // Why can't this node be gathered right now? null = go ahead.
  gatherBlockedReason(def) {
    const lvl = this.skills.level(def.skill);
    if (lvl < def.level) {
      return `You need ${SKILL_DEFS[def.skill].label} level ${def.level} to ${gatherVerb(def).toLowerCase()} this (you're ${lvl}).`;
    }
    if (def.tool) {
      const t = this.inventory.bestTool(def.tool);
      if (!t) return `You need ${TOOL_NAMES[def.tool] || 'the right tool'} to ${gatherVerb(def).toLowerCase()} this.`;
      const tierNeed = def.level >= 40 ? 3 : def.level >= 25 ? 2 : 1;
      if (ITEMS[t.stack.item].tier < tierNeed) {
        return `Your ${ITEMS[t.stack.item].label} isn't up to it — this needs a tier ${tierNeed} ${def.tool === 'rod' ? 'rod' : def.tool}.`;
      }
    }
    return null;
  }

  // toast a gather problem without spamming every frame
  warnGather(key, reason) {
    if (this._gatherWarnKey === key && this.world.time < (this._gatherWarnT || 0) + 3) return;
    this._gatherWarnKey = key;
    this._gatherWarnT = this.world.time;
    this.ui.toast(reason, 'warn');
    SFX.uiClick();
  }

  updateGathering(node, dt) {
    const def = node.def;
    const st = this.world.nodeState(node.id);
    this.breaking = null;
    if (!st || st.state !== 'ready') { this.gather = null; this.ui.setGatherProgress(null); return; }
    const blocked = this.gatherBlockedReason(def);
    if (blocked) {
      this.gather = null;
      this.autoGatherNode = null;
      this.ui.setGatherProgress(null);
      this.warnGather(node.id + blocked, blocked);
      return;
    }
    let toolStack = null, toolDef = null;
    if (def.tool) {
      toolStack = this.inventory.bestTool(def.tool).stack;
      toolDef = ITEMS[toolStack.item];
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
    if (crit) this.ui.toast('Critical gather! Double yield', 'gold');
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
    // boss-warded chests can't be smashed open either
    if (def.name === 'chest_block') {
      const chest = this.world.getChestAt(hit.x, hit.y, hit.z);
      if (chest?.meta.requiresBossDead && !this.flags[chest.meta.requiresBossDead]) {
        this.ui.setGatherProgress(null);
        this.breaking = null;
        return;
      }
    }
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
    // player-planted crops: harvest (ripe) or recover the seed (young)
    if (def.name === 'crop_ripe' || def.name === 'crop_young') {
      this.world.crops.delete(`${x},${y},${z}`);
      if (def.name === 'crop_ripe') {
        this.inventory.add('grainsheaf', 1 + (Math.random() < 0.5 ? 1 : 0));
        if (Math.random() < 0.65) this.inventory.add('grain_seeds', 1 + (Math.random() < 0.3 ? 1 : 0));
        if (Math.random() < 0.03) this.inventory.add('golden_grain', 1);
        this.skills.addXp('farming', 22);
      } else {
        this.inventory.add('grain_seeds', 1);
      }
    }
    if (def.name === 'tall_grass' && Math.random() < 0.25) this.inventory.add('grain_seeds', 1);
    if (def.tool === 'pickaxe') this.skills.addXp('mining', 3);
    if (def.tool === 'axe' && def.name !== 'workbench') this.skills.addXp('woodcutting', 2);
    if (this._breakTool) this.inventory.damageTool(this._breakTool, 1);
    emit('blockBroken', { x, y, z, block: def.name });
    // breaking a chest spills its contents (warded chests were rejected earlier)
    if (def.name === 'chest_block') {
      const chest = this.world.getChestAt(x, y, z);
      if (chest) {
        if (chest.meta.requiresBossDead && !this.flags[chest.meta.requiresBossDead]) {
          this.ui.toast('The chest is bound shut by living roots…', 'warn');
          this.world.setBlock(x, y, z, B.chest_block, true); // restore it
          return;
        }
        for (const c of this.world.openChest(chest.id)) this.inventory.add(c.item, c.qty, c.dur ?? null);
        this.world.chestContents.delete(chest.id);
        this.world.chestMeta.delete(chest.id);
      }
    }
  }

  onSecondary(pos = null) {
    if (this.combat.active || this.combatRS.active || this.player.dead || this.dialogueOpen || this.ui.currentWindow) return;
    let hit;
    if (this.settings.classicCamera) {
      // classic view: right-click (or the Place button) places at the cursor / screen centre
      const sx = pos?.x ?? this.canvas.clientWidth / 2;
      const sy = pos?.y ?? this.canvas.clientHeight / 2;
      const { eye, dir } = this.screenRay(sx, sy);
      hit = this.world.raycast(eye[0], eye[1], eye[2], dir[0], dir[1], dir[2], 40);
      if (hit && Math.hypot(hit.x + 0.5 - this.player.x, hit.z + 0.5 - this.player.z) > 5.5) {
        this.ui.toast('Too far away to build there.', 'warn');
        return;
      }
    } else {
      // interactables first (first-person only; classic interacts via left-click)
      if (this.tryInteract(true)) return;
      hit = this.facingRay();
    }
    if (!hit || hit.node) return;
    const sel = this.inventory.selectedStack();
    const def = sel ? ITEMS[sel.item] : null;
    // hoe: till grass/dirt into farmland
    if (def?.tool === 'hoe') {
      const above = this.world.getBlock(hit.x, hit.y + 1, hit.z);
      if ((hit.id === B.grass || hit.id === B.dirt) && above === B.air && !this.world.nodeAt(hit.x, hit.y + 1, hit.z)) {
        this.world.setBlock(hit.x, hit.y, hit.z, B.farmland, true);
        this.inventory.damageTool(sel, 1);
        this.skills.addXp('farming', 3);
        this.renderer.spawnParticles(hit.x + 0.5, hit.y + 1.1, hit.z + 0.5, [0.5, 0.38, 0.22], 6, 2, 0.4);
        SFX.dig();
      } else {
        this.warnGather('till' + hit.x + hit.z, 'You can only till open grass or dirt.');
      }
      return;
    }
    // seeds: plant on tilled farmland
    if (sel?.item === 'grain_seeds') {
      const px2 = hit.x, py2 = hit.y + 1, pz2 = hit.z;
      if (hit.id === B.farmland && this.world.getBlock(px2, py2, pz2) === B.air && !this.world.nodeAt(px2, py2, pz2)) {
        this.world.plantCrop(px2, py2, pz2);
        this.inventory.removeSlot(this.inventory.selected, 1);
        this.skills.addXp('farming', 5);
        emit('cropPlanted', { x: px2, y: py2, z: pz2 });
        SFX.place();
      } else {
        this.warnGather('plant' + hit.x + hit.z, 'Seeds need open, tilled farmland (use a hoe first).');
      }
      return;
    }
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
    // orientation: stairs face the way you look (step on that side) and go
    // upside-down when placed against a ceiling / upper half; slabs pick top or
    // bottom; stations (furnace, chest, gate) turn their front toward you.
    if (blockDef.directional || blockDef.shape === 'slab') {
      const topHalf = hit.face[1] === -1 || (hit.face[1] === 0 && p.pitch > 0.15);
      let facing;
      if (blockDef.shape === 'stairs') {
        const lx = -Math.sin(p.yaw), lz = -Math.cos(p.yaw);
        const dir = Math.abs(lx) > Math.abs(lz) ? (lx > 0 ? 1 : 3) : (lz > 0 ? 0 : 2);
        facing = dir | (topHalf ? 4 : 0);
      } else if (blockDef.shape === 'slab') {
        facing = topHalf ? 4 : 0;
      } else {
        const dx = p.x - (px + 0.5), dz = p.z - (pz + 0.5);
        facing = Math.abs(dx) > Math.abs(dz) ? (dx > 0 ? 1 : 3) : (dz > 0 ? 0 : 2);
      }
      this.world.setFacing(px, py, pz, facing);
    }
    this.inventory.removeSlot(this.inventory.selected, 1);
    if (def.block === 'chest_block') this.world.registerPlayerChest(px, py, pz);
    this.skills.addXp('construction', 2);
    emit('blockPlaced', { x: px, y: py, z: pz, block: def.block });
    SFX.place();
  }

  tryInteract(silent = false) {
    if (this.combat.active || this.combatRS.active || this.player.dead) return false;
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
    if (def.shape === 'panel' || def.shape === 'door') { // trapdoor / door — swing it
      const f = this.world.facingAt(hit.x, hit.y, hit.z);
      this.world.setFacing(hit.x, hit.y, hit.z, f ^ 8); // flip the open bit (3)
      SFX.place();
      return true;
    }
    return false;
  }

  onTapInteract() {
    if (this.combat.active) return; // tactical taps handled by canvas click
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
    if (def.heal) {
      this.player.heal(def.heal);
      if (this.combatRS.active) this.addHitsplat(this.player.x, this.player.y + 2.1, this.player.z, `+${def.heal}`, '#6cbf5a');
    }
    if (def.energy) this.player.energy = Math.min(this.player.maxEnergy, this.player.energy + def.energy);
    if (def.mana) this.player.mana = Math.min(this.player.maxMana, this.player.mana + def.mana);
    this.player.eat(def); // hydration + food-group nutrition
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
    if (!this.settings.tacticalCombat) {
      this.combatRS.engage(enemyEntity, true);
      return;
    }
    if (this.combat.active) return;
    const group = this.enemyMgr.nearbyGroup(enemyEntity.x, enemyEntity.z, 5, enemyEntity.y)
      .filter((e) => e.def.behavior !== 'passive' || e === enemyEntity)
      .slice(0, 4);
    this.combat.start(group, enemyEntity.x, enemyEntity.z);
  }

  addHitsplat(x, y, z, text, color) {
    this.hitsplats.push({
      id: this.splatId++, x, y, z, text, color,
      jx: (Math.random() - 0.5) * 26, life: 1.0,
    });
    if (this.hitsplats.length > 24) this.hitsplats.shift();
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

  onCombatEnd(e) {
    if (e.rs) {
      // classic-mode kill: no arena teardown, just world-state consequences
      for (const [type, info] of Object.entries(BOSS_FLAGS)) {
        if (e.types?.includes(type)) {
          this.flags[info.flag] = true;
          this.ui.toast(info.toast, 'gold');
          SFX.victory();
        }
      }
      this.autosaveTimer = Math.min(this.autosaveTimer, 3);
      return;
    }
    const { result } = e;
    this.ui.hideCombat();
    document.body.classList.remove('in-combat');
    this.combatCam = null;
    if (this.touch && !this.player.dead) this.touch.show();
    if (result === 'won') {
      SFX.victory();
      for (const t of this.combat.combatants.filter((c) => c.kind === 'enemy')) {
        if (t.type === 'rootbound_golem') {
          this.flags.boss_rootbound = true;
          this.ui.toast('The Rootgrave falls silent…', 'gold');
        }
      }
      this.autosaveTimer = Math.min(this.autosaveTimer, 2);
    } else if (result === 'lost' && !this.player.debug) {
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

  // ------------------------------------------------- kids' Learning Mode entry
  // Switch into education (play-time-bank) mode and drop the child into Numbers
  // Meadow. Reachable for testing via window.__game.enterLearningMode() (or
  // window.__learn()); the character-creation mode picker arrives in Phase 2.
  enterLearningMode(config = {}) {
    if (!this.education.isEducation) this.education.setMode('education', config);
    // A brand-new learner (no lessons finished, empty bank) gets a few starter
    // minutes so they can walk to Pip before play time runs out; after the first
    // lesson the bank is earned, never given.
    if (this.education.balanceSec <= 0 && Object.keys(this.education.lessonsDone).length === 0) {
      this.education.grantMinutes(10, 'welcome');
    }
    this.goToLearningMeadow();
  }

  // Teleport to the Numbers Meadow classroom pad, generating its chunks first so
  // the child never drops into unloaded void.
  goToLearningMeadow() {
    const m = this.world.markers.learnMeadow;
    if (!m) return;
    const [x, y, z] = m;
    const pcx = Math.floor(x / CHUNK), pcz = Math.floor(z / CHUNK);
    for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) this.world.ensureChunk(pcx + dx, pcz + dz);
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) this.renderer.remeshChunk(this.world, pcx + dx, pcz + dz);
    this.player.respawnAt(x + 0.5, y, z + 0.5);
    this.cancelClassicActions();
    this.travelDest = null;
    this.controls.worldMove = null;
    if (!this.player.dead) this.controls.enabled = true;
    this.touch?.show();
    this.grantLessonKit();
    this.ui.toast('Welcome to Numbers Meadow! Talk to Pip to start a lesson.', 'gold');
    this.saveGame();
  }

  // Stock the child with the coloured blocks the Numbers Meadow lessons use.
  grantLessonKit() {
    for (const c of ['red_wool', 'blue_wool', 'yellow_wool']) {
      const have = this.inventory.count(c);
      if (have < 10) this.inventory.add(c, 16 - have);
    }
  }

  // "Go to Lessons" from the play-time lock screen: lift the lock enough to walk
  // and build (the bank is empty, so nothing drains until a lesson is completed)
  // and drop the child at the meadow to earn more time.
  goToLessons() {
    document.getElementById('playtime-lock')?.remove();
    this.playtimeLocked = false;
    if (!this.player.dead) this.controls.enabled = true;
    this.touch?.show();
    this.goToLearningMeadow();
  }

  // Full-screen gate shown when the play-time bank runs dry (education mode).
  showPlaytimeLock() {
    if (document.getElementById('playtime-lock')) return;
    const el = document.createElement('div');
    el.id = 'playtime-lock';
    el.className = 'fullscreen-overlay';
    el.innerHTML = `<div class="title-box">
      <h2>Play time is used up!</h2>
      <p style="color:var(--ink-dim);margin-top:10px">Complete a lesson to earn more time in Sproutlands.<br>
      Your world is saved and waiting for you.</p>
      <p style="color:var(--ink-dim);margin-top:14px;font-size:13px">Lessons: ${Object.keys(this.education.lessonsDone).length} completed ·
      ${Math.round(this.education.playtimeTotalSec / 60)} minutes played all-time</p>
      <button id="go-to-lessons-btn" class="slot-btn" style="margin-top:18px;justify-content:center">Go to Lessons</button>
    </div>`;
    document.body.appendChild(el);
    el.querySelector('#go-to-lessons-btn').addEventListener('click', () => { SFX.uiClick(); this.goToLessons(); });
  }

  onPlayerDeath() {
    this.combatRS.disengageAll();
    this.controls.enabled = false;
    // stop any click-to-move / map travel so it doesn't resume on respawn
    this.cancelClassicActions();
    this.travelDest = null;
    this.controls.worldMove = null;
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
    // clear stale movement so you don't auto-walk away from the spawn point
    this.cancelClassicActions();
    this.travelDest = null;
    this.controls.worldMove = null;
    this.controls.enabled = true;
    this.touch?.show();
    this.saveGame();
  }

  // ---------------------------------------------------------------- custom mobs
  async importMob(json) {
    // load a custom creature at runtime (also used by the mobs/ folder at boot)
    const def = await registerMob(this, json);
    injectSpawnRules(json); // affects chunks generated from now on
    return def;
  }

  // dev/test helper: spawn any creature next to the player for a look
  spawnMobNear(type) {
    const def = ENEMY_TYPES[type];
    if (!def) return null;
    const p = this.player;
    const ang = this.settings.classicCamera ? this.camYaw : p.yaw;
    const sx = p.x - Math.sin(ang) * 3, sz = p.z - Math.cos(ang) * 3;
    const gy = this.world.groundNear(Math.floor(sx), Math.floor(sz), p.y) ?? p.y;
    const id = `preview:${type}:${Math.floor(Math.random() * 1e9)}`;
    const ent = {
      id, type, def, x: sx, y: gy, z: sz, homeX: sx, homeZ: sz,
      yaw: Math.atan2(p.x - sx, p.z - sz), hp: def.hp, wanderT: 2, transient: true,
    };
    this.enemyMgr.entities.set(id, ent);
    return ent;
  }

  // animation state → pose matrices for the player's rigged model
  playerPose(model) {
    if (!model?.animated) return null;
    const t = this.world.time;
    if ((this.playerAttackT || 0) > 0 && model.animations.attack) {
      return evaluatePose(model, 'attack', t - (this.playerAttackStart || 0));
    }
    if ((this.gather || this.breaking) && model.animations.attack) {
      return evaluatePose(model, 'attack', (t * 1.15) % 0.45); // chopping/mining swing
    }
    const speed = Math.hypot(this.player.vx, this.player.vz);
    if (this.player.inWater && speed > 0.5 && model.animations.swim) return evaluatePose(model, 'swim', t);
    if (speed > 0.7 && model.animations.walk) return evaluatePose(model, 'walk', t);
    return evaluatePose(model, 'idle', t);
  }

  // animation state → pose matrices for animated (imported) models
  poseFor(e, model, dt) {
    if (!model?.animated) return null;
    e.attackT = Math.max(0, (e.attackT || 0) - dt);
    e.movingT = Math.max(0, (e.movingT || 0) - dt);
    const offset = ((e.homeX || 0) * 7 + (e.homeZ || 0) * 13) % 3;
    if (e.attackT > 0 && model.animations.attack) {
      return evaluatePose(model, 'attack', this.world.time - (e.attackStart || 0));
    }
    if (e.movingT > 0 && model.animations.walk) {
      return evaluatePose(model, 'walk', this.world.time + offset);
    }
    return evaluatePose(model, 'idle', this.world.time + offset);
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
        const modelName = c.kind === 'player' ? this.playerModelName : c.type;
        const model = this.renderer.modelCache.get(modelName);
        out.push({
          model: modelName,
          x: rp.x, y: rp.y, z: rp.z, yaw: facing,
          tint: c.flashT > 0 ? [0.6, 0.1, 0.1] : (c.telegraph ? [0.25, 0.05, 0.05] : [0, 0, 0]),
          pose: model?.animated ? evaluatePose(model, 'idle', this.world.time) : null,
        });
      }
    } else {
      for (const e of this.enemyMgr.entities.values()) {
        const d = Math.hypot(e.x - this.player.x, e.z - this.player.z);
        if (d > 40) continue;
        const model = this.renderer.modelCache.get(e.type);
        out.push({
          model: e.type, x: e.x, y: e.y, z: e.z, yaw: e.yaw,
          tint: e.shiny ? [0.3, 0.24, 0.02] : [0, 0, 0], // gilded shimmer
          pose: this.poseFor(e, model, dt),
        });
      }
      if (this.settings.classicCamera && !this.player.dead) {
        // third-person view shows your own character
        out.push({
          model: this.playerModelName,
          x: this.player.x, y: this.player.y, z: this.player.z,
          yaw: this.modelYaw, tint: [0, 0, 0],
          pose: this.playerPose(this.renderer.modelCache.get(this.playerModelName)),
        });
      }
    }
    for (const npc of this.world.structure.npcs) {
      const model = this.renderer.modelCache.get(`npc_${npc.id}`);
      out.push({
        model: `npc_${npc.id}`, x: npc.x + 0.5, y: npc.y, z: npc.z + 0.5,
        yaw: Math.atan2(this.player.x - npc.x, this.player.z - npc.z), tint: [0, 0, 0],
        pose: model?.animated ? evaluatePose(model, 'idle', this.world.time + (npc.x % 7)) : null,
      });
    }
    // nature-prop forage: the 3D model IS the visual (its marker cell is
    // invisible). Hidden while harvested; a static rest pose, per-prop yaw.
    for (const [, chunk] of this.world.chunks) {
      for (const node of chunk.nodes) {
        if (node.def?.kind !== 'prop') continue;
        if (this.world.nodeState(node.id)?.state === 'depleted') continue;
        const dx = node.x + 0.5 - this.player.x, dz = node.z + 0.5 - this.player.z;
        if (dx * dx + dz * dz > 44 * 44) continue;
        out.push({
          model: node.def.model, x: node.x + 0.5, y: node.y, z: node.z + 0.5,
          yaw: (node.x * 2.399 + node.z * 5.717) % (Math.PI * 2), tint: [0, 0, 0], pose: null,
        });
      }
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
    if (this.travelDest) {
      const [tx, ty, tz] = this.travelDest;
      out.push({ x: Math.floor(tx), y: ty - 0.6, z: Math.floor(tz), color: [1, 0.8, 0.25] });
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
          intent: c.telegraph ? '!' : null,
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
          name: `${turnIn ? '? ' : hasQuest ? '! ' : ''}${def.label}`,
          sub: def.role, color: '#ffe9a8',
        });
      }
      for (const e of this.enemyMgr.entities.values()) {
        const d = Math.hypot(e.x - this.player.x, e.z - this.player.z);
        if (d > 18) continue;
        if (!this.labelVisible(e.x, e.y + 1.2, e.z)) continue;
        const isTarget = this.combatRS.target === e;
        labels.push({
          x: e.x, y: e.y + 1.6, z: e.z,
          name: `${isTarget ? '> ' : ''}${e.shiny ? 'Shiny ' : ''}${e.def.label}`,
          sub: e.rsEngaged ? 'fighting you' : e.def.behavior === 'aggressive' ? 'hostile' : e.def.behavior === 'defensive' ? 'wary' : 'harmless',
          hpFrac: e.hp < e.def.hp || e.rsEngaged ? e.hp / e.def.hp : null,
          color: e.shiny ? '#ffd76a' : e.def.boss ? '#e2b13c' : e.def.behavior === 'aggressive' || e.rsEngaged ? '#ff9a8a' : '#d8e2c8',
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
        mode: this.education.mode, // 'free' | 'education' — lets the title screen resume Learning Mode
        version: 1,
      },
      world: this.world.serialize(),
      player: this.player.serialize(),
      inventory: this.inventory.serialize(),
      skills: this.skills.serialize(),
      quests: this.quests.serialize(),
      enemies: this.enemyMgr.serialize(),
      education: this.education.serialize(),
      lessons: this.lessons.serialize(),
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
    this.education.deserialize(d.education);
    this.lessons.deserialize(d.lessons);
    this.flags = d.flags || {};
    this.discovered = new Set(d.discovered || []);
    this.discoveredItems = new Set(d.discoveredItems || []);
    this.playtime = d.meta?.playtime || 0;
  }
}

function gatherVerb(def) {
  return { tree: 'Chop', ore: 'Mine', plant: 'Gather', water: 'Fish', ground: 'Excavate', farm: 'Harvest' }[def.kind] || 'Gather';
}

const TOOL_NAMES = { axe: 'an axe', pickaxe: 'a pickaxe', shovel: 'a shovel', rod: 'a fishing rod', hoe: 'a hoe' };

// world-state consequences of boss kills (classic combat path)
const BOSS_FLAGS = {
  rootbound_golem: { flag: 'boss_rootbound', toast: 'The Rootgrave falls silent…' },
  rimehowl_alpha: { flag: 'boss_rimehowl', toast: 'The Rimehowl Alpha is slain — the frontier can breathe.' },
};

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
      const seedSafe = String(s.seedText).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
      b.innerHTML = `<span>Slot ${s.slot} — <b>Continue</b><br><span class="slot-sub">Total level ${s.totalLevel} · ${mins}m played · seed "${seedSafe}"</span></span><span class="slot-del" title="Delete save">${pixelIcon('trash', 15)}</span>`;
    }
    b.addEventListener('click', (e) => {
      if (e.target.closest?.('.slot-del')) {
        if (confirm(`Delete save in slot ${s.slot}?`)) { deleteSlot(s.slot); renderTitle(); }
        return;
      }
      startGame(s.slot, s.empty);
    });
    slotsEl.appendChild(b);
  }
  const learnBtn = $('learning-mode-btn');
  if (learnBtn) {
    const hasSave = listSlots().some((s) => !s.empty && s.mode === 'education');
    learnBtn.innerHTML = `<span>${pixelIcon('scroll', 18)}<b>Learning Mode</b>`
      + `<span class="slot-sub">${hasSave ? 'continue lessons · finish a lesson to earn play time' : 'for kids · finish lessons to earn play time'}</span></span>`;
    learnBtn.onclick = () => { SFX.uiClick?.(); startLearningMode(); };
  }
  $('title-hint').textContent = isTouchDevice()
    ? 'Left stick to move · drag right side to look · Action button to gather and fight'
    : 'WASD to move · mouse to look · hold left click to gather · E for inventory';
}

async function startGame(slot, isNew, opts = {}) {
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
  // custom creature files: spawn rules must land before chunks generate
  const mobFiles = await fetchMobFiles();
  for (const f of mobFiles) { try { injectSpawnRules(f); } catch (e) { console.error('[mobs]', e.message); } }
  const game = new Game(slot, seedText, saveData);
  for (const f of mobFiles) {
    try { await registerMob(game, f); } catch (e) { console.error('[mobs]', e.message); }
  }
  window.__game = game; // for automated tests & debugging
  window.__learn = () => game.enterLearningMode(); // Phase-1 shortcut into Numbers Meadow
  const crafting = await import('./game/crafting.js');
  window.__crafting = crafting;
  window.__blocks = await import('./world/blocks.js');
  window.__enemies = await import('./game/enemies.js');
  window.__mobloader = await import('./game/mobloader.js');
  window.__schematic = await import('./world/schematic.js');
  // Paste a schematic converted by tools/import-schematic.mjs near the player:
  //   __paste('assets/schematics/hut.json')  (optional dx,dy,dz offset)
  window.__paste = async (url, dx = 3, dy = 0, dz = 0) => {
    const p = game.player;
    const r = await window.__schematic.loadAndPaste(game.world, url,
      Math.floor(p.x) + dx, Math.floor(p.y) + dy, Math.floor(p.z) + dz);
    console.log('[schematic]', url, r);
    return r;
  };
  await game.init((frac, text) => {
    $('loading-fill').style.width = `${Math.round(frac * 100)}%`;
    $('loading-text').textContent = text;
  });
  $('loading-screen').classList.add('hidden');
  $('hud').classList.remove('hidden');
  if (game.touch) game.touch.show();
  game.ui.renderHotbar();
  game.ui.renderQuestTracker();
  if (opts.learning) {
    // Title-screen "Learning Mode": switch into education mode and drop the
    // child at Numbers Meadow (works for both a fresh world and a resumed one).
    game.enterLearningMode();
  } else if (game.education.isEducation && game.education.locked) {
    // Resumed a Learning Mode save whose play-time bank is empty — show the
    // lock gate so the child heads back to lessons instead of free-roaming.
    game.playtimeLocked = true;
    game.controls.enabled = false;
    game.touch?.hide();
    game.showPlaytimeLock();
  }
  game.saveGame();
  game.start();
}

// Launch (or resume) Learning Mode from the title screen. Continue an existing
// education save if there is one; otherwise start fresh in the first open slot
// so a survival world is never overwritten. If every slot is full, offer to
// open the most recent world in Learning Mode (non-destructive — it just adds
// the play-time bank and drops the child at the meadow).
function startLearningMode() {
  const slots = listSlots();
  const existing = slots.find((s) => !s.empty && s.mode === 'education');
  if (existing) { startGame(existing.slot, false, { learning: true }); return; }
  const open = slots.find((s) => s.empty);
  if (open) { startGame(open.slot, true, { learning: true }); return; }
  const recent = slots.filter((s) => !s.empty).sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0))[0];
  if (recent && confirm(`All save slots are full.\n\nOpen your most recent world (slot ${recent.slot}) in Learning Mode?\nYour worlds are kept — this just adds the lesson/play-time system.`)) {
    startGame(recent.slot, false, { learning: true });
  }
}

initAudio(loadSettings());
renderTitle();
window.addEventListener('error', (e) => console.error('[sproutlands]', e.message));

// ---- PWA: installable + auto-updating (hosted builds only) -----------------
// The browser fires beforeinstallprompt when the app qualifies to install;
// stash it and reveal the title-screen "Install" button.
let _deferredInstall = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  _deferredInstall = e;
  $('install-btn')?.classList.remove('hidden');
});
window.addEventListener('appinstalled', () => { $('install-btn')?.classList.add('hidden'); _deferredInstall = null; });
$('install-btn')?.addEventListener('click', async () => {
  if (!_deferredInstall) return;
  _deferredInstall.prompt();
  await _deferredInstall.userChoice.catch(() => {});
  _deferredInstall = null;
  $('install-btn')?.classList.add('hidden');
});
// Register the service worker for offline play + auto-update on redeploy. Skip
// on localhost (so tests never load stale cached modules) and in the inlined
// single-file build (no sw.js beside it).
if ('serviceWorker' in navigator && !window.__EMBEDDED && !['localhost', '127.0.0.1'].includes(location.hostname)) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
