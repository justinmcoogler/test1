// The place a lesson happens: a farm you walk around.
//
// This has been through two worse versions. The first put the whole lesson in one
// sealed room — five prompts, one work mat, no reason to ever turn around, a
// worksheet with a skybox. The second made it a meadow path, which was better, but
// every stop along it was still "put N things in a rectangle": the plot was a
// worksheet in a field, and the numbers never mattered to anything.
//
// So now it is HONEYWOOD FARM, and the lesson is the morning round. Each stop is
// a place with animals in it that need something, and the number comes off the
// animals rather than out of a prompt: count the cows, that is how many apples you
// carry. One stop bars the lane until it is mended. One is an open field with a
// lamb lost somewhere in it.
//
// This module knows no arithmetic. It is handed a PLAN — a list of stops, what
// each has in it, and which bars the way — and lays out the ground, the lane, the
// hedge that stops a child walking off the edge into open sky, the pens, the
// animals, the marked spots and the barriers. js/game/curriculum/ decides what a
// stop MEANS; this decides what it looks like.
import { B } from './blocks.js';

// Its own corner of the sky: far outside anything any generator reaches, and
// above the highest sky-island band (372), so nothing can wander in and there is
// nothing to wander to.
export const PATH_REALM = { x: 31000, z: 31000, y: 420 };
export const STATION_GAP = 20;      // far enough that each stop is its own place
// Each lesson world is seeded off this. The seed does nothing — there is no
// terrain — but a World needs one.
export const LESSON_SEED = 0x1e550;

// The work plot is 13 wide, 5 deep, 7 of build room, and that is not negotiable:
// every lesson shape in the game is validated against those numbers
// (js/game/buildshapes.js), so a plot of any other size would silently make some
// activities unbuildable.
const PLOT_HALF_W = 6;
const PLOT_DEPTH = 5;
const PLOT_NEAR = 3;                // rows from the lane to the front of the plot

// The farm: five rows of verge behind the child, twenty-four in front. The front
// number has to clear the lane, the plot, the pen behind it AND the building
// behind that, with room left over for the hedge. Too small and a building gets
// stamped out through the hedge into open sky, where all a child can see of it is
// the hedge in front of where it should be.
const VERGE_BACK = 5;
const VERGE_FRONT = 24;
// Room at each end — bigger than the spawn's run-up, or the child starts their
// walk standing in mid-air off the west end of the farm.
const END_PAD = 16;

// Everything at a stop, in the order the child sees it looking up from the lane:
// the plot they work on, the animals the numbers come off, then the building the
// animals belong to. THIS ORDER IS THE POINT. The pen used to start where the
// building started, which put every animal inside its own shed — and "count the
// cows" with the cows behind a wall is not an exercise, it is a trick.
const PEN_NEAR = PLOT_NEAR + PLOT_DEPTH;      // pen begins right behind the plot
const PEN_DEPTH = 7;
const BUILD_NEAR = PEN_NEAR + PEN_DEPTH;      // and the shed behind the pen

// WHAT THE PLACE IS MADE OF. Three lessons down one identical green lane would
// be the ninety generated lessons all over again — same worksheet, different
// numbers — so a lesson names a theme and the ground, the path underfoot and the
// thing that keeps a child from walking off the edge all change with it.
//
// The shape of the place does not change: one lane, stops every twenty blocks, a
// plot at each. That shape is what the runner, the shapes and the guide dots are
// all built on, and it is not the part that gets boring.
const EDGES = {
  // A field hedge on a log footing.
  hedge: (put, x, stand, z) => {
    put(x, stand - 1, z, B.oak_log);
    put(x, stand, z, B.oak_leaves);
    put(x, stand + 1, z, B.oak_leaves);
  },
  // Drystone, the way a mill leat is walled. Mossy on the low course, where the
  // water would reach.
  drystone: (put, x, stand, z) => {
    put(x, stand - 1, z, B.mossy_cobble);
    put(x, stand, z, B.cobble);
    put(x, stand + 1, z, B.mossy_cobble);
  },
  // A town wall: dressed stone with a course of brick along the top.
  townwall: (put, x, stand, z) => {
    put(x, stand - 1, z, B.stone_brick);
    put(x, stand, z, B.stone_brick);
    put(x, stand + 1, z, B.brick);
  },
};

