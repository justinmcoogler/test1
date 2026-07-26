// A lesson you WALK.
//
// The first version of this put the whole lesson in one sealed room: five
// prompts, one work mat, no reason to ever turn around. That is a worksheet with
// a skybox. A five-year-old does not need a quieter classroom — they need to be
// somewhere, going somewhere, with things to do on the way.
//
// So a lesson is now a PATH. A meadow trail with stations along it, one per beat
// of the story. You start at the bottom, and at each stop there is a different
// thing to do: eggs to hunt for in the long grass, a broken gate to mend, a
// stream to lay stepping stones across, apples to sort into baskets, lanterns to
// light outside Pip's cottage. Two of the stations BLOCK THE TRAIL — you cannot
// walk on until you have done the work — so the story has real obstacles in it
// rather than a "next" button.
//
// This module knows nothing about arithmetic. It is handed a PLAN — a list of
// station kinds and what each one needs — and lays out the geometry: the ground,
// the trail, the hedge that stops a child walking off the edge into open sky, the
// props, the work plots and the barriers. js/game/curriculum/ decides what a
// station means; this decides what it looks like.
import { B } from './blocks.js';

// Its own corner of the sky, well clear of the numbered classrooms at z=30000 —
// a path is a hundred blocks long and the rooms are spaced forty apart, so
// sharing a line would have them growing through each other.
export const PATH_REALM = { x: 31000, z: 31000, y: 420 };
export const STATION_GAP = 18;      // far enough that each stop is its own place

// The work plot is EXACTLY the classroom mat: 13 wide, 5 deep, 7 of build room.
// Not a coincidence and not worth changing — every lesson shape in the game is
// validated against those numbers (js/game/buildshapes.js), so a plot of any
// other size would silently make some activities unbuildable.
const PLOT_HALF_W = 6;
const PLOT_DEPTH = 5;
const PLOT_NEAR = 3;                // rows from the trail to the front of the plot

// The meadow: five rows of verge behind the child, sixteen in front. The front
// number has to clear the trail, the plot AND whatever is built behind the plot —
// a hen house, a cottage, an apple tree. At nine it did not, so the cottage was
// quietly stamped out past the hedge into open sky, where the only thing a child
// could see of it was the hedge in front of where it should have been.
const VERGE_BACK = 5;
const VERGE_FRONT = 16;
// Room at each end. Bigger than the spawn's ten-pace run-up, or the child would
// start their walk standing in mid-air off the west end of the meadow.
const END_PAD = 14;

export function pathFor(plan) {
  const stations = (plan?.stations || []);
  const cz = PATH_REALM.z;
  const floor = PATH_REALM.y;
  const stand = floor + 1;
  const out = [];
  for (let i = 0; i < stations.length; i++) {
    const s = stations[i];
    const sx = PATH_REALM.x + i * STATION_GAP;
    // The child stands on the trail and faces +Z toward the plot. That facing is
    // load-bearing: js/game/lessons.js labels the plot's halves from the
    // player's viewpoint (their LEFT is +X), so a station that faced the other
    // way would make every "reds on the left" activity wrong.
    const st = {
      index: i, kind: s.kind, sx, cz, floor, stand,
      stand3: [sx, stand, cz],
      plot: s.plot === false ? null : {
        x0: sx - PLOT_HALF_W, x1: sx + PLOT_HALF_W,
        z0: cz + PLOT_NEAR, z1: cz + PLOT_NEAR + PLOT_DEPTH - 1,
        y0: stand, y1: stand + 6, div: sx,
      },
      scatter: s.scatter || null,
      barrier: null,
      unlock: [],
    };
    // A barrier sits just PAST its station, so the work is done on this side of
    // it and the reward is the way through.
    if (s.barrier === 'gate') {
      const gx = sx + 8;
      const cells = [];
      for (let z = cz - VERGE_BACK; z <= cz + VERGE_FRONT; z++) {
        for (let y = stand; y <= stand + 1; y++) cells.push([gx, y, z]);
      }
      st.barrier = { kind: 'gate', x: gx, cells };
      // Opening it takes the whole span away, not just the trail: a child who
      // found a way round a "closed" gate has learned that the game is lying.
      st.unlock = cells.map(([x, y, z]) => [x, y, z, 'air']);
    } else if (s.barrier === 'stream') {
      const x0 = sx + 7, x1 = sx + 10;      // four wide: too far to jump
      st.barrier = { kind: 'stream', x0, x1 };
      // Stepping stones at walking height, right across the trail band.
      for (let x = x0; x <= x1; x++) {
        for (let z = cz - 1; z <= cz + 1; z++) st.unlock.push([x, floor, z, 'cobble']);
      }
    }
    out.push(st);
  }
  const last = out[out.length - 1];
  return {
    origin: { x: PATH_REALM.x, z: cz, y: floor },
    stations: out,
    // Ten paces short of the first stop, which is further than the arrival box is
    // wide. A lesson that begins already standing at station one skips the walk
    // it is built around, and the child never learns that the path IS the lesson.
    spawn: [PATH_REALM.x - 10, stand, cz],
    bounds: {
      x0: PATH_REALM.x - END_PAD, x1: (last ? last.sx : PATH_REALM.x) + END_PAD,
      z0: cz - VERGE_BACK, z1: cz + VERGE_FRONT,
    },
  };
}

