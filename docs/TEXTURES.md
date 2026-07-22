# Emberveil — Texture Pack Manifest & Generation Guide

Every texture the v2 catalog needs, as **32×32 PNG pixel art**, organized into
ChatGPT-session-sized batches (block batches first, then item-icon batches — 362
textures total). Filenames are load-bearing — the game's texture-pack loader will
consume them exactly as listed (`block_*.png` = world tiles, `item_*.png` =
inventory icons, transparent background where marked).

## How to generate (paste this prompt into ChatGPT, then one batch table per session)

---

You are generating pixel-art textures for the voxel RPG "Emberveil." I will paste a
batch table of 12–17 textures: `filename | what it is | style/palette hints | transparent?`.

For EACH row, produce a **32×32 pixel-art PNG** with that exact filename. Rules:

1. Use your **Python tool with Pillow** to author every sprite at exactly 32×32 —
   draw at 32×32 directly (or draw at 320×320 on a 10px grid and downscale with
   NEAREST). No anti-aliasing, no blur, no gradients smoother than 3 steps.
2. Rows marked transparent get a fully transparent background (RGBA, alpha 0) —
   the sprite floats. Non-transparent rows fill the full 32×32 tile edge-to-edge
   and must **tile seamlessly** (test: offset by 16px, no visible seam).
