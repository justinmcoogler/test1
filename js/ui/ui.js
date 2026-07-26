// All DOM UI: HUD, windows, dialogue, shop, chest, combat interface, labels.
import { ITEMS } from '../game/items.js';
import { LESSONS_DATA } from '../game/lessons.js';
import { ENEMY_TYPES } from '../game/enemies.js';
import { BIOMES } from '../world/worldgen.js';
import { mobActive, mobRate, mobBiomes, mobDropsFor, setMobConfig, resetMobConfig, saveMobConfig, allMobTypes, exportMobDefaults, mobDeleted, setMobDeleted, setAllMobsActive, deletedMobTypes } from '../game/mobconfig.js';
import { SKILL_DEFS, SKILL_UNLOCKS, xpForLevel } from '../game/skills.js';
import { RECIPES, STATION_LABELS, canCraft, craft, minFuel } from '../game/crafting.js';
import { EQUIP_SLOTS, EQUIP_LABELS, HOTBAR_SIZE, INV_SIZE } from '../game/inventory.js';
import { QUESTS } from '../game/quests.js';
import { NPC_DEFS, DIALOGUES } from '../game/npcs.js';
import { evaluatePose } from '../game/mobloader.js';
import { STATUS_INFO, ABILITIES } from '../game/combat.js';
import { RS_STYLES } from '../game/combatrs.js';
import { tileIconDataURL, getAtlasCanvas, faceUV } from '../gfx/textures.js';
import { B, BLOCKS } from '../world/blocks.js';
import { WORLD_H } from '../world/worldgen.js';
import { icon, itemIcon, skillIcon, gemmedItemHTML } from '../gfx/icons.js';
import { SOCKETABLE_GEMS, socketDesc } from '../game/sockets.js';
import { CHUNK } from '../world/worldgen.js';
import { on, emit } from '../core/events.js';
import { SFX } from '../core/audio.js';

const $ = (id) => document.getElementById(id);

// hover tooltip text: name, category, stat line, flavor
function itemTitle(itemId) {
  const def = ITEMS[itemId];
  if (!def) return '';
  const stat = ['atk', 'acc', 'crit', 'armor', 'evasion', 'speed', 'magic', 'magicResist', 'mana', 'hp', 'block', 'heal', 'energy']
    .filter((k) => def[k]).map((k) => `${k} ${def[k] > 0 ? '+' : ''}${def[k]}`).join(' · ');
  const bits = [def.label];
  if (def.type === 'tool') bits.push(`${def.tool}, tier ${def.tier}`);
  else if (def.type === 'weapon') bits.push(`${def.wclass} weapon`);
  else if (def.type === 'armor' || def.type === 'accessory' || def.type === 'utility') bits.push(`${def.type} (${def.slot})`);
  else if (def.type !== 'material') bits.push(def.type);
  if (stat) bits.push(stat);
  if (def.gather) bits.push(`+${Math.round(def.gather * 100)}% gathering`);
  if (def.desc) bits.push(def.desc);
  return bits.join('\n');
}

function itemIconHTML(itemId, size = null, gem = null) {
  const def = ITEMS[itemId];
  if (!def) return '?';
  if (gem) return gemmedItemHTML(itemId, size || 20, gem); // weapon with a socketed gem
  if (def.tileIcon) {
    const url = tileIconDataURL(def.tileIcon);
    if (url) return `<img src="${url}" alt="${def.label}">`;
  }
  return itemIcon(itemId, size || 20);
}

export class UI {
  constructor(game) {
    this.game = game;
    this.currentWindow = null;
    this.selectedInvSlot = null;
    this.selectedSkill = 'mining';
    this.selectedRecipe = null;
    this.combatMode = null;       // null | 'move' | {ability}
    this.inspectMode = false;
    this.shopNpc = null;
    this.chestId = null;
    this.labelPool = [];
    this.minimapTiles = new Map(); // chunkKey → canvas
    this.bindEvents();
  }

  // fill the static HUD buttons with pixel icons
  paintStaticIcons() {
    const menuIcons = { inventory: 'bag', skills: 'chart', crafting: 'hammer', quests: 'scroll', map: 'mapicon', settings: 'gear' };
    document.querySelectorAll('.menu-btn[data-win]').forEach((b) => { b.innerHTML = icon(menuIcons[b.dataset.win], 22); });
    this.paintCameraButton();
    const touchIcons = { 'btn-jump': 'arrowup', 'btn-sprint': 'chevrons', 'btn-action': 'handstar', 'btn-place': 'blockicon' };
    for (const [id, name] of Object.entries(touchIcons)) {
      const el = $(id);
      if (el) el.innerHTML = icon(name, id === 'btn-action' ? 30 : 22);
    }
  }

  // The camera button shows the view you would GET by pressing it, not the one
  // you are in — a toggle that pictures the current state reads as "you are
  // here" and gives you no idea what it does.
  paintCameraButton() {
    const b = $('btn-camera');
    if (!b) return;
    const classic = !!this.game.settings.classicCamera;
    b.innerHTML = icon(classic ? 'eye' : 'camera', 22);
    b.title = classic ? 'Switch to first-person view (V)' : 'Switch to classic overhead view (V)';
    b.setAttribute('aria-label', b.title);
  }

  // ------------------------------------------------------------ boot & events
  bindEvents() {
    const g = this.game;
    this.paintStaticIcons();
    $('window-close').addEventListener('click', () => this.closeWindow());
    // tapping the minimap enlarges it into the full map window
    $('minimap').addEventListener('click', () => {
      if (!g.combat.active && !g.player.dead) this.toggleWindow('map');
    });
    document.querySelectorAll('.menu-btn[data-win]').forEach((b) => {
      b.addEventListener('click', () => { this.toggleWindow(b.dataset.win); });
    });
    // The camera button is an ACTION, not a window, so it is wired on its own
    // rather than through the data-win loop. Until now the only way to change
    // view was the V key, which a phone does not have.
    $('btn-camera')?.addEventListener('click', () => {
      if (g.combat.active || g.player.dead) return;   // not mid-fight, not mid-death
      emit('toggleCamera');
    });
    on('toggleWindow', (w) => this.toggleWindow(w));
    on('escapePressed', () => {
      if (g.dialogueOpen) this.hideDialogue();
      else if (this.currentWindow) this.closeWindow();
      else this.toggleWindow('settings');
    });
    on('hotbarSelect', (i) => { g.inventory.selected = i; this.renderHotbar(); SFX.uiClick(); });
    on('hotbarScroll', (dir) => {
      g.inventory.selected = (g.inventory.selected + dir + HOTBAR_SIZE) % HOTBAR_SIZE;
      this.renderHotbar();
    });
    on('inventoryChanged', () => {
      this.renderHotbar();
      if (this.currentWindow === 'inventory') this.renderWindowBody();
      if (this.chestId) this.renderWindowBody();
    });
    on('xpGained', ({ skill, amount }) => {
      if (g.settings.xpToasts !== false) this.toast(`+${amount} ${SKILL_DEFS[skill].label} XP`, 'xp');
      if (this.currentWindow === 'skills') this.renderWindowBody();
    });
    on('levelUp', ({ skill, level }) => {
      this.toast(`${SKILL_DEFS[skill].label} level ${level}!`, 'levelup');
      SFX.levelUp();
    });
    on('itemGained', ({ item, qty }) => {
      const def = ITEMS[item];
      if (def) this.toast(`+${qty} ${def.label}`, item === 'coin' ? 'gold' : '');
    });
    on('inventoryFull', () => this.toast('Inventory full!', 'warn'));
    on('toolBroke', ({ item }) => { this.toast(`${ITEMS[item].label} broke!`, 'warn'); SFX.toolBreak(); });
    on('questStarted', ({ quest }) => { this.toast(`Quest started: ${quest.name}`, 'gold'); this.renderQuestTracker(); });
    on('questCompleted', ({ quest }) => { this.toast(`Quest complete: ${quest.name}`, 'gold'); SFX.questDone(); this.renderQuestTracker(); });
    on('questChanged', () => { this.renderQuestTracker(); if (this.currentWindow === 'quests') this.renderWindowBody(); });
    on('questStageAdvanced', ({ stage }) => this.toast(`Next: ${stage.text}`, 'gold'));
    on('questRewardsBlocked', () => this.toast('Quest reward waiting — make room in your pack!', 'warn'));
    on('combatLog', () => this.renderCombatLog());
    on('combatUpdate', () => this.renderCombat());
    on('combatBanner', (text) => this.showBanner(text));
    on('combatStart', () => { this.combatMode = null; this.inspectMode = false; });
    on('nodeRespawned', () => SFX.respawnNode());
    // classic (RuneScape-style) combat
    on('rsEngaged', () => { $('rs-ui').classList.remove('hidden'); this.rsLogLines = []; this.renderRS(); });
    on('rsCombatOver', () => { $('rs-ui').classList.add('hidden'); });
    on('rsUpdate', () => this.renderRS());
    on('rsLog', (text) => {
      this.rsLogLines = this.rsLogLines || [];
      this.rsLogLines.push(text);
      if (this.rsLogLines.length > 6) this.rsLogLines.shift();
      $('rs-log').innerHTML = this.rsLogLines.map((l) => `<div class="rs-line">${l}</div>`).join('');
    });
    on('rsAttack', () => SFX.swing());
  }

  // ---- classic combat panel ----
  renderRS() {
    const rs = this.game.combatRS;
    if (!rs || !rs.active) return;
    const t = rs.target;
    if (t && t.hp > 0) {
      $('rs-target-name').textContent = `${t.def.label}${t.enraged ? ' (enraged!)' : ''}`;
      $('rs-target').style.display = '';
      $('rs-target-hp-fill').style.width = `${Math.max(0, (t.hp / t.def.hp)) * 100}%`;
    } else {
      $('rs-target').style.display = 'none';
    }
    $('rs-styles').innerHTML = rs.availableStyles().map((id) => {
      const st = RS_STYLES[id];
      return `<button class="rs-btn ${rs.style === id ? 'active' : ''}" data-style="${id}" title="${st.desc}">${icon(st.icon, 14)} ${st.label}</button>`;
    }).join('');
    $('rs-specials').innerHTML = rs.availableSpecials().map((sp) => {
      const cost = sp.energy ? `${icon('bolt', 11)}${sp.energy}` : sp.mana ? `${icon('sparkle', 11)}${sp.mana}` : '';
      return `<button class="rs-btn" data-special="${sp.id}" title="${sp.desc}">
        ${icon(sp.icon, 14)} ${sp.label}<span class="rs-sub">${cost}</span>
        ${sp.cdLeft > 0.1 ? `<span class="rs-cd">${Math.ceil(sp.cdLeft)}</span>` : ''}
      </button>`;
    }).join('');
    $('rs-styles').querySelectorAll('[data-style]').forEach((b) => {
      b.addEventListener('click', () => { rs.style = b.dataset.style; SFX.uiClick(); this.renderRS(); });
    });
    $('rs-specials').querySelectorAll('[data-special]').forEach((b) => {
      b.addEventListener('click', () => { rs.useSpecial(b.dataset.special); SFX.uiClick(); });
    });
  }

  // cooldown numbers tick down without full re-render
  refreshRSCooldowns() {
    const rs = this.game.combatRS;
    if (!rs?.active) return;
    $('rs-specials').querySelectorAll('[data-special]').forEach((b) => {
      const sp = rs.availableSpecials().find((s) => s.id === b.dataset.special);
      const cd = b.querySelector('.rs-cd');
      if (!sp) return;
      if (sp.cdLeft > 0.1) {
        if (cd) cd.textContent = Math.ceil(sp.cdLeft);
        else b.insertAdjacentHTML('beforeend', `<span class="rs-cd">${Math.ceil(sp.cdLeft)}</span>`);
      } else if (cd) cd.remove();
    });
    const t = rs.target;
    if (t && t.hp > 0) $('rs-target-hp-fill').style.width = `${Math.max(0, (t.hp / t.def.hp)) * 100}%`;
  }

  updateHitsplats(splats) {
    if (!this.splatPool) this.splatPool = new Map();
    const seen = new Set();
    for (const s of splats) {
      seen.add(s.id);
      let el = this.splatPool.get(s.id);
      if (!el) {
        el = document.createElement('div');
        el.className = 'hitsplat';
        el.textContent = s.text;
        el.style.color = s.color;
        $('hud').appendChild(el);
        this.splatPool.set(s.id, el);
      }
      const pr = this.game.renderer.project(s.x, s.y, s.z);
      if (!pr) { el.style.display = 'none'; continue; }
      el.style.display = '';
      el.style.left = `${pr[0] + s.jx}px`;
      el.style.top = `${pr[1]}px`;
    }
    for (const [id, el] of this.splatPool) {
      if (!seen.has(id)) { el.remove(); this.splatPool.delete(id); }
    }
  }