const THEMES = {
  farm: { lane: B.gravel, ground: B.grass, edge: 'hedge',
    verge: [B.tall_grass, B.wildflower, B.orange_tulip, B.white_tulip, B.pink_tulip, B.oxeye_daisy] },
  // A damp stone towpath along the leat, with reeds and rushes in the wet grass.
  // Planks were tried and the whole foreground read as an indoor floor — a lane
  // is underfoot in every frame, so its texture is most of what a place looks
  // like, and wood at that scale is a room rather than a path.
  mill: { lane: B.mossy_cobble, ground: B.grass, edge: 'drystone',
    verge: [B.tall_grass, B.reed, B.reed, B.wildflower] },
  // Cobbles, swept: a market square is a place people have trodden flat.
  market: { lane: B.cobble, ground: B.grass, edge: 'townwall',
    verge: [B.tall_grass, B.oxeye_daisy, B.cobble, B.wildflower] },
};

const themeOf = (plan) => THEMES[plan?.theme] || THEMES.farm;

export function pathFor(plan) {
  const stations = (plan?.stations || []);
  const cz = PATH_REALM.z;
  const floor = PATH_REALM.y;
  const stand = floor + 1;
  const out = [];
  for (let i = 0; i < stations.length; i++) {
    const s = stations[i];
    const sx = PATH_REALM.x + i * STATION_GAP;
    // The child stands on the lane and faces +Z toward the plot. That facing is
    // load-bearing: js/game/lessons.js labels the plot's halves from the player's
    // viewpoint (their LEFT is +X), so a stop that faced the other way would make
    // every "reds on this side" activity wrong.
    const plot = s.plot === false ? null : {
      x0: sx - PLOT_HALF_W, x1: sx + PLOT_HALF_W,
      z0: cz + PLOT_NEAR, z1: cz + PLOT_NEAR + PLOT_DEPTH - 1,
      y0: stand, y1: stand + 6, div: sx,
    };
    const st = {
      index: i, kind: s.kind, sx, cz, floor, stand, plot,
      stand3: [sx, stand, cz],
      marks: s.marks || null,
      animals: s.animals || null,
      scatter: s.scatter || null,
      barrier: null,
      unlock: [],
      // Where a `reach` activity sends the child, in real coordinates. Station
      // relative in the plan (a lost lamb is "eighteen along and nine back"), so
      // the lesson never writes a world coordinate down.
      find: s.find ? [sx + s.find[0], stand, cz + s.find[1]] : null,
      findR: s.find?.[2] ?? 3,
      // What is hiding at `find`. A stop that sends a child looking for a lamb has
      // to have a lamb at the end of it: "there she is!" over an empty corner of a
      // field is the game lying to them.
      lost: s.lost || null,
    };
    // A barrier sits just PAST its stop, so the work is done on this side of it
    // and the reward is the way through.
    if (s.barrier === 'gate') {
      const gx = sx + 9;
      const cells = [];
      for (let z = cz - VERGE_BACK; z <= cz + VERGE_FRONT; z++) {
        for (let y = stand; y <= stand + 1; y++) cells.push([gx, y, z]);
      }
      st.barrier = { kind: 'gate', x: gx, cells };
      // Opening it takes the whole span away, not just the lane: a child who
      // found a way round a closed gate has learned that the game is lying.
      st.unlock = cells.map(([x, y, z]) => [x, y, z, 'air']);
    }
    out.push(st);
  }
  const last = out[out.length - 1];
  return {
    origin: { x: PATH_REALM.x, z: cz, y: floor },
    stations: out,
    // Twelve paces short of the first stop — further than the arrival box is
    // wide, so the round begins with a walk. A lesson that starts already
    // standing at stop one has thrown away the thing it is built around.
    spawn: [PATH_REALM.x - 12, stand, cz],
    bounds: {
      x0: PATH_REALM.x - END_PAD, x1: (last ? last.sx : PATH_REALM.x) + END_PAD,
      z0: cz - VERGE_BACK, z1: cz + VERGE_FRONT,
    },
  };
}

