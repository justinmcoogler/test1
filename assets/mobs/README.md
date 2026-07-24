# Imported mob models (`assets/mobs/`)

Drop a Blockbench model here to replace a creature's in-game model:

    assets/mobs/<type>.bbmodel            # rig auto-inferred from bone names
    assets/mobs/<type>.<rig>.bbmodel      # force a rig, e.g. cow.quadruped.bbmodel

`<type>` must match an `ENEMY_TYPES` id (e.g. `cow`, `frostmaw_wolf`). `<rig>` is
one of: quadruped, biped, pecker, floater, hopper, scamper, slither, lumberer,
sway — it drives the auto idle/walk/attack animation. Then run:

    node tools/gen-mobpack.mjs        # embeds them into js/gfx/mobpack.js
    npm run build                     # rebuild the single-file dist

The model must export with its **texture embedded** (Blockbench: File → Export →
Blockbench Model, textures saved in the file). Bone names are mapped to rig
roles: body/torso → body, head, tail, leg*/thigh/hoof → legs, wing* → wings,
arm*/claw → arms.

## Licensing

Only add models you have the right to redistribute — CC0 / MIT / CC-BY (add
attribution to `assets/mobs/CREDITS.md`) or your own work. Do **not** add
Mojang's Minecraft entity models or look-alikes; those are not licensed for
redistribution.

## Imported mob pack (`imported/`)

The 99-model licensed pack imported by `tools/import-mobpack.mjs` (open-standard
CC-BY / EUPL / MIT / Apache / CC0 models) ships its attribution and full license
texts in **`assets/mobs/imported/`**:

- `imported/CREDITS.md` — per-source credit lines and links.
- `imported/licenses/**` — the upstream LICENSE files and source READMEs.

These credits/licenses are **required** by the CC-BY / EUPL / etc. terms — keep
them when redistributing. The generated modules are
`js/gfx/mobpack-imported.js` (geometry + skins) and `js/game/mobs-imported.js`
(types). Imported mobs are registered and admin-configurable but are **not**
worldgen-spawned by default.
