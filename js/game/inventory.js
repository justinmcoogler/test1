// Inventory (32 slots, first 8 = hotbar), equipment (11 slots), durability.
import { ITEMS } from './items.js';
import { emit } from '../core/events.js';

export const INV_SIZE = 32;
export const HOTBAR_SIZE = 8;
export const EQUIP_SLOTS = ['head', 'body', 'legs', 'hands', 'feet', 'main', 'off', 'ranged', 'accessory1', 'accessory2', 'utility'];
export const EQUIP_LABELS = {
  head: 'Head', body: 'Body', legs: 'Legs', hands: 'Hands', feet: 'Feet',
  main: 'Main Hand', off: 'Off Hand', ranged: 'Ranged', accessory1: 'Accessory I',
  accessory2: 'Accessory II', utility: 'Utility',
};

export class Inventory {
  constructor() {
    this.slots = new Array(INV_SIZE).fill(null); // {item, qty, dur?}
    this.equipment = {};                          // slot → {item, dur}
    for (const s of EQUIP_SLOTS) this.equipment[s] = null;
    this.coins = 0;
    this.selected = 0; // hotbar index
  }

  selectedStack() { return this.slots[this.selected]; }

  add(itemId, qty = 1, dur = null) {
    const def = ITEMS[itemId];
    if (!def) { console.warn('unknown item', itemId); return 0; }
    if (itemId === 'coin') { this.coins += qty; emit('coinsChanged', this.coins); emit('itemGained', { item: itemId, qty }); return qty; }
    let remaining = qty;
    if (def.stack > 1) {
      for (let i = 0; i < INV_SIZE && remaining > 0; i++) {
        const s = this.slots[i];
        if (s && s.item === itemId && s.qty < def.stack) {
          const take = Math.min(def.stack - s.qty, remaining);
          s.qty += take; remaining -= take;
        }
      }
    }
    for (let i = 0; i < INV_SIZE && remaining > 0; i++) {
      if (!this.slots[i]) {
        const take = Math.min(def.stack, remaining);
        this.slots[i] = { item: itemId, qty: take };
        if (def.dur) this.slots[i].dur = dur ?? def.dur;
        remaining -= take;
      }
    }
    const added = qty - remaining;
    if (added > 0) emit('itemGained', { item: itemId, qty: added });
    if (remaining > 0) emit('inventoryFull', { item: itemId, qty: remaining });
    emit('inventoryChanged');
    return added;
  }

  count(itemId) {
    if (itemId === 'coin') return this.coins;
    return this.slots.reduce((n, s) => n + (s && s.item === itemId ? s.qty : 0), 0);
  }

  // How many of an item could be added without losing any (free slots + stack room).
  capacityFor(itemId) {
    const def = ITEMS[itemId];
    if (!def) return 0;
    if (itemId === 'coin') return Infinity;
    let cap = 0;
    for (const s of this.slots) {
      if (!s) cap += def.stack;
      else if (s.item === itemId && def.stack > 1) cap += def.stack - s.qty;
    }
    return cap;
  }

  canFit(itemId, qty = 1) { return this.capacityFor(itemId) >= qty; }

  remove(itemId, qty = 1) {
    if (itemId === 'coin') {
      const take = Math.min(this.coins, qty);
      this.coins -= take; emit('coinsChanged', this.coins);
      return take;
    }
    let remaining = qty;
    for (let i = INV_SIZE - 1; i >= 0 && remaining > 0; i--) {
      const s = this.slots[i];
      if (s && s.item === itemId) {
        const take = Math.min(s.qty, remaining);
        s.qty -= take; remaining -= take;
        if (s.qty <= 0) this.slots[i] = null;
      }
    }
    emit('inventoryChanged');
    return qty - remaining;
  }

  removeSlot(idx, qty = 1) {
    const s = this.slots[idx];
    if (!s) return null;
    s.qty -= qty;
    const removed = { ...s, qty };
    if (s.qty <= 0) this.slots[idx] = null;
    emit('inventoryChanged');
    return removed;
  }

  hasAll(reqs) { return reqs.every((r) => this.count(r.item) >= r.qty); }
  consumeAll(reqs) {
    if (!this.hasAll(reqs)) return false;
    for (const r of reqs) this.remove(r.item, r.qty);
    return true;
  }

  moveSlot(from, to) {
    if (from === to) return;
    const a = this.slots[from], b = this.slots[to];
    if (a && b && a.item === b.item && !ITEMS[a.item].dur) {
      const max = ITEMS[a.item].stack;
      const take = Math.min(max - b.qty, a.qty);
      b.qty += take; a.qty -= take;
      if (a.qty <= 0) this.slots[from] = null;
    } else {
      this.slots[from] = b; this.slots[to] = a;
    }
    emit('inventoryChanged');
  }

