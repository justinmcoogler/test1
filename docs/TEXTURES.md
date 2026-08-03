# Sproutlands — Realistic Texture Manifest (v3)

Generated from `js/game/materials.js` — 381 textures, all **32×32 PNG**. `block_*.png` = world tiles (opaque, tile seamlessly), `item_*.png` = inventory icons (transparent). Filenames are load-bearing — the texture-pack loader consumes them exactly.

## How to generate (paste this prompt into ChatGPT, then one batch table per session)

---

You are generating pixel-art textures for a voxel RPG. I will paste a batch table of rows: `filename | what it is | style hint | transparent?`. For EACH row, produce a **32×32 pixel-art PNG** with that exact filename. Rules:

1. Use your **Python tool with Pillow** to author every sprite at exactly 32×32 (draw on a 32×32 grid, or 320×320 downscaled NEAREST). No anti-aliasing, no blur, no gradients smoother than 3 steps.
2. Rows marked transparent get a fully transparent background (RGBA alpha 0) — the sprite floats. Non-transparent rows fill the full 32×32 tile edge-to-edge and must **tile seamlessly** (offset 16px → no seam).
3. Follow the batch's palette note; consistent hues across the batch, single top-left light source, 1px darker outline on item icons, no pure black/white.
4. Item icons: centered subject, ~2px margin, readable silhouette. Block tiles: mid-contrast, no focal point (they repeat).
5. After drawing the batch, zip the PNGs as `textures_<batch>.zip` with the exact filenames and give me the zip; then show a 4× contact sheet to review.
6. Self-check: every filename present, all files exactly 32×32 RGBA PNG, transparency correct. State "manifest check passed" with the count.

Style: realistic-but-readable chunky pixels; grounded medieval → renaissance palette (real woods, ores, metals, black-powder gear); no copied Minecraft/RuneScape sprites.

---

### Batch B1 — Terrain (14) — palette: earth browns, greens, cool water blue

| filename | what it is | style hint | transparent |
|---|---|---|---|
| `block_grass_top.png` | grass top — mowed green | natural earthy tones | no |
| `block_grass_side.png` | grass side — soil + green fringe | natural earthy tones | no |
| `block_dirt.png` | plain soil | natural earthy tones | no |
| `block_stone.png` | grey stone | natural earthy tones | no |
| `block_cobblestone.png` | broken stone | natural earthy tones | no |
| `block_sand.png` | pale sand | natural earthy tones | no |
| `block_gravel.png` | loose pebbles | natural earthy tones | no |
| `block_clay.png` | grey-brown clay | natural earthy tones | no |
| `block_snow.png` | snow top | natural earthy tones | no |
| `block_snow_side.png` | snowy grass side | natural earthy tones | no |
| `block_water.png` | water surface | natural earthy tones | no |
| `block_bedrock.png` | dark deep stone | natural earthy tones | no |
| `block_farmland.png` | tilled wet soil | natural earthy tones | no |
| `block_tall_grass.png` | wild grass tuft (transparent cross) | natural earthy tones | yes |

### Batch B2 — Ores (13) — palette: stone grey + each metal’s hue

| filename | what it is | style hint | transparent |
|---|---|---|---|
| `block_copper_ore.png` | Copper ore — stone with copper-colored inclusions | stone-grey base; Copper hue must read at a distance | no |
| `block_tin_ore.png` | Tin ore — stone with tin-colored inclusions | stone-grey base; Tin hue must read at a distance | no |
| `block_iron_ore.png` | Iron ore — stone with iron-colored inclusions | stone-grey base; Iron hue must read at a distance | no |
| `block_meteoric_ore.png` | Meteoric Iron ore — stone with meteoric iron-colored inclusions | stone-grey base; Meteoric Iron hue must read at a distance | no |
| `block_lead_ore.png` | Lead ore — stone with lead-colored inclusions | stone-grey base; Lead hue must read at a distance | no |
| `block_zinc_ore.png` | Zinc ore — stone with zinc-colored inclusions | stone-grey base; Zinc hue must read at a distance | no |
| `block_silver_ore.png` | Silver ore — stone with silver-colored inclusions | stone-grey base; Silver hue must read at a distance | no |
| `block_gold_ore.png` | Gold ore — stone with gold-colored inclusions | stone-grey base; Gold hue must read at a distance | no |
| `block_platinum_ore.png` | Platinum ore — stone with platinum-colored inclusions | stone-grey base; Platinum hue must read at a distance | no |
| `block_meteor_crater.png` | meteor-crater floor — scorched fused rock (meteoric iron site) | charred dark rock, faint metallic flecks | no |
| `block_saltpeter_deposit.png` | saltpeter/nitre deposit — pale crusty mineral | chalky white-yellow crust on stone | no |
| `block_sulfur_deposit.png` | sulfur deposit — yellow volcanic mineral | bright sulfur yellow on dark rock | no |
| `block_coal_lump.png` | exposed coal seam | near-black with dull facets | no |

### Batch B3 — Trees A (12) — palette: per-species real wood tones

| filename | what it is | style hint | transparent |
|---|---|---|---|
| `block_pine_log.png` | Pine log — bark | Pine bark color/character | no |
| `block_pine_log_top.png` | Pine log — end grain rings | concentric growth rings | no |
| `block_pine_leaves.png` | Pine leaves/needles | needled evergreen | yes |
| `block_cedar_log.png` | Cedar log — bark | Cedar bark color/character | no |
| `block_cedar_log_top.png` | Cedar log — end grain rings | concentric growth rings | no |
| `block_cedar_leaves.png` | Cedar leaves/needles | needled evergreen | yes |
| `block_birch_log.png` | Birch log — bark | Birch bark color/character | no |
| `block_birch_log_top.png` | Birch log — end grain rings | concentric growth rings | no |
| `block_birch_leaves.png` | Birch leaves/needles | broadleaf canopy | yes |
| `block_oak_log.png` | Oak log — bark | Oak bark color/character | no |
| `block_oak_log_top.png` | Oak log — end grain rings | concentric growth rings | no |
| `block_oak_leaves.png` | Oak leaves/needles | broadleaf canopy | yes |

### Batch B4 — Trees B (12) — palette: per-species real wood tones

| filename | what it is | style hint | transparent |
|---|---|---|---|
| `block_ash_log.png` | Ash log — bark | Ash bark color/character | no |
| `block_ash_log_top.png` | Ash log — end grain rings | concentric growth rings | no |
| `block_ash_leaves.png` | Ash leaves/needles | broadleaf canopy | yes |
| `block_hickory_log.png` | Hickory log — bark | Hickory bark color/character | no |
| `block_hickory_log_top.png` | Hickory log — end grain rings | concentric growth rings | no |
| `block_hickory_leaves.png` | Hickory leaves/needles | broadleaf canopy | yes |
| `block_maple_log.png` | Maple log — bark | Maple bark color/character | no |
| `block_maple_log_top.png` | Maple log — end grain rings | concentric growth rings | no |
| `block_maple_leaves.png` | Maple leaves/needles | broadleaf canopy | yes |
| `block_walnut_log.png` | Walnut log — bark | Walnut bark color/character | no |
| `block_walnut_log_top.png` | Walnut log — end grain rings | concentric growth rings | no |
| `block_walnut_leaves.png` | Walnut leaves/needles | broadleaf canopy | yes |

### Batch B5 — Trees C (12) — palette: per-species real wood tones

| filename | what it is | style hint | transparent |
|---|---|---|---|
| `block_yew_log.png` | Yew log — bark | Yew bark color/character | no |
| `block_yew_log_top.png` | Yew log — end grain rings | concentric growth rings | no |
| `block_yew_leaves.png` | Yew leaves/needles | broadleaf canopy | yes |
| `block_teak_log.png` | Teak log — bark | Teak bark color/character | no |
| `block_teak_log_top.png` | Teak log — end grain rings | concentric growth rings | no |
| `block_teak_leaves.png` | Teak leaves/needles | broadleaf canopy | yes |
| `block_ebony_log.png` | Ebony log — bark | Ebony bark color/character | no |
| `block_ebony_log_top.png` | Ebony log — end grain rings | concentric growth rings | no |
| `block_ebony_leaves.png` | Ebony leaves/needles | broadleaf canopy | yes |
| `block_lignum_vitae_log.png` | Lignum Vitae log — bark | Lignum Vitae bark color/character | no |
| `block_lignum_vitae_log_top.png` | Lignum Vitae log — end grain rings | concentric growth rings | no |
| `block_lignum_vitae_leaves.png` | Lignum Vitae leaves/needles | broadleaf canopy | yes |

### Batch B6 — Stations (8) — palette: timber + iron

| filename | what it is | style hint | transparent |
|---|---|---|---|
| `block_furnace.png` | furnace front | worked timber + iron fittings | no |
| `block_anvil.png` | anvil top | worked timber + iron fittings | no |
| `block_workbench.png` | workbench top | worked timber + iron fittings | no |
| `block_loom.png` | loom | worked timber + iron fittings | no |
| `block_campfire.png` | campfire | worked timber + iron fittings | no |
| `block_chest_front.png` | storage chest | worked timber + iron fittings | no |
| `block_grindstone.png` | gem-cutting/whetstone wheel | worked timber + iron fittings | no |
| `block_tanning_rack.png` | hide tanning rack | worked timber + iron fittings | no |

### Batch I1 — Bars & fuel (17) — palette: metal hues; one bar shape

