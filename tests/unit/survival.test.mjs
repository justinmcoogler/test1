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