  // ------------------------------------------------------------ HUD
  renderVitals() {
    const p = this.game.player;
    // change-detect each field: DOM writes force style/layout recalc, so writing
    // ~15 unchanged properties every frame was pure main-thread cost. Only touch
    // the DOM when the displayed value actually changes.
    const vc = this._vitalCache || (this._vitalCache = {});
    const set = (key, el, prop, val) => { if (vc[key] !== val) { vc[key] = val; el[prop] = val; } };
    set('hpw', $('hp-fill').style, 'width', `${(p.hp / p.maxHp) * 100}%`);
    set('hpt', $('hp-text'), 'textContent', `HP ${Math.ceil(p.hp)}/${p.maxHp}`);
    set('enw', $('energy-fill').style, 'width', `${(p.energy / p.maxEnergy) * 100}%`);
    set('ent', $('energy-text'), 'textContent', `STA ${Math.floor(p.energy)}`);
    // real-world play has no magic — the mana bar stays hidden
    if (!vc.manaHidden) { vc.manaHidden = true; $('mana-fill').parentElement.style.display = 'none'; }
    // hydration bar (lazily created; always shown in real-world play)
    let hyb = $('hydration-bar');
    if (!hyb) {
      hyb = document.createElement('div');
      hyb.id = 'hydration-bar';
      hyb.className = 'vital-bar hydration';
      hyb.innerHTML = '<div class="vital-fill" id="hydration-fill"></div><span id="hydration-text"></span>';
      $('vitals').appendChild(hyb);
    }
    $('hydration-fill').style.width = `${p.hydration}%`;
    $('hydration-text').textContent = `H2O ${Math.floor(p.hydration)}`;
    // open-wound indicator: only while bleeding, warns to bandage
    let bl = $('bleed-tag');
    if (p.bleeding > 0) {
      if (!bl) {
        bl = document.createElement('div');
        bl.id = 'bleed-tag';
        bl.className = 'vital-tag bleed';
        $('vitals').appendChild(bl);
      }
      bl.textContent = `Bleeding — ${Math.ceil(p.bleeding)}s`;
    } else if (bl) bl.remove();
    // body-temperature warning (only when outside the comfort band)
    let tt = $('temp-tag');
    if (p.tempState && p.tempState !== 'ok') {
      if (!tt) {
        tt = document.createElement('div');
        tt.id = 'temp-tag';
        $('vitals').appendChild(tt);
      }
      const labels = { cold: 'Cold', hypothermia: 'Hypothermia', hot: 'Overheating', heatstroke: 'Heatstroke' };
      const cold = p.tempState === 'cold' || p.tempState === 'hypothermia';
      const severe = p.tempState === 'hypothermia' || p.tempState === 'heatstroke';
      tt.textContent = labels[p.tempState] || '';
      tt.className = `vital-tag temp ${cold ? 'cold' : 'hot'}${severe ? ' severe' : ''}`;
    } else if (tt) tt.remove();
    // nutrition status (only when notably well-fed or malnourished)
    let nutt = $('nut-tag');
    const nutLabel = p.malnourished ? 'Malnourished' : p.wellFed ? 'Well-fed' : null;
    if (nutLabel) {
      if (!nutt) {
        nutt = document.createElement('div');
        nutt.id = 'nut-tag';
        $('vitals').appendChild(nutt);
      }
      nutt.textContent = nutLabel;
      nutt.className = `vital-tag nut ${p.malnourished ? 'bad' : 'good'}`;
    } else if (nutt) nutt.remove();
    // environment badge under the minimap: time-of-day (sun/moon) + weather + season
    const wsys = this.game.weather;
    if (wsys) {
      let eb = $('env-badge');
      if (!eb) {
        eb = document.createElement('div');
        eb.id = 'env-badge';
        $('hud').appendChild(eb);
      }
      const wd = wsys.def();
      const dot = wd.tint ? `rgb(${wd.tint.map((v) => Math.round(v * 255)).join(',')})` : '#ffd98a';
      const phase = this.dayPhaseLabel();
      const night = phase === 'Night';
      const key = `${phase}|${wd.label}|${wsys.season}|${dot}`;
      if (this._envKey !== key) { // only touch the DOM when it actually changes
        this._envKey = key;
        // Parts are wrapped in spans so narrow phones can drop the redundant
        // phase word (the sun/moon icon already reads day vs night) and keep the
        // badge compact enough to sit clear of the vitals and minimap.
        eb.innerHTML = `<canvas class="env-tod" width="18" height="18"></canvas>`
          + `<span class="env-phase">${phase}</span><span class="env-sep">·</span>`
          + `<span class="env-dot" style="background:${dot}"></span>`
          + `<span class="env-weather">${wd.label}</span>`
          + `<span class="env-sep">·</span><span class="env-season">${wsys.season}</span>`;
        this.drawTimeOfDay(eb.querySelector('.env-tod'), night);
      }
    }
    // breath bar only surfaces while diving (or catching your breath)
    let bb = $('breath-bar');
    if (p.air < p.maxAir - 0.05) {
      if (!bb) {
        bb = document.createElement('div');
        bb.id = 'breath-bar';
        bb.className = 'vital-bar breath';
        bb.innerHTML = '<div class="vital-fill" id="breath-fill"></div><span id="breath-text"></span>';
        $('vitals').appendChild(bb);
      }
      $('breath-fill').style.width = `${(p.air / p.maxAir) * 100}%`;
      $('breath-text').textContent = p.air <= 0 ? 'DROWNING!' : `AIR ${Math.ceil(p.air)}`;
    } else if (bb) bb.remove();
  }

  renderHotbar() {
    const inv = this.game.inventory;
    const bar = $('hotbar');
    if (bar.childElementCount !== HOTBAR_SIZE) {
      bar.innerHTML = '';
      for (let i = 0; i < HOTBAR_SIZE; i++) {
        const el = document.createElement('div');
        el.className = 'hotbar-slot';
        el.addEventListener('click', () => {
          const s = inv.slots[i];
          const def = s ? ITEMS[s.item] : null;
          // in classic combat, clicking food eats it (RuneScape-style)
          if (this.game.combatRS?.active && def && (def.type === 'food' || def.type === 'potion')) {
            this.game.useItem(i);
          } else {
            inv.selected = i;
          }
          this.renderHotbar();
        });
        bar.appendChild(el);
      }
    }
    for (let i = 0; i < HOTBAR_SIZE; i++) {
      const el = bar.children[i];
      const s = inv.slots[i];
      el.classList.toggle('selected', inv.selected === i);
      el.title = s ? itemTitle(s.item) : '';
      let html = `<span class="key">${i + 1}</span>`;
      if (s) {
        const def = ITEMS[s.item];
        html += itemIconHTML(s.item, null, s.gem);
        if (s.qty > 1) html += `<span class="qty">${s.qty}</span>`;
        if (s.dur != null && def.dur) {
          html += `<span class="dur"><div style="width:${(s.dur / def.dur) * 100}%"></div></span>`;
        }
      }
      el.innerHTML = html;
    }
  }

  toast(text, cls = '') {
    const t = document.createElement('div');
    t.className = `toast ${cls}`;
    t.textContent = text;
    $('toasts').appendChild(t);
    setTimeout(() => t.remove(), 2600);
    while ($('toasts').childElementCount > 6) $('toasts').firstChild.remove();
    if (cls === 'xp') SFX.xp();
  }

  renderQuestTracker() {
    const el = $('quest-tracker');
    const act = this.game.quests.active();
    if (!act.length) { el.innerHTML = '<div class="qt-name">No active quest</div><div class="qt-progress">Talk to Maren at the camp</div>'; return; }
    const q = act[0];
    const stage = this.game.quests.currentStage(q);
    const prog = this.game.quests.stageProgressText(q);
    el.innerHTML = `<div class="qt-name">${q.name}</div>
      <div class="qt-obj">${stage ? stage.text : ''}</div>
      ${prog ? `<div class="qt-progress">${prog}</div>` : ''}`;
  }

  setPrompt(text) {
    const el = $('interact-prompt');
    if (!text) { el.classList.add('hidden'); return; }
    el.classList.remove('hidden');
    el.textContent = text;
  }

  setGatherProgress(frac, label) {
    const el = $('gather-progress');
    if (frac == null) { el.classList.add('hidden'); return; }
    el.classList.remove('hidden');
    $('gather-fill').style.width = `${frac * 100}%`;
    $('gather-label').textContent = label || '';
  }

  // ---- kids' Learning Mode (Phase 1) -------------------------------------
  // Persistent prompt panel for the current lesson. Passing null clears it.
  showLessonPrompt(lesson) {
    let el = $('lesson-panel');
    if (!lesson) { el?.remove(); return; }
    if (!el) {
      el = document.createElement('div');
      el.id = 'lesson-panel';
      document.body.appendChild(el);
    }
    const guide = NPC_DEFS[lesson.guide]?.label || 'Pip';
    el.innerHTML = `<div class="lesson-guide"></div><div class="lesson-prompt"></div><button class="lesson-hint">Need a hint?</button>`;
    el.querySelector('.lesson-guide').textContent = `${guide} says`;
    el.querySelector('.lesson-prompt').textContent = lesson.prompt;
    el.querySelector('.lesson-hint').addEventListener('click', () => {
      SFX.uiClick();
      this.game.lessons.showHint(lesson.area);
    });
  }

  showLessonSuccess(lesson, { granted = 0, paid = null } = {}) {
    this.toast(lesson.success, 'gold');
    SFX.questDone();
    // What they actually earned, in that order: the minutes are the point of
    // the mode, and the coins are the thing a child cares about.
    const earned = [];
    if (granted > 0) earned.push(`${granted} minutes of play`);
    for (const [item, qty] of paid || []) earned.push(`${qty} × ${ITEMS[item]?.name || item}`);
    if (earned.length) this.toast(`You earned ${earned.join(', ')}!`, 'gold');
    // a burst of gold sparkles over the work mat
    const m = this.game.lessons?.room?.(lesson.id)?.mat || this.game.world?.markers?.learnMat;
    if (m && this.game.renderer?.spawnParticles) {
      const cx = (m.x0 + m.x1) / 2 + 0.5, cz = (m.z0 + m.z1) / 2 + 0.5;
      this.game.renderer.spawnParticles(cx, m.y0 + 0.6, cz, [1, 0.85, 0.3], 30, 3, 1.0, 0.12);
    }
  }

  showLessonHint(lesson) { this.toast(lesson.hint, ''); }