| filename | what it is | style hint | transparent |
|---|---|---|---|
| `item_copper_bar.png` | Copper bar | Copper metal hue; shared bar silhouette | yes |
| `item_tin_bar.png` | Tin bar | Tin metal hue; shared bar silhouette | yes |
| `item_bronze_bar.png` | Bronze bar | Bronze metal hue; shared bar silhouette | yes |
| `item_iron_bar.png` | Iron bar | Iron metal hue; shared bar silhouette | yes |
| `item_steel_bar.png` | Steel bar | Steel metal hue; shared bar silhouette | yes |
| `item_damascus_bar.png` | Damascus Steel bar | Damascus Steel metal hue; shared bar silhouette | yes |
| `item_meteoric_bar.png` | Meteoric Iron bar | Meteoric Iron metal hue; shared bar silhouette | yes |
| `item_lead_bar.png` | Lead bar | Lead metal hue; shared bar silhouette | yes |
| `item_zinc_bar.png` | Zinc bar | Zinc metal hue; shared bar silhouette | yes |
| `item_silver_bar.png` | Silver bar | Silver metal hue; shared bar silhouette | yes |
| `item_gold_bar.png` | Gold bar | Gold metal hue; shared bar silhouette | yes |
| `item_platinum_bar.png` | Platinum bar | Platinum metal hue; shared bar silhouette | yes |
| `item_brass_bar.png` | Brass bar | Brass metal hue; shared bar silhouette | yes |
| `item_electrum_bar.png` | Electrum bar | Electrum metal hue; shared bar silhouette | yes |
| `item_pewter_bar.png` | Pewter bar | Pewter metal hue; shared bar silhouette | yes |
| `item_coal.png` | coal lump | black shiny lump | yes |
| `item_charcoal.png` | charcoal | matte black chunk | yes |

### Batch I2 — Raw ore & minerals (12) — palette: ore lumps

| filename | what it is | style hint | transparent |
|---|---|---|---|
| `item_copper_ore.png` | raw Copper ore chunk | rough rock with Copper hue | yes |
| `item_tin_ore.png` | raw Tin ore chunk | rough rock with Tin hue | yes |
| `item_iron_ore.png` | raw Iron ore chunk | rough rock with Iron hue | yes |
| `item_meteoric_ore.png` | raw Meteoric Iron ore chunk | rough rock with Meteoric Iron hue | yes |
| `item_lead_ore.png` | raw Lead ore chunk | rough rock with Lead hue | yes |
| `item_zinc_ore.png` | raw Zinc ore chunk | rough rock with Zinc hue | yes |
| `item_silver_ore.png` | raw Silver ore chunk | rough rock with Silver hue | yes |
| `item_gold_ore.png` | raw Gold ore chunk | rough rock with Gold hue | yes |
| `item_platinum_ore.png` | raw Platinum ore chunk | rough rock with Platinum hue | yes |
| `item_saltpeter.png` | Saltpeter | mineral/reagent | yes |
| `item_sulfur.png` | Sulfur | mineral/reagent | yes |
| `item_charcoal.png` | Charcoal | mineral/reagent | yes |

### Batch I3 — Gems (16) — palette: faceted gem hues

| filename | what it is | style hint | transparent |
|---|---|---|---|
| `item_uncut_quartz.png` | uncut Rock Crystal | rough crystal | yes |
| `item_quartz.png` | cut Rock Crystal | faceted gem, bright core | yes |
| `item_uncut_amethyst.png` | uncut Amethyst | rough crystal | yes |
| `item_amethyst.png` | cut Amethyst | faceted gem, bright core | yes |
| `item_uncut_garnet.png` | uncut Garnet | rough crystal | yes |
| `item_garnet.png` | cut Garnet | faceted gem, bright core | yes |
| `item_uncut_topaz.png` | uncut Topaz | rough crystal | yes |
| `item_topaz.png` | cut Topaz | faceted gem, bright core | yes |
| `item_uncut_emerald.png` | uncut Emerald | rough crystal | yes |
| `item_emerald.png` | cut Emerald | faceted gem, bright core | yes |
| `item_uncut_sapphire.png` | uncut Sapphire | rough crystal | yes |
| `item_sapphire.png` | cut Sapphire | faceted gem, bright core | yes |
| `item_uncut_ruby.png` | uncut Ruby | rough crystal | yes |
| `item_ruby.png` | cut Ruby | faceted gem, bright core | yes |
| `item_uncut_diamond.png` | uncut Diamond | rough crystal | yes |
| `item_diamond.png` | cut Diamond | faceted gem, bright core | yes |

### Batch I4 — Planks A (6) — palette: wood tones

| filename | what it is | style hint | transparent |
|---|---|---|---|
| `item_pine_plank.png` | Pine plank | Pine tone | yes |
| `item_cedar_plank.png` | Cedar plank | Cedar tone | yes |
| `item_birch_plank.png` | Birch plank | Birch tone | yes |
| `item_oak_plank.png` | Oak plank | Oak tone | yes |
| `item_ash_plank.png` | Ash plank | Ash tone | yes |
| `item_hickory_plank.png` | Hickory plank | Hickory tone | yes |

### Batch I4 — Planks B (6) — palette: wood tones

| filename | what it is | style hint | transparent |
|---|---|---|---|
| `item_maple_plank.png` | Maple plank | Maple tone | yes |
| `item_walnut_plank.png` | Walnut plank | Walnut tone | yes |
| `item_yew_plank.png` | Yew plank | Yew tone | yes |
| `item_teak_plank.png` | Teak plank | Teak tone | yes |
| `item_ebony_plank.png` | Ebony plank | Ebony tone | yes |
| `item_lignum_vitae_plank.png` | Lignum Vitae plank | Lignum Vitae tone | yes |

### Batch I5 — Copper gear (15) — palette: Copper metal + wood haft

| filename | what it is | style hint | transparent |
|---|---|---|---|
| `item_copper_pickaxe.png` | Copper pickaxe | Copper head, wood haft | yes |
| `item_copper_axe.png` | Copper axe | Copper head, wood haft | yes |
| `item_copper_shovel.png` | Copper shovel | Copper head, wood haft | yes |
| `item_copper_hoe.png` | Copper hoe | Copper head, wood haft | yes |
| `item_copper_chisel.png` | Copper chisel | Copper head, wood haft | yes |
| `item_copper_hammer.png` | Copper hammer | Copper head, wood haft | yes |
| `item_copper_sword.png` | Copper sword | Copper blade | yes |
| `item_copper_dagger.png` | Copper dagger | Copper blade | yes |
| `item_copper_battleaxe.png` | Copper battleaxe | Copper blade | yes |
| `item_copper_spear.png` | Copper spear | Copper blade | yes |
| `item_copper_helmet.png` | Copper helmet | Copper plate | yes |
| `item_copper_chestplate.png` | Copper chestplate | Copper plate | yes |
| `item_copper_leggings.png` | Copper leggings | Copper plate | yes |
| `item_copper_boots.png` | Copper boots | Copper plate | yes |
| `item_copper_shield.png` | Copper shield | Copper plate | yes |

### Batch I5 — Bronze gear (15) — palette: Bronze metal + wood haft

| filename | what it is | style hint | transparent |
|---|---|---|---|
| `item_bronze_pickaxe.png` | Bronze pickaxe | Bronze head, wood haft | yes |
| `item_bronze_axe.png` | Bronze axe | Bronze head, wood haft | yes |
| `item_bronze_shovel.png` | Bronze shovel | Bronze head, wood haft | yes |
| `item_bronze_hoe.png` | Bronze hoe | Bronze head, wood haft | yes |
| `item_bronze_chisel.png` | Bronze chisel | Bronze head, wood haft | yes |
| `item_bronze_hammer.png` | Bronze hammer | Bronze head, wood haft | yes |
| `item_bronze_sword.png` | Bronze sword | Bronze blade | yes |
| `item_bronze_dagger.png` | Bronze dagger | Bronze blade | yes |
| `item_bronze_battleaxe.png` | Bronze battleaxe | Bronze blade | yes |
| `item_bronze_spear.png` | Bronze spear | Bronze blade | yes |
| `item_bronze_helmet.png` | Bronze helmet | Bronze plate | yes |
| `item_bronze_chestplate.png` | Bronze chestplate | Bronze plate | yes |
| `item_bronze_leggings.png` | Bronze leggings | Bronze plate | yes |
| `item_bronze_boots.png` | Bronze boots | Bronze plate | yes |
| `item_bronze_shield.png` | Bronze shield | Bronze plate | yes |

### Batch I5 — Iron gear (15) — palette: Iron metal + wood haft

| filename | what it is | style hint | transparent |
|---|---|---|---|
| `item_iron_pickaxe.png` | Iron pickaxe | Iron head, wood haft | yes |
| `item_iron_axe.png` | Iron axe | Iron head, wood haft | yes |
| `item_iron_shovel.png` | Iron shovel | Iron head, wood haft | yes |
| `item_iron_hoe.png` | Iron hoe | Iron head, wood haft | yes |
| `item_iron_chisel.png` | Iron chisel | Iron head, wood haft | yes |
| `item_iron_hammer.png` | Iron hammer | Iron head, wood haft | yes |
| `item_iron_sword.png` | Iron sword | Iron blade | yes |
| `item_iron_dagger.png` | Iron dagger | Iron blade | yes |
| `item_iron_battleaxe.png` | Iron battleaxe | Iron blade | yes |
| `item_iron_spear.png` | Iron spear | Iron blade | yes |
| `item_iron_helmet.png` | Iron helmet | Iron plate | yes |
| `item_iron_chestplate.png` | Iron chestplate | Iron plate | yes |
| `item_iron_leggings.png` | Iron leggings | Iron plate | yes |
| `item_iron_boots.png` | Iron boots | Iron plate | yes |
| `item_iron_shield.png` | Iron shield | Iron plate | yes |

### Batch I5 — Steel gear (15) — palette: Steel metal + wood haft

