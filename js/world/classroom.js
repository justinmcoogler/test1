// The Schoolhouse — one sealed classroom per lesson, in its own place.
//
// Lessons used to happen in a fenced yard at (200, 200), which is a corner of
// the world you walk to. That has two problems and they are both about the
// child. The first is that a lesson performed in the overworld is performed in
// the world they play in: the blocks they place for a counting exercise are
// real edits to their real save, so the classroom accumulates other people's
// leftovers and the exercise starts dirty. The second is that anything can walk
// up to it.
//
// So each lesson now gets a ROOM OF ITS OWN and you are put inside it. The
// rooms are stacked along a line at (30000, 30000) — far enough out that no
// road, settlement, sky island or cave will ever reach them, and 420 blocks up,
// clear of the highest sky island band (372). Nothing can walk there and there
// is nothing to walk to: the only way in is the lesson, and the only way out is
// finishing it or asking to leave, both of which put you back exactly where you
// were standing when the lesson started.
//
// The rooms are generic and numbered rather than named after lessons: the world
// layer has no business knowing what 'nm_add' is. js/game/lessons.js assigns a
// lesson to a room by its position in its area's list.
import { B } from './blocks.js';

// Far outside anything any generator reaches, and above the top sky band.
export const LESSON_REALM = { x: 30000, z: 30000, y: 420 };
export const ROOM_SPACING = 40;   // no two rooms can see each other
export const ROOM_COUNT = 24;     // room per lesson; add lessons, not plumbing
// Each lesson world is seeded off this. The seed does nothing to the terrain —
// there is no terrain — but a World needs one and two lessons should not share.
export const LESSON_SEED = 0x1e550;

const HALF_X = 7;   // 15 wide
const HALF_Z = 6;   // 13 deep
const WALL_H = 9;   // tall enough to build a tower of six and still see over it

// Where room `i` is and what is in it. Pure geometry, in REAL world
// coordinates — nothing here goes through structures.js's LIFT, because a room
// in the sky has no plateau to be lifted onto.
export function classroomFor(index) {
  const i = ((index | 0) % ROOM_COUNT + ROOM_COUNT) % ROOM_COUNT;
  const cx = LESSON_REALM.x + i * ROOM_SPACING;
  const cz = LESSON_REALM.z;
  const floor = LESSON_REALM.y;      // solid
  const stand = floor + 1;           // where feet go
  return {
    index: i, cx, cz, floor, stand,
    // The work mat: 13 x 5, with a plank divider down the middle so a sorting
    // or symmetry lesson has a left half and a right half.
    //
    // Both of those numbers are the smallest that fit the lessons. Thirteen
    // wide because the place-value lesson asks for an unbroken row of TEN, and
    // the old nine-wide mat could not hold one. Six levels of build room
    // because "make a tower five tall" and "which tower is taller" are Year-1
    // measurement work that a three-block ceiling cannot express. A lesson
    // whose answer does not fit on the mat is unwinnable, and it reads as
    // completely reasonable right up until somebody tries to build it.
    mat: {
      x0: cx - 6, x1: cx + 6, z0: cz - 2, z1: cz + 2,
      y0: stand, y1: stand + 6, div: cx,
    },
    // Feet-on-floor spot the child arrives at: south of the mat, facing it.
    entry: [cx, stand, cz + 5],
  };
}

// Stamp every room. `put(x, y, z, id)` writes ONE block at real coordinates —
// the caller supplies it so this module never has to know how a chunk is built.
export function buildClassrooms(put, npcs) {
  for (let i = 0; i < ROOM_COUNT; i++) buildOneClassroom(put, npcs, i);
}

export function buildOneClassroom(put, npcs, i) {
  {
    const r = classroomFor(i);
    const { cx, cz, floor, stand } = r;
    const x0 = cx - HALF_X, x1 = cx + HALF_X, z0 = cz - HALF_Z, z1 = cz + HALF_Z;
    const top = stand + WALL_H;

    for (let x = x0; x <= x1; x++) {
      for (let z = z0; z <= z1; z++) {
        // Two courses of floor. A child who digs through one block of it would
        // otherwise fall three hundred and fifty blocks into open sky.
        put(x, floor, z, B.planks);
        put(x, floor - 1, z, B.stone_brick);
        put(x, top, z, B.stone_brick);                       // ceiling
        for (let y = stand; y < top; y++) {
          const wall = x === x0 || x === x1 || z === z0 || z === z1;
          put(x, y, z, wall ? B.stone_brick : B.air);
        }
      }
    }
    // Windows on the long walls, so the room reads as a room and not a cell.
    for (let x = x0 + 2; x <= x1 - 2; x += 3) {
      put(x, stand + 2, z0, B.glasspane);
      put(x, stand + 2, z1, B.glasspane);
    }
    // Lanterns in the ceiling — no daylight reaches inside a sealed box, and a
    // dark classroom is both unreadable and somewhere mobs would try to spawn.
    for (const lx of [cx - 5, cx, cx + 5]) {
      for (const lz of [cz - 3, cz + 3]) put(lx, top - 1, lz, B.sea_lantern);
    }

    // The work mat, laid into the floor so it is flush to stand on.
    for (let x = r.mat.x0; x <= r.mat.x1; x++) {
      for (let z = r.mat.z0; z <= r.mat.z1; z++) {
        put(x, floor, z, x === r.mat.div ? B.planks : B.light_gray_wool);
      }
    }
    // Torch posts flanking the divider, and the guide's stand facing the mat.
    put(cx, stand, r.mat.z0 - 1, B.torch_post);
    put(cx - 3, stand, cz + 4, B.torch_post);
    put(cx + 3, stand, cz + 4, B.torch_post);
    // Pip's id, not a per-room one: every NPC lookup in the game is
    // NPC_DEFS[npc.id] with no fallback, so a guide with an invented id has no
    // label, no role and no dialogue — and the world-label pass throws on it
    // every frame. There is one guide in this game and this is her, standing in
    // each of her classrooms. `room` marks her as Schoolhouse furniture rather
    // than world population.
    npcs.push({ id: 'pip', room: i, x: cx, y: stand, z: cz - 4 });
  }
}

// A whole world's worth of hand-built content for a lesson world: one room and
// nothing else. Shaped exactly like buildStarterStructures()'s return so World
// can consume either without caring which it got.
export function lessonStructure(index) {
  const edits = new Map();
  const npcs = [];
  const put = (x, y, z, id) => edits.set(`${x},${y},${z}`, id);
  buildOneClassroom(put, npcs, index);
  const r = classroomFor(index);
  return {
    edits, npcs, nodes: [], spawns: [], chests: [], facings: [],
    markers: { spawn: r.entry, classrooms: classroomMarkers() },
  };
}

// Every room's mat, for the lesson runner. Index matches classroomFor(index).
export function classroomMarkers() {
  const out = [];
  for (let i = 0; i < ROOM_COUNT; i++) {
    const r = classroomFor(i);
    out.push({ index: i, entry: r.entry, mat: r.mat, cx: r.cx, cz: r.cz, stand: r.stand });
  }
  return out;
}
