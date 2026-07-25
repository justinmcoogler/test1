// Brookhollow — a medieval market town, built rather than imported.
//
// WHAT MAKES A MEDIEVAL TOWN READ AS ONE
// The techniques below are the ones that separate a convincing medieval build
// from a row of boxes. Each is applied deliberately here:
//
//  1. TIMBER FRAME. Dark log posts and beams over pale plaster infill, with
//     diagonal corner braces. The frame is structural-looking, not decorative:
//     posts at the corners, a sill beam at the floor, a head beam under the
//     eaves, studs between.
//  2. STONE PLINTH. Every building sits on a course of cobble. Medieval builders
//     kept timber off wet ground, and visually it anchors the house.
//  3. JETTIED UPPER STOREY. The first floor oversails the ground floor by one
//     block on the street sides. This is the single most recognisable medieval
//     silhouette and it breaks the flat wall plane that makes builds look cheap.
//  4. STEEP ROOF WITH EAVES. 45 degrees, and the roof oversails the wall by one
//     block so the building casts a shadow line instead of ending flush.
//  5. CHIMNEY. A stone stack up one gable, smoking. Roofs need something
//     breaking their line.
//  6. ORGANIC PLAN. No grid. Plots differ in size, sit at different depths from
//     the street, and the streets themselves kink. Medieval towns accreted.
//  7. PALETTE DISCIPLINE. Three materials — timber, plaster, cobble — plus
//     thatch and one accent. Variety comes from arrangement, not from more
//     block types.
//  8. CLUTTER AT EYE LEVEL. Lanterns, barrels, crates, flower boxes, market
//     stalls, a well. This is what sells "people live here".
//  9. A FOCAL POINT. The moot hall's bell tower gives the skyline a peak and
//     the plaza something to face.
//
// The caller supplies the primitives so this module stays pure geometry.