| filename | what it is | style hint | transparent |
|---|---|---|---|
| `item_steel_pickaxe.png` | Steel pickaxe | Steel head, wood haft | yes |
| `item_steel_axe.png` | Steel axe | Steel head, wood haft | yes |
| `item_steel_shovel.png` | Steel shovel | Steel head, wood haft | yes |
| `item_steel_hoe.png` | Steel hoe | Steel head, wood haft | yes |
| `item_steel_chisel.png` | Steel chisel | Steel head, wood haft | yes |
| `item_steel_hammer.png` | Steel hammer | Steel head, wood haft | yes |
| `item_steel_sword.png` | Steel sword | Steel blade | yes |
| `item_steel_dagger.png` | Steel dagger | Steel blade | yes |
| `item_steel_battleaxe.png` | Steel battleaxe | Steel blade | yes |
| `item_steel_spear.png` | Steel spear | Steel blade | yes |
| `item_steel_helmet.png` | Steel helmet | Steel plate | yes |
| `item_steel_chestplate.png` | Steel chestplate | Steel plate | yes |
| `item_steel_leggings.png` | Steel leggings | Steel plate | yes |
| `item_steel_boots.png` | Steel boots | Steel plate | yes |
| `item_steel_shield.png` | Steel shield | Steel plate | yes |

### Batch I5 — Damascus Steel gear (15) — palette: Damascus Steel metal + wood haft

| filename | what it is | style hint | transparent |
|---|---|---|---|
| `item_damascus_pickaxe.png` | Damascus Steel pickaxe | Damascus Steel head, wood haft | yes |
| `item_damascus_axe.png` | Damascus Steel axe | Damascus Steel head, wood haft | yes |
| `item_damascus_shovel.png` | Damascus Steel shovel | Damascus Steel head, wood haft | yes |
| `item_damascus_hoe.png` | Damascus Steel hoe | Damascus Steel head, wood haft | yes |
| `item_damascus_chisel.png` | Damascus Steel chisel | Damascus Steel head, wood haft | yes |
| `item_damascus_hammer.png` | Damascus Steel hammer | Damascus Steel head, wood haft | yes |
| `item_damascus_sword.png` | Damascus Steel sword | Damascus Steel blade | yes |
| `item_damascus_dagger.png` | Damascus Steel dagger | Damascus Steel blade | yes |
| `item_damascus_battleaxe.png` | Damascus Steel battleaxe | Damascus Steel blade | yes |
| `item_damascus_spear.png` | Damascus Steel spear | Damascus Steel blade | yes |
| `item_damascus_helmet.png` | Damascus Steel helmet | Damascus Steel plate | yes |
| `item_damascus_chestplate.png` | Damascus Steel chestplate | Damascus Steel plate | yes |
| `item_damascus_leggings.png` | Damascus Steel leggings | Damascus Steel plate | yes |
| `item_damascus_boots.png` | Damascus Steel boots | Damascus Steel plate | yes |
| `item_damascus_shield.png` | Damascus Steel shield | Damascus Steel plate | yes |

### Batch I5 — Meteoric Iron gear (15) — palette: Meteoric Iron metal + wood haft

| filename | what it is | style hint | transparent |
|---|---|---|---|
| `item_meteoric_pickaxe.png` | Meteoric Iron pickaxe | Meteoric Iron head, wood haft | yes |
| `item_meteoric_axe.png` | Meteoric Iron axe | Meteoric Iron head, wood haft | yes |
| `item_meteoric_shovel.png` | Meteoric Iron shovel | Meteoric Iron head, wood haft | yes |
| `item_meteoric_hoe.png` | Meteoric Iron hoe | Meteoric Iron head, wood haft | yes |
| `item_meteoric_chisel.png` | Meteoric Iron chisel | Meteoric Iron head, wood haft | yes |
| `item_meteoric_hammer.png` | Meteoric Iron hammer | Meteoric Iron head, wood haft | yes |
| `item_meteoric_sword.png` | Meteoric Iron sword | Meteoric Iron blade | yes |
| `item_meteoric_dagger.png` | Meteoric Iron dagger | Meteoric Iron blade | yes |
| `item_meteoric_battleaxe.png` | Meteoric Iron battleaxe | Meteoric Iron blade | yes |
| `item_meteoric_spear.png` | Meteoric Iron spear | Meteoric Iron blade | yes |
| `item_meteoric_helmet.png` | Meteoric Iron helmet | Meteoric Iron plate | yes |
| `item_meteoric_chestplate.png` | Meteoric Iron chestplate | Meteoric Iron plate | yes |
| `item_meteoric_leggings.png` | Meteoric Iron leggings | Meteoric Iron plate | yes |
| `item_meteoric_boots.png` | Meteoric Iron boots | Meteoric Iron plate | yes |
| `item_meteoric_shield.png` | Meteoric Iron shield | Meteoric Iron plate | yes |

### Batch I6 — Bows & ammo (12) — palette: wood + cream string

| filename | what it is | style hint | transparent |
|---|---|---|---|
| `item_ash_shortbow.png` | ash shortbow | curved stave + string | yes |
| `item_ash_longbow.png` | ash longbow | tall stave + string | yes |
| `item_hickory_shortbow.png` | hickory shortbow | curved stave + string | yes |
| `item_hickory_longbow.png` | hickory longbow | tall stave + string | yes |
| `item_yew_shortbow.png` | yew shortbow | curved stave + string | yes |
| `item_yew_longbow.png` | yew longbow | tall stave + string | yes |
| `item_oak_shortbow.png` | oak shortbow | curved stave + string | yes |
| `item_oak_longbow.png` | oak longbow | tall stave + string | yes |
| `item_lignum_vitae_shortbow.png` | lignum_vitae shortbow | curved stave + string | yes |
| `item_lignum_vitae_longbow.png` | lignum_vitae longbow | tall stave + string | yes |
| `item_arrow.png` | arrows (fan of 3) | shaft + metal tip | yes |
| `item_bolt.png` | crossbow bolts | stubby quarrels | yes |

### Batch I7 — Firearms (7) — palette: dark steel + walnut, brass fittings

| filename | what it is | style hint | transparent |
|---|---|---|---|
| `item_hand_cannon.png` | Hand Cannon | iron barrel + walnut stock | yes |
| `item_flintlock_pistol.png` | Flintlock Pistol | steel barrel + walnut stock | yes |
| `item_matchlock_musket.png` | Matchlock Musket | steel barrel + walnut stock | yes |
| `item_blunderbuss.png` | Blunderbuss | damascus barrel + walnut stock | yes |
| `item_lead_ball.png` | Lead Ball | grey lead | yes |
| `item_lead_shot.png` | Lead Shot | grey lead | yes |
| `item_gunpowder.png` | gunpowder | dark grainy powder in a horn/pouch | yes |

### Batch I8 — Jewelry (18) — palette: silver cool / gold warm / brass / platinum / electrum / pewter

| filename | what it is | style hint | transparent |
|---|---|---|---|
| `item_silver_ring.png` | Silver ring | Silver band/setting; empty socket | yes |
| `item_silver_necklace.png` | Silver necklace | Silver band/setting; empty socket | yes |
| `item_silver_amulet.png` | Silver amulet | Silver band/setting; empty socket | yes |
| `item_gold_ring.png` | Gold ring | Gold band/setting; empty socket | yes |
| `item_gold_necklace.png` | Gold necklace | Gold band/setting; empty socket | yes |
| `item_gold_amulet.png` | Gold amulet | Gold band/setting; empty socket | yes |
| `item_platinum_ring.png` | Platinum ring | Platinum band/setting; empty socket | yes |
| `item_platinum_necklace.png` | Platinum necklace | Platinum band/setting; empty socket | yes |
| `item_platinum_amulet.png` | Platinum amulet | Platinum band/setting; empty socket | yes |
| `item_brass_ring.png` | Brass ring | Brass band/setting; empty socket | yes |
| `item_brass_necklace.png` | Brass necklace | Brass band/setting; empty socket | yes |
| `item_brass_amulet.png` | Brass amulet | Brass band/setting; empty socket | yes |
| `item_electrum_ring.png` | Electrum ring | Electrum band/setting; empty socket | yes |
| `item_electrum_necklace.png` | Electrum necklace | Electrum band/setting; empty socket | yes |
| `item_electrum_amulet.png` | Electrum amulet | Electrum band/setting; empty socket | yes |
| `item_pewter_ring.png` | Pewter ring | Pewter band/setting; empty socket | yes |
| `item_pewter_necklace.png` | Pewter necklace | Pewter band/setting; empty socket | yes |
| `item_pewter_amulet.png` | Pewter amulet | Pewter band/setting; empty socket | yes |

## Building blocks — colours & natural stone (added later)

These cover the wool/concrete/terracotta/glass colour families and the natural
stone + refined-metal blocks. They currently render from **procedural tiles**, so
authoring these PNGs replaces the placeholders. (The tree **leaves** in batches
B3–B5 are also procedural right now — create those PNGs to replace them too.)
Shape variants — slabs, stairs, walls, fences, gates, panes, carpets — reuse
their base material's tile, so they need **no** extra art.

### Batch C1 — Wool (16) — palette: the 16 dye colours, soft woven fabric

