# Emberveil — Realistic Texture Manifest (v3)

Generated from `js/game/materials.js` — 255 textures, all **32×32 PNG**. `block_*.png` = world tiles (opaque, tile seamlessly), `item_*.png` = inventory icons (transparent). Filenames are load-bearing — the texture-pack loader consumes them exactly.

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

## Totals
- Block tiles: 71
- Item icons: 184
- **Total: 255**

Not included (carried from the skill plan, generated later): fish, foods, potions, herbs, crops, hides, relics, coins, misc consumables.
