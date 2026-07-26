// Sproutlands — main orchestration: boot, game loop, interactions, camera, save.
import { buildAtlas } from './gfx/textures.js';
import { Renderer } from './gfx/renderer.js';
import { World, initSlabSet, DAY_LEN } from './world/world.js';
import { LESSON_SEED } from './world/classroom.js';
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
import {
  Stable, MOUNTS, PETS, TAMEABLE, mountDef, tameHint, SADDLE_H,
  levelFor, feedNeeded, tameXp, FEED_XP, RIDE_XP_PER_SEC, FLY_XP_PER_SEC,
} from './game/mounts.js';
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
import { LessonRunner, lessonNeeds } from './game/lessons.js';
import { setReadAloud } from './game/speech.js';
import { WAYSTONE_SPACING } from './world/roads.js';
import {
  WaystoneNet, atWaystone, waystonesNear, waystoneLanding, BEARINGS, WAYSTONE_HEIGHT,
} from './game/waystones.js';
import {
  KEY_ITEM as DUNGEON_KEY, dungeonNear, grateCells, isGrateCell, gateOpen, gateVerdict,
  openGate, markBossDead, bossChestSealed, sealedChestMsg, keyHolderId, bossSpawnId,
} from './game/dungeonlock.js';
import { hashSeed } from './core/rng.js';
import { on, emit, clearAllListeners } from './core/events.js';
import { clamp } from './core/math.js';
import {
  loadSettings, saveSettings, listSlots, saveSlot, loadSlot, deleteSlot, NUM_SLOTS,
} from './game/save.js';
import {
  splitSave, joinSave, listCharacters, loadCharacter, saveCharacter,
  deleteCharacter, newCharacter, migrateSlot, exportCharacter, importCharacter,
} from './game/characters.js';
import { initAudio, setVolumes, setMusicMood, setNightAmbience, SFX } from './core/audio.js';

const $ = (id) => document.getElementById(id);