| filename | what it is | style hint | transparent |
|---|---|---|---|
| `block_white_wool.png` | White wool — woven fabric | flat dye colour, faint weave, matte | no |
| `block_orange_wool.png` | Orange wool — woven fabric | flat dye colour, faint weave, matte | no |
| `block_magenta_wool.png` | Magenta wool — woven fabric | flat dye colour, faint weave, matte | no |
| `block_light_blue_wool.png` | Light Blue wool — woven fabric | flat dye colour, faint weave, matte | no |
| `block_yellow_wool.png` | Yellow wool — woven fabric | flat dye colour, faint weave, matte | no |
| `block_lime_wool.png` | Lime wool — woven fabric | flat dye colour, faint weave, matte | no |
| `block_pink_wool.png` | Pink wool — woven fabric | flat dye colour, faint weave, matte | no |
| `block_gray_wool.png` | Gray wool — woven fabric | flat dye colour, faint weave, matte | no |
| `block_light_gray_wool.png` | Light Gray wool — woven fabric | flat dye colour, faint weave, matte | no |
| `block_cyan_wool.png` | Cyan wool — woven fabric | flat dye colour, faint weave, matte | no |
| `block_purple_wool.png` | Purple wool — woven fabric | flat dye colour, faint weave, matte | no |
| `block_blue_wool.png` | Blue wool — woven fabric | flat dye colour, faint weave, matte | no |
| `block_brown_wool.png` | Brown wool — woven fabric | flat dye colour, faint weave, matte | no |
| `block_green_wool.png` | Green wool — woven fabric | flat dye colour, faint weave, matte | no |
| `block_red_wool.png` | Red wool — woven fabric | flat dye colour, faint weave, matte | no |
| `block_black_wool.png` | Black wool — woven fabric | flat dye colour, faint weave, matte | no |

### Batch C2 — Concrete (16) — palette: the 16 dye colours, flat solid

| filename | what it is | style hint | transparent |
|---|---|---|---|
| `block_white_concrete.png` | White concrete — smooth solid | flat saturated colour, almost no grain | no |
| `block_orange_concrete.png` | Orange concrete — smooth solid | flat saturated colour, almost no grain | no |
| `block_magenta_concrete.png` | Magenta concrete — smooth solid | flat saturated colour, almost no grain | no |
| `block_light_blue_concrete.png` | Light Blue concrete — smooth solid | flat saturated colour, almost no grain | no |
| `block_yellow_concrete.png` | Yellow concrete — smooth solid | flat saturated colour, almost no grain | no |
| `block_lime_concrete.png` | Lime concrete — smooth solid | flat saturated colour, almost no grain | no |
| `block_pink_concrete.png` | Pink concrete — smooth solid | flat saturated colour, almost no grain | no |
| `block_gray_concrete.png` | Gray concrete — smooth solid | flat saturated colour, almost no grain | no |
| `block_light_gray_concrete.png` | Light Gray concrete — smooth solid | flat saturated colour, almost no grain | no |
| `block_cyan_concrete.png` | Cyan concrete — smooth solid | flat saturated colour, almost no grain | no |
| `block_purple_concrete.png` | Purple concrete — smooth solid | flat saturated colour, almost no grain | no |
| `block_blue_concrete.png` | Blue concrete — smooth solid | flat saturated colour, almost no grain | no |
| `block_brown_concrete.png` | Brown concrete — smooth solid | flat saturated colour, almost no grain | no |
| `block_green_concrete.png` | Green concrete — smooth solid | flat saturated colour, almost no grain | no |
| `block_red_concrete.png` | Red concrete — smooth solid | flat saturated colour, almost no grain | no |
| `block_black_concrete.png` | Black concrete — smooth solid | flat saturated colour, almost no grain | no |

### Batch C3 — Concrete Powder (16) — palette: the 16 dye colours, granular

| filename | what it is | style hint | transparent |
|---|---|---|---|
| `block_white_concrete_powder.png` | White concrete powder — loose grains | sandy granular version of the colour | no |
| `block_orange_concrete_powder.png` | Orange concrete powder — loose grains | sandy granular version of the colour | no |
| `block_magenta_concrete_powder.png` | Magenta concrete powder — loose grains | sandy granular version of the colour | no |
| `block_light_blue_concrete_powder.png` | Light Blue concrete powder — loose grains | sandy granular version of the colour | no |
| `block_yellow_concrete_powder.png` | Yellow concrete powder — loose grains | sandy granular version of the colour | no |
| `block_lime_concrete_powder.png` | Lime concrete powder — loose grains | sandy granular version of the colour | no |
| `block_pink_concrete_powder.png` | Pink concrete powder — loose grains | sandy granular version of the colour | no |
| `block_gray_concrete_powder.png` | Gray concrete powder — loose grains | sandy granular version of the colour | no |
| `block_light_gray_concrete_powder.png` | Light Gray concrete powder — loose grains | sandy granular version of the colour | no |
| `block_cyan_concrete_powder.png` | Cyan concrete powder — loose grains | sandy granular version of the colour | no |
| `block_purple_concrete_powder.png` | Purple concrete powder — loose grains | sandy granular version of the colour | no |
| `block_blue_concrete_powder.png` | Blue concrete powder — loose grains | sandy granular version of the colour | no |
| `block_brown_concrete_powder.png` | Brown concrete powder — loose grains | sandy granular version of the colour | no |
| `block_green_concrete_powder.png` | Green concrete powder — loose grains | sandy granular version of the colour | no |
| `block_red_concrete_powder.png` | Red concrete powder — loose grains | sandy granular version of the colour | no |
| `block_black_concrete_powder.png` | Black concrete powder — loose grains | sandy granular version of the colour | no |

### Batch C4 — Terracotta (16) — palette: dye colour muted toward fired clay

| filename | what it is | style hint | transparent |
|---|---|---|---|
| `block_white_terracotta.png` | White terracotta — fired clay | earthy, desaturated, faint horizontal banding | no |
| `block_orange_terracotta.png` | Orange terracotta — fired clay | earthy, desaturated, faint horizontal banding | no |
| `block_magenta_terracotta.png` | Magenta terracotta — fired clay | earthy, desaturated, faint horizontal banding | no |
| `block_light_blue_terracotta.png` | Light Blue terracotta — fired clay | earthy, desaturated, faint horizontal banding | no |
| `block_yellow_terracotta.png` | Yellow terracotta — fired clay | earthy, desaturated, faint horizontal banding | no |
| `block_lime_terracotta.png` | Lime terracotta — fired clay | earthy, desaturated, faint horizontal banding | no |
| `block_pink_terracotta.png` | Pink terracotta — fired clay | earthy, desaturated, faint horizontal banding | no |
| `block_gray_terracotta.png` | Gray terracotta — fired clay | earthy, desaturated, faint horizontal banding | no |
| `block_light_gray_terracotta.png` | Light Gray terracotta — fired clay | earthy, desaturated, faint horizontal banding | no |
| `block_cyan_terracotta.png` | Cyan terracotta — fired clay | earthy, desaturated, faint horizontal banding | no |
| `block_purple_terracotta.png` | Purple terracotta — fired clay | earthy, desaturated, faint horizontal banding | no |
| `block_blue_terracotta.png` | Blue terracotta — fired clay | earthy, desaturated, faint horizontal banding | no |
| `block_brown_terracotta.png` | Brown terracotta — fired clay | earthy, desaturated, faint horizontal banding | no |
| `block_green_terracotta.png` | Green terracotta — fired clay | earthy, desaturated, faint horizontal banding | no |
| `block_red_terracotta.png` | Red terracotta — fired clay | earthy, desaturated, faint horizontal banding | no |
| `block_black_terracotta.png` | Black terracotta — fired clay | earthy, desaturated, faint horizontal banding | no |

### Batch C5 — Glazed Terracotta (16) — palette: brighter dye colour + geometric accent

| filename | what it is | style hint | transparent |
|---|---|---|---|
| `block_white_glazed_terracotta.png` | White glazed terracotta — patterned tile | glossy, a symmetric diagonal motif that tiles | no |
| `block_orange_glazed_terracotta.png` | Orange glazed terracotta — patterned tile | glossy, a symmetric diagonal motif that tiles | no |
| `block_magenta_glazed_terracotta.png` | Magenta glazed terracotta — patterned tile | glossy, a symmetric diagonal motif that tiles | no |
| `block_light_blue_glazed_terracotta.png` | Light Blue glazed terracotta — patterned tile | glossy, a symmetric diagonal motif that tiles | no |
| `block_yellow_glazed_terracotta.png` | Yellow glazed terracotta — patterned tile | glossy, a symmetric diagonal motif that tiles | no |
| `block_lime_glazed_terracotta.png` | Lime glazed terracotta — patterned tile | glossy, a symmetric diagonal motif that tiles | no |
| `block_pink_glazed_terracotta.png` | Pink glazed terracotta — patterned tile | glossy, a symmetric diagonal motif that tiles | no |
| `block_gray_glazed_terracotta.png` | Gray glazed terracotta — patterned tile | glossy, a symmetric diagonal motif that tiles | no |
| `block_light_gray_glazed_terracotta.png` | Light Gray glazed terracotta — patterned tile | glossy, a symmetric diagonal motif that tiles | no |
| `block_cyan_glazed_terracotta.png` | Cyan glazed terracotta — patterned tile | glossy, a symmetric diagonal motif that tiles | no |
| `block_purple_glazed_terracotta.png` | Purple glazed terracotta — patterned tile | glossy, a symmetric diagonal motif that tiles | no |
| `block_blue_glazed_terracotta.png` | Blue glazed terracotta — patterned tile | glossy, a symmetric diagonal motif that tiles | no |
| `block_brown_glazed_terracotta.png` | Brown glazed terracotta — patterned tile | glossy, a symmetric diagonal motif that tiles | no |
| `block_green_glazed_terracotta.png` | Green glazed terracotta — patterned tile | glossy, a symmetric diagonal motif that tiles | no |
| `block_red_glazed_terracotta.png` | Red glazed terracotta — patterned tile | glossy, a symmetric diagonal motif that tiles | no |
| `block_black_glazed_terracotta.png` | Black glazed terracotta — patterned tile | glossy, a symmetric diagonal motif that tiles | no |