// ---- geometry ---------------------------------------------------------------
// `put(x, y, z, id)` writes one block; the caller supplies it so this module
// never needs to know how a chunk gets built.
export function buildPath(put, npcs, plan) {
  const path = pathFor(plan);
  const { bounds, stations } = path;
  const floor = PATH_REALM.y, stand = floor + 1, cz = PATH_REALM.z;

  // ---- the ground -------------------------------------------------------
  // Three courses. A child who digs through the top two would otherwise be
  // standing on nothing three hundred and fifty blocks up.
  for (let x = bounds.x0; x <= bounds.x1; x++) {
    for (let z = bounds.z0; z <= bounds.z1; z++) {
      const onTrail = z >= cz - 1 && z <= cz + 1;
      put(x, floor, z, onTrail ? B.gravel : B.grass);
      put(x, floor - 1, z, B.dirt);
      put(x, floor - 2, z, B.stone);
    }
  }
  // ---- the hedge --------------------------------------------------------
  // Two tall, all the way round, on a log footing. This is the only thing
  // between a five-year-old and a very long fall, so it is unbroken.
  for (let x = bounds.x0; x <= bounds.x1; x++) {
    for (const z of [bounds.z0, bounds.z1]) hedge(put, x, stand, z);
  }
  for (let z = bounds.z0; z <= bounds.z1; z++) {
    for (const x of [bounds.x0, bounds.x1]) hedge(put, x, stand, z);
  }
  // ---- the verges -------------------------------------------------------
  // Long grass and flowers, thinned out near the trail so the way ahead reads
  // clearly. Deterministic scatter — a lesson must look the same every time a
  // child comes back to it.
  let seed = 0x51e55;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  for (let x = bounds.x0 + 1; x < bounds.x1; x++) {
    for (let z = bounds.z0 + 1; z < bounds.z1; z++) {
      if (z >= cz - 1 && z <= cz + 1) continue;               // keep the trail clear
      if (z >= cz + PLOT_NEAR - 1 && z <= cz + PLOT_NEAR + PLOT_DEPTH) continue;  // and the plots
      const r = rnd();
      if (r < 0.16) put(x, stand, z, B.tall_grass);
      else if (r < 0.2) put(x, stand, z, B.wildflower);
      else if (r < 0.225) put(x, stand, z, [B.orange_tulip, B.white_tulip, B.pink_tulip, B.oxeye_daisy][(x + z) & 3]);
    }
  }

  // ---- the stations -----------------------------------------------------
  for (const st of stations) {
    if (st.plot) plotFloor(put, st, st.kind === 'nest' ? B.thatch : B.light_gray_wool);
    STATIONS[st.kind]?.(put, st, rnd);
    // Pip is at every stop. Her real id, not an invented one: every NPC lookup
    // in this game is NPC_DEFS[npc.id] with no fallback, so a guide with a
    // made-up id has no label, no dialogue, and throws the world-label pass
    // every frame. `station` marks her as path furniture, not world population.
    // Off the trail and off to one side of the plot: standing on the trail she
    // fills the screen the moment a child arrives, and standing in front of the
    // plot she hides the work.
    npcs.push({ id: 'pip', station: st.index, x: st.sx - 8, y: stand, z: cz + 4 });
    if (st.barrier?.kind === 'gate') gate(put, st);
    if (st.barrier?.kind === 'stream') stream(put, st);
    // Scattered things to find. Placed on the verge, both sides, spread down the
    // clearing so it is a hunt and not a pile.
    if (st.scatter) scatter(put, st, rnd);
  }
  return path;
}

