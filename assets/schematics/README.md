# Minecraft schematics → Sproutlands

Drop Minecraft build files here and convert them into Sproutlands structures.

## Supported formats
- `.schem` — Sponge (WorldEdit `//schem save`, most modern builds)
- `.schematic` — legacy MCEdit / old WorldEdit (numeric block ids)
- `.litematic` — Litematica mod
- `.nbt` — structure-block exports carrying a palette

## Convert

```sh
# one file (writes hut.json next to it) + prints a coverage report
node tools/import-schematic.mjs assets/schematics/hut.schem

# just see what maps / what's missing, write nothing
node tools/import-schematic.mjs assets/schematics/hut.schem --report-only

# batch, and get a combined "no mapping for…" list at the end
node tools/import-schematic.mjs assets/schematics/*.schem
```

The report tells you three things per file:
- **exact** — a faithful block equivalent
- **approx** — a reasonable stand-in (shape or colour lost: stairs → base
  material, wool/concrete → nearest solid). Listed so nothing is silent.
- **⚠ NO mapping** — the block has no equivalent and was dropped to air. These
  are the ids to add to `MC_MAP` in `tools/mc-block-map.mjs` if you want them.

## Place a converted build in-game

The converter writes `{ name, size, cells:[{x,y,z,block}] }`. In the browser
console (dev hook), paste one near the player:

```js
await __paste('assets/schematics/hut.json')       // 3 blocks in front
await __paste('assets/schematics/hut.json', 0, 1, 0) // custom dx,dy,dz offset
```

Or from code: `import { pasteSchematic, loadAndPaste } from './world/schematic.js'`.

## Mapping
Block mapping lives in `tools/mc-block-map.mjs` (`MC_MAP` for exact ids,
`APPROX_CONTAINS` / `STEM_MAP` for material families, `SHAPE_SUFFIX` for
stairs/slabs/etc). Legacy numeric ids are in `tools/mc-legacy-ids.mjs`.
