// Dwarven holds — a carved cavern with a working town inside it, deep under the
// surface.
//
// WHAT MAKES IT NOT A DUNGEON. js/world/dungeon.js is a room-and-corridor graph
// you fight through; js/world/mineshaft.js is a warren you work. This is neither:
// it is somewhere people LIVE, and the whole point is that you come down a stair
// out of the black and into a lit hall three hundred feet across with streets in
// it. So it is built the way js/world/settlements.js builds a town — a plaza,
// terraces, buildings with doors you can walk through, lanterns.
//
// WHAT MAKES IT DWARVEN. A hold is not a village that happens to be underground:
// it is a MINE with a town grown around the head of it, and everything here says
// so. Ore rails run the length of both avenues and out through timbered adits
// into the live seams. A forge row backs onto a lava basin. The masonry is heavy
// and banded with the metal the seam gives. And there are dwarves in it — four
// roles from js/game/npcs.js, placed on the streets they work.
//
// THE THREE THINGS THAT HAVE TO HOLD
//
//  1. CHUNK-LOCALITY, as everywhere else here (js/world/sites.js): the layout is
//     a pure function of (seed, region), no chunk reads a neighbour, and a city
//     spans forty-odd chunks so this is not optional.
//  2. YOU CAN GET IN. There is an entrance shaft from the surface with a real
//     stair in it, because a city you can only reach by tunnelling to a
//     coordinate is a city nobody finds.
//  3. YOU CAN WALK IT. Only stairs and slabs are walkable steps in this game
//     (World.isStep), so every level change — the shaft, the terrace, every
//     doorway — is a stair or it is a wall. This is the failure this project has
//     hit more than any other.
import { B } from './blocks.js';
import { CHUNK, SEA, ringAt } from './worldgen.js';
import { mulberry32, hash2 } from '../core/rng.js';
import {
  ANCHOR, RANGE, anchorIn, regionRange, cachedLayout, nearHandBuilt, padHeight, onRoad,
  beginStamp, overlaps, put, box, walls, putNode, putSpawn, putChest,
  shaftShell, shaftBore, shaftFittings, randInt,
} from './sites.js';
import { settlementNear } from './settlements.js';

const SALT = 331709;
// Very rare. A city every few thousand blocks is a landmark you tell people
// about; one every few hundred is scenery.
export const UC_REGION = 640;
const UC_MARGIN = 150;
const UC_CHANCE = 0.42;

// Conservative reach bound for the cheap chunk reject. Derived, because a bound
// that is too small does not fail loudly — chunks past it stop asking the region
// and the hold comes out with slices missing at a seam:
//
//   an adit mouth sits at UC_RMAX * 0.93                          <= 43
//   and drives out up to ADIT_MAX further                         <= 44
//   plus the bore's own half-width and the timber sets            <=  4
//                                                                  ------
//                                                                     91
//
// A test asserts the real maximum over several seeds never exceeds this.
export const UC_HALF = 96;

const UC_RMIN = 30, UC_RMAX = 46;      // cavern radius
const UC_HALL = 26;                    // ceiling height over the plaza
const TERRACE_H = 5;                   // how far the upper terrace sits above the floor
const ROOF_COVER = 14;                 // solid rock that must remain over the cavern roof
const ADIT_MAX = 44;                   // how far a drift is bored out of the cavern wall

// A hold's masonry, by ring — and the metal it bands its stonework with, which
// is whatever its own seams give up. That is the tell: a hold's walls are an
// inventory of what it mines.
const STYLES = [
  { wall: B.stone_brick, trim: B.cobble, road: B.stone_brick, roof: B.stone_brick_slab,
    lamp: B.torch_post, metal: B.copper_block },
  { wall: B.stone_brick, trim: B.mossy_stone_brick, road: B.stone_brick, roof: B.stone_brick_slab,
    lamp: B.sea_lantern, metal: B.iron_block },
  { wall: B.stone_brick, trim: B.andesite, road: B.andesite, roof: B.stone_brick_slab,
    lamp: B.sea_lantern, metal: B.iron_block },
  { wall: B.deepslate, trim: B.gilded_blackstone, road: B.polished_tuff, roof: B.stone_brick_slab,
    lamp: B.glowstone, metal: B.gold_block },
];