// ---- geometry ---------------------------------------------------------------
// `put(x, y, z, id)` writes one block and `spawn(entry)` places one animal; the
// caller supplies both, so this module never needs to know how a chunk is built.
export function buildPath(put, npcs, plan, spawn = () => {}) {
  const path = pathFor(plan);
  const { bounds, stations } = path;
  const floor = PATH_REALM.y, stand = floor + 1, cz = PATH_REALM.z;
  const theme = themeOf(plan);
  const edge = EDGES[theme.edge] || EDGES.hedge;

  // ---- the ground -------------------------------------------------------
  // Three courses. A child who digs through the top two would otherwise be
  // standing on nothing three hundred and fifty blocks up.
  for (let x = bounds.x0; x <= bounds.x1; x++) {
    for (let z = bounds.z0; z <= bounds.z1; z++) {
      const onLane = z >= cz - 1 && z <= cz + 1;
      put(x, floor, z, onLane ? theme.lane : theme.ground);
      put(x, floor - 1, z, B.dirt);
      put(x, floor - 2, z, B.stone);
    }
  }
  // ---- the boundary -----------------------------------------------------
  // Two tall, all the way round. This is the only thing between a five-year-old
  // and a very long fall, so it is unbroken whatever it is made of.
  for (let x = bounds.x0; x <= bounds.x1; x++) {
    for (const z of [bounds.z0, bounds.z1]) edge(put, x, stand, z);
  }
  for (let z = bounds.z0; z <= bounds.z1; z++) {
    for (const x of [bounds.x0, bounds.x1]) edge(put, x, stand, z);
  }
  // ---- the verges -------------------------------------------------------
  // Long grass and flowers, kept off the lane and off the plots. Deterministic:
  // a lesson must look the same every time a child comes back to it.
  let seed = 0x51e55;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  for (let x = bounds.x0 + 1; x < bounds.x1; x++) {
    for (let z = bounds.z0 + 1; z < bounds.z1; z++) {
      if (z >= cz - 1 && z <= cz + 1) continue;                                   // the lane
      if (z >= cz + PLOT_NEAR - 1 && z <= cz + PLOT_NEAR + PLOT_DEPTH) continue;  // the plots
      if (z >= cz + BUILD_NEAR - 1 && z <= cz + BUILD_NEAR + 6) continue;         // the buildings
      // The pens keep theirs: long grass and flowers in a paddock are what a
      // paddock looks like, and a bare mud rectangle behind every plot is not.
      const r = rnd();
      if (r < 0.245) put(x, stand, z, theme.verge[Math.floor(r * theme.verge.length * 4.08) % theme.verge.length]);
    }
  }

  // ---- the stops --------------------------------------------------------
  for (const st of stations) {
    if (st.plot) plotFloor(put, st);
    if (st.marks) marks(put, st);
    STATIONS[st.kind]?.(put, st, rnd);
    if (st.animals) penAndAnimals(put, spawn, st);
    if (st.barrier?.kind === 'gate') gate(put, st);
    if (st.scatter) scatter(put, st, rnd);
    // The guide walks the round with you and is at every stop, so there is always
    // somebody to click for the instruction again. Her real id, not an invented
    // one: every NPC lookup in this game is NPC_DEFS[npc.id] with no fallback, so
    // a guide with a made-up id has no label, no dialogue, and throws the
    // world-label pass every frame.
    npcs.push({ id: 'nan', station: st.index, x: st.sx - 8, y: stand, z: cz + 4 });
  }
  return path;
}

// The work plot: squared paper laid flush into the ground so it is comfortable to
// stand on, with a plank line down the middle for activities that have two sides.
function plotFloor(put, st) {
  for (let x = st.plot.x0; x <= st.plot.x1; x++) {
    for (let z = st.plot.z0; z <= st.plot.z1; z++) {
      put(x, st.floor, z, x === st.plot.div ? B.planks : B.work_mat);
    }
  }
  for (let x = st.plot.x0 - 1; x <= st.plot.x1 + 1; x++) put(x, st.floor, st.plot.z0 - 1, B.planks);
  put(st.plot.x0 - 1, st.stand, st.plot.z0 - 1, B.torch_post);
  put(st.plot.x1 + 1, st.stand, st.plot.z0 - 1, B.torch_post);
}

