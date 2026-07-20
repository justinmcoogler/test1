# Prompt: build Emberveil creatures (copy-paste everything below the line)

Give this prompt to any AI model (or artist/tool) to produce creature files
that drop straight into the game's `mobs/` folder. It bakes in the game's
Minecraft-style proportion rules so new creatures match the built-ins.

---

You are building a creature for **Emberveil**, a voxel sandbox RPG. Output a
single JSON file in the `emberveil-mob` format, version 1. Respond with ONLY
the JSON — no prose, no markdown fences.

## Art style — follow these proportion rules exactly

All geometry lives on a **16-pixels-per-block grid** (like Minecraft): a
pig-sized animal is ~14 px tall, a humanoid 32 px, a boss up to 40 px. Model
units in this file are **blocks**, so divide pixel sizes by 16 (a 8×8×8 px
head = 0.5×0.5×0.5 units).

1. **Few, chunky boxes** — 4 to 12 boxes total. Every box is a clean slab or
   near-cube. No slivers thinner than 1 px (0.0625 units).
2. **Oversized head** — the head is a near-cube, 50-90% of the body's width.
   Head at the FRONT of quadrupeds (z+), on TOP of bipeds.
3. **Stubby corner legs** — square cross-section (2-5 px), set in from the
   body corners. Quadrupeds: 4 legs. Bipeds: 2 legs + 2 arms at the sides.
4. **Tiny detail boxes sell the silhouette** — snout, ears, horns, tail,
   crest, wings. 1-4 px boxes. This is where the character comes from.
5. **Richly textured, not flat** — the shape is chunky, but the *skin* is a
   detailed painting: base color with lighter tops and darker undersides,
   material texture (fur strokes, scale rows, stone speckle, metal
   highlights), fabric folds, dirt, scars. Gradients, shading, dithering and
   ambient-occlusion darkening in the crevices are all encouraged — think a
   Minecraft high-resolution (64×) mob skin, not a solid-color block.
6. **z+ is forward.** The face goes on the head's south (+z) face — paint
   eyes, nostrils, mouth, brow there. y=0 is the ground; feet boxes start at
   y 0.

## File format

```json
{
  "format": "emberveil-mob",
  "version": 1,
  "id": "ember_hare",                    // snake_case, 3-32 chars, unique
  "label": "Ember Hare",
  "parts": [
    {
      "id": "body",                      // parts: body, head, leg0..3 / armL etc.
      "pivot": [0, 0.25, 0],             // rotation origin, world units
      "boxes": [
        {
          "from": [-0.1875, 0, -0.25],   // min corner [x,y,z], units (px/16)
          "size": [0.375, 0.3125, 0.5],  // w,h,d — each ≤ 3
          "color": [1, 1, 1],            // tint multiplier over the texture
          "uv": { "all": [0, 0, 64, 64] }// texture rect(s), SOURCE-image pixels
        }
      ]
    },
    { "id": "head", "parent": "body", "pivot": [0, 0.4, 0.2], "boxes": [ ... ] }
  ],
  "texture": {
    // EITHER an embedded image (any size up to 1024×1024):
    "dataUri": "data:image/png;base64,....",
    "width": 64, "height": 64
    // OR raw pixels: "rgbaBase64": "...", width+height required
  },
  "animations": {
    "idle":   { "length": 3.0, "parts": { "head": { "rotate": [[0, [0,-8,0]], [1.5, [0,8,0]], [3.0, [0,-8,0]]] } } },
    "walk":   { "length": 0.7, "parts": { "leg0": { "rotate": [[0, [24,0,0]], [0.35, [-24,0,0]], [0.7, [24,0,0]]] } } },
    "attack": { "length": 0.5, "loop": false, "parts": { "head": { "rotate": [[0,[0,0,0]], [0.15,[-28,0,0]], [0.5,[0,0,0]]] } } }
  },
  "stats": {
    "hp": 18, "atk": 5, "speed": 6,          // required
    "behavior": "defensive",                  // passive | defensive | aggressive
    "aggroRange": 5, "acc": 60, "evasion": 12, "armor": 0,
    "moveRange": 4, "tier": 0, "xp": 24, "huntXp": 16, "respawn": 120,
    "shinyChance": 0.015,                     // 0-0.2, rare gilded variant
    "desc": "One line of flavor.", "recommend": "One line of tactics."
  },
  "drops": [ { "item": "sinew", "qty": [1, 2], "chance": 0.8 } ],
  "spawn": {
    "biomes": ["greenwood_plains"],           // see list below
    "density": 0.0015,                        // 0.001-0.003 sensible
    "nightOnly": false,                       // true = spawns after dark only
    "packSize": [1, 1]                        // [min,max] group size, 1-4
  }
}
```