### Batch C6 — Stained Glass (16) — palette: translucent dye colour + frame (TRANSPARENT)

| filename | what it is | style hint | transparent |
|---|---|---|---|
| `block_white_stained_glass.png` | White stained glass | translucent colour wash, darker 1px frame, small highlight | yes |
| `block_orange_stained_glass.png` | Orange stained glass | translucent colour wash, darker 1px frame, small highlight | yes |
| `block_magenta_stained_glass.png` | Magenta stained glass | translucent colour wash, darker 1px frame, small highlight | yes |
| `block_light_blue_stained_glass.png` | Light Blue stained glass | translucent colour wash, darker 1px frame, small highlight | yes |
| `block_yellow_stained_glass.png` | Yellow stained glass | translucent colour wash, darker 1px frame, small highlight | yes |
| `block_lime_stained_glass.png` | Lime stained glass | translucent colour wash, darker 1px frame, small highlight | yes |
| `block_pink_stained_glass.png` | Pink stained glass | translucent colour wash, darker 1px frame, small highlight | yes |
| `block_gray_stained_glass.png` | Gray stained glass | translucent colour wash, darker 1px frame, small highlight | yes |
| `block_light_gray_stained_glass.png` | Light Gray stained glass | translucent colour wash, darker 1px frame, small highlight | yes |
| `block_cyan_stained_glass.png` | Cyan stained glass | translucent colour wash, darker 1px frame, small highlight | yes |
| `block_purple_stained_glass.png` | Purple stained glass | translucent colour wash, darker 1px frame, small highlight | yes |
| `block_blue_stained_glass.png` | Blue stained glass | translucent colour wash, darker 1px frame, small highlight | yes |
| `block_brown_stained_glass.png` | Brown stained glass | translucent colour wash, darker 1px frame, small highlight | yes |
| `block_green_stained_glass.png` | Green stained glass | translucent colour wash, darker 1px frame, small highlight | yes |
| `block_red_stained_glass.png` | Red stained glass | translucent colour wash, darker 1px frame, small highlight | yes |
| `block_black_stained_glass.png` | Black stained glass | translucent colour wash, darker 1px frame, small highlight | yes |

(Plain, uncoloured **`block_terracotta.png`** — earthy orange fired clay — also needed.)

### Batch N1 — Natural stone + refined metal (12) — palette: real rock + metal hues

| filename | what it is | style hint | transparent |
|---|---|---|---|
| `block_granite.png` | Granite — pink-grey speckled stone | feldspar speckle, warm grey-pink | no |
| `block_andesite.png` | Andesite — mottled mid-grey stone | neutral grey, subtle speckle | no |
| `block_marble.png` | Marble — near-white with faint veins | off-white, thin grey veining | no |
| `block_deepslate.png` | Deepslate — dark charcoal deep rock | near-black grey, fine horizontal banding | no |
| `block_sandstone.png` | Sandstone side — layered tan | tan with horizontal strata bands | no |
| `block_sandstone_top.png` | Sandstone top/bottom — smooth tan | even tan, faint grain (cap face) | no |
| `block_brick.png` | Bricks — fired red-clay courses | red bricks, pale mortar, running bond | no |
| `block_copper_block.png` | Copper block — polished copper | warm orange metal, faint sheen | no |
| `block_copper_weathered.png` | Weathered copper — green patina | verdigris green with copper flecks | no |
| `block_iron_block.png` | Iron block — brushed steel | light cool grey, faint vertical brushing | no |
| `block_gold_block.png` | Gold block — bright gold | warm yellow metal, soft highlights | no |
| `block_mossy_cobblestone.png` | Mossy cobblestone — cobble with green moss | grey cobble base, green moss clumps in the crevices | no |
| `block_mossy_stone_bricks.png` | Mossy stone bricks — brick with green moss | grey stone-brick base, green moss patches | no |

(Plain **`block_cobblestone.png`** — grey broken stone — is already listed in Batch B1.)

Shape variants (slabs, stairs, walls, fences, gates, panes, carpets) **reuse the base material tile above** — no extra art needed.

### Batch T1 — Decorative town blocks (11) — palette: garden blooms + weathered metal + oak

These render from **procedural tiles** today; authoring the PNGs replaces the
placeholders. The seven flowers and the ladder are **transparent cross cutouts**
(the sprite floats on a clear background); iron bars and chain are **transparent
panes**; the sign face is an **opaque** tile. Trapdoor and button reuse
`block_planks.png`, and the flower pot reuses `block_terracotta.png`, so those
three need **no** extra art.

| filename | what it is | style hint | transparent |
|---|---|---|---|
| `block_allium.png` | Allium — round purple pom-pom bloom on a green stalk | single tall flower, cross cutout | yes |
| `block_orange_tulip.png` | Orange tulip — cupped orange bloom on a green stalk | single tall flower, cross cutout | yes |
| `block_pink_tulip.png` | Pink tulip — cupped pink bloom on a green stalk | single tall flower, cross cutout | yes |
| `block_white_tulip.png` | White tulip — cupped white bloom on a green stalk | single tall flower, cross cutout | yes |
| `block_oxeye_daisy.png` | Oxeye daisy — white petals around a yellow disc | single flower, cross cutout | yes |
| `block_blue_orchid.png` | Blue orchid — blue bloom with a yellow throat | single flower, cross cutout | yes |
| `block_rose_bush.png` | Rose bush — leafy green bush with two red rose blooms | bushy two-bloom flower, cross cutout | yes |
| `block_iron_bars.png` | Iron bars — vertical grey metal bars + top/bottom rails | brushed grey iron grille, tiles horizontally | yes |
| `block_chain.png` | Chain — dark interlocking metal links down the centre | narrow vertical chain, dark steel | yes |
| `block_ladder.png` | Ladder — two wooden rails with horizontal rungs | oak rungs, cross cutout | yes |
| `block_sign.png` | Sign — oak plank board (lighter face across the top half) | worked oak, faint engraving band | no |

### Batch T2 — Decorative town blocks, wave 2 (31) — palette: worked wood + dark iron + gold + nether teal/red

These render from **procedural tiles** today; authoring the PNGs replaces the
placeholders. Multi-face cubes list one row per face (`_top` / `_side` / `_front`).
The four plant decals (`glow_lichen`, `warped_roots`, `cobweb`, `sea_pickle`) are
**transparent cross cutouts**; `nether_portal` is a **translucent** swirl tile;
every other tile is an **opaque** full-cube / slab / carpet face.

| filename | what it is | style hint | transparent |
|---|---|---|---|
| `block_note_block.png` | Note block side — dark wood with a musical note | dark plank face, pale note glyph | no |
| `block_note_block_top.png` | Note block top — plain dark wood | dark plank grain, no focal point | no |
| `block_beehive.png` | Beehive side — planks with a hive slit + honey | worked wood, dark central band, amber drips | no |
| `block_beehive_top.png` | Beehive top — planks with a honeycomb patch | worked wood, amber hex centre | no |
| `block_bee_nest.png` | Bee nest side — log bark with a nest hole + honey | rough bark, dark hole, amber flecks | no |
| `block_bee_nest_top.png` | Bee nest top — log end grain | concentric wood rings | no |
| `block_ender_chest_front.png` | Ender chest front — dark obsidian-teal chest face | near-black teal wood, glowing teal latch | no |
| `block_ender_chest_side.png` | Ender chest side — dark obsidian-teal chest side | near-black teal, banded frame | no |
| `block_ender_chest_top.png` | Ender chest top — dark obsidian-teal lid | near-black teal, teal glint | no |
| `block_lodestone.png` | Lodestone side — pale chiselled stone | light grey stone, faint vertical chisel | no |
| `block_lodestone_top.png` | Lodestone top — compass rune | pale stone, dark compass ring + red/blue needle | no |
| `block_cauldron.png` | Cauldron side — dark iron pot with legs | charcoal iron, rim band, stubby legs | no |
| `block_cauldron_top.png` | Cauldron top — hollow iron rim with water | iron rim, dark hollow, shallow blue water | no |
| `block_hopper.png` | Hopper side — dark metal funnel wall | charcoal metal, central spout | no |
| `block_hopper_top.png` | Hopper top — wide funnel opening | charcoal metal rim, dark hole | no |
| `block_bell.png` | Bell — gold bell with a crown loop | warm gold metal, dark mouth band | no |
| `block_lectern.png` | Lectern side — wood podium stem | worked oak, shaded vertical stem | no |
| `block_lectern_top.png` | Lectern top — open book on a slanted rest | oak rest, cream open book with text lines | no |
| `block_warped_nylium.png` | Warped nylium top — teal fungus crust | vivid teal speckle over dark base | no |
| `block_warped_nylium_side.png` | Warped nylium side — teal fringe over netherrack | dark red rock, teal fungus creeping from the top | no |
| `block_netherrack.png` | Netherrack — dark red nether rock (nylium underside) | dull blood-red rock, darker mottling | no |
| `block_suspicious_gravel.png` | Suspicious gravel — cracked gravel with a buried glint | loose grey pebbles, brushed cracks, faint gold speck | no |
| `block_rail.png` | Rail — flat track (two steel rails on wooden ties) | brown ties, twin steel rails, top-down | no |
| `block_daylight_detector_top.png` | Daylight detector top — glassy blue panel + sun disc | translucent blue glass, yellow sun | no |
| `block_daylight_detector_side.png` | Daylight detector side — dark wood base, blue top edge | dark wood, thin blue glass edge | no |
| `block_glow_lichen.png` | Glow lichen — teal glowing speckle patch | scattered teal glow dots, cross cutout | yes |
| `block_warped_roots.png` | Warped roots — teal fungal roots with glow tips | wispy teal roots, bright tips, cross cutout | yes |
| `block_cobweb.png` | Cobweb — white radial spider web | pale radial threads + rings, cross cutout | yes |
| `block_sea_pickle.png` | Sea pickle — small green nubs with glow tips | short green nubs, bright glow caps, cross cutout | yes |
| `block_nether_portal.png` | Nether portal — swirly translucent purple | translucent purple swirl, glowing | yes |
| `block_scaffolding.png` | Scaffolding — tan bamboo frame | pale bamboo, node rings + vertical seams | no |