// A MARKED SPOT is the whole of one-to-one correspondence, drawn on the ground: a
// three-by-three pad with an empty middle. "One egg on each nest" needs the nests
// to be visibly separate things, or it is just "place three".
//
// The pad block comes from the stop's kind — straw for a nest, stone for a
// trough — and the lesson's `cells` activity targets the same offsets. Both read
// the one list in js/game/curriculum/, so they cannot drift apart.
function marks(put, st) {
  const pad = MARK_PAD[st.kind] || B.thatch;
  for (const [dx, dz] of st.marks) {
    const mx = st.plot.x0 + dx, mz = st.plot.z0 + dz;
    for (let x = mx - 1; x <= mx + 1; x++) {
      for (let z = mz - 1; z <= mz + 1; z++) {
        if (x < st.plot.x0 || x > st.plot.x1 || z < st.plot.z0 || z > st.plot.z1) continue;
        put(x, st.floor, z, pad);
      }
    }
  }
}
const MARK_PAD = { henhouse: B.thatch, byre: B.stone_brick };

// What lives at a stop, and where.
//
// A stop WITH a work plot gets a fenced pen right behind it: the animals stand
// between the child and the shed they belong to, close enough to count and never
// inside it. Gated on the plot side, so the pen reads as belonging to this stop.
//
// A stop with NO plot is an open field, and its animals stand loose in it. That is
// not decoration: an open field is the only place a lamb can have got out of, and
// a fenced flock of four with a fifth missing makes no sense.
function penAndAnimals(put, spawn, st) {
  const total = st.animals.reduce((sum, a) => sum + (a.n || 1), 0);
  const x0 = st.sx - 8, x1 = st.sx + 8;
  const z0 = st.cz + PEN_NEAR, z1 = z0 + PEN_DEPTH - 1;
  if (st.plot) {
    for (let x = x0; x <= x1; x++) { put(x, st.stand, z0, B.planks_fence); put(x, st.stand, z1, B.planks_fence); }
    for (let z = z0; z <= z1; z++) { put(x0, st.stand, z, B.planks_fence); put(x1, st.stand, z, B.planks_fence); }
    put(st.sx, st.stand, z0, B.planks_gate);                       // a way in
  }
  // Spread them evenly across the width, so none of them can hide behind another.
  // Counting the animals IS the first half of several of these activities.
  const step = (x1 - x0 - 4) / Math.max(1, total);
  let i = 0;
  for (const a of st.animals) {
    for (let k = 0; k < (a.n || 1); k++, i++) {
      spawn({ id: `farm:${st.index}:${i}`, type: a.type,
        x: Math.round(x0 + 2 + step * (i + 0.5)), y: st.stand,
        // Penned: the middle of the pen. Loose: a few paces up the field, where
        // they are the first thing a child sees on arriving.
        z: st.plot ? z0 + 3 : st.cz + 4 + (i % 2) });
    }
  }
  // And the one that got out, wherever the stop says it is hiding.
  if (st.lost && st.find) {
    spawn({ id: `farm:${st.index}:lost`, type: st.lost, x: st.find[0], y: st.find[1], z: st.find[2] });
  }
}

