// Realism combat pass: default play is de-magicked. Magic is Fantasy Frontier
// content, healing is real Medicine (no mana), and wounds bleed.
import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_SETTINGS } from '../../js/game/save.js';
import { RS_STYLES, RS_SPECIALS, CombatRS } from '../../js/game/combatrs.js';
import { ABILITIES } from '../../js/game/combat.js';
import { Player } from '../../js/player/player.js';

test('Fantasy Frontier is off by default', () => {
  assert.equal(DEFAULT_SETTINGS.fantasyFrontier, false);
});

test('real-time combat: magic is frontier-gated, healing is mana-free', () => {
  assert.equal(RS_STYLES.magic.frontier, true, 'magic style must be frontier content');
  assert.equal(RS_SPECIALS.ember_burst.frontier, true, 'ember_burst must be frontier content');

  const bandage = RS_SPECIALS.bandage;
  assert.ok(bandage, 'a real "bandage" heal replaces the mana "mend"');
  assert.equal(bandage.kind, 'heal');
  assert.ok(bandage.energy > 0, 'bandage costs stamina, not mana');
  assert.equal(bandage.mana, undefined, 'bandage must not cost mana');
  assert.equal(RS_SPECIALS.mend, undefined, 'the mana heal "mend" is gone');

  // No default (non-frontier) special may cost mana.
  for (const [id, sp] of Object.entries(RS_SPECIALS)) {
    if (sp.frontier) continue;
    assert.equal(sp.mana, undefined, `${id} is default content and must not use mana`);
  }
});

function stubGame(frontier, hasMagic = true) {
  return {
    settings: { fantasyFrontier: frontier },
    inventory: {
      weapon: (s) => (s === 'magic' ? (hasMagic ? { atk: 5, range: 5 } : null)
        : s === 'ranged' ? null : { atk: 3 }),
      equipStats: () => ({ armor: 0, evasion: 0, crit: 0, magic: 0 }),
    },
    skills: { level: () => 50 },
  };
}

test('magic combat style is hidden without the Fantasy Frontier', () => {
  const off = new CombatRS(stubGame(false, true));
  assert.ok(!off.availableStyles().includes('magic'), 'magic style hidden in real-world play');

  const on = new CombatRS(stubGame(true, true));
  assert.ok(on.availableStyles().includes('magic'), 'magic style returns with the Frontier on');
});

test('a stale Magic style is force-reset once the Frontier is off', () => {
  const rs = new CombatRS(stubGame(false, true));
  rs.style = 'magic';   // as if chosen while the Frontier was enabled
  rs.update(0.1);       // a normal real-world tick must not keep casting
  assert.notEqual(rs.style, 'magic', 'magic style cannot persist in real-world play');
  assert.equal(rs.style, 'balanced');
});

test('useSpecial refuses a frontier special in real-world play', () => {
  const rs = new CombatRS(stubGame(false, true));
  rs.style = 'magic';   // even with a stale style, execution must refuse
  assert.equal(rs.useSpecial('ember_burst'), false);
});

test('specials: bandage always available, ember_burst only on the Frontier', () => {
  const off = new CombatRS(stubGame(false, true));
  off.style = 'balanced';
  const offIds = off.availableSpecials().map((s) => s.id);
  assert.ok(offIds.includes('bandage'), 'Medicine bandage is a real-world special');
  assert.ok(!offIds.includes('ember_burst'), 'no fire spell in real-world play');

  const on = new CombatRS(stubGame(true, true));
  on.style = 'magic';
  const onIds = on.availableSpecials().map((s) => s.id);
  assert.ok(onIds.includes('ember_burst'), 'ember_burst returns with the Frontier on');
});

test('turn-based combat: spells are frontier-flagged, bandage is not', () => {
  for (const id of ['spark', 'frost_bind', 'ember_burst', 'mend', 'rally']) {
    assert.equal(ABILITIES[id]?.frontier, true, `${id} must be frontier content`);
  }
  assert.ok(ABILITIES.bandage, 'a real bandage ability exists');
  assert.ok(!ABILITIES.bandage.frontier, 'bandage is real-world content');
  assert.equal(ABILITIES.bandage.mana, undefined, 'bandage costs no mana');
  assert.ok(ABILITIES.bandage.energy > 0, 'bandage costs stamina');
});

test('bleeding: drains health over time, then clots', () => {
  const p = new Player();
  p.maxHp = 40; p.hp = 40;
  p.applyBleed(3, 2);
  assert.equal(p.bleeding, 3);
  for (let i = 0; i < 8; i++) p.tickBleed(0.5); // 4 simulated seconds
  assert.equal(p.hp, 34, 'three 1s ticks of 2 damage');
  assert.equal(p.bleeding, 0, 'bleed clots after its duration');
  assert.equal(p.bleedDps, 0);
});

test('bleeding: worst wound wins, no runaway stacking', () => {
  const p = new Player();
  p.applyBleed(3, 2);
  p.applyBleed(2, 5);   // shorter but deeper
  assert.equal(p.bleeding, 3, 'keeps the longer duration');
  assert.equal(p.bleedDps, 5, 'keeps the higher rate');
});

test('bleeding: debug is immune, respawn and stopBleeding clear it', () => {
  const d = new Player();
  d.debug = true;
  d.applyBleed(5, 3);
  assert.equal(d.bleeding, 0, 'no bleeding in debug/creative mode');

  const p = new Player();
  p.applyBleed(5, 3);
  p.stopBleeding();
  assert.equal(p.bleeding, 0);

  p.applyBleed(5, 3);
  p.respawnAt(1, 1, 1);
  assert.equal(p.bleeding, 0, 'respawn wipes wounds');
});
