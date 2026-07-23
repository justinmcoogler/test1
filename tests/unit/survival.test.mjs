// Survival layer: body temperature (Job 2). Hydration/nutrition (Job 3) will
// extend this file.
import test from 'node:test';
import assert from 'node:assert/strict';
import { Player } from '../../js/player/player.js';

test('cold environment chills the body, saps stamina, then hurts', () => {
  const p = new Player();
  p.maxHp = 200; p.hp = 200; p.energy = 100;
  for (let i = 0; i < 10; i++) p.tickTemperature(1, 0.0, 0.15, 0);
  assert.ok(p.bodyTemp < 0.35, `chilled below comfort (${p.bodyTemp})`);
  assert.ok(['cold', 'hypothermia'].includes(p.tempState));
  assert.ok(p.energy < 100, 'the cold saps stamina');

  for (let i = 0; i < 25; i++) p.tickTemperature(1, 0.0, 0.15, 0);
  assert.equal(p.tempState, 'hypothermia');
  assert.ok(p.hp < 200, 'hypothermia costs health');
});

test('hot environment overheats the body toward heatstroke', () => {
  const p = new Player();
  p.maxHp = 200; p.hp = 200; p.energy = 100;
  for (let i = 0; i < 30; i++) p.tickTemperature(1, 1.0, 0.15, 0);
  assert.ok(p.bodyTemp > 0.65, 'overheated past comfort');
  assert.equal(p.tempState, 'heatstroke');
  assert.ok(p.hp < 200, 'heatstroke costs health');
});

test('a comfortable environment costs nothing', () => {
  const p = new Player();
  p.energy = 100;
  for (let i = 0; i < 20; i++) p.tickTemperature(1, 0.5, 0.15, 0);
  assert.equal(p.tempState, 'ok');
  assert.equal(p.energy, 100, 'no stamina drain when comfortable');
});

test('insulation slows how fast the body follows the environment', () => {
  const bare = new Player();
  const clad = new Player();
  for (let i = 0; i < 5; i++) {
    bare.tickTemperature(1, 0.0, 0.15, 0);
    clad.tickTemperature(1, 0.0, 0.15, 4);
  }
  assert.ok(clad.bodyTemp > bare.bodyTemp, 'insulation keeps you warmer longer');
});

test('respawn resets body temperature to comfortable', () => {
  const p = new Player();
  p.bodyTemp = 0.08; p.tempState = 'hypothermia';
  p.respawnAt(1, 1, 1);
  assert.equal(p.bodyTemp, 0.5);
  assert.equal(p.tempState, 'ok');
});

test('hydration drains on land and refills in water', () => {
  const p = new Player();
  p.hydration = 100;
  for (let i = 0; i < 10; i++) p.tickHydration(1, false, false, false);
  assert.ok(p.hydration < 100, 'thirst grows on dry land');
  const low = p.hydration;
  for (let i = 0; i < 5; i++) p.tickHydration(1, false, false, true); // wading
  assert.ok(p.hydration > low, 'wading lets you drink');
});

test('heat and sprinting accelerate thirst', () => {
  const calm = new Player(); const exert = new Player();
  for (let i = 0; i < 10; i++) {
    calm.tickHydration(1, false, false, false);
    exert.tickHydration(1, true, true, false);
  }
  assert.ok(exert.hydration < calm.hydration, 'heat + sprint costs more water');
});

test('dehydration hurts once water runs out', () => {
  const p = new Player();
  p.maxHp = 200; p.hp = 200; p.hydration = 8; // already dehydrated
  for (let i = 0; i < 5; i++) p.tickHydration(1, false, false, false);
  assert.equal(p.hydState, 'dehydrated');
  assert.ok(p.hp < 200, 'dehydration costs health');
});

test('nutrition decays to malnutrition; eating rebalances the groups', () => {
  const p = new Player();
  p.nutrition = { carb: 5, protein: 5, fat: 5, vitamin: 5 };
  p.tickNutrition(1);
  assert.ok(p.malnourished, 'starved groups read malnourished');
  assert.ok(!p.wellFed);
  // a balanced spread of meals lifts every group
  p.eat({ type: 'food', heal: 10, nutrients: { carb: 60 } });
  p.eat({ type: 'food', heal: 10, nutrients: { protein: 60 } });
  p.eat({ type: 'food', heal: 10, nutrients: { fat: 60 } });
  p.eat({ type: 'food', heal: 10, nutrients: { vitamin: 60 } });
  p.tickNutrition(1);
  assert.ok(!p.malnourished, 'a balanced diet clears malnutrition');
});

test('a plain meal with no tags still feeds, and drink hydrates', () => {
  const p = new Player();
  p.nutrition = { carb: 10, protein: 10, fat: 10, vitamin: 10 };
  p.eat({ type: 'food', heal: 12 }); // untagged meal → default carb+protein
  assert.ok(p.nutrition.carb > 10 && p.nutrition.protein > 10, 'untagged food still feeds');
  p.hydration = 30;
  p.eat({ type: 'potion', hydration: 60 });
  assert.ok(p.hydration > 30, 'a drink slakes thirst');
});