// What the adits are cut for, by ring — the same tables the mineshafts use, so a
// hold's seams are the seams of the rock it is in.
const SEAMS = [
  ['ore_copper', 'ore_tin', 'deposit_coal'],
  ['ore_iron', 'deposit_coal', 'ore_lead'],
  ['ore_iron', 'ore_silver', 'ore_zinc'],
  ['ore_silver', 'ore_gold', 'ore_platinum'],
];

// The four dwarves of a hold, and where each stands: the warden on the plaza,
// the pitmaster at the rail head, the smith at the forge, the cellarer on the
// terrace above.
const FOLK = ['hold_warden', 'hold_miner', 'hold_smith', 'hold_brewer'];

// Who is down here. Deliberately not a dungeon roster — a city has vermin and
// the odd thing that got in, not a garrison.
const FILL = [
  ['gloomrat', 'crag_bat'],
  ['gloomrat', 'crag_bat', 'seepmass'],
  ['seepmass', 'hookleg', 'scrap_goblin'],
  ['veil_crawler', 'gaze_orb', 'seepmass'],
];

const CACHE = new Map();
const CACHE_CAP = 32;

// ---- layout ----------------------------------------------------------------
function buildCity(gen, rx, rz) {
  if (!anchorIn(gen.seed, SALT, UC_REGION, UC_MARGIN, UC_CHANCE, rx, rz)) return null;
  const ax = ANCHOR.x, az = ANCHOR.z;
  if (nearHandBuilt(ax, az)) return null;
  if (settlementNear(gen, ax, az, 24)) return null;      // not under a town's cellars
  if (onRoad(gen, ax, az, 12)) return null;              // the entrance must not eat the lane
  const surfaceY = padHeight(gen, ax, az, 5, 6);
  if (surfaceY < 0) return null;

  const rand = mulberry32((gen.seed ^ Math.imul(rx, 0x7feb352d) ^ Math.imul(rz, 0x846ca68b) ^ SALT) >>> 0);
  const ring = ringAt(ax, az);
  const style = STYLES[ring], fill = FILL[ring];

  // Deep enough that the cavern roof is well under the terrain and the floor
  // clears bedrock, whatever the surface above is doing.
  let floor = Math.min(surfaceY - 46, SEA - 26) - randInt(rand, 0, 14);
  if (floor < 12) floor = 12;
  let roofY = floor + UC_HALL;
  if (roofY > surfaceY - ROOF_COVER) return null;          // not enough rock overhead

  const rxr = randInt(rand, UC_RMIN, UC_RMAX);
  const rzr = randInt(rand, UC_RMIN, UC_RMAX);

  // Enough rock over the WHOLE footprint, not just over the anchor. Checking one
  // column is what let a cavern ninety blocks across punch out through a valley
  // at its rim: the anchor had twenty blocks of cover, the far edge had two, and
  // the city opened onto daylight with a mineshaft hanging in the hole. Sampled
  // on a coarse grid over the ellipse and the roof is dropped to fit — or the
  // site is refused if it cannot fit anywhere sane.
  let minH = 1e9;
  for (let a = 0; a < 12; a++) {
    const th = (a / 12) * Math.PI * 2;
    for (const f of [0.55, 0.85, 1.0]) {
      const h = gen.heightAt(ax + Math.round(Math.cos(th) * rxr * f), az + Math.round(Math.sin(th) * rzr * f));
      if (h < minH) minH = h;
    }
  }
  if (minH < surfaceY - 40) return null;        // the ground above is far too broken
  if (roofY > minH - ROOF_COVER) {
    floor = minH - ROOF_COVER - UC_HALL;
    roofY = floor + UC_HALL;
    if (floor < 12) return null;                // cannot sink it far enough to be covered
  }

  // ---- the street plan ------------------------------------------------------
  // Two avenues crossing at the plaza, and buildings in the quadrants between
  // them. Simple on purpose: a legible grid underground reads as civic, and it
  // guarantees every door opens onto something you can walk.
  const AV = 3;                                            // avenue half-width
  const plots = [];
  const gap = 3;
  for (let qx = -1; qx <= 1; qx += 2) {
    for (let qz = -1; qz <= 1; qz += 2) {
      // walk out from the avenues in each quadrant
      for (let u = AV + gap; u < rxr - 10; ) {
        const w = randInt(rand, 7, 11);
        for (let v = AV + gap; v < rzr - 10; ) {
          const d = randInt(rand, 7, 11);
          const cxp = ax + qx * (u + w / 2), czp = az + qz * (v + d / 2);
          // keep the whole footprint inside the cavern's ellipse, with margin
          const ex = (Math.abs(cxp - ax) + w / 2 + 3) / rxr, ez = (Math.abs(czp - az) + d / 2 + 3) / rzr;
          if (ex * ex + ez * ez < 0.82) {
            plots.push({
              x0: Math.round(cxp - w / 2), x1: Math.round(cxp + w / 2),
              z0: Math.round(czp - d / 2), z1: Math.round(czp + d / 2),
              h: randInt(rand, 4, 7),
              // Which way the door faces: back toward the avenue it fronts.
              dx: -qx, dz: 0, tall: rand() < 0.35,
            });
          }
          v += d + gap;
        }
        u += w + gap;
      }
    }
  }

  // The upper terrace: a walkable ledge cut into the cavern wall, reached by two
  // stair flights off the plaza. It is what makes the cavern read as a place
  // built into rock rather than a room with houses in it.
  const terrace = { y: floor + TERRACE_H, inner: 0.80, outer: 0.94 };

  // Where you come in: a shaft from the surface down to the terrace, landing on
  // the ledge so you arrive looking DOWN over the city.
  const gate = {
    x: ax + Math.round(rxr * 0.87), z: az,
    yTop: surfaceY, yBot: terrace.y,
  };

  // ---- adits ---------------------------------------------------------------
  // The working seams. Four timbered drifts bored out of the cavern wall on the
  // diagonals (so they never collide with the two avenues or the entrance), each
  // with a rail down the middle running back to the gallery. This is what makes
  // the place a hold rather than a village in a hole: the town is the head of a
  // mine and the mine is still being worked.
  const seam = SEAMS[ring];
  const adits = [];
  for (let a = 0; a < 4; a++) {
    const th = Math.PI / 4 + (a / 4) * Math.PI * 2;
    const ux = Math.cos(th), uz = Math.sin(th);
    const len = randInt(rand, 26, ADIT_MAX);
    adits.push({
      // starts just inside the cavern wall and drives out into the rock
      x0: ax + Math.round(ux * rxr * 0.93), z0: az + Math.round(uz * rzr * 0.93),
      ux, uz, len, y: floor,
      ore: seam[Math.floor(rand() * seam.length)],
    });
  }

  // The forge row: a lava basin against the far wall with anvils and furnaces
  // backing onto it. Placed opposite the entrance so the first thing you see
  // from the stair head is the fires.
  const forge = { x: ax - Math.round(rxr * 0.55), z: az, w: 9, d: 5 };

  // Where the four dwarves stand.
  const folk = [
    { id: 'hold_warden', x: ax + 4, y: floor + 1, z: az + 4 },
    { id: 'hold_miner', x: ax + Math.round(rxr * 0.55), y: floor + 1, z: az + 2 },
    { id: 'hold_smith', x: forge.x + 3, y: floor + 1, z: forge.z + 3 },
    { id: 'hold_brewer', x: ax - 3, y: terrace.y + 1, z: az + Math.round(rzr * 0.86) },
  ];

  const spawns = [];
  const sn = randInt(rand, 5, 10);
  for (let i = 0; i < sn; i++) {
    const a = rand() * Math.PI * 2, d = 0.25 + rand() * 0.5;
    spawns.push({
      type: fill[Math.floor(rand() * fill.length)],
      x: ax + Math.round(Math.cos(a) * rxr * d),
      y: floor + 1,
      z: az + Math.round(Math.sin(a) * rzr * d),
    });
  }

  const chests = [];
  for (let i = 0; i < randInt(rand, 2, 4); i++) {
    const p = plots[Math.floor(rand() * plots.length)];
    if (p) chests.push({ x: p.x0 + 1, y: floor + 1, z: p.z0 + 1 });
  }

  // The adits drive out past the cavern wall, so they set the real extent.
  let reach = Math.max(rxr, rzr) + 6;
  for (const ad of adits) {
    reach = Math.max(reach, Math.abs(ad.x0 - ax) + ad.len + 4, Math.abs(ad.z0 - az) + ad.len + 4);
  }
  return {
    x: ax, z: az, ring, style, floor, roofY, rxr, rzr, plots, terrace, gate, spawns, chests,
    adits, forge, folk,
    minX: ax - reach, maxX: ax + reach + 4, minZ: az - reach, maxZ: az + reach,
  };
}

