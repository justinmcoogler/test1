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