class Game {
  constructor(slot, seedText, saveData, character = null) {
    this.slot = slot;
    this.seedText = seedText;
    // Who is playing. A world remembers the last character in it, but the title
    // screen can hand a different one in — that is the whole point of the split.
    this.characterId = character?.id || saveData?.meta?.characterId || null;
    this.characterName = character?.name || saveData?.meta?.characterName || 'Wanderer';
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
    // Waystone fast-travel network. Built before restore() so a save can fill it.
    this.waystones = new WaystoneNet();
    this.nearWaystone = null;    // the stone you're standing at, if any
    // Mounts. Built before restore() for the same reason the waystone net is.
    this.stable = new Stable();
    this.nearMount = null;       // a tameable creature within reach, if any
    this.petEntity = null;       // the pet that is out, as a world entity
    this.bedSpawn = null;        // [x, y, z] of the last bed slept in, or null
    this.waystonesInSight = [];  // stones close enough to label in the world
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
    onProgress(0, 'Lighting the campfire…');
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
    // Imported Blockbench models (assets/mobs/*.bbmodel drop-ins) fully replace a
    // type's model — decoded + registered async once ready. A drop-in never wins
    // over a hand-authored native's id.
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
    // A lesson has its own room out in the Schoolhouse (js/world/classroom.js).
    // Bank where they were standing only on the FIRST enter of a series — three
    // lessons in a row would otherwise overwrite the way home with the previous
    // classroom, and "back to the world" would mean "back to room two".
    on('lessonEnter', ({ dest }) => { if (dest) this.enterLessonWorld(dest); });
    on('lessonExit', ({ finished }) => this.exitLessonWorld(finished));
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
      this.ui.paintCameraButton?.();   // the toolbar glyph shows what you'd get next
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
    // A procedural dungeon's two flagged bosses: the key holder on the way in and
    // the boss behind the grate. Keyed by SPAWN ID, as the hand-built pair are —
    // see js/game/dungeonlock.js and BOSS_FLAGS at the foot of this file.
    on('enemyKilled', ({ id, boss }) => this.onDungeonBossKilled(id, boss));
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

  // Resolve the graphics quality tier: an explicit low/medium/high, or 'auto'
  // which picks Low on touch devices (phones/tablets) and Medium on desktop.
  qualityTier() {
    const g = this.settings.graphicsPreset;
    if (g === 'low' || g === 'medium' || g === 'high') return g;
    // auto: phones/tablets get the lighter Low tier; desktop gets Medium (which
    // matches the historical default look — full effects, just no gradient sky)
    return isTouchDevice() ? 'low' : 'medium';
  }

  applySettings() {
    const s = this.settings;
    // Lessons are read aloud by default: the youngest half of the curriculum's
    // audience cannot read the prompts they are being given.
    setReadAloud(s.readAloud !== false);
    document.documentElement.style.setProperty('--ui-scale', s.uiScale);
    document.documentElement.style.setProperty('--text-scale', s.textScale);
    document.documentElement.classList.toggle('colorblind', s.colorblind);
    document.documentElement.classList.toggle('reduced-motion', s.reducedMotion);
    document.documentElement.classList.toggle('left-handed', s.leftHanded);
    this.renderer.dynamicResolution = s.dynamicResolution !== false;
    if (s.dynamicResolution === false && this.renderer.renderScale !== 1) { this.renderer.renderScale = 1; this.renderer.resize(); }
    this.renderer.reducedMotion = s.reducedMotion;
    // Quality ladder: one renderer, three tiers. 'auto' picks by device (phones
    // get Low, desktops Medium). High: gradient sky + sun/moon + fresnel water.
    // The Low tier is fill-bound on phones (voxel scenes are cheap on the CPU but
    // heavy on fragments — foliage/leaf overdraw + high-DPR pixels), so it trims
    // exactly those: fewer chunks in view, a lower device-pixel-ratio cap, a
    // lower adaptive-resolution floor, and a nearer draw range for transparent
    // props. Desktop tiers keep the full view.
    const tier = this.qualityTier();
    this.renderer.qualityTier = tier;
    this.renderer.highQuality = tier === 'high';
    this.renderer.scaleFloor = tier === 'low' ? 0.35 : 0.5;
    this.renderer.precipMult = tier === 'low' ? 0.5 : 1; // Medium/High keep full precip (old default look)
    // A DPR-3 phone would otherwise render at 2x — four times the pixels of the
    // css size — for no visible gain on pixel art, so cap it. The view distance
    // and entity range stay generous: profiling showed the frame is cheap, and a
    // phone that looks slow is usually frame-capped (Low Power Mode) rather than
    // short of GPU, which no amount of trimming can fix.
    this.renderer.dprCap = tier === 'low' ? 1.5 : 2;
    // Changing the tier changes the frame cost, so whatever the adaptive scaler
    // had concluded about this device's ceiling is now out of date. Clearing it
    // makes the scaler re-probe rather than carry a verdict it reached under
    // different settings (js/gfx/renderer.js adaptResolution).
    this.renderer._fpsPeak = undefined;
    this.renderer._droppedAt = null;
    const rdCap = tier === 'low' ? 4 : tier === 'medium' ? 6 : 8;
    this.renderer.renderDistance = Math.min(s.renderDistance, rdCap);
    this._entityCull = 44;
    this.renderer.resize();                              // pick up the DPR cap
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

  // Frame-rate self-test (tap the FPS badge). Measures the frame rate as it is,
  // then again with the scene rendered at a quarter of the pixels. If the rate
  // doesn't move, the device isn't running out of GPU — something is holding the
  // frame rate down (vsync/browser cap, iOS Low Power Mode, thermal throttle),
  // and rendering less will never help. If it climbs, we really are fill-bound
  // and lowering quality is the fix. Removes the guesswork on real hardware.
  runPerfSelfTest() {
    if (this._probe) return;
    const r = this.renderer;
    const savedScale = r.renderScale, savedDynamic = r.dynamicResolution;
    r.dynamicResolution = false; // keep the adaptive scaler out of the measurement
    this.ui.toast('Frame-rate test running — hold still for ~5s…', 'gold');
    const phase = { t: 0, frames: 0, stage: 0, base: 0 };
    const SETTLE = 0.6, MEASURE = 1.8;
    this._probe = (dt) => {
      phase.t += dt;
      if (phase.t > SETTLE) phase.frames++;          // ignore the settle window
      if (phase.t < SETTLE + MEASURE) return;
      const fps = phase.frames / MEASURE;
      phase.t = 0; phase.frames = 0;
      if (phase.stage === 0) {                        // baseline done → shrink hard
        phase.base = fps;
        phase.stage = 1;
        r.renderScale = 0.25; r.resize();
        return;
      }
      // restore before reporting
      r.renderScale = savedScale; r.dynamicResolution = savedDynamic; r.resize();
      // The self-test just ran the frame at several scales with the scaler off;
      // let it start from nothing rather than from a peak measured during the
      // test's own artificial load.
      r._fpsPeak = undefined; r._droppedAt = null;
      this._probe = null;
      const base = Math.round(phase.base), low = Math.round(fps);
      const gain = fps / Math.max(1, phase.base);
      let verdict;
      if (gain > 1.25) {
        verdict = `GPU fill-bound — ${base}→${low} FPS at quarter pixels. Lower Graphics quality helps.`;
      } else if (base <= 34) {
        verdict = `Frame rate is capped at ~${base}, not GPU-bound (quarter pixels gave ${low}). `
          + 'Check iOS Low Power Mode / battery saver, or try the downloaded file instead of the in-app browser.';
      } else {
        verdict = `Running at ~${base} FPS, not GPU-bound (quarter pixels gave ${low}).`;
      }
      this.ui.toast(verdict, gain > 1.25 ? 'gold' : 'warn');
      console.log('[perf self-test]', { baselineFps: base, quarterPixelFps: low, gain: +gain.toFixed(2),
        dpr: window.devicePixelRatio, canvas: [r.canvas.width, r.canvas.height],
        tier: r.qualityTier, renderDistance: r.renderDistance, chunkMeshes: r.chunkMeshes.size });
    };
  }

  // ---------------------------------------------------------------- loop
  start() {
    let last = performance.now();
    // FPS badge: average over ~0.5s windows so the number is readable, not a blur
    let fpsAccum = 0, fpsFrames = 0;
    const fpsEl = document.getElementById('fps-badge');
    // tap the FPS badge to find out WHY the frame rate is what it is
    fpsEl?.addEventListener('click', () => this.runPerfSelfTest());
    const loop = (now) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      try {
        this.renderer.adaptResolution(dt); // scale internal resolution to keep FPS smooth
        this.tick(dt);
      } catch (e) {
        console.error('tick error', e);
      }
      if (this._probe) this._probe(dt);
      if (fpsEl) {
        fpsAccum += dt; fpsFrames++;
        if (fpsAccum >= 0.5) {
          const fps = Math.round(fpsFrames / fpsAccum);
          this.lastFps = fps;
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
    if (this._refreshAccum >= 0.4) { this._refreshAccum = 0; this.enemyMgr.refresh(); this.updateMounts(); }
    this.updatePet();
    // Time in the saddle is Handling practice. Flying pays more because getting
    // into the air was the hard part; both are a trickle, so riding keeps the
    // skill moving on a long journey and is never a way to farm it.
    //
    // Accumulated and paid in whole points, NOT handed to addXp() per frame:
    // addXp rounds, so a fractional award adds nothing but still fires an
    // xpGained event — which is a `+0 Handling XP` toast every single frame.
    const ridden = this.stable.ridingDef();
    if (ridden) {
      this._rideXp = (this._rideXp || 0) + (ridden.flying ? FLY_XP_PER_SEC : RIDE_XP_PER_SEC) * dt;
      if (this._rideXp >= 1) {
        const whole = Math.floor(this._rideXp);
        this._rideXp -= whole;
        this.skills.addXp('handling', whole);
      }
    }
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
      // waystone discovery — see updateWaystones for why 4 Hz is plenty
      this._wsAccum = (this._wsAccum || 0) + dt;
      if (this._wsAccum >= 0.25) { this._wsAccum = 0; this.updateWaystones(); }
    } else {
      this.ui.setPrompt(null);
      this.ui.setGatherProgress(null);
    }

    // quest helper: a dotted trail on the ground toward the current objective
    if (!this.combat.active && !p.dead) this.updateQuestTrail(dt);
    else this.trailDots = null;

    // education/playtime clock (no-op in free play)
    this.education.update(dt, !p.dead && !this.ui.currentWindow && !this.dialogueOpen && !this.playtimeLocked);
    // A walked lesson notices when the child reaches the next stop on the path.
    // Only inside a lesson world: there is nothing to arrive at anywhere else.
    if (this.world.lessonPath) this.lessons.update();

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
      // insulation proxy — gear, plus whatever is asleep in your hood. A
      // Dragon Whelp runs hot, which is the entire reason to carry one.
      const warmth = (est.warmth || 0) * 0.03 + est.armor * 0.012 + this.stable.perk('warmth') * 0.01;
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
    // Stream to the tier-capped draw distance, not the raw setting, so the low
    // tier doesn't mesh a ring of chunks it never draws (saves mesh time + the
    // shared-buffer memory on phones). Data streams one ring further for AO/light.
    const R = this.renderer.renderDistance;
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
      // edits/water: mesh synchronously so a broken/placed block updates instantly
      // (bounded to meshBudget/frame); new-chunk streaming below goes off-thread
      this.renderer.remeshChunk(this.world, cx, cz);
      meshBudget--;
    }
    for (let r = 0; r <= R && meshBudget > 0; r++) {
      for (let dz = -r; dz <= r && meshBudget > 0; dz++) {
        for (let dx = -r; dx <= r && meshBudget > 0; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
          const cx = pcx + dx, cz = pcz + dz;
          // skip chunks already meshed OR already queued on the worker
          if (this.renderer.hasMesh(cx, cz) || this.renderer.isMeshInFlight(cx, cz) || !this.world.hasChunk(cx, cz)) continue;
          if (!neighborsLoaded(cx, cz)) continue;
          this.renderer.remeshChunkAsync(this.world, cx, cz);
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
    // a locked dungeon grate: walk up and try the key, whether the tap was a
    // plain click or the mine gesture — you cannot dig your way past it either
    if (bdef?.name === 'iron_bars' && this.dungeonGateAt(hit.x, hit.y, hit.z)) {
      this.pendingInteract = { kind: 'gate', x: hit.x, y: hit.y, z: hit.z, range: 3.2 };
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
      const sealed = this.chestSealedReason(id);
      if (sealed) { this.ui.toast(sealed, 'warn'); return; }
      this.ui.openChestUI(id);
      emit('chestOpened', { id });
    } else if (pi.kind === 'gate') {
      this.tryDungeonGate(pi.x, pi.y, pi.z);
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
    this.ui.setPrompt(this.moveTarget && this.pendingInteract
      ? 'Walking…'
      : (this.nearWaystone ? this.waystonePrompt() : null));
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
    // skip the A* (a periodic single-frame spike) when nothing meaningful moved:
    // same destination and the player has barely shifted since the last trail
    const destKey = `${Math.round(dest[0])},${Math.round(dest[2])}`;
    if (this.trailDots && destKey === this._trailDestKey
        && Math.hypot(p.x - this._trailFromX, p.z - this._trailFromZ) < 3) return;
    this._trailDestKey = destKey; this._trailFromX = p.x; this._trailFromZ = p.z;
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

  // ---------------------------------------------------------------- waystones
  // Walking up to a standing stone puts it on your network. Called on a throttle
  // from tick(): eight dot products, and a block probe only for an arterial whose
  // mile mark is actually within reach — which for almost every column is none.
  updateWaystones() {
    const p = this.player;
    this.waystonesInSight = waystonesNear(this.world, p.x, p.z, 34);
    const here = this.waystonesInSight.find((ws) => atWaystone(ws, p.x, p.y, p.z)) || null;
    this.nearWaystone = here;
    if (!here || !this.waystones.add(here)) return;
    this.ui.toast(`Waystone discovered — ${here.name}. Open the Map to travel the network.`, 'gold');
    SFX.questDone();
    this.autosaveTimer = Math.min(this.autosaveTimer, 3);
    if (this.ui.currentWindow === 'map') this.ui.renderWindowBody();
  }

  // What the HUD says while you stand at a stone. This is the signpost finally
  // reading as something: the name it generated for itself, plus how to use it.
  waystonePrompt() {
    const ws = this.nearWaystone;
    if (!ws) return null;
    const n = this.waystones.size;
    const how = this.touch ? 'the Map button' : 'the Map (M)';
    return n > 1
      ? `${ws.name} · ${this.waystoneWhere(ws)} — open ${how} to travel the network (${n} stones)`
      : `${ws.name} · ${this.waystoneWhere(ws)} — find another waystone to travel between them`;
  }

  // The discovered stone you could depart from, or null. Fast travel is
  // stone-to-stone: standing at one is what buys the ride.
  departureWaystone() {
    const w = this.nearWaystone;
    return w && this.waystones.has(w.id) ? w : null;
  }

  // "Ashfen Crossing · 2048 E" — the bearing and mile mark of a stone, so two
  // stones that happen to draw the same name are still told apart in a list.
  waystoneWhere(ws) {
    return `${ws.n * WAYSTONE_SPACING} ${BEARINGS[ws.dir] || '?'}`;
  }

  // Travel the network. Between two discovered stones this is instant — that is
  // what a waystone network IS, and a phone player is not walking 4000 blocks in
  // real time. Away from a stone it falls back to the existing map-travel walk,
  // so the destination is never simply refused.
  travelToWaystone(id) {
    const dest = this.waystones.get(id);
    if (!dest) return false;
    const from = this.departureWaystone();
    if (from && from.id === dest.id) {
      this.ui.toast(`You are already at ${dest.name}.`, '');
      return false;
    }
    if (!from) {
      this.setTravelDest(dest.x + 0.5, dest.z + 0.5);
      this.ui.toast(`No stone to depart from — walking to ${dest.name}.`, 'warn');
      return true;
    }
    // Generate and mesh the arrival before moving, so nobody lands in void.
    const [lx, lz] = waystoneLanding(this.world, dest);
    const pcx = Math.floor(lx / CHUNK), pcz = Math.floor(lz / CHUNK);
    for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) this.world.ensureChunk(pcx + dx, pcz + dz);
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) this.renderer.remeshChunk(this.world, pcx + dx, pcz + dz);
    const y = this.world.groundNear(lx, lz, dest.y) ?? (this.world.surfaceAt(lx, lz) + 1);
    this.combatRS.disengageAll();
    this.player.respawnAt(lx + 0.5, y, lz + 0.5);
    this.cancelClassicActions();
    this.travelDest = null;
    this.controls.worldMove = null;
    this.nearWaystone = dest;
    this.waystonesInSight = [dest];
    this.renderer.spawnParticles(lx + 0.5, y + 1, lz + 0.5, [0.55, 0.8, 1], 26, 3, 1.1, 0.08);
    SFX.questDone();
    this.ui.toast(`${from.name} → ${dest.name}.`, 'gold');
    this.saveGame();
    return true;
  }

  // ------------------------------------------------------- dungeon grate locks
  // The dungeon whose locked grate this cell belongs to, or null. Cheap first
  // test (is it even iron bars?) before the region lookup.
  dungeonGateAt(x, y, z) {
    if (this.world.getBlock(x, y, z) !== B.iron_bars) return null;
    const dg = dungeonNear(this.world.gen, x, z);
    if (!dg || !isGrateCell(dg, x, y, z)) return null;
    return gateOpen(this.flags, dg) ? null : dg;   // already dissolved: ordinary bars
  }

  // Try the grate. Returns true when the interaction was consumed (locked or
  // opened), false when this wasn't a grate at all.
  tryDungeonGate(x, y, z) {
    const dg = this.dungeonGateAt(x, y, z);
    if (!dg) return false;
    const v = gateVerdict(this.flags, dg, this.inventory.count(DUNGEON_KEY));
    if (v.act !== 'unlock') {
      this.warnGather(`gate:${dg.x},${dg.z}`, v.msg);
      return true;
    }
    this.inventory.remove(DUNGEON_KEY, v.spend);
    openGate(this.flags, dg);
    for (const [gx, gy, gz] of grateCells(dg)) this.world.setBlock(gx, gy, gz, B.air, true);
    const d = dg.door;
    this.renderer.spawnParticles(d.x + 0.5, d.y + 1.5, d.z + 0.5, [0.75, 0.78, 0.85], 24, 3.5, 0.9);
    SFX.breakBlock();
    this.ui.toast(v.msg, 'gold');
    this.autosaveTimer = Math.min(this.autosaveTimer, 3);
    return true;
  }

  // Why this chest won't open, or null.
  //
  // Hand-built boss chests carry `requiresBossDead`, a world flag keyed by the
  // boss's SPAWN ID (js/world/structures.js + BOSS_FLAGS below). A procedural
  // dungeon's hoard cannot use those flags at all: its boss type is ordinary
  // roster fodder elsewhere in the world. It is keyed by the dungeon's own
  // anchor instead.
  chestSealedReason(id) {
    const meta = this.world.chestMeta.get(id);
    if (!meta) return null;
    if (meta.requiresBossDead && !this.flags[meta.requiresBossDead]) {
      return 'The chest is bound shut by living roots… defeat the guardian.';
    }
    if (!id.startsWith('dg:')) return null;
    const dg = dungeonNear(this.world.gen, meta.x, meta.z);
    if (dg && bossChestSealed(this.flags, dg, id)) return sealedChestMsg(dg);
    return null;
  }

  // A flagged dungeon creature died. The key holder hands over the key; the boss
  // unseals its own hoard. Both are matched on SPAWN ID, which is what keeps one
  // grave wight's death from unsealing every crypt in the world.
  onDungeonBossKilled(id, boss) {
    if (!boss || typeof id !== 'string' || !id.startsWith('dg:')) return;
    const [x, , z] = id.slice(3).split(',').map(Number);
    if (!Number.isFinite(x) || !Number.isFinite(z)) return;
    const dg = dungeonNear(this.world.gen, x, z);
    if (!dg) return;
    if (id === keyHolderId(dg)) {
      this.inventory.add(DUNGEON_KEY, 1);
      this.ui.toast(`${ITEMS[DUNGEON_KEY].label} taken from the warden — the grate below will turn.`, 'gold');
    } else if (id === bossSpawnId(dg)) {
      markBossDead(this.flags, dg);
      this.ui.toast('The hoard behind the throne unseals.', 'gold');
    } else return;
    this.autosaveTimer = Math.min(this.autosaveTimer, 3);
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
    // "Break <block>" is a SOFT prompt — true of nearly every block you can look
    // at, and so outranked by anything with something to say. Standing at a
    // waystone and happening to face its own masonry must read as the waystone,
    // not as "Hold LMB: Break Stone Brick Slab".
    let soft = false;
    if (npcNear) {
      prompt = `${touchMode ? 'Tap Action' : 'F / Right-click'}: Talk to ${NPC_DEFS[npcNear.id].label}`;
      this.currentSelection = null;
    } else if (enemyNear && enemyNear.def.behavior !== 'passive') {
      prompt = `${touchMode ? 'Tap Action' : 'Click'}: Engage ${enemyNear.def.label}`;
    } else if (enemyNear) {
      prompt = `${touchMode ? 'Tap Action' : 'Click'}: Attack ${enemyNear.def.label}`;
    } else if (hit) {
      prompt = this.promptForHit(hit, actionBtn, touchMode);
      soft = !hit.node;
    }

    // chest / station prompts override
    if (hit && !hit.node) {
      const def = BLOCKS[hit.id];
      if (def && ['workbench', 'furnace', 'anvil_block', 'campfire', 'alchemy_table', 'loom_block', 'enchant_altar', 'construction_bench'].includes(def.name)) {
        prompt = `${touchMode ? 'Tap Action' : 'F / Right-click'}: Use ${def.label}`;
        soft = false;
      } else if (def?.name === 'chest_block') {
        prompt = `${touchMode ? 'Tap Action' : 'F / Right-click'}: Open chest`;
        soft = false;
      } else if (def?.name === 'iron_bars' && this.dungeonGateAt(hit.x, hit.y, hit.z)) {
        // "locked", never an odd wall you happen to be unable to mine
        prompt = this.inventory.count(DUNGEON_KEY) > 0
          ? `${touchMode ? 'Tap Action' : 'F / Right-click'}: Unlock the grate (${ITEMS[DUNGEON_KEY].label})`
          : 'Locked grate — the warden of this place carries the key';
        soft = false;
      }
    }
    // A waystone you're standing at names itself and says what it is for. It
    // outranks a soft break prompt and nothing else.
    if (this.nearWaystone && (!prompt || soft)) prompt = this.waystonePrompt();
    // A mount you are standing at outranks both — it is the rarer thing to meet.
    if (this.nearMount && (!prompt || soft)) prompt = this.mountPrompt();
    if (this.stable.riding()) prompt = `Riding ${this.stable.ridingDef().label} — ${this.touch ? 'Tap Action' : 'F'} to dismount`;
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
    // The pet that is out, if any (js/game/mounts.js). A rat or a rabbit turns
    // up an extra find; a hen is worth a little XP; a goat carries the load so
    // the swing costs you less. `perk` is 0 when nothing is out, so all three
    // of these are no-ops on an empty stable.
    const forage = this.stable.perk('forage');
    if (forage && Math.random() < forage && drops.length) {
      const bonus = drops[Math.floor(Math.random() * drops.length)];
      this.inventory.add(bonus.item, 1);
      this.ui.toast(`${this.stable.petOutDef().label} turns up an extra ${ITEMS[bonus.item]?.label || bonus.item}`, 'xp');
    }
    this.skills.addXp(def.skill, def.xp * (crit ? 1.5 : 1) * (1 + this.stable.perk('gatherXp')));
    if (crit) this.ui.toast('Critical gather! Double yield', 'gold');
    if (toolStack) this.inventory.damageTool(toolStack, 1);
    this.player.energy = Math.max(0, this.player.energy - Math.max(1, 3 - this.stable.perk('haul')));
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
      const sealed = chest && this.chestSealedReason(chest.id);
      if (sealed) {
        this.warnGather(`chest:${chest.id}`, sealed);
        this.ui.setGatherProgress(null);
        this.breaking = null;
        return;
      }
    }
    // Nor can a locked grate be mined through — that is the whole lock. Once its
    // key has turned, the bars are gone and this never fires again.
    if (def.name === 'iron_bars') {
      const dg = this.dungeonGateAt(hit.x, hit.y, hit.z);
      if (dg) {
        this.warnGather(`gate:${dg.x},${dg.z}`, gateVerdict(this.flags, dg, 0).msg);
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
    // A door is two leaves and one object: take the other half with it, or the
    // remaining leaf hangs in the doorway with nothing holding it up. The drop
    // is the lower leaf's, which both halves declare, so you get one door back.
    if (def.shape === 'door') {
      for (const dy of [-1, 1]) {
        const od = BLOCKS[this.world.getBlock(x, y + dy, z)];
        if (od?.shape === 'door') { this.world.setBlock(x, y + dy, z, B.air, true); break; }
      }
    }
    // A bed is the same idea laid on its side: two cells, one object. Its halves
    // sit along the facing axis rather than stacked, and BOTH declare the same
    // `drops: 'bed'`, so taking the pair still returns exactly one bed.
    if (def.shape === 'bed') this.clearBedPartner(x, y, z, def);
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
        const sealed = this.chestSealedReason(chest.id);
        if (sealed) {
          this.ui.toast(sealed, 'warn');
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
    // A bed needs a second free cell for its head. Placing writes both and the
    // facing points foot→head, so the geometry and the sleeper agree about which
    // way the pillow is. If the head has nowhere to go, nothing is placed at all
    // — a half a bed is not a bed.
    if (def.block === 'bed' && !this.placeBedHead(px, py, pz)) {
      this.world.setBlock(px, py, pz, B.air, true);
      this.warnGather(`bed${px}${pz}`, 'A bed needs two clear blocks of floor.');
      return;
    }
    this.inventory.removeSlot(this.inventory.selected, 1);
    if (def.block === 'chest_block') this.world.registerPlayerChest(px, py, pz);
    this.skills.addXp('construction', 2);
    emit('blockPlaced', { x: px, y: py, z: pz, block: def.block });
    SFX.place();
  }

  // ------------------------------------------------------------------- mounts
  // Which tameable creature you are standing at, refreshed on the same throttle
  // as the waystone scan. `enemyMgr.entities` is the live set, so this only ever
  // looks at creatures actually loaded around you.
  updateMounts() {
    if (this.stable.riding()) { this.nearMount = null; return; }
    const p = this.player;
    let best = null, bestD = 3.4 * 3.4;
    for (const e of this.enemyMgr.entities.values()) {
      // TAMEABLE, not MOUNTS: a Warren Rabbit is approached exactly the way a
      // Destrier is, and one prompt covers both. The pet that is already out is
      // skipped — it follows you, so it would win every proximity check forever.
      if (!TAMEABLE[e.type] || e.dead || e.pet) continue;
      const dx = e.x - p.x, dy = (e.y ?? p.y) - p.y, dz = e.z - p.z;
      if (Math.abs(dy) > 3) continue;
      const d = dx * dx + dz * dz;
      if (d < bestD) { bestD = d; best = e; }
    }
    this.nearMount = best;
  }

  // The pet that is out, as a real creature in the world.
  //
  // It is a transient entity in the ordinary creature manager, so it renders,
  // animates and settles onto terrain with everything else and needs no special
  // drawing path. Steering is just moving its wander HOME to wherever you are —
  // the existing wander code then has it potter about near you, which is what a
  // pet looks like. A leash snap covers the fact that its walk speed (1.1 b/s)
  // is a third of yours: past LEASH it reappears at your heel rather than
  // trailing further and further behind you across a continent.
  updatePet() {
    const want = this.stable.petOut();
    if (!want) {
      if (this.petEntity) { this.enemyMgr.entities.delete(this.petEntity.id); this.petEntity = null; }
      return;
    }
    const p = this.player;
    const live = this.petEntity && this.petEntity.type === want
      && this.enemyMgr.entities.has(this.petEntity.id);
    if (!live) {
      if (this.petEntity) this.enemyMgr.entities.delete(this.petEntity.id);
      const def = ENEMY_TYPES[want];
      if (!def) { this.petEntity = null; return; }
      const gy = this.world.groundNear(Math.floor(p.x), Math.floor(p.z), p.y) ?? p.y;
      const id = `pet:${want}`;
      this.petEntity = {
        id, type: want, def, x: p.x, y: gy, z: p.z, homeX: p.x, homeZ: p.z,
        yaw: p.yaw, hp: def.hp, wanderT: 1, transient: true, pet: true,
      };
      this.enemyMgr.entities.set(id, this.petEntity);
      return;
    }
    const e = this.petEntity;
    e.homeX = p.x; e.homeZ = p.z;
    if (Math.hypot(e.x - p.x, e.z - p.z) > PET_LEASH) {
      const bx = p.x - Math.sin(p.yaw) * 1.5, bz = p.z - Math.cos(p.yaw) * 1.5;
      const gy = this.world.groundNear(Math.floor(bx), Math.floor(bz), p.y);
      if (gy !== null) { e.x = bx; e.z = bz; e.y = gy; e.targetX = undefined; }
    }
  }

  // What the HUD says at a mount: either how to tame it, or how to get on.
  mountPrompt() {
    const e = this.nearMount;
    if (!e) return null;
    const d = TAMEABLE[e.type];
    const key = this.touch ? 'Tap Action' : 'F';
    const hl = this.skills.level('handling');
    if (this.stable.has(e.type)) {
      return PETS[e.type]
        ? `${d.label} — ${key} to ${this.stable.petOut() === e.type ? 'send home' : 'call'}`
        : `${d.label} — ${key} to ride`;
    }
    // The level gate is stated up front rather than discovered by failing: a
    // creature you cannot tame yet should read as a goal, not as a bug.
    if (hl < levelFor(e.type)) return `${d.label} — needs Handling ${levelFor(e.type)} (you: ${hl})`;
    const need = feedNeeded(e.type, hl) - (this.stable.progress.get(e.type) || 0);
    const item = ITEMS[d.tame]?.label || d.tame;
    return this.inventory.count(d.tame) > 0
      ? `${d.label} — ${key} to offer ${item} (${need} more)`
      : `${d.label} — it wants ${tameHint(e.type, hl)}`;
  }

  // Feed it, or get on it. One key does both, because at any moment only one of
  // them is possible.
  tryMount(e) {
    const d = TAMEABLE[e.type];
    if (!d) return false;
    const hl = this.skills.level('handling');
    if (this.stable.has(e.type)) {
      if (PETS[e.type]) {
        this.stable.callPet(e.type);
        this.ui.toast(this.stable.petOut() === e.type
          ? `${d.label} falls in behind you.` : `${d.label} heads home.`, 'gold');
        return true;
      }
      this.stable.mount(e.type);
      this.player.mountDef = d;
      // Seat the rider clear of whatever the mount was standing in.
      this.player.y += SADDLE_H;
      this.ui.toast(`Riding ${d.label}. ${d.flying ? 'Jump to climb, sprint to dive.' : ''}`.trim(), 'gold');
      SFX.questDone();
      return true;
    }
    if (hl < levelFor(e.type)) {
      this.ui.toast(`${d.label} will not let you near it — Handling ${levelFor(e.type)} (you're ${hl}).`, 'warn');
      return true;
    }
    if (this.inventory.count(d.tame) <= 0) {
      this.ui.toast(`${d.label} will not come near you. It wants ${tameHint(e.type, hl)}.`, 'warn');
      return true;
    }
    this.inventory.remove(d.tame, 1);
    const r = this.stable.feed(e.type, 1, hl);
    if (r.tamed) {
      this.skills.addXp('handling', tameXp(e.type));
      this.ui.toast(PETS[e.type]
        ? `${d.label} decides you will do. It is yours now.`
        : `${d.label} lets you close. It will carry you now.`, 'gold');
      SFX.questDone();
      this.autosaveTimer = Math.min(this.autosaveTimer, 3);
    } else {
      this.skills.addXp('handling', FEED_XP);
      this.ui.toast(`${d.label} takes it, and waits. (${r.need} more)`, 'xp');
    }
    return true;
  }

  dismount() {
    const d = this.stable.ridingDef();
    if (!d) return;
    this.stable.dismount();
    this.player.mountDef = null;
    this.player.vy = 0;
    this.ui.toast(`Down off the ${d.label}.`, 'gold');
  }

  tryInteract(silent = false) {
    if (this.combat.active || this.combatRS.active || this.player.dead) return false;
    // Riding: the same key gets off. Checked first so a rider is never stuck
    // because they happen to be facing a chest.
    if (this.stable.riding()) { this.dismount(); return true; }
    if (this.nearMount && this.tryMount(this.nearMount)) return true;
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
      const sealed = this.chestSealedReason(id);
      if (sealed) { this.ui.toast(sealed, 'warn'); return true; }
      this.ui.openChestUI(id);
      emit('chestOpened', { id });
      return true;
    }
    // a locked dungeon grate: turn the warden's key in it
    if (def.name === 'iron_bars' && this.tryDungeonGate(hit.x, hit.y, hit.z)) return true;
    if (def.shape === 'bed') { this.trySleep(hit.x, hit.y, hit.z); return true; }
    if (def.shape === 'panel' || def.shape === 'door') { // trapdoor / door — swing it
      const f = this.world.facingAt(hit.x, hit.y, hit.z);
      this.world.setFacing(hit.x, hit.y, hit.z, f ^ 8); // flip the open bit (3)
      // A door is two leaves. Swing whichever half you clicked and its partner
      // together, or you open the bottom of a doorway and leave the top shut.
      if (def.shape === 'door') {
        for (const dy of [-1, 1]) {
          const od = BLOCKS[this.world.getBlock(hit.x, hit.y + dy, hit.z)];
          if (od?.shape !== 'door') continue;
          const of = this.world.facingAt(hit.x, hit.y + dy, hit.z);
          if ((of & 3) !== (f & 3)) continue;           // a different door, not our other half
          this.world.setFacing(hit.x, hit.y + dy, hit.z, of ^ 8);
        }
      }
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
      for (const [spawnId, info] of Object.entries(BOSS_FLAGS)) {
        if (e.ids?.includes(spawnId)) {
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
        const info = BOSS_FLAGS[t.entity?.id];
        if (info) {
          this.flags[info.flag] = true;
          this.ui.toast(info.toast, 'gold');
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
  // Switch into education (play-time-bank) mode and open the Lessons menu.
  // Reachable for testing via window.__game.enterLearningMode() (or
  // window.__learn()); the character-creation mode picker arrives in Phase 2.
  //
  // It used to teleport the child to Numbers Meadow to go and find Pip. Lessons
  // are PICKED FROM A MENU now — a child should not have to remember where the
  // classroom was, or walk there, or spend banked play time getting to the
  // thing that earns them more of it.
  enterLearningMode(config = {}) {
    if (!this.education.isEducation) this.education.setMode('education', config);
    // A brand-new learner (no lessons finished, empty bank) gets a few starter
    // minutes; after the first lesson the bank is earned, never given.
    if (this.education.balanceSec <= 0 && Object.keys(this.education.lessonsDone).length === 0) {
      this.education.grantMinutes(10, 'welcome');
    }
    this.grantLessonKit();
    this.ui.openWindow('lessons');
  }

  // Put the player down somewhere else, generating and meshing the destination
  // chunks first so they never drop into unloaded void — which for a classroom
  // 420 blocks up is not a stutter, it is a fall.
  warpTo(x, y, z, yaw = null) {
    const pcx = Math.floor(x / CHUNK), pcz = Math.floor(z / CHUNK);
    for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) this.world.ensureChunk(pcx + dx, pcz + dz);
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) this.renderer.remeshChunk(this.world, pcx + dx, pcz + dz);
    this.player.respawnAt(x, y, z);
    if (yaw != null) this.player.yaw = yaw;
    this.cancelClassicActions();
    this.travelDest = null;
    this.controls.worldMove = null;
    if (!this.player.dead) this.controls.enabled = true;
    this.touch?.show();
  }

  // ---- Lesson worlds ------------------------------------------------------
  // A lesson does NOT happen in a corner of the player's world. It happens in a
  // DIFFERENT WORLD: a separate World object holding one classroom in an
  // otherwise empty void, with its own chunks, its own edits and its own clock.
  // Nothing a child does in there can touch the world they play in, and nothing
  // from that world — no creature, no weather, no night — can reach them.
  //
  // The overworld is set aside whole and put back untouched. The player, their
  // pack, their skills and the education ledger are NOT part of the swap: those
  // belong to the character, which is why the minutes and coins a lesson pays
  // survive the trip home (js/game/characters.js).
  enterLessonWorld(dest) {
    if (!this._overworld) {
      const p = this.player;
      this._overworld = {
        world: this.world,
        weather: this.weather,
        pos: { x: p.x, y: p.y, z: p.z, yaw: p.yaw },
        enemies: this.enemyMgr.serialize(),
      };
    }
    // Every chunk mesh on the GPU belongs to the old world. Chunk keys are
    // coordinates, so leaving them would have the lesson world rendering the
    // overworld's geometry at the same coordinates.
    for (const key of [...this.renderer.chunkMeshes.keys()]) this.renderer.dropChunk(key);
    // A walked lesson gets a meadow path (js/world/lessonpath.js); the older
    // single-room lessons get their numbered classroom. The runner decides which
    // and hands the plan over as data — main.js only builds what it is given.
    this.world = new World(LESSON_SEED + dest.index,
      dest.plan ? { lessonPath: dest.plan } : { lessonRoom: dest.index });
    this.world.time = 8 * 3600;               // permanent mid-morning: no night in a lesson
    this.enemyMgr.world = this.world;
    this.enemyMgr.entities.clear();
    this.enemyMgr.killed.clear();
    this.petEntity = null;
    this.warpTo(dest.entry[0] + 0.5, dest.entry[1], dest.entry[2] + 0.5, dest.yaw);
    if (dest.yaw != null && this.camYaw !== undefined) this.camYaw = dest.yaw;
    this.grantLessonKit();
  }

  exitLessonWorld(finished) {
    const o = this._overworld;
    this._overworld = null;
    if (!o) return;
    for (const key of [...this.renderer.chunkMeshes.keys()]) this.renderer.dropChunk(key);
    this.world = o.world;
    this.weather = o.weather;
    this.enemyMgr.world = this.world;
    this.enemyMgr.entities.clear();
    this.enemyMgr.deserialize?.(o.enemies);
    this.warpTo(o.pos.x, o.pos.y, o.pos.z, o.pos.yaw);
    this.ui.toast(finished ? 'Lessons all done — back to your world!' : 'Back to your world.', 'gold');
    this.saveGame();
  }


  // Put in the pack exactly what the lesson in front of them asks for.
  //
  // Derived from the lesson's own steps (lessonNeeds walks every shape and takes
  // the largest single-step demand of each block), never listed by hand: a step
  // that wants forty grey blocks or the letter Q cannot leave a child staring at
  // a prompt with nothing to place. Only the ACTIVE lesson's materials, plus the
  // four basic colours — twenty-six letters and sixteen wools at once would bury
  // the pack, and hunting for the C among a hundred slots is not the exercise.
  grantLessonKit() {
    const want = { red_wool: 16, blue_wool: 16, yellow_wool: 16, green_wool: 16 };
    for (const id of Object.values(this.lessons?.current || {})) {
      const lesson = this.lessons?.byId?.get(id);
      if (!lesson) continue;
      // A margin over the exact answer, so a miscount is a mistake to fix rather
      // than a dead end with an empty hand.
      for (const [block, n] of Object.entries(lessonNeeds(lesson))) {
        want[block] = Math.max(want[block] || 0, n + 4);
      }
    }
    for (const [item, qty] of Object.entries(want)) {
      const have = this.inventory.count(item);
      if (have < qty) this.inventory.add(item, qty - have);
    }
  }

  // "Go to Lessons" from the play-time lock screen: lift the lock enough to move
  // and build (the bank is empty, so nothing drains until a lesson is completed)
  // and open the menu to pick one.
  goToLessons() {
    document.getElementById('playtime-lock')?.remove();
    this.playtimeLocked = false;
    if (!this.player.dead) this.controls.enabled = true;
    this.touch?.show();
    this.ui.openWindow('lessons');
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

  // ---------------------------------------------------------------- beds
  // A bed is two cells that must stay in lockstep. The FOOT is what you place
  // and what the item is; the HEAD is written beside it, one step along the
  // facing. Both cells carry the same facing, which is the only thing that
  // tells two beds pushed together apart.

  // Write the head cell beside a just-placed foot. Returns false if there is
  // nowhere for it to go, and the caller then unwinds the whole placement.
  placeBedHead(fx, fy, fz) {
    const facing = this.world.facingAt(fx, fy, fz) & 3;
    const [dx, dz] = BED_DIR[facing];
    const hx = fx + dx, hz = fz + dz;
    const at = this.world.getBlock(hx, fy, hz);
    if (at !== B.air && BLOCKS[at]?.solid) return false;
    if (this.world.nodeAt(hx, fy, hz)) return false;
    // …and it has to have a floor, or the head end hangs off a ledge.
    if (!BLOCKS[this.world.getBlock(hx, fy - 1, hz)]?.solid) return false;
    this.world.setBlock(hx, fy, hz, B.bed_head, true);
    this.world.setFacing(hx, fy, hz, facing);
    return true;
  }

  // Find and clear the other half of the bed at (x,y,z). Looks along the facing
  // in BOTH directions because either end can be the one you broke, and matches
  // on the facing so two beds side by side never take each other's halves.
  clearBedPartner(x, y, z, def) {
    const facing = this.world.facingAt(x, y, z) & 3;
    const [dx, dz] = BED_DIR[facing];
    const want = def.name === 'bed_head' ? B.bed : B.bed_head;
    const step = def.name === 'bed_head' ? -1 : 1;
    const px = x + dx * step, pz = z + dz * step;
    if (this.world.getBlock(px, y, pz) !== want) return;
    if ((this.world.facingAt(px, y, pz) & 3) !== facing) return;
    this.world.setBlock(px, y, pz, B.air, true);
  }

  // Sleep. Sets your respawn point unconditionally — that is the half of a bed
  // that always works — and skips to dawn only when it is actually night, so
  // clicking a bed at noon does not silently burn a day.
  trySleep(x, y, z) {
    this.bedSpawn = [x + 0.5, y, z + 0.5];
    // Time until the day phase next equals DAWN — never a fixed jump, which
    // would wake you at a different hour every night and eventually stop being
    // dawn at all.
    const skip = ((DAWN - this.world.dayPhase() + 1) % 1) * DAY_LEN;
    // Two ways sleeping is a no-op, and both have to say so out loud rather than
    // announce a night that did not pass: it is broad daylight, or dawn is
    // already breaking (skip rounds to nothing, so the clock would not move).
    if (!this.world.isNight() || skip < 1) {
      this.ui.toast(this.world.isNight()
        ? 'It is nearly light already. You will wake here.'
        : 'You set your things down. You will wake here.', 'gold');
      this.saveGame();
      return;
    }
    this.world.time += skip;
    // Everything that schedules against world.time (node respawns, crop ripening,
    // mob respawn timers) is stored as an ABSOLUTE deadline, so a jump forward
    // simply makes those deadlines due — which is what a night passing should do.
    // The one thing that must be told explicitly is the creature set: nocturnal
    // spawns are culled on refresh, and without this they stand around in
    // daylight until the next 0.4s tick.
    this.enemyMgr.refresh();
    this.player.hp = Math.min(this.player.maxHp, this.player.hp + Math.ceil(this.player.maxHp * 0.4));
    this.player.energy = 100;
    this.ui.toast('You sleep until dawn.', 'gold');
    SFX.questDone();
    this.saveGame();
  }

  respawn() {
    $('death-screen').classList.add('hidden');
    // Your bed if you have slept in one, the world spawn if you have not.
    const [sx, sy, sz] = this.bedSpawn || this.world.markers.spawn;
    if (this.bedSpawn) {
      this.player.respawnAt(sx, this.world.surfaceAt(Math.floor(sx), Math.floor(sz)) + 1, sz);
      this.ui.toast('You wake at your bed.', 'gold');
      this.cancelClassicActions();
      this.travelDest = null;
      this.controls.worldMove = null;
      this.controls.enabled = true;
      this.touch?.show();
      this.saveGame();
      return;
    }
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
      e._ambT = null; e._ambPlay = 0;   // moving cancels any ambient in progress
      return evaluatePose(model, 'walk', this.world.time + offset);
    }
    // Ambient clips — a wolf howling, a cow grazing, a hen pecking. They fire on
    // a per-creature timer while it's standing around, play once, and hand back
    // to idle. Timers are seeded per entity so a herd never acts in lockstep.
    const amb = model.ambient;
    if (amb) {
      const clips = amb.clips || [amb.clip];
      const [lo, hi] = amb.every || [12, 28];
      if (e._ambT == null) e._ambT = lo + Math.random() * (hi - lo);
      if (e._ambPlay > 0) {
        e._ambPlay -= dt;
        if (e._ambPlay > 0) return evaluatePose(model, e._ambClip, this.world.time - e._ambStart);
        e._ambT = lo + Math.random() * (hi - lo);
      } else if ((e._ambT -= dt) <= 0) {
        const clip = clips[(Math.random() * clips.length) | 0];
        if (model.animations[clip]) {
          e._ambClip = clip;
          e._ambStart = this.world.time;
          e._ambPlay = model.animations[clip].length || 1;
          return evaluatePose(model, clip, 0);
        }
        e._ambT = lo + Math.random() * (hi - lo);
      }
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
      const cull = this._entityCull ?? 44;
      for (const e of this.enemyMgr.entities.values()) {
        const d = Math.hypot(e.x - this.player.x, e.z - this.player.z);
        if (d > cull) continue;
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
    const propCull = this._entityCull ?? 44;
    this.forNodesNear(propCull, (node) => {
      if (node.def?.kind !== 'prop') return;
      if (this.world.nodeState(node.id)?.state === 'depleted') return;
      const dx = node.x + 0.5 - this.player.x, dz = node.z + 0.5 - this.player.z;
      if (dx * dx + dz * dz > propCull * propCull) return;
      out.push({
        model: node.def.model, x: node.x + 0.5, y: node.y, z: node.z + 0.5,
        yaw: (node.x * 2.399 + node.z * 5.717) % (Math.PI * 2), tint: [0, 0, 0], pose: null,
      });
    });
    return out;
  }

  // Visit resource nodes in loaded chunks within `radius` blocks of the player,
  // scanning only the chunk window that could hold them rather than every loaded
  // chunk. Identical results to a full scan — chunks entirely out of range are
  // skipped — so this per-frame cost stays flat as the world (chunk count) grows,
  // instead of climbing with render distance. Matters for mobile and multiplayer.
  forNodesNear(radius, fn) {
    const pcx = Math.floor(this.player.x / CHUNK), pcz = Math.floor(this.player.z / CHUNK);
    const r = Math.ceil(radius / CHUNK) + 1;
    for (let dz = -r; dz <= r; dz++) {
      for (let dx = -r; dx <= r; dx++) {
        const chunk = this.world.getChunk(pcx + dx, pcz + dz);
        if (!chunk) continue;
        const nodes = chunk.nodes;
        for (let i = 0; i < nodes.length; i++) fn(nodes[i]);
      }
    }
  }

  collectMarkers() {
    const out = [];
    this.forNodesNear(40, (node) => {
      if (node.def.kind !== 'water') return;
      const st = this.world.nodeState(node.id);
      if (st?.state !== 'ready') return;
      const d = Math.hypot(node.x - this.player.x, node.z - this.player.z);
      if (d > 40) return;
      out.push({ x: node.x, y: node.y - 0.85, z: node.z, color: [0.5, 0.75, 1] });
    });
    if (this.travelDest) {
      const [tx, ty, tz] = this.travelDest;
      out.push({ x: Math.floor(tx), y: ty - 0.6, z: Math.floor(tz), color: [1, 0.8, 0.25] });
    }
    return out;
  }

  labelVisible(x, y, z, cacheId) {
    // The occlusion raycast is the label system's per-frame hot spot. It doesn't
    // need to be frame-exact, so cache the result per source for ~160ms.
    if (cacheId != null) {
      this._visCache ??= new Map();
      if (this._visCache.size > 200) this._visCache.clear(); // drop stale despawned ids
      const c = this._visCache.get(cacheId);
      if (c && this.world.time - c.t < 0.16) return c.v;
    }
    const eye = this.combat.active && this.combatCam ? this.combatCam.eye : this.player.eye();
    const dx = x - eye[0], dy = y - eye[1], dz = z - eye[2];
    const dist = Math.hypot(dx, dy, dz);
    if (dist < 0.5) return true;
    const hit = this.world.raycast(eye[0], eye[1], eye[2], dx / dist, dy / dist, dz / dist, dist - 0.6, false);
    const v = !hit || !BLOCKS[hit.id]?.opaque;
    if (cacheId != null) this._visCache.set(cacheId, { v, t: this.world.time });
    return v;
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
        if (!this.labelVisible(npc.x + 0.5, npc.y + 1.6, npc.z + 0.5, `npc:${npc.id}`)) continue;
        // An NPC whose id has no definition gets no label rather than taking
        // the whole tick loop down with it — this runs every frame, so one bad
        // id anywhere in the world is a hard crash.
        const def = NPC_DEFS[npc.id];
        if (!def) continue;
        const hasQuest = this.quests.availableFrom(npc.id).length > 0;
        const turnIn = this.quests.activeFrom(npc.id).some((q) => this.quests.readyToTurnIn(q, npc.id));
        labels.push({
          x: npc.x + 0.5, y: npc.y + 2, z: npc.z + 0.5,
          name: `${turnIn ? '? ' : hasQuest ? '! ' : ''}${def.label}`,
          sub: def.role, color: '#ffe9a8',
        });
      }
      // Waystones name themselves in the world — the signposts carry no text a
      // renderer could draw, so the marker floats its generated name instead.
      for (const ws of this.waystonesInSight) {
        const capY = ws.y + WAYSTONE_HEIGHT;   // just over the capstone
        // The stone you're standing at is never occluded to you — skip the
        // raycast, which at point-blank range clips the menhir's own courses.
        if (ws !== this.nearWaystone
            && !this.labelVisible(ws.x + 0.5, capY, ws.z + 0.5, `ws:${ws.id}`)) continue;
        const known = this.waystones.has(ws.id);
        labels.push({
          x: ws.x + 0.5, y: capY + 0.7, z: ws.z + 0.5,
          name: ws.name,
          sub: known ? `waystone · ${this.waystoneWhere(ws)}` : 'waystone — step up to it',
          color: known ? '#a9dcff' : '#9aa6b0',
        });
      }
      for (const e of this.enemyMgr.entities.values()) {
        const d = Math.hypot(e.x - this.player.x, e.z - this.player.z);
        if (d > 18) continue;
        if (!this.labelVisible(e.x, e.y + 1.2, e.z, e.id)) continue;
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
    // A lesson world is scratch: it is regenerated from its index every time and
    // holds nothing worth keeping. Saving while inside one must write the
    // OVERWORLD that was set aside, or finishing a lesson would overwrite a
    // child's real world with an empty classroom.
    const saveWorld = this._overworld ? this._overworld.world : this.world;
    const savePos = this._overworld ? this._overworld.pos : null;
    const saveEnemies = this._overworld ? this._overworld.enemies : this.enemyMgr.serialize();
    const data = {
      meta: {
        seedText: this.seedText,
        savedAt: Date.now(),
        playtime: Math.round(this.playtime),
        totalLevel: this.skills.totalLevel(),
        mode: this.education.mode, // 'free' | 'education' — lets the title screen resume Learning Mode
        version: 1,
      },
      world: saveWorld.serialize(),
      player: savePos ? { ...this.player.serialize(), ...savePos } : this.player.serialize(),
      inventory: this.inventory.serialize(),
      skills: this.skills.serialize(),
      quests: this.quests.serialize(),
      enemies: saveEnemies,
      stable: this.stable.serialize(),
      // Where you wake up. Null until you have slept somewhere, which is what
      // makes the world spawn the fallback rather than a special case.
      bedSpawn: this.bedSpawn,
      education: this.education.serialize(),
      lessons: this.lessons.serialize(),
      flags: this.flags,
      discovered: [...this.discovered],
      discoveredItems: [...this.discoveredItems],
      // Flat [x, z, y, dir, n] tuples; names are recomputed from the column on
      // load (js/game/waystones.js), so they can never drift from their stone.
      waystones: this.waystones.serialize(),
    };
    // Two files, not one (js/game/characters.js). The character goes to its own
    // key so it can be carried into another world; the slot keeps the world and
    // a note of who was last in it. `characterId` is set when the game starts,
    // so this can never mint a second character for the same body.
    const { character, world } = splitSave(data, { id: this.characterId, name: this.characterName });
    saveCharacter(character);
    saveSlot(this.slot, { meta: { ...data.meta, characterId: character.id, characterName: character.name, version: 2 }, ...world });
  }

  restore(d) {
    // `_restored` gates the spawn seating below, so it has to mean "this body
    // already has a coordinate in THIS world" — not merely "there was a save".
    // A character carried into a new seed restores their skills and pack but
    // has no position, and must still be put down at the spawn point.
    this._restored = Number.isFinite(d.player?.x) && Number.isFinite(d.player?.z);
    this.world.deserialize(d.world);
    this.player.deserialize(d.player);
    this.inventory.deserialize(d.inventory);
    this.skills.deserialize(d.skills);
    this.quests.deserialize(d.quests);
    this.enemyMgr.deserialize(d.enemies);
    // An old save has no `stable` at all; deserialize(undefined) is an empty one.
    this.stable.deserialize(d.stable);
    // A save from before beds existed simply has no bedSpawn, and a corrupt one
    // must not strand you inside terrain — three finite numbers or nothing.
    this.bedSpawn = Array.isArray(d.bedSpawn) && d.bedSpawn.length === 3
      && d.bedSpawn.every(Number.isFinite) ? d.bedSpawn : null;
    this.player.mountDef = mountDef(this.stable.riding());
    this.education.deserialize(d.education);
    this.lessons.deserialize(d.lessons);
    this.flags = d.flags || {};
    this.discovered = new Set(d.discovered || []);
    this.discoveredItems = new Set(d.discoveredItems || []);
    this.waystones.deserialize(d.waystones); // absent in pre-waystone saves — fine
    this.playtime = d.meta?.playtime || 0;
  }
}

function gatherVerb(def) {
  return { tree: 'Chop', ore: 'Mine', plant: 'Gather', water: 'Fish', ground: 'Excavate', farm: 'Harvest' }[def.kind] || 'Gather';
}

const TOOL_NAMES = { axe: 'an axe', pickaxe: 'a pickaxe', shovel: 'a shovel', rod: 'a fishing rod', hoe: 'a hoe' };

// How far a pet may trail before it reappears at your heel. Wide enough that
// the snap is never something you watch happen, short enough that a pet is
// never a dot on the horizon you have to wait for.
const PET_LEASH = 14;

// Facing → the step from a bed's FOOT to its HEAD. Same order as the renderer's
// FRONT_N (js/gfx/shapes.js): 0=+Z 1=+X 2=-Z 3=-X. If these two ever disagree
// the headboard is drawn on the wrong end of the bed.
const BED_DIR = [[0, 1], [1, 0], [0, -1], [-1, 0]];

// The day phase the sun comes up at, matching world.daylight()'s curve. Sleeping
// advances to the next occurrence of this, so you always wake at the same hour.
const DAWN = 0.05;

// World-state consequences of the two HAND-BUILT boss kills.
//
// Keyed by SPAWN ID, not by mob type. Both bosses are goblin chiefs, and a
// warchief is also the boss of any ring-2 procedural dungeon — keying by type
// would have let a warren three thousand blocks away unseal the Rootgrave
// hoard. Spawn ids are unique to the hand-built sites (js/world/structures.js),
// so this cannot collide with anything the generator places.
const BOSS_FLAGS = {
  boss_gorrak: { flag: 'boss_gorrak', toast: 'The Rootgrave falls silent — Gorrak is down.' },
  boss_vashk: { flag: 'boss_vashk', toast: 'Vashk the Warlord is slain — the frontier can breathe.' },
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
      const esc = (t) => String(t).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
      const who = s.characterName ? `${esc(s.characterName)} · ` : '';
      b.innerHTML = `<span>Slot ${s.slot} — <b>Continue</b><br><span class="slot-sub">${who}Total level ${s.totalLevel} · ${mins}m played · seed "${esc(s.seedText)}"</span></span><span class="slot-del" title="Delete world">${pixelIcon('trash', 15)}</span>`;
    }
    b.addEventListener('click', (e) => {
      if (e.target.closest?.('.slot-del')) {
        // Deleting a world never deletes the character who was in it — that is
        // the point of them being separate, and the wording has to say so or
        // people will not risk the button.
        if (confirm(`Delete the world in slot ${s.slot}? The character keeps their skills and pack.`)) {
          deleteSlot(s.slot); renderTitle();
        }
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
  const charBtn = $('characters-btn');
  if (charBtn) charBtn.onclick = () => { SFX.uiClick?.(); renderCharacters(); };
  $('title-hint').textContent = isTouchDevice()
    ? 'Left stick to move · drag right side to look · Action button to gather and fight'
    : 'WASD to move · mouse to look · hold left click to gather · E for inventory';
}

// Start a world. `opts.character` is a character record to bring into it; with
// none, the slot's own last occupant is used, and failing that a new one is
// minted. That single rule covers all four cases the title screen can produce:
// continue, new world with a new character, new world with an old character,
// and an old world entered by somebody else.
// ---------------------------------------------------------- character screen
// The list of people you can be, and the two ways a character moves between
// devices: a code out, a code in.
let pendingCharacter = null;   // chosen here, consumed by the next world you open

function charMsg(text, bad = false) {
  const el = $('char-msg');
  if (!el) return;
  el.textContent = text;
  el.classList.toggle('bad', !!bad);
}

function renderCharacters() {
  $('title-screen').classList.add('hidden');
  $('character-screen').classList.remove('hidden');
  charMsg('');
  const listEl = $('character-list');
  const chars = listCharacters();
  listEl.innerHTML = '';
  if (!chars.length) {
    const p = document.createElement('p');
    p.className = 'char-blurb';
    p.textContent = 'No characters yet. Create one below, or just start a world — a character is made for you.';
    listEl.appendChild(p);
  }
  const esc = (t) => String(t).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
  for (const c of chars) {
    const row = document.createElement('div');
    row.className = 'slot-btn';
    const mins = Math.floor(c.playtime / 60);
    const chosen = pendingCharacter?.id === c.id;
    row.innerHTML = `<span><b>${esc(c.name)}</b>${chosen ? ' — selected' : ''}<br>`
      + `<span class="slot-sub">Total level ${c.totalLevel} · ${mins}m played</span></span>`;
    const tools = document.createElement('span');
    tools.className = 'char-row';
    const pick = document.createElement('button');
    pick.className = 'link-btn';
    pick.textContent = chosen ? 'Selected' : 'Play';
    pick.onclick = () => {
      // Choosing a character does not start anything — it decides who walks into
      // whichever world you pick next, including a brand-new one.
      pendingCharacter = loadCharacter(c.id);
      charMsg(`${c.name} is ready. Pick a world on the title screen — a new slot takes them somewhere fresh.`);
      renderCharacters();
    };
    const exp = document.createElement('button');
    exp.className = 'link-btn';
    exp.textContent = 'Copy code';
    exp.onclick = async () => {
      const code = exportCharacter(loadCharacter(c.id));
      try {
        await navigator.clipboard.writeText(code);
        charMsg(`${c.name} copied — paste that code on another device to bring them along.`);
      } catch {
        // Clipboard access is refused often enough (no permission, no secure
        // context) that the fallback has to be a real answer, not an apology.
        $('char-code').value = code;
        charMsg('Clipboard is blocked here — the code is in the box below, copy it by hand.');
      }
    };
    const del = document.createElement('button');
    del.className = 'link-btn';
    del.textContent = 'Delete';
    del.onclick = () => {
      if (!confirm(`Delete ${c.name}? Their skills and pack are gone for good. Worlds they visited are untouched.`)) return;
      deleteCharacter(c.id);
      if (pendingCharacter?.id === c.id) pendingCharacter = null;
      renderCharacters();
    };
    tools.append(pick, exp, del);
    row.appendChild(tools);
    listEl.appendChild(row);
  }

  $('char-new').onclick = () => {
    const name = $('char-name').value.trim() || 'Wanderer';
    const c = newCharacter(name);
    saveCharacter(c);
    $('char-name').value = '';
    pendingCharacter = c;
    charMsg(`${c.name} created and selected. Pick a world on the title screen.`);
    renderCharacters();
  };
  $('char-import').onclick = () => {
    const r = importCharacter($('char-code').value);
    if (!r.ok) { charMsg(r.error, true); return; }
    saveCharacter(r.character);
    $('char-code').value = '';
    charMsg(`${r.character.name} imported.`);
    renderCharacters();
  };
  $('char-back').onclick = () => {
    $('character-screen').classList.add('hidden');
    $('title-screen').classList.remove('hidden');
    renderTitle();
  };
}

async function startGame(slot, isNew, opts = {}) {
  const seedInput = $('seed-input').value.trim();
  let world = null;
  // A character picked on the character screen wins over the world's own last
  // occupant — that is how you take someone into a seed they have never seen.
  let character = opts.character || pendingCharacter || null;
  pendingCharacter = null;
  let seedText;
  if (isNew) {
    seedText = seedInput || `${Math.floor(Math.random() * 999999)}`;
  } else {
    world = loadSlot(slot);
    // A save written before characters existed is one undivided blob. Split it
    // on the way in and write both halves back, so the upgrade happens once,
    // silently, the first time an old save is opened.
    const moved = migrateSlot(world);
    if (moved) {
      saveCharacter(moved.character);
      world = { meta: { seedText: moved.seedText, characterId: moved.character.id, characterName: moved.character.name, version: 2 }, ...moved.world };
      saveSlot(slot, world);
      character = character || moved.character;
    }
    seedText = world?.meta?.seedText || world?.world?.seed?.toString() || '0';
    character = character || loadCharacter(world?.meta?.characterId);
  }
  if (!character) character = newCharacter(opts.name || 'Wanderer');
  // The payload the game actually restores from: this character's things, in
  // this world. A character new to a world contributes no position, and main
  // then seats them at that world's spawn.
  const saveData = (world || !isNew) || opts.character
    ? joinSave(character, world, { seedText })
    : joinSave(character, null, { seedText });
  // A brand-new character in a brand-new world has nothing to restore.
  const fresh = isNew && !opts.character && !character.skills;
  $('title-screen').classList.add('hidden');
  $('loading-screen').classList.remove('hidden');

  buildAtlas();
  // custom creature files: spawn rules must land before chunks generate
  const mobFiles = await fetchMobFiles();
  for (const f of mobFiles) { try { injectSpawnRules(f); } catch (e) { console.error('[mobs]', e.message); } }
  const game = new Game(slot, seedText, fresh ? null : saveData, character);
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