### Batch I9 — Dyes (16) — palette: the 16 dye colours, small pigment

| filename | what it is | style hint | transparent |
|---|---|---|---|
| `item_white_dye.png` | White dye — pigment | small pile/drop of white pigment, 1px outline | yes |
| `item_orange_dye.png` | Orange dye — pigment | small pile/drop of orange pigment, 1px outline | yes |
| `item_magenta_dye.png` | Magenta dye — pigment | small pile/drop of magenta pigment, 1px outline | yes |
| `item_light_blue_dye.png` | Light Blue dye — pigment | small pile/drop of light blue pigment, 1px outline | yes |
| `item_yellow_dye.png` | Yellow dye — pigment | small pile/drop of yellow pigment, 1px outline | yes |
| `item_lime_dye.png` | Lime dye — pigment | small pile/drop of lime pigment, 1px outline | yes |
| `item_pink_dye.png` | Pink dye — pigment | small pile/drop of pink pigment, 1px outline | yes |
| `item_gray_dye.png` | Gray dye — pigment | small pile/drop of gray pigment, 1px outline | yes |
| `item_light_gray_dye.png` | Light Gray dye — pigment | small pile/drop of light gray pigment, 1px outline | yes |
| `item_cyan_dye.png` | Cyan dye — pigment | small pile/drop of cyan pigment, 1px outline | yes |
| `item_purple_dye.png` | Purple dye — pigment | small pile/drop of purple pigment, 1px outline | yes |
| `item_blue_dye.png` | Blue dye — pigment | small pile/drop of blue pigment, 1px outline | yes |
| `item_brown_dye.png` | Brown dye — pigment | small pile/drop of brown pigment, 1px outline | yes |
| `item_green_dye.png` | Green dye — pigment | small pile/drop of green pigment, 1px outline | yes |
| `item_red_dye.png` | Red dye — pigment | small pile/drop of red pigment, 1px outline | yes |
| `item_black_dye.png` | Black dye — pigment | small pile/drop of black pigment, 1px outline | yes |

(Every new building block — colours, natural stone, shapes — is a placeable item that renders its **block tile** as its icon, so no separate item art is needed for those.)

## ✅ Fully hand-arted — this batch is DONE

> **Status:** every tile/icon/skin below has been image-gen'd and imported. The
> engine now reports **0 tiles on procedural fallback** — the whole game renders
> real art, including the player's worn armour. Kept here as the reference for
> what each file is.

Originally these rendered from the **procedural atlas** (no hand PNG) — the
*complete* set left to image-gen so the whole game is real art, nothing already
covered. Tiles/icons are **32×32**. Item icons want a **transparent background + 1px
outline** (same as the dye icons). Leaves, glass, and the torch post are transparent;
other block tiles are opaque full-cube faces. Filenames are load-bearing:
`block_<name>.png`, `item_<id>.png`, and now `skin_<name>.png` for body materials
(`tools/gen-texpack.mjs` picks up all three prefixes automatically).

**Three groups, all still procedural:** 56 world/material block tiles (R1–R6),
11 body-material skin tiles (S1), and 80 item icons (R7–R12). The player-worn gear
that renders armour + weapons *on the character* (full body-wrap skins + held-weapon
art) is specified in its own section at the end.

### Batch R1 — Leaves & needles (15) — transparent cutout foliage

| filename | what it is | style hint | transparent |
|---|---|---|---|
| `block_oak_leaves.png` | Oak leaves | dense classic green, small sky gaps | yes |
| `block_birch_leaves.png` | Birch leaves | lighter yellow-green, airy | yes |
| `block_pine_leaves.png` | Pine needles | dark blue-green needle clusters | yes |
| `block_maple_leaves.png` | Maple leaves | rich green lobed leaves | yes |
| `block_ash_leaves.png` | Ash leaves | medium green compound leaflets | yes |
| `block_cedar_leaves.png` | Cedar sprays | dark green flat sprays | yes |
| `block_ebony_leaves.png` | Ebony leaves | very dark near-black green | yes |
| `block_hickory_leaves.png` | Hickory leaves | yellow-green, broad | yes |
| `block_walnut_leaves.png` | Walnut leaves | deep green, long leaflets | yes |
| `block_teak_leaves.png` | Teak leaves | broad tropical green | yes |
| `block_yew_leaves.png` | Yew needles | dark evergreen flat needles | yes |
| `block_lignum_vitae_leaves.png` | Lignum vitae leaves | glossy dark tropical green | yes |
| `block_silverbark_leaves.png` | Silverbark leaves (fantasy) | pale silvery-green, faint shimmer | yes |
| `block_fernwood_leaves.png` | Fernwood fronds (fantasy) | feathery fern-like green fronds | yes |
| `block_emberpine_needles.png` | Emberpine needles (fantasy) | dark needles glowing ember-orange | yes |

### Batch R2 — Fantasy bark & log rings (6)

| filename | what it is | style hint | transparent |
|---|---|---|---|
| `block_silverbark_bark.png` | Silverbark bark | smooth silvery-white bark, dark lenticels | no |
| `block_silverbark_ring.png` | Silverbark log end | pale silvery cross-section rings | no |
| `block_fernwood_bark.png` | Fernwood bark | greenish-brown fibrous bark | no |
| `block_fernwood_ring.png` | Fernwood log end | green-tinged cross-section rings | no |
| `block_emberpine_bark.png` | Emberpine bark | charcoal bark veined with glowing ember cracks | no |
| `block_emberpine_ring.png` | Emberpine log end | dark rings with ember-glow core | no |

### Batch R3 — Crafting-station faces (5)

| filename | what it is | style hint | transparent |
|---|---|---|---|
| `block_workbench_top.png` | Workbench top | wooden table top, saw marks + tool grooves | no |
| `block_construction_top.png` | Construction bench top | sturdy carpentry top, plans + nails | no |
| `block_alchemy_top.png` | Alchemy table top | stained wood, runes + small bottles | no |
| `block_altar_top.png` | Altar top | carved stone, rune circle / offering bowl | no |
| `block_altar_side.png` | Altar side | carved stone side, glyph band | no |

### Batch R4 — Terrain & stone (9)

| filename | what it is | style hint | transparent |
|---|---|---|---|
| `block_basalt.png` | Basalt | dark grey columnar rock, vertical striations | no |
| `block_ashen_soil.png` | Ashen soil | grey-black ashy dirt, fine grain | no |
| `block_corrupt_soil.png` | Corrupt soil | sickly purple-black earth, dark veins | no |
| `block_rootstone.png` | Rootstone | grey stone laced with pale root tendrils | no |
| `block_depleted_rock.png` | Depleted rock | dull grey mined-out rock, empty ore pits | no |
| `block_ice.png` | Ice | pale blue translucent, cracks + sheen | no |
| `block_lava.png` | Lava | molten orange-red with dark crust cracks | no |
| `block_silvervein.png` | Silver ore | grey stone with bright silver veins | no |
| `block_emberstone_ore.png` | Emberstone ore | dark stone with glowing ember-orange chunks | no |

### Batch R5 — Plants & harvest nodes (12)

| filename | what it is | style hint | transparent |
|---|---|---|---|
| `block_berry_bush.png` | Berry bush | green bush dotted with red berries | no |
| `block_berry_bush_bare.png` | Berry bush (picked) | same bush, green leaves, no berries | no |
| `block_crop_young.png` | Wheat, stage 0 | two-pixel green sprouts, bottom fifth only | no |
| `block_wheat_1.png` … `block_wheat_6.png` | Wheat, stages 1–6 | one ladder: stalks lengthen, green drains to straw, ears from stage 5 | no |
| `block_crop_ripe.png` | Wheat, stage 7 | full-height straw stalks, heavy golden ears with awns | no |
| `block_herb_patch.png` | Herb patch | leafy green cluster with small flowers | no |
| `block_herb_patch_cut.png` | Herb patch (cut) | trimmed low stubs in soil | no |
| `block_wildflower.png` | Wildflowers | mixed colourful blooms in grass | no |
| `block_mushroom_cap.png` | Mushroom cap | large round cap, spotted | no |
| `block_cactus_flesh.png` | Cactus flesh | ridged green cactus interior | no |
| `block_reed.png` | Reed cane (middle) | jointed green canes running the full tile, no top — these stack | no |
| `block_reed_top.png` | Reed cane (crown) | the same canes ending a third down, crowned with fronds | no |
| `block_crystal_cluster.png` | Crystal cluster | translucent glowing gem crystals | no |
| `block_dig_mound.png` | Dig mound | loose dirt mound, pebbles, dig spot | no |

### Batch R6 — Building materials (9)

| filename | what it is | style hint | transparent |
|---|---|---|---|
| `block_planks.png` | Wood planks | warm brown planks, grain + seams | no |
| `block_stone_brick.png` | Stone bricks | cut grey blocks, mortar lines | no |
| `block_ruin_brick.png` | Ruined brick | cracked weathered ancient brick | no |
| `block_mossy_ruin.png` | Mossy ruin | ruined brick overgrown with green moss | no |
| `block_timber_wall.png` | Timber-frame wall | wood beams + pale plaster infill | no |
| `block_thatch.png` | Thatch | golden bundled straw/reed roofing | no |
| `block_glasspane.png` | Glass | clear glass with thin frame | yes |
| `block_obsidian_glass.png` | Obsidian glass | dark smoky translucent volcanic glass | yes |
| `block_torch_post.png` | Torch post | wooden post with lit flame on top | yes |