// ---- what each stop looks like ---------------------------------------------
// Props go BESIDE or BEHIND the plot, never in front of it: the child has to see
// their own work from where they stand. And behind means behind the ANIMALS too
// (BUILD_NEAR, not the back of the plot) — a shed stamped over the pen is a shed
// with the herd inside it, and a herd you cannot see is a herd you cannot count.
const STATIONS = {
  // The hen house: a thatched coop at the back of the run.
  henhouse: (put, st) => {
    const hx = st.sx - 3, hz = st.cz + BUILD_NEAR;
    for (let x = hx; x <= hx + 6; x++) {
      for (let z = hz; z <= hz + 3; z++) {
        const wall = x === hx || x === hx + 6 || z === hz || z === hz + 3;
        put(x, st.stand, z, wall ? B.planks : B.air);
        put(x, st.stand + 1, z, wall ? B.planks : B.air);
        put(x, st.stand + 2, z, B.thatch);
      }
    }
    put(hx + 3, st.stand, hz, B.air);                    // pop-hole out into the run
    put(hx + 3, st.stand + 1, hz, B.air);
    signpost(put, st.sx + 8, st.stand, st.cz - 2);
  },

  // The cow byre: an open-fronted shed with stalls, facing the herd.
  byre: (put, st) => {
    const hx = st.sx - 6, hz = st.cz + BUILD_NEAR, top = st.stand + 3;
    for (let x = hx; x <= hx + 12; x++) {
      for (let z = hz; z <= hz + 3; z++) {
        const back = z === hz + 3, side = x === hx || x === hx + 12;
        for (let y = st.stand; y < top; y++) put(x, y, z, (back || side) ? B.timber_wall : B.air);
        put(x, top, z, B.thatch);
      }
    }
    for (let x = hx + 3; x <= hx + 9; x += 3) {          // stall divisions
      for (let z = hz + 1; z <= hz + 2; z++) put(x, st.stand, z, B.planks_fence);
    }
  },

  // The mending stop: a woodpile and a bench, so the place looks like somewhere a
  // repair happens.
  gate: (put, st) => {
    for (let i = 0; i < 3; i++) put(st.sx + 6, st.stand + i, st.cz - 3, B.oak_log);
    put(st.sx + 5, st.stand, st.cz - 3, B.oak_log);
    put(st.sx + 7, st.stand, st.cz - 4, B.workbench);
  },

  // The feed store: two bins either side of the plank line, to sort into.
  feedstore: (put, st) => {
    const hz = st.cz + BUILD_NEAR;
    for (const bx of [st.sx - 5, st.sx + 4]) {
      for (let x = bx; x <= bx + 1; x++) {
        for (let z = hz; z <= hz + 1; z++) { put(x, st.stand, z, B.planks); put(x, st.stand + 1, z, B.planks_fence); }
      }
    }
    put(st.sx, st.stand, hz + 1, B.workbench);
    for (let i = 0; i < 3; i++) put(st.sx - 8, st.stand + i, hz, B.oak_log);
  },

  // The top field: no plot and no pen — open grass with the flock loose in it, a
  // drystone wall with a gap knocked in it, and a lamb hiding round the back.
  //
  // The wall is what makes the search fair. Walking up the field you can see the
  // whole of it EXCEPT the far side of these two runs of stone, so "she is behind
  // the wall" is a real instruction about a real place, and a child who follows it
  // finds her.
  topfield: (put, st) => {
    const wz = st.cz + 8;                                // across the field
    for (let x = st.sx + 4; x <= st.sx + 14; x++) {
      if (x === st.sx + 7) continue;                     // the gap she got out through
      put(x, st.stand, wz, B.mossy_cobble);
      put(x, st.stand + 1, wz, B.mossy_cobble);
    }
    for (let z = wz + 1; z <= wz + 8; z++) {              // and up the far side
      put(st.sx + 14, st.stand, z, B.mossy_cobble);
      put(st.sx + 14, st.stand + 1, z, B.mossy_cobble);
    }
    for (const [dx, dz] of [[-6, 6], [-4, 11], [1, 15], [9, 3]]) {
      put(st.sx + dx, st.stand, st.cz + dz, B.cobble);   // boulders to look behind
      put(st.sx + dx + 1, st.stand, st.cz + dz, B.mossy_cobble);
    }
    signpost(put, st.sx - 9, st.stand, st.cz - 2);
  },

  // ---- The Mill on Marrow Brook ---------------------------------------------

  // The reed bed: a pool of standing water at the back of the stop with rushes
  // round it, and a little plank jetty out into it. The eggs to be found are
  // scattered in the verge by `scatter`, not here — this is only the place.
  reedbed: (put, st) => {
    const pz = st.cz + BUILD_NEAR - 2;
    for (let x = st.sx - 7; x <= st.sx + 7; x++) {
      for (let z = pz; z <= pz + 4; z++) {
        // Sunk one course, so it reads as a pool rather than a sheet of water
        // lying on the grass.
        put(x, st.floor, z, B.water);
        put(x, st.stand, z, B.air);
      }
    }
    // Rushes round the edge, two segments tall with a fronded crown — the same
    // canes that grow along any waterline, so the place matches the world.
    for (const [dx, dz] of [[-8, 0], [-8, 2], [8, 1], [8, 3], [-6, -1], [3, -1], [6, -1]]) {
      put(st.sx + dx, st.stand, pz + dz, B.reed);
      put(st.sx + dx, st.stand + 1, pz + dz, B.reed_top);
    }
    for (let z = pz - 2; z <= pz + 1; z++) put(st.sx, st.stand - 1, z, B.planks);   // the jetty
    put(st.sx, st.stand, pz - 2, B.lantern_lit);
  },

  // The footbridge stop: the trestle is up and the planking is not. A stack of
  // timber and a sawhorse, so the place looks like a job half done.
  footbridge: (put, st) => {
    for (let i = 0; i < 4; i++) put(st.sx + 6, st.stand + i, st.cz - 3, B.oak_log);
    for (const dx of [4, 5, 7, 8]) put(st.sx + dx, st.stand, st.cz - 3, B.planks);
    put(st.sx + 7, st.stand, st.cz - 4, B.workbench);
    signpost(put, st.sx - 8, st.stand, st.cz - 2);
  },

  // The sack store: an open-fronted shed with sacks stacked up the back wall.
  sackstore: (put, st) => {
    const hx = st.sx - 5, hz = st.cz + BUILD_NEAR, top = st.stand + 3;
    for (let x = hx; x <= hx + 10; x++) {
      for (let z = hz; z <= hz + 3; z++) {
        const back = z === hz + 3, side = x === hx || x === hx + 10;
        for (let y = st.stand; y < top; y++) put(x, y, z, (back || side) ? B.planks : B.air);
        put(x, top, z, B.thatch);
      }
    }
    for (let x = hx + 2; x <= hx + 8; x += 3) {              // sacks against the wall
      for (let y = 0; y < 2; y++) put(x, st.stand + y, hz + 2, B.thatch);
    }
  },

  // The weigh beam: two posts and a crossbar with a pan hanging either side of
  // the plank line, so the two towers the child builds are visibly a comparison.
  weighbeam: (put, st) => {
    const wz = st.cz + PEN_NEAR + 1;
    for (let y = 0; y < 5; y++) put(st.sx, st.stand + y, wz, B.oak_log);
    for (let x = st.sx - 4; x <= st.sx + 4; x++) put(x, st.stand + 5, wz, B.planks);
    for (const dx of [-4, 4]) {
      put(st.sx + dx, st.stand + 4, wz, B.planks_fence);
      put(st.sx + dx, st.stand + 3, wz, B.stone_brick);
    }
    put(st.sx + 6, st.stand, wz, B.anvil_block);
  },

  // The granary: a round stone bin with a course of brick every two up, so a
  // child filling it to "the sixth mark" has real marks to count.
  granary: (put, st) => {
    const gx = st.sx - 2, gz = st.cz + BUILD_NEAR;
    for (let x = gx; x <= gx + 5; x++) {
      for (let z = gz; z <= gz + 4; z++) {
        const wall = x === gx || x === gx + 5 || z === gz || z === gz + 4;
        if (!wall) continue;
        for (let y = 0; y < 7; y++) put(x, st.stand + y, z, (y % 2 === 1) ? B.brick : B.stone_brick);
      }
    }
    put(gx + 2, st.stand, gz, B.air);                        // the door
    put(gx + 2, st.stand + 1, gz, B.air);
    for (const dx of [-5, 8]) put(st.sx + dx, st.stand, gz + 1, B.thatch);
  },

  // The tally board: a big board on two posts where the mill's numbers get
  // written up, with the miller's cottage behind it.
  tallyboard: (put, st) => {
    const bz = st.cz + PEN_NEAR + 2, bx = st.sx - 3;
    for (const x of [bx, bx + 7]) for (let y = 0; y < 4; y++) put(x, st.stand + y, bz, B.oak_log);
    for (let x = bx; x <= bx + 7; x++) {
      for (let y = 2; y < 4; y++) put(x, st.stand + y, bz, B.planks);
    }
    cottage(put, st, st.sx + 4, st.cz + BUILD_NEAR);
    for (const x of [st.sx - 6, st.sx + 3]) put(x, st.stand, st.plot.z0 - 1, B.lantern_lit);
  },

  // ---- Market Day at Thistlewick --------------------------------------------

  // The bunting line: two tall poles with a rope between them, waiting to be
  // dressed. The pattern the child lays on the plot is the bunting.
  buntingline: (put, st) => {
    const bz = st.cz + PEN_NEAR;
    for (const dx of [-7, 7]) {
      for (let y = 0; y < 6; y++) put(st.sx + dx, st.stand + y, bz, B.oak_log);
    }
    for (let x = st.sx - 7; x <= st.sx + 7; x++) put(x, st.stand + 6, bz, B.planks_fence);
    put(st.sx - 9, st.stand, st.cz - 3, B.workbench);
    signpost(put, st.sx + 9, st.stand, st.cz - 2);
  },

  // A market stall: four posts, a striped awning, a plank counter.
  fruitstall: (put, st) => stall(put, st, B.red_wool, B.white_wool),

  // The crate stack: empty crates waiting to be filled to their marks.
  cratestack: (put, st) => {
    const cz0 = st.cz + PEN_NEAR + 1;
    for (const dx of [-7, -4, 5]) {
      for (let x = st.sx + dx; x <= st.sx + dx + 1; x++) {
        for (let z = cz0; z <= cz0 + 1; z++) {
          put(x, st.stand, z, B.planks);
          put(x, st.stand + 1, z, B.planks_fence);
        }
      }
    }
    put(st.sx + 8, st.stand, cz0, B.workbench);
  },

  // The duck seller's pen: a run of hurdles already up behind the stop, with the
  // birds loose in front of it. Named for the shape, not the bird — the game has
  // ducks and no geese, and a lesson that says "geese" over a creature labelled
  // DUCK is the game lying to a child who cannot yet read but can certainly see.
  goosepen: (put, st) => {
    const pz = st.cz + PEN_NEAR + 2;
    for (let x = st.sx - 6; x <= st.sx + 6; x++) put(x, st.stand, pz + 4, B.planks_fence);
    for (let z = pz; z <= pz + 4; z++) {
      put(st.sx - 6, st.stand, z, B.planks_fence);
      put(st.sx + 6, st.stand, z, B.planks_fence);
    }
    put(st.sx - 9, st.stand, st.cz - 3, B.thatch);
  },

  // The toy stall: a blue-and-white awning and a rocking horse on the counter.
  toystall: (put, st) => {
    stall(put, st, B.light_blue_wool, B.white_wool);
    const tz = st.cz + PEN_NEAR + 1;
    put(st.sx - 1, st.stand + 1, tz, B.oak_log);
    put(st.sx, st.stand + 1, tz, B.oak_log);
    put(st.sx, st.stand + 2, tz, B.planks);
  },

  // The market hall: the end of the morning. A pillared front, the bell above
  // the door, and the board the day's numbers go up on.
  markethall: (put, st) => {
    const hx = st.sx - 4, hz = st.cz + BUILD_NEAR, top = st.stand + 4;
    for (let x = hx; x <= hx + 9; x++) {
      for (let z = hz; z <= hz + 5; z++) {
        const wall = x === hx || x === hx + 9 || z === hz || z === hz + 5;
        const pillar = z === hz && (x - hx) % 3 === 0;
        for (let y = st.stand; y < top; y++) {
          put(x, y, z, pillar ? B.stone_brick : (wall && z !== hz) ? B.timber_wall : B.air);
        }
        put(x, top, z, B.thatch);
        put(x, top + 1, z, (x > hx && x < hx + 9 && z > hz && z < hz + 5) ? B.thatch : B.air);
      }
    }
    put(hx + 4, st.stand + 4, hz, B.gold_block);             // the bell over the door
    for (const x of [st.sx - 7, st.sx + 6]) put(x, st.stand, st.plot.z0 - 1, B.lantern_lit);
  },

  // The bell: the end of the round. A frame, a brass bell, and the farmhouse.
  bell: (put, st) => {
    const bx = st.sx - 1, bz = st.cz + PEN_NEAR + 2;
    for (let y = 0; y < 4; y++) { put(bx - 1, st.stand + y, bz, B.oak_log); put(bx + 3, st.stand + y, bz, B.oak_log); }
    for (let x = bx - 1; x <= bx + 3; x++) put(x, st.stand + 4, bz, B.planks);
    put(bx + 1, st.stand + 3, bz, B.gold_block);         // the bell
    put(bx + 1, st.stand + 2, bz, B.gold_block);
    // the farmhouse, off to the side
    const hx = st.sx + 5, hz = st.cz + BUILD_NEAR, top = st.stand + 3;
    for (let x = hx; x <= hx + 7; x++) {
      for (let z = hz; z <= hz + 5; z++) {
        const wall = x === hx || x === hx + 7 || z === hz || z === hz + 5;
        for (let y = st.stand; y < top; y++) put(x, y, z, wall ? B.timber_wall : B.air);
        put(x, top, z, B.thatch);
        put(x, top + 1, z, (x > hx && x < hx + 7 && z > hz && z < hz + 5) ? B.thatch : B.air);
      }
    }
    put(hx + 3, st.stand, hz, B.oak_door);
    put(hx + 3, st.stand + 1, hz, B.oak_door_top);
    for (const x of [hx + 1, hx + 5]) put(x, st.stand + 1, hz, B.glasspane);
    put(hx + 1, st.stand, hz - 2, B.campfire);
    for (const x of [st.sx - 6, st.sx + 3]) put(x, st.stand, st.plot.z0 - 1, B.lantern_lit);
  },
};