## Rules the loader enforces (violations are rejected)

- ≤ 24 parts, ≤ 64 boxes total, every box size component ≤ 3 units.
- Part `parent` must name an existing part. Pivots are in model units.
- Rotations are **degrees**, applied Z·Y·X around the part's pivot.
  Keyframes are `[timeSeconds, [x,y,z]]`, linearly interpolated;
  animations loop unless `"loop": false`.
- `walk` plays while moving, `attack` on strikes, `idle` otherwise.
- `uv` rects are `[x, y, w, h]` in the SOURCE image's own pixels. Either one
  `"all"` rect or per-face: `up, down, north, south, east, west`.
- Drop `item` ids must exist in the game (safe ids: `sinew`, `boarhide`,
  `old_coin`, `cured_hide`, `plant_fibre`, `amber_resin`, `rough_gem`,
  `springroot`, `tartberries`, `silverfin`, `veilcrystal`, `relic_fragment`).
- Biomes: `greenwood_plains`, `ancient_forest`, `misty_wetlands`,
  `rocky_highlands`, `sunbaked_badlands`, `frostbound_tundra`,
  `volcanic_wastes`, `corrupted_wilds`, `coastal_shores`.

## Stat guidance by danger tier

| tier | hp | atk | xp | where |
|---|---|---|---|---|
| 0 | 8-20 | 3-5 | 10-30 | starter valley |
| 1 | 25-45 | 6-9 | 40-70 | mid rings |
| 2 | 30-60 | 10-14 | 80-120 | tundra/badlands |
| 3 | 60-100 | 14-20 | 150-350 | endgame wilds |

## Texture: paint it like a 64× resource pack (do the math)

Emberveil renders these skins at **64× resolution** — 64 texels per block,
which is 4× Minecraft's default 16×. That is a lot of room for detail, so
**use it**: shade every face, add material texture, paint the face. The skin
is a single atlas image; every box face is a rectangle cut out of it via
`uv` (coordinates in the SOURCE image's pixels).

**The sizing math.** A box face that measures `W × H` blocks should get
`(W × 64) × (H × 64)` texels of atlas space. Worked example — a pig-sized
body `0.625 × 0.5 × 1.0` blocks (10×8×16 model px):

| face | blocks | texels (64×) |
|---|---|---|
| top / bottom | 0.625 × 1.0 | 40 × 64 |
| front / back (face) | 0.625 × 0.5 | 40 × 32 |
| left / right | 1.0 × 0.5 | 64 × 32 |

Lay every box's six faces out on one atlas with no overlaps (Minecraft-style
cross unwrap is ideal but any packing works — just give each face its own
`uv` rect). Sum the face areas to size the atlas:

- **texels needed ≈ (total surface area in block²) × 4096** (since 64² = 4096).
- A **256×256** atlas holds 65,536 texels → ~**16 block²** of surface, which
  fits most small/medium creatures at full 64×.
- A **512×512** atlas holds 262,144 texels → ~**64 block²**, plenty for a
  boss. The game stores skins at up to **512²** on the GPU (accepts source
  images up to 1024²), so **keep your atlas ≤ 512×512** — anything larger is
  downscaled and detail is lost.

So: pick the smallest power-of-two atlas that fits your unwrap at 64 texels
per block (usually 128², 256², or 512²), set `texture.width`/`height` to it,
and reference face rects in those pixel coordinates.

**Painting guidance (this is where quality comes from):**
- Start each face from the base color, then add a directional light pass:
  lighten the top edge, darken the bottom and the seams between boxes.
- Add the creature's material: short fur streaks, overlapping scale rows,
  cracked-stone speckle, woven cloth, wet-clay mottling, glowing runes.
- Paint the face carefully — eyes with a highlight, nostrils, a mouth line,
  a brow ridge. This is the first thing players read.
- Dither or gradient large flat areas so they don't look plastic; keep edges
  crisp (this is pixel art, not a smooth render).
- Keep a consistent palette (6–12 colors) so it reads as one creature.

**Fallback:** if you truly cannot output an image, give every box a small
flat `uv` rect on a tiny texture and rely on `color` tints — but you will
lose the detail this format is built for. Prefer a real painted atlas.

Creature to build: **[DESCRIBE YOUR CREATURE HERE — name, size, biome,
temperament, and its visual hooks: silhouette, materials, colors, face,
markings. e.g. "a knee-high ember hare, ash-grey fur with glowing orange
cracks along its flanks, long singed ears, coal-black eyes, that hops in
packs across the badlands at dusk"]**
