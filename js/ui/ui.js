// All DOM UI: HUD, windows, dialogue, shop, chest, combat interface, labels.
import { ITEMS } from '../game/items.js';
import { SKILL_DEFS, SKILL_UNLOCKS, xpForLevel } from '../game/skills.js';
import { RECIPES, STATION_LABELS, canCraft, craft, minFuel } from '../game/crafting.js';
import { EQUIP_SLOTS, EQUIP_LABELS, HOTBAR_SIZE, INV_SIZE } from '../game/inventory.js';
import { QUESTS } from '../game/quests.js';
import { NPC_DEFS, DIALOGUES } from '../game/npcs.js';
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
    document.querySelectorAll('.menu-btn').forEach((b) => { b.innerHTML = icon(menuIcons[b.dataset.win], 22); });
    const touchIcons = { 'btn-jump': 'arrowup', 'btn-sprint': 'chevrons', 'btn-action': 'handstar', 'btn-place': 'blockicon' };
    for (const [id, name] of Object.entries(touchIcons)) {
      const el = $(id);
      if (el) el.innerHTML = icon(name, id === 'btn-action' ? 30 : 22);
    }
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
    document.querySelectorAll('.menu-btn').forEach((b) => {
      b.addEventListener('click', () => { this.toggleWindow(b.dataset.win); });
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
    $('hp-fill').style.width = `${(p.hp / p.maxHp) * 100}%`;
    $('hp-text').textContent = `HP ${Math.ceil(p.hp)}/${p.maxHp}`;
    $('energy-fill').style.width = `${(p.energy / p.maxEnergy) * 100}%`;
    $('energy-text').textContent = `STA ${Math.floor(p.energy)}`;
    // mana is Fantasy Frontier only — the bar is hidden in real-world play
    const manaBar = $('mana-fill').parentElement;
    if (this.game.settings?.fantasyFrontier === true) {
      manaBar.style.display = '';
      $('mana-fill').style.width = `${(p.mana / p.maxMana) * 100}%`;
      $('mana-text').textContent = `MP ${Math.floor(p.mana)}/${p.maxMana}`;
    } else {
      manaBar.style.display = 'none';
    }
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
    // weather + season badge (glyph art pending — text with a weather-tinted dot)
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
      const key = `${wd.label}|${wsys.season}|${dot}`;
      if (this._envKey !== key) { // only touch the DOM when it actually changes
        this._envKey = key;
        eb.innerHTML = `<span class="env-dot" style="background:${dot}"></span>${wd.label} · ${wsys.season}`;
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
    if (!act.length) { el.innerHTML = '<div class="qt-name">No active quest</div><div class="qt-progress">Talk to Elder Maren in Brookhollow</div>'; return; }
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

  showLessonSuccess(lesson) {
    this.toast(lesson.success, 'gold');
    SFX.questDone();
    // a burst of gold sparkles over the work mat
    const m = this.game.world?.markers?.learnMat;
    if (m && this.game.renderer?.spawnParticles) {
      const cx = (m.x0 + m.x1) / 2 + 0.5, cz = (m.z0 + m.z1) / 2 + 0.5;
      this.game.renderer.spawnParticles(cx, m.y0 + 0.6, cz, [1, 0.85, 0.3], 30, 3, 1.0, 0.12);
    }
  }

  showLessonHint(lesson) { this.toast(lesson.hint, ''); }

  drawCompass() {
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
    // time of day: sun (day) or moon (night) at the compass edge
    const w = this.game.world;
    const night = w.isNight();
    const cx3 = canvas.width - 13, cy3 = 13;
    ctx.fillStyle = night ? '#c8d2e8' : '#ffd76a';
    ctx.beginPath();
    ctx.arc(cx3, cy3, 5, 0, Math.PI * 2);
    ctx.fill();
    if (night) { // crescent
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.beginPath();
      ctx.arc(cx3 - 3, cy3 - 1, 4.4, 0, Math.PI * 2);
      ctx.fill();
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
          const biome = gen.biomeAt(wx, wz);
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
    for (let dz = -4; dz <= 4; dz++) {
      for (let dx = -4; dx <= 4; dx++) {
        const cx = pcx + dx, cz = pcz + dz;
        if (!this.game.discovered.has(`${cx},${cz}`)) continue;
        const tile = this.chunkTileCanvas(cx, cz);
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(
          tile,
          half + (cx * CHUNK - p.x) * scale,
          half + (cz * CHUNK - p.z) * scale,
          CHUNK * scale, CHUNK * scale
        );
        ctx.restore();
      }
    }
    // quest / travel markers (clamped to the minimap edge when far away)
    const dot = (wx, wz) => {
      const mx = half + (wx - p.x) * scale, mz = half + (wz - p.z) * scale;
      const cx2 = Math.max(6, Math.min(canvas.width - 6, mx));
      const cz2 = Math.max(6, Math.min(canvas.height - 6, mz));
      ctx.fillStyle = '#e2b13c';
      ctx.beginPath();
      ctx.arc(cx2, cz2, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#000'; ctx.stroke();
    };
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
      case 'settings': return this.renderSettings(body);
    }
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
    const ORDER = ['Gathering', 'Processing', 'Survival', 'Combat', 'Knowledge', 'Frontier'];
    const groups = {};
    for (const g of ORDER) groups[g] = [];
    const showFrontier = this.game.settings.fantasyFrontier === true;
    for (const [key, def] of Object.entries(SKILL_DEFS)) {
      if (def.frontier && !showFrontier) continue; // fantasy skills hidden on the real-world route
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
    if (!active.length) html += '<div style="color:var(--ink-dim);margin-bottom:12px">Nothing right now — talk to the villagers of Brookhollow.</div>';
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
      <div style="color:var(--ink-dim);font-size:12px;margin-top:6px">
        Click an explored spot to walk there. Gold diamond: Brookhollow · gold dot: quest objective · gold cross: travel mark · white arrow: you.
      </div>`;
    const canvas = $('map-canvas');
    canvas.width = Math.max(320, Math.min(760, (window.innerWidth || 800) - 100));
    canvas.height = Math.max(280, Math.min(520, (window.innerHeight || 640) - 240));
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
      ctx.drawImage(tile, ox + cx * CHUNK * scale, oz + cz * CHUNK * scale, CHUNK * scale, CHUNK * scale);
    }
    const diamond = (x, y, r, fill) => {
      ctx.fillStyle = fill;
      ctx.beginPath();
      ctx.moveTo(x, y - r); ctx.lineTo(x + r, y); ctx.lineTo(x, y + r); ctx.lineTo(x - r, y);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#000'; ctx.stroke();
    };
    diamond(ox, oz, 6, '#e2b13c'); // Brookhollow (world origin)
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

  // ---- settings ----
  renderSettings(body) {
    const s = this.game.settings;
    const row = (label, control) => `<div class="setting-row"><label>${label}</label>${control}</div>`;
    const range = (key, min, max, step) =>
      `<span style="display:flex;align-items:center;gap:6px"><input type="range" data-set="${key}" min="${min}" max="${max}" step="${step}" value="${s[key]}"><span class="set-val">${s[key]}</span></span>`;
    const check = (key) => `<input type="checkbox" data-set="${key}" ${s[key] ? 'checked' : ''}>`;
    body.innerHTML = `<div class="settings-grid">
      ${row('Classic camera — third person, click to move (V)', check('classicCamera'))}
      ${row('Render distance (chunks)', range('renderDistance', 2, 8, 1))}
      ${row('Camera sensitivity', range('sensitivity', 0.2, 3, 0.1))}
      ${row('Invert Y axis', check('invertY'))}
      ${row('UI scale', range('uiScale', 0.7, 1.6, 0.05))}
      ${row('Text size', range('textScale', 0.8, 1.5, 0.05))}
      ${row('Quest trail — guide dots toward your objective', check('questTrail'))}
      ${row('XP popups on skill gains', check('xpToasts'))}
      ${row('Reduced motion', check('reducedMotion'))}
      ${row('Screen shake', check('screenShake'))}
      ${row('High-quality sky &amp; water — gradient sky, sun/moon, night stars (needs a decent GPU)', check('highGraphics'))}
      ${row('Colorblind-friendly colors', check('colorblind'))}
      ${row('Fantasy Frontier — off by default; re-enables magic, mana &amp; spellcasting', check('fantasyFrontier'))}
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
    <div style="margin-top:14px;color:var(--ink-dim);font-size:12px;line-height:1.7">
      <b>First person:</b> WASD move · Mouse look (click to capture) · Space jump · Shift sprint · LMB gather/mine/attack · RMB place/interact · F interact · E inventory · K skills · C crafting · J quests · M map · 1–8 hotbar · V camera<br>
      <b>Classic view:</b> click ground to walk · click trees/rocks/creatures/villagers to act · Shift+click (or long-press) a block to break it · RMB place block · left-drag, middle-drag or arrow keys orbit · wheel zoom · click the minimap for the big map, then click anywhere explored to auto-walk there<br>
      <b>Mobile:</b> left stick move · drag right side to look/orbit · Action button holds to gather · Place button builds · in classic view just tap where you want to go
    </div>`;
    body.querySelectorAll('[data-set]').forEach((inp) => {
      inp.addEventListener('input', () => {
        const key = inp.dataset.set;
        s[key] = inp.type === 'checkbox' ? inp.checked : parseFloat(inp.value);
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
    // (chains can start in Brookhollow and end at the frontier)
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
      el.style.left = `${pr[0]}px`;
      el.style.top = `${pr[1]}px`;
      el.innerHTML = `${l.intent ? `<div class="wl-intent">${l.intent}</div>` : ''}
        <div class="wl-name" style="color:${l.color || '#fff'}">${l.name}</div>
        ${l.sub ? `<div style="color:var(--ink-dim);font-size:10px">${l.sub}</div>` : ''}
        ${l.hpFrac != null ? `<div class="wl-bar"><div style="width:${l.hpFrac * 100}%"></div></div>` : ''}`;
    }
  }
}