function signpost(put, x, stand, z) {
  put(x, stand, z, B.oak_log);
  put(x, stand + 1, z, B.planks);
}

// A market stall: four corner posts, a plank counter, and a striped awning over
// it in the stall's own two colours. Behind the pen line, like every other prop,
// so a child can always see their own work from where they stand.
function stall(put, st, a, b) {
  const sz = st.cz + PEN_NEAR + 1, x0 = st.sx - 5, x1 = st.sx + 5;
  for (const x of [x0, x1]) {
    for (let y = 0; y < 4; y++) { put(x, st.stand + y, sz, B.oak_log); put(x, st.stand + y, sz + 3, B.oak_log); }
  }
  for (let x = x0; x <= x1; x++) {
    put(x, st.stand + 1, sz + 3, B.planks);                       // the counter
    for (let z = sz; z <= sz + 3; z++) put(x, st.stand + 4, z, ((x - x0) % 2 === 0) ? a : b);
  }
}

// A small tiled cottage, used wherever a lesson needs somebody to live nearby.
function cottage(put, st, hx, hz) {
  const top = st.stand + 3;
  for (let x = hx; x <= hx + 6; x++) {
    for (let z = hz; z <= hz + 4; z++) {
      const wall = x === hx || x === hx + 6 || z === hz || z === hz + 4;
      for (let y = st.stand; y < top; y++) put(x, y, z, wall ? B.timber_wall : B.air);
      put(x, top, z, B.thatch);
      put(x, top + 1, z, (x > hx && x < hx + 6 && z > hz && z < hz + 4) ? B.thatch : B.air);
    }
  }
  put(hx + 3, st.stand, hz, B.oak_door);
  put(hx + 3, st.stand + 1, hz, B.oak_door_top);
  for (const x of [hx + 1, hx + 5]) put(x, st.stand + 1, hz, B.glasspane);
}

