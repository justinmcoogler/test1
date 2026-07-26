// The two yaw conventions, and the conversion between them.
//
// This file exists because getting it wrong is invisible in single player and
// obvious the moment a second person joins: every remote player was drawn facing
// exactly backwards, because the wire carries a LOOK yaw and collectEntities
// handed it straight to the renderer as a MODEL yaw.
//
// The two are checked here against the SAME arithmetic the code they describe
// uses — js/player/player.js for the look direction, js/gfx/renderer.js for the
// model matrix — so a change to either one fails here rather than in a living
// room.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { modelYawFromLook } from '../../js/gfx/renderer.js';

// Where a camera at this yaw is looking, per js/player/player.js: the forward
// axis is (-sin y, -cos y), which is why yaw 0 looks down -Z.
const lookDir = (y) => [-Math.sin(y), -Math.cos(y)];

// Where a model at this yaw faces, per the base matrix in Renderer.drawEntities:
// local +Z is mapped to column 2, which is (sin y, cos y).
const modelDir = (y) => [Math.sin(y), Math.cos(y)];

const close = (a, b, what) => assert.ok(
  Math.abs(a[0] - b[0]) < 1e-9 && Math.abs(a[1] - b[1]) < 1e-9,
  `${what}: [${a.map((n) => n.toFixed(3))}] vs [${b.map((n) => n.toFixed(3))}]`,
);

test('a converted look yaw draws a body facing where that person is looking', () => {
  for (let y = -Math.PI * 2; y <= Math.PI * 2; y += Math.PI / 8) {
    close(modelDir(modelYawFromLook(y)), lookDir(y), `yaw ${y.toFixed(2)}`);
  }
});

test('and the raw look yaw draws it facing precisely the other way', () => {
  // The bug, pinned down: not a random rotation, exactly 180 degrees, which is
  // why it read as "the skins are backwards" rather than as broken maths.
  for (const y of [0, 1, -2.5, Math.PI / 3]) {
    const wrong = modelDir(y), right = lookDir(y);
    close([-wrong[0], -wrong[1]], right, `yaw ${y}`);
  }
});

test('the cardinal directions, spelled out', () => {
  const dirs = [
    [0, [0, -1], 'north (-Z)'],
    [Math.PI / 2, [-1, 0], 'west (-X)'],
    [Math.PI, [0, 1], 'south (+Z)'],
    [-Math.PI / 2, [1, 0], 'east (+X)'],
  ];
  for (const [look, expect, name] of dirs) {
    close(lookDir(look), expect, `looking ${name}`);
    close(modelDir(modelYawFromLook(look)), expect, `body drawn facing ${name}`);
  }
});