3. Follow the batch's palette note plus the global art direction I pasted below —
   consistent hues across the batch, single light source top-left, 1px darker
   outline on item icons, no pure black (#000) and no pure white (#fff).
4. Item icons: centered subject with ~2px margin; readable silhouette at 100%.
   Block tiles: mid-contrast texture, no focal point (they repeat).
5. After drawing all rows, zip them as `emberveil_textures_<batch>.zip` with the
   exact filenames from the table, and give me the zip to download. Then show a
   contact sheet (all sprites at 4× in one image) so I can review.
6. Self-check before delivering: every filename from the table present, all files
   exactly 32×32 RGBA PNG, transparency correct per row. State "manifest check
   passed" with the file count.

---

Upload each finished zip back to the game session and it will be validated and
imported batch-by-batch.

---


---

# EMBERVEIL v2 — COMPLETE 32×32 TEXTURE MANIFEST (v1 filenames DEAD — zero reuse)

All textures 32×32 PNG. `block_*` = world tiles (opaque unless noted); `item_*` = inventory icons, ALL transparent background (transparent column omitted in item batches — assume YES). Excluded by design: `mob_*` sprites (generator pipeline supplies), `cn_*` placeable art (Construction agent's namespace), UI chrome. Water/lava/sand/clay pickups reuse their block tile as icon (no separate item icon — deliberate).

## BLOCK BATCHES

### B1 — Core terrain (kept engine blocks, fresh art) — 14
Palette: warm earth — ochre dirt, sage-green grass, dove-grey stone; lava = the Emberveil signature orange-gold (#e8842a → #ffd166 core).

| filename | what it is | style/palette hints | transparent? |
|---|---|---|---|
| block_grass_top.png | grass, top face | sage green, 3-tone dither, warm undertone | no |
| block_grass_side.png | grass, side face | ochre dirt + green fringe top 6px | no |
| block_dirt.png | dirt, all faces | warm ochre-brown, pebble specks | no |
| block_stone.png | stone terrain | dove grey, soft cracks | no |
| block_sand.png | sand (shores; glass source) | pale gold, fine stipple | no |
| block_clay.png | clay (riverbank deposits) | grey-taupe with rust streaks | no |
| block_gravel.png | gravel | mixed grey pebbles | no |
| block_snow.png | snow (tundra/spruce zones) | blue-white, sparse sparkle px | no |
| block_water.png | water surface | teal-blue, 2-frame-safe wave bands | semi (60% alpha) |
| block_lava.png | lava | ember orange/gold swirl, black crust flecks | no |
| block_bedrock.png | world floor | near-black grey, heavy noise | no |
| block_basalt.png | basalt (R2 volcanic, hosts emberite) | charcoal columns, faint orange seams | no |
| block_riftstone.png | riftstone (R3, mined → veil_flux) | deep indigo-black, cyan-violet fracture glow | no |
| block_meteor_slag.png | meteor crater shell block | scorched brown-black, dull silver flecks, pitted | no |

### B2 — Tree blocks: bark side + ring top + leaves × 6 species — 18
Palette: bark warms tier-to-tier then goes dark — oak mid-brown, birch chalk-white w/ black dashes, willow grey-green, spruce red-brown, duskwood near-black violet, veilwood slate w/ cyan grain glow. Leaves: oak leaf-green, birch light yellow-green, willow drooping pale green, spruce deep pine, duskwood murky violet-grey, veilwood indigo w/ cyan speck.

| filename | what it is | hints | transp? |
|---|---|---|---|
| block_oak_log_side.png | oak bark | mid brown, vertical grain | no |
| block_oak_log_top.png | oak ring | tan rings on brown | no |
| block_oak_leaves.png | oak canopy | mid green clumps | yes (holes) |
| block_birch_log_side.png | birch bark | white + black dash marks | no |
| block_birch_log_top.png | birch ring | cream rings | no |
| block_birch_leaves.png | birch canopy | yellow-green, airy | yes |
| block_willow_log_side.png | willow bark | grey-green, ropey grain | no |
| block_willow_log_top.png | willow ring | pale green-tan rings | no |
| block_willow_leaves.png | willow canopy | drooping strand texture | yes |
| block_spruce_log_side.png | spruce bark | dark red-brown, flaky | no |
| block_spruce_log_top.png | spruce ring | tight amber rings | no |
| block_spruce_leaves.png | spruce needles | deep pine green, dense | yes |
| block_duskwood_log_side.png | duskwood bark | black-violet, gnarled | no |
| block_duskwood_log_top.png | duskwood ring | violet-grey rings, faint glow core | no |
| block_duskwood_leaves.png | duskwood canopy | murky violet, sparse pale motes | yes |
| block_veilwood_log_side.png | veilwood bark | slate blue-grey, cyan grain lines | no |
| block_veilwood_log_top.png | veilwood ring | rings glow cyan at center | no |
| block_veilwood_leaves.png | veilwood canopy | indigo, cyan speck "stars" | yes |

### B3 — Ore rocks (mining nodes) + shared depleted state — 8
Palette: all on the block_stone grey base; ore flecks carry the metal identity — copper verdigris-orange, iron rust-red, coal matte black, silver cool white, gold warm yellow, emberite molten orange w/ glow px, meteoric iridescent blue-silver.

| filename | what | hints | transp? |
|---|---|---|---|
| block_ore_copper.png | copper rock | orange nuggets, green oxide edge | no |
| block_ore_iron.png | iron rock | rust-red blotches | no |
| block_ore_coal.png | coal rock | matte black chunks | no |
| block_ore_silver.png | silver rock | pale cool flecks, 2 shine px | no |
| block_ore_gold.png | gold rock | warm yellow veins | no |
| block_ore_emberite.png | emberite rock | orange glowing seams on charcoal stone | no |
| block_ore_meteoric.png | meteoric core (crater-only) | blue-silver crystals in slag-brown matrix | no |
| block_ore_depleted.png | shared mined-out state (all ores) | plain cracked grey, empty sockets | no |

### B4 — Node states & world plants — 11
Palette: naturalistic greens/browns; states read at a glance (full vs empty silhouettes).

| filename | what | hints | transp? |
|---|---|---|---|
| block_tall_grass.png | tall grass (seed/flax drops; ring-tinted via engine) | grey-scale-friendly green blades, cross-plane | yes |
| block_tree_stump.png | shared chopped-tree state | brown stump top w/ rings | yes (cross) |
| block_herb_patch_ready.png | herb_patch harvestable | leafy cluster w/ bright tips | yes (cross) |
| block_herb_patch_empty.png | herb_patch regrowing | cut stems, dull | yes |
| block_berry_bush_ready.png | berry_bush with berries | green bush + red berry px | yes |
| block_berry_bush_empty.png | picked bush | plain green bush | yes |
| block_clay_deposit.png | riverbank clay node | wet taupe lump, shine streak | no |
| block_dig_site.png | Archaeology dig site | cracked earth, half-buried tile edges + rope pegs | no |
| block_farm_plot.png | tilled farm plot | dark furrowed soil rows | no |
| block_fishing_spot.png | fishing spot overlay | ripple rings + fish-shadow, over water | yes |
| block_hunt_tracks.png | hunt_tracks decal | paw prints pressed into ground tone | yes |

### B5 — Crop growth stages (3 per crop) — 12
Palette: stage 0 sprout green → stage 2 harvest color pop (wheat gold, flax blue flowers, sunmelon orange fruit, veilgourd violet-glow gourd). All cross-plane.

| filename | what | hints | transp? |
|---|---|---|---|
| block_crop_wheat_0.png | wheat sprout | thin green shoots | yes |
| block_crop_wheat_1.png | wheat mid | taller, yellowing | yes |
| block_crop_wheat_2.png | wheat ripe | golden heads | yes |
| block_crop_flax_0.png | flax sprout | fine green stems | yes |
| block_crop_flax_1.png | flax mid | budding | yes |
| block_crop_flax_2.png | flax ripe | blue flower px | yes |
| block_crop_sunmelon_0.png | sunmelon sprout | broad-leaf vine | yes |
| block_crop_sunmelon_1.png | sunmelon mid | vine + green bulb | yes |
| block_crop_sunmelon_2.png | sunmelon ripe | orange striped melon | yes |
| block_crop_veilgourd_0.png | veilgourd sprout | dark vine | yes |
| block_crop_veilgourd_1.png | veilgourd mid | violet bud | yes |
| block_crop_veilgourd_2.png | veilgourd ripe | indigo gourd, cyan glow rim | yes |

### B6 — Stations + glass pane — 10
Palette: crafted-wood browns + iron greys; enchant_altar is the one magical accent (indigo/cyan runes); fire states share the lava ember tones.

| filename | what | hints | transp? |
|---|---|---|---|
| block_workbench.png | workbench top | oak planks + tool motifs | no |
| block_furnace.png | furnace, cold | stone brick arch, dark mouth | no |
| block_furnace_lit.png | furnace, burning | mouth glows ember orange | no |
| block_anvil.png | anvil_block | dark iron silhouette on stone base | no |
| block_campfire.png | campfire | log ring + flame, ember palette | yes (flame edges) |
| block_alchemy_table.png | alchemy table | wood top, vials green/red px | no |
| block_loom.png | loom_block | wood frame, cream thread lines | no |
| block_enchant_altar.png | Runestone Altar | grey monolith, glowing cyan rune carvings | no |
| block_construction_bench.png | construction bench | sturdy planks, ruler/nail motifs | no |
| block_glass_pane.png | glass pane (CR15, new v2.1) | pale cyan tint, white edge highlights | yes |

**Block total: 73**

## ITEM ICON BATCHES (all transparent)

### I1 — Ores & bars — 16
Palette: raw lumps = stone-grey + metal fleck; bars = clean trapezoid ingots in tier color: copper orange, iron grey, steel bright silver-blue, silver cool white, gold saturated yellow, emberite ember-orange w/ glow, meteoric star-blue, veilsteel indigo w/ cyan edge.

| filename | what | hints |
|---|---|---|
| item_copper_ore.png | copper ore lump | grey rock, orange nuggets |
| item_iron_ore.png | iron ore lump | rust blotches |
| item_coal.png | coal lump | matte black, blue sheen px |
| item_silver_ore.png | silver ore lump | white flecks |
| item_gold_ore.png | gold ore lump | yellow veins |
| item_emberite_ore.png | emberite ore lump | glowing orange seams |
| item_meteoric_ore.png | meteoric ore lump | blue-silver crystal shard |
| item_veil_flux.png | veil flux | indigo crystalline dust cluster, cyan glow |
| item_copper_bar.png | copper ingot | orange, verdigris corner |
| item_iron_bar.png | iron ingot | flat grey |
| item_steel_bar.png | steel ingot | bright silver-blue shine |
| item_silver_bar.png | silver ingot | cool white gleam |
| item_gold_bar.png | gold ingot | rich yellow, 2 shine px |
| item_emberite_bar.png | emberite ingot | orange w/ inner glow band |
| item_meteoric_bar.png | meteoric ingot | deep blue-silver, star speck |
| item_veilsteel_bar.png | veilsteel ingot | indigo body, cyan rim light |

### I2 — Gems + new stone/glass — 12
Palette: uncut = rough matrix-embedded; cut = faceted with white spark px. Sapphire blue, emerald green, ruby red, diamond ice-white, veilstone violet-cyan duotone.

| filename | what | hints |
|---|---|---|
| item_uncut_sapphire.png | rough sapphire | blue crystal in grey matrix |
| item_sapphire.png | cut sapphire | faceted blue, spark |
| item_uncut_emerald.png | rough emerald | green shard in matrix |
| item_emerald.png | cut emerald | faceted green |
| item_uncut_ruby.png | rough ruby | red shard in matrix |
| item_ruby.png | cut ruby | faceted red |
| item_uncut_diamond.png | rough diamond | pale octahedron in matrix |
| item_diamond.png | cut diamond | ice-white brilliance |
| item_uncut_veilstone.png | rough veilstone | violet geode, cyan core |
| item_veilstone.png | cut veilstone | violet facets, cyan star glint |
| item_rough_stone.png | rough stone chunk (v2.1) | grey angular chunk |
| item_glass_pane_icon.png | glass pane item (v2.1) | thin cyan-tinted square, edge shine |

### I3 — Logs & planks — 12
Palette: matches B2 bark/ring colors; planks are 3-board stacks in the species tone.

| filename | what | hints |
|---|---|---|
| item_oak_log.png | oak log | brown bark, tan ends |
| item_oak_plank.png | oak planks | warm tan boards |
| item_birch_log.png | birch log | white bark, dashes |
| item_birch_plank.png | birch planks | cream boards |
| item_willow_log.png | willow log | grey-green bark |
| item_willow_plank.png | willow planks | pale green-tan |
| item_spruce_log.png | spruce log | red-brown bark |
| item_spruce_plank.png | spruce planks | dark amber boards |
| item_duskwood_log.png | duskwood log | black-violet bark |
| item_duskwood_plank.png | duskwood planks | violet-grey boards |
| item_veilwood_log.png | veilwood log | slate bark, cyan grain |
| item_veilwood_plank.png | veilwood planks | indigo boards, cyan seams |

### I4 — Fish (raw + cooked), shrimp→lobster — 12
Palette: raw = cool natural fish tones w/ blue sheen; cooked = same silhouette shifted warm brown-orange w/ grill lines.

| filename | what | hints |
|---|---|---|
| item_raw_shrimp.png | raw shrimp | pale pink-grey curl |
| item_cooked_shrimp.png | cooked shrimp | coral pink |
| item_raw_cod.png | raw cod | grey-olive fish |
| item_cooked_cod.png | cooked cod | golden fillet |
| item_raw_trout.png | raw trout | speckled silver-pink |
| item_cooked_trout.png | cooked trout | browned, char lines |
| item_raw_salmon.png | raw salmon | orange-fleshed silver fish |
| item_cooked_salmon.png | cooked salmon | rich orange fillet |
| item_raw_tuna.png | raw tuna | deep blue back |
| item_cooked_tuna.png | cooked tuna | seared steak |
| item_raw_lobster.png | raw lobster | dull blue-brown |
| item_cooked_lobster.png | cooked lobster | bright red |

### I5 — Fish (swordfish→veilray) + cooked foods — 12
Palette: glowfin/veilray get emissive px (teal glow, violet ray-wings); baked goods warm gold-brown; veilgourd_pie violet filling.

| filename | what | hints |
|---|---|---|
| item_raw_swordfish.png | raw swordfish | silver-blue, long bill |
| item_cooked_swordfish.png | cooked swordfish | seared steak w/ bill stub |
| item_raw_glowfin.png | raw glowfin | dark fish, teal glow fins |
| item_cooked_glowfin.png | cooked glowfin | browned, fins still glow |
| item_raw_veilray.png | raw veilray | violet ray, cyan spots |
| item_cooked_veilray.png | cooked veilray | roasted ray, faint glow |
| item_wildberries.png | wildberries | red berry cluster + leaf |
| item_raw_meat.png | raw meat | pink-red cut, white fat |
| item_cooked_meat.png | cooked meat | browned, steam wisps |
| item_bread.png | bread loaf | golden crust, slash marks |
| item_hearty_stew.png | stew in fired bowl | terracotta bowl, brown stew, steam |
| item_veilgourd_pie.png | veilgourd pie | lattice crust, violet filling glow |

### I6 — Herbs, secondaries, crops & seeds — 15
Palette: each herb has a signature accent — sageleaf soft green, bogmint teal, emberbloom orange petals, duskmoss grey-violet, veilblossom white-violet w/ cyan core; seeds are small paper-pouch-free loose seed piles tinted per crop.

| filename | what | hints |
|---|---|---|
| item_sageleaf.png | sageleaf herb | soft green sprig |
| item_bogmint.png | bogmint | teal serrated leaves |
| item_emberbloom.png | emberbloom | orange flower, ember px |
| item_duskmoss.png | duskmoss | grey-violet moss tuft |
| item_veilblossom.png | veilblossom | white-violet bloom, cyan center |
| item_venom_sac.png | venom sac | sickly green sac, drip |
| item_ember_ash.png | ember ash | grey ash pile, orange sparks |
| item_wheat_seed.png | wheat seeds | tan seed pile |
| item_wheat.png | wheat sheaf | golden bundle, tie |
| item_flax_seed.png | flax seeds | brown flecked pile |
| item_flax.png | flax stems | green stalks, blue flowers |
| item_sunmelon_seed.png | sunmelon seeds | pale orange pips |
| item_sunmelon.png | sunmelon | orange striped melon slice |
| item_veilgourd_seed.png | veilgourd seeds | dark violet pips |
| item_veilgourd.png | veilgourd | indigo gourd, glow rim |

### I7 — New v2.1 seeds & saplings — 11
Palette: herb seeds echo their herb's accent color; saplings = small pot-free shoot with each species' leaf color from B2.

| filename | what | hints |
|---|---|---|
| item_sageleaf_seed.png | sageleaf seed | green-tinted pile |
| item_bogmint_seed.png | bogmint seed | teal-tinted pile |
| item_emberbloom_seed.png | emberbloom seed | orange-tinted pile |
| item_duskmoss_spore.png | duskmoss spores | violet dust pouch pile |
| item_veilblossom_seed.png | veilblossom seed | white-violet pile, glow px |
| item_oak_sapling.png | oak sapling | mid-green shoot |
| item_birch_sapling.png | birch sapling | yellow-green shoot, white stem |
| item_willow_sapling.png | willow sapling | drooping pale shoot |
| item_spruce_sapling.png | spruce sapling | mini pine cone-shape |
| item_duskwood_sapling.png | duskwood sapling | violet-black shoot |
| item_veilwood_sapling.png | veilwood sapling | indigo shoot, cyan tip |

### I8 — Hides, leathers, cloth & string — 12
Palette: hide/leather ladder warms then darkens — rough tan → thick umber → dusk violet-brown → veil indigo-grey; cloths cream → white silk sheen → veilcloth indigo shimmer.

| filename | what | hints |
|---|---|---|
| item_rough_hide.png | rough hide | tan pelt, ragged edge |
| item_leather.png | leather | smooth tan folded square |
| item_thick_hide.png | thick hide | umber pelt, fur ridge |
| item_hard_leather.png | hard leather | dark stiff panel, stitch px |
| item_dusk_hide.png | dusk hide | violet-brown pelt, sheen |
| item_dusk_leather.png | dusk leather | dark violet panel |
| item_veil_hide.png | veil hide | indigo-grey pelt, cyan shimmer |
| item_veil_leather.png | veil leather | indigo panel, cyan stitch |
| item_bowstring.png | bowstring | coiled cream cord |
| item_linen_cloth.png | linen cloth | folded off-white bolt |
| item_silk_cloth.png | silk cloth | white bolt, blue sheen line |
| item_veilcloth.png | veilcloth | indigo bolt, cyan shimmer wave |

### I9 — Runes & relics — 12
Palette: runes = grey stone tablets, glyph glows in element color (air white, water blue, earth green-brown, ward gold, fire orange, gloom violet, veil cyan); relics age from sandy-worn to rune-lit.

| filename | what | hints |
|---|---|---|
| item_rune_essence.png | rune essence | blank pale stone, faint aura |
| item_air_rune.png | air rune | white swirl glyph |
| item_water_rune.png | water rune | blue wave glyph |
| item_earth_rune.png | earth rune | green-brown mound glyph |
| item_ward_rune.png | ward rune | gold shield glyph |
| item_fire_rune.png | fire rune | orange flame glyph |
| item_gloom_rune.png | gloom rune | violet eye glyph, dark stone |
| item_veil_rune.png | veil rune | cyan rift glyph, indigo stone |
| item_weathered_relic.png | weathered relic | sand-worn idol fragment |
| item_engraved_relic.png | engraved relic | carved tablet, clear lines |
| item_runic_relic.png | runic relic | tablet w/ faint violet glow glyphs |
| item_veilbound_relic.png | veilbound relic | idol wrapped in cyan energy bands |

### I10 — Tool kit + traps — 14
Palette: wood-handle brown + copper/iron metal; traps read as wood-and-cord contraptions.

| filename | what | hints |
|---|---|---|
| item_chisel.png | chisel | copper blade, wood grip |
| item_hammer.png | hammer | copper head, side view |
| item_needle.png | needle | slim silver-copper, thread eye |
| item_knife.png | knife | short copper blade |
| item_pestle_and_mortar.png | pestle & mortar | oak bowl + pestle |
| item_small_net.png | small fishing net | cream mesh on hoop |
| item_fishing_rod.png | fishing rod | oak rod, line + hook |
| item_harpoon.png | harpoon | iron barbed head, willow shaft |
| item_lobster_cage.png | lobster cage | willow slat box, rope |
| item_bird_snare.png | bird snare | oak loop trap, cord |
| item_box_trap.png | box trap (v2.1) | birch box, propped lid |
| item_deadfall_trap.png | deadfall trap (v2.1) | stone slab on stick trigger |
| item_net_trap.png | net trap (v2.1) | staked net, taut cords |
| item_veil_snare.png | veil snare (v2.1) | dark frame, glowing cyan filament loop |

### I11 — Copper kit — 10
Batch palette: warm copper orange + green oxide accents, oak handles.

| filename | what | hints |
|---|---|---|
| item_copper_sword.png | sword | orange blade, simple guard |
| item_copper_pickaxe.png | pickaxe | copper head |
| item_copper_axe.png | axe | copper wedge |
| item_copper_shovel.png | shovel | copper scoop |
| item_copper_hoe.png | hoe | copper L-blade |
| item_copper_helmet.png | helmet | rounded cap |
| item_copper_chestplate.png | chestplate | riveted torso |
| item_copper_leggings.png | leggings | twin greaves |
| item_copper_boots.png | boots | stubby pair |
| item_copper_hookblade.png | SIGNATURE hookblade | curved hooked blade, verdigris edge |

### I12 — Iron kit — 11
Batch palette: flat mid-grey, darker rivets, birch handles.

| filename | what | hints |
|---|---|---|
| item_iron_sword.png | sword | grey straight blade |
| item_iron_pickaxe.png | pickaxe | grey head |
| item_iron_axe.png | axe | grey wedge |
| item_iron_shovel.png | shovel | grey scoop |
| item_iron_hoe.png | hoe | grey L-blade |
| item_iron_helmet.png | helmet | nose-guard cap |
| item_iron_chestplate.png | chestplate | plated torso |
| item_iron_leggings.png | leggings | plate greaves |
| item_iron_boots.png | boots | plated pair |
| item_iron_shield.png | shield | round grey boss shield |
| item_iron_greatmaul.png | SIGNATURE greatmaul | oversized square head, banded haft |

### I13 — Steel kit — 11
Batch palette: bright silver-blue, white edge highlights.

| filename | what | hints |
|---|---|---|
| item_steel_sword.png | sword | polished blade, blue sheen |
| item_steel_pickaxe.png | pickaxe | bright head |
| item_steel_axe.png | axe | bright wedge |
| item_steel_shovel.png | shovel | bright scoop |
| item_steel_hoe.png | hoe | bright L-blade |
| item_steel_helmet.png | helmet | crested cap |
| item_steel_chestplate.png | chestplate | smooth plates |
| item_steel_leggings.png | leggings | fitted greaves |
| item_steel_boots.png | boots | polished pair |
| item_steel_shield.png | shield | kite shield, blue trim |
| item_steel_warpike.png | SIGNATURE warpike | long pike head, reach flag tassel |

### I14 — Emberite kit — 10
Batch palette: burnt-orange metal, inner-glow seam px, charcoal trim — fire theme, no literal flames on armor.

| filename | what | hints |
|---|---|---|
| item_emberite_sword.png | sword | orange blade, glowing fuller |
| item_emberite_pickaxe.png | pickaxe | glow-seamed head |
| item_emberite_axe.png | axe | glow-edge wedge |
| item_emberite_shovel.png | shovel | ember scoop |
| item_emberite_hoe.png | hoe | ember L-blade |
| item_emberite_helmet.png | helmet | horn-swept cap, ember slits |
| item_emberite_chestplate.png | chestplate | glow seams across plates |
| item_emberite_leggings.png | leggings | seamed greaves |
| item_emberite_boots.png | boots | ember-trim pair |
| item_emberite_flame_flail.png | SIGNATURE flame-flail | chained molten-core ball, flame wisps |

### I15 — Meteoric kit — 10
Batch palette: deep blue-silver, star-speck px, iridescent 2-px gradient edges.

| filename | what | hints |
|---|---|---|
| item_meteoric_sword.png | sword | blue-silver blade, star specks |
| item_meteoric_pickaxe.png | pickaxe | crystalline head |
| item_meteoric_axe.png | axe | crystalline wedge |
| item_meteoric_shovel.png | shovel | star-metal scoop |
| item_meteoric_hoe.png | hoe | star-metal L-blade |
| item_meteoric_helmet.png | helmet | angular starfall cap |
| item_meteoric_chestplate.png | chestplate | faceted plates, speckle |
| item_meteoric_leggings.png | leggings | faceted greaves |
| item_meteoric_boots.png | boots | angular pair |
| item_meteoric_star_maul.png | SIGNATURE star maul | crater-pitted sphere head, impact ring motif |

### I16 — Veilsteel kit — 11
Batch palette: indigo base, cyan rim-light on every silhouette — the Emberveil cap identity.

| filename | what | hints |
|---|---|---|
| item_veilsteel_sword.png | sword | indigo blade, cyan edge |
| item_veilsteel_pickaxe.png | pickaxe | cyan-rimmed head |
| item_veilsteel_axe.png | axe | cyan-rimmed wedge |
| item_veilsteel_shovel.png | shovel | indigo scoop |
| item_veilsteel_hoe.png | hoe | indigo L-blade |
| item_veilsteel_helmet.png | helmet | veiled visor cap, cyan slit |
| item_veilsteel_chestplate.png | chestplate | rift-line cyan seams |
| item_veilsteel_leggings.png | leggings | seamed greaves |
| item_veilsteel_boots.png | boots | rim-lit pair |
| item_veilsteel_shield.png | shield | tower shield, cyan rift emblem |
| item_veilsteel_riftblade.png | SIGNATURE riftblade | blade split by glowing phase-rift gap |

### I17 — Bows & crossbows — 15
Batch palette: bow wood matches species (I3); crossbows pair metal limbs (tier color) with wood stock; strings cream, veil variants cyan-lit.

| filename | what | hints |
|---|---|---|
| item_oak_shortbow.png | oak shortbow | small brown curve |
| item_oak_longbow.png | oak longbow | tall brown curve |
| item_birch_shortbow.png | birch shortbow | white-wood curve |
| item_birch_longbow.png | birch longbow | tall white curve |
| item_willow_shortbow.png | willow shortbow | grey-green recurve |
| item_willow_longbow.png | willow longbow | tall recurve |
| item_spruce_shortbow.png | spruce shortbow | dark amber curve |
| item_spruce_longbow.png | spruce longbow | tall dark curve |
| item_duskwood_shortbow.png | duskwood shortbow | violet-black curve |
| item_duskwood_longbow.png | duskwood longbow | tall violet curve |
| item_veilwood_shortbow.png | veilwood shortbow | indigo curve, cyan string |
| item_veilwood_longbow.png | veilwood longbow | tall, glow limb tips |
| item_light_crossbow.png | light crossbow | iron limbs, birch stock |
| item_heavy_crossbow.png | heavy crossbow | emberite limbs, spruce stock, glow seam |
| item_veil_crossbow.png | veil crossbow | veilsteel limbs, veilwood stock, cyan rail |

### I18 — Ammo — 11
Batch palette: arrows = fletched shaft + metal-tier tip, drawn as 3-arrow fan; bolts = stubbier 2-bolt pair; tip color carries the tier.

| filename | what | hints |
|---|---|---|
| item_copper_arrow.png | copper arrows ×15 | orange tips, white fletch |
| item_iron_arrow.png | iron arrows | grey tips |
| item_steel_arrow.png | steel arrows | bright tips |
| item_emberite_arrow.png | emberite arrows | glow-tip, ember trail px |
| item_meteoric_arrow.png | meteoric arrows | blue-silver tips |
| item_veilsteel_arrow.png | veilsteel arrows | cyan-lit tips |
| item_iron_bolt.png | iron bolts ×12 | stubby grey pair |
| item_steel_bolt.png | steel bolts | bright pair |
| item_emberite_bolt.png | emberite bolts | glow pair |
| item_meteoric_bolt.png | meteoric bolts | speckled pair |
| item_veilsteel_bolt.png | veilsteel bolts | cyan pair |

### I19 — Staves + jewelry — 14
Batch palette: staff shaft = species wood, glass orb head glows faintly per tier; jewelry = silver cool / gold warm bands, gem px from I2 colors.

| filename | what | hints |
|---|---|---|
| item_oak_staff.png | oak staff | brown shaft, clear orb |
| item_birch_staff.png | birch staff | white shaft, pale orb |
| item_willow_staff.png | willow staff | recurve top, green-tint orb |
| item_spruce_staff.png | spruce staff | dark shaft, amber orb |
| item_duskwood_staff.png | duskwood staff | black shaft, violet orb |
| item_veilwood_staff.png | veilwood staff | indigo shaft, cyan blazing orb |
| item_silver_sapphire_ring.png | ring | silver band, blue gem |
| item_silver_sapphire_amulet.png | amulet | silver chain, blue drop |
| item_silver_emerald_necklace.png | necklace | silver chain, green stone |
| item_gold_ruby_ring.png | ring | gold band, red gem |
| item_gold_ruby_amulet.png | amulet | gold chain, red drop |
| item_gold_diamond_ring.png | ring | gold band, white gem |
| item_gold_diamond_necklace.png | necklace | gold chain, white stone |
| item_gold_veilstone_amulet.png | cap amulet | gold chain, violet-cyan stone, aura px |

### I20 — Ranged armor, leather→hardleather — 9
Batch palette: tan → studded (tan + grey stud px) → dark stiff brown; soft silhouettes vs metal kits.

| filename | what | hints |
|---|---|---|
| item_leather_coif.png | leather coif | tan hood |
| item_leather_body.png | leather body | tan jerkin, laces |
| item_leather_chaps.png | leather chaps | tan legs |
| item_studded_coif.png | studded coif | tan + iron studs |
| item_studded_body.png | studded body | stud rows |
| item_studded_chaps.png | studded chaps | stud lines |
| item_hardleather_coif.png | hardleather coif | dark brown, stitched |
| item_hardleather_body.png | hardleather body | paneled dark jerkin |
| item_hardleather_chaps.png | hardleather chaps | dark panels |

### I21 — Ranged armor, emberhide→veilhide — 9
Batch palette: emberhide = dark leather + ember-orange stud/trim; duskhide violet-brown sheen; veilhide indigo w/ cyan stitch glow.

| filename | what | hints |
|---|---|---|
| item_emberhide_coif.png | emberhide coif | ember-stud hood |
| item_emberhide_body.png | emberhide body | orange trim jerkin |
| item_emberhide_chaps.png | emberhide chaps | trimmed legs |
| item_duskhide_coif.png | duskhide coif | violet-sheen hood |
| item_duskhide_body.png | duskhide body | sleek dark jerkin |
| item_duskhide_chaps.png | duskhide chaps | sleek legs |
| item_veilhide_coif.png | veilhide coif | indigo hood, cyan stitch |
| item_veilhide_body.png | veilhide body | cap jerkin, shimmer px |
| item_veilhide_chaps.png | veilhide chaps | cap legs |

### I22 — Robes, linen→runeweave — 9
Batch palette: linen off-white/rope belt; silkspun white-blue sheen; runeweave adds tiny elemental glyph px in hem.

| filename | what | hints |
|---|---|---|
| item_linen_hood.png | linen hood | off-white cowl |
| item_linen_robe_top.png | linen top | plain robe, rope belt |
| item_linen_robe_bottom.png | linen bottom | plain skirt |
| item_silkspun_hood.png | silkspun hood | white, blue sheen line |
| item_silkspun_robe_top.png | silkspun top | flowing sheen robe |
| item_silkspun_robe_bottom.png | silkspun bottom | sheen skirt |
| item_runeweave_hood.png | runeweave hood | glyph-hem cowl |
| item_runeweave_robe_top.png | runeweave top | glyph border, blue-grey |
| item_runeweave_robe_bottom.png | runeweave bottom | glyph hem skirt |

### I23 — Robes, emberweave→veilweave — 9
Batch palette: emberweave rust-orange dye + ash-grey trim; gloomweave charcoal-violet, dim glow; veilweave indigo, cyan thread shimmer.

| filename | what | hints |
|---|---|---|
| item_emberweave_hood.png | emberweave hood | rust cowl, ember trim |
| item_emberweave_robe_top.png | emberweave top | flame-dye gradient hem |
| item_emberweave_robe_bottom.png | emberweave bottom | rust skirt |
| item_gloomweave_hood.png | gloomweave hood | charcoal-violet cowl, dim eye glyph |
| item_gloomweave_robe_top.png | gloomweave top | shadowed folds |
| item_gloomweave_robe_bottom.png | gloomweave bottom | dark skirt |
| item_veilweave_hood.png | veilweave hood | indigo cowl, cyan threads |
| item_veilweave_robe_top.png | veilweave top | cap robe, shimmer wave |
| item_veilweave_robe_bottom.png | veilweave bottom | cap skirt |

### I24 — Potions — 11
Batch palette: shared glass-vial silhouette, liquid color = effect (salve is a clay pot, no vial): heal red, antipoison pale green, strength crimson-orange, defense steel-blue, ember flame-orange w/ glow, ranging leaf-green, magic indigo, veilfire violet-cyan swirl; new brews earthy tones.

| filename | what | hints |
|---|---|---|
| item_healing_salve.png | salve paste | small clay pot, green paste |
| item_antipoison.png | antipoison vial | pale green liquid |
| item_strength_potion.png | strength vial | crimson-orange |
| item_defense_potion.png | defense vial | steel-blue |
| item_ember_tonic.png | ember tonic | glowing orange, spark px |
| item_ranging_potion.png | ranging vial | leaf green, feather tag |
| item_magic_potion.png | magic vial | indigo, glint |
| item_veilfire_elixir.png | veilfire elixir | violet-cyan swirl, aura |
| item_healing_potion.png | healing vial (v2.1) | red liquid |
| item_foragers_brew.png | forager's brew (v2.1) | mossy green, leaf fleck |
| item_hunters_brew.png | hunter's brew (v2.1) | amber-brown, claw tag |

### I25 — Utility & mob-drop materials — 11
Batch palette: glass pale cyan; pottery terracotta; organic drops in natural bone-white/tan; beast_trophy is a mounted horned skull, ring tier shown by tint stripe.

| filename | what | hints |
|---|---|---|
| item_glass_vial.png | empty vial | clear, cork |
| item_glass_orb.png | glass orb | round, window shine |
| item_fired_bowl.png | fired bowl | terracotta, dark rim |
| item_nails.png | nails ×15 | grey nail scatter |
| item_bandage.png | bandage | rolled white wrap |
| item_beast_treat.png | beast treat | meat-berry skewer |
| item_bone.png | bone | white femur |
| item_sinew.png | sinew | tan fiber coil |
| item_feather.png | feather | white-grey quill |
| item_silk_thread.png | silk thread | white spool, sheen |
| item_beast_trophy.png | beast trophy | horned skull on plaque (engine tints ring stripe) |

## TOTALS

- **Block textures: 73** (B1 14 + B2 18 + B3 8 + B4 11 + B5 12 + B6 10)
- **Item icons: 289** (all 269 non-block registry ids + 20 v2.1 additions: rough_stone, glass_pane, 4 traps, 5 herb seeds, 6 saplings, 3 potions)
- **GRAND TOTAL: 362 textures**, all 32×32 PNG. Excluded: mob sprites (generator pipeline), cn_* placeables (Construction agent), npc_* portraits (future ticket).

**Shared art direction.** Chunky Minecraft-readable pixel art: every texture built from bold 2–4px clusters, no single-pixel noise except deliberate sparkle/glow accents; 3–5 tones per material, hard edges, no anti-aliasing, no gradients wider than 2px steps. The Emberveil master palette runs warm — ochre earth, sage green, dove grey, ember orange/gold — with exactly one cool accent family (indigo + cyan) reserved for veil-tier and rift content so cap items instantly read as endgame. Tier identity is carried by hue, not silhouette: the same sword/helmet/leaf silhouette recurs per line, recolored per tier (copper orange → iron grey → steel silver-blue → emberite glow-orange → meteoric star-blue → veilsteel indigo/cyan), so players parse tiers at a glance. Emissive pixels (full-saturation, no dither) appear only on emberite, meteoric, gloom, and veil content. All item icons sit on transparent backgrounds with a 1px darker self-outline; block tiles must tile seamlessly on all edges. Every sprite is an original composition — familiar in genre vocabulary but no traced or copied Minecraft/RuneScape sprites, and Emberveil signatures (hookblade, flame-flail, star maul, riftblade, veil gear) get unique silhouettes found in neither game.