// A fence across the whole farm, two tall, with a gate post either side of the
// lane so it reads as a gate rather than a wall.
function gate(put, st) {
  for (const [x, y, z] of st.barrier.cells) {
    const onLane = z >= st.cz - 1 && z <= st.cz + 1;
    put(x, y, z, onLane ? B.planks_gate : B.planks_fence);
  }
  for (const z of [st.cz - 2, st.cz + 2]) {
    put(st.barrier.x, st.stand, z, B.oak_log);
    put(st.barrier.x, st.stand + 1, z, B.oak_log);
  }
}

// Things dropped in the grass to find and pick up. Spread over the verge either
// side of the lane, so it is a hunt — and kept off the plot and out of the pen,
// where a child would be picking things up out of a fenced enclosure or off their
// own work.
function scatter(put, st, rnd) {
  const id = B[st.scatter.block];
  if (id === undefined) return;
  const spots = [];
  // WHERE THE CHILD IS LOOKING. A stop with a plot has its work in front, so the
  // things to find go in the verge behind — turn round and hunt. A stop with no
  // plot has nothing in front but open ground, and that is where a child arriving
  // is already facing, so the hunt goes there instead. Scattering behind them at
  // a plotless stop meant the answer was the one place they could not see.
  const [z0, z1] = st.plot ? [st.cz - 4, st.cz - 2] : [st.cz + 3, st.cz + 11];
  for (let x = st.sx - 7; x <= st.sx + 7; x += 2) {
    for (let z = z0; z <= z1; z++) spots.push([x, z]);
  }
  for (let i = spots.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [spots[i], spots[j]] = [spots[j], spots[i]];
  }
  for (let i = 0; i < st.scatter.n && i < spots.length; i++) {
    put(spots[i][0], st.stand, spots[i][1], id);
  }
}

// A whole world's worth of content for a walked lesson. Shaped exactly like
// buildStarterStructures()'s return so World can consume either.
export function pathStructure(plan) {
  const edits = new Map();
  const npcs = [];
  const spawns = [];
  const put = (x, y, z, id) => edits.set(`${x},${y},${z}`, id);
  const path = buildPath(put, npcs, plan, (s) => spawns.push(s));
  return {
    edits, npcs, spawns, nodes: [], chests: [], facings: [],
    markers: { spawn: path.spawn, path },
  };
}