function hedge(put, x, stand, z) {
  put(x, stand - 1, z, B.oak_log);
  put(x, stand, z, B.oak_leaves);
  put(x, stand + 1, z, B.oak_leaves);
}

// The work plot, laid flush into the ground so it is comfortable to stand on,
// with a plank line down the middle for the activities that have a left and a
// right half.
function plotFloor(put, st, surface) {
  for (let x = st.plot.x0; x <= st.plot.x1; x++) {
    for (let z = st.plot.z0; z <= st.plot.z1; z++) {
      put(x, st.floor, z, x === st.plot.div ? B.planks : surface);
    }
  }
  // A low kerb of logs along the front so the plot reads as a place, and the
  // child can see where the work is meant to go from the trail.
  for (let x = st.plot.x0 - 1; x <= st.plot.x1 + 1; x++) put(x, st.floor, st.plot.z0 - 1, B.planks);
  for (const z of [st.plot.z0 - 1]) { put(st.plot.x0 - 1, st.stand, z, B.torch_post); put(st.plot.x1 + 1, st.stand, z, B.torch_post); }
}

// ---- station dressing -------------------------------------------------------
// Each kind is a place with a job. Props go BESIDE or BEHIND the plot, never in
// front of it — the child needs to see their own work from where they stand.
const STATIONS = {
  // Long grass to search: thicker cover, a couple of bushes, no plot at all.
  grass: (put, st) => {
    for (let x = st.sx - 7; x <= st.sx + 7; x++) {
      for (let z = st.cz + 2; z <= st.cz + 8; z++) {
        if ((x + z) % 3) put(x, st.stand, z, B.tall_grass);
      }
    }
    put(st.sx - 6, st.stand, st.cz + 4, B.berry_bush);
    put(st.sx + 6, st.stand, st.cz + 6, B.berry_bush);
    signpost(put, st.sx + 2, st.stand, st.cz - 2);
  },
  // The hen house: a little thatched coop behind the nest, with a fenced run.
  nest: (put, st) => {
    const hx = st.sx - 2, hz = st.plot.z1 + 2;
    for (let x = hx; x <= hx + 4; x++) {
      for (let z = hz; z <= hz + 3; z++) {
        const wall = x === hx || x === hx + 4 || z === hz || z === hz + 3;
        put(x, st.stand, z, wall ? B.planks : B.air);
        put(x, st.stand + 1, z, wall ? B.planks : B.air);
        put(x, st.stand + 2, z, B.thatch);
      }
    }
    put(hx + 2, st.stand, hz, B.air);                       // doorway onto the nest
    put(hx + 2, st.stand + 1, hz, B.air);
    for (const x of [hx - 2, hx + 6]) for (let z = hz; z <= hz + 3; z++) put(x, st.stand, z, B.planks_fence);
  },
  // Two apple trees and a basket on each side of the plank line, so "sort them
  // into the two baskets" has two baskets to point at.
  orchard: (put, st) => {
    appleTree(put, st.sx - 7, st.stand, st.plot.z1 + 2);
    appleTree(put, st.sx + 7, st.stand, st.plot.z1 + 2);
    for (const [bx, z] of [[st.sx - 4, st.plot.z0 - 2], [st.sx + 4, st.plot.z0 - 2]]) {
      put(bx, st.stand, z, B.planks);
      put(bx + 1, st.stand, z, B.planks);
      put(bx, st.stand, z - 1, B.planks);
      put(bx + 1, st.stand, z - 1, B.planks);
    }
  },
  // Pip's cottage: the end of the road. Door, windows, thatch roof, a fire out
  // front and lanterns to light.
  cottage: (put, st) => {
    const hx = st.sx - 3, hz = st.plot.z1 + 2, top = st.stand + 3;
    for (let x = hx; x <= hx + 6; x++) {
      for (let z = hz; z <= hz + 5; z++) {
        const wall = x === hx || x === hx + 6 || z === hz || z === hz + 5;
        for (let y = st.stand; y < top; y++) put(x, y, z, wall ? B.timber_wall : B.air);
        put(x, top, z, B.thatch);
        put(x, top + 1, z, (x >= hx + 1 && x <= hx + 5 && z >= hz + 1 && z <= hz + 4) ? B.thatch : B.air);
      }
    }
    put(hx + 3, st.stand, hz, B.oak_door);                  // front door, facing the trail
    put(hx + 3, st.stand + 1, hz, B.oak_door_top);
    for (const x of [hx + 1, hx + 5]) put(x, st.stand + 1, hz, B.glasspane);
    put(hx + 3, st.stand, hz - 2, B.campfire);
    for (const x of [hx, hx + 6]) put(x, st.stand, hz - 1, B.torch_post);
    signpost(put, st.sx - 7, st.stand, st.cz - 2);
  },
  // The mended gate's station: a woodpile and a bench, so the place looks like
  // somewhere a repair happens.
  gate: (put, st) => {
    for (let i = 0; i < 3; i++) put(st.sx + 5, st.stand + i, st.cz - 3, B.oak_log);
    put(st.sx + 4, st.stand, st.cz - 3, B.oak_log);
    put(st.sx + 6, st.stand, st.cz - 4, B.workbench);
  },
  // The stream's station: reeds on the bank and a couple of loose boulders.
  stream: (put, st) => {
    for (let z = st.cz + 2; z <= st.cz + 8; z += 2) put(st.sx + 6, st.stand, z, B.reed);
    put(st.sx + 5, st.stand, st.cz - 3, B.cobble);
    put(st.sx + 4, st.stand, st.cz - 4, B.mossy_cobble);
  },
};