export function undercityAt(gen, rx, rz) {
  return cachedLayout(CACHE, CACHE_CAP, `${gen.seed}:${rx}:${rz}`, () => buildCity(gen, rx, rz));
}

// ---- rasterise -------------------------------------------------------------
function stampOne(gen, c, cx, cz) {
  const { style, floor, roofY, rxr, rzr } = c;
  const x0 = cx * CHUNK, z0 = cz * CHUNK;

  // 1. Hollow the cavern and lay the floor. A domed roof rather than a flat one:
  //    height falls off toward the wall, so the space reads as carved.
  for (let x = x0; x < x0 + CHUNK; x++) {
    const dx = (x - c.x) / rxr;
    if (dx < -1.06 || dx > 1.06) continue;
    for (let z = z0; z < z0 + CHUNK; z++) {
      const dz = (z - c.z) / rzr;
      const e = dx * dx + dz * dz;
      if (e > 1.12) continue;
      if (e <= 1) {
        const t = 1 - Math.sqrt(e);
        const top = floor + 4 + Math.round((UC_HALL - 4) * Math.pow(t, 0.55));
        for (let y = floor + 1; y <= top; y++) put(x, y, z, B.air);
        put(x, floor, z, style.road);
        // CAP THE ROOF. Above the dome this used to leave the natural terrain
        // alone and trust it to be solid — and it is not: the cave systems run
        // straight through that rock, so the city opened onto daylight through a
        // cavern in the ceiling, with a mineshaft hanging in the hole. Sinking
        // the floor to get more cover did not fix it, because the problem was
        // never the amount of rock; it was the holes already in it. So the cap is
        // written rather than assumed.
        // …and to an ABSOLUTE level, not `top + cover`. Near the rim the dome is
        // low, so a relative cap ended below the roof line and left an open band
        // between the cap and whatever the terrain was doing — which on a city
        // under a lake shore was open water and sky.
        for (let y = top + 1; y <= roofY + ROOF_COVER; y++) put(x, y, z, B.stone);
        // The terrace: a ledge cut into the wall, and a parapet at its lip.
        const er = Math.sqrt(e);
        if (er >= c.terrace.inner && er <= c.terrace.outer) {
          for (let y = floor + 1; y <= c.terrace.y; y++) put(x, y, z, style.wall);
          put(x, c.terrace.y, z, style.road);
        }
        if (er > c.terrace.outer && er <= c.terrace.outer + 0.03) {
          put(x, c.terrace.y + 1, z, B.cobble_wall);        // parapet along the lip
        }
      } else {
        // the shell, so a cave never breaks into the city sideways
        for (let y = floor - 1; y <= roofY + 1; y++) put(x, y, z, style.wall);
      }
    }
  }

  // 2. The avenues, in the road material, plus lamps down them.
  const AV = 3;
  box(c.x - AV, floor, c.z - rzr + 6, c.x + AV, floor, c.z + rzr - 6, style.road);
  box(c.x - rxr + 6, floor, c.z - AV, c.x + rxr - 6, floor, c.z + AV, style.road);
  for (let d = -rxr + 8; d <= rxr - 8; d += 6) {
    put(c.x + d, floor + 1, c.z + AV + 1, style.lamp);
    put(c.x + d, floor + 1, c.z - AV - 1, style.lamp);
  }
  for (let d = -rzr + 8; d <= rzr - 8; d += 6) {
    put(c.x + AV + 1, floor + 1, c.z + d, style.lamp);
    put(c.x - AV - 1, floor + 1, c.z + d, style.lamp);
  }

  // 3. The plaza monument — a lit column at the crossing, so the city has a
  //    centre you can steer for from the terrace.
  for (let y = floor + 1; y <= floor + 6; y++) put(c.x, y, c.z, style.trim);
  put(c.x, floor + 7, c.z, style.lamp === B.torch_post ? B.sea_lantern : style.lamp);
  for (const [ox, oz] of [[-2, 0], [2, 0], [0, -2], [0, 2]]) {
    put(c.x + ox, floor + 1, c.z + oz, B.cobble_wall);
  }

  // 4. Buildings.
  for (const p of c.plots) {
    if (!overlaps(p.x0 - 1, p.z0 - 1, p.x1 + 1, p.z1 + 1)) continue;
    const h = p.h;
    for (let x = p.x0; x <= p.x1; x++) {
      for (let z = p.z0; z <= p.z1; z++) {
        const edge = x === p.x0 || x === p.x1 || z === p.z0 || z === p.z1;
        put(x, floor, z, style.trim);                       // flagged floor
        for (let y = floor + 1; y <= floor + h; y++) {
          if (edge) put(x, y, z, y === floor + h ? style.trim : style.wall);
          else put(x, y, z, y === floor + h ? style.roof : B.air);
        }
      }
    }
    // Windows, and a two-block doorway on the avenue side.
    for (let x = p.x0 + 2; x < p.x1; x += 3) {
      put(x, floor + 3, p.z0, B.glasspane_pane);
      put(x, floor + 3, p.z1, B.glasspane_pane);
    }
    const dxw = p.dx < 0 ? p.x0 : p.x1;
    const dzw = Math.round((p.z0 + p.z1) / 2);
    put(dxw, floor + 1, dzw, B.air);
    put(dxw, floor + 2, dzw, B.air);
    put(dxw, floor + 1, dzw - 1, style.wall);
    // A hearth inside, so it is somewhere somebody lives…
    put(p.x0 + 1, floor + 1, p.z1 - 1, B.campfire);
    // …and a lamp on each street corner of the block. A cavern is unlit by
    // definition — skylight never reaches it — so the city has to carry all of
    // its own light or it is a black room with houses you cannot see.
    for (const [ox, oz] of [[0, 0], [p.x1 - p.x0, 0], [0, p.z1 - p.z0], [p.x1 - p.x0, p.z1 - p.z0]]) {
      put(p.x0 + ox, floor + h, p.z0 + oz, style.lamp);
    }
  }

  // 5. The stairs up to the terrace — two flights off the plaza, on the axis, so
  //    the ledge is reachable on foot. Every tread is a real stair.
  for (const sgn of [-1, 1]) {
    for (let k = 1; k <= TERRACE_H; k++) {
      const zz = c.z + sgn * (Math.round(rzr * c.terrace.inner) - TERRACE_H + k);
      for (let w = -2; w <= 2; w++) {
        put(c.x + w, floor + k, zz, B.stone_brick_stairs);
        put(c.x + w, floor + k + 1, zz, B.air);
        put(c.x + w, floor + k + 2, zz, B.air);
      }
    }
  }

  // 6. The way in: a SPIRAL STAIR from the surface down onto the terrace.
  //
  //    Not a ladder. The other sites here drop a ladder shaft (sites.js
  //    `shaftFittings`), and that is fine for a mine you fall into — but the
  //    player has no ladder-climbing code at all: `climb: true` on the block is
  //    read by nothing, so a ladder is scenery you cannot go up. A city whose
  //    only entrance was a ladder would be a city you can fall into once.
  //
  //    So it is a square helix of stair treads around the inside of the shaft,
  //    one block of descent per tread, with the headroom over each one cut out.
  //    Every tread is a real stair, which is the only thing World.isStep will
  //    let you walk up.
  const g = c.gate;
  if (overlaps(g.x - 4, g.z - 4, g.x + 4, g.z + 4)) {
    box(g.x - 4, g.yBot - 1, g.z - 4, g.x + 4, g.yTop + 1, g.z + 4, style.wall);
    box(g.x - 3, g.yBot, g.z - 3, g.x + 3, g.yTop + 2, g.z + 3, B.air);
    // The perimeter, walked in order — 16 cells to a lap, so 16 blocks of drop.
    const ring = [];
    for (let i = -2; i <= 2; i++) ring.push([i, -2]);
    for (let i = -1; i <= 2; i++) ring.push([2, i]);
    for (let i = 1; i >= -2; i--) ring.push([i, 2]);
    for (let i = 1; i >= -1; i--) ring.push([-2, i]);
    const drop = g.yTop - g.yBot;
    for (let k = 0; k <= drop; k++) {
      const [ox, oz] = ring[k % ring.length];
      const y = g.yTop - k;
      put(g.x + ox, y, g.z + oz, B.stone_brick_stairs);
      put(g.x + ox, y + 1, g.z + oz, B.air);
      put(g.x + ox, y + 2, g.z + oz, B.air);
      if (k % 8 === 0) put(g.x + ox, y + 3, g.z + oz, style.lamp);   // lit the whole way
    }
    // The bottom landing, opening onto the terrace ledge.
    box(g.x - 2, g.yBot, g.z - 2, g.x + 2, g.yBot, g.z + 2, style.road);
    box(g.x - 2, g.yBot + 1, g.z - 2, g.x + 2, g.yBot + 2, g.z + 2, B.air);
    for (let d = 1; d <= 6; d++) {
      box(g.x - d, g.yBot, g.z - 2, g.x - d, g.yBot, g.z + 2, style.road);
      box(g.x - d, g.yBot + 1, g.z - 2, g.x - d, g.yBot + 2, g.z + 2, B.air);
    }
    // A lit stone head on the surface, so it can be found from the road.
    for (const [ox, oz] of [[-3, -3], [3, -3], [-3, 3], [3, 3]]) {
      for (let y = g.yTop; y <= g.yTop + 3; y++) put(g.x + ox, y, g.z + oz, style.trim);
      put(g.x + ox, g.yTop + 4, g.z + oz, style.lamp);
    }
    // …and its mouth is a doorway at ground level, not a hole you fall down.
    box(g.x - 3, g.yTop + 1, g.z - 3, g.x + 3, g.yTop + 4, g.z + 3, B.air);
    box(g.x - 3, g.yTop + 5, g.z - 3, g.x + 3, g.yTop + 5, g.z + 3, style.roof);
  }

  // 7. RAILS down both avenues, and out through every adit. The rail is the
  //    thread that ties a hold together: it starts at the gallery, runs the
  //    length of each street, and carries on out into the live rock.
  for (let d = -rxr + 8; d <= rxr - 8; d++) put(c.x + d, floor + 1, c.z, B.rail);
  for (let d = -rzr + 8; d <= rzr - 8; d++) put(c.x, floor + 1, c.z + d, B.rail);

  // 8. The adits — timbered drifts driven out of the cavern wall into the seams,
  //    each with its own rail and a lamp at every set of timbers. Bored one cell
  //    at a time along the bearing rather than as a box, so a diagonal drift is a
  //    real diagonal and not a staircase of rooms.
  for (const ad of c.adits) {
    const ex = ad.x0 + ad.ux * ad.len, ez = ad.z0 + ad.uz * ad.len;
    if (!overlaps(Math.min(ad.x0, ex) - 3, Math.min(ad.z0, ez) - 3,
      Math.max(ad.x0, ex) + 3, Math.max(ad.z0, ez) + 3)) continue;
    for (let t = 0; t <= ad.len; t++) {
      const x = Math.round(ad.x0 + ad.ux * t), z = Math.round(ad.z0 + ad.uz * t);
      // bore: two wide, three tall, with a floor under it
      for (let w = -1; w <= 1; w++) {
        for (let k = 0; k <= 3; k++) {
          const px = Math.abs(ad.ux) > Math.abs(ad.uz) ? x : x + w;
          const pz = Math.abs(ad.ux) > Math.abs(ad.uz) ? z + w : z;
          if (k === 0) put(px, ad.y, pz, style.road);
          else put(px, ad.y + k, pz, B.air);
        }
      }
      put(x, ad.y + 1, z, B.rail);
      // timbers every four paces, and a lamp on the set
      if (t % 4 === 0 && t > 0) {
        const nx = Math.abs(ad.ux) > Math.abs(ad.uz) ? 0 : 1;
        const nz = nx ? 0 : 1;
        for (const sgn of [-1, 1]) {
          const px = x + nx * sgn, pz = z + nz * sgn;
          put(px, ad.y + 1, pz, B.oak_log);
          put(px, ad.y + 2, pz, B.oak_log);
          put(px, ad.y + 3, pz, B.oak_log);
        }
        put(x, ad.y + 3, z, B.oak_log);                 // the cap beam
        if (t % 8 === 0) put(x, ad.y + 3, z, style.lamp);
      }
      // the seam it was cut for, at the face and in pockets along the way
      if (t === ad.len || (t > 6 && t % 9 === 0)) {
        const nx = Math.abs(ad.ux) > Math.abs(ad.uz) ? 0 : 1;
        const nz = nx ? 0 : 1;
        putNode({ type: ad.ore, x: x + nx * 2, y: ad.y + 1, z: z + nz * 2, ready: true });
      }
    }
  }

  // 9. The forge row — a lava basin with anvils and furnaces backing onto it,
  //    opposite the entrance so the fires are the first thing you see from the
  //    stair head.
  const f = c.forge;
  if (overlaps(f.x - f.w, f.z - f.d, f.x + f.w, f.z + f.d)) {
    box(f.x - f.w, floor - 1, f.z - f.d, f.x + f.w, floor - 1, f.z + f.d, style.trim);
    box(f.x - 2, floor - 1, f.z - 2, f.x + 2, floor - 1, f.z + 2, B.lava);   // the basin
    for (let x = f.x - f.w; x <= f.x + f.w; x++) {
      for (let z = f.z - f.d; z <= f.z + f.d; z++) {
        const rim = Math.abs(x - f.x) > 2 || Math.abs(z - f.z) > 2;
        if (rim) put(x, floor, z, style.trim);
      }
    }
    // the working line: anvil, furnace, anvil, furnace along the near edge
    for (let i = -3; i <= 3; i++) {
      put(f.x + i, floor + 1, f.z + f.d, i % 2 ? B.anvil_block : B.furnace);
    }
    for (const [ox, oz] of [[-f.w, -f.d], [f.w, -f.d], [-f.w, f.d], [f.w, f.d]]) {
      for (let k = 1; k <= 4; k++) put(f.x + ox, floor + k, f.z + oz, style.metal);
      put(f.x + ox, floor + 5, f.z + oz, style.lamp);
    }
  }

  // 10. Banding: the hold's own metal set into the gallery parapet, so the walls
  //     read as an inventory of what its seams give up.
  for (let a = 0; a < 24; a++) {
    const th = (a / 24) * Math.PI * 2;
    const r = c.terrace.outer;
    put(c.x + Math.round(Math.cos(th) * rxr * r), c.terrace.y + 1, c.z + Math.round(Math.sin(th) * rzr * r), style.metal);
  }

  for (const s of c.spawns) {
    putSpawn({ id: `uc:${s.x},${s.y},${s.z}`, type: s.type, x: s.x, y: s.y, z: s.z, fixed: true });
  }
  for (const ch of c.chests) {
    putChest({
      id: `uc:${ch.x},${ch.y},${ch.z}`, x: ch.x, y: ch.y, z: ch.z,
      loot: [{ item: 'coin', qty: 40 + c.ring * 60 }, { item: 'old_coin', qty: 2 + c.ring }],
    });
  }
}

