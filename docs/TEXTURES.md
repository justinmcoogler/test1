# Emberveil — Texture Pack Manifest & Generation Guide

Every texture the clean-slate catalog needs, as **32×32 PNG pixel art**, organized
into 25 batches sized for one ChatGPT session each. Filenames are load-bearing —
the game's texture-pack loader will consume them exactly as listed
(`block_*.png` = world tiles, `item_*.png` = inventory icons, transparent background
where marked). Add `block_tall_grass.png` (ruling R9, cross-plant, per-biome tint)
to Batch B5.

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


# Emberveil — Complete 32×32 Texture Manifest (v1)

## Art Direction (prefix this paragraph to EVERY ChatGPT batch)

> 32×32 pixel art, single sprite per image, crisp pixels (no anti-aliasing, no blur). Shared master palette: warm ember accents (#e8853d, #c9502e), mossy greens (#6a8f4e, #3d5c34), stone greys (#8b8578, #5a554b), dusk purples (#5e4a78, #2e2440) for corrupted/veil content, parchment cream (#e8d9b0) for highlights. Lighting from **top-left**, 2-tone shading (base + one shadow, one highlight). **Item icons**: 1px dark outline (#2a2019, not pure black), transparent background, object fills ~26×26 centered. **Block tiles**: NO outline, fully tileable edge-to-edge (opaque unless noted), subtle noise, no strong border pixels. Tone: warm, grounded, slightly mythic — hand-hewn, not glossy.

---

## BLOCK TILES

### Batch B1 — Terrain soils & liquids (14) — palette: earth browns, cool snow blues, desaturated greens

| filename | what it is | style/palette hints | transparent? |
|---|---|---|---|
| block_grass_top.png | grass top face | mossy green, tiny blade specks | no |
| block_grass_side.png | grass side (dirt + green fringe top 6px) | brown base, green lip | no |
| block_dirt.png | dirt | mid brown, pebble flecks | no |
| block_sand.png | desert/shore sand | pale gold, ripple dots | no |
| block_gravel.png | gravel | grey pebble clusters | no |
| block_clay_terrain.png | clay terrain deposit | grey-tan, smooth wet bands | no |
| block_snow_top.png | snowy turf top | blue-white, sparse sparkle | no |
| block_snow_side.png | snow side (dirt + snow cap) | brown base, white lip | no |
| block_ice.png | ice | pale cyan, diagonal cracks | no |
| block_water_overlay.png | water surface tile | deep teal, light ripples | yes (semi-transparent) |
| block_lava_overlay.png | lava surface tile | orange-red, black crust veins, glow | no |
| block_corrupt_soil.png | corrupted wilds soil | grey-purple, sickly veins | no |
| block_ashen_soil.png | volcanic ash soil | dark grey, ember specks | no |
| block_bedrock.png | Deepshale (unbreakable) | near-black, layered strata | no |

### Batch B2 — Stone, ruins & building (13) — palette: stone greys, aged moss, warm timber

| filename | what it is | style/palette hints | transparent? |
|---|---|---|---|
| block_stone.png | raw stone | mid grey, chunky facets | no |
| block_cobble.png | cobblestone | rounded fitted stones | no |
| block_basalt.png | basalt | dark columnar grey | no |
| block_ruin_brick.png | Ancient Brick | worn tan brick, chipped | no |
| block_rootstone.png | rootstone (dungeon) | grey stone, brown root veins | no |
| block_mossy_ruin.png | Mossy Ruin brick | ruin brick + green moss patches | no |
| block_nightglass.png | Nightglass (obsidian-like) | glossy black-purple sheen | no |
| block_stone_brick.png | cut stone brick (building) | clean grey masonry | no |
| block_spent_rock.png | depleted node rock | dull grey, empty pockmarks | no |
| block_planks.png | plank block | warm alder planks, nail dots | no |
| block_timber_wall.png | timber wall | vertical beams, darker wood | no |
| block_thatch.png | thatch | straw gold, layered strands | no |
| block_glasspane.png | glass | pale frame, clear center | yes |

### Batch B3 — Ore ready-states & field markers (12) — palette: stone grey base + metal-colored inclusions; each ore instantly readable at distance

| filename | what it is | style/palette hints | transparent? |
|---|---|---|---|
| block_copper_vein.png | copper vein in stone | orange-brown nuggets, green oxide fleck | no |
| block_tin_vein.png | tin vein | silvery-white dull nuggets | no |
| block_coal_seam.png | coal seam | matte black chunks | no |
| block_iron_vein.png | iron vein | rust-red ore blobs | no |
| block_gold_lode.png | gold lode | bright yellow glints, sparse | no |
| block_caldrite_vein.png | caldrite (T2 exotic) | deep teal-green crystalline ore | no |
| block_pyrelith_lode.png | pyrelith (T3 magical, emissive 0.3) | ember-orange glowing veins | no |
| block_gloamshard_cluster.png | gloamshard crystal cluster (cross, emissive 0.6) | violet glowing shards on rock base | yes |
| block_clay_bed_block.png | clay bed node | wet grey-tan swirls, glossier than terrain clay | no |
| block_fishing_marker_calm.png | Calm Waters node marker sprite | small cork bobber + ripples | yes |
| block_fishing_marker_deep.png | Deepwater Run marker sprite | dark buoy, purple ripple ring | yes |
| block_trampled_track.png | game trail decal (slab top) | dirt with paw/hoof prints | no |

### Batch B4 — Trees (16) — palette per species: alder warm brown/green; tidewillow silver-grey/sage; rimefir dark blue-brown/frosted teal; duskbough near-black/purple; lanternwood pale gold bark/glowing amber leaves

| filename | what it is | style/palette hints | transparent? |
|---|---|---|---|
| block_alder_ring.png | alder log top (growth rings) | warm brown rings | no |
| block_alder_bark.png | alder bark side | vertical warm bark | no |
| block_tidewillow_ring.png | tidewillow log top | silver-grey rings | no |
| block_tidewillow_bark.png | tidewillow bark | pale peeling strips | no |
| block_rimefir_ring.png | rimefir log top | dense dark rings | no |
| block_rimefir_bark.png | rimefir bark | dark, frost dust at top | no |
| block_duskbough_ring.png | duskbough log top | black-purple rings | no |
| block_duskbough_bark.png | duskbough bark | near-black, violet fissures | no |
| block_lanternwood_ring.png | lanternwood log top | pale gold, glowing core dot | no |
| block_lanternwood_bark.png | lanternwood bark | cream bark, amber seams (faint glow) | no |
| block_alder_leaves.png | alder leaves | mid green, leaf clusters | yes (holes) |
| block_tidewillow_fronds.png | tidewillow fronds | sage green, drooping strands | yes |
| block_rimefir_needles.png | rimefir needles | frosted teal needles | yes |
| block_duskbough_canopy.png | duskbough canopy | deep purple leaves | yes |
| block_lanternwood_glowleaves.png | lanternwood leaves (emissive 0.5) | amber-gold glowing foliage | yes |
| block_tree_stump.png | shared stump (slab) | ring top, bark side combined tile | no |

### Batch B5 — Saplings & low forage states (13) — palette: species colors above; cut states drab and clearly "spent"

| filename | what it is | style/palette hints | transparent? |
|---|---|---|---|
| block_alder_sapling.png | alder sapling (cross) | small green shoot | yes |
| block_tidewillow_sapling.png | tidewillow sapling | droopy sage shoot | yes |
| block_rimefir_sapling.png | rimefir sapling | tiny conifer | yes |
| block_duskbough_sapling.png | duskbough sapling | dark twisted shoot | yes |
| block_lanternwood_sapling.png | lanternwood sapling | pale shoot, glowing bud | yes |
| block_herb_tussock.png | herb thicket ready (cross) | mixed green herbs + tiny flowers | yes |
| block_herb_tussock_cut.png | herb thicket spent | clipped drab stems | yes |
| block_gloomcap_cluster.png | gloomcap mushrooms ready | blue-grey caps, faint spore glow | yes |
| block_gloomcap_stubs.png | gloomcap spent | pale stubs | yes |
| block_bramble_bush.png | berry bramble ready (cube, non-opaque) | thorny green + red berries | yes (edges) |
| block_bramble_bare.png | bramble spent | thorns, no berries | yes |
| block_flax_plant.png | wild flax ready (cross) | slender stalks, blue flowers | yes |
| block_flax_stubble.png | flax spent | cut tan stubble | yes |

### Batch B6 — High forage, archaeology & field (12) — palette: dusk purples for gloam/veil content; sun-baked tans for badlands

| filename | what it is | style/palette hints | transparent? |
|---|---|---|---|
| block_gloamflax_plant.png | gloamflax ready (cross) | dark stalks, violet fiber tufts | yes |
| block_gloamflax_stubble.png | gloamflax spent | dark stubble | yes |
| block_spinebloom_ripe.png | spinebloom cactus ripe (cube, non-opaque) | green cactus, pink fruit | yes (edges) |
| block_spinebloom_cut.png | spinebloom harvested | cactus, no fruit | yes |
| block_tall_grass.png | tall grass (cross; seed source) | long blades, seed heads (biome-tintable greyscale-green) | yes |
| block_wildflower.png | wildflower decor (cross) | mixed petals | yes |
| block_cairn_mound.png | Weathered Cairn (slab) | stacked mossy stones | no |
| block_barrow_stone.png | Sunken Barrow (slab) | half-buried carved stone, mud | no |
| block_kiln_rubble.png | Kiln Ruin (slab) | broken brick, ash | no |
| block_veilgrave_marker.png | Veilgrave (slab, emissive 0.2) | black grave stone, violet rune glow | no |
| block_tilled_loam.png | tilled soil top face | dark furrows | no |
| block_crop_sprout.png | shared crop sprout (cross) | two tiny green leaves | yes |

### Batch B7 — Crop stages & placeables (14) — palette: harvest golds/greens; ripe states clearly brighter than green states

| filename | what it is | style/palette hints | transparent? |
|---|---|---|---|
| block_hearthwheat_green.png | wheat growing (cross) | green stalks | yes |
| block_hearthwheat_ripe.png | wheat ripe | golden heads | yes |
| block_sweetbulb_green.png | sweetbulb growing | leafy tops | yes |
| block_sweetbulb_ripe.png | sweetbulb ripe | white-purple bulbs showing | yes |
| block_mireroot_green.png | mireroot growing | broad marsh leaves | yes |
| block_mireroot_ripe.png | mireroot ripe | red-brown root crowns | yes |
| block_sunmelon_green.png | sunmelon vine growing | curling vine | yes |
| block_sunmelon_ripe.png | sunmelon ripe | striped orange melon | yes |
| block_glimmergourd_green.png | glimmergourd growing | dark vine, faint sparkle | yes |
| block_glimmergourd_ripe.png | glimmergourd ripe | teal gourd, glowing motes | yes |
| block_pitch_torch.png | pitch torch placed (cross, emissive) | wood stake, resin flame | yes |
| block_gourd_lantern.png | gourd lantern (placed, emissive) | carved glowing gourd | yes (edges) |
| block_trophy_mount.png | trophy mount (wall plaque) | wood plaque + skull/horns | yes (edges) |
| block_gilded_lorestone.png | gilded lorestone (decor) | grey stone, gold inlaid runes | no |

### Batch B8 — Crafting stations (12) — palette: worked timber + iron fittings; each station's top face reads its function at a glance

| filename | what it is | style/palette hints | transparent? |
|---|---|---|---|
| block_workbench_top.png | workbench top | wood, tools & pegholes | no |
| block_workbench_side.png | shared bench side | plank frame, drawer | no |
| block_furnace_front.png | furnace front | stone arch, ember mouth glow | no |
| block_anvil.png | anvil (slab) | dark iron on wood base | no |
| block_campfire.png | campfire (slab) | logs + flame + stones ring | yes (edges) |
| block_alchemy_top.png | alchemy table top | flasks, stains, herb sprigs | no |
| block_loom.png | loom | wood frame, stretched threads | no |
| block_altar_top.png | runestone altar top (emissive 0.5) | carved rune circle, violet glow | no |
| block_altar_side.png | runestone altar side | dark stone, rune band | no |
| block_construction_top.png | construction bench top | blueprints, square & nails | no |
| block_chest_front.png | chest front | wood, iron latch | no |
| block_chest_top.png | chest top/lid | banded wood lid | no |

---

## ITEM ICONS (all transparent background)

### Batch B9 — Raw minerals & first ingots (16) — palette: ore lumps on nothing, each metal's hue matches its vein tile from B3

| filename | what it is | style/palette hints | transparent? |
|---|---|---|---|
| item_raw_copper.png | Copper Ore chunk | orange-brown rock, copper glints | yes |
| item_raw_tin.png | Tin Ore chunk | dull silver flecked rock | yes |
| item_coal.png | Coal lump | matte black facets | yes |
| item_raw_iron.png | Iron Ore chunk | rust-red rock | yes |
| item_raw_gold.png | Gold Ore chunk | grey rock, bright gold streaks | yes |
| item_raw_caldrite.png | Caldrite Ore chunk | teal-green crystalline rock | yes |
| item_raw_pyrelith.png | Pyrelith Ore chunk | dark rock, glowing ember veins | yes |
| item_gloamshard.png | Gloamshard crystal | violet shard, inner glow | yes |
| item_radiant_gloamshard.png | Radiant Gloamshard | brighter violet-white shard, halo pixels | yes |
| item_quarried_stone.png | Quarried Stone block chunk | squared grey stone | yes |
| item_river_clay.png | River Clay ball | grey-tan lump, finger marks | yes |
| item_fine_sand.png | Fine Sand pile | pale gold heap | yes |
| item_packed_earth.png | Packed Earth clod | brown compact block | yes |
| item_bronze_ingot.png | Bronze Ingot | warm tan-gold bar | yes |
| item_iron_ingot.png | Iron Ingot | grey bar | yes |
| item_steel_ingot.png | Steel Ingot | bright blue-grey bar, sheen line | yes |

### Batch B10 — Ingots, processing & geodes (14) — palette: metal bars share one bar silhouette, hue differs; geodes = round stones with ring-tier crust

| filename | what it is | style/palette hints | transparent? |
|---|---|---|---|
| item_gold_ingot.png | Gold Ingot | rich yellow bar | yes |
| item_caldrite_ingot.png | Caldrite Ingot | teal-green bar | yes |
| item_pyrelith_ingot.png | Pyrelith Ingot | dark bar, ember glow seams | yes |
| item_clay_crucible.png | Clay Crucible | fired clay cup, scorch marks | yes |
| item_fired_brick.png | Fired Brick | terracotta brick | yes |
| item_hewn_plank.png | Hewn Plank | pale cut board pair | yes |
| item_twine.png | Twine coil | tan fiber loop | yes |
| item_linen_cloth.png | Linen Cloth bolt | folded cream fabric | yes |
| item_gloamweave_cloth.png | Gloamweave Cloth | folded dark violet fabric, thread glints | yes |
| item_bonemeal.png | Bonemeal | white powder pile | yes |
| item_mossy_geode.png | Mossy Geode (R0) | round stone, moss patches | yes |
| item_banded_geode.png | Banded Geode (R1) | round stone, tan bands | yes |
| item_glassy_geode.png | Glassy Geode (R2) | round stone, crystal window | yes |
| item_starlit_geode.png | Starlit Geode (R3) | dark stone, star-fleck sparkle | yes |

### Batch B11 — Cut gems & fishing extras (12) — palette: faceted gem sprites; flawless = same cut + white star glint + brighter core

| filename | what it is | style/palette hints | transparent? |
|---|---|---|---|
| item_dawn_garnet.png | Dawn Garnet (melee) | deep red faceted gem | yes |
| item_flawless_dawn_garnet.png | Flawless Dawn Garnet | red gem + star glint | yes |
| item_gale_beryl.png | Gale Beryl (ranged) | sky-green gem | yes |
| item_flawless_gale_beryl.png | Flawless Gale Beryl | + star glint | yes |
| item_warden_jade.png | Warden Jade (defense) | opaque deep green gem | yes |
| item_flawless_warden_jade.png | Flawless Warden Jade | + star glint | yes |
| item_foxfire_amber.png | Foxfire Amber (luck) | warm orange gem, inner mote | yes |
| item_flawless_foxfire_amber.png | Flawless Foxfire Amber | + star glint | yes |
| item_veilstar.png | Veilstar (magic, signature) | violet gem, starburst core | yes |
| item_flawless_veilstar.png | Flawless Veilstar | brilliant violet-white | yes |
| item_drowned_coffer.png | Drowned Coffer | small barnacled chest, seaweed | yes |
| item_bait_grubs.png | Grub Bait | tin of pale grubs | yes |

### Batch B12 — Woods, saps & saplings (15) — palette: match species colors from B4; saps in small stoppered jars/blobs

| filename | what it is | style/palette hints | transparent? |
|---|---|---|---|
| item_alder_log.png | Alder Log | warm brown log | yes |
| item_tidewillow_log.png | Tidewillow Log | silver-grey log | yes |
| item_rimefir_log.png | Rimefir Log | dark frosted log | yes |
| item_duskbough_log.png | Duskbough Log | black-purple log | yes |
| item_lanternwood_log.png | Lanternwood Log | pale gold log, glow seam | yes |
| item_pitchgum.png | Pitchgum resin | amber-black sticky blob | yes |
| item_withy_cane.png | Withy Cane | slender flexible switch | yes |
| item_coldsap.png | Coldsap vial | icy blue sap jar | yes |
| item_duskrosin.png | Duskrosin | purple-black resin lump | yes |
| item_glowpith.png | Glowpith | glowing amber wood core stick | yes |
| item_alder_sapling.png | Alder Sapling | shoot in root ball | yes |
| item_tidewillow_sapling.png | Tidewillow Sapling | droopy shoot, root ball | yes |
| item_rimefir_sapling.png | Rimefir Sapling | mini conifer, root ball | yes |
| item_duskbough_sapling.png | Duskbough Sapling | dark shoot, root ball | yes |
| item_lanternwood_sapling.png | Lanternwood Sapling | glowing bud shoot | yes |

### Batch B13 — Herbs & forage (13) — palette: botanical sprigs, one signature color each; R2-3 herbs get subtle glow/frost accents

| filename | what it is | style/palette hints | transparent? |
|---|---|---|---|
| item_hearthmint.png | Hearthmint sprig | bright green serrated leaves | yes |
| item_woundwort.png | Woundwort | grey-green leaves, white flower | yes |
| item_marshbell.png | Marshbell | blue bell flowers on stem | yes |
| item_stonecress.png | Stonecress | low grey-green rosette | yes |
| item_cinderbloom.png | Cinderbloom | red-orange flower, ember tips | yes |
| item_frostcap.png | Frostcap mushroom | blue-white frosted cap | yes |
| item_emberlace.png | Emberlace | delicate glowing orange fronds | yes |
| item_hollowroot.png | Hollowroot | pale twisted root, dark hollows | yes |
| item_glowspore.png | Glowspore pouch | teal glowing spore cluster | yes |
| item_brambleberry.png | Brambleberry | red berry cluster | yes |
| item_spinefruit.png | Spinefruit | pink cactus fruit, spines | yes |
| item_flax_fibre.png | Flax Fibre bundle | tan fiber sheaf | yes |
| item_gloamfibre.png | Gloamfibre bundle | dark violet fiber sheaf | yes |

### Batch B14 — Fish & meats (12) — palette: fish in side profile, ring-tier fish get more exotic silhouettes/colors

| filename | what it is | style/palette hints | transparent? |
|---|---|---|---|
| item_brookperch.png | Brookperch (R0) | small green-silver fish | yes |
| item_mosscarp.png | Mosscarp (R0) | plump mossy-green carp | yes |
| item_saltdarter.png | Saltdarter (R1) | slim silver-blue fish | yes |
| item_bogpike.png | Bogpike (R1) | long dark toothy fish | yes |
| item_stonebass.png | Stonebass (R2) | grey armored bass | yes |
| item_icechar.png | Icechar (R2) | pale blue char, frost specks | yes |
| item_emberkoi.png | Emberkoi (R3) | orange-gold koi, ember glow | yes |
| item_gloameel.png | Gloameel (R3) | black eel, violet glow stripe | yes |
| item_lean_cut.png | Lean Cut | small raw red meat | yes |
| item_prime_cut.png | Prime Cut | large marbled steak | yes |
| item_venom_gland.png | Venom Gland | green pulsing sac | yes |
| item_featherbarb.png | Featherbarb | stiff banded feather | yes |

### Batch B15 — Hides, totems & archaeology (16) — palette: leather browns darkening per tier; totems bone-white with tier trim; relics aged bronze→violet

| filename | what it is | style/palette hints | transparent? |
|---|---|---|---|
| item_ragged_pelt.png | Ragged Pelt (T0) | scruffy brown pelt | yes |
| item_sturdy_hide.png | Sturdy Hide (T1) | clean tan hide | yes |
| item_direhide.png | Direhide (T2) | thick dark scarred hide | yes |
| item_shadehide.png | Shadehide (T3) | near-black hide, violet sheen | yes |
| item_beast_sinew.png | Beast Sinew | pale twisted cord | yes |
| item_ironsinew.png | Ironsinew | grey-blue thick cord | yes |
| item_totem_fang.png | Totem Fang (T0) | large fang, cord wrap | yes |
| item_totem_horn.png | Totem Horn (T1) | curved horn, carved band | yes |
| item_totem_skull.png | Totem Skull (T2) | small beast skull, rune mark | yes |
| item_totem_heart.png | Totem Heart (T3) | crystallized dark heart, glow | yes |
| item_root_relic.png | Root-Age Relic | mossy carved idol | yes |
| item_forge_relic.png | Forge-Age Relic | bronze tool fragment | yes |
| item_storm_relic.png | Storm-Age Relic | grey tablet, storm sigil | yes |
| item_veil_relic.png | Veil-Age Relic | black idol, violet runes | yes |
| item_tarnished_trinket.png | Tarnished Trinket | dull bent gold bauble | yes |
| item_bone_shards.png | Bone Shards | white shard pile | yes |

### Batch B16 — Crops, seeds & farm foods (12) — palette: harvest golds and vegetable hues; seed pouches share one small-sack silhouette

| filename | what it is | style/palette hints | transparent? |
|---|---|---|---|
| item_hearthwheat.png | Hearthwheat sheaf | golden wheat bundle | yes |
| item_sweetbulb.png | Sweetbulb | white-purple onion-like bulb | yes |
| item_mireroot.png | Mireroot | knobbly red-brown root | yes |
| item_sunmelon.png | Sunmelon | striped orange melon | yes |
| item_glimmergourd.png | Glimmergourd | teal gourd, glow motes | yes |
| item_hearthwheat_seeds.png | Hearthwheat Seeds | small sack, gold seeds | yes |
| item_sweetbulb_seeds.png | Sweetbulb Seeds | sack, white bulblets | yes |
| item_mireroot_seeds.png | Mireroot Seeds | sack, brown tubers | yes |
| item_sunmelon_seeds.png | Sunmelon Seeds | sack, flat orange seeds | yes |
| item_glimmergourd_seeds.png | Glimmergourd Seeds | sack, faintly glowing seeds | yes |
| item_hearth_bread.png | Hearth Bread | rustic round loaf, scored top | yes |
| item_glimmer_candy.png | Glimmer-Candy (Beastlore lure) | teal glowing sweet, wax paper | yes |

### Batch B17 — Tool sets (15) — palette: one silhouette per tool type; head material recolors per tier (stone grey → bronze → steel blue → caldrite teal → pyrelith ember); hafts match tier woods

| filename | what it is | style/palette hints | transparent? |
|---|---|---|---|
| item_stonebit_pick.png | crude stone pick (T1) | grey stone head, alder haft | yes |
| item_stonebit_axe.png | crude stone axe | grey head | yes |
| item_stonebit_shovel.png | crude stone shovel | grey blade | yes |
| item_stonebit_hoe.png | crude stone hoe | grey blade | yes |
| item_bronze_pick.png | bronze pick (T2) | tan-gold head | yes |
| item_bronze_axe.png | bronze axe | tan-gold head | yes |
| item_bronze_shovel.png | bronze shovel | tan-gold blade | yes |
| item_bronzehead_hoe.png | bronze hoe | tan-gold blade | yes |
| item_steel_pick.png | steel pick (T3) | blue-grey head, sheen | yes |
| item_steel_axe.png | steel axe | blue-grey head | yes |
| item_steel_shovel.png | steel shovel | blue-grey blade | yes |
| item_caldrite_pick.png | caldrite pick (T4) | teal head, rimefir haft | yes |
| item_caldrite_axe.png | caldrite axe | teal head | yes |
| item_pyrelith_pick.png | pyrelith pick (T5) | ember-glow head, dark haft | yes |
| item_pyrelith_axe.png | pyrelith axe | ember-glow head | yes |

### Batch B18 — Rods & weapons T0-T2 (12) — palette: weapons diagonal bottom-left→top-right; staves get gem/glow tips; wood parts match species colors

| filename | what it is | style/palette hints | transparent? |
|---|---|---|---|
| item_alder_rod.png | fishing rod T1 | alder pole, twine line | yes |
| item_deepcast_rod.png | Deepcast Rod T3 | tidewillow+withy rod, reel | yes |
| item_cudgel.png | T0 melee club | knotted alder cudgel | yes |
| item_shortbow.png | T0 alder shortbow | simple curve, sinew string | yes |
| item_hearthspark_staff.png | T0 staff | alder staff, coal ember tip | yes |
| item_ironbrand_sword.png | T1 iron sword | grey blade, hide grip | yes |
| item_steel_longsword.png | T1+ steel longsword | blue-grey long blade | yes |
| item_tidewillow_recurve.png | T1 recurve bow | silver-grey laminated curve | yes |
| item_marshbell_scepter.png | T1 magic scepter | tidewillow rod, blue bell charm | yes |
| item_warspear.png | T2 caldrite warspear | teal head, rimefir shaft | yes |
| item_rimefir_warbow.png | T2 warbow | dark heavy bow, frost accents | yes |
| item_lanternglow_staff.png | T2 staff | lanternwood staff, glowpith orb | yes |

### Batch B19 — Weapons T3, ammo & heavy bronze (10) — palette: T3 gear = dark bodies + ember/violet glows; arrows share one silhouette, head recolors

| filename | what it is | style/palette hints | transparent? |
|---|---|---|---|
| item_duskfang_greatsword.png | T3 greatsword | pyrelith blade, duskbough grip, ember edge | yes |
| item_duskbough_recurve.png | T3 recurve | black bow, violet string glow | yes |
| item_gloamcaller_staff.png | T3 staff | duskbough staff, radiant gloamshard head | yes |
| item_bonepoint_arrow.png | T0 arrows | bone tip, alder shaft, bundle of 3 | yes |
| item_steelpoint_arrow.png | T1-2 arrows | steel tip bundle | yes |
| item_caldrite_arrow.png | T2 arrows | teal tip bundle | yes |
| item_pyrepoint_arrow.png | T3 arrows | glowing ember tip bundle | yes |
| item_bronze_helm.png | heavy T0/1 bronze helm | tan-gold rounded helm | yes |
| item_bronze_cuirass.png | bronze chest | tan-gold plate, leather straps | yes |
| item_bronze_greaves.png | bronze greaves | tan-gold leg plates | yes |

### Batch B20 — Heavy steel/pyrewarden + light T0-T1 armor (12) — palette: heavy = plate silhouettes; light = stitched leather; keep piece silhouettes identical across tiers, recolor material

| filename | what it is | style/palette hints | transparent? |
|---|---|---|---|
| item_steel_helm.png | steel helm | blue-grey plate | yes |
| item_steel_cuirass.png | steel chest | blue-grey plate | yes |
| item_steel_greaves.png | steel greaves | blue-grey | yes |
| item_pyrewarden_helm.png | T3 heavy helm | dark plate, ember seams | yes |
| item_pyrewarden_plate.png | T3 heavy chest | dark plate, glowing crest | yes |
| item_pyrewarden_greaves.png | T3 heavy greaves | dark plate, ember trim | yes |
| item_pelt_hood.png | light T0 hood | scruffy brown fur hood | yes |
| item_pelt_jerkin.png | light T0 chest | ragged pelt vest | yes |
| item_pelt_leggings.png | light T0 legs | fur-wrapped leggings | yes |
| item_hide_hood.png | light T1 hood | clean tan leather hood | yes |
| item_hide_jerkin.png | light T1 chest | stitched tan jerkin | yes |
| item_hide_leggings.png | light T1 legs | tan leather | yes |

### Batch B21 — Light T2 + all cloth armor (12) — palette: direhide dark leather; cloth = draped fabric silhouettes (cream linen → violet gloamweave → gold-threaded)

| filename | what it is | style/palette hints | transparent? |
|---|---|---|---|
| item_direhide_hood.png | light T2 hood | dark scarred leather | yes |
| item_direhide_jerkin.png | light T2 chest | dark leather, iron studs | yes |
| item_direhide_leggings.png | light T2 legs | dark leather | yes |
| item_shadehide_hood.png | light T3 hood | black leather, violet sheen | yes |
| item_shadehide_jerkin.png | light T3 chest | black, violet stitch glow | yes |
| item_shadehide_leggings.png | light T3 legs | black-violet | yes |
| item_linen_cowl.png | cloth T0-1 hood | cream hood | yes |
| item_linen_robe.png | cloth T0-1 robe | cream robe, rope belt | yes |
| item_linen_wraps.png | cloth T0-1 legs | cream wraps | yes |
| item_gloamweave_cowl.png | cloth T2 hood | dark violet cowl | yes |
| item_gloamweave_robe.png | cloth T2 robe | violet robe, thread glints | yes |
| item_gloamweave_wraps.png | cloth T2 legs | violet wraps | yes |

*(Cloth T3 gilt set folded into B22 to balance batch sizes.)*

### Batch B22 — Cloth T3, jewelry & runes (17) — palette: gold metalwork + inset gems matching B11 hues; runes = stone discs with glowing sigils

| filename | what it is | style/palette hints | transparent? |
|---|---|---|---|
| item_gilt_cowl.png | cloth T3 hood | violet-black, gold thread trim | yes |
| item_gilt_robe.png | cloth T3 robe | gold-embroidered dark robe | yes |
| item_gilt_wraps.png | cloth T3 legs | gold-trimmed wraps | yes |
| item_gold_ring.png | ring blank | plain gold band, empty socket | yes |
| item_gold_amulet.png | amulet blank | gold pendant, empty socket | yes |
| item_garnet_signet.png | melee signet | gold ring + red gem | yes |
| item_beryl_signet.png | ranged signet | gold ring + sky-green gem | yes |
| item_jade_signet.png | defense signet | gold ring + green gem | yes |
| item_amber_signet.png | luck signet | gold ring + orange gem | yes |
| item_veilstar_signet.png | magic signet | gold ring + violet gem | yes |
| item_wardenheart_amulet.png | defense amulet | gold pendant, flawless jade | yes |
| item_veilstar_amulet.png | magic amulet | gold pendant, flawless veilstar, halo | yes |
| item_wildheart_charm.png | Beastlore charm | horn + gloamshard on cord | yes |
| item_rune_root.png | tier-1 rune | stone disc, green root sigil | yes |
| item_rune_forge.png | tier-2 rune | disc, orange forge sigil | yes |
| item_rune_storm.png | tier-3 rune | disc, blue storm sigil | yes |
| item_rune_of_the_veil.png | capstone rune | black disc, radiant violet sigil | yes |

### Batch B23 — Shields, quiver & utility (13) — palette: mixed kit items; glows only where emissive (lantern, vial, torch)

| filename | what it is | style/palette hints | transparent? |
|---|---|---|---|
| item_targe.png | small shield | round hide-on-wood targe, bronze boss | yes |
| item_bulwark.png | large shield | tall rimefir+ironsinew tower shield | yes |
| item_hunters_quiver.png | quiver | tan leather quiver, arrow fletchings | yes |
| item_pitch_torch.png | torch (held/placed) | stake, resin flame | yes |
| item_glow_vial.png | glow vial | corked vial, teal spore light | yes |
| item_veil_lantern.png | veil lantern | dark metal lantern, violet light | yes |
| item_whetstone.png | whetstone | grey grinding stone | yes |
| item_forge_whetstone.png | forge whetstone | dark stone, ember dust | yes |
| item_bow_rosin.png | bow rosin | purple resin cake, cloth wrap | yes |
| item_venom_oil.png | venom oil | green vial, drip | yes |
| item_gourd_lantern.png | gourd lantern (item) | carved glowing gourd | yes |
| item_trophy_mount.png | trophy mount (item) | plaque + horns kit | yes |
| item_gilded_lorestone.png | gilded lorestone (item) | rune stone, gold inlay | yes |

### Batch B24 — Cooked buff-foods (11) — palette: appetizing plated dishes; steam wisps in cream; each dish echoes its fish's color

| filename | what it is | style/palette hints | transparent? |
|---|---|---|---|
| item_roast_brookperch.png | brookperch dish (heal) | roast fish on leaf | yes |
| item_mosscarp_hotpot.png | mosscarp dish (gather speed) | green stew bowl | yes |
| item_salted_darter.png | saltdarter dish (evasion) | cured fish fillets | yes |
| item_bogpike_roast.png | bogpike dish (attack) | skewered dark fish | yes |
| item_stonebass_bake.png | stonebass dish (defense) | baked fish, crust | yes |
| item_glazed_icechar.png | icechar dish (frost-res+HP) | glazed pale fish, coldsap sheen | yes |
| item_emberkoi_seared.png | emberkoi dish (fire-res+attack) | seared orange fillet, char lines | yes |
| item_gloameel_stew.png | gloameel dish (mana+magic) | dark stew, violet glow | yes |
| item_hunters_skewer.png | meat skewer | grilled lean cuts on stick | yes |
| item_mireroot_stew.png | hearty stew | brown stew, root chunks | yes |
| item_prime_platter.png | T3 feast platter | large roast, trimmings | yes |

### Batch B25 — Potions (13) — palette: one flask silhouette (clay-stoppered round flask), liquid color = effect; greater variants add rising bubbles

| filename | what it is | style/palette hints | transparent? |
|---|---|---|---|
| item_minor_heal_tonic.png | minor heal | soft red liquid | yes |
| item_heal_tonic.png | heal | red | yes |
| item_greater_heal_tonic.png | greater heal | deep red, bubbles | yes |
| item_mana_tonic.png | mana | blue | yes |
| item_greater_mana_tonic.png | greater mana | deep blue, bubbles | yes |
| item_antivenom.png | antidote | pale green, cress sprig | yes |
| item_stoneskin_tonic.png | defense | grey, stony texture | yes |
| item_emberward_tonic.png | fire resist | orange, ember fleck | yes |
| item_frostward_tonic.png | frost resist | ice blue, frost rim | yes |
| item_attack_tonic.png | attack | crimson-orange | yes |
| item_laststand_draught.png | last stand | dark red-black, glow core | yes |
| item_fortune_tonic.png | gather luck | amber, sparkle motes | yes |
| item_veilsight_tonic.png | veilsight | violet, eye wisp | yes |

---

## (2) TOTAL COUNT

| group | files |
|---|---|
| Block tiles (B1-B8) | 14+13+12+16+13+12+14+12 = **106** |
| Item icons (B9-B25) | 16+14+12+15+13+12+16+12+15+12+10+12+12+17+13+11+13 = **222** |
| **GRAND TOTAL** | **328 PNGs (32×32)** |

Notes for the orchestrator: item count = 222 exactly (95 materials + 127 gear per FINAL DESIGN as-written; if the ~200-item merge pass from ISSUES/FIXES is applied, drop the 5 `flawless_*` icons, `item_forge_whetstone`, `item_gold_ring`, `item_gold_amulet`, and merged armor/shield pieces before generating — regenerate this manifest's B11/B19-B23 rows only). Block set includes reviewer fix #10 (`block_tall_grass`), fix #16 (per-face log tiles, tilled_loam top; explicit fishing marker sprites), retained-terrain re-skins enumerated from `js/world/blocks.js` (grass/dirt/stone/cobble/sand/gravel/clay/snow/ice/water/lava/bedrock/basalt/ruin_brick/rootstone/mossy_ruin/nightglass/corrupt_soil/ashen_soil + building + all 9 station tiles), and uses the retained engine station ids (runestone altar tiles = `altar_top`/`altar_side`, fix #7). Old-species tiles (fernwood/silverbark/emberpine) and old ore tiles (silvervein/emberstone/crystal_cluster) are superseded, not repainted.

## (3) Art-direction paragraph

See the blockquote at top — prefix it verbatim to every batch prompt, then append the batch's own palette note from its header row. One image per file, exactly 32×32, PNG. Blocks tile seamlessly with no outline; items get the 1px #2a2019 outline on transparent background. Lighting always top-left; emissive content (pyrelith, gloamshard, lanternwood, veil/glow items) may break the shadow rule with self-illumination. Keep silhouettes consistent within a family (same bar for all ingots, same arrow bundle, same flask, same armor-piece outlines) so tiers read as recolors of a shared shape language — that consistency matters more than per-sprite flourish.