  drawCompass() {
    // the compass depends only on heading — skip the full clear+redraw when the
    // yaw hasn't moved (rounded to ~0.3°), which is most frames while standing
    const yaw = this.game.player.yaw;
    if (this._lastCompassYaw !== undefined && Math.abs(yaw - this._lastCompassYaw) < 0.005) return;
    this._lastCompassYaw = yaw;
    const canvas = $('compass');
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = "11px 'Silkscreen', monospace";
    ctx.textAlign = 'center';
    const dirs = [['N', 0], ['E', Math.PI / 2], ['S', Math.PI], ['W', -Math.PI / 2]];
    // heading: yaw 0 → -Z (north)
    for (const [label, ang] of dirs) {
      let rel = ang - (-this.game.player.yaw);
      while (rel > Math.PI) rel -= Math.PI * 2;
      while (rel < -Math.PI) rel += Math.PI * 2;
      const x = canvas.width / 2 + (rel / (Math.PI / 2)) * 60;
      if (x > 4 && x < canvas.width - 4) {
        ctx.fillStyle = label === 'N' ? '#e2b13c' : '#cfcdc4';
        ctx.fillText(label, x, 20);
      }
    }
    // heading pointer
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2 - 4, 2);
    ctx.lineTo(canvas.width / 2 + 4, 2);
    ctx.lineTo(canvas.width / 2, 7);
    ctx.closePath();
    ctx.fill();
    // (time-of-day sun/moon lives in the environment badge under the minimap now)
  }

  // Dawn / Day / Dusk / Night from the world clock, matching the daylight ramps.
  dayPhaseLabel() {
    const t = this.game.world.dayPhase();
    if (t < 0.42) return 'Day';
    if (t < 0.52) return 'Dusk';
    if (t < 0.90) return 'Night';
    return 'Dawn';
  }

  // Paint the little sun (day) or crescent moon (night) into a tiny canvas —
  // the day/night indicator that used to sit on the compass.
  drawTimeOfDay(canvas, night) {
    const ctx = canvas.getContext('2d');
    const cx = canvas.width / 2, cy = canvas.height / 2, rad = Math.min(cx, cy) - 1;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = night ? '#c8d2e8' : '#ffd76a';
    ctx.beginPath();
    ctx.arc(cx, cy, rad, 0, Math.PI * 2);
    ctx.fill();
    if (night) { // bite out a crescent
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      ctx.arc(cx - rad * 0.55, cy - rad * 0.2, rad * 0.9, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else { // a few rays for the sun
      ctx.strokeStyle = '#ffd76a';
      ctx.lineWidth = 1;
      for (let a = 0; a < 8; a++) {
        const ang = (a / 8) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(ang) * (rad + 1), cy + Math.sin(ang) * (rad + 1));
        ctx.lineTo(cx + Math.cos(ang) * (rad + 2.5), cy + Math.sin(ang) * (rad + 2.5));
        ctx.stroke();
      }
    }
  }

  // average top-tile color per block id, sampled from the procedural atlas —
  // so the map shows the same materials the world renders
  blockMapColors() {
    if (this._mapColors) return this._mapColors;
    const atlas = getAtlasCanvas();
    const actx = atlas.getContext('2d');
    this._mapColors = BLOCKS.map((def) => {
      if (!def || def.name === 'air') return null;
      const uv = faceUV(def, 'top');
      const x = Math.round(uv.u0 * atlas.width), y = Math.round(uv.v0 * atlas.height);
      const w = Math.max(1, Math.round((uv.u1 - uv.u0) * atlas.width));
      const h = Math.max(1, Math.round((uv.v1 - uv.v0) * atlas.height));
      const data = actx.getImageData(x, y, w, h).data;
      let r = 0, g = 0, b = 0, n = 0;
      for (let i = 0; i < data.length; i += 16) {
        if (data[i + 3] < 40) continue;
        r += data[i]; g += data[i + 1]; b += data[i + 2]; n++;
      }
      return n ? [r / n, g / n, b / n] : [120, 120, 120];
    });
    return this._mapColors;
  }

  // A chunk's map tile: real top-down blocks (trees, paths, buildings, water)
  // for loaded chunks; the terrain generator's guess for unloaded ones.
  chunkTileCanvas(cx, cz) {
    const key = `${cx},${cz}`;
    const world = this.game.world;
    const chunk = world.getChunk(cx, cz);
    const stamp = chunk ? (chunk.mapStamp || 0) : -1;
    const cached = this.minimapTiles.get(key);
    if (cached && cached.stamp === stamp && cached.live === !!chunk) return cached.canvas;
    const c = document.createElement('canvas');
    c.width = CHUNK; c.height = CHUNK;
    const ctx = c.getContext('2d');
    const img = ctx.createImageData(CHUNK, CHUNK);
    if (chunk) {
      const colors = this.blockMapColors();
      for (let lz = 0; lz < CHUNK; lz++) {
        for (let lx = 0; lx < CHUNK; lx++) {
          const wx = cx * CHUNK + lx, wz = cz * CHUNK + lz;
          let rgb = [16, 20, 26], topY = 0;
          for (let y = Math.min(WORLD_H - 1, chunk.contentTop ?? WORLD_H - 1); y >= 0; y--) {
            const id = world.getBlock(wx, y, wz);
            if (id === B.air) continue;
            rgb = colors[id] || [120, 120, 120];
            topY = y;
            break;
          }
          const shade = 0.72 + ((topY - 24) / 36) * 0.5;
          const i = (lz * CHUNK + lx) * 4;
          img.data[i] = rgb[0] * shade;
          img.data[i + 1] = rgb[1] * shade;
          img.data[i + 2] = rgb[2] * shade;
          img.data[i + 3] = 255;
        }
      }
    } else {
      const gen = world.gen;
      for (let lz = 0; lz < CHUNK; lz++) {
        for (let lx = 0; lx < CHUNK; lx++) {
          const wx = cx * CHUNK + lx, wz = cz * CHUNK + lz;
          const h = gen.heightAt(wx, wz);
          const biome = gen.biomeAt(wx, wz, h);
          let rgb;
          if (h <= 28) rgb = [52, 88, 148];
          else if (biome.surface === 'sand') rgb = [214, 196, 138];
          else if (biome.surface === 'snow') rgb = [236, 242, 248];
          else if (biome.surface === 'snow_grass') rgb = [222, 230, 236];
          else if (biome.surface === 'gravel') rgb = [150, 142, 132];
          else if (biome.surface === 'stone') rgb = [128, 130, 134];
          else if (biome.surface === 'ashen_soil') rgb = [90, 84, 80];
          else if (biome.surface === 'corrupt_soil') rgb = [92, 70, 104];
          else rgb = [86, 140, 70];
          const shade = 0.75 + ((h - 24) / 36) * 0.5;
          const i = (lz * CHUNK + lx) * 4;
          img.data[i] = rgb[0] * shade;
          img.data[i + 1] = rgb[1] * shade;
          img.data[i + 2] = rgb[2] * shade;
          img.data[i + 3] = 255;
        }
      }
    }
    ctx.putImageData(img, 0, 0);
    this.minimapTiles.set(key, { canvas: c, stamp, live: !!chunk });
    return c;
  }

  drawMinimap() {
    const canvas = $('minimap');
    const ctx = canvas.getContext('2d');
    const p = this.game.player;
    const scale = 1.4; // px per block
    ctx.fillStyle = '#101318';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const half = canvas.width / 2;
    const pcx = Math.floor(p.x / CHUNK), pcz = Math.floor(p.z / CHUNK);
    ctx.imageSmoothingEnabled = false;
    // Round each tile's edges — AND the next tile's edge — to whole pixels so
    // neighbours share an exact boundary. Drawing at fractional coords/size left
    // 1px seams between chunks (the "grid lines" on the map).
    for (let dz = -4; dz <= 4; dz++) {
      for (let dx = -4; dx <= 4; dx++) {
        const cx = pcx + dx, cz = pcz + dz;
        if (!this.game.discovered.has(`${cx},${cz}`)) continue;
        const tile = this.chunkTileCanvas(cx, cz);
        const x0 = Math.round(half + (cx * CHUNK - p.x) * scale);
        const y0 = Math.round(half + (cz * CHUNK - p.z) * scale);
        const x1 = Math.round(half + ((cx + 1) * CHUNK - p.x) * scale);
        const y1 = Math.round(half + ((cz + 1) * CHUNK - p.z) * scale);
        ctx.drawImage(tile, x0, y0, x1 - x0, y1 - y0);
      }
    }
    // quest / travel markers (clamped to the minimap edge when far away)
    const dot = (wx, wz, fill = '#e2b13c', r = 4, clamp = true) => {
      const mx = half + (wx - p.x) * scale, mz = half + (wz - p.z) * scale;
      if (!clamp && (mx < 2 || mx > canvas.width - 2 || mz < 2 || mz > canvas.height - 2)) return;
      const cx2 = clamp ? Math.max(6, Math.min(canvas.width - 6, mx)) : mx;
      const cz2 = clamp ? Math.max(6, Math.min(canvas.height - 6, mz)) : mz;
      ctx.fillStyle = fill;
      ctx.beginPath();
      ctx.arc(cx2, cz2, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#000'; ctx.stroke();
    };
    // discovered waystones, unclamped — a travel point you can actually see
    for (const ws of this.game.waystones.list()) dot(ws.x, ws.z, '#7ec4f2', 3, false);
    const mk = this.game.quests.trackedMarker(this.game.world.markers);
    if (mk) dot(mk.pos[0], mk.pos[2]);
    if (this.game.travelDest) dot(this.game.travelDest[0], this.game.travelDest[2]);
    // player arrow
    ctx.save();
    ctx.translate(half, half);
    ctx.rotate(-p.yaw);
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.moveTo(0, -6); ctx.lineTo(4, 5); ctx.lineTo(-4, 5);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  // ------------------------------------------------------------ windows
  toggleWindow(name) {
    if (this.currentWindow === name) { this.closeWindow(); return; }
    // window shortcuts may close but never open windows during tactical battles
    if (this.game.combat.active && !this.currentWindow) return;
    this.openWindow(name);
  }

  openWindow(name) {
    this.currentWindow = name;
    this.shopNpc = null;
    this.chestId = null;
    $('window-root').classList.remove('hidden');
    this.game.onWindowOpened();
    this.renderTabs();
    this.renderWindowBody();
    SFX.uiOpen();
  }

  closeWindow() {
    if (!this.currentWindow) return;
    this.currentWindow = null;
    this.shopNpc = null;
    this.chestId = null;
    $('window-root').classList.add('hidden');
    this.game.onWindowClosed();
  }

  renderTabs() {
    const tabs = [
      ['inventory', 'bag', 'Inventory'], ['skills', 'chart', 'Skills'], ['crafting', 'hammer', 'Crafting'],
      ['quests', 'scroll', 'Quests'], ['map', 'mapicon', 'Map'], ['settings', 'gear', 'Settings'],
    ];
    // Lessons are picked from here, not walked to. Only in Learning Mode: a tab
    // that does nothing for most players is worse than no tab.
    if (this.game.education?.isEducation) tabs.splice(3, 0, ['lessons', 'lessons', 'Lessons']);
    $('window-tabs').innerHTML = tabs.map(([id, ic, label]) =>
      `<button class="win-tab ${this.currentWindow === id ? 'active' : ''}" data-tab="${id}">${icon(ic, 14)} ${label}</button>`).join('');
    $('window-tabs').querySelectorAll('.win-tab').forEach((b) => {
      b.addEventListener('click', () => { this.currentWindow = b.dataset.tab; this.shopNpc = null; this.chestId = null; this.renderTabs(); this.renderWindowBody(); });
    });
  }

  renderWindowBody() {
    const body = $('window-body');
    if (this.shopNpc) return this.renderShop(body);
    if (this.chestId) return this.renderChest(body);
    switch (this.currentWindow) {
      case 'inventory': return this.renderInventory(body);
      case 'skills': return this.renderSkills(body);
      case 'crafting': return this.renderCrafting(body);
      case 'quests': return this.renderQuests(body);
      case 'map': return this.renderMap(body);
      case 'lessons': return this.renderLessons(body);
      case 'settings': return this.renderSettings(body);
    }
  }

  // ---- lessons ----
  // The whole of Learning Mode's navigation. Pick a lesson and you are IN it —
  // its own world, straight away. Nothing here asks the child to walk anywhere,
  // find anybody or remember where the classroom was.
  renderLessons(body) {
    const g = this.game;
    const runner = g.lessons;
    const inLesson = !!g.world?.lessonRoom && g.world.lessonRoom !== null;
    const mins = g.education.balanceMinutes();

    let html = `<h3 style="color:var(--gold);margin-bottom:4px">Lessons</h3>
      <div style="color:var(--ink-dim);font-size:12px;margin-bottom:12px">
        You have <b style="color:var(--gold)">${mins} minutes</b> of play banked.
        Finishing a lesson earns more, plus coins and supplies that stay with you.
      </div>`;

    if (inLesson) {
      html += `<div class="lesson-here" style="border:1px solid var(--gold);border-radius:6px;padding:10px;margin-bottom:14px">
        <div style="color:var(--gold);font-weight:700;margin-bottom:6px">You are in a lesson</div>
        <div style="color:var(--ink-dim);font-size:12px;margin-bottom:8px">Leaving keeps your place — you can come straight back to it.</div>
        <button class="link-btn" data-leave="1">Leave the lesson</button>
      </div>`;
    }

    for (const l of LESSONS_DATA) {
      const done = runner.isPassed(l.id);
      const active = runner.current[l.area] === l.id;
      const r = l.reward || {};
      const pay = [`${l.minutes} min`];
      if (r.coins) pay.push(`${r.coins} coins`);
      for (const [item, qty] of r.items || []) pay.push(`${qty} × ${ITEMS[item]?.name || item}`);
      html += `<div class="lesson-row" style="border:1px solid var(--line);border-radius:6px;padding:10px;margin-bottom:8px;${active ? 'border-color:var(--gold)' : ''}">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px">
          <div style="font-weight:700">${done ? '✓ ' : ''}${l.prompt}</div>
          <button class="link-btn" data-start="${l.id}">${active ? 'Resume' : done ? 'Again' : 'Start'}</button>
        </div>
        <div style="color:var(--ink-dim);font-size:11px;margin-top:4px">Earns ${pay.join(' · ')}</div>
      </div>`;
    }
    body.innerHTML = html;

    body.querySelectorAll('[data-start]').forEach((b) => b.addEventListener('click', () => {
      const id = b.dataset.start;
      const lesson = runner.byId.get(id);
      if (!lesson) return;
      this.closeWindow();                 // you are going somewhere; the menu is done
      runner.setLesson(lesson.area, id);
    }));
    body.querySelectorAll('[data-leave]').forEach((b) => b.addEventListener('click', () => {
      this.closeWindow();
      for (const area of Object.keys(runner.current)) runner.leave(area);
    }));
  }

  // ---- inventory ----
  renderInventory(body) {
    const inv = this.game.inventory;
    const est = inv.equipStats();
    const skills = this.game.skills;
    let grid = '';
    for (let i = 0; i < INV_SIZE; i++) {
      const s = inv.slots[i];
      const def = s ? ITEMS[s.item] : null;
      grid += `<div class="inv-slot ${i < HOTBAR_SIZE ? 'hotbar-mark' : ''} ${this.selectedInvSlot === i ? 'selected' : ''}" data-idx="${i}" title="${s ? itemTitle(s.item).replace(/"/g, '&quot;') : ''}">
        ${s ? itemIconHTML(s.item, null, s.gem) : ''}
        ${s && s.qty > 1 ? `<span class="qty">${s.qty}</span>` : ''}
        ${s && s.dur != null && def.dur ? `<span class="dur"><div style="width:${(s.dur / def.dur) * 100}%"></div></span>` : ''}
      </div>`;
    }
    let equip = '';
    for (const slot of EQUIP_SLOTS) {
      const e = inv.equipment[slot];
      equip += `<div class="equip-row">
        <span class="eq-label">${EQUIP_LABELS[slot]}</span>
        <div class="eq-slot" data-eq="${slot}" title="${e ? itemTitle(e.item).replace(/"/g, '&quot;') : 'Empty'}">${e ? itemIconHTML(e.item, null, e.gem) : ''}</div>
        <span class="eq-item">${e ? ITEMS[e.item].label : '—'}</span>
      </div>`;
    }
    const sel = this.selectedInvSlot != null ? inv.slots[this.selectedInvSlot] : null;
    const selDef = sel ? ITEMS[sel.item] : null;
    let actions = '<div class="item-actions"><span class="ia-desc">Select an item…</span></div>';
    if (selDef) {
      const canUse = selDef.type === 'food' || selDef.type === 'potion' || sel.item === 'waterlogged_cache';
      const canEquip = ['weapon', 'armor', 'accessory', 'utility'].includes(selDef.type);
      const statline = ['atk', 'acc', 'crit', 'armor', 'evasion', 'speed', 'magic', 'magicResist', 'mana', 'hp', 'block', 'heal']
        .filter((k) => selDef[k]).map((k) => `${k} ${selDef[k] > 0 ? '+' : ''}${selDef[k]}`).join(' · ');
      // gem socketing for gear (weapons + armour/accessories): show the set gem's
      // power, or offer to socket one
      let socketHTML = '';
      if (['weapon', 'armor', 'accessory'].includes(selDef.type)) {
        const cap = (s) => s.replace(/\b\w/g, (c) => c.toUpperCase());
        const kind = selDef.type === 'weapon' ? 'weapon' : 'armor';
        if (sel.gem) {
          socketHTML = `<div class="ia-socket">◆ ${cap(sel.gem)}: ${socketDesc(sel.gem, kind)} <button data-act="unsocket">Remove gem</button></div>`;
        } else {
          const gems = SOCKETABLE_GEMS.filter((g) => inv.count(g) > 0);
          socketHTML = gems.length
            ? `<div class="ia-socket">Socket a gem: ${gems.map((g) => `<button class="ia-gem" data-socket="${g}" title="${socketDesc(g, kind)}">${itemIconHTML(g, 14)} ${cap(g)}</button>`).join(' ')}</div>`
            : '<div class="ia-socket ia-dim">◇ Empty socket — cut a gem to set a power into this gear.</div>';
        }
      }
      actions = `<div class="item-actions">
        <span class="ia-name">${selDef.label}</span>
        <div class="ia-desc">${selDef.desc || ''} ${statline ? `<br>${statline}` : ''} ${selDef.gather ? `· +${Math.round(selDef.gather * 100)}% gathering` : ''}</div>
        ${socketHTML}
        ${canUse ? '<button data-act="use">Use</button>' : ''}
        ${canEquip ? '<button data-act="equip">Equip</button>' : ''}
        <button data-act="drop">Drop</button>
      </div>`;
    }
    body.innerHTML = `<div class="inv-layout">
      <div style="flex:1;min-width:300px">
        <div style="margin-bottom:8px;color:var(--gold)">${icon('coin', 14)} ${inv.coins} coins</div>
        <div class="inv-grid">${grid}</div>
        ${actions}
      </div>
      <div class="equip-panel">
        <h3 style="color:var(--gold);font-size:14px;margin-bottom:8px">Equipment</h3>
        ${equip}
        <div class="stat-block">
          Armor ${est.armor} · Evasion ${est.evasion} · Crit +${est.crit}%<br>
          Speed ${est.speed >= 0 ? '+' : ''}${est.speed} · Magic +${est.magic} · Block ${est.block}%<br>
          Max HP ${30 + skills.level('vitality') * 2 + est.hp} · Gathering +${Math.round(est.gather * 100)}%
        </div>
      </div>
    </div>`;
    body.querySelectorAll('.inv-slot').forEach((el) => {
      el.addEventListener('click', () => {
        const idx = parseInt(el.dataset.idx, 10);
        if (this.selectedInvSlot != null && this.selectedInvSlot !== idx && inv.slots[this.selectedInvSlot]) {
          inv.moveSlot(this.selectedInvSlot, idx);
          this.selectedInvSlot = null;
        } else {
          this.selectedInvSlot = this.selectedInvSlot === idx ? null : idx;
        }
        this.renderWindowBody();
      });
    });
    body.querySelectorAll('.eq-slot').forEach((el) => {
      el.addEventListener('click', () => { inv.unequip(el.dataset.eq); this.renderWindowBody(); });
    });
    body.querySelectorAll('[data-act]').forEach((b) => {
      b.addEventListener('click', () => {
        const idx = this.selectedInvSlot;
        if (idx == null) return;
        const act = b.dataset.act;
        if (act === 'use') this.game.useItem(idx);
        else if (act === 'equip') {
          const wasWeapon = ITEMS[inv.slots[idx].item]?.type === 'weapon';
          if (inv.equipFromSlot(idx) && wasWeapon) emit('equippedWeapon', {});
        }
        else if (act === 'drop') inv.removeSlot(idx, inv.slots[idx]?.qty || 1);
        else if (act === 'unsocket') { const r = inv.unsocketGem(idx); if (!r.ok) this.toast(r.reason); this.renderWindowBody(); return; }
        this.selectedInvSlot = null;
        this.renderWindowBody();
      });
    });
    body.querySelectorAll('[data-socket]').forEach((b) => {
      b.addEventListener('click', () => {
        const idx = this.selectedInvSlot;
        if (idx == null) return;
        const r = this.game.inventory.socketGem(idx, b.dataset.socket);
        if (!r.ok) this.toast(r.reason); else emit('equippedWeapon', {});
        this.renderWindowBody();
      });
    });
  }

  // ---- skills ----
  renderSkills(body) {
    const skills = this.game.skills;
    const ORDER = ['Gathering', 'Processing', 'Survival', 'Combat', 'Knowledge'];
    const groups = {};
    for (const g of ORDER) groups[g] = [];
    for (const [key, def] of Object.entries(SKILL_DEFS)) {
      if (def.frontier) continue; // no magic in real-world play
      (groups[def.group] ||= []).push(key);
    }
    let html = `<div style="margin-bottom:10px;color:var(--ink-dim)">Total level: <b style="color:var(--gold)">${skills.totalLevel()}</b></div><div class="skill-groups">`;
    for (const [group, keys] of Object.entries(groups)) {
      if (!keys.length) continue;
      html += `<div class="skill-group"><h3>${group}</h3><div class="skill-grid">`;
      for (const key of keys) {
        const def = SKILL_DEFS[key];
        const lvl = skills.level(key);
        html += `<div class="skill-card ${this.selectedSkill === key ? 'selected' : ''}" data-skill="${key}">
          <div class="sk-head"><span>${skillIcon(key, 14)} ${def.label}</span><span class="sk-lvl">${lvl}</span></div>
          <div class="sk-bar"><div style="width:${skills.progress(key) * 100}%"></div></div>
        </div>`;
      }
      html += '</div></div>';
    }
    html += '</div>';
    const sel = this.selectedSkill;
    if (sel) {
      const def = SKILL_DEFS[sel];
      const lvl = skills.level(sel);
      const xp = skills.xp[sel];
      const next = lvl < 99 ? xpForLevel(lvl + 1) - xp : 0;
      html += `<div class="skill-detail" style="margin-top:14px">
        <h3>${skillIcon(sel, 16)} ${def.label} — Level ${lvl}</h3>
        <div class="sd-desc">${def.desc}<br>XP: ${xp.toLocaleString()}${lvl < 99 ? ` · ${next.toLocaleString()} to level ${lvl + 1}` : ' · MAX'}</div>
        ${(SKILL_UNLOCKS[sel] || []).map(([ulvl, text]) =>
          `<div class="unlock-row ${lvl >= ulvl ? 'unlocked' : 'locked'}"><span class="ul-lvl">Lv ${ulvl}</span><span>${text}</span></div>`).join('')}
      </div>`;
    }
    body.innerHTML = html;
    body.querySelectorAll('.skill-card').forEach((el) => {
      el.addEventListener('click', () => { this.selectedSkill = el.dataset.skill; this.renderWindowBody(); });
    });
  }

  // ---- crafting ----
  renderCrafting(body) {
    const g = this.game;
    const stations = g.nearbyStations();
    const discovered = g.discoveredItems;
    const groups = new Map();
    const firearmsAllowed = g.education.firearmsAllowed;
    for (const rec of RECIPES) {
      if (rec.discover && !discovered.has(rec.discover)) continue;
      if (rec.educationLocked && !firearmsAllowed) continue; // hide the black-powder chain when guns are off
      const k = rec.station || 'hand';
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k).push(rec);
    }
    let list = `<div class="craft-station-note">Nearby stations: ${stations.size ? [...stations].map((s) => STATION_LABELS[s]).join(', ') : 'none (stand near one to use it)'}</div>`;
    for (const [k, recs] of groups) {
      const stationKey = k === 'hand' ? null : k;
      list += `<div class="craft-group-title">${STATION_LABELS[stationKey]}</div>`;
      for (const rec of recs) {
        const check = canCraft(rec, g.inventory, g.skills, stations, firearmsAllowed);
        const def = ITEMS[rec.out];
        list += `<div class="craft-row ${this.selectedRecipe === rec.id ? 'selected' : ''} ${check.ok ? '' : 'unavailable'}" data-rec="${rec.id}">
          <span class="cr-icon">${itemIconHTML(rec.out)}</span>
          <span>${def.label}${rec.outQty > 1 ? ` ×${rec.outQty}` : ''}</span>
        </div>`;
      }
    }
    const rec = RECIPES.find((r) => r.id === this.selectedRecipe);
    let detail = '<div class="craft-detail"><span style="color:var(--ink-dim)">Select a recipe…</span></div>';
    if (rec) {
      const check = canCraft(rec, g.inventory, g.skills, stations, firearmsAllowed);
      const def = ITEMS[rec.out];
      detail = `<div class="craft-detail">
        <div class="cd-name">${itemIconHTML(rec.out)} ${def.label}${rec.outQty > 1 ? ` ×${rec.outQty}` : ''}</div>
        <div class="cd-req">${STATION_LABELS[rec.station]} · ${SKILL_DEFS[rec.skill].label} ${rec.level} · +${rec.xp} XP</div>
        <div class="ia-desc">${def.desc || ''}</div>
        ${rec.inputs.map((inp) => {
          const have = g.inventory.count(inp.item);
          return `<div class="cd-input ${have >= inp.qty ? 'have' : 'missing'}"><span>${ITEMS[inp.item].label}</span><span>${have}/${inp.qty}</span></div>`;
        }).join('')}
        ${rec.fuelTemp ? (() => {
          const fuel = minFuel(rec.fuelTemp);
          const have = g.inventory.count(fuel);
          return `<div class="cd-input ${have >= 1 ? 'have' : 'missing'}"><span>${icon('flame', 11)} Fuel: ${ITEMS[fuel].label}+ (${rec.fuelTemp}°C)</span><span>${have}/1</span></div>`;
        })() : ''}
        <div style="margin-top:10px">
          <button data-craft="1" ${check.ok ? '' : 'disabled'}>Craft</button>
          <button data-craft="5" ${check.ok ? '' : 'disabled'}>Craft ×5</button>
        </div>
        ${check.ok ? '' : `<div style="color:var(--bad);font-size:12px;margin-top:8px">${check.reason}</div>`}
      </div>`;
    }
    body.innerHTML = `<div class="craft-layout"><div class="craft-list">${list}</div>${detail}</div>`;
    body.querySelectorAll('.craft-row').forEach((el) => {
      el.addEventListener('click', () => { this.selectedRecipe = el.dataset.rec; this.renderWindowBody(); });
    });
    body.querySelectorAll('[data-craft]').forEach((b) => {
      b.addEventListener('click', () => {
        const n = parseInt(b.dataset.craft, 10);
        for (let i = 0; i < n; i++) {
          const res = craft(rec, g.inventory, g.skills, g.nearbyStations(), g.education.firearmsAllowed);
          if (!res.ok) break;
          if (rec.station === 'campfire' && ITEMS[rec.out].type === 'food') emit('cooked', { item: rec.out });
        }
        SFX.uiClick();
        this.renderWindowBody();
      });
    });
  }

  // ---- quests ----
  renderQuests(body) {
    const ql = this.game.quests;
    const active = ql.active();
    const done = ql.completed();
    let html = '<h3 style="color:var(--gold);margin-bottom:10px">Active Quests</h3>';
    if (!active.length) html += '<div style="color:var(--ink-dim);margin-bottom:12px">Nothing right now — talk to Maren at the camp.</div>';
    for (const q of active) {
      const st = ql.state[q.id];
      html += `<div class="quest-entry"><h4>${q.name}</h4>
        ${q.stages.map((s, i) => `<div class="quest-stage ${i < st.stage ? 'done-stage' : i === st.stage ? 'current' : ''}">
          ${i < st.stage ? '+' : i === st.stage ? '>' : '-'} ${s.text} ${i === st.stage ? ql.stageProgressText(q) : ''}
        </div>`).join('')}
      </div>`;
    }
    if (done.length) {
      html += '<h3 style="color:var(--good);margin:14px 0 10px">Completed</h3>';
      for (const q of done) html += `<div class="quest-entry done"><h4>${q.name}</h4></div>`;
    }
    body.innerHTML = html;
  }

  // ---- map ----
  // Enlarged world map: shows only chunks the player has actually uncovered.
  // Clicking an explored spot starts auto-travel (classic) / a guide trail (FP).
  renderMap(body) {
    body.innerHTML = `<canvas id="map-canvas"></canvas>
      ${this.waystonePanelHTML()}
      <div style="color:var(--ink-dim);font-size:12px;margin-top:6px">
        Click an explored spot to walk there. Gold diamond: your camp · gold dot: quest objective · gold cross: travel mark · blue diamond: waystone · white arrow: you.
      </div>`;
    this.bindWaystonePanel();
    const canvas = $('map-canvas');
    // Size the map against the space actually left in the window, not against the
    // viewport: the waystone panel is the point of opening this once you have a
    // network, and pushing it below the fold would hide the whole feature on a
    // landscape phone. `#map-canvas` is width:100% in CSS, so the drawing buffer
    // is scaled to `shown` px wide — the height is chosen so that after that
    // scaling the map occupies exactly the room left over.
    const shown = Math.max(280, canvas.clientWidth || 700);
    const room = Math.max(150, (body.clientHeight || 420) - (this.game.waystones.size ? 156 : 52));
    canvas.width = Math.round(Math.min(760, shown));
    canvas.height = Math.round(Math.min(520, room * (canvas.width / shown)));
    canvas.style.maxHeight = `${Math.round(room)}px`;
    const ctx = canvas.getContext('2d');
    const p = this.game.player;
    ctx.fillStyle = '#0d1015';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const scale = 1.1;
    const ox = canvas.width / 2 - p.x * scale, oz = canvas.height / 2 - p.z * scale;
    ctx.imageSmoothingEnabled = false;
    for (const key of this.game.discovered) {
      const [cx, cz] = key.split(',').map(Number);
      const tile = this.chunkTileCanvas(cx, cz);
      // integer, shared-boundary edges → no seams between chunk tiles
      const x0 = Math.round(ox + cx * CHUNK * scale), y0 = Math.round(oz + cz * CHUNK * scale);
      const x1 = Math.round(ox + (cx + 1) * CHUNK * scale), y1 = Math.round(oz + (cz + 1) * CHUNK * scale);
      ctx.drawImage(tile, x0, y0, x1 - x0, y1 - y0);
    }
    const diamond = (x, y, r, fill) => {
      ctx.fillStyle = fill;
      ctx.beginPath();
      ctx.moveTo(x, y - r); ctx.lineTo(x + r, y); ctx.lineTo(x, y + r); ctx.lineTo(x - r, y);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#000'; ctx.stroke();
    };
    diamond(ox, oz, 6, '#e2b13c'); // the camp (world origin)
    // every discovered waystone, with the one you're standing at ringed
    const standing = this.game.departureWaystone();
    for (const ws of this.game.waystones.list()) {
      const wx = ox + (ws.x + 0.5) * scale, wz = oz + (ws.z + 0.5) * scale;
      diamond(wx, wz, ws.id === standing?.id ? 6 : 4.5, ws.id === standing?.id ? '#ffffff' : '#7ec4f2');
    }
    const mk = this.game.quests.trackedMarker(this.game.world.markers);
    if (mk) {
      ctx.fillStyle = '#e2b13c';
      ctx.beginPath();
      ctx.arc(ox + mk.pos[0] * scale, oz + mk.pos[2] * scale, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#000'; ctx.stroke();
    }
    if (this.game.travelDest) {
      const [tx, , tz] = this.game.travelDest;
      const mx = ox + tx * scale, mz = oz + tz * scale;
      ctx.strokeStyle = '#e2b13c';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(mx - 5, mz - 5); ctx.lineTo(mx + 5, mz + 5);
      ctx.moveTo(mx + 5, mz - 5); ctx.lineTo(mx - 5, mz + 5);
      ctx.stroke();
      ctx.lineWidth = 1;
    }
    ctx.save();
    ctx.translate(ox + p.x * scale, oz + p.z * scale);
    ctx.rotate(-p.yaw);
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.moveTo(0, -7); ctx.lineTo(5, 6); ctx.lineTo(-5, 6); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#000'; ctx.stroke();
    ctx.restore();

    canvas.addEventListener('click', (e) => {
      const r = canvas.getBoundingClientRect();
      const mx = (e.clientX - r.left) * (canvas.width / r.width);
      const my = (e.clientY - r.top) * (canvas.height / r.height);
      const wx = (mx - ox) / scale, wz = (my - oz) / scale;
      const ck = `${Math.floor(wx / CHUNK)},${Math.floor(wz / CHUNK)}`;
      if (!this.game.discovered.has(ck)) {
        this.toast("You haven't explored that area yet.", 'warn');
        return;
      }
      this.game.setTravelDest(wx, wz);
      this.closeWindow();
    });
  }

  // ---- waystone fast travel ----
  // The network lives inside the map window on purpose: it IS a map feature, it
  // inherits the window's responsive layout, and so it cannot overlap the HUD in
  // either orientation. Each entry is `flex: 1 1 200px`, which lays the list out
  // as one column on a phone held upright and two or three in landscape or on
  // desktop, with a 44px minimum touch target throughout.
  waystonePanelHTML() {
    const g = this.game;
    const list = g.waystones.list();
    const here = g.departureWaystone();
    let note;
    if (!list.length) {
      note = 'None yet — a lit standing stone marks the miles along every main road out of the camp. Walk up to one.';
    } else if (!here) {
      note = 'Stand at a waystone to travel instantly between two of them; from anywhere else, picking one walks you to it.';
    } else if (list.length < 2) {
      note = `You are at ${here.name}. Find a second stone and the route opens.`;
    } else {
      note = `Departing ${here.name} — choose where to arrive.`;
    }
    const rows = list.map((ws) => {
      const at = !!here && ws.id === here.id;
      const away = Math.round(Math.hypot(ws.x - g.player.x, ws.z - g.player.z));
      return `<button class="ws-btn" data-ws="${ws.id}" ${at ? 'disabled' : ''} style="flex:1 1 200px;min-width:0;min-height:44px;`
        + 'display:flex;flex-direction:column;align-items:flex-start;gap:1px;padding:6px 10px;border-radius:6px;text-align:left;'
        + `background:${at ? 'rgba(226,177,60,0.16)' : 'rgba(44,50,60,0.9)'};border:1px solid ${at ? 'var(--gold)' : 'var(--edge)'};color:var(--ink)">`
        + `<span style="font-size:13px;font-weight:700;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${ws.name}</span>`
        + `<span style="font-size:11px;color:var(--ink-dim)">${g.waystoneWhere(ws)} · ${at ? 'you are here' : `${away} blocks away`}</span>`
        + '</button>';
    }).join('');
    return `<div id="ws-net" style="margin-top:8px">
      <div style="display:flex;align-items:baseline;gap:8px;flex-wrap:wrap">
        <b style="color:var(--gold);font-size:13px">Waystone network</b>
        <span style="color:var(--ink-dim);font-size:11.5px;flex:1 1 160px">${note}</span>
      </div>
      ${rows ? `<div id="ws-list" style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px;max-height:26vh;overflow-y:auto">${rows}</div>` : ''}
    </div>`;
  }

  bindWaystonePanel() {
    document.querySelectorAll('#ws-list .ws-btn').forEach((b) => {
      b.addEventListener('click', () => {
        SFX.uiClick();
        if (this.game.travelToWaystone(b.dataset.ws)) this.closeWindow();
      });
    });
  }

  // ---- settings ----
  renderSettings(body) {
    const s = this.game.settings;
    const row = (label, control) => `<div class="setting-row"><label>${label}</label>${control}</div>`;
    const range = (key, min, max, step) =>
      `<span style="display:flex;align-items:center;gap:6px"><input type="range" data-set="${key}" min="${min}" max="${max}" step="${step}" value="${s[key]}"><span class="set-val">${s[key]}</span></span>`;
    const check = (key) => `<input type="checkbox" data-set="${key}" ${s[key] ? 'checked' : ''}>`;
    const select = (key, opts) => `<select data-set="${key}">${opts.map(([v, l]) =>
      `<option value="${v}" ${s[key] === v ? 'selected' : ''}>${l}</option>`).join('')}</select>`;
    body.innerHTML = `<div class="settings-grid">
      ${row('Classic camera — third person, click to move (V)', check('classicCamera'))}
      ${row('Render distance (chunks)', range('renderDistance', 2, 8, 1))}
      ${row('Dynamic resolution — auto-scale sharpness to keep a smooth frame rate (recommended on phones)', check('dynamicResolution'))}
      ${row('Camera sensitivity', range('sensitivity', 0.2, 3, 0.1))}
      ${row('Invert Y axis', check('invertY'))}
      ${row('UI scale', range('uiScale', 0.7, 1.6, 0.05))}
      ${row('Text size', range('textScale', 0.8, 1.5, 0.05))}
      ${row('Quest trail — guide dots toward your objective', check('questTrail'))}
      ${row('XP popups on skill gains', check('xpToasts'))}
      ${row('Reduced motion', check('reducedMotion'))}
      ${row('Screen shake', check('screenShake'))}
      ${row('Graphics quality', select('graphicsPreset', [['auto', 'Auto (match device)'], ['low', 'Low — fastest, best for phones'], ['medium', 'Medium'], ['high', 'High — gradient sky, sun/moon, fresnel water']]))}
      ${row('Colorblind-friendly colors', check('colorblind'))}
      ${row('Sprint: toggle instead of hold', check('sprintToggle'))}
      ${row('Left-handed mobile layout', check('leftHanded'))}
      ${row('Tap to interact (mobile)', check('tapToInteract'))}
      ${row('Sound effects volume', range('sfxVolume', 0, 1, 0.05))}
      ${row('Music volume', range('musicVolume', 0, 1, 0.05))}
    </div>
    <div class="settings-actions">
      <button id="btn-save-now">${icon('disk', 14)} Save game now</button>
      <button id="btn-to-title">${icon('house', 14)} Save & quit to title</button>
      <span style="color:var(--ink-dim);font-size:12px;align-self:center" id="save-status"></span>
    </div>
    <div class="admin-section">
      <div class="admin-title-row">
        <h3 class="admin-title">Admin / Debug</h3>
        <label class="admin-toggle"><input type="checkbox" id="admin-enable" ${s.debugTools ? 'checked' : ''}> Enable debug tools</label>
      </div>
      <div id="admin-panel" class="${s.debugTools ? '' : 'hidden'}">
        <p class="admin-hint">Per-mob spawn &amp; drop overrides, saved to this browser and read live by world generation and combat. Imported mobs are off until you activate them. Use <b>Disable all</b> to clear the world for review, then switch on the ones you want; <b>✕</b> removes a mob you'll never use (it can be restored below).</p>
        <div class="admin-toolbar">
          <input type="search" id="admin-search" class="admin-search" placeholder="Search mobs…" autocomplete="off">
          <button id="admin-disable-all" class="admin-btn" title="Turn every mob off so nothing spawns — review them, then re-enable the ones you want">Disable all</button>
          <button id="admin-enable-all" class="admin-btn" title="Turn every mob back on">Enable all</button>
          <button id="admin-export" class="admin-btn" title="Download js/game/mobconfig-defaults.js with your current config baked in — commit it to ship these settings to everyone">Save as game defaults</button>
        </div>
        <div id="admin-deleted" class="admin-deleted"></div>
        <div id="admin-list" class="admin-list"></div>
      </div>
    </div>
    <div style="margin-top:14px;color:var(--ink-dim);font-size:12px;line-height:1.7">
      <b>First person:</b> WASD move · Mouse look (click to capture) · Space jump · Shift sprint · LMB gather/mine/attack · RMB place/interact · F interact · E inventory · K skills · C crafting · J quests · M map · 1–8 hotbar · V camera<br>
      <b>Classic view:</b> click ground to walk · click trees/rocks/creatures/villagers to act · double-click (or Shift+click / long-press) a block to mine it · RMB place block · left-drag, middle-drag or arrow keys orbit · wheel zoom · click the minimap for the big map, then click anywhere explored to auto-walk there<br>
      <b>Mobile:</b> left stick move · drag right side to look/orbit · Action button holds to gather · Place button builds · in classic view just tap where you want to go
    </div>`;
    body.querySelectorAll('[data-set]').forEach((inp) => {
      inp.addEventListener('input', () => {
        const key = inp.dataset.set;
        s[key] = inp.type === 'checkbox' ? inp.checked
          : inp.tagName === 'SELECT' ? inp.value       // string-valued (e.g. graphics quality)
          : parseFloat(inp.value);
        if (inp.type === 'range') inp.nextElementSibling.textContent = s[key];
        this.game.applySettings();
      });
    });
    $('btn-save-now').addEventListener('click', () => {
      this.game.saveGame();
      $('save-status').textContent = 'Saved.';
      setTimeout(() => { const el = $('save-status'); if (el) el.textContent = ''; }, 1800);
    });
    $('btn-to-title').addEventListener('click', () => { this.game.saveGame(); location.reload(); });

    // ---- Admin / Debug panel ----
    const adminEnable = $('admin-enable');
    adminEnable.addEventListener('change', () => {
      s.debugTools = adminEnable.checked;
      this.game.applySettings();            // persists settings
      $('admin-panel').classList.toggle('hidden', !adminEnable.checked);
      if (adminEnable.checked) this.renderAdminList();
    });
    const search = $('admin-search');
    search.value = this._adminSearch || '';
    search.addEventListener('input', () => { this._adminSearch = search.value; this.renderAdminList(); });
    $('admin-export')?.addEventListener('click', () => {
      // Download the ready-to-commit defaults source file. The browser can't
      // write to the repo, so this hands you the file to drop in / send over.
      const text = exportMobDefaults();
      const url = URL.createObjectURL(new Blob([text], { type: 'text/javascript' }));
      const a = document.createElement('a');
      a.href = url; a.download = 'mobconfig-defaults.js';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      this.toast('Saved mobconfig-defaults.js — commit it to ship these settings to everyone.', 'info');
    });
    $('admin-disable-all')?.addEventListener('click', () => {
      setAllMobsActive(false); saveMobConfig(); this.renderAdminList();
      this.toast('All mobs disabled — nothing will spawn until you re-enable them.', 'info');
    });
    $('admin-enable-all')?.addEventListener('click', () => {
      setAllMobsActive(true); saveMobConfig(); this.renderAdminList();
      this.toast('All mobs enabled.', 'info');
    });
    if (s.debugTools) this.renderAdminList();
  }

  // Fill the mob list, filtered by the current search text.
  renderAdminList() {
    const host = $('admin-list');
    if (!host) return;
    const q = (this._adminSearch || '').trim().toLowerCase();
    this._adminExpanded ??= new Set();
    const types = allMobTypes().filter((t) => {
      if (!q) return true;
      const def = ENEMY_TYPES[t];
      return t.toLowerCase().includes(q) || (def.label || '').toLowerCase().includes(q);
    });
    host.innerHTML = types.length
      ? types.map((t) => this._adminMobHTML(t)).join('')
      : '<div class="admin-empty">No mobs match your search.</div>';
    this._wireAdminList(host);
    this._fillAdminThumbs(host);
    this._fillAdminPreview(host);
    this._renderDeletedMobs();
  }

  // The "deleted" tray: mobs curated out of the library, with a Restore each.
  _renderDeletedMobs() {
    const host = $('admin-deleted');
    if (!host) return;
    const gone = deletedMobTypes();
    if (!gone.length) { host.innerHTML = ''; return; }
    this._showDeleted ??= false;
    if (!this._showDeleted) {
      host.innerHTML = `<button class="admin-link" id="admin-show-deleted">Show ${gone.length} deleted mob${gone.length > 1 ? 's' : ''}</button>`;
      $('admin-show-deleted').onclick = () => { this._showDeleted = true; this._renderDeletedMobs(); };
      return;
    }
    host.innerHTML = `<div class="admin-deleted-head"><span>Deleted (${gone.length})</span>`
      + '<button class="admin-link" id="admin-hide-deleted">hide</button></div>'
      + gone.map((t) => `<div class="admin-deleted-row"><span>${ENEMY_TYPES[t]?.label || t}</span>`
        + `<button class="admin-link" data-restore="${t}">Restore</button></div>`).join('');
    $('admin-hide-deleted').onclick = () => { this._showDeleted = false; this._renderDeletedMobs(); };
    host.querySelectorAll('[data-restore]').forEach((b) => {
      b.onclick = () => {
        setMobDeleted(b.dataset.restore, false); saveMobConfig();
        this.renderAdminList();
      };
    });
  }

  // Paint a small 3/4 model preview into each row's thumbnail. Rendered once per
  // mob via the renderer's offscreen FBO and cached as a data URL, so repaints
  // (searching, expanding) reuse it instead of re-rendering.
  _fillAdminThumbs(host) {
    const r = this.game?.renderer;
    if (!r || typeof r.renderMobThumb !== 'function') return;
    this._mobThumbCache ??= new Map();
    if (!this._thumbCanvas) { this._thumbCanvas = document.createElement('canvas'); this._thumbCanvas.width = this._thumbCanvas.height = 96; }
    const paint = (img) => {
      const type = img.dataset.mob;
      let url = this._mobThumbCache.get(type);
      if (url === undefined) { // render once, then cache the data URL for every repaint after
        const model = r.modelCache.get(type);
        const pose = model?.animated ? evaluatePose(model, 'idle', 0) : null; // rest pose: bone rotations applied
        url = r.renderMobThumb(type, this._thumbCanvas, 0, 0, pose) ? this._thumbCanvas.toDataURL() : '';
        this._mobThumbCache.set(type, url);
      }
      if (url) img.src = url; else img.classList.add('admin-thumb-empty');
    };
    // Cached rows paint instantly; uncached ones render only when scrolled into
    // view, so opening the (148-mob) list doesn't stall rendering everything.
    if (!this._thumbObserver && typeof IntersectionObserver === 'function') {
      this._thumbObserver = new IntersectionObserver((entries, obs) => {
        for (const e of entries) if (e.isIntersecting) { paint(e.target); obs.unobserve(e.target); }
      }, { root: host, rootMargin: '120px' });
    }
    for (const img of host.querySelectorAll('img.admin-thumb')) {
      if (this._mobThumbCache.has(img.dataset.mob) || !this._thumbObserver) paint(img);
      else this._thumbObserver.observe(img);
    }
  }

  // Large, drag-to-rotate model preview shown in the expanded mob row. Renders
  // the live model via the renderer's offscreen FBO at the current orbit angle;
  // dragging spins it (yaw) and tilts it (pitch). The angle persists across
  // rows so you can compare mobs from the same view.
  _fillAdminPreview(host) {
    const r = this.game?.renderer;
    const canvas = host.querySelector('canvas.admin-preview');
    if (!r || typeof r.renderMobThumb !== 'function' || !canvas) return;
    this._preview ??= { yaw: 0, pitch: 0 };
    const type = canvas.dataset.mob;
    let raf = 0;
    const model = r.modelCache.get(type);
    const pose = model?.animated ? evaluatePose(model, 'idle', 0) : null; // rest pose: bone rotations applied
    const draw = () => { raf = 0; if (!r.renderMobThumb(type, canvas, this._preview.yaw, this._preview.pitch, pose)) canvas.classList.add('admin-preview-empty'); };
    const schedule = () => { if (!raf) raf = requestAnimationFrame(draw); };
    draw();
    // pointer-drag orbit (works with mouse, pen, and touch via pointer events)
    let dragging = false, lastX = 0, lastY = 0;
    canvas.addEventListener('pointerdown', (e) => {
      dragging = true; lastX = e.clientX; lastY = e.clientY;
      canvas.classList.add('grabbing'); try { canvas.setPointerCapture(e.pointerId); } catch { /* not supported */ }
      e.preventDefault();
    });
    canvas.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const dx = e.clientX - lastX, dy = e.clientY - lastY; lastX = e.clientX; lastY = e.clientY;
      this._preview.yaw += dx * 0.012;
      this._preview.pitch = Math.max(-1.1, Math.min(1.1, this._preview.pitch - dy * 0.012));
      schedule();
    });
    const end = (e) => { if (!dragging) return; dragging = false; canvas.classList.remove('grabbing'); try { canvas.releasePointerCapture(e.pointerId); } catch { /* ignore */ } };
    canvas.addEventListener('pointerup', end);
    canvas.addEventListener('pointercancel', end);
    // double-click resets to the default 3/4 view
    canvas.addEventListener('dblclick', () => { this._preview.yaw = 0; this._preview.pitch = 0; schedule(); });
  }

  _adminMobHTML(type) {
    const def = ENEMY_TYPES[type];
    const open = this._adminExpanded.has(type);
    const active = mobActive(type);
    const badge = def.imported ? '<span class="admin-badge">imported</span>' : '';
    return `<div class="admin-mob${open ? ' open' : ''}" data-mob="${type}">
      <div class="admin-mob-head">
        <button class="admin-caret" data-act="toggle" title="Expand">${open ? '▾' : '▸'}</button>
        <img class="admin-thumb" data-mob="${type}" alt="" width="52" height="52">
        <span class="admin-mob-name">${def.label || type} ${badge}<code>${type}</code></span>
        <label class="admin-active"><input type="checkbox" data-act="active" ${active ? 'checked' : ''}>Active</label>
        <button class="admin-del-mob" data-act="delete" title="Remove this mob from the library (restorable)">✕</button>
      </div>
      ${open ? this._adminDetailHTML(type) : ''}
    </div>`;
  }

  _adminDetailHTML(type) {
    const rate = mobRate(type);
    const sel = mobBiomes(type); // null = everywhere
    const chips = [`<button class="admin-chip${sel === null ? ' on' : ''}" data-biome="*">Everywhere</button>`]
      .concat(Object.entries(BIOMES).map(([key, b]) =>
        `<button class="admin-chip${sel && sel.includes(key) ? ' on' : ''}" data-biome="${key}">${b.label}</button>`))
      .join('');
    const drops = mobDropsFor(type).map((d) => this._adminDropRowHTML(d)).join('');
    return `<div class="admin-detail">
      <div class="admin-preview-wrap">
        <canvas class="admin-preview" data-mob="${type}" width="260" height="260"></canvas>
        <div class="admin-preview-hint">drag to rotate</div>
      </div>
      <div class="admin-field">
        <label>Spawn rate <span class="admin-rate-val">${(+rate).toFixed(2)}×</span></label>
        <input type="range" class="admin-rate" min="0" max="4" step="0.05" value="${rate}">
      </div>
      <div class="admin-field">
        <label>Spawn biomes</label>
        <div class="admin-chips">${chips}</div>
      </div>
      <div class="admin-field">
        <label>Drops <span class="admin-dim">item · min · max · chance(0–1)</span></label>
        <div class="admin-drops">${drops}</div>
        <button class="admin-btn admin-add-drop" data-act="add-drop">+ Add drop</button>
      </div>
      <div class="admin-actions">
        <button class="admin-btn" data-act="spawn">Spawn 3 here</button>
        <button class="admin-btn admin-reset" data-act="reset">Reset to default</button>
      </div>
    </div>`;
  }

  _adminDropRowHTML(d = { item: '', qty: [1, 1], chance: 1 }) {
    const min = d.qty?.[0] ?? 1, max = d.qty?.[1] ?? min, chance = d.chance ?? 1;
    return `<div class="admin-drop">
      <input class="admin-drop-item" list="admin-item-ids" data-f="item" placeholder="item id" value="${d.item || ''}">
      <input type="number" data-f="min" min="0" step="1" value="${min}" title="min">
      <input type="number" data-f="max" min="0" step="1" value="${max}" title="max">
      <input type="number" data-f="chance" min="0" max="1" step="0.05" value="${chance}" title="chance 0–1">
      <button class="admin-drop-del" data-act="del-drop" title="Remove">✕</button>
    </div>`;
  }

  // Read the drop rows currently in a mob's editor into the {item,qty,chance} shape.
  _adminReadDrops(mobEl) {
    const out = [];
    for (const r of mobEl.querySelectorAll('.admin-drop')) {
      const item = r.querySelector('[data-f=item]').value.trim();
      if (!item) continue; // skip incomplete rows
      const min = Math.max(0, parseInt(r.querySelector('[data-f=min]').value, 10) || 0);
      const max = Math.max(min, parseInt(r.querySelector('[data-f=max]').value, 10) || min);
      let chance = parseFloat(r.querySelector('[data-f=chance]').value);
      chance = Number.isNaN(chance) ? 1 : Math.min(1, Math.max(0, chance));
      out.push({ item, qty: [min, max], chance });
    }
    return out;
  }

  // Toggle a biome chip: "*" = everywhere (null), else build/edit an explicit
  // biome-key set. An emptied set falls back to everywhere.
  _adminBiomeClick(type, chip) {
    if (!type) return;
    const key = chip.dataset.biome;
    if (key === '*') setMobConfig(type, { biomes: null });
    else {
      const cur = mobBiomes(type);
      const set = cur ? [...cur] : [];
      const i = set.indexOf(key);
      if (i >= 0) set.splice(i, 1); else set.push(key);
      setMobConfig(type, { biomes: set.length ? set : null });
    }
    saveMobConfig();
    const sel = mobBiomes(type);
    chip.closest('.admin-chips').querySelectorAll('.admin-chip').forEach((c) => {
      const k = c.dataset.biome;
      c.classList.toggle('on', k === '*' ? sel === null : !!(sel && sel.includes(k)));
    });
  }

  _wireAdminList(host) {
    // Shared item-id datalist, attached to <body> once (survives host repaints).
    if (!$('admin-item-ids')) {
      const dl = document.createElement('datalist');
      dl.id = 'admin-item-ids';
      dl.innerHTML = Object.keys(ITEMS).map((id) => `<option value="${id}">`).join('');
      document.body.appendChild(dl);
    }
    // Delegated listeners are attached once per host element; renderAdminList
    // only swaps host.innerHTML, so guard against re-binding duplicates.
    if (host.__adminWired) return;
    host.__adminWired = true;

    const mobOf = (el) => el.closest('.admin-mob');
    const typeOf = (el) => mobOf(el)?.dataset.mob;

    host.addEventListener('click', (ev) => {
      const chip = ev.target.closest('.admin-chip');
      if (chip) { this._adminBiomeClick(typeOf(chip), chip); return; }
      const btn = ev.target.closest('[data-act]');
      if (!btn) return;
      const act = btn.dataset.act;
      const type = typeOf(btn);
      if (!type) return;
      if (act === 'toggle') {
        if (this._adminExpanded.has(type)) this._adminExpanded.delete(type);
        else this._adminExpanded.add(type);
        this.renderAdminList();
      } else if (act === 'reset') {
        resetMobConfig(type); saveMobConfig();
        this.renderAdminList();
      } else if (act === 'spawn') {
        const g = this.game || window.__game;
        let n = 0;
        for (let i = 0; i < 3; i++) if (g?.spawnMobNear?.(type)) n++;
        this.toast(n ? `Spawned ${n} ${ENEMY_TYPES[type].label || type}` : 'Could not spawn here', n ? 'xp' : 'warn');
      } else if (act === 'add-drop') {
        const wrap = mobOf(btn).querySelector('.admin-drops');
        wrap.insertAdjacentHTML('beforeend', this._adminDropRowHTML());
      } else if (act === 'del-drop') {
        const mobEl = mobOf(btn);
        btn.closest('.admin-drop').remove();
        setMobConfig(type, { drops: this._adminReadDrops(mobEl) }); saveMobConfig();
      } else if (act === 'delete') {
        setMobDeleted(type, true); saveMobConfig();
        this._adminExpanded.delete(type);
        this.renderAdminList();
        this.toast(`Removed ${ENEMY_TYPES[type]?.label || type} from the library — restore it below.`, 'info');
      }
    });

    host.addEventListener('change', (ev) => {
      const box = ev.target.closest('[data-act=active]');
      if (!box) return;
      const type = typeOf(box);
      setMobConfig(type, { active: box.checked }); saveMobConfig();
    });

    host.addEventListener('input', (ev) => {
      const el = ev.target;
      const type = typeOf(el);
      if (!type) return;
      if (el.classList.contains('admin-rate')) {
        const v = parseFloat(el.value);
        setMobConfig(type, { rate: v }); saveMobConfig();
        const lbl = mobOf(el).querySelector('.admin-rate-val');
        if (lbl) lbl.textContent = `${v.toFixed(2)}×`;
      } else if (el.dataset.f) { // a drop field
        setMobConfig(type, { drops: this._adminReadDrops(mobOf(el)) }); saveMobConfig();
      }
    });
  }

  // ---- shop ----
  openShop(npcId) {
    this.shopNpc = npcId;
    this.currentWindow = 'inventory';
    $('window-root').classList.remove('hidden');
    this.game.onWindowOpened();
    $('window-tabs').innerHTML = `<button class="win-tab active">${icon('cart', 14)} ${NPC_DEFS[npcId].label}</button>`;
    this.renderWindowBody();
  }

  renderShop(body) {
    const npc = NPC_DEFS[this.shopNpc];
    const inv = this.game.inventory;
    const sells = npc.shop.sells.map((s) => `<div class="shop-row">
      <span>${itemIconHTML(s.item)} ${ITEMS[s.item].label}</span>
      <span>${icon('coin', 13)} ${s.price} <button data-buy="${s.item}" data-price="${s.price}" ${inv.coins < s.price ? 'disabled' : ''}>Buy</button></span>
    </div>`).join('');
    const sellable = Object.entries(npc.shop.buys)
      .filter(([item]) => inv.count(item) > 0)
      .map(([item, price]) => `<div class="shop-row">
        <span>${itemIconHTML(item)} ${ITEMS[item].label} ×${inv.count(item)}</span>
        <span>${icon('coin', 13)} ${price} <button data-sell="${item}" data-price="${price}">Sell</button>
        <button data-sellall="${item}" data-price="${price}">All</button></span>
      </div>`).join('');
    body.innerHTML = `<div style="margin-bottom:10px;color:var(--gold)">${icon('coin', 14)} Your coins: ${inv.coins}</div>
      <div class="shop-cols">
        <div class="shop-col"><h4>For sale</h4>${sells}</div>
        <div class="shop-col"><h4>Tam buys</h4>${sellable || '<span style="color:var(--ink-dim)">Nothing Tam wants right now.</span>'}</div>
      </div>`;
    body.querySelectorAll('[data-buy]').forEach((b) => b.addEventListener('click', () => {
      const price = parseInt(b.dataset.price, 10);
      if (inv.coins >= price) {
        if (inv.add(b.dataset.buy, 1) < 1) { this.toast('Your pack is full!', 'warn'); return; }
        inv.remove('coin', price);
        SFX.pickup();
      }
      this.renderWindowBody();
    }));
    body.querySelectorAll('[data-sell]').forEach((b) => b.addEventListener('click', () => {
      inv.remove(b.dataset.sell, 1); inv.add('coin', parseInt(b.dataset.price, 10));
      this.renderWindowBody();
    }));
    body.querySelectorAll('[data-sellall]').forEach((b) => b.addEventListener('click', () => {
      const n = inv.count(b.dataset.sellall);
      inv.remove(b.dataset.sellall, n); inv.add('coin', parseInt(b.dataset.price, 10) * n);
      this.renderWindowBody();
    }));
  }

  // ---- chest ----
  openChestUI(chestId) {
    this.chestId = chestId;
    this.currentWindow = 'inventory';
    $('window-root').classList.remove('hidden');
    this.game.onWindowOpened();
    $('window-tabs').innerHTML = `<button class="win-tab active">${icon('boxicon', 14)} Storage</button>`;
    this.renderWindowBody();
  }

  renderChest(body) {
    const contents = this.game.world.openChest(this.chestId);
    const inv = this.game.inventory;
    const rows = contents.map((c, i) => `<div class="shop-row">
      <span>${itemIconHTML(c.item)} ${ITEMS[c.item]?.label || c.item} ×${c.qty}${c.dur != null ? ' (worn)' : ''}</span>
      <button data-take="${i}">Take</button>
    </div>`).join('');
    const invRows = inv.slots.map((s, i) => s ? `<div class="shop-row">
      <span>${itemIconHTML(s.item)} ${ITEMS[s.item].label} ×${s.qty}</span>
      <button data-store="${i}">Store</button>
    </div>` : '').join('');
    body.innerHTML = `<div class="shop-cols">
      <div class="shop-col"><h4>Chest</h4>${rows || '<span style="color:var(--ink-dim)">Empty.</span>'}
        ${contents.length ? '<button id="take-all" style="margin-top:8px" class="dialog-btn">Take All</button>' : ''}</div>
      <div class="shop-col"><h4>Your pack</h4>${invRows || '<span style="color:var(--ink-dim)">Empty.</span>'}</div>
    </div>`;
    const takeOne = (i) => {
      const c = contents[i];
      const added = inv.add(c.item, c.qty, c.dur ?? null);
      c.qty -= added;
      if (c.qty <= 0) contents.splice(i, 1);
      return added;
    };
    body.querySelectorAll('[data-take]').forEach((b) => b.addEventListener('click', () => {
      takeOne(parseInt(b.dataset.take, 10));
      SFX.pickup();
      this.renderWindowBody();
    }));
    body.querySelector('#take-all')?.addEventListener('click', () => {
      for (let i = contents.length - 1; i >= 0; i--) takeOne(i);
      SFX.pickup();
      this.renderWindowBody();
    });
    body.querySelectorAll('[data-store]').forEach((b) => b.addEventListener('click', () => {
      const i = parseInt(b.dataset.store, 10);
      const s = inv.slots[i];
      if (!s) return;
      // items with durability keep it and never merge with other stacks
      if (s.dur != null) {
        contents.push({ item: s.item, qty: s.qty, dur: s.dur });
      } else {
        const existing = contents.find((c) => c.item === s.item && c.dur == null);
        if (existing) existing.qty += s.qty;
        else contents.push({ item: s.item, qty: s.qty });
      }
      inv.slots[i] = null;
      emit('inventoryChanged');
      this.renderWindowBody();
    }));
  }

  // ------------------------------------------------------------ dialogue
  showDialogue(nodeId) {
    const g = this.game;
    let node = DIALOGUES[nodeId];
    if (!node) return this.hideDialogue();
    g.dialogueOpen = true;
    g.onWindowOpened();
    const npcId = node.speaker;
    const npc = NPC_DEFS[npcId];
    let text, options;
    if (node.dynamic) {
      ({ text, options } = this.buildQuestHub(npcId));
    } else {
      text = node.text();
      options = node.options;
      // Quest fast-path: on the FIRST box of a conversation, a finished quest is
      // immediately turn-in-able (and fresh offers are one click away) — no need
      // to re-walk the dialogue tree to reach the quest hub.
      if (nodeId === npc.dialogue) {
        const extra = [];
        for (const q of QUESTS) {
          if (g.quests.readyToTurnIn(q, npcId)) extra.push({ label: `${q.name} (turn in!)`, action: `turnIn:${q.id}`, cls: 'quest-ready' });
          else if (q.giver === npcId && g.quests.isAvailable(q)) extra.push({ label: `Quest: ${q.name}`, action: `startQuest:${q.id}`, cls: 'quest-offer' });
        }
        if (extra.length) options = [...extra, ...options];
      }
    }
    $('dialogue').classList.remove('hidden');
    $('dialogue-name').textContent = `${npc.label} — ${npc.role}`;
    $('dialogue-text').textContent = text;
    $('dialogue-options').innerHTML = '';
    for (const opt of options) {
      const b = document.createElement('button');
      b.className = `dialog-btn ${opt.cls || ''}`;
      b.textContent = opt.label;
      b.addEventListener('click', () => {
        SFX.uiClick();
        if (opt.action === 'close') this.hideDialogue();
        else if (opt.action === 'shop') { this.hideDialogue(); this.openShop(npcId); }
        else if (opt.action?.startsWith('startLesson:')) {
          this.hideDialogue();
          emit('startLesson', { area: opt.action.slice(12) });
        } else if (opt.action?.startsWith('startQuest:')) {
          const qid = opt.action.slice(11);
          g.quests.start(qid);
          const q = QUESTS.find((qq) => qq.id === qid);
          $('dialogue-text').textContent = q.intro;
          $('dialogue-options').innerHTML = '';
          const ok = document.createElement('button');
          ok.className = 'dialog-btn';
          ok.textContent = 'I\'ll get to it.';
          ok.addEventListener('click', () => this.hideDialogue());
          $('dialogue-options').appendChild(ok);
        } else if (opt.action?.startsWith('turnIn:')) {
          const qid = opt.action.slice(7);
          const q = QUESTS.find((qq) => qq.id === qid);
          const done = g.quests.turnIn(q, g.skills);
          $('dialogue-text').textContent = done
            ? q.outro
            : 'Your pack is stuffed full — make some room and come back for your reward.';
          $('dialogue-options').innerHTML = '';
          const ok = document.createElement('button');
          ok.className = 'dialog-btn';
          ok.textContent = done ? 'Thank you.' : 'I\'ll be right back.';
          ok.addEventListener('click', () => this.hideDialogue());
          $('dialogue-options').appendChild(ok);
        } else if (opt.next) {
          this.showDialogue(opt.next);
        } else this.hideDialogue();
      });
      $('dialogue-options').appendChild(b);
    }
  }

  buildQuestHub(npcId) {
    const ql = this.game.quests;
    const options = [];
    // quests offered here, plus any quest whose final report is to this NPC
    // (chains can start at the camp and end at the frontier)
    for (const q of QUESTS) {
      if (ql.readyToTurnIn(q, npcId)) {
        options.push({ label: `${q.name} (turn in!)`, action: `turnIn:${q.id}`, cls: 'quest-ready' });
      } else if (q.giver === npcId && ql.isAvailable(q)) {
        options.push({ label: `Quest: ${q.name}`, action: `startQuest:${q.id}`, cls: 'quest-offer' });
      }
    }
    const HUB_TEXT = {
      maren: {
        offer: "There is work that would suit you, if you're willing.",
        idle: 'The valley provides for the diligent. Explore, practice your crafts — and stay clear of the deep wilds until you\'re ready.',
      },
      tam: {
        offer: 'Matter of fact, I could use a hand.',
        idle: 'Nothing today. Coin talks though — bring me goods!',
      },
      sylla: {
        offer: 'As it happens, the Frostwatch is short-handed. Always.',
        idle: 'Keep your fire fed and your back to a wall. That\'s all the work there is out here.',
      },
    };
    const activeHere = ql.activeFrom(npcId).filter((q) => !ql.readyToTurnIn(q, npcId));
    let text;
    if (options.length) {
      text = HUB_TEXT[npcId]?.offer || 'I could use a hand.';
    } else if (activeHere.length) {
      const q = activeHere[0];
      const stage = ql.currentStage(q);
      text = `How goes it? ${stage ? `You were going to: ${stage.text.toLowerCase()}` : ''}`;
    } else {
      text = HUB_TEXT[npcId]?.idle || 'Nothing today.';
    }
    options.push({ label: 'Back.', next: `${npcId}_root` });
    return { text, options };
  }

  hideDialogue() {
    $('dialogue').classList.add('hidden');
    this.game.dialogueOpen = false;
    this.game.onWindowClosed();
  }

  // ------------------------------------------------------------ combat UI
  showCombat() {
    $('combat-ui').classList.remove('hidden');
    this.renderCombat();
    this.renderCombatLog();
  }

  hideCombat() {
    $('combat-ui').classList.add('hidden');
    $('target-info').classList.add('hidden');
    $('combat-item-picker')?.remove();
    this.combatMode = null;
  }

  showBanner(text) {
    const el = $('combat-banner');
    el.textContent = text;
    el.classList.remove('hidden');
    SFX.bossRoar();
    setTimeout(() => el.classList.add('hidden'), 2600);
  }

  renderCombat() {
    const combat = this.game.combat;
    if (!combat.active) return;
    // turn order
    const cur = combat.current();
    $('turn-order').innerHTML = combat.combatants.map((c) => `
      <div class="turn-chip ${c === cur ? 'current' : ''} ${c.hp <= 0 ? 'dead' : ''}">
        <span>${c.kind === 'player' ? 'You' : c.label}</span>
        <div class="tc-hp"><div style="width:${(c.hp / c.maxHp) * 100}%"></div></div>
        <span style="font-size:9px">${c.statuses.map((s) => STATUS_INFO[s.id]?.icon || '').join('')}</span>
      </div>`).join('');

    const isPlayerTurn = cur === combat.playerC && !combat.pendingEnd;
    const p = this.game.player;
    let html = '';
    if (isPlayerTurn) {
      const abilities = combat.playerAbilities();
      html += `<button class="combat-btn ${this.combatMode === 'move' ? 'active-mode' : ''}" data-cbt="move" ${combat.usedMove ? 'disabled' : ''}>Move<span class="cb-sub">${combat.usedMove ? 'used' : `${combat.moveAllowance(combat.playerC)} tiles`}</span></button>`;
      for (const ab of abilities) {
        const cost = ab.energy ? `${icon('bolt', 10)}${ab.energy}` : ab.mana ? `${icon('sparkle', 10)}${ab.mana}` : '';
        const active = this.combatMode && this.combatMode.ability === ab.id;
        html += `<button class="combat-btn ${active ? 'active-mode' : ''}" data-cbt="ability" data-ab="${ab.id}" ${ab.blocked ? 'disabled' : ''} title="${ab.desc || ''}${ab.blocked ? ' — ' + ab.blocked : ''}">
          ${ab.label}<span class="cb-sub">${cost}${ab.cdLeft ? ` · CD ${ab.cdLeft}` : ''}</span></button>`;
      }
      html += `<button class="combat-btn" data-cbt="defend" ${combat.usedAction ? 'disabled' : ''}>${icon('shield', 12)} Defend<span class="cb-sub">-50% dmg</span></button>`;
      html += `<button class="combat-btn" data-cbt="item" ${combat.usedAction ? 'disabled' : ''}>${icon('bag', 12)} Item</button>`;
      html += `<button class="combat-btn ${this.inspectMode ? 'active-mode' : ''}" data-cbt="inspect">Inspect<span class="cb-sub">free</span></button>`;
      html += `<button class="combat-btn" data-cbt="flee" ${combat.usedAction ? 'disabled' : ''}>Flee</button>`;
      html += `<button class="combat-btn end-turn" data-cbt="end">End Turn</button>`;
    } else if (!combat.pendingEnd) {
      html = `<div class="combat-btn" style="border-color:var(--edge)">${cur?.label || ''}'s turn…</div>`;
    }
    $('combat-actions').innerHTML = html;
    $('combat-actions').querySelectorAll('[data-cbt]').forEach((b) => {
      b.addEventListener('click', () => {
        const t = b.dataset.cbt;
        SFX.uiClick();
        if (t === 'move') { this.combatMode = this.combatMode === 'move' ? null : 'move'; this.inspectMode = false; }
        else if (t === 'ability') {
          const id = b.dataset.ab;
          const ab = ABILITIES[id];
          this.inspectMode = false;
          if (ab.style === 'heal') { this.game.combat.doAbility(id, 'player'); this.combatMode = null; }
          else this.combatMode = this.combatMode?.ability === id ? null : { ability: id };
        }
        else if (t === 'defend') { combat.doDefend(); this.combatMode = null; }
        else if (t === 'item') this.renderCombatItemPicker();
        else if (t === 'inspect') { this.inspectMode = !this.inspectMode; this.combatMode = null; }
        else if (t === 'flee') { combat.attemptFlee(); this.combatMode = null; }
        else if (t === 'end') { this.combatMode = null; combat.endTurn(); }
        this.renderCombat();
      });
    });

    // hint line
    let hint = $('combat-hint');
    if (!hint) {
      hint = document.createElement('div');
      hint.id = 'combat-hint';
      $('combat-ui').appendChild(hint);
    }
    if (this.combatMode === 'move') hint.textContent = 'Tap a highlighted tile to move';
    else if (this.combatMode?.ability) hint.textContent = `Tap a highlighted enemy to use ${ABILITIES[this.combatMode.ability].label}`;
    else if (this.inspectMode) hint.textContent = 'Tap an enemy to inspect it';
    else if (isPlayerTurn) hint.textContent = `Round ${combat.round} — your turn`;
    else hint.textContent = '';
    hint.style.display = hint.textContent ? '' : 'none';
  }

  renderCombatItemPicker() {
    let picker = $('combat-item-picker');
    if (picker) { picker.remove(); return; }
    picker = document.createElement('div');
    picker.id = 'combat-item-picker';
    const inv = this.game.inventory;
    let any = false;
    inv.slots.forEach((s, i) => {
      if (!s) return;
      const def = ITEMS[s.item];
      if (def.type !== 'food' && def.type !== 'potion') return;
      any = true;
      const b = document.createElement('button');
      b.className = 'combat-btn';
      b.innerHTML = `${itemIconHTML(s.item, 14)} ${def.label}<span class="cb-sub">×${s.qty}${def.heal ? ` · +${def.heal}hp` : ''}</span>`;
      b.addEventListener('click', () => { this.game.combat.useItem(i); picker.remove(); });
      picker.appendChild(b);
    });
    if (!any) {
      picker.innerHTML = '<div class="combat-btn">No usable items</div>';
      setTimeout(() => picker.remove(), 1500);
    }
    $('combat-ui').appendChild(picker);
  }

  renderCombatLog() {
    const combat = this.game.combat;
    if (!combat.log) return;
    $('combat-log').innerHTML = combat.log.slice(-9).map((l) => `<div class="cl-line">${l}</div>`).join('');
  }

  showTargetInfo(info, preview) {
    const el = $('target-info');
    if (!info) { el.classList.add('hidden'); return; }
    el.classList.remove('hidden');
    el.innerHTML = `<h4>${info.label} — ${info.hp}/${info.maxHp} HP</h4>
      <div class="ti-desc">${info.desc}</div>
      ${info.stats ? `<div>ATK ${info.stats.atk} · ARM ${info.stats.armor} · EVA ${info.stats.evasion} · SPD ${info.stats.speed}</div>` : ''}
      ${info.elements ? `<div>Weak: ${info.elements.weak.join(', ') || '—'} · Resists: ${info.elements.resist.join(', ') || '—'}</div>` : ''}
      ${info.statuses?.length ? `<div>${info.statuses.map((s) => `${STATUS_INFO[s.id]?.icon} ${STATUS_INFO[s.id]?.label} (${s.turns})`).join(' · ')}</div>` : ''}
      ${info.intent ? `<div style="color:var(--bad);font-weight:600">! ${info.intent}</div>` : ''}
      ${preview ? `<div style="margin-top:6px;border-top:1px solid var(--edge);padding-top:6px">
        Hit ${preview.hitChance}% · Damage ${preview.dmgMin}–${preview.dmgMax} · Crit ${Math.round(preview.crit)}%</div>` : ''}
      <div style="color:var(--ink-dim);margin-top:4px;font-style:italic">${info.recommend || ''}</div>`;
  }

  // tiles for renderer overlays during combat
  getCombatTiles() {
    const combat = this.game.combat;
    if (!combat.active) return [];
    const tiles = [];
    const cbSafe = this.game.settings.colorblind;
    if (this.combatMode === 'move') {
      for (const key of combat.getMovableTiles().keys()) {
        const t = combat.tiles.get(key);
        tiles.push({ x: t.gx, y: t.y, z: t.gz, color: cbSafe ? [0.0, 0.45, 0.7] : [0.3, 0.8, 0.35] });
      }
    } else if (this.combatMode?.ability) {
      for (const id of combat.getAbilityTargets(this.combatMode.ability)) {
        const e = combat.combatants.find((c) => c.id === id);
        const t = combat.tileAt(e.gx, e.gz);
        if (t) tiles.push({ x: t.gx, y: t.y, z: t.gz, color: cbSafe ? [0.9, 0.6, 0.0] : [0.9, 0.25, 0.2] });
      }
    }
    for (const t of combat.dangerTiles()) {
      tiles.push({ x: t.gx, y: t.y, z: t.gz, color: cbSafe ? [0.85, 0.35, 0.0] : [0.95, 0.55, 0.1] });
    }
    // current combatant tile
    const cur = combat.current();
    if (cur) {
      const t = combat.tileAt(cur.gx, cur.gz);
      if (t) tiles.push({ x: t.gx, y: t.y, z: t.gz, color: [0.9, 0.85, 0.4] });
    }
    return tiles;
  }

  // ------------------------------------------------------------ world labels
  updateLabels(labels) {
    // labels: [{x,y,z,name,sub,hpFrac,intent}] — projected via renderer
    const renderer = this.game.renderer;
    const hud = $('hud');
    while (this.labelPool.length < labels.length) {
      const el = document.createElement('div');
      el.className = 'world-label';
      hud.appendChild(el);
      this.labelPool.push(el);
    }
    for (let i = 0; i < this.labelPool.length; i++) {
      const el = this.labelPool[i];
      const l = labels[i];
      if (!l) { el.style.display = 'none'; continue; }
      const pr = renderer.project(l.x, l.y, l.z);
      if (!pr || pr[2] > 40) { el.style.display = 'none'; continue; }
      el.style.display = '';
      // position updates every frame (cheap); the innerHTML (a DOM parse) is
      // rebuilt only when the label's content actually changes
      el.style.left = `${pr[0]}px`;
      el.style.top = `${pr[1]}px`;
      const key = `${l.intent || ''}|${l.name}|${l.sub || ''}|${l.color || ''}|${l.hpFrac != null ? Math.round(l.hpFrac * 100) : ''}`;
      if (el._lblKey !== key) {
        el._lblKey = key;
        el.innerHTML = `${l.intent ? `<div class="wl-intent">${l.intent}</div>` : ''}
          <div class="wl-name" style="color:${l.color || '#fff'}">${l.name}</div>
          ${l.sub ? `<div style="color:var(--ink-dim);font-size:10px">${l.sub}</div>` : ''}
          ${l.hpFrac != null ? `<div class="wl-bar"><div style="width:${l.hpFrac * 100}%"></div></div>` : ''}`;
      }
    }
  }
}