export function stampUndercity(gen, cx, cz, sink) {
  const x0 = cx * CHUNK, z0 = cz * CHUNK;
  regionRange(x0, x0 + CHUNK - 1, UC_REGION, UC_HALF);
  const rx0 = RANGE.lo, rx1 = RANGE.hi;
  regionRange(z0, z0 + CHUNK - 1, UC_REGION, UC_HALF);
  const rz0 = RANGE.lo, rz1 = RANGE.hi;
  let began = false;
  for (let rx = rx0; rx <= rx1; rx++) {
    for (let rz = rz0; rz <= rz1; rz++) {
      const c = undercityAt(gen, rx, rz);
      if (!c) continue;
      if (c.maxX < x0 || c.minX > x0 + CHUNK - 1) continue;
      if (c.maxZ < z0 || c.minZ > z0 + CHUNK - 1) continue;
      if (!began) { beginStamp(sink, cx, cz, CHUNK); began = true; }
      registerHoldFolk(gen, c);
      stampOne(gen, c, cx, cz);
    }
  }
}

// A city owns its whole footprint plus the entrance head, so nothing else sites
// on top of the one column you come in through.
export function undercityClaims(gen, x, z) {
  const rx = Math.floor(x / UC_REGION), rz = Math.floor(z / UC_REGION);
  for (let a = -1; a <= 1; a++) {
    for (let b = -1; b <= 1; b++) {
      const c = undercityAt(gen, rx + a, rz + b);
      if (!c) continue;
      if (Math.abs(x - c.gate.x) <= 4 && Math.abs(z - c.gate.z) <= 4) return true;
    }
  }
  return false;
}

// Test/debug helper: every city within `span` regions.
export function allUndercities(gen, span = 3) {
  const out = [];
  for (let rx = -span; rx <= span; rx++) {
    for (let rz = -span; rz <= span; rz++) {
      const c = undercityAt(gen, rx, rz);
      if (c) out.push(c);
    }
  }
  return out;
}

// ---- people ----------------------------------------------------------------
// A hold's DWARVES are not blocks, so they cannot ride the chunk sink — same
// problem js/world/settlements.js has with its villagers, and the same answer.
// structures.js hands this module the live array world.js publishes as
// `world.structure.npcs`, and a hold pushes its four into it the first time it
// is generated. main.js reads that array live, so a dwarf appears the moment
// their hold does.
const SINK = { npcs: null };
const REGISTERED = new Set();

export function attachUndercitySink(refs) { SINK.npcs = refs.npcs; }

export function registerHoldFolk(gen, c) {
  const key = `${gen.seed}:${c.x},${c.z}`;
  if (REGISTERED.has(key) || !SINK.npcs) return;
  REGISTERED.add(key);
  for (const p of c.folk) {
    SINK.npcs.push({ id: p.id, x: p.x, y: p.y, z: p.z, hold: `${c.x},${c.z}` });
  }
}
