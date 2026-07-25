// Brookhollow — a medieval market town, built rather than imported.
//
// WHAT MAKES A MEDIEVAL TOWN READ AS ONE
//  1. TIMBER FRAME — dark posts and beams over pale infill: sill beam at the
//     floor, head beam under the eaves, studs between.
//  2. STONE PLINTH — timber kept off wet ground; visually it anchors the house.
//  3. JETTIED UPPER STOREYS — each floor oversails the one below. The most
//     recognisable medieval silhouette, and it breaks the flat wall plane.
//  4. DEEP EAVES — the roof oversails the wall by two blocks on the long sides
//     and one on the gables, so every building throws a shadow line instead of
//     ending flush. A roof flush to the wall is the clearest amateur tell.
//  5. CHIMNEYS breaking the roofline, smoking.
//  6. ORGANIC PLAN — plots differ in size, theme and setback; streets bow.
//  7. VARIETY WITHIN A PALETTE — ten house THEMES below share one material
//     family, so the town reads as one place built by many hands over time
//     rather than ten unrelated buildings or one building ten times.
//
// The caller supplies the primitives so this module stays pure geometry.

// Deterministic per-town RNG: the same seed always rebuilds the same town.
function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

export function buildTown(api) {
  const { B, set, setF, box, F, GROUND, chests, npcs, nodes } = api;
  const rand = rng(0x51ce1d);

  // --- relief --------------------------------------------------------------
  // A flat town reads as a car park. This gives the site gentle rolling ground
  // — a rise to the north where the moot hall sits, a dip toward the pond —
  // and flattens out under the market square so trading stays walkable.
  const elev = (x, z) => {
    const roll = Math.sin(x / 19) * 1.9 + Math.cos(z / 23) * 1.7 + Math.sin((x + z) / 31) * 1.2;
    const northRise = Math.max(0, (-z - 8)) * 0.10;          // ground climbs toward the hall
    const plaza = Math.max(0, 1 - Math.hypot(x, z) / 11);     // 0..1, 1 at the centre
    const h = roll + northRise;
    return Math.round(h * (1 - plaza));                       // flatten to 0 at the square
  };
  // Sculpt the pad by writing only the DELTA from the flat pad — raising a
  // column stacks dirt on top, lowering it cuts air out. Rewriting every column
  // wholesale cost ~90k edits for the same shape.
  for (let x = -42; x <= 42; x++) for (let z = -36; z <= 36; z++) {
    const h = elev(x, z);
    if (h > 0) {
      set(x, GROUND, z, B.dirt);
      for (let d = 1; d < h; d++) set(x, GROUND + d, z, B.dirt);
      set(x, GROUND + h, z, B.grass);
    } else if (h < 0) {
      for (let d = h + 1; d <= 0; d++) set(x, GROUND + d, z, B.air);
      set(x, GROUND + h, z, B.grass);
    }
  }
  const gy = (x, z) => GROUND + elev(x, z);                   // ground surface here
  const fy = (x, z) => gy(x, z) + 1;                          // the floor/walk level here
  const pick = (a) => a[Math.floor(rand() * a.length) % a.length];

  // --- material families ---------------------------------------------------
  const WOODS = [B.fernwood_log, B.emberpine_log, B.oak_log];
  const INFILL = [B.white_terracotta, B.white_concrete, B.light_gray_terracotta ?? B.white_terracotta];
  const DOORS = [B.oak_door, B.birch_door, B.pine_door, B.cedar_door, B.ash_door, B.walnut_door];
  const ROOFS = {
    thatch: { stair: B.thatch, slab: B.thatch_slab },
    tile: { stair: B.brick_stairs, slab: B.brick_slab },
    slate: { stair: B.deepslate_stairs ?? B.stone_brick_stairs, slab: B.stone_brick_slab },
    stone: { stair: B.stone_brick_stairs, slab: B.stone_brick_slab },
    cobble: { stair: B.cobble_stairs, slab: B.cobble_slab },
  };

  // --- ten house themes ----------------------------------------------------
  // Each is a different building TYPE, not a recolour: storey count, footprint
  // bias, wall treatment and roof material all change together.
  const THEMES = {
    cottage:    { storeys: 1, roof: 'thatch', wall: 'frame', size: [3, 3], porch: false },
    longhouse:  { storeys: 1, roof: 'thatch', wall: 'frame', size: [6, 3], porch: true },
    townhouse:  { storeys: 2, roof: 'tile', wall: 'frame', size: [4, 3], porch: false },
    tudor:      { storeys: 3, roof: 'slate', wall: 'frame', size: [3, 3], porch: false },
    stonehouse: { storeys: 2, roof: 'slate', wall: 'stone', size: [4, 3], porch: false },
    shopfront:  { storeys: 2, roof: 'tile', wall: 'frame', size: [4, 3], porch: true, awning: true },
    tavern:     { storeys: 2, roof: 'thatch', wall: 'frame', size: [5, 4], porch: true, sign: true },
    smithy:     { storeys: 1, roof: 'tile', wall: 'stone', size: [4, 3], porch: false, bigChimney: true },
    barn:       { storeys: 1, roof: 'thatch', wall: 'plank', size: [5, 4], porch: false, wide: true },
    towerhouse: { storeys: 3, roof: 'cobble', wall: 'stone', size: [2, 2], porch: false },
  };

  // --- primitives ----------------------------------------------------------
  const rect = (x0, z0, x1, z1, y, id) => box(x0, y, z0, x1, y, z1, id);
  const postCol = (x, z, y0, y1, id) => box(x, y0, z, x, y1, z, id);

  // A framed wall run: infill, sill + head beams, studs every third block.
  const framedWall = (x0, z0, x1, z1, yBase, h, timber, infill) => {
    box(x0, yBase, z0, x1, yBase + h - 1, z1, infill);
    box(x0, yBase, z0, x1, yBase, z1, timber);
    box(x0, yBase + h - 1, z0, x1, yBase + h - 1, z1, timber);
    const horiz = x1 - x0 >= z1 - z0;
    const n = horiz ? x1 - x0 : z1 - z0;
    for (let i = 3; i < n; i += 3) {
      postCol(horiz ? x0 + i : x0, horiz ? z0 : z0 + i, yBase + 1, yBase + h - 2, timber);
    }
  };
  const solidWall = (x0, z0, x1, z1, yBase, h, id) => box(x0, yBase, z0, x1, yBase + h - 1, z1, id);

  // Gabled roof with DEEP eaves: `overX` past the long walls, `overZ` past the
  // gables. The slope runs along X, so overX is what actually reads as an eave.
  const roof = (x0, z0, x1, z1, yBase, kind, overX = 2, overZ = 1) => {
    const { stair, slab } = ROOFS[kind] || ROOFS.thatch;
    const ax0 = x0 - overX, ax1 = x1 + overX, az0 = z0 - overZ, az1 = z1 + overZ;
    const half = Math.floor((ax1 - ax0) / 2);
    for (let L = 0; L <= half; L++) {
      const y = yBase + L, wx = ax0 + L, ex = ax1 - L;
      if (wx < ex) {
        for (let z = az0; z <= az1; z++) { setF(wx, y, z, stair, 1); setF(ex, y, z, stair, 3); }
        for (const zEnd of [az0, az1]) for (let yy = yBase; yy < y; yy++) {
          set(wx, yy, zEnd, B.white_terracotta); set(ex, yy, zEnd, B.white_terracotta);
        }
      } else {
        for (let z = az0; z <= az1; z++) set(wx, y, z, slab);
      }
    }
  };

  const lamp = (x, z) => {
    set(x, F, z, B.planks_fence); set(x, F + 1, z, B.planks_fence); set(x, F + 2, z, B.sea_lantern);
  };
  const clutter = (x, z) => { const c = [B.crate, B.barrel, B.planks, B.hay_bale]; set(x, F, z, pick(c.filter(Boolean))); };

  // --- the house builder ---------------------------------------------------
  const house = (cx, cz, themeName, opts = {}) => {
    const T = THEMES[themeName] || THEMES.cottage;
    const face = opts.face || pick(['S', 'N', 'E', 'W']);
    const timber = pick(WOODS), infill = pick(INFILL), door = pick(DOORS);
    const stoneId = pick([B.cobble, B.stone_brick, B.granite ?? B.stone_brick]);
    // jitter the footprint so no two houses of a theme are identical
    const hx = T.size[0] + (rand() < 0.4 ? 1 : 0);
    const hz = T.size[1] + (rand() < 0.3 ? 1 : 0);
    const wallH = T.wall === 'stone' ? 5 : 4;

    let x0 = cx - hx, x1 = cx + hx, z0 = cz - hz, z1 = cz + hz;
    // The house sits on the highest ground under its footprint, and the plinth
    // is packed down to meet the terrain on the low side — so a building on a
    // slope stands level on a visible stone base instead of floating or sinking.
    let base = -Infinity;
    for (let x = x0 - 1; x <= x1 + 1; x++) for (let z = z0 - 1; z <= z1 + 1; z++) base = Math.max(base, gy(x, z));
    const FL = base + 1;                                             // this house's floor level
    rect(x0, z0, x1, z1, base, B.planks);
    for (let x = x0 - 1; x <= x1 + 1; x++) for (let z = z0 - 1; z <= z1 + 1; z++) {
      for (let y = gy(x, z); y <= base; y++) set(x, y, z, stoneId);  // packed plinth
    }
    // steps down from the doorstep if the ground falls away
    const step = (sx, sz) => { for (let y = gy(sx, sz) + 1; y <= FL; y++) set(sx, y, sz, B.cobble_slab ?? B.cobble); };

    const wallOf = (a0, b0, a1, b1, yb, h) => {
      if (T.wall === 'stone') solidWall(a0, b0, a1, b1, yb, h, stoneId);
      else if (T.wall === 'plank') solidWall(a0, b0, a1, b1, yb, h, B.planks);
      else framedWall(a0, b0, a1, b1, yb, h, timber, infill);
    };

    let y = FL;
    for (let s = 0; s < T.storeys; s++) {
      wallOf(x0, z0, x1, z0, y, wallH); wallOf(x0, z1, x1, z1, y, wallH);
      wallOf(x0, z0, x0, z1, y, wallH); wallOf(x1, z0, x1, z1, y, wallH);
      for (const [px, pz] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1]]) postCol(px, pz, y, y + wallH - 1, timber);
      // windows on this storey
      for (const dx of [-2, 2]) {
        if (Math.abs(dx) <= hx - 1) { set(cx + dx, y + 2, z1, B.glasspane); set(cx + dx, y + 2, z0, B.glasspane); }
      }
      for (const dz of [-1, 1]) {
        if (Math.abs(dz) <= hz - 1) { set(x0, y + 2, cz + dz, B.glasspane); set(x1, y + 2, cz + dz, B.glasspane); }
      }
      set(cx, y + wallH - 1, cz, B.sea_lantern);                    // light each floor
      y += wallH;
      if (s < T.storeys - 1) {                                      // JETTY: oversail
        x0 -= 1; x1 += 1; z0 -= 1; z1 += 1;
        rect(x0, z0, x1, z1, y, B.planks);
        y += 1;
      }
    }

    // doorway on the street face, with a lamp and optional porch
    const cut = (x, z) => { set(x, FL, z, B.air); set(x, FL + 1, z, B.air); };
    const dPos = { S: [cx, z1], N: [cx, z0], E: [x1, cz], W: [x0, cz] }[face];
    const dx0 = face === 'S' ? 0 : face === 'N' ? 0 : face === 'E' ? 1 : -1;
    const dz0 = face === 'S' ? 1 : face === 'N' ? -1 : 0;
    cut(dPos[0], dPos[1]); set(dPos[0], FL, dPos[1], door);
    lamp(dPos[0] + (dz0 !== 0 ? 1 : 0), dPos[1] + (dx0 !== 0 ? 1 : 0));
    if (T.porch) {                                                  // sheltered step
      for (let d = -1; d <= 1; d++) {
        const px = dPos[0] + (dz0 !== 0 ? d : dx0), pz = dPos[1] + (dz0 !== 0 ? dz0 : d);
        set(px, FL + 3, pz, T.awning ? B.white_wool : B.planks_slab ?? B.planks);
      }
    }
    if (T.sign) set(dPos[0] + 1, FL + 2, dPos[1] + dz0, B.sign);

    roof(x0, z0, x1, z1, y, T.roof, 2, 1);
    // chimney — a fat stack for a forge, a slim one for a hearth
    const chW = T.bigChimney ? 1 : 0;
    for (let dx = -chW; dx <= chW; dx++) {
      box(x1 - 1 + dx, FL, z0 + 1, x1 - 1 + dx, y + hx + 1, z0 + 1, stoneId);
    }
    set(x1 - 1, y + hx + 2, z0 + 1, B.campfire);
    // a little life at the doorstep
    if (rand() < 0.7) clutter(dPos[0] + 2, dPos[1] + dz0);
    if (rand() < 0.5) set(dPos[0] - 1, FL, dPos[1] + dz0, B.flower_pot);
    return { x0, x1, z0, z1, cx, cz };
  };

  // --- streets: bowed, cobble with gravel verges ---------------------------
  // paving lays on the local surface, so the streets roll with the ground
  const paveRow = (x, z, w) => { for (let d = -w; d <= w; d++) set(x, gy(x, z + d), z + d, Math.abs(d) === w ? B.gravel : B.cobble); };
  const paveCol = (x, z, w) => { for (let d = -w; d <= w; d++) set(x + d, gy(x + d, z), z, Math.abs(d) === w ? B.gravel : B.cobble); };
  for (let x = -40; x <= 40; x++) paveRow(x, Math.round(Math.sin(x / 14) * 2), 2);
  for (let z = -34; z <= 34; z++) paveCol(Math.round(Math.sin(z / 12) * 2), z, 2);

  // --- plaza: mixed paving, well, market stalls ---------------------------
  for (let x = -7; x <= 7; x++) for (let z = -7; z <= 7; z++) {
    set(x, gy(x, z), z, (x + z) % 4 === 0 ? B.stone_brick : B.cobble);
  }
  {
    const wx = 5, wz = -5;
    for (const [dx, dz] of [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]]) set(wx + dx, F, wz + dz, B.cobble);
    set(wx, GROUND, wz, B.cobble); set(wx, F, wz, B.water);
    for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) box(wx + dx, F + 1, wz + dz, wx + dx, F + 2, wz + dz, B.fernwood_log);
    box(wx - 1, F + 3, wz - 1, wx + 1, F + 3, wz + 1, B.thatch);
  }
  const stall = (sx, sz) => {
    for (let d = -1; d <= 1; d++) set(sx + d, F, sz, B.planks_slab ?? B.planks);
    postCol(sx - 2, sz, F, F + 2, B.fernwood_log); postCol(sx + 2, sz, F, F + 2, B.fernwood_log);
    for (let d = -2; d <= 2; d++) set(sx + d, F + 3, sz, d % 2 === 0 ? B.white_wool : B.thatch);
    clutter(sx - 2, sz - 1);
  };
  stall(-4, 5); stall(2, 5); stall(-4, -3);
  for (const [lx, lz] of [[-6, -6], [6, 6], [-6, 6], [6, -6]]) lamp(lx, lz);

  // --- buildings: every plot a different theme, size and setback -----------
  const maren = house(-14, -13, 'tavern', { face: 'S' });
  set(maren.x0 + 1, F, maren.z0 + 1, B.chest_block);
  chests.push({ id: 'maren_chest', x: maren.x0 + 1, y: F, z: maren.z0 + 1, loot: [{ item: 'travel_biscuit', qty: 3 }] });
  npcs.push({ id: 'maren', x: -14, y: F, z: -7 });

  house(13, -14, 'smithy', { face: 'S' });
  set(10, F, -16, B.workbench); set(12, F, -16, B.furnace);
  set(14, F, -16, B.anvil_block); set(16, F, -16, B.construction_bench);
  set(10, F, -12, B.loom_block); set(12, F, -12, B.alchemy_table);
  set(16, F, -12, B.chest_block);
  chests.push({ id: 'workshop_chest', x: 16, y: F, z: -12, loot: [{ item: 'rough_stone', qty: 4 }, { item: 'plant_fibre', qty: 4 }] });
  set(9, F, -9, B.campfire);

  const tam = house(-15, 10, 'shopfront', { face: 'E' });
  set(tam.x0 + 1, F, tam.z0 + 1, B.chest_block);
  chests.push({ id: 'tam_chest', x: tam.x0 + 1, y: F, z: tam.z0 + 1, loot: [] });
  npcs.push({ id: 'tam', x: -15, y: F, z: 14 });
  stall(-11, 6);

  // the rest of the town — one of each remaining theme, scattered and turned
  house(16, 12, 'townhouse', { face: 'W' });
  house(25, -3, 'cottage', { face: 'W' });
  house(-26, -16, 'longhouse', { face: 'E' });
  house(24, 20, 'tudor', { face: 'N' });
  house(-24, 22, 'stonehouse', { face: 'N' });
  house(30, -18, 'barn', { face: 'S' });
  house(-30, 2, 'towerhouse', { face: 'E' });
  house(8, 22, 'cottage', { face: 'N' });
  house(-8, 26, 'townhouse', { face: 'N' });

  // --- moot hall + bell tower: the focal point -----------------------------
  {
    const cx = 0, cz = -22, hx = 6, hz = 4;
    const x0 = cx - hx, x1 = cx + hx, z0 = cz - hz, z1 = cz + hz;
    rect(x0, z0, x1, z1, GROUND, B.stone_brick);
    rect(x0 - 1, z0 - 1, x1 + 1, z1 + 1, F - 1, B.cobble);
    for (const [a0, b0, a1, b1] of [[x0, z0, x1, z0], [x0, z1, x1, z1], [x0, z0, x0, z1], [x1, z0, x1, z1]]) {
      box(a0, F, b0, a1, F + 5, b1, B.stone_brick);
    }
    for (let x = x0 + 2; x <= x1 - 2; x += 3) {
      box(x, F + 2, z1, x, F + 4, z1, B.glasspane); box(x, F + 2, z0, x, F + 4, z0, B.glasspane);
    }
    set(cx, F, z1, B.air); set(cx, F + 1, z1, B.air); set(cx, F, z1, B.walnut_door);
    roof(x0, z0, x1, z1, F + 6, 'tile', 2, 1);
    const tx = x0 + 1, tz = cz;
    box(tx - 1, F, tz - 1, tx + 1, F + 12, tz + 1, B.stone_brick);
    box(tx, F + 1, tz, tx, F + 11, tz, B.air);
    for (const [dx, dz] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) box(tx + dx, F + 10, tz + dz, tx + dx, F + 11, tz + dz, B.air);
    set(tx, F + 11, tz, B.sea_lantern);
    roof(tx - 1, tz - 1, tx + 1, tz + 1, F + 13, 'cobble', 1, 1);
    lamp(cx - 2, z1 + 2); lamp(cx + 2, z1 + 2);
  }

  // --- gatehouse on the south road ----------------------------------------
  {
    const gz = 30;
    for (const gx of [-4, 4]) {
      box(gx, F, gz - 1, gx, F + 5, gz + 1, B.stone_brick);
      set(gx, F + 6, gz, B.cobble_wall); set(gx, F + 7, gz, B.sea_lantern);
    }
    for (let x = -4; x <= 4; x++) { set(x, F + 5, gz, B.stone_brick); set(x, F + 6, gz, B.stone_brick_slab); }
    clutter(-6, gz + 2); clutter(6, gz + 2);
  }

  // --- allotments behind the houses ---------------------------------------
  for (let fx = -22; fx <= -16; fx += 2) for (let fz = -6; fz <= 2; fz += 2) {
    nodes.push({ type: 'farm_plot', x: fx, y: F, z: fz });
  }
}