### Batch S1 — Body-material skins (11) — `skin_<name>.png`, 32×32, **tileable, grayscale**

These paint the **bodies of mobs, NPCs and the player** (and the base layer under
armour). The engine multiplies each tile by a per-creature colour, so keep them
**neutral grey / light value** and **seamlessly tileable** (they wrap across body
boxes) — an over-coloured tile will tint wrong. Opaque.

| filename | what it is | style hint |
|---|---|---|
| `skin_solid.png` | Smooth skin panel | near-white, faint even grain (generic body base) |
| `skin_face.png` | Face panel | light base, two dark eyes + a small muzzle/mouth, front-of-head only |
| `skin_fur.png` | Fur | short vertical grey hair strokes, soft |
| `skin_hide.png` | Tanned hide / leather | mottled grey with a few darker patches |
| `skin_scales.png` | Reptile scales | offset rows of small overlapping scales |
| `skin_stone.png` | Stone / golem hide | cracked grey rock with a wandering seam |
| `skin_bark.png` | Bark / treant | vertical bark ridges, woody grain |
| `skin_metal.png` | Brushed metal plating | horizontal sheen bands, rivets at the corners |
| `skin_cloth.png` | Woven cloth | fine even weave grid |
| `skin_straw.png` | Straw / thatch | scattered straw strands (practice-dummy body) |
| `skin_glow.png` | Glowing wisp | soft radial glow, bright centre → dim edge |

### Batch R7 — Item icons: materials & resources (27) — transparent, 1px outline

| filename | what it is | style hint |
|---|---|---|
| `item_rough_stone.png` | Rough stone | grey stone chunk |
| `item_rough_gem.png` | Rough gem | dull uncut gemstone |
| `item_clay_lump.png` | Clay lump | grey-brown wet clay ball |
| `item_pottery_shard.png` | Pottery shard | broken terracotta fragment |
| `item_plant_fibre.png` | Plant fibre | loose stringy green-tan fibres |
| `item_cord.png` | Cord | coiled fibre rope |
| `item_sinew.png` | Sinew | pale stringy animal sinew |
| `item_boarhide.png` | Boar hide | brown bristled pelt |
| `item_cured_hide.png` | Cured hide | folded tan leather sheet |
| `item_woven_cloth.png` | Woven cloth | folded tan fabric square |
| `item_coke.png` | Coke | glossy black fuel chunks |
| `item_amber_resin.png` | Amber resin | golden translucent droplet |
| `item_bone_needle.png` | Bone needle | thin sharpened bone needle |
| `item_grain_seeds.png` | Grain seeds | small pale seeds |
| `item_grainsheaf.png` | Grain sheaf | tied bundle of golden wheat |
| `item_golden_grain.png` | Golden grain | handful of gold kernels |
| `item_fernwood_seed.png` | Fernwood seed | small green pod/seed |
| `item_fernwood_log.png` | Fernwood log | greenish-brown log section |
| `item_emberpine_log.png` | Emberpine log | dark log with ember-glow cracks |
| `item_springroot.png` | Springroot | pale knotted root with sprout |
| `item_silverleaf.png` | Silverleaf | silvery-white herb leaf |
| `item_sunpetal.png` | Sunpetal | bright yellow bloom |
| `item_bitterleaf.png` | Bitterleaf | jagged bitter green leaf |
| `item_emberstone_shard.png` | Emberstone shard | glowing ember-orange crystal shard |
| `item_old_coin.png` | Old coin | tarnished ancient coin |
| `item_relic_fragment.png` | Relic fragment | ornate broken artifact piece |
| `item_boar_haunch.png` | Boar haunch (raw) | raw pink-red meat on bone |

### Batch R8 — Item icons: fantasy gems & quest (5) — transparent, 1px outline

| filename | what it is | style hint |
|---|---|---|
| `item_veilcrystal.png` | Veilcrystal | translucent pale-violet crystal |
| `item_flawless_veilcrystal.png` | Flawless veilcrystal | brilliant faceted violet, glowing |
| `item_flame_opal.png` | Flame opal | fiery orange-red iridescent opal |
| `item_warchief_standard.png` | Warchief's standard (quest) | iron-and-bone banner pole, torn heraldry |
| `item_waterlogged_cache.png` | Waterlogged cache | soggy dripping wooden chest/bundle |

### Batch R9 — Item icons: tools & utility (9) — transparent, 1px outline

| filename | what it is | style hint |
|---|---|---|
| `item_crude_pickaxe.png` | Crude pickaxe | lashed stone pick on stick |
| `item_crude_axe.png` | Crude axe | lashed stone axe head |
| `item_crude_shovel.png` | Crude shovel | lashed stone spade |
| `item_crude_hoe.png` | Crude hoe | lashed stone hoe |
| `item_worn_hatchet.png` | Worn hatchet | small chipped hatchet |
| `item_fishing_rod.png` | Fishing rod | wooden rod, line + hook |
| `item_lantern.png` | Lantern | metal lantern, warm glow |
| `item_waterskin.png` | Waterskin | leather water flask |
| `item_coin.png` | Coin | single gold coin |

### Batch R10 — Item icons: weapons (8) — transparent, 1px outline

| filename | what it is | style hint |
|---|---|---|
| `item_wooden_cudgel.png` | Wooden cudgel | crude wooden club |
| `item_boneshard_spear.png` | Boneshard spear | shaft tipped with jagged bone |
| `item_bronze_blade.png` | Bronze blade | bronze short sword |
| `item_iron_blade.png` | Iron blade | grey steel sword |
| `item_frostbrand_blade.png` | Frostbrand blade | icy-blue enchanted sword, frost aura |
| `item_ember_staff.png` | Ember staff | wooden staff with ember gem tip |
| `item_thornwood_bow.png` | Thornwood bow | gnarled thorny wood bow |
| `item_recurve_silverbow.png` | Recurve silverbow | elegant silver recurve bow |

### Batch R11 — Item icons: armour & shield (12) — transparent, 1px outline

| filename | what it is | style hint |
|---|---|---|
| `item_bronze_helm.png` | Bronze helm | bronze helmet |
| `item_bronze_cuirass.png` | Bronze cuirass | bronze chest plate |
| `item_bronze_greaves.png` | Bronze greaves | bronze leg guards |
| `item_hide_cap.png` | Hide cap | leather cap |
| `item_hide_jerkin.png` | Hide jerkin | leather chest jerkin |
| `item_hide_leggings.png` | Hide leggings | leather leggings |
| `item_hide_boots.png` | Hide boots | leather boots |
| `item_hide_gloves.png` | Hide gloves | leather gloves |
| `item_woven_hood.png` | Woven hood | cloth hood |
| `item_woven_robe.png` | Woven robe | cloth robe |
| `item_timber_shield.png` | Timber shield | round wooden plank shield |
| `item_forager_band.png` | Forager band | simple ring with leaf motif |

### Batch R12 — Item icons: charms, food & potions (19) — transparent, 1px outline

| filename | what it is | style hint |
|---|---|---|
| `item_ironbud_charm.png` | Ironbud charm | iron pendant charm |
| `item_keen_charm.png` | Keen charm | sharp-edged amulet |
| `item_veilcharm.png` | Veilcharm | violet-crystal amulet |
| `item_ward_talisman.png` | Ward talisman | rune-etched protective talisman |
| `item_hearth_loaf.png` | Hearth loaf | round baked bread |
| `item_travel_biscuit.png` | Travel biscuit | hard tan cracker |
| `item_roast_haunch.png` | Roast haunch | golden-brown cooked meat |
| `item_roast_silverfin.png` | Roast silverfin | cooked silver fish, grill marks |
| `item_seared_duskeel.png` | Seared duskeel | cooked dark eel fillet |
| `item_smoked_mudwhisker.png` | Smoked mudwhisker | smoked whiskered fish |
| `item_tartberries.png` | Tartberries | cluster of tart red-purple berries |
| `item_silverfin.png` | Silverfin (raw) | silvery live fish |
| `item_duskeel.png` | Duskeel (raw) | dark slippery eel |
| `item_mudwhisker.png` | Mudwhisker (raw) | mud-brown whiskered fish |
| `item_duskcap.png` | Duskcap | dusky purple mushroom |
| `item_minor_healing_tonic.png` | Minor healing tonic | red potion vial |
| `item_lesser_mana_tonic.png` | Lesser mana tonic | blue potion vial |
| `item_energy_tonic.png` | Energy tonic | glowing yellow-orange vial |
| `item_antidote.png` | Antidote | green cure vial |

### Batch P — Player-worn gear: full body-wrap layers (9) — `skin_<name>.png`, **64×64 UV**

Renders armour + weapons **on the character**. Chosen approach: Minecraft-style
full-humanoid UV skins. Paint onto the **standard 64×64 humanoid skin template**
(our player boxes match it exactly: head 8×8×8, torso 8×12×4, arms 4×12×4, legs
4×12×4 — front/back/sides/top/bottom regions in the usual layout). The **base** skin
is opaque; each **armour wrap** is an overlay layer — **transparent everywhere the
armour doesn't cover**, so the base body shows through.

