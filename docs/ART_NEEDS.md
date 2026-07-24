# Sproutlands — Art Needs (real-world route)

All art is **32×32 RGBA PNG** (`TILE = 32`) — blocks tile seamlessly (opaque),
item/UI icons are transparent. Mobs are listed separately in
**`docs/MOBS_TO_GENERATE.md`** (each = a mob JSON + its own texture sheet).

**Already specified** in `docs/TEXTURES.md` (255 tiles) — the material spine:
terrain, ores, per-wood logs/leaves, bars, gems, planks, per-metal tool/weapon/
armor kits, bows, firearms, jewelry, base stations. Those still stand. Below is
what the real-world route **adds or changes**.

## MUST-HAVE

### Skill icons (revised roster) — ~8
Redesign & add 16×16 vector icons to match the new names:
- **Medicine** (was Healing): cross + bandage/splint
- **Apothecary** (was Alchemy): mortar & pestle + herb sprig
- New: **Constitution** (endurance/heart-shield), **Athletics** (runner/burst), **Jewelcraft/Gunsmithing** (gem + faceting), **Marksmanship** (was Ranged: crosshair/sight)
- Optional **Husbandry** sub-icon (animal + heart)
- **Magic** & **Enchanting**: keep but add a small "frontier — off by default" lock badge

### Realism HUD glyphs & gauges — ~40
Remove the **mana bar**; add:
- **Stamina** bar
- **Body temperature** thermometer + bands (cold / comfort / hot) + states: shiver, sweat, hypothermia, heatstroke, frostbite
- **Hydration** drop-meter + thirst / waterskin
- **Nutrition** hunger meter + 4-group food wheel (carb/protein/fat/vitamin) + malnutrition / satiety
- **Seasons** (4 badges) + **day-length** bar + sun-arc clock
- **Weather** set: sun, cloud, rain, storm/lightning, snow, blizzard, fog, wind, heatwave
- **Health status**: bleeding, broken bone, infection, fever, fatigue
- **Structural-integrity** load gauge + collapse warning
- **Geology** prospecting / strata legend

### Herbs & medicine items — ~30
- Real herbs: willow bark, yarrow, comfrey, chamomile, sage, mint, plantain, garlic, aloe, echinacea, ginger, feverfew, **foxglove**, **poppy**, elderberry, honey
- Medicine items: bandage, splint, tourniquet, poultice, salve, tincture, tea, sutures, sling, crutch, cast, clean-water flask
- Apothecary tools: mortar & pestle, drying bundle, **alembic still**

## HIGH

### Geology / strata blocks — ~20
Real rock tiles: sandstone, limestone, chalk, shale, granite, slate/schist, marble,
dolomite, obsidian, flint, chert · soil horizons: topsoil/loam, subsoil, peat, silt,
mud, permafrost · banded sedimentary + an ore-in-strata prospecting overlay.

### Realism stations / machines (multi-face blocks) — ~18 stations (~40 tiles)
Pottery/charcoal kiln, lime kiln, **bloomery**, **blast furnace**, **bellows**,
**water wheel**, **windmill**, sawpit, brick kiln, drying/smoking rack, well,
cistern, quern/millstone, mortar bed, alembic bench, sickbed cot, animal
pen/trough/coop, **beehive**.

### Crops (growth stages) + foods — ~90 crop tiles + ~25 food icons
- Crops with 3–4 growth stages each: wheat, barley, oats, rye, flax, cotton, carrot,
  cabbage, onion, turnip, potato, bean, pea, squash, maize, rice, grape, hops
- Foods: bread, flour, cheese, milk, egg, butter, meat cuts per species, apple, nuts,
  salt, cooked stew/roast/pottage/pie/biscuit

### Fish + animal products — ~34 icons
- Real fish: trout, bass, salmon, pike, carp, catfish, perch, cod, mackerel, herring,
  tuna, eel, crab, crayfish
- Animal products: rawhide, tanned leather, fur pelts, wool, sinew, bone, antler,
  ivory/tusk, feathers, horn, tallow, raw meat cuts per species

## NICE-TO-HAVE
- **Fantasy Frontier exile:** a mode toggle/badge; **retain** the existing
  sk_magic/sk_enchanting icons, mana bar, runestone altar and fantasy mob rigs
  (thicket_sprite, marsh_wisp, rime_shade, golems) behind that off-by-default gate —
  no new art, just gated.

## Rough totals
- Non-mob NEW art: **~8 skill icons + ~40 HUD glyphs + ~250 blocks/items** (herbs,
  medicine, strata, stations, crops, foods, fish, products), on top of the 255 already
  in `docs/TEXTURES.md`.
- Mob art (separate): **~120 animals + ~19 bosses + ~12 livestock** — see
  `docs/MOBS_TO_GENERATE.md`.
