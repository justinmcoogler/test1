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
- New: **Constitution** (endurance/heart-shield), **Athletics** (runner/burst), **Jewelcraft** (gem + faceting), **Marksmanship** (was Ranged: crosshair/sight), **Handling** (hand + hoofprint)
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

### Learning Mode blocks — 49 tiles (all shipped as procedural placeholders)

Every one of these EXISTS and works today, drawn procedurally in
`js/gfx/textures.js`. They are listed here because hand-drawn versions would read
better to a five-year-old, not because anything is missing. All 32×32, opaque,
must tile — though most are meant to be seen one block at a time rather than as a
field, so seam-perfection matters less than legibility at arm's length.

- **Alphabet — 26** (`letter_a` … `letter_z`): a bone-coloured card with a bevel
  and one black capital, three "font pixels" thick. Keep the capital form a child
  is taught to write; keep the card colour distinct from the numerals below.
- **Numerals — 10** (`digit_0` … `digit_9`): the same card in **pale blue**, so a
  child hunting for the 7 can see which shelf it is on before they read anything.
  Plain oval zero, no slash.
- **Maths signs — 7** (`sym_plus`, `sym_minus`, `sym_times`, `sym_divide`,
  `sym_equals`, `sym_less`, `sym_greater`): the same card in **pale green**. These
  three families are one typeface in three colours — a row of them spells a
  sentence (`3+2=5`), so the glyphs must sit on a shared baseline and optical size.
- **Lesson props — 6**:
  - `nest_egg` — a speckled egg in a scrape of straw. Placed one to a nest and
    counted from across a farmyard, so it has to read against both green grass and
    a straw pad, and be unmistakably an *egg* at a distance.
  - `apple_red`, `apple_green` — one apple each, stem and leaf, on a leafy ground.
    The pair is sorted by colour, so the two must differ in **value** as well as
    hue (a colour-blind child sorts them too).
  - `lantern_lit`, `lantern_dark` — the same lamp, lit and out. The lit one is
    emissive in-game and is used as a farmyard lamp; the difference between the two
    has to read at a glance even in full daylight.
  - `work_mat` — squared paper you can stand on. Faint grid, low contrast: it sits
    *under* the child's work and must never compete with it.

### Nan Willow — the lesson guide

One character skin (or a hand-drawn portrait for the dialogue box, if the box ever
gets one). She is the farm keeper at Honeywood: elderly, grey hair in a bun, a work
apron over a long dress, boots. Procedurally built from the shared humanoid rig
today (`NPC_DEFS.nan` in [`js/game/npcs.js`](../js/game/npcs.js)), so she reads as
a person but not as a *particular* person. She stands at every stop of the lesson
and is the one face a five-year-old sees for half an hour — worth a real skin.

## NICE-TO-HAVE
- **Fantasy Frontier exile:** a mode toggle/badge; **retain** the existing
  sk_magic/sk_enchanting icons, mana bar and runestone altar behind that
  off-by-default gate — no new art, just gated. (The fantasy mob rigs it used to
  name are gone: the roster is eighteen creatures now — livestock, a rat and the
  goblins. See `docs/MOB_BRIEF.md`.)

## Rough totals
- Non-mob NEW art: **~8 skill icons + ~40 HUD glyphs + ~250 blocks/items** (herbs,
  medicine, strata, stations, crops, foods, fish, products), on top of the 255 already
  in `docs/TEXTURES.md`.
- Learning Mode: **49 tiles** — already shipped procedurally, so this is a
  redraw-for-quality list rather than a blocker.
- Mob art (separate): **~120 animals + ~19 bosses + ~12 livestock** — see
  `docs/MOBS_TO_GENERATE.md`.