| filename | what it is | style hint |
|---|---|---|
| `skin_player_base.png` | Base adventurer | bare body — face, hands, tunic, trousers, boots (opaque, full wrap) |
| `skin_armor_hide.png` | Hide armour wrap | tan leather cap / jerkin / leggings / boots over the plated regions |
| `skin_armor_cloth.png` | Woven armour wrap | cloth hood + robe (the `woven` set) |
| `skin_armor_bronze.png` | Bronze armour wrap | warm bronze helm / cuirass / greaves plating |
| `skin_armor_copper.png` | Copper armour wrap | orange-copper plates, faint patina |
| `skin_armor_iron.png` | Iron armour wrap | cool grey steel plate |
| `skin_armor_steel.png` | Steel armour wrap | bright polished steel, crisp edges |
| `skin_armor_damascus.png` | Damascus armour wrap | watered-steel wave pattern, dark |
| `skin_armor_meteoric.png` | Meteoric armour wrap | dark star-metal, faint violet sheen |

**Held items (weapons + shields):** rendered on an in-hand model that reuses each
item's existing **icon art** as its texture — so no new image-gen files are needed
for held gear (the weapon/shield icons on batches R7–R12 + the already-drawn metal
shields cover them). *Optional later:* dedicated side-profile held sprites per weapon
family (~21) if you want crisper in-hand silhouettes.

> Batches S1 + P need engine work to consume them — a `skin_*` PNG hook (done) plus a
> UV-skin render path for the player and a small held-weapon model system. Those are a
> build step, separate from generating the art.

### Remaining-art totals — ✅ COMPLETE (all 156 generated + imported)
All batches below have been generated and dropped into `assets/textures/`, and
`gen-texpack` now embeds them — **the engine reports 0 tiles on procedural fallback.**
- World / material block tiles: **56** (R1–R6, `block_*` 32×32) ✅
- Body-material skins: **11** (S1, `skin_*` 32×32) ✅
- Item icons: **80** (R7–R12, `item_*` 32×32) ✅
- Player-worn gear: **9** (P, `skin_player_base` + 8 `skin_armor_*` 64×64 UV) ✅
- Held weapons/shields render as 3D models coloured by material (no PNG needed).

## Totals (art requested in this manifest)
- Block tiles: 181
- Item icons: 200
- **Total: 381**

---

## Batch P — Procedural-art gap (schematic-import blocks) — 83 tiles

These world tiles currently render as **placeholder procedural art** (colour/pattern stand-ins) and have **no hand-authored PNG yet** — the town-import decoration blocks plus the P1–P4 wave (lights, building stone, mineral/ore blocks, farm props). Author a `32×32` PNG per row with the exact filename; the loader blits it over the placeholder. Same rules as the batches above (opaque tiles tile seamlessly; transparent rows float on alpha 0). Palette: match the real Minecraft block so imported builds read correctly.

| filename | what it is | style hint | transparent |
|---|---|---|---|
| `block_allium.png` | Allium | match the Minecraft block | yes |
| `block_amethyst_block.png` | Amethyst Block | match the Minecraft block | no |
| `block_bee_nest.png` | Bee Nest — side face | match the Minecraft block | no |
| `block_bee_nest_top.png` | Bee Nest — top face | match the Minecraft block | no |
| `block_beehive.png` | Beehive — side face | match the Minecraft block | no |
| `block_beehive_top.png` | Beehive — top face | match the Minecraft block | no |
| `block_bell.png` | Bell | match the Minecraft block | no |
| `block_blue_orchid.png` | Blue Orchid | match the Minecraft block | yes |
| `block_bone_block_side.png` | Bone Block — side face | match the Minecraft block | no |
| `block_bone_block_top.png` | Bone Block — top/bottom face | match the Minecraft block | no |
| `block_budding_amethyst.png` | Budding Amethyst | match the Minecraft block | no |
| `block_carved_pumpkin.png` | Carved Pumpkin — front face | match the Minecraft block | no |
| `block_cauldron.png` | Cauldron — side face | match the Minecraft block | no |
| `block_cauldron_top.png` | Cauldron — top face | match the Minecraft block | no |
| `block_chain.png` | Chain | match the Minecraft block | yes |
| `block_cobweb.png` | Cobweb | match the Minecraft block | yes |
| `block_daylight_detector_side.png` | Daylight Detector — side face | match the Minecraft block | no |
| `block_daylight_detector_top.png` | Daylight Detector — top face | match the Minecraft block | no |
| `block_diamond_block.png` | Diamond Block | match the Minecraft block | no |
| `block_diamond_ore.png` | Diamond Ore | match the Minecraft block | no |
| `block_emerald_block.png` | Emerald Block | match the Minecraft block | no |
| `block_emerald_ore.png` | Emerald Ore | match the Minecraft block | no |
| `block_end_stone.png` | End Stone | match the Minecraft block | no |
| `block_end_stone_bricks.png` | End Stone Bricks | match the Minecraft block | no |
| `block_ender_chest_front.png` | Ender Chest — front face | match the Minecraft block | no |
| `block_ender_chest_side.png` | Ender Chest — side face | match the Minecraft block | no |
| `block_ender_chest_top.png` | Ender Chest — top face | match the Minecraft block | no |
| `block_froglight_ochre.png` | Ochre Froglight — side face | match the Minecraft block | no |
| `block_froglight_ochre_top.png` | Ochre Froglight — top face | match the Minecraft block | no |
| `block_froglight_pearl.png` | Pearlescent Froglight — side face | match the Minecraft block | no |
| `block_froglight_pearl_top.png` | Pearlescent Froglight — top face | match the Minecraft block | no |
| `block_froglight_verdant.png` | Verdant Froglight — side face | match the Minecraft block | no |
| `block_froglight_verdant_top.png` | Verdant Froglight — top face | match the Minecraft block | no |
| `block_gilded_blackstone.png` | Gilded Blackstone | match the Minecraft block | no |
| `block_glow_lichen.png` | Glow Lichen | match the Minecraft block | yes |
| `block_glowstone.png` | Glowstone | match the Minecraft block | no |
| `block_hopper.png` | Hopper — side face | match the Minecraft block | no |
| `block_hopper_top.png` | Hopper — top face | match the Minecraft block | no |
| `block_iron_bars.png` | Iron Bars | match the Minecraft block | yes |
| `block_jack_o_lantern.png` | Jack o'Lantern — front face | match the Minecraft block | no |
| `block_ladder.png` | Ladder | match the Minecraft block | yes |
| `block_lapis_block.png` | Lapis Block | match the Minecraft block | no |
| `block_lapis_ore.png` | Lapis Ore | match the Minecraft block | no |
| `block_lectern.png` | Lectern — side face | match the Minecraft block | no |
| `block_lectern_top.png` | Lectern — top face | match the Minecraft block | no |
| `block_lodestone.png` | Lodestone — side face | match the Minecraft block | no |
| `block_lodestone_top.png` | Lodestone — top face | match the Minecraft block | no |
| `block_magma_block.png` | Magma Block | match the Minecraft block | no |
| `block_melon_side.png` | Melon — side face | match the Minecraft block | no |
| `block_melon_top.png` | Melon — top/bottom face | match the Minecraft block | no |
| `block_nether_portal.png` | Nether Portal | match the Minecraft block | yes |
| `block_nether_wart_block.png` | Nether Wart Block | match the Minecraft block | no |
| `block_netherite_block.png` | Netherite Block | match the Minecraft block | no |
| `block_netherrack.png` | Warped Nylium, Netherrack — bottom face | match the Minecraft block | no |
| `block_note_block.png` | Note Block — side face | match the Minecraft block | no |
| `block_note_block_top.png` | Note Block — top face | match the Minecraft block | no |
| `block_orange_tulip.png` | Orange Tulip | match the Minecraft block | yes |
| `block_oxeye_daisy.png` | Oxeye Daisy | match the Minecraft block | yes |
| `block_pink_tulip.png` | Pink Tulip | match the Minecraft block | yes |
| `block_polished_tuff.png` | Polished Tuff | match the Minecraft block | no |
| `block_pumpkin_side.png` | Jack o'Lantern, Pumpkin, Carved Pumpkin — side face | match the Minecraft block | no |
| `block_pumpkin_top.png` | Jack o'Lantern, Pumpkin, Carved Pumpkin — top/bottom face | match the Minecraft block | no |
| `block_rail.png` | Rail | match the Minecraft block | no |
| `block_red_nether_bricks.png` | Red Nether Bricks | match the Minecraft block | no |
| `block_redstone_block.png` | Redstone Block | match the Minecraft block | no |
| `block_redstone_lamp.png` | Redstone Lamp | match the Minecraft block | no |
| `block_redstone_ore.png` | Redstone Ore | match the Minecraft block | no |
| `block_rose_bush.png` | Rose Bush | match the Minecraft block | yes |
| `block_scaffolding.png` | Scaffolding | match the Minecraft block | no |
| `block_sculk.png` | Sculk | match the Minecraft block | no |
| `block_sea_lantern.png` | Sea Lantern | match the Minecraft block | no |
| `block_sea_pickle.png` | Sea Pickle | match the Minecraft block | yes |
| `block_shroomlight.png` | Shroomlight | match the Minecraft block | no |
| `block_sign.png` | Sign | match the Minecraft block | no |
| `block_soul_sand.png` | Soul Sand | match the Minecraft block | no |
| `block_soul_soil.png` | Soul Soil | match the Minecraft block | no |
| `block_suspicious_gravel.png` | Suspicious Gravel | match the Minecraft block | no |
| `block_tuff_bricks.png` | Tuff Bricks | match the Minecraft block | no |
| `block_warped_nylium.png` | Warped Nylium — top face | match the Minecraft block | no |
| `block_warped_nylium_side.png` | Warped Nylium — side face | match the Minecraft block | no |
| `block_warped_roots.png` | Warped Roots | match the Minecraft block | yes |
| `block_warped_wart_block.png` | Warped Wart Block | match the Minecraft block | no |
| `block_white_tulip.png` | White Tulip | match the Minecraft block | yes |