  // Best tool of a kind anywhere in inventory (hotbar-selected wins ties,
  // but a deliberately-selected lower-tier tool never blocks tier gates).
  bestTool(kind) {
    let best = null, bestSlot = -1;
    this.slots.forEach((s, i) => {
      if (!s) return;
      const def = ITEMS[s.item];
      if (def.type === 'tool' && def.tool === kind) {
        if (!best || def.tier > ITEMS[best.item].tier) { best = s; bestSlot = i; }
      }
    });
    const sel = this.selectedStack();
    if (sel && ITEMS[sel.item]?.tool === kind && best && ITEMS[sel.item].tier >= ITEMS[best.item].tier) {
      return { stack: sel, slot: this.selected };
    }
    return best ? { stack: best, slot: bestSlot } : null;
  }

  damageTool(stack, amount = 1) {
    if (!stack || stack.dur == null) return;
    stack.dur -= amount;
    if (stack.dur <= 0) {
      const idx = this.slots.indexOf(stack);
      if (idx >= 0) this.slots[idx] = null;
      emit('toolBroke', { item: stack.item });
      emit('inventoryChanged');
    }
  }

  // ---- equipment ----
  equipFromSlot(idx) {
    const s = this.slots[idx];
    if (!s) return false;
    const def = ITEMS[s.item];
    let slot = null;
    if (def.type === 'weapon') slot = def.wclass === 'ranged' ? 'ranged' : 'main';
    else if (def.type === 'armor') slot = def.slot;
    else if (def.type === 'accessory') slot = this.equipment.accessory1 ? 'accessory2' : 'accessory1';
    else if (def.type === 'utility') slot = 'utility';
    if (!slot) return false;
    const prev = this.equipment[slot];
    this.equipment[slot] = { item: s.item, dur: s.dur ?? def.dur ?? null };
    this.slots[idx] = null;
    if (prev) this.add(prev.item, 1, prev.dur);
    emit('equipmentChanged', { slot, item: s.item });
    emit('inventoryChanged');
    return true;
  }

  unequip(slot) {
    const e = this.equipment[slot];
    if (!e) return false;
    if (this.add(e.item, 1, e.dur) < 1) return false; // inventory full
    this.equipment[slot] = null;
    emit('equipmentChanged', { slot, item: null });
    return true;
  }

  // Aggregate combat/gather stats from all equipped items.
  equipStats() {
    const st = { armor: 0, evasion: 0, speed: 0, crit: 0, magic: 0, magicResist: 0, mana: 0, hp: 0, gather: 0, block: 0, warmth: 0 };
    for (const slot of EQUIP_SLOTS) {
      const e = this.equipment[slot];
      if (!e) continue;
      const def = ITEMS[e.item];
      for (const k of Object.keys(st)) if (def[k]) st[k] += def[k];
    }
    return st;
  }

  weapon(style) {
    // style: melee|ranged|magic → the relevant equipped weapon def or null
    const main = this.equipment.main ? ITEMS[this.equipment.main.item] : null;
    const rng = this.equipment.ranged ? ITEMS[this.equipment.ranged.item] : null;
    if (style === 'ranged') return rng && rng.wclass === 'ranged' ? rng : null;
    if (style === 'magic') return main && main.wclass === 'magic' ? main : null;
    return main && main.wclass === 'melee' ? main : null;
  }

  damageEquipped(slot, amount = 1) {
    const e = this.equipment[slot];
    if (!e || e.dur == null) return;
    e.dur -= amount;
    if (e.dur <= 0) {
      emit('toolBroke', { item: e.item });
      this.equipment[slot] = null;
      emit('equipmentChanged', { slot, item: null });
    }
  }

  serialize() {
    return {
      slots: this.slots.map((s) => (s ? [s.item, s.qty, s.dur ?? -1] : 0)),
      equipment: Object.fromEntries(
        EQUIP_SLOTS.map((k) => [k, this.equipment[k] ? [this.equipment[k].item, this.equipment[k].dur ?? -1] : 0])
      ),
      coins: this.coins,
      selected: this.selected,
    };
  }

  deserialize(d) {
    if (!d) return;
    this.slots = (d.slots || []).map((s) => {
      if (!s) return null;
      const [item, qty, dur] = s;
      if (!ITEMS[item]) return null;
      const st = { item, qty };
      if (dur >= 0) st.dur = dur;
      return st;
    });
    while (this.slots.length < INV_SIZE) this.slots.push(null);
    for (const k of EQUIP_SLOTS) {
      const e = d.equipment?.[k];
      this.equipment[k] = e && ITEMS[e[0]] ? { item: e[0], dur: e[1] >= 0 ? e[1] : null } : null;
    }
    this.coins = d.coins || 0;
    this.selected = d.selected || 0;
  }
}