export function buildTown(api) {
  const { B, set, setF, box, F, GROUND, chests, npcs, nodes } = api;

  const TIMBER = B.fernwood_log;      // dark frame
  const PLASTER = B.white_terracotta; // pale infill
  const PLINTH = B.cobble;
  const FLOOR = B.planks;

  // --- helpers ------------------------------------------------------------
  const rect = (x0, z0, x1, z1, y, id) => box(x0, y, z0, x1, y, z1, id);
  const post = (x, z, y0, y1) => box(x, y0, z, x, y1, z, TIMBER);

  // A timber-framed wall run: plaster infill, a beam top and bottom, studs
  // every third block, and a brace at each end.
  const framedWall = (x0, z0, x1, z1, yBase, h) => {
    box(x0, yBase, z0, x1, yBase + h - 1, z1, PLASTER);          // infill
    box(x0, yBase, z0, x1, yBase, z1, TIMBER);                   // sill beam
    box(x0, yBase + h - 1, z0, x1, yBase + h - 1, z1, TIMBER);   // head beam
    const horiz = x1 - x0 >= z1 - z0;
    const n = horiz ? x1 - x0 : z1 - z0;
    for (let i = 3; i < n; i += 3) {                             // studs
      const sx = horiz ? x0 + i : x0, sz = horiz ? z0 : z0 + i;
      post(sx, sz, yBase + 1, yBase + h - 2);
    }
  };

  // Steep gabled roof over a footprint, oversailing by `over` on every side.
  const roof = (x0, z0, x1, z1, yBase, stair, slab, over = 1) => {
    const ax0 = x0 - over, ax1 = x1 + over, az0 = z0 - over, az1 = z1 + over;
    const half = Math.floor((ax1 - ax0) / 2);
    for (let L = 0; L <= half; L++) {
      const y = yBase + L, wx = ax0 + L, ex = ax1 - L;
      if (wx < ex) {
        for (let z = az0; z <= az1; z++) { setF(wx, y, z, stair, 1); setF(ex, y, z, stair, 3); }
        for (const zEnd of [az0, az1]) for (let yy = yBase; yy < y; yy++) {  // gable infill
          set(wx, yy, zEnd, PLASTER); set(ex, yy, zEnd, PLASTER);
        }
      } else {
        for (let z = az0; z <= az1; z++) set(wx, y, z, slab);     // ridge
      }
    }
  };

  const chimney = (x, z, yBase, yTop) => {
    box(x, yBase, z, x, yTop, z, B.cobble);
    set(x, yTop + 1, z, B.cobble_wall);
    set(x, yTop + 2, z, B.campfire);                              // smoke plume
  };

  const lamp = (x, z) => {
    set(x, F, z, B.planks_fence); set(x, F + 1, z, B.planks_fence);
    set(x, F + 2, z, B.sea_lantern);
  };
  const planter = (x, z) => { set(x, F, z, B.flower_pot); };
  const barrels = (x, z, n = 2) => { for (let i = 0; i < n; i++) set(x + i, F, z, B.crate ?? B.planks); };

  // A townhouse: cobble plinth, framed ground floor, JETTIED framed upper
  // floor, steep thatch roof with eaves, and a chimney. `face` is the street
  // side the door opens onto.
  const townhouse = (cx, cz, hx, hz, opts = {}) => {
    const { face = 'S', storeys = 2, door = B.oak_door, thatch = true } = opts;
    const x0 = cx - hx, x1 = cx + hx, z0 = cz - hz, z1 = cz + hz;
    const wallH = 4;

    rect(x0, z0, x1, z1, GROUND, FLOOR);
    rect(x0 - 1, z0 - 1, x1 + 1, z1 + 1, F - 1, PLINTH);          // plinth apron
    // ground floor frame
    framedWall(x0, z0, x1, z0, F, wallH); framedWall(x0, z1, x1, z1, F, wallH);
    framedWall(x0, z0, x0, z1, F, wallH); framedWall(x1, z0, x1, z1, F, wallH);
    for (const [px, pz] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1]]) post(px, pz, F, F + wallH - 1);

    let topY = F + wallH - 1;
    if (storeys > 1) {
      // JETTY: the upper storey oversails by one block on all four sides
      const jx0 = x0 - 1, jx1 = x1 + 1, jz0 = z0 - 1, jz1 = z1 + 1;
      const y2 = topY + 1;
      rect(jx0, jz0, jx1, jz1, y2, FLOOR);                        // oversailing floor
      framedWall(jx0, jz0, jx1, jz0, y2 + 1, wallH); framedWall(jx0, jz1, jx1, jz1, y2 + 1, wallH);
      framedWall(jx0, jz0, jx0, jz1, y2 + 1, wallH); framedWall(jx1, jz0, jx1, jz1, y2 + 1, wallH);
      for (const [px, pz] of [[jx0, jz0], [jx1, jz0], [jx0, jz1], [jx1, jz1]]) post(px, pz, y2 + 1, y2 + wallH);
      // upper windows, centred
      set(cx, y2 + 2, jz1, B.glasspane); set(cx, y2 + 2, jz0, B.glasspane);
      set(jx0, y2 + 2, cz, B.glasspane); set(jx1, y2 + 2, cz, B.glasspane);
      topY = y2 + wallH;
    }

    // ground-floor windows either side of centre
    for (const dx of [-2, 2]) { set(cx + dx, F + 2, z1, B.glasspane); set(cx + dx, F + 2, z0, B.glasspane); }
    for (const dz of [-2, 2]) { set(x0, F + 2, cz + dz, B.glasspane); set(x1, F + 2, cz + dz, B.glasspane); }

    // doorway on the street face
    const cut = (x, z) => { set(x, F, z, B.air); set(x, F + 1, z, B.air); };
    const dz1 = { S: [cx, z1], N: [cx, z0], E: [x1, cz], W: [x0, cz] }[face];
    cut(dz1[0], dz1[1]); set(dz1[0], F, dz1[1], door);
    lamp(dz1[0] + 1, dz1[1] + (face === 'S' ? 2 : face === 'N' ? -2 : 0));

    const rTop = storeys > 1 ? topY + 1 : F + wallH;
    roof(x0, z0, x1, z1, rTop, thatch ? B.thatch : B.brick_stairs, thatch ? B.thatch_slab : B.brick_slab, 1);
    chimney(x1 - 1, z0 + 1, F, rTop + hx + 1);
    set(cx, F + wallH - 1, cz, B.sea_lantern);                    // interior light
    return { x0, x1, z0, z1, cx, cz };
  };

  // --- streets: cobble spine, gravel verges, kinked rather than ruled ------
  const paveRow = (x, z, w) => { for (let d = -w; d <= w; d++) set(x, GROUND, z + d, d === -w || d === w ? B.gravel : B.cobble); };
  const paveCol = (x, z, w) => { for (let d = -w; d <= w; d++) set(x + d, GROUND, z, d === -w || d === w ? B.gravel : B.cobble); };
  for (let x = -34; x <= 34; x++) paveRow(x, Math.round(Math.sin(x / 14) * 2), 2);   // the high street bows
  for (let z = -30; z <= 30; z++) paveCol(Math.round(Math.sin(z / 12) * 2), z, 2);   // the cross lane

  // --- the plaza: market square, well, stalls -----------------------------
  for (let x = -7; x <= 7; x++) for (let z = -7; z <= 7; z++) {
    set(x, GROUND, z, (x + z) % 4 === 0 ? B.stone_brick : B.cobble);   // mixed paving
  }
  {
    const wx = 5, wz = -5;                                        // the town well
    for (const [dx, dz] of [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]]) set(wx + dx, F, wz + dz, B.cobble);
    set(wx, GROUND, wz, B.cobble); set(wx, F, wz, B.water);
    for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) box(wx + dx, F + 1, wz + dz, wx + dx, F + 2, wz + dz, TIMBER);
    box(wx - 1, F + 3, wz - 1, wx + 1, F + 3, wz + 1, B.thatch);
  }
  // market stalls: a counter under a striped awning on posts
  const stall = (sx, sz) => {
    for (let d = -1; d <= 1; d++) set(sx + d, F, sz, B.planks_slab ?? B.planks);
    post(sx - 2, sz, F, F + 2); post(sx + 2, sz, F, F + 2);
    for (let d = -2; d <= 2; d++) set(sx + d, F + 3, sz, d % 2 === 0 ? B.white_wool : B.thatch);
    barrels(sx - 2, sz - 1, 2);
  };
  stall(-4, 5); stall(2, 5); stall(-4, -3);
  for (const [lx, lz] of [[-6, -6], [6, 6], [-6, 6], [6, -6]]) lamp(lx, lz);
  for (const [px, pz] of [[-3, -6], [3, 6], [-6, 2], [6, -2]]) planter(px, pz);

  // --- buildings: varied plots, set back different depths ------------------
  // Elder Maren's house — the largest, facing the plaza from the north-west.
  const maren = townhouse(-13, -12, 4, 3, { face: 'S', storeys: 2, door: B.oak_door });
  set(maren.x0 + 1, F, maren.z0 + 1, B.chest_block);
  chests.push({ id: 'maren_chest', x: maren.x0 + 1, y: F, z: maren.z0 + 1, loot: [{ item: 'travel_biscuit', qty: 3 }] });
  npcs.push({ id: 'maren', x: -13, y: F, z: -7 });

  // The smithy — single storey, tiled roof (a forge would burn thatch), open
  // forge yard out front with the crafting stations.
  const smith = townhouse(13, -13, 4, 3, { face: 'S', storeys: 1, thatch: false, door: B.ash_door });
  set(10, F, -15, B.workbench); set(12, F, -15, B.furnace);
  set(14, F, -15, B.anvil_block); set(16, F, -15, B.construction_bench);
  set(10, F, -11, B.loom_block); set(12, F, -11, B.alchemy_table);
  set(16, F, -11, B.chest_block);
  chests.push({ id: 'workshop_chest', x: 16, y: F, z: -11, loot: [{ item: 'rough_stone', qty: 4 }, { item: 'plant_fibre', qty: 4 }] });
  set(9, F, -8, B.campfire); barrels(11, -8, 3);
  void smith;

  // Tam's store — jettied, gable to the street, door onto the lane.
  const tam = townhouse(-14, 9, 3, 3, { face: 'E', storeys: 2, door: B.birch_door });
  set(tam.x0 + 1, F, tam.z0 + 1, B.chest_block);
  chests.push({ id: 'tam_chest', x: tam.x0 + 1, y: F, z: tam.z0 + 1, loot: [] });
  npcs.push({ id: 'tam', x: -14, y: F, z: 12 });
  stall(-11, 6);

  // Two cottages filling the street edge — different sizes and setbacks so the
  // frontage is ragged rather than ruled.
  townhouse(15, 11, 3, 3, { face: 'W', storeys: 2, door: B.pine_door });
  townhouse(22, -4, 3, 2, { face: 'W', storeys: 1, door: B.cedar_door });

  // --- the moot hall: the town's focal point, with a bell tower ------------
  {
    const cx = 0, cz = -20, hx = 6, hz = 4;
    const x0 = cx - hx, x1 = cx + hx, z0 = cz - hz, z1 = cz + hz;
    rect(x0, z0, x1, z1, GROUND, B.stone_brick);
    rect(x0 - 1, z0 - 1, x1 + 1, z1 + 1, F - 1, PLINTH);
    box(x0, F, z0, x1, F + 5, z0, B.stone_brick);
    box(x0, F, z1, x1, F + 5, z1, B.stone_brick);
    box(x0, F, z0, x0, F + 5, z1, B.stone_brick);
    box(x1, F, z0, x1, F + 5, z1, B.stone_brick);
    for (let x = x0 + 2; x <= x1 - 2; x += 3) {                   // tall arched windows
      box(x, F + 2, z1, x, F + 4, z1, B.glasspane);
      box(x, F + 2, z0, x, F + 4, z0, B.glasspane);
    }
    set(cx, F, z1, B.air); set(cx, F + 1, z1, B.air); set(cx, F, z1, B.walnut_door);
    roof(x0, z0, x1, z1, F + 6, B.brick_stairs, B.brick_slab, 1);
    // bell tower off the west end — the skyline peak
    const tx = x0 + 1, tz = cz;
    box(tx - 1, F, tz - 1, tx + 1, F + 12, tz + 1, B.stone_brick);
    box(tx, F + 1, tz, tx, F + 11, tz, B.air);                    // hollow shaft
    for (const [dx, dz] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) box(tx + dx, F + 10, tz + dz, tx + dx, F + 11, tz + dz, B.air); // belfry openings
    set(tx, F + 11, tz, B.sea_lantern);
    roof(tx - 1, tz - 1, tx + 1, tz + 1, F + 13, B.brick_stairs, B.brick_slab, 1);
    lamp(cx - 2, z1 + 2); lamp(cx + 2, z1 + 2);
  }

  // --- town approach: a gatehouse on the south road -----------------------
  {
    const gz = 26;
    for (const gx of [-4, 4]) {
      box(gx, F, gz - 1, gx, F + 5, gz + 1, B.stone_brick);
      set(gx, F + 6, gz, B.cobble_wall); set(gx, F + 7, gz, B.sea_lantern);
    }
    for (let x = -4; x <= 4; x++) { set(x, F + 5, gz, B.stone_brick); set(x, F + 6, gz, B.stone_brick_slab); }
    for (const [bx, bz] of [[-6, gz + 2], [6, gz + 2]]) barrels(bx, bz, 2);
  }

  // --- allotments behind the houses ---------------------------------------
  for (let fx = -26; fx <= -18; fx += 2) for (let fz = -6; fz <= 2; fz += 2) {
    nodes.push({ type: 'farm_plot', x: fx, y: F, z: fz });
  }
  for (let x = -28; x <= -16; x++) for (let z = -8; z <= 4; z++) {
    if ((x + z) % 7 === 0) set(x, GROUND, z, B.dirt);
  }
  for (const [hx2, hz2] of [[-17, 4], [-27, -8]]) { set(hx2, F, hz2, B.thatch); set(hx2, F + 1, hz2, B.thatch); }
}
