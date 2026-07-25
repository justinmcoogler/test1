// Drives the real game in headless Chromium to prove a character is genuinely
// portable, which no unit test can: play a world, earn something, quit, start a
// SECOND world on a different seed with the same character, and check the skills
// and the pack came along while the terrain, the quests and the clock did not.
//
// Then take them off the device entirely — export a code, wipe storage, import
// it back — because "portable" that only works inside one browser profile is
// not portable.
//
//   node tests/_portable.mjs
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';

const PORT = 8778;
const fails = [];
const check = (ok, what) => { console.log(`${ok ? '  ok  ' : ' FAIL '} ${what}`); if (!ok) fails.push(what); };

const server = spawn('node', ['tests/server.mjs', String(PORT)], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 800));
const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium',
  args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

const boot = async (seed, slotIndex) => {
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
  await page.waitForSelector('.slot-btn');
  if (seed !== null) await page.fill('#seed-input', seed);
  await page.locator('.slot-btn').nth(slotIndex).click();
  await page.waitForSelector('#hud:not(.hidden)', { timeout: 60000 });
  await page.waitForTimeout(900);
};

try {
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
  await page.evaluate(() => localStorage.clear());

  // ---- world one: make this character distinctive ------------------------
  await boot('worldone', 0);
  const one = await page.evaluate(async () => {
    const g = window.__game;
    const { xpForLevel } = await import('/js/game/skills.js');
    // Asked for by LEVEL rather than by a raw XP number — the curve is steep and
    // a hard-coded 250000 turns out to be level 33, not the 70 it looks like.
    g.skills.xp.mining = xpForLevel(70);       // a level you would not want to lose
    g.inventory.add('iron_bar', 9);
    g.stable.feed('rat', 99);                  // a tamed pet
    g.flags.boss_gorrak = true;                // a WORLD fact, must not travel
    g.world.setBlock(6, 65, 8, 1, true);       // a dug block, likewise
    g.player.x = 40.5; g.player.z = -30.5;     // a coordinate, likewise
    g.world.time = 5000;
    g.saveGame();
    return {
      mining: g.skills.level('mining'),
      bars: g.inventory.count('iron_bar'),
      pet: g.stable.has('rat'),
      miningXp: g.skills.xp.mining,
      charId: g.characterId,
      seed: g.seedText,
      edits: g.world.editedBlocks.size,
    };
  });
  check(one.mining === 70, `world one: a real Mining level to lose (${one.mining})`);
  check(!!one.charId, `and the save minted a character (${one.charId})`);

  // The two halves really are two records in storage.
  const stored = await page.evaluate(() => {
    const keys = Object.keys(localStorage);
    return {
      chars: keys.filter((k) => k.startsWith('sproutlands_char_')).length,
      slots: keys.filter((k) => k.startsWith('sproutlands_slot_')).length,
      slotHasSkills: !!JSON.parse(localStorage.getItem('sproutlands_slot_1') || '{}').skills,
      slotHasWorld: !!JSON.parse(localStorage.getItem('sproutlands_slot_1') || '{}').world,
    };
  });
  check(stored.chars === 1 && stored.slots === 1, `one character and one world on disk (${stored.chars}/${stored.slots})`);
  check(!stored.slotHasSkills, 'the world record does not carry the skills');
  check(stored.slotHasWorld, 'and it does carry the terrain');

  // ---- world two: same character, different seed --------------------------
  const carried = await page.evaluate(() => {
    // Select the character the way the character screen does, then open slot 2.
    const raw = Object.keys(localStorage).find((k) => k.startsWith('sproutlands_char_'));
    window.__pickChar = JSON.parse(localStorage.getItem(raw));
    return window.__pickChar.id;
  });
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
  await page.waitForSelector('.slot-btn');
  await page.fill('#seed-input', 'worldtwo');
  // Go through the real character screen rather than poking startGame, so the
  // button wiring is under test too.
  await page.click('#characters-btn');
  await page.waitForSelector('#character-list .slot-btn');
  await page.locator('#character-list .link-btn', { hasText: 'Play' }).first().click();
  await page.click('#char-back');
  await page.waitForSelector('#save-slots .slot-btn');
  await page.fill('#seed-input', 'worldtwo');
  await page.locator('.slot-btn').nth(1).click();
  await page.waitForSelector('#hud:not(.hidden)', { timeout: 60000 });
  await page.waitForTimeout(900);

  const two = await page.evaluate(() => {
    const g = window.__game;
    return {
      seed: g.seedText,
      charId: g.characterId,
      mining: g.skills.level('mining'),
      bars: g.inventory.count('iron_bar'),
      pet: g.stable.has('rat'),
      boss: !!g.flags.boss_gorrak,
      edits: g.world.editedBlocks.size,
      time: g.world.time,
      at: [g.player.x, g.player.z],
      spawn: g.world.markers.spawn,
    };
  });
  check(two.seed === 'worldtwo', `world two is a different seed (${two.seed})`);
  check(two.charId === carried, 'and it is the same character');
  // What travels.
  check(two.mining === one.mining, `Mining came along (${two.mining})`);
  check(two.bars === one.bars, `the pack came along (${two.bars} bars)`);
  check(two.pet, 'and so did the tamed rat');
  // What does not.
  check(!two.boss, 'Gorrak is alive again in the new world');
  check(two.edits === 0, `the terrain is untouched (${two.edits} edits)`);
  check(two.time < 1000, `and the clock started over (${Math.round(two.time)}s)`);
  const spawnDist = Math.hypot(two.at[0] - (two.spawn[0] + 0.5), two.at[1] - (two.spawn[2] + 0.5));
  check(spawnDist < 6, `you arrive at the new world's spawn, not the old coordinate (${spawnDist.toFixed(1)} blocks off)`);

  // ---- world one is still intact --------------------------------------
  await boot(null, 0);
  const back = await page.evaluate(() => {
    const g = window.__game;
    return { seed: g.seedText, boss: !!g.flags.boss_gorrak, edits: g.world.editedBlocks.size, at: [g.player.x, g.player.z] };
  });
  check(back.seed === 'worldone', 'the first world is still there');
  check(back.boss && back.edits > 0, 'with its dead boss and its dug block');
  check(Math.hypot(back.at[0] - 40.5, back.at[1] + 30.5) < 6,
    `and it put you back where you left it (${back.at.map((v) => v.toFixed(1))})`);

  // ---- off the device entirely ------------------------------------------
  const moved = await page.evaluate(async () => {
    const m = await import('/js/game/characters.js');
    const raw = Object.keys(localStorage).find((k) => k.startsWith('sproutlands_char_'));
    const code = m.exportCharacter(JSON.parse(localStorage.getItem(raw)));
    localStorage.clear();                       // a different device, in effect
    const r = m.importCharacter(code);
    if (!r.ok) return { ok: false, error: r.error };
    m.saveCharacter(r.character);
    return {
      ok: true, codeLen: code.length,
      mining: r.character.skills?.mining,
      pets: r.character.stable?.pets,
      after: m.listCharacters().length,
    };
  });
  check(moved.ok, `the character exports to a code${moved.ok ? ` (${moved.codeLen} chars)` : `: ${moved.error}`}`);
  check(moved.mining > 0 && moved.mining === one.miningXp,
    'and imports on a wiped device with the Mining intact');
  check(Array.isArray(moved.pets) && moved.pets.includes('rat'), 'and still owns the rat');
  check(moved.after === 1, 'landing as exactly one character');

  check(errors.length === 0, `no console errors${errors.length ? `: ${errors[0]}` : ''}`);
  await page.screenshot({ path: 'tests/screenshots/portable.png' });
} catch (e) {
  console.error('PORTABLE ERROR', e);
  fails.push('exception');
} finally {
  await browser.close();
  server.kill();
}

console.log(fails.length ? `\nPORTABLE FAIL (${fails.length})` : '\nPORTABLE PASS');
process.exit(fails.length ? 1 : 0);