function signpost(put, x, stand, z) {
  put(x, stand, z, B.oak_log);
  put(x, stand + 1, z, B.planks);
}

function appleTree(put, x, stand, z) {
  for (let i = 0; i < 4; i++) put(x, stand + i, z, B.oak_log);
  for (let dx = -2; dx <= 2; dx++) {
    for (let dz = -2; dz <= 2; dz++) {
      for (let dy = 3; dy <= 5; dy++) {
        if (Math.abs(dx) + Math.abs(dz) + Math.abs(dy - 4) > 3) continue;
        if (dx === 0 && dz === 0 && dy < 4) continue;
        put(x + dx, stand + dy, z + dz, B.oak_leaves);
      }
    }
  }
  // a few red apples showing in the canopy
  for (const [dx, dz] of [[-1, 0], [1, 1], [0, -1]]) put(x + dx, stand + 3, z + dz, B.red_wool);
}

// A fence across the whole meadow, two tall, with a gate post either side of the
// trail so it reads as a gate rather than a wall.
function gate(put, st) {
  for (const [x, y, z] of st.barrier.cells) {
    const onTrail = z >= st.cz - 1 && z <= st.cz + 1;
    put(x, y, z, onTrail ? B.planks_gate : B.planks_fence);
  }
  for (const z of [st.cz - 2, st.cz + 2]) {
    put(st.barrier.x, st.stand, z, B.oak_log);
    put(st.barrier.x, st.stand + 1, z, B.oak_log);
  }
}

// A ditch of water right across the meadow, two deep so it cannot be waded, and
// four wide so it cannot be jumped — with a stone step at each end INSIDE it, so
// a child who falls in can always climb straight back out. A lesson must never
// be able to trap anybody.
function stream(put, st) {
  const { x0, x1 } = st.barrier;
  for (let x = x0; x <= x1; x++) {
    for (let z = st.cz - 5; z <= st.cz + 9; z++) {
      put(x, st.floor, z, B.air);
      put(x, st.floor - 1, z, B.water);
      put(x, st.floor - 2, z, B.stone);
    }
  }
  for (const z of [st.cz - 1, st.cz, st.cz + 1]) {
    put(x0, st.floor - 1, z, B.stone_stairs);
    put(x1, st.floor - 1, z, B.stone_stairs);
  }
}

// Things hidden in the grass to find and pick up. Spread over the whole
// clearing, both sides of the trail, so it is a hunt.
function scatter(put, st, rnd) {
  const id = B[st.scatter.block];
  if (id === undefined) return;
  const spots = [];
  for (let x = st.sx - 7; x <= st.sx + 7; x += 2) {
    for (const z of [st.cz - 4, st.cz - 2, st.cz + 3, st.cz + 5, st.cz + 7]) spots.push([x, z]);
  }
  // Deterministic shuffle, then take the first n — same hunt every visit.
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
  const put = (x, y, z, id) => edits.set(`${x},${y},${z}`, id);
  const path = buildPath(put, npcs, plan);
  return {
    edits, npcs, nodes: [], spawns: [], chests: [], facings: [],
    markers: { spawn: path.spawn, path },
  };
}
