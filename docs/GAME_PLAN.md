# Emberveil — Master Content Plan

> ## ⚙️ REALISTIC SPINE v3 — LOCKED (supersedes the v2 material tiers below)
>
> The owner chose a **realistic, pre-industrial world** (medieval → renaissance /
> black-powder) over the Minecraft/RuneScape blend. The authoritative material
> catalog now lives in code at **`js/game/materials.js`** (validated by
> `tests/unit/materials.test.mjs`). The v2 tables below are kept for their skill
> ladders, economy math, and mob framework, but **material names/tiers are
> replaced by the realistic spine**:
>
> - **Metals (forgeable, real order):** Copper → Tin → **Bronze** → Iron → **Steel** → **Damascus steel** → **Meteoric iron** (rare cap). Fuel: **Coal**. Ammo: **Lead**. No titanium/tungsten (kept out as anachronistic).
> - **Jewelry metals (Crafting-only, never weapons):** Silver, Gold, Platinum + **Brass** (copper+zinc), **Electrum** (gold+silver), **Pewter** (tin+copper). Supporting alloy ore: **Zinc**.
> - **Gems (unchanged rule):** dropped randomly while mining any rock, cut by Crafting → jewelry. Quartz/Amethyst → Garnet/Topaz → Emerald/Sapphire/Ruby → **Diamond**.
> - **Woods (real, soft→dense/rare):** Pine → Cedar → Birch → Oak → Ash → **Hickory** → Maple → **Walnut** → **Yew** → Teak → Ebony → **Lignum Vitae**. Real jobs (ash/hickory handles & bows, yew longbows, walnut gunstocks, teak weatherproof).
> - **Black-powder firearms (new differentiator):** hand cannon → flintlock pistol → matchlock musket → blunderbuss. Chain: steel/damascus **barrel** + walnut **stock** + **gunpowder** (saltpeter+charcoal+sulfur) + cast **lead** ball/shot. Late-game **Ranged** branch; big damage / slow reload / loud. **OFF by default in Education mode & for schools** (parent/teacher-lockable).
>
> **Build phases:** (1) ✅ catalog `materials.js` + validation → (2) blocks + items →
> (3) nodes, recipes, 1-99 skills → (4) 32×32 textures → (5) realistic biome
> generation. Old v0/v1/v2 material ids are dead; old saves will not carry over.

---

# Master Content Plan v2 (Minecraft/RuneScape blend) — historical reference

> **v2 replaces v1 wholesale.** Theme mandate: Minecraft-familiar materials and gear
> structure + RuneScape-style tier rhythm and skilling depth + original Emberveil
> content at the caps — a deliberate blend, never a copy of either. All ids are new;
> the v0 (original) and v1 catalogs are dead. Old saves will not carry over.

## The spine

| Ladder | Progression (level) |
|---|---|
| **Metals** | Copper (1) → Iron (15) → Steel (30, iron+coal) → **Emberite** (45, near-lava) → **Meteoric** (60, meteor-crater sites — new worldgen structure) → **Veilsteel** (75, meteoric + veil flux) |
| **Jewelry metals** | Silver (20) · Gold (40) — Crafting-only, never weapons |
| **Gems** | Sapphire → Emerald → Ruby → Diamond → **Veilstone** — random while mining any rock (ring+level scaled), cut by Crafting, socketed into jewelry, enchanted by Runecraft |
| **Trees** | Oak (1) → Birch (15) → Willow (30) → Spruce (45) → **Duskwood** (60) → **Veilwood** (75) |
| **Fish** | shrimp → cod → trout → salmon → tuna → lobster → swordfish → **glowfin** → **veilray** (levels 1–90, methods: net/rod/cage/harpoon) |
| **Gear per metal** | Full Minecraft-style kit (sword + pickaxe/axe/shovel/hoe + helmet/chestplate/leggings/boots) **+ one signature weapon unique to Emberveil per tier** |
| **Ranged/Magic** | Per-wood shortbow/longbow + crossbow line with per-metal ammo · per-wood/element staves + rune-powered spellbook · hide/studded armor (Ranged) · robes (Magic) |
| **Rings → bands** | R0 (<260) lv 1–25 · R1 (260–520) 20–50 · R2 (520–900) 45–75 · R3 (900+) 70–99 · distance = rarity everywhere |
| **Skills (22)** | Mining, Woodcutting, Fishing, Hunter, Farming, Foraging, Archaeology · Smithing, Crafting, Fletching, Cooking, Herblore, Construction, Runecraft · Hitpoints, Strength, Defense, Ranged, Magic, Healing, Slayer, Beastlore |

**Mob slot framework:** every biome×ring defines mob *slots* by role (skitterer/brute/
stalker/caster/flyer/tank/boss) with stat ranges and drop-table templates derived from
the ring — so creatures mass-imported through the emberveil-mob pipeline plug into
drops, Slayer tasks, and Beastlore without redesign.

**Differentiators vs MC/RS:** two combat modes, the custom-mob importer + Beastlore
taming, meteor-crater and near-lava mining, signature weapons per tier, distance-ring
worldgen fused with voxel building, diamond-as-gem (never armor).

## Design rulings (audit resolutions — authoritative over the catalog text)

Two audit passes ran over the full design (Appendices B and C). All fixes below are
**ratified as written** in those appendices; the headline rulings:

**Stat law & conflicts**
- **R1:** Combat doc §0.1 is the *single* source of truth for every weapon/armor stat,
  crit (×1.6), accuracy, shield %, burn procs, and mob stat bands (§9.2). Stat columns
  in the Smithing/Fletching/Construction parts are informative only where they disagree.
- **R2:** Ammo: recipes/XP/coin from Fletching; combat bonuses from combat §4.1;
  matched-tier bolt planks, no feathers in bolts. Jewelry: Crafting owns base stats,
  Runecraft owns enchant levels/costs/effects. Herb nodes: Foraging owns. Trophy
  economy: Slayer owns. Gem prices: Crafting's column (40/75/130/240/600 uncut).
- **R3:** Global vendor law: listed coin = base value; vendors buy at 50%, sell at 150%.
  Fuel: furnace 1 coal = 6 actions or 1 log = 1; campfire 1 log = 10 cooks.

**Bootstraps (all dead-locks broken)**
- **R4:** Bare-hands gathering works on oak + surface stone at ×3 time. Workbench =
  3 oak logs by hand. Loom = 5 oak planks + 4 flax. Anvil = 2 copper bars + 4 rough
  stone. Runestone altar = 6 stone brick + 1 weathered relic + 5 rune essence, and R0
  stone-circle world altars exist from worldgen. Vendors stock willow logs + oak staff.

**Economy & pacing (headline fixes, full numbers in Appendix C)**
- **R5 (Magic):** rune essence at Runecraft's curve (12% + 0.2%/lvl, cap 32%), qty 2–3;
  caster-slot rune drops ×2; each spell tier has a 1-rune training spell. Magic 99 ≈
  combat-median hours instead of impossible.
- **R6 (Beastlore):** repeatable XP — 0.25× active pet damage + daily field observation
  per studied species. 99 lands ≈ 250 h instead of unreachable.
- **R7 (Defense):** defensive-stance toggle routes 50% of style XP to Defense so armor
  gates stay reachable.
- **R8:** cap-tier craft XP raised (veilsteel bar 480, veilwood saw 230, kit pieces
  ×1.5, dusk/veil tanning ×2.5, Construction cap builds ×2, Slayer task bonus 25× +
  trophy XP ×2, Farming 60+ harvest ×3, Herblore 78 "lesser veilfire" training brew) —
  every skill now lands 99 in ~150–250 focused hours.
- **R9 (sinks):** anvil repair live at 10% of item value per durability cycle; Slayer
  task-transport fees; gold décor (grand arch) ratified as a coin/gold sink.
- **R10 (balance):** steel warpike −2 atk (sidegrade, not upgrade); flame-flail 35%
  proc; post-90 signature bonuses cap at +15% combined; meteoric_shield added (D60);
  R3-deep signposted 85+; fly-fishing feathers 1 per 5 casts; silver thread sink in
  gloomweave; ember tonic 300 s.

**Registry v2.1**
- **R11:** +20 ids ratified (rough_stone, glass_pane, 4 traps, 5 herb seeds,
  6 saplings, 3 potions) → **308 canonical items**; plus non-item namespaces
  (npc_*, cn_*, hunt_tracks node, slayer points, `enchanted` instance flag).
  Engine tickets: per-node XP override, drop-schema `meta`, `stats.slayerReq`
  mob-format v1.1, skill-key migration (vitality→hitpoints, tactics→slayer,
  hunting→hunter, tailoring→crafting, alchemy→herblore, +beastlore).

## Implementation phases

1. **Engine prep:** texture-pack loader (32×32 PNGs → atlas + icons), tool minTier
   enforcement, skill-key migration + 1–99 curve, luck/ring wiring, milestone registry,
   rune-cast + defensive-stance + repair mechanics, mob-format v1.1, save wipe.
2. **Worldgen:** meteor craters, near-lava emberite, R0 stone circles, new tree/ore
   node placement per ring.
3. **Materials + nodes** (Part 1–2 of the catalog) → **4. Gear + recipes** (Parts 3–5)
   → **5. Skills + combat + Slayer/Beastlore** (Parts 6–8) → **6. Textures** (batch
   imports from docs/TEXTURES.md) → **7. Balance playtest** vs Appendix C targets.

---



# PART 0 — CANONICAL ID REGISTRY (v2.1 = this + the 20 additions in R11)

Reading done — engine conventions confirmed (nodes.js `tree_*`/`ore_*` node-type ids, STATION_LABELS in crafting.js, v0/v1 dead ids in items.js and GAME_PLAN.md). Registry follows.

# EMBERVEIL v2 — CANONICAL ID REGISTRY (LAW)

**Total: 288 ids.** Floor forced by mandated matrices (63-id metal kits, 32-id ranged/magic weapon lines, 36-id ranged/mage armor, 9 fish × raw+cooked, 6 woods × logs+planks). The 8-id overage vs the 280 ceiling is the price of full hoe/shovel kits at all six metals; flag if the cap is hard.

**Legend:** M=Mining WC=Woodcut F=Fishing HU=Hunter FA=Farming FO=Foraging A=Archaeology SM=Smithing CR=Crafting FL=Fletching C=Cooking HB=Herblore CN=Construction RC=Runecraft ST=Strength D=Defense R=Ranged MG=Magic HL=Healing BL=Beastlore. R0-R3 = distance rings. Equip-gates: weapons ST, melee armor D, bows/hide R, staves/robes MG, at metal level (1/15/30/45/60/75).

## §1 Ores & Bars (1-16)

| # | id | label | cat | tier/lv | role |
|---|---|---|---|---|---|
| 1 | copper_ore | Copper Ore | ore | M1 R0 | from ore_copper → copper_bar |
| 2 | iron_ore | Iron Ore | ore | M15 R0+ | from ore_iron → iron_bar, steel_bar |
| 3 | coal | Coal | ore | M20 all rings | from ore_coal → steel/emberite smelting, furnace fuel |
| 4 | silver_ore | Silver Ore | ore | M20 R0-1 | jewelry-only metal → silver_bar (CR) |
| 5 | gold_ore | Gold Ore | ore | M40 R1-2 | jewelry-only metal → gold_bar (CR) |
| 6 | emberite_ore | Emberite Ore | ore | M45 R2 volcanic/near-lava | fire-themed → emberite_bar |
| 7 | meteoric_ore | Meteoric Ore | ore | M60 R2-3 crater-only | from ore_meteoric at meteor craters → meteoric_bar |
| 8 | veil_flux | Veil Flux | ore | M75 R3 | mined from riftstone blocks → veilsteel_bar |
| 9 | copper_bar | Copper Bar | bar | SM1 | furnace; → copper kit, chisel/hammer/needle/knife, copper_arrow |
| 10 | iron_bar | Iron Bar | bar | SM15 | → iron kit, studs, nails, light_crossbow, iron ammo |
| 11 | steel_bar | Steel Bar | bar | SM30 | 1 iron_ore + 2 coal; → steel kit, harpoon, steel ammo |
| 12 | silver_bar | Silver Bar | bar | CR20 | furnace (Crafting); → silver jewelry |
| 13 | gold_bar | Gold Bar | bar | CR40 | furnace (Crafting); → gold jewelry |
| 14 | emberite_bar | Emberite Bar | bar | SM45 | 2 ore + 1 coal; → emberite kit, emberhide studs, ammo |
| 15 | meteoric_bar | Meteoric Bar | bar | SM60 | → meteoric kit, ammo |
| 16 | veilsteel_bar | Veilsteel Bar | bar | SM75 | 1 meteoric_bar + 1 veil_flux; original cap → veilsteel kit |

## §2 Gems (17-26) — never nodes; random roll while mining ANY rock, chance scales with ring + Mining lv

| # | id | label | cat | tier/lv | role |
|---|---|---|---|---|---|
| 17 | uncut_sapphire | Uncut Sapphire | gem | roll lv1+, cut CR20 | → sapphire (chisel) |
| 18 | sapphire | Sapphire | gem | CR20 | → silver jewelry |
| 19 | uncut_emerald | Uncut Emerald | gem | roll R1+, cut CR30 | → emerald |
| 20 | emerald | Emerald | gem | CR30 | → silver jewelry |
| 21 | uncut_ruby | Uncut Ruby | gem | roll R1+, cut CR45 | → ruby |
| 22 | ruby | Ruby | gem | CR45 | → gold jewelry |
| 23 | uncut_diamond | Uncut Diamond | gem | roll R2+, cut CR60 | → diamond |
| 24 | diamond | Diamond | gem | CR60 | → gold jewelry |
| 25 | uncut_veilstone | Uncut Veilstone | gem | roll R3-weighted, cut CR75 | original cap gem → veilstone |
| 26 | veilstone | Veilstone | gem | CR75 | → gold_veilstone_amulet |

## §3 Logs & Planks (27-38) — planks sawn 1 log → 4 at workbench (Fletching)

| # | id | label | cat | tier/lv | role |
|---|---|---|---|---|---|
| 27 | oak_log | Oak Log | log | WC1 R0 | → planks, oak bows/staff, rod, arrow batch, fuel |
| 28 | oak_plank | Oak Plank | plank | FL1 | → CN builds, pestle, snare |
| 29 | birch_log | Birch Log | log | WC15 R0-1 | → planks, birch bows/staff, xbow stock |
| 30 | birch_plank | Birch Plank | plank | FL15 | → CN builds |
| 31 | willow_log | Willow Log | log | WC30 near water | → planks, willow bows/staff, lobster_cage |
| 32 | willow_plank | Willow Plank | plank | FL30 | → CN builds |
| 33 | spruce_log | Spruce Log | log | WC45 mountain/tundra | → planks, spruce bows/staff |
| 34 | spruce_plank | Spruce Plank | plank | FL45 | → CN builds |
| 35 | duskwood_log | Duskwood Log | log | WC60 R2-3 dark forest | → planks, duskwood bows/staff |
| 36 | duskwood_plank | Duskwood Plank | plank | FL60 | → CN builds |
| 37 | veilwood_log | Veilwood Log | log | WC75 R3 | original cap → veilwood bows/staff, veil_crossbow |
| 38 | veilwood_plank | Veilwood Plank | plank | FL75 | → CN cap builds |

## §4 Fish (39-56) — 9 species (pike cut, deliberate); cook lv = catch lv; cooked fish are HL food

| # | id | label | cat | tier/lv | role |
|---|---|---|---|---|---|
| 39 | raw_shrimp | Raw Shrimp | fish | F1 small_net shore | → cooked_shrimp |
| 40 | cooked_shrimp | Cooked Shrimp | food | C1 campfire | starter heal food |
| 41 | raw_cod | Raw Cod | fish | F10 rod sea | → cooked_cod |
| 42 | cooked_cod | Cooked Cod | food | C10 | early heal food |
| 43 | raw_trout | Raw Trout | fish | F20 rod river | → cooked_trout |
| 44 | cooked_trout | Cooked Trout | food | C20 | heal food |
| 45 | raw_salmon | Raw Salmon | fish | F30 rod river | → cooked_salmon |
| 46 | cooked_salmon | Cooked Salmon | food | C30 | heal food |
| 47 | raw_tuna | Raw Tuna | fish | F45 harpoon | → cooked_tuna |
| 48 | cooked_tuna | Cooked Tuna | food | C45 | heal food |
| 49 | raw_lobster | Raw Lobster | fish | F55 lobster_cage | → cooked_lobster |
| 50 | cooked_lobster | Cooked Lobster | food | C55 | heal food |
| 51 | raw_swordfish | Raw Swordfish | fish | F65 harpoon | → cooked_swordfish |
| 52 | cooked_swordfish | Cooked Swordfish | food | C65 | high heal food |
| 53 | raw_glowfin | Raw Glowfin | fish | F80 R2-3 glowing lakes | original → cooked_glowfin |
| 54 | cooked_glowfin | Cooked Glowfin | food | C80 | high heal + minor night-glow buff |
| 55 | raw_veilray | Raw Veilray | fish | F90 R3 | original cap → cooked_veilray |
| 56 | cooked_veilray | Cooked Veilray | food | C90 | best heal food |

## §5 Herbs & Secondaries (57-63)

| # | id | label | cat | tier/lv | role |
|---|---|---|---|---|---|
| 57 | sageleaf | Sageleaf | herb | FO1/HB1 R0 | → healing_salve |
| 58 | bogmint | Bogmint | herb | FO20 swamps | → strength/defense potions |
| 59 | emberbloom | Emberbloom | herb | FO40 R2 volcanic | → ember_tonic |
| 60 | duskmoss | Duskmoss | herb | FO60 R2-3 | → ranging/magic potions, gloomweave dye |
| 61 | veilblossom | Veilblossom | herb | FO75 R3 | original cap → veilfire_elixir, veilcloth |
| 62 | venom_sac | Venom Sac | sec | mob drop (poison tag, all rings) | → antipoison |
| 63 | ember_ash | Ember Ash | sec | FO35 near lava | → ember_tonic, emberweave dye |

## §6 Crops & Seeds (64-71)

| # | id | label | cat | tier/lv | role |
|---|---|---|---|---|---|
| 64 | wheat_seed | Wheat Seed | seed | FA1 tall_grass drop | → wheat at farm_plot |
| 65 | wheat | Wheat | crop | FA1 | → bread, hearty_stew |
| 66 | flax_seed | Flax Seed | seed | FA20 | → flax |
| 67 | flax | Flax | crop | FA20 grown; FO1 wild (bootstrap) | → bowstring, linen_cloth |
| 68 | sunmelon_seed | Sunmelon Seed | seed | FA45 | → sunmelon |
| 69 | sunmelon | Sunmelon | crop/food | FA45 | eaten raw, mid heal; original |
| 70 | veilgourd_seed | Veilgourd Seed | seed | FA75 R3 drop | → veilgourd |
| 71 | veilgourd | Veilgourd | crop | FA75 | original cap → veilgourd_pie |

## §7 Hides & Leathers (72-79)

| # | id | label | cat | tier/lv | role |
|---|---|---|---|---|---|
| 72 | rough_hide | Rough Hide | hide | R0 beasts, HU1 | → leather |
| 73 | leather | Leather | leather | CR1 (needle) | → leather set, studded base, bandolier items |
| 74 | thick_hide | Thick Hide | hide | R1 brutes, HU30 | → hard_leather |
| 75 | hard_leather | Hard Leather | leather | CR30 | → hardleather set, emberhide base |
| 76 | dusk_hide | Dusk Hide | hide | R2 stalkers, HU60 | → dusk_leather |
| 77 | dusk_leather | Dusk Leather | leather | CR60 | → duskhide set |
| 78 | veil_hide | Veil Hide | hide | R3 apex, HU75 | → veil_leather |
| 79 | veil_leather | Veil Leather | leather | CR75 | → veilhide set, field gear cap |

## §8 Cloth & String (80-83)

| # | id | label | cat | tier/lv | role |
|---|---|---|---|---|---|
| 80 | bowstring | Bowstring | cloth | CR1 loom, 2 flax | → all bows, rod, snare |
| 81 | linen_cloth | Linen Cloth | cloth | CR1 loom, 3 flax | → linen robes, small_net, bandage |
| 82 | silk_cloth | Silk Cloth | cloth | CR30 loom, 3 silk_thread | → silkspun/runeweave/emberweave/gloomweave robes |
| 83 | veilcloth | Veilcloth | cloth | CR75, silk_cloth + veilblossom | → veilweave robes |

## §9 Runes (84-91) — crafted at runestone altar (engine enchant_altar); consumed by Magic spells; ward enchants jewelry

| # | id | label | cat | tier/lv | role |
|---|---|---|---|---|---|
| 84 | rune_essence | Rune Essence | rune | roll while mining any rock M5+; dig_site | base of all runes |
| 85 | air_rune | Air Rune | rune | RC1 | tier-1 spells |
| 86 | water_rune | Water Rune | rune | RC10 | tier-2 spells |
| 87 | earth_rune | Earth Rune | rune | RC20 | tier-3 spells |
| 88 | ward_rune | Ward Rune | rune | RC25 | utility: jewelry enchants, protection spells |
| 89 | fire_rune | Fire Rune | rune | RC35 | tier-4 spells |
| 90 | gloom_rune | Gloom Rune | rune | RC60 R2+ essence-weighted | original; tier-5 spells, gloomweave |
| 91 | veil_rune | Veil Rune | rune | RC75 R3 | original cap; tier-6 spells |

## §10 Relics (92-95) — Archaeology at dig_site (dug with metal shovels; trowel folded into shovel line, deliberate)

| # | id | label | cat | tier/lv | role |
|---|---|---|---|---|---|
| 92 | weathered_relic | Weathered Relic | relic | A1 R0 | vendor coin + RC infusion feed |
| 93 | engraved_relic | Engraved Relic | relic | A25 R1 | vendor + RC ward_rune batch feed |
| 94 | runic_relic | Runic Relic | relic | A50 R2 | vendor + gloom_rune feed, BL lore |
| 95 | veilbound_relic | Veilbound Relic | relic | A75 R3 | original cap; veil_rune feed |

## §11 Tool Kit (96-105)

| # | id | label | cat | tier/lv | role |
|---|---|---|---|---|---|
| 96 | chisel | Chisel | tool | SM1, 1 copper_bar | gem cutting (CR) |
| 97 | hammer | Hammer | tool | SM1 | required at anvil (SM) |
| 98 | needle | Needle | tool | SM1 | leather/cloth sewing (CR) |
| 99 | knife | Knife | tool | SM1 | fletching/carving (FL) |
| 100 | pestle_and_mortar | Pestle and Mortar | tool | FL1, oak_plank | herb grinding (HB) |
| 101 | small_net | Small Fishing Net | tool | CR1, 2 linen_cloth | F1 shrimp |
| 102 | fishing_rod | Fishing Rod | tool | FL5, oak_log + bowstring | F10+ rod fishing |
| 103 | harpoon | Harpoon | tool | SM25, iron_bar + willow_log | F45 tuna, F65 swordfish |
| 104 | lobster_cage | Lobster Cage | tool | CR50, willow_plank + linen_cloth | F55 lobster |
| 105 | bird_snare | Bird Snare | tool | CR1, oak_plank + bowstring | HU1 traps → feather/raw_meat/rough_hide |

## §12 Metal Kits (106-168) — smith at anvil; armor D-gate, weapons ST-gate, tools skill-gate at metal level

| # | id | label | cat | tier/lv | role |
|---|---|---|---|---|---|
| 106 | copper_sword | Copper Sword | weapon | ST1 | starter melee |
| 107 | copper_pickaxe | Copper Pickaxe | tool | M1 | tier-1 mining power |
| 108 | copper_axe | Copper Axe | tool | WC1 | tier-1 chopping |
| 109 | copper_shovel | Copper Shovel | tool | M1/A1 | digging: clay/sand/dig_site |
| 110 | copper_hoe | Copper Hoe | tool | FA1 | tilling farm_plot |
| 111 | copper_helmet | Copper Helmet | armor-m | D1 | melee head |
| 112 | copper_chestplate | Copper Chestplate | armor-m | D1 | melee chest |
| 113 | copper_leggings | Copper Leggings | armor-m | D1 | melee legs |
| 114 | copper_boots | Copper Boots | armor-m | D1 | melee feet |
| 115 | iron_sword | Iron Sword | weapon | ST15 | tier-2 melee |
| 116 | iron_pickaxe | Iron Pickaxe | tool | M15 | tier-2 mining |
| 117 | iron_axe | Iron Axe | tool | WC15 | tier-2 chopping |
| 118 | iron_shovel | Iron Shovel | tool | M15/A15 | tier-2 digging |
| 119 | iron_hoe | Iron Hoe | tool | FA15 | tier-2 tilling |
| 120 | iron_helmet | Iron Helmet | armor-m | D15 | melee head |
| 121 | iron_chestplate | Iron Chestplate | armor-m | D15 | melee chest |
| 122 | iron_leggings | Iron Leggings | armor-m | D15 | melee legs |
| 123 | iron_boots | Iron Boots | armor-m | D15 | melee feet |
| 124 | iron_shield | Iron Shield | armor-m | D15 | offhand block |
| 125 | steel_sword | Steel Sword | weapon | ST30 | tier-3 melee |
| 126 | steel_pickaxe | Steel Pickaxe | tool | M30 | tier-3 mining |
| 127 | steel_axe | Steel Axe | tool | WC30 | tier-3 chopping |
| 128 | steel_shovel | Steel Shovel | tool | M30/A30 | tier-3 digging |
| 129 | steel_hoe | Steel Hoe | tool | FA30 | tier-3 tilling |
| 130 | steel_helmet | Steel Helmet | armor-m | D30 | melee head |
| 131 | steel_chestplate | Steel Chestplate | armor-m | D30 | melee chest |
| 132 | steel_leggings | Steel Leggings | armor-m | D30 | melee legs |
| 133 | steel_boots | Steel Boots | armor-m | D30 | melee feet |
| 134 | steel_shield | Steel Shield | armor-m | D30 | offhand block |
| 135 | emberite_sword | Emberite Sword | weapon | ST45 | tier-4 melee, minor burn |
| 136 | emberite_pickaxe | Emberite Pickaxe | tool | M45 | tier-4 mining |
| 137 | emberite_axe | Emberite Axe | tool | WC45 | tier-4 chopping |
| 138 | emberite_shovel | Emberite Shovel | tool | M45/A45 | tier-4 digging |
| 139 | emberite_hoe | Emberite Hoe | tool | FA45 | tier-4 tilling |
| 140 | emberite_helmet | Emberite Helmet | armor-m | D45 | melee head, fire-themed |
| 141 | emberite_chestplate | Emberite Chestplate | armor-m | D45 | melee chest |
| 142 | emberite_leggings | Emberite Leggings | armor-m | D45 | melee legs |
| 143 | emberite_boots | Emberite Boots | armor-m | D45 | melee feet |
| 144 | meteoric_sword | Meteoric Sword | weapon | ST60 | tier-5 melee |
| 145 | meteoric_pickaxe | Meteoric Pickaxe | tool | M60 | tier-5 mining |
| 146 | meteoric_axe | Meteoric Axe | tool | WC60 | tier-5 chopping |
| 147 | meteoric_shovel | Meteoric Shovel | tool | M60/A60 | tier-5 digging |
| 148 | meteoric_hoe | Meteoric Hoe | tool | FA60 | tier-5 tilling |
| 149 | meteoric_helmet | Meteoric Helmet | armor-m | D60 | melee head |
| 150 | meteoric_chestplate | Meteoric Chestplate | armor-m | D60 | melee chest |
| 151 | meteoric_leggings | Meteoric Leggings | armor-m | D60 | melee legs |
| 152 | meteoric_boots | Meteoric Boots | armor-m | D60 | melee feet |
| 153 | veilsteel_sword | Veilsteel Sword | weapon | ST75 | cap melee |
| 154 | veilsteel_pickaxe | Veilsteel Pickaxe | tool | M75 | cap mining |
| 155 | veilsteel_axe | Veilsteel Axe | tool | WC75 | cap chopping |
| 156 | veilsteel_shovel | Veilsteel Shovel | tool | M75/A75 | cap digging |
| 157 | veilsteel_hoe | Veilsteel Hoe | tool | FA75 | cap tilling |
| 158 | veilsteel_helmet | Veilsteel Helmet | armor-m | D75 | cap head |
| 159 | veilsteel_chestplate | Veilsteel Chestplate | armor-m | D75 | cap chest |
| 160 | veilsteel_leggings | Veilsteel Leggings | armor-m | D75 | cap legs |
| 161 | veilsteel_boots | Veilsteel Boots | armor-m | D75 | cap feet |
| 162 | veilsteel_shield | Veilsteel Shield | armor-m | D75 | cap offhand |
| 163 | copper_hookblade | Copper Hookblade | sig-weapon | ST1 | signature: fast slasher, bleed on crit |
| 164 | iron_greatmaul | Iron Greatmaul | sig-weapon | ST15 | signature: slow, knockback |
| 165 | steel_warpike | Steel Warpike | sig-weapon | ST30 | signature: +1 block reach |
| 166 | emberite_flame_flail | Emberite Flame-Flail | sig-weapon | ST45 | signature: burn DoT (owner example) |
| 167 | meteoric_star_maul | Meteoric Star Maul | sig-weapon | ST60 | signature: AoE slam + brief stun |
| 168 | veilsteel_riftblade | Veilsteel Riftblade | sig-weapon | ST75 | signature: phase strike ignores 30% armor |

## §13 Ranged & Magic Weapons (169-200) — bows FL from logs+bowstring; ammo in batches (arrows 15, bolts 12); staves need glass_orb

| # | id | label | cat | tier/lv | role |
|---|---|---|---|---|---|
| 169 | oak_shortbow | Oak Shortbow | weapon-r | R1 | starter bow |
| 170 | oak_longbow | Oak Longbow | weapon-r | R5 | slower, harder-hitting |
| 171 | birch_shortbow | Birch Shortbow | weapon-r | R15 | tier-2 |
| 172 | birch_longbow | Birch Longbow | weapon-r | R20 | tier-2 long |
| 173 | willow_shortbow | Willow Shortbow | weapon-r | R30 | tier-3 |
| 174 | willow_longbow | Willow Longbow | weapon-r | R35 | tier-3 long |
| 175 | spruce_shortbow | Spruce Shortbow | weapon-r | R45 | tier-4 |
| 176 | spruce_longbow | Spruce Longbow | weapon-r | R50 | tier-4 long |
| 177 | duskwood_shortbow | Duskwood Shortbow | weapon-r | R60 | tier-5 |
| 178 | duskwood_longbow | Duskwood Longbow | weapon-r | R65 | tier-5 long |
| 179 | veilwood_shortbow | Veilwood Shortbow | weapon-r | R75 | cap bow |
| 180 | veilwood_longbow | Veilwood Longbow | weapon-r | R80 | cap long |
| 181 | light_crossbow | Light Crossbow | weapon-r | R15, iron limbs + birch stock | bolt line entry |
| 182 | heavy_crossbow | Heavy Crossbow | weapon-r | R45, emberite limbs + spruce stock | mid bolt line |
| 183 | veil_crossbow | Veil Crossbow | weapon-r | R75, veilsteel limbs + veilwood stock | cap bolt line |
| 184 | copper_arrow | Copper Arrow | ammo | R1, FL1+SM1, batch 15 | oak-bow ammo |
| 185 | iron_arrow | Iron Arrow | ammo | R15, batch 15 | tier-2 ammo |
| 186 | steel_arrow | Steel Arrow | ammo | R30, batch 15 | tier-3 ammo |
| 187 | emberite_arrow | Emberite Arrow | ammo | R45, batch 15 | tier-4, minor burn |
| 188 | meteoric_arrow | Meteoric Arrow | ammo | R60, batch 15 | tier-5 ammo |
| 189 | veilsteel_arrow | Veilsteel Arrow | ammo | R75, batch 15 | cap ammo |
| 190 | iron_bolt | Iron Bolt | ammo | R15, batch 12 | crossbow ammo (no copper bolt — deliberate; lightest xbow is iron-tier) |
| 191 | steel_bolt | Steel Bolt | ammo | R30, batch 12 | crossbow ammo |
| 192 | emberite_bolt | Emberite Bolt | ammo | R45, batch 12 | burn bolt |
| 193 | meteoric_bolt | Meteoric Bolt | ammo | R60, batch 12 | heavy bolt |
| 194 | veilsteel_bolt | Veilsteel Bolt | ammo | R75, batch 12 | cap bolt |
| 195 | oak_staff | Oak Staff | weapon-mg | MG1, oak_log + glass_orb | casts tier-1 spells |
| 196 | birch_staff | Birch Staff | weapon-mg | MG15 | tier-2 casting |
| 197 | willow_staff | Willow Staff | weapon-mg | MG30 | tier-3 casting |
| 198 | spruce_staff | Spruce Staff | weapon-mg | MG45 | tier-4 casting |
| 199 | duskwood_staff | Duskwood Staff | weapon-mg | MG60 | tier-5 casting |
| 200 | veilwood_staff | Veilwood Staff | weapon-mg | MG75 | cap casting |

## §14 Ranged Armor (201-218) — CR sewn (needle)

| # | id | label | cat | tier/lv | role |
|---|---|---|---|---|---|
| 201 | leather_coif | Leather Coif | armor-r | R1, leather | ranged head |
| 202 | leather_body | Leather Body | armor-r | R1 | ranged chest |
| 203 | leather_chaps | Leather Chaps | armor-r | R1 | ranged legs |
| 204 | studded_coif | Studded Coif | armor-r | R15, leather + iron_bar | ranged head |
| 205 | studded_body | Studded Body | armor-r | R15 | ranged chest |
| 206 | studded_chaps | Studded Chaps | armor-r | R15 | ranged legs |
| 207 | hardleather_coif | Hardleather Coif | armor-r | R30, hard_leather | ranged head |
| 208 | hardleather_body | Hardleather Body | armor-r | R30 | ranged chest |
| 209 | hardleather_chaps | Hardleather Chaps | armor-r | R30 | ranged legs |
| 210 | emberhide_coif | Emberhide Coif | armor-r | R45, hard_leather + emberite_bar | fire-kissed set |
| 211 | emberhide_body | Emberhide Body | armor-r | R45 | ranged chest |
| 212 | emberhide_chaps | Emberhide Chaps | armor-r | R45 | ranged legs |
| 213 | duskhide_coif | Duskhide Coif | armor-r | R60, dusk_leather | ranged head |
| 214 | duskhide_body | Duskhide Body | armor-r | R60 | ranged chest |
| 215 | duskhide_chaps | Duskhide Chaps | armor-r | R60 | ranged legs |
| 216 | veilhide_coif | Veilhide Coif | armor-r | R75, veil_leather | cap head |
| 217 | veilhide_body | Veilhide Body | armor-r | R75 | cap chest |
| 218 | veilhide_chaps | Veilhide Chaps | armor-r | R75 | cap legs |

## §15 Robes (219-236) — CR at loom

| # | id | label | cat | tier/lv | role |
|---|---|---|---|---|---|
| 219 | linen_hood | Linen Hood | armor-mg | MG1, linen_cloth | mage head |
| 220 | linen_robe_top | Linen Robe Top | armor-mg | MG1 | mage chest |
| 221 | linen_robe_bottom | Linen Robe Bottom | armor-mg | MG1 | mage legs |
| 222 | silkspun_hood | Silkspun Hood | armor-mg | MG15, silk_cloth | mage head |
| 223 | silkspun_robe_top | Silkspun Robe Top | armor-mg | MG15 | mage chest |
| 224 | silkspun_robe_bottom | Silkspun Robe Bottom | armor-mg | MG15 | mage legs |
| 225 | runeweave_hood | Runeweave Hood | armor-mg | MG30, silk + elemental runes | rune-sink set |
| 226 | runeweave_robe_top | Runeweave Robe Top | armor-mg | MG30 | mage chest |
| 227 | runeweave_robe_bottom | Runeweave Robe Bottom | armor-mg | MG30 | mage legs |
| 228 | emberweave_hood | Emberweave Hood | armor-mg | MG45, silk + ember_ash | fire-dyed set |
| 229 | emberweave_robe_top | Emberweave Robe Top | armor-mg | MG45 | mage chest |
| 230 | emberweave_robe_bottom | Emberweave Robe Bottom | armor-mg | MG45 | mage legs |
| 231 | gloomweave_hood | Gloomweave Hood | armor-mg | MG60, silk + duskmoss + gloom_rune | mage head |
| 232 | gloomweave_robe_top | Gloomweave Robe Top | armor-mg | MG60 | mage chest |
| 233 | gloomweave_robe_bottom | Gloomweave Robe Bottom | armor-mg | MG60 | mage legs |
| 234 | veilweave_hood | Veilweave Hood | armor-mg | MG75, veilcloth | cap head |
| 235 | veilweave_robe_top | Veilweave Robe Top | armor-mg | MG75 | cap chest |
| 236 | veilweave_robe_bottom | Veilweave Robe Bottom | armor-mg | MG75 | cap legs |

## §16 Jewelry (237-244) — CR; enchantable via RC ward_rune; covers all 3 forms, both metals, all 5 gems

| # | id | label | cat | tier/lv | role |
|---|---|---|---|---|---|
| 237 | silver_sapphire_ring | Silver Sapphire Ring | jewel | CR20 | minor gather-luck buff |
| 238 | silver_sapphire_amulet | Silver Sapphire Amulet | jewel | CR24 | minor magic accuracy |
| 239 | silver_emerald_necklace | Silver Emerald Necklace | jewel | CR32 | minor HP regen |
| 240 | gold_ruby_ring | Gold Ruby Ring | jewel | CR45 | melee crit chance |
| 241 | gold_ruby_amulet | Gold Ruby Amulet | jewel | CR48 | strength buff |
| 242 | gold_diamond_ring | Gold Diamond Ring | jewel | CR58 | defense buff |
| 243 | gold_diamond_necklace | Gold Diamond Necklace | jewel | CR62 | ranged buff |
| 244 | gold_veilstone_amulet | Gold Veilstone Amulet | jewel | CR75 | cap: all-stats + distance-luck amplifier |

## §17 Potions (245-252) — HB at alchemy_table; salve is vial-free paste (lv-1 bootstrap); rest use glass_vial

| # | id | label | cat | tier/lv | role |
|---|---|---|---|---|---|
| 245 | healing_salve | Healing Salve | potion | HB1, sageleaf + wildberries | HL heal, no vial |
| 246 | antipoison | Antipoison | potion | HB15, sageleaf + venom_sac | cures poison |
| 247 | strength_potion | Strength Potion | potion | HB25, bogmint | ST boost |
| 248 | defense_potion | Defense Potion | potion | HB35, bogmint + rough_hide scraping | D boost |
| 249 | ember_tonic | Ember Tonic | potion | HB45, emberbloom + ember_ash | fire res (lava mining enabler) |
| 250 | ranging_potion | Ranging Potion | potion | HB50, duskmoss + feather | R boost |
| 251 | magic_potion | Magic Potion | potion | HB60, duskmoss + rune_essence | MG boost |
| 252 | veilfire_elixir | Veilfire Elixir | potion | HB75, veilblossom + uncut_veilstone | cap: all-stats + luck |

## §18 Foods & Cooking (253-258) — milling folded: wheat → bread direct at furnace (deliberate)

| # | id | label | cat | tier/lv | role |
|---|---|---|---|---|---|
| 253 | wildberries | Wildberries | food | FO1 berry_bush | nibble food; → salve, beast_treat |
| 254 | raw_meat | Raw Meat | food | mob/HU drop all rings | → cooked_meat, stew |
| 255 | cooked_meat | Cooked Meat | food | C1 campfire | heal food; → beast_treat |
| 256 | bread | Bread | food | C5 furnace, 3 wheat | early heal food |
| 257 | hearty_stew | Hearty Stew | food | C15, fired_bowl + raw_meat + wheat | big heal, returns bowl? no — consumes bowl (pottery sink) |
| 258 | veilgourd_pie | Veilgourd Pie | food | C75, veilgourd + wheat | cap food + brief HL boost |

## §19 Resource Nodes (259-271) — every rock rolls gem (§2) + essence (§9); respawn/charges per detail agents

| # | id | label | cat | tier/lv | role |
|---|---|---|---|---|---|
| 259 | tree_oak | Oak Tree | node | WC1 R0+ | drops oak_log |
| 260 | tree_birch | Birch Tree | node | WC15 R0-1 | drops birch_log |
| 261 | tree_willow | Willow Tree | node | WC30 near water | drops willow_log |
| 262 | tree_spruce | Spruce Tree | node | WC45 mountains/tundra | drops spruce_log |
| 263 | tree_duskwood | Duskwood Tree | node | WC60 R2-3 dark forest | drops duskwood_log |
| 264 | tree_veilwood | Veilwood Tree | node | WC75 R3 | drops veilwood_log |
| 265 | ore_copper | Copper Rock | node | M1 R0+ | drops copper_ore |
| 266 | ore_iron | Iron Rock | node | M15 R0+ | drops iron_ore |
| 267 | ore_coal | Coal Rock | node | M20 all rings, common | drops coal |
| 268 | ore_silver | Silver Rock | node | M20 R0-1 | drops silver_ore |
| 269 | ore_gold | Gold Rock | node | M40 R1-2 | drops gold_ore |
| 270 | ore_emberite | Emberite Rock | node | M45 R2 near-lava | drops emberite_ore |
| 271 | ore_meteoric | Meteoric Core | node | M60, meteor craters R2-3 only | drops meteoric_ore |

## §20 Worldgen Structure Blocks (272-277)

| # | id | label | cat | tier/lv | role |
|---|---|---|---|---|---|
| 272 | meteor_slag | Meteor Slag | block | R2-3 crater shell, pick 45+ | crater structure; breaks to stone scrap + rare meteoric_ore fleck |
| 273 | basalt | Basalt | block | R2 volcanic fields | hosts ore_emberite; CN dark building block |
| 274 | riftstone | Riftstone | block | R3 veil rifts, M75 | mined → veil_flux (no separate node — deliberate) |
| 275 | tall_grass | Tall Grass | block | all rings, ring-tinted | drops seeds (ring-gated table) + wild flax |
| 276 | sand | Sand | block/mat | shovel, shores | furnace → glass_vial/glass_orb |
| 277 | clay | Clay | block/mat | shovel, clay_deposit riverbanks | furnace-fired pottery (no kiln — furnace does all firing) |

## §21 Utility (278-283)

| # | id | label | cat | tier/lv | role |
|---|---|---|---|---|---|
| 278 | glass_vial | Glass Vial | util | CR10 furnace, sand, batch 3 | potion container |
| 279 | glass_orb | Glass Orb | util | CR25 furnace, sand ×2 | staff core (all staves) |
| 280 | fired_bowl | Fired Bowl | util | CR5 furnace, clay | pottery; hearty_stew input |
| 281 | nails | Nails | util | SM5, batch 15 | CN builds consume |
| 282 | bandage | Bandage | util | CR1, linen_cloth → 2 | HL lv-1 consumable |
| 283 | beast_treat | Beast Treat | util | C10, cooked_meat + wildberries + bone | BL taming consumable |

## §22 Mob-Drop Framework Materials (284-288) — slot drop-tables reference these by ring tier, never species

| # | id | label | cat | tier/lv | role |
|---|---|---|---|---|---|
| 284 | bone | Bone | drop | universal mob drop | → beast_treat, vendor coin |
| 285 | sinew | Sinew | drop | beast slots R0+ | alt bowstring, bird_snare repair |
| 286 | feather | Feather | drop | flyer slots R0+ | arrow batches, fly-fishing on rod |
| 287 | silk_thread | Silk Thread | drop | stalker/caster slots R1+ | → silk_cloth |
| 288 | beast_trophy | Beast Trophy | drop | ring-tiered (meta: r0-r3), brute/boss slots | Slayer turn-in, CN mount, vendor |

---

**RETAINED ENGINE IDS (also law, not counted — mechanics namespace, not v1 catalog):** currency `coin` (Ember Coin); stations `workbench`, `furnace`, `anvil_block`, `campfire`, `alchemy_table`, `loom_block`, `enchant_altar` (Runestone Altar — RC + jewelry enchants), `construction_bench`; generic node types `fishing_spot` (parameterized per fish table), `herb_patch`, `berry_bush`, `clay_deposit`, `dig_site`, `farm_plot`. No new stations; pottery/glass/all firing = furnace.

**DELEGATED NAMESPACES (must prefix, must not collide with the 288):** Construction placeable outputs `cn_*` (Construction agent); Magic spells `spell_*` (Magic agent, rune costs from §9); Slayer/Beastlore abilities `ab_*`; generated mobs `mob_*` via slot framework (drops wired only to §7/§22 + coin).

**DELIBERATE DEVIATIONS (state, do not re-litigate):** pike cut (9 fish species, spine shape kept); no copper bolt (crossbow line starts iron); veil_flux mined from riftstone block, no node id; flour folded into bread; trowel folded into metal shovels (Archaeology digs with kit shovels); wild flax (FO1) bootstraps CR/HL lv-1 before Farming 20; crossbow line is 3 tiers (15/45/75).

**DEAD-ID COMPLIANCE:** zero reuse of v1 GAME_PLAN catalog ids (fernwood/silverbark/emberpine, bronze/iron_ingot, gloamshard, pyrelith, brookperch, shadehide, venom_gland, bonepoint/steelpoint_arrow, etc.). Generic ids shared with the v0 engine registry (`iron_bar`, `silver_bar`, `sinew`, `ore_copper` pattern) are redefined fresh by this registry, which supersedes `js/game/items.js` content wholesale.

Source files consulted: /home/user/test1/docs/GAME_PLAN.md (Appendix A), /home/user/test1/js/game/items.js, /home/user/test1/js/game/crafting.js (STATION_LABELS), /home/user/test1/js/game/nodes.js (NODE_TYPES id conventions).


# PART 1 — MINING & SMITHING

# EMBERVEIL v2 — MINING + SMITHING (FULL DEPTH)

Engine grounding used: `nodes.js` schema (`xp/time/charges[min,max]/respawn(s)/drops{weight}/rare{chance}`, `rollNodeDrops` rare chance × `(1+luck)`), `skills.js` curve `xpForLevel(n)=60n^2.4+80n` (cum. XP: lv10≈12.4k · lv15≈34.9k · lv30≈196k · lv45≈532k · lv60≈1.07M · lv75≈1.84M · lv99≈3.61M), engine crit-gather (4%+0.16%/lvl, double yield) and gather-time mult (floor 0.45), combat `dmg *= 1 - armor/(armor+30)`, stations from `crafting.js` STATION_LABELS.

---

# PART 1 — MINING

## 1.1 Pickaxe ladder (tool power)

| Tool | Use gate | Power | Gather-time mult | Can mine up to |
|---|---|---|---|---|
| (bare hands, bootstrap) | — | 0 | ×3.00 | ore_copper, clay_deposit, sand, loose stone only |
| copper_pickaxe | M1 | 1 | ×1.00 | ore_copper, ore_iron, ore_coal, ore_silver |
| iron_pickaxe | M15 | 2 | ×0.92 | + ore_gold |
| steel_pickaxe | M30 | 3 | ×0.84 | + basalt, ore_emberite |
| emberite_pickaxe | M45 | 4 | ×0.76 | + meteor_slag, ore_meteoric |
| meteoric_pickaxe | M60 | 5 | ×0.68 | + riftstone |
| veilsteel_pickaxe | M75 | 6 | ×0.60 | everything |

Rule: a node needs BOTH the Mining level AND the listed minimum pick tier. Shovel ladder (clay/sand/dig_site) uses the same time mults; dig_site tier access is the Archaeology gate (A1/15/30/45/60/75), not Mining.

## 1.2 Node table (nodes.js format)

| Node id | Lv | Ring | Tool (min) | Time s | Charges | Respawn s | XP/gather | Drops (weight) | Rare (base chance, ×(1+luck)) | Density |
|---|---|---|---|---|---|---|---|---|---|---|
| ore_copper | M1 | R0+ | pick 1 (hand ok ×3) | 3.0 | [2,4] | 60 | 18 | copper_ore ×1 (w1) | gem roll §1.4; essence roll §1.5 | common: ~1 per 20×20 exposed stone |
| clay_deposit | M1 | riverbanks, all rings | shovel 1 (hand ok ×3) | 2.2 | [2,4] | 50 | 10 | clay ×1-2 (w1) | — | common on riverbanks |
| sand (block) | M1 | shores | shovel 1 | 1.5 | block | none (finite) | 3 | sand ×1 | — | shorelines |
| ore_iron | M15 | R0+ | pick 1 | 4.0 | [2,5] | 120 | 40 | iron_ore ×1 (w1) | gem, essence | uncommon R0, common R1+ |
| ore_coal | M20 | ALL rings | pick 1 | 3.2 | [3,6] | 45 | 30 | coal ×1 (w1) | gem, essence | very common: ~1 per 16×16 cave wall |
| ore_silver | M20 | R0-1 | pick 1 | 4.5 | [2,4] | 180 | 45 | silver_ore ×1 (w1) | gem, essence | uncommon |
| ore_gold | M40 | R1-2 | pick 2 | 5.0 | [2,4] | 300 | 75 | gold_ore ×1 (w1) | gem (chance ×1.25 on this node), essence | rare |
| basalt (block) | M30 | R2 volcanic fields | pick 3 | 2.5 | block | none | 8 | basalt ×1 | — | volcanic fields |
| ore_emberite | M45 | R2 volcanic, ≤8 blocks from lava | pick 3 | 5.5 | [2,4] | 360 | 105 | emberite_ore ×1 (w1) | gem, essence | 3-8 per volcanic field |
| meteor_slag (block) | M45 | R2-3 crater rim | pick 4 | 4.0 | block | none (finite per crater) | 25 | rough_stone ×1-2 (engine block) | meteoric_ore 3% | 18-30 per crater |
| ore_meteoric | M60 | R2-3 craters ONLY | pick 4 | 6.0 | [1,3] | 600 | 160 | meteoric_ore ×1 (w1) | gem, essence | 3-6 per crater floor |
| riftstone (block-node) | M75 | R3 veil rifts | pick 5 | 6.5 | [1,1] | 900 (regrow) | 240 | veil_flux ×1 | uncut_veilstone 1.5% flat (bypasses §1.4), essence | 8-14 per rift |

## 1.3 Worldgen structure specs (Mining-owned)

| Structure | Ring | Frequency | Composition | Hazard / rule |
|---|---|---|---|---|
| Volcanic field | R2 | ~1 per 140×140 | 24-40 basalt patch, 2-5 lava pools, 3-8 ore_emberite within 8 blocks of lava, 1-2 ore_coal | lava contact 4 dmg/s; adjacent-to-lava gather tick 1 dmg/s. ember_tonic (HB45) = 80% fire res, 6 min → the enabler |
| Meteor crater | R2 rare / R3 | R2 ~1 per 200×200; R3 ~1 per 110×110 | bowl 9-15 diam; rim 18-30 meteor_slag; floor 3-6 ore_meteoric + 1-2 ore_coal | slag rim must be broken through (pick 4) to reach floor nodes; craters are the ONLY meteoric_ore source |
| Veil rift | R3 only | ~1 per 130×130 | 8-14 riftstone, ambient purple light | guarded by caster-slot mobs (framework); riftstone is the only veil_flux source |

## 1.4 Gem-while-mining table (never nodes)

Trigger: one roll per successful gather on any ORE node or riftstone/basalt/slag (not clay/sand). `gemChance = ringBase × (1 + Mining/100) × (1 + luck) × milestoneMult`. Milestones: M30 ×1.25 → M85 ×1.5 (replaces) → M90 also 10% chance to upgrade result one tier. Luck = distance-luck param (0 spawn → ~1.0 deep R3) + gear/potions (silver_sapphire_ring +0.05, gold_veilstone_amulet +0.15, veilfire_elixir +0.25).

| Ring | ringBase | eff. @M20 (luck 0) | eff. @M50+M30 (luck 0.3) | eff. @M99+M85 (luck 0.8) |
|---|---|---|---|---|
| R0 | 1.0% | 1.20% | 1.95% | 5.37% |
| R1 | 1.5% | 1.80% | 2.93% | 8.06% |
| R2 | 2.2% | 2.64% | 4.29% | 11.8% |
| R3 | 3.0% | 3.60% | 5.85% | 16.1% |

Distribution when triggered (drops as uncut_*):

| Ring | uncut_sapphire | uncut_emerald | uncut_ruby | uncut_diamond | uncut_veilstone |
|---|---|---|---|---|---|
| R0 | 100% | — | — | — | — |
| R1 | 58% | 30% | 12% | — | — |
| R2 | 30% | 30% | 25% | 13% | 2% |
| R3 | 12% | 20% | 28% | 27% | 13% (×2 weight w/ M85 → 26%, renormalized) |

## 1.5 Rune essence roll (feeds RC)

| Rule | Value |
|---|---|
| Trigger | M5+, per successful gather, any rock node (same set as gems) |
| Chance | 6% flat, ×(1+luck); M90 → 12% |
| Qty | rune_essence ×1-2 |
| XP | +4 Mining bonus XP on proc |

## 1.6 Coal economy

| Side | Entry | Numbers |
|---|---|---|
| Source | ore_coal | all rings, 45s respawn, [3,6] charges → ~180-220 coal/hr focused |
| Sink: alloy | steel_bar | 2 coal per bar (LAW) |
| Sink: alloy | emberite_bar | 1 coal per bar (LAW) |
| Sink: fuel | furnace | every furnace action (any skill: SM bars, CR glass/pottery/silver/gold, C bread) draws fuel: 1 coal = 4 actions, or 1 any log = 1 action |
| Sink: vendor | coal | 6c |
| Budget | full steel kit (21 bars incl. shield) | 42 coal alloy + ~6 coal fuel ≈ 48 coal |
| Budget | full emberite kit (24 bars incl. flail) | 24 coal alloy + ~6 fuel ≈ 30 coal |

## 1.7 Ore/material coin values

| Item | Coin | Item | Coin |
|---|---|---|---|
| copper_ore | 4 | emberite_ore | 48 |
| clay | 2 | meteoric_ore | 95 |
| sand | 1 | veil_flux | 160 |
| iron_ore | 10 | rune_essence | 3 |
| coal | 6 | uncut_sapphire | 60 |
| silver_ore | 16 | uncut_emerald | 140 |
| gold_ore | 42 | uncut_ruby | 300 |
| basalt | 3 | uncut_diamond | 650 |
| — | — | uncut_veilstone | 1500 |

## 1.8 MINING 1-99 unlock table

| Lv | Unlock | Detail (exact numbers) | XP/action | Ring |
|---|---|---|---|---|
| 1 | ore_copper, clay_deposit, sand; copper_pickaxe/shovel usable | hand-mining allowed on these at ×3 time (bootstrap) | 18 / 10 / 3 | R0 |
| 5 | Rune essence rolls | 6% per gather, ×1-2 essence, +4 XP | — | all |
| 10 | Ore Sense I | ability: nodes within 12 blocks ping on minimap | — | all |
| 15 | ore_iron; iron_pickaxe | time ×0.92 | 40 | R0+ |
| 20 | ore_coal; ore_silver | silver_ore is Crafting's jewelry feed | 30 / 45 | all / R0-1 |
| 25 | Efficient Swings | flat additional ×0.90 gather time | — | — |
| 30 | Prospector I; basalt; steel_pickaxe | gem roll ×1.25; basalt → CN block; time ×0.84 | 8 (basalt) | R2 |
| 40 | ore_gold | gem roll ×1.25 on gold nodes | 75 | R1-2 |
| 45 | ore_emberite; meteor_slag; emberite_pickaxe | lava hazard rules §1.3; slag 3% meteoric fleck; time ×0.76 | 105 / 25 | R2 / R2-3 |
| 50 | Deep Veins | all ore node charge rolls +1 (min and max) | — | — |
| 60 | ore_meteoric; meteoric_pickaxe | crater-only; time ×0.68 | 160 | R2-3 |
| 70 | Ironsides Rhythm | crit-gather chance +5% flat (crit = double ore) | — | — |
| 75 | riftstone → veil_flux; veilsteel_pickaxe | 1.5% flat uncut_veilstone side-roll; time ×0.60 | 240 | R3 |
| 85 | Prospector II | gem roll ×1.5 (replaces ×1.25); veilstone weight ×2 in R3 | — | — |
| 90 | Master Miner | essence 12%; gem result upgrades one tier 10% of procs | — | — |
| 99 | Emberveil Forgeheart (capstone) | 10% chance of +1 bonus ore per gather; Ore Sense 24 blocks | — | — |

---

# PART 2 — SMITHING

## 2.1 Bootstrap chain (furnace-only, no anvil dead-lock)

| Step | Action | Station | Gate |
|---|---|---|---|
| 1 | hand-break stone/ore_copper/clay (×3 time) → rough_stone, copper_ore, clay | — | M1 |
| 2 | build furnace (8 rough_stone + 2 clay) | workbench | CN1 (CN agent) |
| 3 | copper_bar (1 copper_ore + fuel) | furnace | SM1 |
| 4 | CAST hammer/chisel/needle/knife (furnace castings, NOT anvil) | furnace | SM1 |
| 5 | build anvil_block (6 rough_stone + 2 copper_bar) | workbench | CN1-5 (CN agent — MUST stay ≤2 copper bars, no iron) |
| 6 | forge full copper kit (hammer in inventory required at anvil) | anvil_block | SM1+ |

Anvil rule: all `anvil_block` recipes require a hammer in inventory (tool check, not consumed).

## 2.2 Smelt chain (furnace; fuel per §1.6 applies on top)

| Lv | Output | Inputs (exact) | XP | Coin | Notes |
|---|---|---|---|---|---|
| SM1 | copper_bar ×1 | copper_ore ×1 | 15 | 10 | first recipe at lv1 ✔ |
| SM15 | iron_bar ×1 | iron_ore ×1 | 34 | 24 | |
| SM30 | steel_bar ×1 | iron_ore ×1 + coal ×2 | 60 | 58 | LAW ratio |
| SM45 | emberite_bar ×1 | emberite_ore ×2 + coal ×1 | 100 | 120 | LAW ratio |
| SM60 | meteoric_bar ×1 | meteoric_ore ×2 | 155 | 210 | |
| SM75 | veilsteel_bar ×1 | meteoric_bar ×1 + veil_flux ×1 | 270 | 400 | LAW ratio |
| SM10 | Bar Casting ability | — | — | — | batch-smelt 5 ore per action, all tiers |

(silver_bar CR20 and gold_bar CR40 are CRAFTING furnace recipes — not Smithing; ore supplied by Mining.)

## 2.3 Furnace castings & sundries

| Lv | Output (qty) | Inputs | Station | XP | Coin |
|---|---|---|---|---|---|
| SM1 | hammer ×1 | copper_bar ×1 | furnace | 8 | 12 |
| SM1 | chisel ×1 | copper_bar ×1 | furnace | 8 | 12 |
| SM1 | needle ×1 | copper_bar ×1 | furnace | 8 | 12 |
| SM1 | knife ×1 | copper_bar ×1 | furnace | 8 | 12 |
| SM5 | nails ×15 | copper_bar ×1 | anvil_block | 10 | 8/batch |
| SM15 | nails ×40 | iron_bar ×1 | anvil_block | 26 | 20/batch |
| SM25 | harpoon ×1 | iron_bar ×1 + willow_log ×1 | anvil_block | 70 | 95 |

## 2.4 Forge tables — per-metal kits (anvil_block, hammer required)

Uniform bar/plank costs (plank = matching-tier wood: copper↔oak, iron↔birch, steel↔willow, emberite↔spruce, meteoric↔duskwood, veilsteel↔veilwood):
sword 2b+1p · pickaxe 2b+2p · axe 2b+1p · shovel 1b+2p · hoe 1b+2p · helmet 2b · chestplate 4b · leggings 3b · boots 1b · shield 3b+1p (iron/steel/veilsteel only).

**COPPER (craft SM1-5 · equip ST1/D1/tool-gate M1/WC1/FA1/A1)**

| Lv | Item | Inputs | XP | Stats | Coin |
|---|---|---|---|---|---|
| 1 | copper_sword | 2 copper_bar + 1 oak_plank | 25 | atk 5, spd 2.4s | 30 |
| 1 | copper_pickaxe | 2 copper_bar + 2 oak_plank | 25 | power 1, ×1.00 | 32 |
| 1 | copper_axe | 2 copper_bar + 1 oak_plank | 25 | chop power 1, ×1.00 | 30 |
| 2 | copper_shovel | 1 copper_bar + 2 oak_plank | 15 | dig power 1 | 18 |
| 2 | copper_hoe | 1 copper_bar + 2 oak_plank | 15 | till power 1 | 18 |
| 3 | copper_helmet | 2 copper_bar | 24 | armor 2 | 28 |
| 3 | copper_boots | 1 copper_bar | 12 | armor 1 | 14 |
| 4 | copper_leggings | 3 copper_bar | 35 | armor 2 | 42 |
| 5 | copper_chestplate | 4 copper_bar | 45 | armor 3 | 56 |
| 5 | copper_hookblade (SIG) | 2 copper_bar + 1 leather | 40 | atk 4, spd 1.8s; on crit: bleed 1 dmg/2s ×4 | 55 |

Set total armor 8 → 21.1% reduction.

**IRON (craft SM15-20 · equip 15)**

| Lv | Item | Inputs | XP | Stats | Coin |
|---|---|---|---|---|---|
| 15 | iron_sword | 2 iron_bar + 1 birch_plank | 55 | atk 8, spd 2.4s | 70 |
| 15 | iron_pickaxe | 2 iron_bar + 2 birch_plank | 55 | power 2, ×0.92 | 72 |
| 15 | iron_axe | 2 iron_bar + 1 birch_plank | 55 | chop power 2 | 70 |
| 16 | iron_shovel | 1 iron_bar + 2 birch_plank | 30 | dig power 2 | 40 |
| 16 | iron_hoe | 1 iron_bar + 2 birch_plank | 30 | till power 2 | 40 |
| 17 | iron_helmet | 2 iron_bar | 55 | armor 3 | 68 |
| 17 | iron_boots | 1 iron_bar | 28 | armor 2 | 34 |
| 18 | iron_leggings | 3 iron_bar | 80 | armor 4 | 100 |
| 19 | iron_chestplate | 4 iron_bar | 105 | armor 5, evasion -1 | 135 |
| 20 | iron_shield | 3 iron_bar + 1 birch_plank | 85 | armor 3, block 8% | 105 |
| 20 | iron_greatmaul (SIG) | 4 iron_bar + 2 birch_plank | 115 | atk 13, spd 3.6s; knockback 2 blocks | 145 |

Set 14 (+shield 17) → 31.8% / 36.2%.

**STEEL (craft SM30-35 · equip 30)**

| Lv | Item | Inputs | XP | Stats | Coin |
|---|---|---|---|---|---|
| 30 | steel_sword | 2 steel_bar + 1 willow_plank | 95 | atk 12, spd 2.4s | 165 |
| 30 | steel_pickaxe | 2 steel_bar + 2 willow_plank | 95 | power 3, ×0.84 | 170 |
| 30 | steel_axe | 2 steel_bar + 1 willow_plank | 95 | chop power 3 | 165 |
| 31 | steel_shovel | 1 steel_bar + 2 willow_plank | 50 | dig power 3 | 95 |
| 31 | steel_hoe | 1 steel_bar + 2 willow_plank | 50 | till power 3 | 95 |
| 32 | steel_helmet | 2 steel_bar | 95 | armor 4 | 165 |
| 32 | steel_boots | 1 steel_bar | 48 | armor 3 | 82 |
| 33 | steel_leggings | 3 steel_bar | 140 | armor 5 | 245 |
| 34 | steel_chestplate | 4 steel_bar | 185 | armor 7, evasion -1 | 325 |
| 35 | steel_shield | 3 steel_bar + 1 willow_plank | 145 | armor 4, block 10% | 250 |
| 35 | steel_warpike (SIG) | 3 steel_bar + 2 willow_plank | 150 | atk 13, spd 2.8s; +1 block melee reach | 260 |

Set 19 (+shield 23) → 38.8% / 43.4%.

**EMBERITE (craft SM45-50 · equip 45)**

| Lv | Item | Inputs | XP | Stats | Coin |
|---|---|---|---|---|---|
| 45 | emberite_sword | 2 emberite_bar + 1 spruce_plank | 150 | atk 16, spd 2.4s; 10% on-hit burn 2 dmg/2s ×3 | 340 |
| 45 | emberite_pickaxe | 2 emberite_bar + 2 spruce_plank | 150 | power 4, ×0.76 | 345 |
| 45 | emberite_axe | 2 emberite_bar + 1 spruce_plank | 150 | chop power 4 | 340 |
| 46 | emberite_shovel | 1 emberite_bar + 2 spruce_plank | 78 | dig power 4 | 195 |
| 46 | emberite_hoe | 1 emberite_bar + 2 spruce_plank | 78 | till power 4 | 195 |
| 47 | emberite_helmet | 2 emberite_bar | 150 | armor 5, fire res +6% | 340 |
| 47 | emberite_boots | 1 emberite_bar | 75 | armor 4, fire res +6% | 170 |
| 48 | emberite_leggings | 3 emberite_bar | 220 | armor 7, fire res +6% | 505 |
| 49 | emberite_chestplate | 4 emberite_bar | 295 | armor 9, fire res +7% | 670 |
| 50 | emberite_flame_flail (SIG) | 3 emberite_bar + 1 spruce_plank + 1 ember_ash | 240 | atk 15, spd 3.0s; 100% on-hit burn 2 dmg/2s ×4 (8 total) | 560 |

Set 25 → 45.5%; full set fire res 25% (stacks to 100% w/ ember_tonic — lava-proof miner build).

**METEORIC (craft SM60-65 · equip 60)**

| Lv | Item | Inputs | XP | Stats | Coin |
|---|---|---|---|---|---|
| 60 | meteoric_sword | 2 meteoric_bar + 1 duskwood_plank | 230 | atk 21, spd 2.4s | 590 |
| 60 | meteoric_pickaxe | 2 meteoric_bar + 2 duskwood_plank | 230 | power 5, ×0.68 | 595 |
| 60 | meteoric_axe | 2 meteoric_bar + 1 duskwood_plank | 230 | chop power 5 | 590 |
| 61 | meteoric_shovel | 1 meteoric_bar + 2 duskwood_plank | 120 | dig power 5 | 330 |
| 61 | meteoric_hoe | 1 meteoric_bar + 2 duskwood_plank | 120 | till power 5 | 330 |
| 62 | meteoric_helmet | 2 meteoric_bar | 230 | armor 7 | 590 |
| 62 | meteoric_boots | 1 meteoric_bar | 115 | armor 5, knockback resist 50% | 295 |
| 63 | meteoric_leggings | 3 meteoric_bar | 340 | armor 9 | 880 |
| 64 | meteoric_chestplate | 4 meteoric_bar | 450 | armor 12, evasion -2 | 1180 |
| 65 | meteoric_star_maul (SIG) | 4 meteoric_bar + 2 duskwood_plank | 470 | atk 22, spd 4.0s; AoE slam: adjacent targets 60% dmg + 0.8s stun (6s per-target ICD) | 1200 |

Set 33 → 52.4%.

**VEILSTEEL (craft SM75-90 · equip 75)**

| Lv | Item | Inputs | XP | Stats | Coin |
|---|---|---|---|---|---|
| 75 | veilsteel_sword | 2 veilsteel_bar + 1 veilwood_plank | 370 | atk 27, spd 2.4s | 1130 |
| 75 | veilsteel_pickaxe | 2 veilsteel_bar + 2 veilwood_plank | 370 | power 6, ×0.60 | 1140 |
| 75 | veilsteel_axe | 2 veilsteel_bar + 1 veilwood_plank | 370 | chop power 6 | 1130 |
| 76 | veilsteel_shovel | 1 veilsteel_bar + 2 veilwood_plank | 190 | dig power 6 | 620 |
| 76 | veilsteel_hoe | 1 veilsteel_bar + 2 veilwood_plank | 190 | till power 6 | 620 |
| 77 | veilsteel_helmet | 2 veilsteel_bar | 370 | armor 9 | 1130 |
| 77 | veilsteel_boots | 1 veilsteel_bar | 185 | armor 6 | 565 |
| 78 | veilsteel_leggings | 3 veilsteel_bar | 545 | armor 11 | 1690 |
| 79 | veilsteel_chestplate | 4 veilsteel_bar | 720 | armor 15, evasion -2 | 2250 |
| 85 | veilsteel_shield | 3 veilsteel_bar + 1 veilwood_plank | 560 | armor 6, block 14% | 1700 |
| 90 | veilsteel_riftblade (SIG) | 3 veilsteel_bar + 1 veilwood_plank + 1 veilstone | 590 | atk 25, spd 2.4s; phase strike: ignores 30% of target armor | 1850 |

Set 41 (+shield 47) → 57.7% / 61.0%. Riftblade vs armor-30 target: effective armor 21 → 41.2% reduction instead of 50%.

## 2.5 SMITHING 1-99 unlock ladder (summary spine)

| Lv | Unlock |
|---|---|
| 1 | copper_bar; cast hammer/chisel/needle/knife (furnace); copper sword/pickaxe/axe |
| 2-5 | copper shovel/hoe → helmet/boots → leggings → chestplate + copper_hookblade + nails×15 |
| 10 | Bar Casting: smelt 5 ore per action |
| 15 | iron_bar; iron sword/pickaxe/axe; nails×40 |
| 16-20 | iron shovel/hoe → helm/boots → legs → chest → iron_shield + iron_greatmaul |
| 25 | harpoon |
| 30 | steel_bar; steel sword/pickaxe/axe |
| 31-35 | steel shovel/hoe → helm/boots → legs → chest → steel_shield + steel_warpike |
| 40 | Masterwork I: 5% chance forged item gets +1 atk or +1 armor |
| 45 | emberite_bar; emberite sword/pickaxe/axe |
| 46-50 | emberite shovel/hoe → helm/boots → legs → chest → emberite_flame_flail |
| 60 | meteoric_bar; meteoric sword/pickaxe/axe |
| 61-65 | meteoric shovel/hoe → helm/boots → legs → chest → meteoric_star_maul |
| 70 | Starforge Insight: Masterwork 10%; meteoric smelts ×2 per action |
| 75 | veilsteel_bar; veilsteel sword/pickaxe/axe |
| 76-79 | veilsteel shovel/hoe → helm/boots → legs → chest |
| 85 | veilsteel_shield |
| 90 | veilsteel_riftblade |
| 99 | Forgemaster of Emberveil (capstone): Masterwork 20%; signature-weapon proc rates +25% on gear you forged |

---

# CROSS-SKILL CONTRACTS

**MINING CONSUMES**
| From | Item | Level | Qty |
|---|---|---|---|
| Smithing | copper→veilsteel pickaxe | SM1/15/30/45/60/75 | 1 per tier |
| Smithing | copper→veilsteel shovel (clay/sand) | SM2+ | 1 per tier |
| Herblore | ember_tonic (lava-adjacent emberite mining) | HB45 | ~1 per 6-min lava session |
| Construction | anvil-era not needed; access ramps/torches into craters & rifts | cn_* | ad hoc |
| Cooking/HL | food vs hazard chip damage | any | ad hoc |

**MINING PROVIDES**
| To | Item | Gate | Rate/Qty |
|---|---|---|---|
| Smithing | copper_ore/iron_ore/coal/emberite_ore/meteoric_ore/veil_flux | M1/15/20/45/60/75 | per §2.2 ratios; coal 2:1 steel, 1:1 emberite |
| Crafting | silver_ore (→silver_bar CR20) | M20 | 2 ore per bar (CR sets ratio) |
| Crafting | gold_ore (→gold_bar CR40) | M40 | 2 ore per bar |
| Crafting | ALL uncut gems (sapphire→veilstone) | M1+, table §1.4 | 1-16% per gather by ring/level |
| Crafting | sand (glass), clay (pottery) | M1 shovel | 1-2 per dig |
| Runecraft | rune_essence | M5+ | 6-12% per gather, ×1-2 |
| Herblore | uncut_veilstone (veilfire_elixir) | via gem table | R3 stream |
| Construction | basalt (dark block) | M30 | 1 per break |
| Cooking/CR/SM | coal as universal furnace fuel | M20 | 1 coal = 4 furnace actions |
| Economy | ores/gems vendor values §1.7 | — | — |

**SMITHING CONSUMES**
| From | Item | Level | Qty |
|---|---|---|---|
| Mining | all ores + coal + veil_flux | see §2.2 | 18-24 bars ≈ full kit |
| Fletching | oak/birch/willow/spruce/duskwood/veilwood planks | FL1/15/30/45/60/75 | 8 per kit (+1 shield, +1-2 sig) |
| Woodcutting | willow_log (harpoon) | WC30 | 1 |
| Crafting | leather (copper_hookblade) | CR1 | 1 |
| Crafting | veilstone cut gem (riftblade) | CR75 | 1 |
| Foraging | ember_ash (flame_flail) | FO35 | 1 |
| Construction | furnace (CN1), anvil_block (CN1-5: 6 rough_stone + 2 copper_bar MAX — furnace-only bootstrap LAW), workbench | CN1-5 | stations |

**SMITHING PROVIDES**
| To | Item | Gate | Qty |
|---|---|---|---|
| Mining/WC/FA/Arch | pickaxe/axe/shovel/hoe lines, 6 tiers | SM1-79 | tool power 1-6, time mults §1.1 |
| Fishing | harpoon (F45/F65) | SM25 | 1 |
| Strength/Defense | 6 metal kits + 6 signature weapons + 3 shields | equip ST/D at 1/15/30/45/60/75 | stats §2.4 |
| Fletching | copper_bar→veilsteel_bar for ammo | arrow batch: 1 bar → 15 arrows (FL); bolt batch: 1 bar → 12 bolts | per FL recipes |
| Fletching | crossbow limbs: iron_bar ×2 (light R15), emberite_bar ×2 (heavy R45), veilsteel_bar ×2 (veil R75) | SM15/45/75 | 2 per crossbow |
| Crafting | iron_bar ×1 per studded piece (R15 set); emberite_bar ×1 per emberhide piece (R45 set); chisel/needle (SM1) | SM1-45 | as listed |
| Herblore | (via CR) glass chain untouched — no SM input; SM supplies no vials | — | — |
| Construction | nails ×15 (SM5 copper) / ×40 (SM15 iron) | SM5/15 | per CN build recipes |
| Beastlore/Slayer | none direct (gear only) | — | — |

# REGISTRY GAPS
1. **No hand-tier/crude tool ids** — bootstrap requires the "bare hands ×3 time on ore_copper/clay/sand/stone" rule stated in §1.1/§2.1, or add a `crude_pickaxe`-class id. Rule adopted here; flag for owner.
2. **rough_stone** (meteor_slag drop, furnace/anvil build input) — engine block namespace, not in the 288; assumed retained like `sand`/`clay`. Needs confirmation.
3. **nails vs iron_bar gate** — registry lists nails at SM5 but iron_bar (SM15) as its metal; resolved with dual recipe (copper ×15 @SM5, iron ×40 @SM15). Flag if single-recipe intended.
4. **anvil_block build recipe** — retained station with no owner recipe in registry; assigned to Construction agent with the ≤2 copper_bar furnace-only constraint (LAW dependency, must not use iron).
5. **harpoon (SM25) needs willow_log (WC30)** — 5-level cross-gate; intentional per registry but worth owner eyes (vendor willow_log or accept trade dependency).


# PART 2 — WOODCUTTING & FLETCHING

# WOODCUTTING — COMPLETE 1-99

Engine notes applied (from `/home/user/test1/js/game/skills.js`, `/home/user/test1/js/game/nodes.js`): XP curve `60n^2.4+80n` → 99 costs ~3,602,000 XP. All gathers get crit double-yield `4%+0.16%/lvl`; gather time scales `-0.6%/lvl` (floor 45% of base). Rare-drop chances below are base; engine multiplies by `(1+luck)`, luck = distance ring (R0=0, R1=0.5, R2=1.0, R3=1.5 per worldgen distance-luck rule).

## WC Unlock Table

| Lv | Unlock | Detail (numbers) |
|---|---|---|
| 1 | tree_oak | chop with copper_axe+ |
| 5 | Keen Edge I | -5% chop time (multiplies level scaling) |
| 10 | Nest Watcher | tree rare-drop chances ×1.5 |
| 15 | tree_birch | needs iron_axe (tool tier = tree tier throughout) |
| 20 | Timber I | +4% double-log chance (adds to crit) |
| 25 | Efficient Felling | oak/birch charges min +1 (oak 4-5, birch 4-6) |
| 30 | tree_willow | needs steel_axe; spawns only within 6 blocks of water |
| 35 | Timber II | double-log total +8% |
| 40 | Wastenot | 10% chance a gather consumes no node charge |
| 45 | tree_spruce | needs emberite_axe; mountain/tundra biomes |
| 50 | Timber III | double-log total +12% |
| 55 | Sap Reader | tree rare-drop chances ×2.0 (replaces Nest Watcher ×1.5) |
| 60 | tree_duskwood | needs meteoric_axe; R2-3 dark-forest biome |
| 65 | Timber IV | double-log total +16% |
| 70 | Heartwood Strike | crit gathers on willow+ yield 3 logs instead of 2 |
| 75 | tree_veilwood | needs veilsteel_axe; R3 only |
| 80 | Veil Attunement | tree_veilwood charges +1 (4-7) |
| 85 | Timber V | double-log total +20% |
| 90 | Master Feller | -10% further chop time; floor lowered to 40% for WC |
| 99 | Arborlord of Emberveil | +25% WC XP; Wastenot → 20%; title |

## WC Node Table (nodes.js schema: xp/time/charges/respawn; every field final)

| node id | ring/biome | lv | axe | XP/log | time(s) | charges | respawn(s) | trunk/canopy | drop | rare drops (base %, ×(1+luck), ×Nest/Sap) |
|---|---|---|---|---|---|---|---|---|---|---|
| tree_oak | R0+ all temperate | 1 | copper | 18 | 2.8 | [3,5] | 40 | [4,6] round | oak_log 1 | feather 3%, wildberries 2% |
| tree_birch | R0-1 meadows/hills | 15 | iron | 42 | 3.4 | [3,6] | 90 | [5,7] round | birch_log 1 | feather 4%, wildberries 2% |
| tree_willow | any ring, ≤6 blk from water | 30 | steel | 75 | 4.0 | [4,6] | 160 | [5,7] round | willow_log 1 | flax 5% (wild-flax bootstrap), feather 3% |
| tree_spruce | R1+ mountains/tundra | 45 | emberite | 120 | 4.6 | [4,6] | 240 | [6,9] cone | spruce_log 1 | feather 5%, sinew 2% (snagged in boughs) |
| tree_duskwood | R2-3 dark forest | 60 | meteoric | 175 | 5.2 | [4,7] | 360 | [6,9] cone | duskwood_log 1 | silk_thread 5% (webs), duskmoss 3% (bark growth) |
| tree_veilwood | R3 only | 75 | veilsteel | 250 | 6.0 | [3,6] | 540 | [7,10] round | veilwood_log 1 | silk_thread 4%, veilblossom 3% |

Spawn density per chunk (guidance for worldgen): oak 6-10 R0 / 3-5 R1+; birch 3-5 R0-1; willow 2-3 per water feature; spruce 4-6 in mountain/tundra; duskwood 3-5 in dark forest; veilwood 1-2 per R3 grove.

## Log & Plank Economy

| item | coin | source | sinks |
|---|---|---|---|
| oak_log | 2 | tree_oak | oak_plank, oak_shortbow/longbow/staff, copper_arrow batch, fishing_rod, campfire fuel (1 log = 60s burn) |
| birch_log | 6 | tree_birch | birch_plank, birch bows/staff, iron_arrow batch |
| willow_log | 14 | tree_willow | willow_plank, willow bows/staff, steel_arrow batch, harpoon (SM25) |
| spruce_log | 26 | tree_spruce | spruce_plank, spruce bows/staff, emberite_arrow batch |
| duskwood_log | 45 | tree_duskwood | duskwood_plank, duskwood bows/staff, meteoric_arrow batch |
| veilwood_log | 80 | tree_veilwood | veilwood_plank, veilwood bows/staff, veilsteel_arrow batch, veil_crossbow (via plank) |
| oak_plank | 1 | FL1 saw | cn_* builds, pestle_and_mortar, bird_snare (CR1) |
| birch_plank | 2 | FL15 saw | cn_* builds, light_crossbow stock, iron/steel bolt batches |
| willow_plank | 5 | FL30 saw | cn_* builds, lobster_cage (CR50) |
| spruce_plank | 8 | FL45 saw | cn_* builds, heavy_crossbow stock, emberite/meteoric bolt batches |
| duskwood_plank | 14 | FL60 saw | cn_* builds |
| veilwood_plank | 25 | FL75 saw | cn_* cap builds, veil_crossbow stock, veilsteel_bolt batch |

---

# FLETCHING — COMPLETE 1-99

All recipes at **workbench**, **knife** (SM1) in inventory required. Craft level = equip level for every weapon/ammo (no dead windows). Bowstring may be substituted 1:1 by **sinew** in any bow/crossbow recipe (deliberate mob-drop valve). Arrows batch 15; bolts batch 12 (hard-lesson compliant). Burn DoT listed as dmg/sec×duration.

## FL Recipe & Unlock Table

| Lv | Output (qty) | Exact inputs | XP | Stats (atk / interval s / effect) | Coin (ea) | Notes |
|---|---|---|---|---|---|---|
| 1 | oak_plank ×4 | 1 oak_log | 10 | — | 1 | first recipe at lv1 (bootstrap rule) |
| 1 | oak_shortbow | 1 oak_log + 1 bowstring | 20 | atk 4 / 1.8 | 12 | equip R1 |
| 1 | oak_staff | 1 oak_log + 1 glass_orb + 1 bowstring (grip) | 25 | bash 2 / 2.4; +2 spell power | 30 | equip MG1; casts tier-1 spells |
| 1 | copper_arrow ×15 | 1 oak_log + 1 copper_bar + 3 feather | 15 | tip +2 | 1 | |
| 1 | pestle_and_mortar | 1 oak_plank | 8 | tool: HB grinding | 5 | |
| 5 | oak_longbow | 2 oak_log + 1 bowstring | 30 | atk 6 / 2.6, +2 range | 20 | equip R5 |
| 5 | fishing_rod | 1 oak_log + 1 bowstring | 18 | tool: enables F10+ rod fishing; feather on hook = fly-fishing (river) | 10 | |
| 10 | Steady Hands | passive | — | -5% fletch time | — | |
| 15 | birch_plank ×4 | 1 birch_log | 22 | — | 2 | |
| 15 | birch_shortbow | 1 birch_log + 1 bowstring | 45 | atk 7 / 1.8 | 35 | equip R15 |
| 15 | birch_staff | 1 birch_log + 1 glass_orb + 1 bowstring | 55 | bash 3 / 2.4; +5 spell power | 70 | equip MG15 |
| 15 | iron_arrow ×15 | 1 birch_log + 1 iron_bar + 3 feather | 35 | tip +4 | 2 | |
| 15 | iron_bolt ×12 | 1 birch_plank + 1 iron_bar + 1 feather | 40 | tip +6 | 3 | crossbow line starts iron (deliberate) |
| 15 | light_crossbow | 2 iron_bar + 1 birch_plank + 1 bowstring | 90 | atk 12 / 2.2, ignores 10% armor | 90 | equip R15 |
| 20 | birch_longbow | 2 birch_log + 1 bowstring | 60 | atk 10 / 2.6, +2 range | 55 | equip R20 |
| 25 | Bundle Fletcher | passive | — | arrow batches +1 (16) | — | |
| 30 | willow_plank ×4 | 1 willow_log | 40 | — | 5 | |
| 30 | willow_shortbow | 1 willow_log + 1 bowstring | 80 | atk 11 / 1.8 | 80 | equip R30 |
| 30 | willow_staff | 1 willow_log + 1 glass_orb + 1 bowstring | 95 | bash 4 / 2.4; +9 spell power | 140 | equip MG30 |
| 30 | steel_arrow ×15 | 1 willow_log + 1 steel_bar + 3 feather | 60 | tip +7 | 4 | |
| 30 | steel_bolt ×12 | 1 birch_plank + 1 steel_bar + 1 feather | 68 | tip +10 | 6 | |
| 35 | willow_longbow | 2 willow_log + 1 bowstring | 100 | atk 15 / 2.6, +2 range | 120 | equip R35 |
| 40 | Fine Sawing | passive | — | 10% chance plank saw yields 5 | — | |
| 45 | spruce_plank ×4 | 1 spruce_log | 62 | — | 8 | |
| 45 | spruce_shortbow | 1 spruce_log + 1 bowstring | 120 | atk 16 / 1.8 | 150 | equip R45 |
| 45 | spruce_staff | 1 spruce_log + 1 glass_orb + 1 bowstring | 140 | bash 5 / 2.4; +14 spell power | 240 | equip MG45 |
| 45 | emberite_arrow ×15 | 1 spruce_log + 1 emberite_bar + 3 feather | 95 | tip +10, burn 1/s×3s | 7 | |
| 45 | emberite_bolt ×12 | 1 spruce_plank + 1 emberite_bar + 1 feather | 105 | tip +14, burn 2/s×3s | 9 | |
| 45 | heavy_crossbow | 2 emberite_bar + 1 spruce_plank + 1 bowstring | 200 | atk 24 / 2.8, ignores 15% armor | 400 | equip R45 |
| 50 | spruce_longbow | 2 spruce_log + 1 bowstring | 150 | atk 21 / 2.6, +2 range | 220 | equip R50 |
| 55 | Bolt Binder | passive | — | bolt batches +1 (13) | — | |
| 60 | duskwood_plank ×4 | 1 duskwood_log | 90 | — | 14 | |
| 60 | duskwood_shortbow | 1 duskwood_log + 1 bowstring | 170 | atk 22 / 1.8 | 260 | equip R60 |
| 60 | duskwood_staff | 1 duskwood_log + 1 glass_orb + 1 bowstring | 200 | bash 6 / 2.4; +20 spell power | 400 | equip MG60 |
| 60 | meteoric_arrow ×15 | 1 duskwood_log + 1 meteoric_bar + 3 feather | 140 | tip +14 | 11 | |
| 60 | meteoric_bolt ×12 | 1 spruce_plank + 1 meteoric_bar + 1 feather | 155 | tip +19 | 14 | |
| 65 | duskwood_longbow | 2 duskwood_log + 1 bowstring | 210 | atk 28 / 2.6, +2 range | 380 | equip R65 |
| 70 | Twin Bundles | passive | — | 10% chance ammo batch doubles | — | |
| 75 | veilwood_plank ×4 | 1 veilwood_log | 130 | — | 25 | |
| 75 | veilwood_shortbow | 1 veilwood_log + 1 bowstring | 240 | atk 30 / 1.8 | 500 | equip R75 |
| 75 | veilwood_staff | 1 veilwood_log + 1 glass_orb + 1 bowstring | 320 | bash 8 / 2.4; +28 spell power, 5% rune-save | 900 | equip MG75 |
| 75 | veilsteel_arrow ×15 | 1 veilwood_log + 1 veilsteel_bar + 3 feather | 200 | tip +19 | 16 | |
| 75 | veilsteel_bolt ×12 | 1 veilwood_plank + 1 veilsteel_bar + 1 feather | 220 | tip +25 | 20 | |
| 75 | veil_crossbow | 2 veilsteel_bar + 1 veilwood_plank + 1 bowstring | 380 | atk 40 / 2.4, ignores 20% armor | 1100 | equip R75 (cap) |
| 80 | veilwood_longbow | 2 veilwood_log + 1 bowstring | 300 | atk 38 / 2.6, +3 range | 750 | equip R80 |
| 85 | Master's Draw | passive | — | -15% further fletch time (total -20%) | — | |
| 90 | Flawless Grain | passive | — | bows/staves/xbows fletch at +10% coin value (vendor) | — | |
| 99 | Grand Fletcher of Emberveil | passive | — | ammo batches +3, 10% chance metal bar refunded on ammo crafts; title | — | |

Total damage at cap (reference for combat agent, vs `armor/(armor+30)` mitigation): veilwood_shortbow + veilsteel_arrow = 49 per 1.8s; veil_crossbow + veilsteel_bolt = 65 per 2.4s with 20% armor pierce; both gated R75.

---

# CROSS-SKILL CONTRACTS

## Consumes (item ← provider skill @ level, qty per craft)

| Item | From | Level | Qty | Used in |
|---|---|---|---|---|
| bowstring | Crafting (loom, 2 flax) | CR1 | 1 | every bow, longbow, staff, crossbow, fishing_rod |
| sinew | mob framework (beast slots R0+) / Hunter | HU1+ | 1 | accepted 1:1 substitute for bowstring in all bow/xbow recipes |
| glass_orb | Crafting (furnace, 2 sand) | CR25 | 1 | all 6 staves |
| knife | Smithing | SM1 | tool | required for all FL crafts |
| copper_bar | Smithing | SM1 | 1/batch | copper_arrow |
| iron_bar | Smithing | SM15 | 1/batch; 2/xbow | iron_arrow, iron_bolt, light_crossbow |
| steel_bar | Smithing | SM30 | 1/batch | steel_arrow, steel_bolt |
| emberite_bar | Smithing | SM45 | 1/batch; 2/xbow | emberite_arrow/bolt, heavy_crossbow |
| meteoric_bar | Smithing | SM60 | 1/batch | meteoric_arrow/bolt |
| veilsteel_bar | Smithing | SM75 | 1/batch; 2/xbow | veilsteel_arrow/bolt, veil_crossbow |
| feather | Hunter (bird_snare HU1) / flyer mob slots | HU1+ | 3/arrow batch, 1/bolt batch | all ammo |
| axes (copper→veilsteel) | Smithing | SM1-75 | tool | WC tree tiers 1/15/30/45/60/75 |

## Provides (item → consumer skill @ level, qty)

| Item | To | Level | Qty/use |
|---|---|---|---|
| oak/birch/willow/spruce/duskwood/veilwood_plank | Construction (cn_* builds) | CN1-75 | per CN agent tables |
| oak_plank | Crafting (bird_snare CR1), Herblore via pestle_and_mortar | CR1/HB1 | 1 |
| willow_plank | Crafting (lobster_cage) | CR50 | 1 |
| all bows/crossbows + ammo | Ranged (equip-gated R1-80) | R1-80 | — |
| all 6 staves | Magic (equip MG1-75; spell_* costs from §9 runes) | MG1-75 | — |
| fishing_rod | Fishing | F10+ | tool |
| pestle_and_mortar | Herblore | HB1 | tool |
| logs (any) | Cooking campfire fuel | C1 | 1 log = 60s burn |
| flax (willow rare 5%) | Crafting/Herblore lv-1 bootstrap (pre-FA20 valve) | CR1/HB1 | — |
| silk_thread (duskwood 5%, veilwood 4%) | Crafting silk_cloth (3/cloth) | CR30 | — |
| duskmoss (duskwood 3%) | Herblore 50/60 potions, gloomweave dye | HB50+/CR60 | — |
| veilblossom (veilwood 3%) | Herblore veilfire_elixir, veilcloth | HB75/CR75 | — |
| feather/wildberries/sinew (tree rares) | FL ammo, HB/C recipes, string substitute | various | — |
| beast_trophy (CN mount) | n/a here | — | — |

# REGISTRY GAPS
None — all ids used above are in the 288 or retained-engine namespaces. Deliberate folds (not gaps): no arrow_shaft/headless-arrow or unstrung-bow intermediates (single-step fletch); no crossbow-limb ids (bars consumed directly); staves assigned to Fletching craft. Orchestrator note: oak_staff (MG1 equip) requires glass_orb (CR25) — recommend a vendor-stocked oak_staff (~45 coin) to avoid a Magic lv-1 cross-skill bootstrap wall; flagging, not re-litigating.


# PART 3 — FISHING & COOKING

Engine mechanics verified (xpForLevel = 60·n^2.4+80n; maxHp = 30+2×Hitpoints lv → 32 @lv1, 130 @50, 228 @99; nodes.js schema xp/time/charges/respawn + weighted drop tables with per-entry `level` gates + `rare` luck rolls; gatherTimeMult floor 45%; `fishing_spot` kind:'water' parameterized). All heal values below are calibrated to ~15-22% of contemporaneous maxHp. Deliverable follows.

# FISHING (1-99)

## F-1. Unlock Table
Ring luck rule applies to all rare rolls: chance × (1+luck), luck from distance.

| Lv | Unlock | Inputs (per action) | Station/Tool | XP/action | Output stats | Coin (base) | Ring |
|---|---|---|---|---|---|---|---|
| 1 | raw_shrimp @ spot:shore_net | — | small_net | 20 | → cooked_shrimp (heal 6) | raw 2 | R0+ |
| 5 | Rod casting at shore (shrimp via rod, faster XP) | — | fishing_rod | 24 | same catch, teaches rod | raw 2 | R0+ |
| 10 | raw_cod @ spot:sea_rod | — | fishing_rod | 34 | → cooked_cod (heal 10) | raw 5 | R0+ |
| 15 | Sure Hands: +3% double-catch (all spots) | — | passive | — | 2× fish on proc | — | — |
| 20 | raw_trout @ spot:river_fly | 1 feather (fly) | fishing_rod | 48 | → cooked_trout (heal 13) | raw 9 | R0-1 |
| 25 | Net Mastery: shore_net 20% chance 2× shrimp | — | passive | — | — | — | — |
| 30 | raw_salmon @ spot:river_fly | 1 feather | fishing_rod | 62 | → cooked_salmon (heal 17) | raw 14 | R0-1 |
| 35 | Strong Line: coin-cache rare chance ×1.5 | — | passive | — | see F-2 rares | — | — |
| 40 | Chum the Waters: all spot charges +1 | — | passive | — | — | — | — |
| 45 | raw_tuna @ spot:harpoon_reef | — | harpoon | 82 | → cooked_tuna (heal 22) | raw 22 | R1+ |
| 50 | Double-catch +3% (6% total) | — | passive | — | — | — | — |
| 55 | raw_lobster @ spot:cage_reef | — | lobster_cage | 98 | → cooked_lobster (heal 28) | raw 32 | R1+ |
| 60 | Deep Casts: −10% catch time at reef spots | — | passive | — | — | — | — |
| 65 | raw_swordfish @ spot:harpoon_reef | — | harpoon | 118 | → cooked_swordfish (heal 34) | raw 45 | R2+ |
| 70 | Tide Hoard: coin-cache amounts ×2 | — | passive | — | — | — | — |
| 75 | Veil-Touched Line: +10% Fishing XP at R3 spots | — | passive | — | — | — | — |
| 80 | raw_glowfin @ spot:glow_lake | — | fishing_rod | 148 | → cooked_glowfin (heal 42+glow) | raw 70 | R2-3 |
| 85 | Double-catch +4% (10% total) | — | passive | — | — | — | — |
| 90 | raw_veilray @ spot:veil_deep | — | harpoon | 188 | → cooked_veilray (heal 50) | raw 110 | R3 |
| 95 | Master Angler: −10% catch time everywhere | — | passive | — | — | — | — |
| 99 | Legend of the Deep: double-catch 15% total; coin caches ×1.25 | — | capstone | — | — | — | — |

## F-2. Spot Node Table (engine `fishing_spot`, parameterized via meta.variant; kind:'water', per-catch XP overrides node xp)

| Variant | Placement | Ring | Tool | Lv | Time(s) | Charges | Respawn(s) | Catch table (weight, min lv) | Rare (chance × (1+luck)) |
|---|---|---|---|---|---|---|---|---|---|
| shore_net | sea/lake shore | R0+ | small_net | 1 | 3.5 | [4,7] | 40 | raw_shrimp w1 lv1 | coin 5-15 @0.02 |
| sea_rod | sea shore | R0+ | fishing_rod | 10 | 4.5 | [3,6] | 50 | raw_cod w1 lv10 | coin 5-15 @0.02 |
| river_fly | rivers | R0-1 | fishing_rod +1 feather | 20 | 4.5 | [3,6] | 60 | raw_trout w5 lv20 · raw_salmon w3 lv30 | coin 15-40 @0.02 |
| harpoon_reef | deep sea | R1+ | harpoon | 45 | 6.0 | [3,5] | 90 | raw_tuna w5 lv45 · raw_swordfish w2 lv65 | coin 40-90 @0.02 |
| cage_reef | deep sea | R1+ | lobster_cage | 55 | 6.0 | [3,5] | 90 | raw_lobster w1 lv55 | coin 40-90 @0.02 |
| glow_lake | glowing lakes | R2-3 | fishing_rod | 80 | 7.0 | [2,4] | 150 | raw_glowfin w1 lv80 | coin 90-200 @0.025 |
| veil_deep | R3 abyssal coast | R3 | harpoon | 90 | 8.0 | [2,4] | 210 | raw_veilray w1 lv90 | coin 90-200 @0.03 |

Catch speed scales by engine gatherTimeMult (−0.6%/lv, floor 45%); crit (engine critChance) = double yield.

## F-3. Tool Provenance (consumed slots, not per-catch)

| Tool | Source | Craft inputs | Gate |
|---|---|---|---|
| small_net | CR1 | 2 linen_cloth | F1 use |
| fishing_rod | FL5 | 1 oak_log + 1 bowstring | F5 use (rod), F10 sea, F20 river |
| harpoon | SM25 | 1 iron_bar + 1 willow_log | F45 use |
| lobster_cage | CR50 | 2 willow_plank + 1 linen_cloth | F55 use |

# COOKING (1-99)

**Burn rule:** burn% = max(0, base − 2.5×(CookLv − reqLv) − perks − station bonus). Furnace grants −5% on any fish dish. Burnt action destroys the raw input, yields NO item, grants 15% of dish XP. Perk reductions: −3% @25, −3% @40, −4% @60, −5% @85 (cumulative −15%); lv99 = never burn.

## C-1. Unlock Table (heal calibrated to maxHp = 30+2×HP lv)

| Lv | Unlock | Inputs (exact) | Station | XP | Heal / buff | Burn base → no-burn lv | Coin | Ring src |
|---|---|---|---|---|---|---|---|---|
| 1 | cooked_shrimp | 1 raw_shrimp | campfire | 16 | heal 6 | 25% → 11 | 3 | R0+ |
| 1 | cooked_meat | 1 raw_meat | campfire | 16 | heal 7 | 25% → 11 | 6 | all |
| 5 | bread | 3 wheat | furnace | 20 | heal 8 | 20% → 13 | 8 | R0+ |
| 10 | cooked_cod | 1 raw_cod | campfire | 30 | heal 10 | 25% → 20 | 8 | R0+ |
| 10 | beast_treat | 1 cooked_meat + 1 wildberries + 1 bone | campfire | 22 | BL taming consumable (no heal) | 0% | 12 | all |
| 15 | hearty_stew | 1 fired_bowl + 1 raw_meat + 1 wheat (bowl consumed) | campfire | 45 | heal 14 + regen 1 HP/10s for 60s | 15% → 21 | 30 | R0+ |
| 20 | cooked_trout | 1 raw_trout | campfire | 42 | heal 13 | 25% → 30 | 14 | R0-1 |
| 25 | Steady Hands: −3% burn (all dishes) | — | passive | — | — | — | — | — |
| 30 | cooked_salmon | 1 raw_salmon | campfire | 56 | heal 17 | 28% → 42 | 21 | R0-1 |
| 35 | Batch Cooking: queue 5 per station visit (time only) | — | passive | — | — | — | — | — |
| 40 | Even Coals: −3% burn (−6% total) | — | passive | — | — | — | — | — |
| 45 | cooked_tuna | 1 raw_tuna | campfire | 74 | heal 22 | 30% → 57 | 33 | R1+ |
| 50 | Seasoned Palate: cooked fish +10% coin value | — | passive | — | — | — | — | — |
| 55 | cooked_lobster | 1 raw_lobster | campfire | 90 | heal 28 | 30% → 67 | 48 | R1+ |
| 60 | Firewatcher: −4% burn (−10% total) | — | passive | — | — | — | — | — |
| 65 | cooked_swordfish | 1 raw_swordfish | campfire | 108 | heal 34 | 35% → 79 | 68 | R2+ |
| 70 | Generous Portions: 5% chance 2× output | — | passive | — | — | — | — | — |
| 75 | veilgourd_pie | 1 veilgourd + 1 wheat | furnace | 135 | heal 40 + Healing +5 lv for 120s | 35% → 89 | 120 | R3 |
| 80 | cooked_glowfin | 1 raw_glowfin | campfire | 140 | heal 42 + light radius +4 for 180s | 38% → 95 | 105 | R2-3 |
| 85 | Ash-Proof: −5% burn (−15% total) | — | passive | — | — | — | — | — |
| 90 | cooked_veilray | 1 raw_veilray | campfire | 172 | heal 50 (best food) | 40% → >99 (13.5% @99 pre-capstone) | 165 | R3 |
| 95 | Generous Portions II: 10% chance 2× output | — | passive | — | — | — | — | — |
| 99 | Master of the Hearth: never burn anything | — | capstone | — | — | — | — | — |

**Grind sanity (engine curve, cumulative XP):** lv10=12.4k · 30=196k · 45=531k · 60=1.07M · 75=1.84M · 90=2.87M · 99=3.61M. Veilray 90→99 ≈ 4.0k catches / 4.3k cooks — cap-grind intended.
**Vendor rule (global):** vendors buy at 50% of base coin value, sell at 150%.
**Fuel convention (matches §1/§3 roles):** furnace consumes 1 coal per 6 fired/cooked/smelted items; campfire consumes 1 log (any tier) per 10 cooks.

# CROSS-SKILL CONTRACTS

**FISHING consumes:**
| From | Item | Their lv | Qty |
|---|---|---|---|
| Crafting | small_net | CR1 | 1 (durable) |
| Fletching | fishing_rod | FL5 | 1 (durable) |
| Smithing | harpoon | SM25 | 1 (durable) |
| Crafting | lobster_cage | CR50 | 1 (durable) |
| Hunter/mob framework | feather | HU1+ / flyer slots R0+ | 1 per river_fly catch (F20-30 line) |

**FISHING provides:** raw_shrimp(F1)/raw_cod(F10)/raw_trout(F20)/raw_salmon(F30)/raw_tuna(F45)/raw_lobster(F55)/raw_swordfish(F65)/raw_glowfin(F80)/raw_veilray(F90) → Cooking, 1:1 per dish; coin caches → economy.

**COOKING consumes:**
| From | Item | Their lv | Qty |
|---|---|---|---|
| Fishing | all 9 raw fish | F1-90 | 1 per dish |
| Hunter/mob framework | raw_meat | HU1+/all rings | 1 per cooked_meat, 1 per hearty_stew |
| Hunter/mob framework | bone | universal drop | 1 per beast_treat |
| Foraging | wildberries | FO1 | 1 per beast_treat |
| Farming | wheat | FA1 | 3 per bread, 1 per hearty_stew, 1 per veilgourd_pie |
| Farming | veilgourd | FA75 | 1 per veilgourd_pie |
| Crafting | fired_bowl | CR5 | 1 per hearty_stew (consumed — pottery sink) |
| Mining | coal | M20 | 1 per 6 furnace actions |
| Woodcutting | any log | WC1+ | 1 per 10 campfire cooks |

**COOKING provides:** all cooked foods + bread/stew/pie → Healing (heal values col C-1) and general combat sustain; beast_treat (C10) → Beastlore taming, ~1-3 per tame attempt; cooked_meat → beast_treat chain; veilgourd_pie → temporary Healing +5 (HL synergy); no gear outputs.

# REGISTRY GAPS
- None blocking — every id above is §1-§22 or retained-engine (campfire, furnace, fishing_spot, coin).
- Optional cosmetic only: a `burnt_food` id does not exist; this spec assumes burning destroys the input (no item created). If the owner wants visible burnt items, one id would need to be added.
- Note: fish-spot variants are meta-parameters of engine `fishing_spot` (shore_net, sea_rod, river_fly, harpoon_reef, cage_reef, glow_lake, veil_deep), not new node ids — nodes.js `fishing_spot` needs per-entry xp override support (drop-entry field, same pattern as existing per-entry `level`).


# PART 4 — HUNTER, FORAGING & FARMING

# EMBERVEIL v2 — FULL DEPTH: HUNTER · FORAGING · FARMING

Engine anchors used: `skills.js` curve (cum. XP: lv15≈34.9k, lv30≈196k, lv45≈531k, lv60≈1.07M, lv75≈1.84M, lv99≈3.60M), `nodes.js` schema (xp/time/charges/respawn, `rare[].chance × (1+luck)`, distance-luck param), `gatherTimeMult` floor 0.45, `critChance` = double yield. Coin values are base VENDOR-BUY (player sells at 100%; vendors sell to player at ×1.6). All ids verbatim from the registry; new ids flagged in REGISTRY GAPS.

---

# 1. HUNTER (HU) — traps + tracking; skins feed Crafting, live catches feed Beastlore

**Core loop:** (a) TRAPS — place a crafted trap, optionally bait it, wait `interval`, collect catch (trap loses 1 charge; broken traps repaired with 1 sinew). (b) TRACKING — "fresh tracks" spawn as ground nodes; interact through 2-3 track markers (2s each) → flush → catch roll. Success% = base + 0.4% per HU level above requirement (cap 95%). Crit (engine critChance) = double drop roll.

## 1.1 HUNTER 1-99 unlock table

| Lv | Unlock | Inputs (qty) | Station/Method | XP/action | Output stats | Coin (catch value) | Ring |
|---|---|---|---|---|---|---|---|
| 1 | Bird snaring: flyer slot (ex. Moorfinch) | 1 bird_snare (CR1) | placed trap, 25s interval, 65% base | 16 | feather ×3-5, raw_meat ×1, bone ×1 @25% | ~8c | R0 |
| 1 | Tracking: small-game slot (ex. Burrow Coney) | — | track node, 3 markers, 70% | 20 | rough_hide ×1, raw_meat ×1, bone ×1 @40% | ~9c | R0 |
| 5 | Baited snares | 1 wildberries per set | any snare | +4 XP | −20% interval, +1 feather | — | R0+ |
| 10 | Beast stalking: beast slot (ex. Heath Grazer) | — | track node, crouch-approach, 65% | 30 | rough_hide ×1-2, raw_meat ×2, sinew ×1 @35%, bone ×1-2 @60% | ~16c | R0 |
| 15 | Box trapping | 1 box_trap (FL15) | placed trap, 35s, 70% | 34 | small-game table + sinew @50% | ~15c | R0-1 |
| 20 | R1 flyers (ex. Copper Strider) | bird_snare + any bait | trap, 30s, 60% | 44 | feather ×5-8, raw_meat ×2, bone @40% | ~15c | R1 |
| 22 | R1 small game (ex. Dune Skitter) | box_trap | trap, 35s, 65% | 48 | rough_hide ×2, raw_meat ×1, sinew @50% | ~18c | R1 |
| 25 | Sinew-craft skinning (passive) | — | — | — | beast/brute slots: sinew chance → 100% | — | all |
| 30 | Deadfall trapping: brute slot (ex. Tuskback) → **thick_hide** | 1 deadfall_trap (FL30); bait 1 raw_meat | placed trap, 60s, 60% | 62 | thick_hide ×1-2, raw_meat ×2-3, bone ×2 @80%, sinew ×1, beast_trophy(r1) @5% | ~45c | R1 |
| 35 | Camouflage (passive) + live capture | — | — | — | track flush spook −50%; box/net catches can be kept LIVE → Beastlore study | — | all |
| 40 | Net trapping: spinner stalker slot (ex. Gloom Spinner) | 1 net_trap (CR40) | placed trap, 45s, 60% | 78 | silk_thread ×2-4, venom_sac @15%, bone @20% | ~40c | R1-2 |
| 45 | Ember-country hunting: R2 beast (ex. Cinderhoof) | — | track node, 60% | 95 | thick_hide ×2, raw_meat ×3, sinew ×1, ember_ash ×1 @25% | ~50c | R2 |
| 50 | Trophy skinning (passive) + R2 flyer (ex. Ashwing) | bird_snare + bait | trap, 30s, 60% | 105 | brute+ catches roll beast_trophy at double %; Ashwing: feather ×8-12, raw_meat ×2 | ~20c | R2 |
| 55 | Venom milking: poison stalker (ex. Marsh Creeper) | net_trap | trap, 50s, 60% | 120 | venom_sac ×1-2 (100%), silk_thread ×1-2 @60%, bone ×1 | ~45c | R2 |
| 60 | Dusk stalking: stalker slot (ex. Duskprowler) → **dusk_hide** | deadfall_trap OR track (night) | trap 75s / track, 55% | 150 | dusk_hide ×1, raw_meat ×2, sinew ×1 @80%, beast_trophy(r2) @8% | ~65c | R2-3 |
| 65 | Twin trapping (passive) | — | — | — | 2 simultaneous traps of same type | — | all |
| 70 | Moonlit tracking (passive) | — | — | — | night hunts +25% XP; dusk/veil slot track spawns ×2 at night | — | R2-3 |
| 75 | Apex snaring: apex slot (ex. Veilmaw Stalker) → **veil_hide** | 1 veil_snare (FL75); bait 1 raw_meat or beast_treat | placed trap, 90s, 55% | 240 | veil_hide ×1, sinew ×2, raw_meat ×3, venom_sac @40%, beast_trophy(r3) @10% | ~180c | R3 |
| 80 | R3 flyer (ex. Riftwing) | net_trap | trap, 60s, 55% | 230 | feather ×12-15, silk_thread ×2 @60%, bone ×2 | ~45c | R3 |
| 85 | Third trap + R3 brute (ex. Gravehorn) | deadfall_trap | trap, 90s, 55% | 280 | veil_hide ×1 @60%, dusk_hide ×1-2, bone ×3, beast_trophy(r3) @12% | ~160c | R3 |
| 90 | Ghost step (passive) + rare event: The Pale Stag | — | rare track event (0.5% per R3 track) | 550 | tracking never spooks; Stag: veil_hide ×2, beast_trophy(r3) ×1 (100%) | ~400c | R3 |
| 95 | Apex pairs (passive) | — | — | — | veil-tier traps: 25% double catch | — | R3 |
| 99 | Warden of the Wild (passive) | — | — | — | +1 drop roll on every catch; trophy % doubled; traps never break | — | all |

## 1.2 Hunt-slot framework (SLOTS are law; generated `mob_*` creatures plug in by ring+role)

Any generator-made creature declares `hunt_slot: {ring, role}` and inherits this row's level gate, method, XP band (±15%), and drop template (drops only from §7/§22 + coin). Named species above are examples only; Slayer/Beastlore reference the slot, never the species.

| Ring | Role | HU lv | Method | Catch time | Base success | Drop template (qty@%) | XP band | Coin |
|---|---|---|---|---|---|---|---|---|
| R0 | flyer | 1 | bird_snare | 25s | 65% | feather 3-5@100, raw_meat 1@100, bone 1@25 | 14-18 | 6-10c |
| R0 | small | 1/15 | track / box_trap | 20s/35s | 70% | rough_hide 1@100, raw_meat 1@100, bone 1@40, sinew 1@20 | 18-34 | 8-15c |
| R0 | beast | 10 | tracking | 30s | 65% | rough_hide 1-2@100, raw_meat 2@100, sinew 1@35(→100 @HU25), bone 1-2@60 | 26-34 | 14-18c |
| R1 | flyer | 20 | bird_snare+bait | 30s | 60% | feather 5-8@100, raw_meat 2@100, bone 1@40 | 40-48 | 12-18c |
| R1 | small | 22 | box_trap | 35s | 65% | rough_hide 2@100, raw_meat 1@100, sinew 1@50 | 44-52 | 15-20c |
| R1 | brute | 30 | deadfall_trap | 60s | 60% | thick_hide 1-2@100, raw_meat 2-3@100, bone 2@80, sinew 1@60(→100 @25 rule), beast_trophy(r1)@5 | 56-68 | 40-55c |
| R1-2 | stalker (spinner) | 40 | net_trap | 45s | 60% | silk_thread 2-4@100, venom_sac 1@15, bone 1@20 | 70-86 | 30-50c |
| R2 | beast | 45 | tracking | 40s | 60% | thick_hide 2@100, raw_meat 3@100, sinew 1@100, ember_ash 1@25 | 86-105 | 45-55c |
| R2 | flyer | 50 | bird_snare+bait | 30s | 60% | feather 8-12@100, raw_meat 2@100, bone 1@50 | 95-115 | 16-24c |
| R2 | stalker (venom) | 55 | net_trap | 50s | 60% | venom_sac 1-2@100, silk_thread 1-2@60, bone 1@100 | 110-132 | 35-55c |
| R2-3 | stalker (dusk) | 60 | deadfall / night track | 75s | 55% | dusk_hide 1@100, raw_meat 2@100, sinew 1@80, beast_trophy(r2)@8 | 135-165 | 55-75c |
| R3 | apex | 75 | veil_snare | 90s | 55% | veil_hide 1@100, sinew 2@100, raw_meat 3@100, venom_sac 1@40, beast_trophy(r3)@10 | 215-265 | 160-200c |
| R3 | flyer | 80 | net_trap | 60s | 55% | feather 12-15@100, silk_thread 2@60, bone 2@100 | 205-255 | 35-55c |
| R3 | brute | 85 | deadfall_trap | 90s | 55% | veil_hide 1@60, dusk_hide 1-2@100, bone 3@100, beast_trophy(r3)@12 | 250-310 | 140-180c |

## 1.3 Trap gear table

| Item | Craft | Inputs | Station | Charges | Set time | Repair | Coin |
|---|---|---|---|---|---|---|---|
| bird_snare | CR1 | 1 oak_plank + 1 bowstring | workbench | 3 | 2s | 1 sinew → +3 | 8c |
| box_trap *(GAP)* | FL15 | 2 birch_plank + 1 bowstring | workbench | 4 | 3s | 1 sinew → +4 | 30c |
| deadfall_trap *(GAP)* | FL30 | 1 willow_log + 2 willow_plank | workbench | 4 | 4s | 1 sinew → +4 | 60c |
| net_trap *(GAP)* | CR40 | 2 linen_cloth + 2 bowstring | loom_block | 5 | 3s | 1 sinew → +5 | 55c |
| veil_snare *(GAP)* | FL75 | 2 veilwood_plank + 2 sinew + 1 bowstring | workbench | 5 | 4s | 2 sinew → +5 | 300c |

Craft XP goes to the crafting skill (FL/CR agents own those XP rows).

## 1.4 Track node table (tracking spawns; node-schema compliant)

| Node (param of new `hunt_tracks` type, GAP) | Ring | HU lv | XP on flush | Time | Charges | Respawn | Rare (× (1+luck)) |
|---|---|---|---|---|---|---|---|
| tracks: R0 small/beast | R0 | 1/10 | 20/30 | 2s ×3 markers | 1 | 90s | beast_trophy(r0) 1% |
| tracks: R2 beast | R2 | 45 | 95 | 2s ×3 | 1 | 150s | beast_trophy(r2) 2% |
| tracks: dusk stalker (night ×2 spawns) | R2-3 | 60 | 150 | 2s ×3 | 1 | 240s | beast_trophy(r2) 3% |
| tracks: R3 apex | R3 | 75 | 240 | 2s ×3 | 1 | 300s | Pale Stag event 0.5% (HU90) |

---

# 2. FORAGING (FO) — no tool required; luck param applies to all `rare[]` rolls

## 2.1 FORAGING 1-99 unlock table

| Lv | Unlock | Inputs | Station/Node | XP/action | Output stats | Coin | Ring |
|---|---|---|---|---|---|---|---|
| 1 | berry_bush picking | — | berry_bush | 9 | wildberries ×1-3 (heal 2 HP each, instant nibble) | 1c ea | R0+ |
| 1 | Herb patches: sageleaf | — | herb_patch (meadow) | 12 | sageleaf ×1-2 → HB1 | 3c | R0 |
| 1 | Wild flax pulling (Crafting bootstrap) | — | herb_patch (flax stand) | 10 | flax ×1-2 → CR bowstring/linen | 4c | R0 |
| 1 | tall_grass sweeping | — | tall_grass block | 3 | ring-gated seed table (§2.3) | — | all |
| 5 | Careful picking (passive) | — | — | — | berry_bush +1 charge; wildberries qty 2-4 | — | all |
| 10 | Sage clusters (passive) | — | — | — | sageleaf qty → 2-3 | — | R0 |
| 15 | R1 grasses (passive) | — | tall_grass R1 | 4 | flax_seed roll enabled (§2.3) | — | R1 |
| 20 | Swamp foraging: bogmint | — | herb_patch (swamp) | 26 | bogmint ×1-2 → HB25/35 | 8c | R0-1 swamp |
| 25 | Double harvest I (passive) | — | — | — | 10% double yield all forages | — | all |
| 30 | Deep-swamp stands (passive) | — | — | — | bogmint qty → 2-3; swamp patches +1 charge | — | R1 |
| 35 | Ash gleaning: ember_ash | — | herb_patch (ash heap, lava edge — safe ground, no tonic needed) | 40 | ember_ash ×1-2 → HB45, MG45 emberweave dye | 10c | R2 |
| 40 | Volcanic blooms: emberbloom | — | herb_patch (volcanic) | 46 | emberbloom ×1 → HB45 | 18c | R2 |
| 45 | Sunmelon seeding | — | tall_grass R2 + wild sunmelon vine (rare) | 5 / 50 | sunmelon_seed roll (§2.3); wild vine: sunmelon ×1 | 8c / 12c | R2 |
| 50 | Prime specimens (passive) | — | — | — | double harvest → 20%; ember_ash qty 2-3 | — | all |
| 55 | Night blooming (passive) | — | — | — | patches you emptied respawn 25% faster at night | — | all |
| 60 | Dark-forest moss: duskmoss | — | herb_patch (dusk moss bank; also cave walls) | 60 | duskmoss ×1-2 → HB50/60, gloomweave dye | 30c | R2-3 |
| 65 | Veil-touched grass (passive) | — | tall_grass R3 | 6 | veilgourd_seed roll enabled (§2.3) | — | R3 |
| 70 | Double harvest II (passive) | — | — | — | 25% double; wildberries 3-5 | — | all |
| 75 | Rift flora: veilblossom | — | herb_patch (veil rift) | 90 | veilblossom ×1 → HB75, CR75 veilcloth | 70c | R3 |
| 80 | Blossom pairs (passive) | — | — | — | veilblossom 20% chance ×2 | — | R3 |
| 85 | Herbwhisper (passive) | — | — | — | see node charges remaining; +1 charge on all herb_patch/berry_bush | — | all |
| 90 | Bloom surge (passive) | — | — | — | 5% chance harvested patch instantly regrows full | — | all |
| 95 | Rift bounty (passive) | — | — | — | veilblossom qty 2-3; duskmoss 2-4 | — | R3 |
| 99 | Master Forager (passive) | — | — | — | +1 qty on every forage; all seed roll %s doubled | — | all |

## 2.2 Foraging node table (herb_patch/berry_bush parameterized per biome/ring, per engine convention)

| Node variant | Ring | FO lv | XP | Time | Charges | Respawn | Drops (qty@%) | Rare (× (1+luck)) |
|---|---|---|---|---|---|---|---|---|
| berry_bush | all | 1 | 9 | 1.6s | 2-3 | 70s | wildberries 1-3@100 | sageleaf_seed 2% |
| herb_patch: meadow | R0 | 1 | 12 | 1.8s | 1-2 | 45s | sageleaf 1-2@100 | sageleaf_seed 4% |
| herb_patch: flax stand | R0-1 | 1 | 10 | 1.8s | 2-3 | 60s | flax 1-2@100 | flax_seed 6% |
| herb_patch: swamp | R0-1 | 20 | 26 | 2.2s | 1-2 | 90s | bogmint 1-2@100 | bogmint_seed 4%, venom_sac 1% |
| herb_patch: ash heap | R2 | 35 | 40 | 2.4s | 1-2 | 120s | ember_ash 1-2@100 | emberbloom_seed 3% |
| herb_patch: volcanic | R2 | 40 | 46 | 2.6s | 1-2 | 150s | emberbloom 1@100 | emberbloom_seed 5% |
| wild sunmelon vine | R2 | 45 | 50 | 2.5s | 1 | 240s | sunmelon 1@100 | sunmelon_seed 20% |
| herb_patch: dusk moss bank | R2-3 | 60 | 60 | 2.8s | 1-2 | 180s | duskmoss 1-2@100 | duskmoss_spore 4% |
| herb_patch: veil rift | R3 | 75 | 90 | 3.2s | 1-2 | 300s | veilblossom 1@100 | veilblossom_seed 4%, uncut_veilstone 0.5% |

## 2.3 tall_grass seed table (per break, 3 XP FO; ring-tinted; FO level gates the roll, luck applies)

| Ring | Roll (one per break) |
|---|---|
| R0 | nothing 62%, wheat_seed 30%, flax_seed 6% (FO15+), sageleaf_seed 2% |
| R1 | nothing 55%, wheat_seed 18%, flax_seed 22%, bogmint_seed 5% (FO20+) |
| R2 | nothing 60%, flax_seed 18%, wheat_seed 10%, sunmelon_seed 8% (FO45+), emberbloom_seed 4% (FO40+) |
| R3 | nothing 62%, sunmelon_seed 15%, veilgourd_seed 5% (FO65+), duskmoss_spore 10% (FO60+), veilblossom_seed 8% (FO75+) |

---

# 3. FARMING (FA) — till → sow → stages → harvest; allotment / herb / tree patches

**Mechanics (apply to all patches):** Till any dirt/grass with a hoe (creates farm_plot node, 1.2s). Crops grow through 3 stages (trees 4). **Wither:** 8%/stage base; within 4 blocks of water ("irrigated") 4%; fertilized 0% for first 2 stages. **Fertilizer:** bury 3 bone in a plot → −20% grow time, min-yield +1 (bone sink). Withered plot: clear for 1 XP, seed lost. **Plot caps:** 2 allotments at lv1, +1 at 15/30/45/60/75 (max 8); herb plots 1 at 25, +1 at 50/80 (max 3); tree patches 1 at 30, +1 at 55/85 (max 3). Harvest crit (engine) doubles yield.

## 3.1 FARMING 1-99 unlock table

| Lv | Unlock | Inputs (qty) | Station | XP (sow/harvest) | Output stats | Coin | Ring |
|---|---|---|---|---|---|---|---|
| 1 | Till + Wheat | copper_hoe; 3 wheat_seed per plot | farm_plot | 8 / 22 | wheat ×3-5 in 4 min → C5 bread, C15 stew | wheat 3c | any |
| 1 | 2 allotment plots | — | — | — | plot cap 2 | — | — |
| 5 | Fertilizing | 3 bone per plot | farm_plot | +6 XP | −20% grow time, +1 min yield, no wither first 2 stages | — | — |
| 10 | Green thumb (passive) | — | — | — | all growth times −10% | — | — |
| 15 | iron_hoe + 3rd plot | iron_hoe (SM15) | — | — | till 0.9s; wheat yield 4-6 | — | — |
| 20 | Flax | 3 flax_seed | farm_plot | 10 / 38 | flax ×3-5 in 6 min → CR bowstring (2 flax) / linen_cloth (3 flax) | flax 4c | any |
| 25 | Herb plot I: sageleaf | 1 sageleaf_seed | farm_plot (herb) | 12 / 45 | sageleaf ×4-7 in 8 min; 10% seed-back | 3c ea | any |
| 30 | steel_hoe + 4th plot + Tree patch I: oak/birch | steel_hoe; 1 oak_sapling or birch_sapling | farm_plot (tree) | 15 / 90 (oak), 20 / 130 (birch) | grown tree = private tree_oak / tree_birch node (full WC charges), 20/25 min | — | any |
| 35 | Herb: bogmint | 1 bogmint_seed | farm_plot (herb) | 16 / 70 | bogmint ×4-6 in 10 min | 8c ea | any |
| 40 | Tree: willow | 1 willow_sapling (plant within 6 blocks of water) | farm_plot (tree) | 28 / 190 | private tree_willow, 30 min | — | near water |
| 45 | Sunmelon + emberite_hoe + 5th plot | emberite_hoe; 2 sunmelon_seed | farm_plot | 20 / 95 | sunmelon ×2-4 in 10 min; eaten raw heal 8 HP | 12c | any |
| 50 | Herb plot II + emberbloom | 1 emberbloom_seed | farm_plot (herb) | 24 / 120 | emberbloom ×3-5 in 14 min | 18c ea | any |
| 55 | Irrigation mastery (passive) + Tree patch II + spruce | 1 spruce_sapling | farm_plot (tree) | 38 / 280 | irrigated plots −15% grow time; private tree_spruce, 40 min | — | any |
| 60 | meteoric_hoe + 6th plot + Herb: duskmoss | meteoric_hoe; 1 duskmoss_spore (grows only at night or under roof) | farm_plot (herb) | 30 / 150 | duskmoss ×4-6 in 16 min | 30c ea | any |
| 65 | Bounty I (passive) | — | — | — | +1 yield on all crops/herbs | — | — |
| 70 | Hardy strains (passive) + Tree: duskwood | 1 duskwood_sapling | farm_plot (tree) | 55 / 420 | crops never wither; private tree_duskwood, 50 min | — | any |
| 75 | Veilgourd + veilsteel_hoe + 7th plot | veilsteel_hoe; 2 veilgourd_seed | farm_plot | 45 / 210 | veilgourd ×2-3 in 20 min → C75 veilgourd_pie | 45c | any |
| 80 | Herb plot III + veilblossom | 1 veilblossom_seed | farm_plot (herb) | 50 / 260 | veilblossom ×3-4 in 22 min | 70c ea | any |
| 85 | Tree patch III + veilwood | 1 veilwood_sapling | farm_plot (tree) | 80 / 650 | private tree_veilwood, 60 min | — | any |
| 90 | Bounty II (passive) | — | — | — | 25% double harvest; 20% seed-back all crops | — | — |
| 95 | Rift cultivation (passive) | — | — | — | veilgourd 3-5, grow times −25% on veil crops/herbs | — | — |
| 99 | Master Farmer (passive) | — | — | — | nothing ever withers; +1 yield everywhere; saplings 10% refund on harvest | — | — |

## 3.2 Crop / herb / tree patch reference

| Patch | Seed (qty) | FA lv | Stages × time | Yield | XP sow/harv | Sinks |
|---|---|---|---|---|---|---|
| wheat | wheat_seed ×3 | 1 | 3 × 80s (4 min) | wheat 3-5 | 8/22 | C5 bread (3 wheat), C15 hearty_stew (1), C75 pie (1) |
| flax | flax_seed ×3 | 20 | 3 × 2 min | flax 3-5 | 10/38 | CR1 bowstring (2), CR1 linen_cloth (3) |
| sageleaf | sageleaf_seed ×1 | 25 | 3 × 2.7 min | sageleaf 4-7 | 12/45 | HB1 salve, HB15 antipoison |
| bogmint | bogmint_seed ×1 | 35 | 3 × 3.3 min | bogmint 4-6 | 16/70 | HB25/35 potions |
| sunmelon | sunmelon_seed ×2 | 45 | 3 × 3.3 min | sunmelon 2-4 | 20/95 | eaten (8 HP) |
| emberbloom | emberbloom_seed ×1 | 50 | 3 × 4.7 min | emberbloom 3-5 | 24/120 | HB45 ember_tonic |
| duskmoss | duskmoss_spore ×1 | 60 | 3 × 5.3 min | duskmoss 4-6 | 30/150 | HB50/60, MG60 gloomweave |
| veilgourd | veilgourd_seed ×2 | 75 | 3 × 6.7 min | veilgourd 2-3 | 45/210 | C75 veilgourd_pie |
| veilblossom | veilblossom_seed ×1 | 80 | 3 × 7.3 min | veilblossom 3-4 | 50/260 | HB75 elixir, CR75 veilcloth |
| oak tree | oak_sapling | 30 | 4 × 5 min | private tree_oak node | 15/90 | WC1 logs |
| birch tree | birch_sapling | 30 | 4 × 6.25 min | private tree_birch | 20/130 | WC15 logs |
| willow tree | willow_sapling | 40 | 4 × 7.5 min | private tree_willow | 28/190 | WC30 logs |
| spruce tree | spruce_sapling | 55 | 4 × 10 min | private tree_spruce | 38/280 | WC45 logs |
| duskwood tree | duskwood_sapling | 70 | 4 × 12.5 min | private tree_duskwood | 55/420 | WC60 logs |
| veilwood tree | veilwood_sapling | 85 | 4 × 15 min | private tree_veilwood | 80/650 | WC75 logs |

Sapling sources: rare roll while woodcutting the matching tree (3%, × (1+luck)) + tree-patch harvest refund (FA99). Herb-seed sources: §2.2/§2.3 wild rolls + 10% seed-back on herb harvest (20% at FA90).

## 3.3 Coin table (base vendor-buy, my items)

| Item | c | Item | c | Item | c |
|---|---|---|---|---|---|
| feather | 1 | wildberries | 1 | wheat_seed | 1 |
| bone | 2 | raw_meat | 3 | wheat | 3 |
| rough_hide | 4 | flax / flax_seed | 4 / 2 | sageleaf | 3 |
| sinew | 5 | bogmint | 8 | sunmelon_seed | 8 |
| ember_ash | 10 | silk_thread | 12 | sunmelon | 12 |
| thick_hide | 14 | venom_sac | 15 | emberbloom | 18 |
| duskmoss | 30 | dusk_hide | 40 | veilgourd | 45 |
| veilgourd_seed | 40 | veilblossom | 70 | veil_hide | 110 |
| beast_trophy r0/r1/r2/r3 | 20/45/90/180 | herb seeds (each tier) | ½ of herb | saplings oak→veil | 5/8/15/25/60/150 |

---

# CROSS-SKILL CONTRACTS

**HUNTER consumes:**
- bird_snare — Crafting lv1 — 1 per 3 catches (charge refill via sinew)
- box_trap — Fletching lv15 *(GAP)* — 1 per 4 catches
- deadfall_trap — Fletching lv30 *(GAP)* — 1 per 4 catches
- net_trap — Crafting lv40 *(GAP)* — 1 per 5 catches
- veil_snare — Fletching lv75 *(GAP)* — 1 per 5 catches
- wildberries (bait) — Foraging lv1 — 1 per baited snare set
- raw_meat (bait) — own loop / mob drops — 1 per deadfall/veil set
- beast_treat (master bait) — Cooking lv10 — 1 per set at HU80+

**HUNTER provides:**
- rough_hide → Crafting lv1 (leather; ~1.3/catch at HU10) · thick_hide → Crafting lv30 (~1.5/catch HU30+) · dusk_hide → Crafting lv60 (1/catch HU60) · veil_hide → Crafting lv75 (1/catch HU75)
- sinew → Fletching (alt bowstring 1:1) + trap repair; ~0.8/catch HU25+
- feather → Fletching arrow batches (15/craft) + Fishing fly-lures; 3-15/catch
- raw_meat → Cooking lv1; 1-3/catch · bone → Cooking beast_treat (1), Farming fertilizer (3/plot), vendor
- venom_sac → Herblore lv15 antipoison (1/brew); guaranteed at HU55
- silk_thread → Crafting lv30 silk_cloth (3/cloth); 2-4/net catch HU40+
- beast_trophy (r0-r3 meta) → Slayer turn-ins, Construction cn_* mounts, vendor
- LIVE specimens (HU35+, box/net) → Beastlore study/tame (BL agent's ab_* consumes)

**FORAGING consumes:** nothing (toolless; tall_grass breakable bare-handed).

**FORAGING provides:**
- sageleaf → Herblore lv1 (1/salve), lv15 (1/antipoison); flax → Crafting lv1 (2/bowstring, 3/linen_cloth) — the lv-1 bootstrap before Farming 20
- wildberries → Herblore lv1 salve (1), Cooking lv10 beast_treat (1), Hunter bait (1)
- bogmint → Herblore lv25/35 (1/brew) · ember_ash → Herblore lv45 (1), Crafting/Magic emberweave dye (1/piece)
- emberbloom → Herblore lv45 (1/tonic) · duskmoss → Herblore lv50/60 (1/brew), gloomweave dye (1/piece) · veilblossom → Herblore lv75 (1/elixir), Crafting lv75 veilcloth (1/cloth)
- ALL seeds (wheat_seed, flax_seed, sunmelon_seed, veilgourd_seed, herb seeds, saplings via WC rare) → Farming at matching levels

**FARMING consumes:**
- hoes: copper_hoe SM1 / iron SM15 / steel SM30 / emberite SM45 / meteoric SM60 / veilsteel SM75 — 1 each, durability tool
- seeds from Foraging/tall_grass/mob tables (qty per §3.2); saplings from Woodcutting rare rolls (1/tree)
- bone ×3 per fertilized plot (Hunter/mob supply)

**FARMING provides:**
- wheat → Cooking lv5 bread (3), lv15 hearty_stew (1), lv75 veilgourd_pie (1); ~4.5/plot/4min
- flax → Crafting lv1 (scaled supply vs wild trickle); ~4/plot
- sageleaf/bogmint/emberbloom/duskmoss/veilblossom → Herblore at 1/15/25/35/45/50/60/75 (farmed volume: 3-7/patch vs 1-2 wild)
- sunmelon → direct food (8 HP) · veilgourd → Cooking lv75 (1/pie)
- private tree nodes → Woodcutting XP + oak→veilwood logs on demand (Fletching/Construction supply line)

# REGISTRY GAPS

New ids required (flag for registry v2.1): **box_trap** (FL15), **deadfall_trap** (FL30), **net_trap** (CR40), **veil_snare** (FL75); **hunt_tracks** (generic node type, parameterized like fishing_spot); herb seeds **sageleaf_seed, bogmint_seed, emberbloom_seed, duskmoss_spore, veilblossom_seed**; saplings **oak_sapling, birch_sapling, willow_sapling, spruce_sapling, duskwood_sapling, veilwood_sapling**. Total: 16 (4 items + 1 node type + 11 seeds/saplings). All have ≥1 source and ≥1 sink as specified above. Zero v1 dead-id reuse. Skill-key note for the orchestrator: engine `skills.js` still uses v1 keys `hunting`/`tailoring`/`alchemy` etc. — Hunter/Crafting/Herblore rename mapping in the spine applies; no code keys were invented here.

Sources: /home/user/test1/js/game/skills.js (xpForLevel curve, gatherTimeMult, critChance), /home/user/test1/js/game/nodes.js (node schema, rollNodeDrops luck), registry in task prompt.


# PART 5 — CRAFTING & ARCHAEOLOGY

Engine check done — XP curve `xpForLevel(n)=floor(60·(lv-1)^2.4+80·(lv-1))` confirmed in /home/user/test1/js/game/skills.js (lv99 ≈ 3,617,320 cumulative; reference: lv10=12,428 · lv20=71,918 · lv30=196,180 · lv45=530,680 · lv60=1,071,640 · lv75=1,843,840 · lv99=3,617,320). All XP/action values below are calibrated to that curve. Armor % shown = armor/(armor+30).

# CRAFTING (CR) 1-99

Stations: workbench (sewing/tanning/assembly, needle required for sewn items), loom_block (cloth), furnace (bars/glass/pottery — all firing, no kiln). Tools held, never consumed: needle (sewing), chisel (gem cutting).

## CR-A. Master Unlock Table

| Lv | Unlock | Inputs (exact) | Station | XP | Output stats | Coin | Ring |
|---|---|---|---|---|---|---|---|
| 1 | Tan Leather → `leather` | 1 rough_hide | workbench | 8 | material | 8 | R0 |
| 1 | `bowstring` | 2 flax | loom_block | 6 | material (all bows/rod/snare) | 6 | R0 |
| 1 | `linen_cloth` | 3 flax | loom_block | 8 | material | 10 | R0 |
| 1 | `bandage` ×2 | 1 linen_cloth | workbench+needle | 5 | HL1 consumable, heals 4 HP | 3 ea | R0 |
| 1 | `leather_coif` | 1 leather | workbench+needle | 12 | armor 2, +1% ranged acc (equip R1) | 15 | R0 |
| 1 | `bird_snare` | 1 oak_plank + 1 bowstring | workbench | 9 | HU1 trap tool | 12 | R0 |
| 1 | `small_net` | 2 linen_cloth | workbench+needle | 10 | F1 tool | 15 | R0 |
| 2 | `linen_hood` | 1 linen_cloth | workbench+needle | 10 | armor 1, +1% magic dmg (MG1) | 12 | R0 |
| 3 | `linen_robe_bottom` | 2 linen_cloth | workbench+needle | 12 | armor 1, +1% magic dmg | 20 | R0 |
| 4 | `leather_chaps` | 2 leather | workbench+needle | 16 | armor 3, +1% ranged acc | 25 | R0 |
| 5 | `fired_bowl` | 1 clay | furnace | 10 | pottery; hearty_stew input | 5 | R0 |
| 6 | `linen_robe_top` | 3 linen_cloth | workbench+needle | 15 | armor 2, +2% magic dmg | 30 | R0 |
| 7 | `leather_body` | 3 leather | workbench+needle | 22 | armor 4, +2% ranged dmg | 40 | R0 |
| 10 | `glass_vial` ×3 | 1 sand | furnace | 15 | potion container (HB) | 4 ea | R0 |
| 12 | PERK Quality Tanning | — | — | — | 10% chance tanning yields 2 leather (any hide) | — | — |
| 15 | `studded_coif` | 1 leather + 1 iron_bar | workbench+needle | 30 | armor 3, +2% ranged acc (R15) | 60 | R0 |
| 17 | `studded_chaps` | 2 leather + 1 iron_bar | workbench+needle | 34 | armor 5, +2% ranged acc | 75 | R0 |
| 19 | `studded_body` | 3 leather + 2 iron_bar | workbench+needle | 40 | armor 7, +3% ranged dmg | 110 | R0 |
| 20 | Smelt `silver_bar` | 1 silver_ore | furnace | 18 | jewelry metal | 25 | R0-1 |
| 20 | Cut `sapphire` | 1 uncut_sapphire (chisel) | workbench | 30 | cut gem | 90 | any |
| 20 | `silver_sapphire_ring` | 1 silver_bar + 1 sapphire | furnace | 40 | +3% gather double-drop luck | 160 | — |
| 24 | `silver_sapphire_amulet` | 1 silver_bar + 1 sapphire | furnace | 48 | +4% magic accuracy | 185 | — |
| 25 | `glass_orb` | 2 sand | furnace | 25 | staff core (all staves, FL) | 20 | R0 |
| 28 | PERK Flax-Wheel Mastery | — | — | — | bowstring crafts yield 2 | — | — |
| 30 | Tan `hard_leather` | 1 thick_hide | workbench | 25 | material | 22 | R1 |
| 30 | Cut `emerald` | 1 uncut_emerald (chisel) | workbench | 45 | cut gem | 170 | R1+ |
| 30 | `silk_cloth` | 3 silk_thread | loom_block | 30 | material | 45 | R1+ |
| 30 | `hardleather_coif` | 1 hard_leather | workbench+needle | 45 | armor 4, +3% ranged acc (R30) | 90 | R1 |
| 31 | `silkspun_hood` | 1 silk_cloth | workbench+needle | 34 | armor 1, +2% magic dmg (MG15) | 70 | R1 |
| 32 | `silver_emerald_necklace` | 1 silver_bar + 1 emerald | furnace | 60 | +1 HP / 10s regen | 290 | — |
| 32 | `hardleather_chaps` | 2 hard_leather | workbench+needle | 50 | armor 7, +3% ranged acc | 120 | R1 |
| 33 | `silkspun_robe_bottom` | 2 silk_cloth | workbench+needle | 36 | armor 2, +2% magic dmg | 100 | R1 |
| 34 | `hardleather_body` | 3 hard_leather | workbench+needle | 58 | armor 10, +4% ranged dmg | 170 | R1 |
| 35 | `silkspun_robe_top` | 3 silk_cloth | workbench+needle | 40 | armor 3, +2% magic dmg | 140 | R1 |
| 38 | PERK Furnace Efficiency | — | — | — | glass_vial batch 3→4; fired_bowl batch 1→2 | — | — |
| 40 | Smelt `gold_bar` | 1 gold_ore | furnace | 34 | jewelry metal | 70 | R1-2 |
| 40 | `runeweave_hood` | 1 silk_cloth + 2 air_rune + 2 water_rune | workbench+needle | 55 | armor 2, +3% magic dmg (MG30) | 160 | — |
| 42 | `runeweave_robe_bottom` | 2 silk_cloth + 3 earth_rune | workbench+needle | 58 | armor 3, +3% magic dmg | 200 | — |
| 44 | `runeweave_robe_top` | 3 silk_cloth + 3 fire_rune | workbench+needle | 62 | armor 5, +4% magic dmg; SET: 5% chance −1 elemental rune per cast | 260 | — |
| 45 | Cut `ruby` | 1 uncut_ruby (chisel) | workbench | 62 | cut gem | 300 | R1+ |
| 45 | `gold_ruby_ring` | 1 gold_bar + 1 ruby | furnace | 78 | +4% melee crit chance | 460 | — |
| 45 | `emberhide_coif` | 1 hard_leather + 1 emberite_bar | workbench+needle | 70 | armor 6, +4% ranged acc (R45) | 220 | R2 |
| 47 | `emberhide_chaps` | 2 hard_leather + 1 emberite_bar | workbench+needle | 75 | armor 10, +4% ranged acc | 260 | R2 |
| 48 | `gold_ruby_amulet` | 1 gold_bar + 1 ruby | furnace | 85 | +5% strength (melee) dmg | 500 | — |
| 49 | `emberhide_body` | 3 hard_leather + 2 emberite_bar | workbench+needle | 85 | armor 14, +5% ranged dmg; SET: fire dmg taken −10% | 340 | R2 |
| 50 | `lobster_cage` | 2 willow_plank + 1 linen_cloth | workbench | 55 | F55 tool | 70 | — |
| 52 | `emberweave_hood` | 1 silk_cloth + 1 ember_ash | workbench+needle | 72 | armor 3, +4% magic dmg (MG45) | 260 | R2 |
| 54 | `emberweave_robe_bottom` | 2 silk_cloth + 1 ember_ash | workbench+needle | 76 | armor 4, +4% magic dmg | 310 | R2 |
| 56 | `emberweave_robe_top` | 3 silk_cloth + 2 ember_ash | workbench+needle | 80 | armor 7, +6% magic dmg; SET: fire spells +10% dmg | 390 | R2 |
| 58 | Cut `diamond` | 1 uncut_diamond (chisel) | workbench | 90 | cut gem (see GAPS: tuned 60→58) | 550 | R2+ |
| 58 | `gold_diamond_ring` | 1 gold_bar + 1 diamond | furnace | 100 | +4 armor (flat) | 750 | — |
| 60 | Tan `dusk_leather` | 1 dusk_hide | workbench | 55 | material | 60 | R2 |
| 60 | `duskhide_coif` | 1 dusk_leather | workbench+needle | 95 | armor 8, +5% ranged acc (R60) | 320 | R2 |
| 62 | `gold_diamond_necklace` | 1 gold_bar + 1 diamond | furnace | 110 | +5% ranged dmg | 820 | — |
| 62 | `duskhide_chaps` | 2 dusk_leather | workbench+needle | 100 | armor 13, +5% ranged acc | 380 | R2 |
| 63 | `gloomweave_hood` | 1 silk_cloth + 1 duskmoss + 1 gloom_rune | workbench+needle | 95 | armor 4, +5% magic dmg (MG60) | 420 | R2-3 |
| 64 | `duskhide_body` | 3 dusk_leather | workbench+needle | 112 | armor 18, +6% ranged dmg | 500 | R2 |
| 65 | `gloomweave_robe_bottom` | 2 silk_cloth + 2 duskmoss + 1 gloom_rune | workbench+needle | 100 | armor 5, +5% magic dmg | 500 | R2-3 |
| 67 | `gloomweave_robe_top` | 3 silk_cloth + 2 duskmoss + 2 gloom_rune | workbench+needle | 106 | armor 9, +8% magic dmg; SET: gloom spells +10% dmg | 620 | R2-3 |
| 70 | PERK Master Tanner | — | — | — | tanning double-yield chance 10%→20%; tan XP +50% on dusk/veil hides | — | — |
| 75 | Cut `veilstone` | 1 uncut_veilstone (chisel) | workbench | 150 | cut gem | 1400 | R3 |
| 75 | `gold_veilstone_amulet` | 1 gold_bar + 1 veilstone | furnace | 180 | +3% all dmg, +3% luck, distance-luck rolls +0.5 ring | 1900 | — |
| 75 | Tan `veil_leather` | 1 veil_hide | workbench | 90 | material | 150 | R3 |
| 75 | `veilcloth` | 1 silk_cloth + 1 veilblossom | loom_block | 100 | material | 260 | R3 |
| 75 | `veilhide_coif` | 1 veil_leather | workbench+needle | 140 | armor 10, +6% ranged acc (R75) | 700 | R3 |
| 78 | `veilhide_chaps` | 2 veil_leather | workbench+needle | 150 | armor 17, +6% ranged acc | 850 | R3 |
| 78 | `veilweave_hood` | 1 veilcloth | workbench+needle | 150 | armor 5, +6% magic dmg (MG75) | 900 | R3 |
| 81 | `veilhide_body` | 3 veil_leather | workbench+needle | 165 | armor 24, +8% ranged dmg | 1150 | R3 |
| 82 | `veilweave_robe_bottom` | 2 veilcloth | workbench+needle | 158 | armor 7, +8% magic dmg | 1100 | R3 |
| 85 | `veilweave_robe_top` | 3 veilcloth | workbench+needle | 170 | armor 12, +10% magic dmg; SET: 10% chance cast consumes no runes | 1400 | R3 |
| 88 | PERK Jeweler's Touch | — | — | — | 8% chance jewelry crafts refund the gem | — | — |
| 90 | PERK Glassmaster | — | — | — | glass_orb costs 1 sand; glass_vial batch 4→5 | — | — |
| 92 | PERK Loom Mastery | — | — | — | cloth crafts (bowstring/linen/silk/veilcloth) 15% double output | — | — |
| 95 | PERK Master Jeweler | — | — | — | jewelry XP +25%; RC enchants on your jewelry cost −1 ward_rune | — | — |
| 99 | CAPSTONE Veilwright | — | — | — | all CR crafts +20% XP, 10% double output (non-jewelry); title | — | — |

## CR-B. Gem Cutting Summary (chisel, workbench; gems arrive ONLY via mining rolls / dig sites)

| Gem | Cut lv | XP | Uncut coin | Cut coin | Sink |
|---|---|---|---|---|---|
| uncut_sapphire → sapphire | 20 | 30 | 40 | 90 | silver ring CR20 / amulet CR24 |
| uncut_emerald → emerald | 30 | 45 | 75 | 170 | silver necklace CR32 |
| uncut_ruby → ruby | 45 | 62 | 130 | 300 | gold ring CR45 / amulet CR48 |
| uncut_diamond → diamond | 58 | 90 | 240 | 550 | gold ring CR58 / necklace CR62 |
| uncut_veilstone → veilstone | 75 | 150 | 600 | 1400 | gold_veilstone_amulet CR75; also HB75 veilfire_elixir uses UNCUT |

## CR-C. Jewelry Stat Map + Runecraft Enchant Handoff

Base jewelry works unenchanted at the values in CR-A. RC enchant (enchant_altar, ward_rune + elemental) DOUBLES the buff and adds the rider. No new ids: enchant sets `enchanted:true` on the item instance (see REGISTRY GAPS).

| Item | Gem stat identity | RC lv | Rune cost | Enchanted effect |
|---|---|---|---|---|
| silver_sapphire_ring | sapphire = luck/gathering | RC25 | 2 ward + 2 air | +6% gather double-drop luck |
| silver_sapphire_amulet | sapphire = magic | RC25 | 2 ward + 2 air | +8% magic accuracy |
| silver_emerald_necklace | emerald = life | RC33 | 3 ward + 2 water | +2 HP/8s regen |
| gold_ruby_ring | ruby = aggression | RC46 | 4 ward + 3 fire | +8% melee crit |
| gold_ruby_amulet | ruby = strength | RC46 | 4 ward + 3 fire | +10% strength dmg |
| gold_diamond_ring | diamond = defense | RC59 | 5 ward + 3 earth | +8 armor |
| gold_diamond_necklace | diamond = precision | RC59 | 5 ward + 3 earth | +10% ranged dmg |
| gold_veilstone_amulet | veilstone = everything | RC76 | 8 ward + 2 veil_rune | +6% all dmg, +6% luck, luck rolls +1 ring tier |

## CR-D. Armor Set Totals (armor/(armor+30) reduction)

| Set (equip) | Total armor | Reduction | Set bonus |
|---|---|---|---|
| leather (R1) | 9 | 23% | — |
| studded (R15) | 15 | 33% | — |
| hardleather (R30) | 21 | 41% | — |
| emberhide (R45) | 30 | 50% | fire dmg −10% |
| duskhide (R60) | 39 | 57% | — |
| veilhide (R75) | 51 | 63% | — |
| linen (MG1) | 4 | 12% | — |
| silkspun (MG15) | 6 | 17% | — |
| runeweave (MG30) | 10 | 25% | 5% rune save |
| emberweave (MG45) | 14 | 32% | fire spells +10% |
| gloomweave (MG60) | 18 | 38% | gloom spells +10% |
| veilweave (MG75) | 24 | 44% | 10% free cast |

Glass line: vial CR10 (batch 3→4@38→5@90), orb CR25 (2 sand→1@90). Pottery line: fired_bowl CR5 (batch 2@38) — consumed permanently by hearty_stew (C15), the pottery sink. Flax line: FO1 wild flax bootstraps bowstring/linen/bandage/small_net/bird_snare at CR1 before FA20 farmed flax scales volume.

# ARCHAEOLOGY (A) 1-99

Digs use the metal shovel kit (SM-smithed; trowel folded in): copper A1, iron A15, steel A30, emberite A45, meteoric A60, veilsteel A75. Shovel tier = dig speed ×1.0/1.15/1.3/1.5/1.7/2.0 and +0/1/2/3/4/5% relic find. Dig sites are parameterized `dig_site` nodes (retained engine id), 6 variants.

## A-A. Master Unlock Table

| Lv | Unlock | Inputs | Station | XP | Output/effect | Coin | Ring |
|---|---|---|---|---|---|---|---|
| 1 | Dig Surface Caches; find `weathered_relic` | copper_shovel+ | dig_site | 10/dig +25/relic | relic: vendor + RC feed | 30 | R0 |
| 5 | PERK Field Sketching | — | — | — | +20% dig XP at R0 sites | — | R0 |
| 10 | PERK Essence Sift | — | — | — | rune_essence dig finds +1 qty | — | all |
| 15 | Iron shovel digs | iron_shovel | — | — | speed ×1.15, +1% find | — | — |
| 20 | Barrow sites | — | dig_site | 16/dig | richer R0-1 table (silver_ore, coin) | — | R0-1 |
| 25 | Ruin sites; find `engraved_relic` | — | dig_site | 26/dig +70/relic | relic: RC ward-batch feed | 90 | R1 |
| 30 | Steel shovel; RESTORE I | 1 weathered_relic + 1 linen_cloth | workbench | 40 | → 3 rune_essence + 20 coin | — | — |
| 35 | PERK Careful Excavation | — | — | — | +1 charge on all dig sites | — | all |
| 40 | PERK Gem Stratum | — | — | — | uncut-gem dig % doubled (takes from essence share) | — | all |
| 45 | Emberite shovel; Scorched Vaults | — | dig_site | 42/dig | R2 table (ember_ash, ruby) | — | R2 |
| 50 | Find `runic_relic` | — | dig_site | +160/relic | relic: RC gloom feed + BL lore | 240 | R2 |
| 55 | RESTORE II | 1 engraved_relic + 1 glass_vial | workbench | 110 | → 8 rune_essence + 60 coin | — | — |
| 60 | Meteoric shovel; Crater Digs | — | dig_site | 60/dig | meteoric_ore trickle (SM feed) | — | R2-3 |
| 65 | PERK Hoard Sense | — | — | — | 10% chance dig yields double drops | — | all |
| 70 | Veil Sites | — | dig_site | 85/dig | R3 table | — | R3 |
| 75 | Veilsteel shovel; find `veilbound_relic` | — | dig_site | +320/relic | relic: RC veil_rune feed | 650 | R3 |
| 80 | RESTORE III | 1 runic_relic + 1 glass_orb | workbench | 240 | → 16 rune_essence + 180 coin + 25% uncut_sapphire | — | — |
| 85 | PERK Preservation | — | — | — | 15% chance dig doesn't consume a node charge | — | all |
| 90 | RESTORE IV | 1 veilbound_relic + 1 veilcloth | workbench | 450 | → 30 rune_essence + 500 coin | — | — |
| 95 | PERK Twin Find | — | — | — | relic finds 15% chance +1 relic | — | all |
| 99 | CAPSTONE Grand Archaeologist | — | — | — | dig XP +20%; 5% relic finds upgrade one tier; title | — | — |

## A-B. Dig Site Node Tables (variant of engine `dig_site`; every dig rolls the table once)

| Variant | Ring | A lv | Respawn | Charges | Base XP/dig |
|---|---|---|---|---|---|
| surface_cache | R0 | 1 | 40s | 3 (+1@A35) | 10 |
| barrow | R0-1 | 20 | 60s | 4 (+1) | 16 |
| ruin | R1 | 25 | 75s | 4 (+1) | 26 |
| scorched_vault | R2 | 45 | 90s | 5 (+1) | 42 |
| crater_dig (meteor craters only) | R2-3 | 60 | 110s | 5 (+1) | 60 |
| veil_site | R3 | 70 | 140s | 6 (+1) | 85 |

Drop tables (relic rows fall back to next relic down if the find-level isn't met):

| Variant | Drops (%, qty) |
|---|---|
| surface_cache | weathered_relic 30 · rune_essence×2 18 · bone 14 · clay×2 12 · sand×2 12 · coin 8-20 12 · uncut_sapphire 2 |
| barrow | weathered_relic 30 · engraved_relic(A25+) 8 · rune_essence×3 18 · bone×2 12 · coin 25-60 14 · uncut_sapphire 3 · silver_ore 6 · clay×2 9 |
| ruin | engraved_relic 26 · weathered_relic 20 · rune_essence×3 20 · coin 40-90 12 · uncut_emerald 3 · clay×3 10 · bone×2 9 |
| scorched_vault | runic_relic(A50+) 18 · engraved_relic 22 · rune_essence×4 20 · ember_ash×2 12 · coin 90-180 12 · uncut_ruby 3 · bone×2 13 |
| crater_dig | runic_relic 24 · engraved_relic 15 · meteoric_ore 8 · rune_essence×5 22 · coin 150-300 14 · uncut_diamond 3 · bone×3 14 |
| veil_site | veilbound_relic(A75+) 16 · runic_relic 24 · rune_essence×6 24 · uncut_veilstone 2 · coin 300-600 16 · veilgourd_seed 4 · bone×3 14 |

## A-C. Relic Sinks (every relic: 3 sinks — vendor, restore, direct handoff)

| Relic | Coin | A restore (lv, output) | RC direct (contract) | CN/BL direct (contract) |
|---|---|---|---|---|
| weathered_relic | 30 | A30 → 3 essence + 20c | RC infusion (RC agent, ~RC15) | cn_* display build input |
| engraved_relic | 90 | A55 → 8 essence + 60c | RC25 ward_rune batch feed | cn_* display input |
| runic_relic | 240 | A80 → 16 essence + 180c | RC60 gloom_rune feed | BL lore study (BL agent) |
| veilbound_relic | 650 | A90 → 30 essence + 500c | RC75 veil_rune feed | cn_* cap trophy build |

# CROSS-SKILL CONTRACTS

**CRAFTING consumes:** Mining — silver_ore (M20, 1/silver_bar), gold_ore (M40, 1/gold_bar), all 5 uncut gems (mining rolls, 1/cut), sand (shovel/shores, 1/vial batch, 2→1/orb), clay (shovel/clay_deposit, 1/bowl). Hunter+mob slots — rough_hide (HU1/R0, 1-3/leather piece), thick_hide (HU30/R1), dusk_hide (HU60/R2), veil_hide (HU75/R3, 1/tan), silk_thread (R1+ stalker/caster slots, 3/silk_cloth). Farming/Foraging — flax (FO1 wild bootstrap / FA20 farmed; 2/bowstring, 3/linen_cloth), ember_ash (FO35, 1-2/emberweave piece), duskmoss (FO60, 1-2/gloomweave piece), veilblossom (FO75, 1/veilcloth). Smithing — iron_bar (SM15, 1-2/studded piece), emberite_bar (SM45, 1-2/emberhide piece), needle+chisel (SM1, non-consumed), hammer n/a. Fletching — oak_plank (FL1, 1/bird_snare), willow_plank (FL30, 2/lobster_cage). Runecraft — air_rune×2+water_rune×2 (RC1/10, runeweave_hood), earth_rune×3 (RC20, bottom), fire_rune×3 (RC35, top), gloom_rune×1-2 (RC60, gloomweave pieces).

**CRAFTING provides:** Fishing — small_net (CR1→F1), lobster_cage (CR50→F55). Hunter — bird_snare (CR1→HU1). Herblore — glass_vial (CR10, 1/potion HB15+; healing_salve vial-free). Fletching — bowstring (CR1, 1/bow+1/fishing_rod), glass_orb (CR25, 1/staff all tiers). Cooking — fired_bowl (CR5, consumed by hearty_stew C15). Healing — bandage (CR1, heals 4). Ranged — 6 hide sets (equip R1/15/30/45/60/75). Magic — 6 robe sets (MG1/15/30/45/60/75). Runecraft — 8 unenchanted jewelry pieces as enchant bases (RC25/33/46/59/76 per CR-C). All combat — jewelry buffs per CR-C.

**ARCHAEOLOGY consumes:** Smithing — shovel kit (copper/iron/steel/emberite/meteoric/veilsteel at A1/15/30/45/60/75, durability tool). Crafting — linen_cloth (1/Restore I), glass_vial (1/Restore II), glass_orb (1/Restore III), veilcloth (1/Restore IV).

**ARCHAEOLOGY provides:** Runecraft — rune_essence in bulk (dig drops ×2-6 + restores 3/8/16/30) and whole relics: engraved_relic→RC25 ward batch, runic_relic→RC60 gloom feed, veilbound_relic→RC75 veil feed, weathered_relic→RC low-level infusion. Construction — weathered/engraved/veilbound relics as cn_* display/trophy inputs. Beastlore — runic_relic lore study. Smithing — meteoric_ore trickle (crater_dig 8%). Crafting — uncut gems (2-3%/dig, doubled @A40), clay×2-3, sand×2, silver_ore (barrow 6%). Cooking — bone (→beast_treat via C10). Economy — coin caches 8-600 by ring.

# REGISTRY GAPS

1. **No enchanted-jewelry ids** (e.g. no `silver_sapphire_ring_e`). Modeled as an `enchanted:true` instance flag applied by RC at enchant_altar. If the orchestrator wants distinct ids, 8 new ids are needed.
2. **uncut_diamond cut-level conflict**: §2 says cut CR60, §16 gold_diamond_ring CR58. Resolved by tuning diamond cutting to CR58 (2-level tune, flagged not silently applied). Alternative: move ring to CR60.
3. **Pottery ceiling**: fired_bowl (CR5) is the only pottery id — the line tops out immediately; covered with batch perks, but 1-2 mid/high pottery ids (e.g. an urn for CN or Archaeology relic-storage) would give the line a ladder.
4. **Dig-site variants** (surface_cache/barrow/ruin/scorched_vault/crater_dig/veil_site) are config keys on retained engine node `dig_site`, not new item ids — worldgen agent must place them per ring.
5. **Timing note, not a gap**: silkspun robes equip at MG15 but require silk_thread (R1+ mob drop) and CR30 — first mage upgrade after linen arrives mid-game by design; vendors may stock silk_thread if this is too tight.
6. Leather set craft levels staggered CR1/4/7 vs §14's flat "CR1" hint — deliberate, first recipe still at lv1.


# PART 6 — HERBLORE & RUNECRAFT

# HERBLORE (HB) — station `alchemy_table` (salves/coatings by hand w/ `pestle_and_mortar`); tool `pestle_and_mortar` (FL1) required for all brews

Engine grounding: XP curve `xpForLevel(n)=60·(n−1)^2.4+80·(n−1)` → cum. XP lv10≈12.4k · lv25≈125k · lv45≈530k · lv60≈1.07M · lv75≈1.85M · lv99≈3.6M. XP/action below is tuned to that curve. Buff stacking: potion buffs stack with jewelry/food, not with themselves; re-drinking refreshes duration. Armor math per engine: DR = armor/(armor+30).

## HB-1 Herb ladder per ring (Foraging sources)

| herb | FO lv | ring/biome | node | gather XP (FO) | coin | HB sinks |
|---|---|---|---|---|---|---|
| sageleaf | 1 | R0 meadow/forest | herb_patch(R0) | 12 | 3 | healing_salve, healing_potion, antipoison |
| wildberries | 1 | R0+ | berry_bush | 9 | 1 | healing_salve, healing_potion, foragers_brew (also C: beast_treat) |
| flax (wild) | 1 | R0 | tall_grass / herb_patch(R0) | 8 | 2 | (CR bootstrap — listed for patch table completeness) |
| bogmint | 20 | R0-1 swamp | herb_patch(swamp) | 26 | 8 | strength_potion, defense_potion, foragers_brew, hunters_brew |
| ember_ash | 35 | R2 lava margins | herb_patch(volcanic) | 48 | 10 | ember_tonic (also CR: emberweave dye) |
| emberbloom | 40 | R2 volcanic | herb_patch(volcanic) | 48 | 22 | ember_tonic |
| duskmoss | 60 | R2-3 dark forest | herb_patch(darkforest) | 72 | 35 | ranging_potion, magic_potion, weapon poison (also CR: gloomweave dye) |
| veilblossom | 75 | R3 veilfen | herb_patch(veilfen) | 100 | 70 | veilfire_elixir (also CR: veilcloth) |

## HB-2 Herb node tables (nodes.js schema: xp / time s / charges / respawn s / weighted drops / luck-scaled rares)

| node variant | FO lv | xp | time | charges | respawn | drops (weight, qty, lv-gate) | rare (chance × (1+luck)) |
|---|---|---|---|---|---|---|---|
| herb_patch — R0 meadow | 1 | 12 | 1.8 | [1,2] | 45 | sageleaf w5 q1-2; flax w2 q1 | bogmint 3% |
| herb_patch — swamp (R0-1) | 20 | 26 | 2.0 | [1,2] | 60 | bogmint w4 q1-2 (lv20); sageleaf w2 q1 | venom_sac 2% |
| herb_patch — volcanic (R2) | 35 | 48 | 2.2 | [1,2] | 90 | ember_ash w4 q1-2 (lv35); emberbloom w2 q1 (lv40) | emberbloom +1 4% |
| herb_patch — dark forest (R2-3) | 60 | 72 | 2.4 | [1,2] | 120 | duskmoss w5 q1-2 (lv60) | veilblossom 2% (R3 cells only) |
| herb_patch — veilfen (R3) | 75 | 100 | 2.6 | [1,3] | 160 | veilblossom w3 q1-2 (lv75); duskmoss w2 q1 | veilgourd_seed 2% |
| berry_bush | 1 | 9 | 1.6 | [2,3] | 70 | wildberries w1 q1-3 | — |

## HB-3 Secondaries from other skills (drop tables)

| secondary | source (skill lv) | rate | qty | HB sink |
|---|---|---|---|---|
| venom_sac | any poison-tagged slot mob (skitterer/stalker), all rings | 25% + 5%/ring | 1 | antipoison ×1; weapon poison ×2 |
| feather | flyer-slot mobs / bird_snare (HU1) | 80% mob / per snare cycle | 2-5 | hunters_brew ×3; ranging_potion ×2 |
| rough_hide | R0 beast slots / bird_snare (HU1) | 70% / 40% | 1 | defense_potion ×1 (scraped) |
| wheat | farm_plot (FA1) | per harvest | 1-2 | multi-dose binder ×1/brew (HB30+) |
| sunmelon | farm_plot (FA45) | per harvest | 1 | potent ember_tonic ×1 |
| raw_glowfin | fishing_spot glowing lakes (F80, R2-3) | per catch | 1 | potent magic_potion ×1 |
| raw_veilray | fishing_spot R3 (F90) | per catch | 1 | potent veilfire_elixir ×1 |
| rune_essence | mining roll (M5+, see RC-1) | see RC-1 | 1-2 | magic_potion ×3 |
| uncut_veilstone | mining gem roll (R3-weighted) | see Mining agent | 1 | veilfire_elixir ×1 |
| glass_vial | CR10, sand, batch 3 | — | 1/vialed brew | container (consumed) |

## HB-4 Complete unlock table 1-99

Dose/potency variants are **quality flags on the same item id** (Appendix-A R4 precedent), never new ids. "dose": one drink; effects per dose.

| lv | unlock | exact inputs (per brew) | station | XP/action | output stats | coin | ring |
|---|---|---|---|---|---|---|---|
| 1 | healing_salve | 1 sageleaf + 2 wildberries | by hand (pestle) | 15 | heal 12 HP over 6 s; no vial | 8 | R0 |
| 5 | Salve batch (ability) | 2 sageleaf + 3 wildberries → 2× healing_salve | by hand | 26 | as lv1, ×2 yield | 8 ea | R0 |
| 10 | healing_potion (GAP id) | 1 glass_vial + 2 sageleaf + 2 wildberries | alchemy_table | 38 | heal 16 HP instant, per dose | 20 | R0 |
| 15 | antipoison | 1 glass_vial + 1 sageleaf + 1 venom_sac | alchemy_table | 52 | cure poison + 90 s immunity + heal 5 | 30 | R0-1 |
| 20 | foragers_brew (GAP id) | 1 glass_vial + 1 bogmint + 2 wildberries | alchemy_table | 66 | +10% gather speed, +3% gather crit, 180 s (all gathering skills) | 40 | R0-1 |
| 25 | strength_potion | 1 glass_vial + 2 bogmint | alchemy_table | 80 | melee damage ×1.12, 180 s | 55 | R0-1 |
| 30 | Twin-dose brewing (ability) | vialed brews add 1 wheat (binder) | alchemy_table | recipe XP ×1.5 | all vialed potions = 2 doses | value ×1.7 | — |
| 35 | defense_potion | 1 glass_vial + 2 bogmint + 1 rough_hide | alchemy_table | 96 | +12 armor, 180 s (0→12 armor = 28.6% DR standalone; additive with gear) | 70 | R0-1 |
| 40 | hunters_brew (GAP id) | 1 glass_vial + 1 bogmint + 3 feather | alchemy_table | 112 | +12% Hunter yield, +10% snare cycle speed, 240 s | 60 | R0-1 |
| 45 | ember_tonic | 1 glass_vial + 1 emberbloom + 2 ember_ash | alchemy_table | 135 | fire/lava damage −80%, 300 s (emberite lava-mining enabler, M45) | 95 | R2 |
| 50 | ranging_potion | 1 glass_vial + 1 duskmoss + 2 feather | alchemy_table | 150 | ranged damage ×1.12, 180 s | 110 | R2-3 |
| 55 | Potent brewing I (ability) | potent strength: 4 bogmint + 1 wheat; potent defense: 4 bogmint + 2 rough_hide + 1 wheat | alchemy_table | 128 / 154 | ×1.18 melee / +18 armor, 240 s | ×1.8 | R0-1 |
| 60 | magic_potion | 1 glass_vial + 1 duskmoss + 3 rune_essence | alchemy_table | 190 | magic damage ×1.12, 180 s | 150 | R2-3 |
| 65 | Potent brewing II (ability) | potent ember_tonic: 2 emberbloom + 2 ember_ash + 1 sunmelon; potent ranging: 2 duskmoss + 4 feather + 1 wheat | alchemy_table | 216 / 240 | fire −90% 480 s + heal 20 / ranged ×1.18, 240 s | ×1.8 | R2 / R2-3 |
| 70 | Tri-dose brewing (ability) | unchanged (+1 wheat still) | alchemy_table | recipe XP ×1.75 total | all vialed potions = 3 doses | value ×2.2 | — |
| 75 | veilfire_elixir | 1 glass_vial + 1 veilblossom + 1 uncut_veilstone | alchemy_table | 280 | ALL combat stats ×1.08 + luck +0.15 (nodes.js luck param), 300 s | 350 | R3 |
| 80 | Potent magic_potion (ability) | 2 duskmoss + 3 rune_essence + 1 raw_glowfin | alchemy_table | 320 | magic ×1.18 + night-glow (light r6), 240 s | 260 | R2-3 |
| 85 | Weapon poison (coating) | 2 venom_sac + 1 duskmoss (pestle) | by hand | 250 | coats 1 melee weapon or 15 ammo: +2 poison dmg/2 s for 6 s per hit, 30 hits | 120 | any |
| 90 | Twin-still (ability) | any recipe ×2 inputs → 2 potions/action | alchemy_table | XP ×2.1 | 15% chance to refund primary herb | — | — |
| 95 | Potent veilfire_elixir (ability) | 2 veilblossom + 1 uncut_veilstone + 1 raw_veilray | alchemy_table | 430 | all combat stats ×1.12 + luck +0.25, 360 s | 600 | R3 |
| 99 | Panacea Mastery (capstone) | — | — | — | own potions: +25% duration; every dose also cures poison + heals 10; 20% herb refund on all brews | — | — |

---

# RUNECRAFT (RC) — station `enchant_altar` (Runestone Altar); bind action = up to 25 rune_essence per action, 5 s

Bootstrap: essence available from **dig_site at A1** (before M5); enchant_altar must be CN-buildable ≤ lv5 with R0 mats (contract to Construction agent — Appendix-A blocker-1 rule).

## RC-1 rune_essence sources

| source | requirement | rate | qty |
|---|---|---|---|
| roll while mining ANY rock node (ore_copper/iron/coal/silver/gold/emberite/meteoric, riftstone) | Mining 5+ | 12% + 0.2%×Mining lv (cap 32%), × (1+luck) per engine rare-roll | 1-2, +1 if R2+ ("essence-weighted" rings) |
| dig_site drop line | Archaeology 1 | weight 3 in dig table | 2-4 |
| relic infusions (below) | RC 5/30/62/80 | per relic | rune batches, not essence |

Essence sinks: RC binding, HB magic_potion (×3). Coin 2.

## RC-2 Runes-per-essence scaling (the bind ladder)

| rune | craft lv | base yield | upgrade thresholds (runes per 1 essence) | XP/essence | XP/full bind (25 ess) | coin/rune | spell tier fed |
|---|---|---|---|---|---|---|---|
| air_rune | 1 | 1 | ×2 @14 · ×3 @38 · ×4 @66 · ×5 @86 | 8 | 200 | 3 | T1 (MG1) |
| water_rune | 10 | 1 | ×2 @24 · ×3 @52 · ×4 @76 | 11 | 275 | 4 | T2 (MG15) |
| earth_rune | 20 | 1 | ×2 @34 · ×3 @58 · ×4 @82 | 14 | 350 | 6 | T3 (MG30) |
| ward_rune | 25 | 1 per 2 ess | 1 per 1 @50 · 3 per 2 @75 | 16 | 400 | 10 | utility/protection + enchants |
| fire_rune | 35 | 1 | ×2 @49 · ×3 @73 · ×4 @97 | 20 | 500 | 8 | T4 (MG45) |
| gloom_rune | 60 | 1 per 2 ess | 1 per 1 @78 · ×2 @94 | 34 | 850 | 18 | T5 (MG60) |
| veil_rune | 75 | 1 per 3 ess | 1 per 2 @90 · 1 per 1 @99 | 55 | 1375 | 40 | T6 (MG75) |

## RC-3 Relic infusions (Archaeology sink; altar action, 1 relic each)

| lv | action | input (A source lv) | XP | rune payout | coin (relic vendor alt) |
|---|---|---|---|---|---|
| 5 | Infuse weathered_relic | weathered_relic (A1, R0) | 150 | 6 air_rune | 30 |
| 30 | Infuse engraved_relic | engraved_relic (A25, R1) | 420 | 4 ward_rune | 90 |
| 62 | Infuse runic_relic | runic_relic (A50, R2) | 1000 | 6 gloom_rune | 220 |
| 80 | Infuse veilbound_relic | veilbound_relic (A75, R3) | 2200 | 6 veil_rune | 500 |

## RC-4 Jewelry enchants (applies "enchanted" quality flag to same id — no new ids; enchanted value ×1.6; jewelry from CR §16)

| lv | enchant target (CR lv) | rune cost | XP | effect: base → enchanted |
|---|---|---|---|---|
| 27 | silver_sapphire_ring (CR20) | 1 ward + 5 air | 120 | gather luck +0.05 → +0.10 |
| 29 | silver_sapphire_amulet (CR24) | 1 ward + 5 water | 140 | magic accuracy +3% → +6% |
| 33 | silver_emerald_necklace (CR32) | 1 ward + 6 earth | 170 | regen 1 HP/10 s → 1 HP/6 s |
| 46 | gold_ruby_ring (CR45) | 2 ward + 6 fire | 260 | melee crit +3% → +6% |
| 48 | gold_ruby_amulet (CR48) | 2 ward + 8 fire | 300 | melee damage ×1.05 → ×1.08 |
| 58 | gold_diamond_ring (CR58) | 2 ward + 8 earth | 380 | +6 armor → +10 armor |
| 63 | gold_diamond_necklace (CR62) | 2 ward + 6 air + 6 fire | 420 | ranged damage ×1.05 → ×1.08 |
| 77 | gold_veilstone_amulet (CR75) | 3 ward + 10 gloom + 5 veil | 900 | all stats ×1.05 → ×1.08; distance-luck amp +0.10 → +0.20 |

## RC-5 Complete unlock table 1-99

| lv | unlock | inputs | station | XP/action | output | coin | ring |
|---|---|---|---|---|---|---|---|
| 1 | Bind air_rune | 25 rune_essence | enchant_altar | 200 | 25 air_rune | 3 ea | any |
| 5 | Infuse weathered_relic | 1 weathered_relic | enchant_altar | 150 | 6 air_rune | — | R0 |
| 10 | Bind water_rune | 25 essence | enchant_altar | 275 | 25 water_rune | 4 ea | any |
| 14 | Air mastery ×2 | — | — | — | 2 air/essence | — | — |
| 20 | Bind earth_rune | 25 essence | enchant_altar | 350 | 25 earth_rune | 6 ea | any |
| 24 | Water mastery ×2 | — | — | — | 2 water/essence | — | — |
| 25 | Bind ward_rune | 25 essence | enchant_altar | 400 | 12 ward_rune (2 ess ea) | 10 ea | any |
| 27 | Enchant sapphire ring | ring + 1 ward + 5 air | enchant_altar | 120 | luck +0.10 flag | ×1.6 | — |
| 29 | Enchant sapphire amulet | amulet + 1 ward + 5 water | enchant_altar | 140 | magic acc +6% flag | ×1.6 | — |
| 30 | Infuse engraved_relic | 1 engraved_relic | enchant_altar | 420 | 4 ward_rune | — | R1 |
| 33 | Enchant emerald necklace | necklace + 1 ward + 6 earth | enchant_altar | 170 | regen 1/6 s flag | ×1.6 | — |
| 34 | Earth mastery ×2 | — | — | — | 2 earth/essence | — | — |
| 35 | Bind fire_rune | 25 essence | enchant_altar | 500 | 25 fire_rune | 8 ea | any |
| 38 | Air mastery ×3 | — | — | — | 3 air/essence | — | — |
| 46 | Enchant ruby ring | ring + 2 ward + 6 fire | enchant_altar | 260 | crit +6% flag | ×1.6 | — |
| 48 | Enchant ruby amulet | amulet + 2 ward + 8 fire | enchant_altar | 300 | melee ×1.08 flag | ×1.6 | — |
| 49 | Fire mastery ×2 | — | — | — | 2 fire/essence | — | — |
| 50 | Ward mastery | — | — | — | 1 ward/essence | — | — |
| 52 | Water mastery ×3 | — | — | — | 3 water/essence | — | — |
| 58 | Earth ×3 + Enchant diamond ring | ring + 2 ward + 8 earth | enchant_altar | 380 | +10 armor flag; 3 earth/ess | ×1.6 | — |
| 60 | Bind gloom_rune | 25 essence | enchant_altar | 850 | 12 gloom_rune (2 ess ea) | 18 ea | R2+ essence-weighted |
| 62 | Infuse runic_relic | 1 runic_relic | enchant_altar | 1000 | 6 gloom_rune | — | R2 |
| 63 | Enchant diamond necklace | necklace + 2 ward + 6 air + 6 fire | enchant_altar | 420 | ranged ×1.08 flag | ×1.6 | — |
| 66 | Air mastery ×4 | — | — | — | 4 air/essence | — | — |
| 73 | Fire mastery ×3 | — | — | — | 3 fire/essence | — | — |
| 75 | Bind veil_rune + Ward 3-per-2 | 25 essence | enchant_altar | 1375 | 8 veil_rune (3 ess ea); ward 3 per 2 ess | 40 ea | R3 |
| 76 | Water mastery ×4 | — | — | — | 4 water/essence | — | — |
| 77 | Enchant veilstone amulet | amulet + 3 ward + 10 gloom + 5 veil | enchant_altar | 900 | all ×1.08 + luck-amp +0.20 flag | ×1.6 | — |
| 78 | Gloom mastery | — | — | — | 1 gloom/essence | — | — |
| 80 | Infuse veilbound_relic | 1 veilbound_relic | enchant_altar | 2200 | 6 veil_rune | — | R3 |
| 82 | Earth mastery ×4 | — | — | — | 4 earth/essence | — | — |
| 86 | Air mastery ×5 | — | — | — | 5 air/essence | — | — |
| 90 | Veil mastery | — | — | — | 1 veil per 2 essence | — | — |
| 94 | Gloom mastery ×2 | — | — | — | 2 gloom/essence | — | — |
| 97 | Fire mastery ×4 | — | — | — | 4 fire/essence | — | — |
| 99 | Veilweaver (capstone) | — | — | — | 1 veil/essence; bind action size 25→50 essence; enchants re-rollable; +5% rune yield all types | — | — |

---

# CROSS-SKILL CONTRACTS

## Herblore CONSUMES

| from skill | item | their lv | qty |
|---|---|---|---|
| Foraging | sageleaf | FO1 | 1-2 per salve/heal/antipoison brew |
| Foraging | wildberries | FO1 | 2-3 per salve/heal/foragers brew |
| Foraging | bogmint | FO20 | 1-4 per str/def/forager/hunter brew |
| Foraging | ember_ash | FO35 | 2 per ember_tonic |
| Foraging | emberbloom | FO40 | 1-2 per ember_tonic |
| Foraging | duskmoss | FO60 | 1-2 per ranging/magic/poison |
| Foraging | veilblossom | FO75 | 1-2 per veilfire_elixir |
| Hunter | venom_sac | HU any (poison mobs 25%+5%/ring) | 1 per antipoison, 2 per weapon poison |
| Hunter | feather | HU1 (flyers/snare) | 2-4 per ranging/hunters brew |
| Hunter | rough_hide | HU1 | 1-2 per defense_potion |
| Fishing | raw_glowfin | F80 | 1 per potent magic_potion |
| Fishing | raw_veilray | F90 | 1 per potent veilfire_elixir |
| Farming | wheat | FA1 | 1 per vialed brew from HB30 (binder) |
| Farming | sunmelon | FA45 | 1 per potent ember_tonic |
| Mining | rune_essence | M5 roll / A1 dig | 3 per magic_potion |
| Mining | uncut_veilstone | gem roll R3 | 1 per veilfire_elixir |
| Crafting | glass_vial | CR10 | 1 per vialed brew |
| Fletching | pestle_and_mortar | FL1 | 1 durable tool |
| Construction | alchemy_table | CN ≤3, R0 mats (bootstrap contract) | 1 station |

## Herblore PROVIDES

| to | item/effect | HB lv | numbers |
|---|---|---|---|
| Healing | healing_salve / healing_potion / antipoison | 1/10/15 | heal 12 / 16 per dose / cure+90 s |
| All gathering | foragers_brew | 20 | +10% speed +3% crit 180 s |
| Strength | strength_potion (+potent) | 25/55 | ×1.12 / ×1.18 |
| Defense | defense_potion (+potent) | 35/55 | +12 / +18 armor |
| Hunter | hunters_brew | 40 | +12% yield 240 s |
| Mining | ember_tonic | 45 | −80% fire/lava 300 s → enables M45 emberite |
| Ranged | ranging_potion (+potent), weapon poison on ammo | 50/65/85 | ×1.12/×1.18; +2/2 s poison |
| Magic | magic_potion (+potent) | 60/80 | ×1.12/×1.18 |
| All combat | veilfire_elixir (+potent) | 75/95 | ×1.08 all + luck +0.15 / ×1.12 + 0.25 |

## Runecraft CONSUMES

| from skill | item | their lv | qty |
|---|---|---|---|
| Mining | rune_essence | M5+ roll (12%+0.2%/lv, q1-2, +1 R2+) | 25 per bind action (50 at RC99) |
| Archaeology | weathered_relic / engraved_relic / runic_relic / veilbound_relic | A1/A25/A50/A75 | 1 per infusion (RC5/30/62/80) |
| Crafting | 8 jewelry ids (§16) | CR20-75 | 1 per enchant |
| Construction | enchant_altar | CN ≤5, R0 mats (bootstrap contract) | 1 station |

## Runecraft PROVIDES

| to | item | RC lv | qty guidance |
|---|---|---|---|
| Magic (spell_* agent) | air/water/earth/fire/gloom/veil runes | 1/10/20/35/60/75 | suggested costs: T1 2 air · T2 2 water+1 air · T3 2 earth+1 air · T4 2 fire+1 air · T5 2 gloom+2 fire · T6 2 veil+2 gloom · protection 1-2 ward/cast; one bind action (25 ess ×3 yield) ≈ 25-35 casts |
| Crafting | elemental runes for runeweave set (CR30) | 1-35 | suggest 8 air+8 water+8 earth per piece |
| Crafting | gloom_rune for gloomweave set (CR60) | 60 | suggest 4 per piece |
| Crafting/economy | enchanted flags on all 8 §16 jewelry ids | 27-77 | value ×1.6, effects per RC-4 |
| Herblore | (none — essence flows Mining→HB direct) | — | — |

## DELIBERATE CALLS (do not re-litigate without owner)

| call | rationale |
|---|---|
| Potency/dose/enchant variants = quality flags on existing ids | Appendix-A R4 precedent; zero id inflation |
| healing_salve + weapon poison are hand-crafts (pestle only) | HB lv1 bootstrap before alchemy_table exists (blocker-2 rule) |
| ranging_potion (HB50) uses duskmoss (FO60) | intentional cross-gap; alt source: stalker/caster slot mobs R2+ drop duskmoss 6% (existing id, slot-framework hook) |
| RC1 reachable via A1 dig_site essence even below M5 | no station/skill dead bootstrap |
| "R2+ essence-weighted" = essence qty +1 in R2+ | implements registry note without altar-location rules |

## REGISTRY GAPS

| proposed id | slot | recipe | justification |
|---|---|---|---|
| healing_potion | HB10 potion | glass_vial + 2 sageleaf + 2 wildberries | vial-era heal ladder step between salve (1) and antipoison (15); classic-gate 10 needs an item |
| foragers_brew | HB20 potion | glass_vial + bogmint + 2 wildberries | gathering-buff line; bogmint debut content at gate 20 |
| hunters_brew | HB40 potion | glass_vial + bogmint + 3 feather | Hunter-support potion; second feather sink; gate 40 |
| weapon_poison (OPTIONAL) | HB85 coating | 2 venom_sac + duskmoss | can ship as a coating property with no item id if the 288 cap is hard; id only needed if inventory representation required |


# PART 7 — CONSTRUCTION & THE COMBAT GEAR CURVE

# EMBERVEIL v2 — CONSTRUCTION + COMBAT GEAR CURVE

**Engine grounding (verified):** dmg = atkTotal × power × (1 − armor/(armor+30)) (`js/game/combat.js:400-401`); melee atkTotal = weapon.atk + 0.4×ST, ranged = weapon.atk + 0.4×R, magic = staff.atk + 0.45×MG + equip magic (`combat.js:342-369`); hit = clamp(60 + weapon.acc + 0.5×skill − target.evasion, 5, 95); `spd` = initiative; XP curve 60n^2.4+80n → lv99 ≈ 3.62M (`skills.js:107-111`); recipe format = station+skill+level+xp (`crafting.js`); stations/blocks are placeable items (`items.js:147-167`). Crit assumed ×1.75 dmg. All Construction placeables use delegated `cn_*` namespace; engine station ids (`workbench`, `furnace`, `anvil_block`, `campfire`, `alchemy_table`, `loom_block`, `enchant_altar`, `construction_bench`) are retained law. Adjacency buffs: furniture within 2 blocks of its station; same-type buffs do not stack. `stone` and `glass_pane` are missing registry ids — used below, flagged under REGISTRY GAPS.

---

## PART 1 — CONSTRUCTION 1-99

Bootstrap chain (dead-bootstrap check): campfire+workbench by hand at lv1 → furnace (workbench, stone+clay) → anvil (workbench, stone + 2 copper_bar = furnace-only inputs, never anvil-gated). Runestone altars spawn in R0 stone-circle ruins so RC1 works before the CN25 buildable altar. First CN recipe at lv1. ✓

### 1.1 Full unlock table (station "CB" = construction_bench; "hand" = no station)

| Lv | id | Build | Inputs (exact) | Out | Station | XP | Footprint | Function / stats | Coin | Ring |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | campfire | Campfire | 2 oak_log + 4 stone† | 1 | hand | 10 | 1×1 | Cooking station (C1+) | 8 | R0 |
| 1 | workbench | Workbench | 4 oak_plank | 1 | hand | 12 | 1×1 | Core craft station | 10 | R0 |
| 1 | furnace | Furnace | 8 stone† + 2 clay | 1 | workbench | 18 | 1×1 | Smelt/fire station (SM/CR firing) | 14 | R0 |
| 1 | cn_torch_post | Torch Post | 1 oak_plank + 2 flax | 4 | hand | 6 | 1×1 | Light radius 6 | 1 | R0 |
| 1 | cn_oak_wall | Oak Wall | 2 oak_plank | 2 | workbench | 8 | 1 block | Wall block, 30 block-HP | 2 | R0 |
| 2 | cn_oak_floor | Oak Floor | 2 oak_plank | 4 | workbench | 8 | 1 tile | Floor block | 1 | R0 |
| 2 | cn_oak_door | Oak Door | 3 oak_plank | 1 | workbench | 14 | 1×2 | Openable, mob-blocking | 6 | R0 |
| 3 | anvil_block | Anvil | 4 stone† + 2 copper_bar | 1 | workbench | 25 | 1×1 | Smithing station | 30 | R0 |
| 3 | cn_oak_fence | Oak Fence | 2 oak_plank + 1 flax | 4 | workbench | 8 | 1×1 | Pen/boundary, jump-proof | 1 | R0 |
| 4 | cn_oak_chest | Oak Chest | 8 oak_plank | 1 | workbench | 22 | 1×1 | Storage, 12 slots | 12 | R0 |
| 5 | construction_bench | Construction Bench | 6 oak_plank + 4 stone† | 1 | workbench | 30 | 1×1 | Unlocks all CN5+ builds | 18 | R0 |
| 5 | loom_block | Loom | 5 oak_plank + 2 bowstring | 1 | workbench | 28 | 1×1 | Crafting station (cloth/robes) | 20 | R0 |
| 5 | cn_oak_table | Oak Table | 4 oak_plank | 1 | CB | 12 | 1×1 | Décor; eat at table: +1 heal per food | 4 | R0 |
| 5 | cn_oak_chair | Oak Chair | 3 oak_plank | 2 | CB | 10 | 1×1 | Sit: +25% energy regen | 2 | R0 |
| 6 | cn_thatch_roof | Thatch Roof | 4 wheat | 4 | CB | 12 | 1 block | Sloped roof block | 1 | R0 |
| 8 | alchemy_table | Alchemy Table | 4 oak_plank + 2 clay + 2 stone† | 1 | CB | 40 | 1×1 | Herblore station (HB1 salve is vial-free ✓) | 22 | R0 |
| 10 | cn_stone_brick | Stone Brick | 4 stone† | 4 | CB | 10 | 1 block | Masonry block, 60 block-HP | 1 | R0 |
| 10 | cn_bed | Bed | 4 oak_plank + 2 linen_cloth + 2 wheat | 1 | CB | 45 | 2×1 | Sets respawn; sleep skips night | 30 | R0 |
| 12 | cn_stone_wall | Stone Wall | 2 cn_stone_brick | 2 | CB | 12 | 1 block | Dressed wall, 60 block-HP | 2 | R0 |
| 12 | cn_shelf | Shelf | 4 oak_plank + 4 nails | 1 | CB | 24 | wall 1×1 | Storage, 8 slots | 10 | R0 |
| 14 | cn_window | Window Frame | 2 oak_plank + 1 glass_pane† | 1 | CB | 20 | 1×1 | Transparent wall block | 8 | R0 |
| 15 | cn_brick | Fired Brick | 2 clay | 4 | furnace | 14 | 1 block | Red masonry, 60 block-HP | 1 | R0 |
| 15 | cn_birch_wall | Birch Wall | 2 birch_plank | 2 | CB | 16 | 1 block | Tier-2 wood wall, 40 HP | 4 | R0-1 |
| 15 | cn_birch_door | Birch Door | 3 birch_plank | 1 | CB | 22 | 1×2 | Tier-2 door | 10 | R0-1 |
| 16 | cn_brick_wall | Brick Wall | 2 cn_brick | 2 | CB | 12 | 1 block | Wall variant | 2 | R0 |
| 18 | cn_bellows | Bellows | 4 birch_plank + 1 leather + 4 nails | 1 | CB | 55 | 1×1 | Adjacent furnace: +10% smelt/fire speed | 40 | R0-1 |
| 20 | cn_training_dummy | Training Dummy | 4 oak_plank + 2 linen_cloth + 1 rough_hide | 1 | CB | 60 | 1×1 | Attackable tier-0 dummy: half combat XP, no drops | 35 | R0 |
| 20 | cn_banded_chest | Iron-Banded Chest | 6 birch_plank + 2 iron_bar + 6 nails | 1 | CB | 65 | 1×1 | Storage, 18 slots | 60 | R0-1 |
| 22 | cn_grindstone | Grindstone | 4 cn_stone_brick + 1 iron_bar | 1 | CB | 70 | 1×1 | Adjacent anvil: +10% smith speed | 50 | R0-1 |
| 25 | enchant_altar | Runestone Altar | 6 cn_stone_brick + 1 weathered_relic + 2 ward_rune | 1 | CB | 90 | 1×1 | Home RC/enchant station (world altars in R0 ruins cover RC1-24) | 150 | R0-1 |
| 25 | cn_lamppost | Lamppost | 2 iron_bar + 1 glass_orb | 1 | CB | 80 | 1×2 | Light radius 8 | 55 | R0-1 |
| 25 | cn_garden_planter | Garden Planter | 4 birch_plank + 2 clay | 1 | CB | 75 | 1×1 | Adjacent farm_plot: +10% crop growth | 40 | R0-1 |
| 28 | cn_dye_rack | Dye Rack | 4 birch_plank + 2 bogmint + 1 linen_cloth | 1 | CB | 85 | 1×1 | Adjacent loom: +10% weave speed | 50 | R1 |
| 30 | cn_willow_wall | Willow Wall | 2 willow_plank | 2 | CB | 30 | 1 block | Tier-3 wall, 50 HP | 8 | R1 |
| 30 | cn_willow_door | Willow Door | 3 willow_plank | 1 | CB | 40 | 1×2 | Tier-3 door | 16 | R1 |
| 32 | cn_still | Copper Still | 4 willow_plank + 2 glass_vial + 1 iron_bar | 1 | CB | 110 | 1×1 | Adjacent alchemy_table: +10% brew speed | 80 | R1 |
| 35 | cn_dock | Fishing Dock | 8 willow_plank + 6 nails | 1 | CB | 130 | 3×1 over water | Adjacent fishing_spot: +10% catch speed | 90 | R1 |
| 38 | cn_lectern | Runic Lectern | 4 willow_plank + 1 engraved_relic | 1 | CB | 150 | 1×1 | Adjacent enchant_altar: +10% runecraft speed | 120 | R1 |
| 40 | cn_trophy_mount | Trophy Mount | 4 willow_plank + 1 beast_trophy | 1 | CB | 160 | wall 1×1 | Displays trophy (Slayer sink); house-pride décor | 100 | R1 |
| 45 | cn_basalt_brick | Basalt Brick | 4 basalt | 4 | CB | 40 | 1 block | Dark masonry, 80 block-HP | 3 | R2 |
| 45 | cn_spruce_wall | Spruce Wall | 2 spruce_plank | 2 | CB | 55 | 1 block | Tier-4 wall, 60 HP | 12 | R2 |
| 45 | cn_spruce_door | Spruce Door | 3 spruce_plank | 1 | CB | 70 | 1×2 | Tier-4 door | 24 | R2 |
| 46 | cn_basalt_wall | Basalt Wall | 2 cn_basalt_brick | 2 | CB | 45 | 1 block | Dark dressed wall | 6 | R2 |
| 48 | cn_armor_stand | Armor Stand | 4 spruce_plank + 2 nails | 1 | CB | 200 | 1×2 | Holds/displays one full armor set (swap-set QoL) | 120 | R2 |
| 50 | cn_vault | Steel Vault | 8 spruce_plank + 4 steel_bar + 8 nails | 1 | CB | 300 | 1×1 | Storage, 32 slots | 250 | R2 |
| 52 | cn_glass_roof | Glass Roof | 2 glass_pane† + 2 spruce_plank | 2 | CB | 180 | 1 block | Transparent roof | 10 | R2 |
| 55 | cn_fountain | Stone Fountain | 8 cn_stone_brick + 2 glass_orb | 1 | CB | 260 | 2×2 | Décor; drink: minor energy refill 1/day | 200 | R2 |
| 60 | cn_duskwood_wall | Duskwood Wall | 2 duskwood_plank | 2 | CB | 90 | 1 block | Tier-5 wall, 70 HP | 20 | R2-3 |
| 60 | cn_duskwood_door | Duskwood Door | 3 duskwood_plank | 1 | CB | 110 | 1×2 | Tier-5 door | 40 | R2-3 |
| 60 | cn_shadow_lantern | Shadow Lantern | 2 duskwood_plank + 1 glass_orb + 1 gloom_rune | 1 | CB | 320 | 1×1 | Violet light radius 10 | 260 | R2-3 |
| 62 | cn_forge_hood | Forge Hood | 6 cn_basalt_brick + 2 emberite_bar | 1 | CB | 380 | 1×2 | Adjacent furnace: +20% smelt speed (replaces bellows bonus) | 340 | R2 |
| 65 | cn_slayer_board | Slayer Board | 4 duskwood_plank + 1 beast_trophy + 4 nails | 1 | CB | 420 | wall 1×1 | Home task board: reroll 1 Slayer task/day | 380 | R2-3 |
| 70 | cn_meteor_monument | Meteor Monument | 4 meteoric_bar + 8 cn_basalt_brick | 1 | CB | 600 | 2×2×3 | Base aura r16: +1% gathering crit chance | 900 | R2-3 |
| 75 | cn_veilwood_wall | Veilwood Wall | 2 veilwood_plank | 2 | CB | 150 | 1 block | Cap wall, 90 HP | 34 | R3 |
| 75 | cn_veilwood_door | Veilwood Door | 3 veilwood_plank | 1 | CB | 190 | 1×2 | Cap door | 64 | R3 |
| 75 | cn_veilwood_vault | Veilwood Vault | 8 veilwood_plank + 2 veilsteel_bar + 8 nails | 1 | CB | 800 | 1×1 | Storage, 48 slots | 1300 | R3 |
| 80 | cn_rift_brazier | Rift Brazier | 2 veil_flux + 4 cn_basalt_brick | 1 | CB | 900 | 1×1 | Light r12; suppresses hostile night-spawns r12 | 800 | R3 |
| 85 | cn_grand_arch | Grand Arch | 12 cn_stone_brick + 4 veilwood_plank + 2 gold_bar | 1 | CB | 1100 | 3×4 | Settlement gate; multi-block décor | 1500 | any |
| 90 | cn_veiled_tile | Veiled Tile | 2 cn_basalt_brick + 1 veil_flux | 4 | CB | 300 | 1 block | Shimmering cap masonry, 100 block-HP | 30 | R3 |
| 95 | cn_star_dome | Star Dome | 6 glass_pane† + 4 veilwood_plank + 2 meteoric_bar | 1 | CB | 1600 | 2×2 | At night: pings nearest meteor crater 1/day | 2200 | R3 |
| 99 | cn_veil_beacon | Veil Beacon | 1 veilstone + 4 veilsteel_bar + 8 veilwood_plank + 2 veil_rune | 1 | CB | 5000 | 1×3 | Capstone aura r32: +5% gather speed, +2% rare-find luck | 6000 | R3 |

Grind lane: wall/floor/roof batches are the volume XP (planks feed from Fletching at every tier). Approx actions between gates at the listed XP values: lv1→15 ≈ 250 small builds; 30→45 ≈ 900 (mixed); 75→99 ≈ 2,600 (mostly cn_veilwood_wall / cn_veiled_tile batches + capstones). Matches the 60n^2.4 curve without XP inflation.

### 1.2 Storage progression
| Lv | Build | Slots | Cost anchor |
|---|---|---|---|
| 4 | cn_oak_chest | 12 | 8 oak_plank |
| 12 | cn_shelf | 8 (wall) | 4 oak_plank + 4 nails |
| 20 | cn_banded_chest | 18 | 2 iron_bar |
| 50 | cn_vault | 32 | 4 steel_bar |
| 75 | cn_veilwood_vault | 48 | 2 veilsteel_bar |

### 1.3 Station-adjacency buffs (radius 2, non-stacking per station)
| Lv | Furniture | Station buffed | Effect |
|---|---|---|---|
| 18 | cn_bellows | furnace | +10% speed |
| 22 | cn_grindstone | anvil_block | +10% speed |
| 25 | cn_garden_planter | farm_plot | +10% growth |
| 28 | cn_dye_rack | loom_block | +10% speed |
| 32 | cn_still | alchemy_table | +10% speed |
| 35 | cn_dock | fishing_spot | +10% catch speed |
| 38 | cn_lectern | enchant_altar | +10% speed |
| 62 | cn_forge_hood | furnace | +20% speed (supersedes bellows) |

---

## PART 2 — COMBAT GEAR CURVE (authoritative stats for every registry weapon/armor)

### 2.0 Equip gates (LAW)
| Metal/wood tier | ST (melee wpn) | D (metal armor) | R (bows/hide) | MG (staves/robes) |
|---|---|---|---|---|
| copper / oak / leather / linen | 1 | 1 | 1 | 1 |
| iron / birch / studded / silkspun | 15 | 15 | 15 | 15 |
| steel / willow / hardleather / runeweave | 30 | 30 | 30 | 30 |
| emberite / spruce / emberhide / emberweave | 45 | 45 | 45 | 45 |
| meteoric / duskwood / duskhide / gloomweave | 60 | 60 | 60 | 60 |
| veilsteel / veilwood / veilhide / veilweave | 75 | 75 | 75 | 75 |

### 2.1 Swords (melee mainline)
| id | Gate | atk | acc | spd | crit% | dur | coin | Effect |
|---|---|---|---|---|---|---|---|---|
| copper_sword | ST1 | 4 | 5 | 0 | 4 | 120 | 25 | — |
| iron_sword | ST15 | 8 | 6 | 0 | 5 | 300 | 60 | — |
| steel_sword | ST30 | 13 | 7 | 0 | 5 | 500 | 140 | — |
| emberite_sword | ST45 | 19 | 8 | 0 | 6 | 750 | 280 | 15%: burn 2 dmg ×2 turns |
| meteoric_sword | ST60 | 26 | 9 | 0 | 6 | 1000 | 550 | — |
| veilsteel_sword | ST75 | 34 | 10 | 0 | 7 | 1500 | 1100 | — |

### 2.2 Signature weapons (one per metal; sidegrades, not strict upgrades)
| id | Gate | atk | acc | spd | crit% | dur | coin | Signature effect |
|---|---|---|---|---|---|---|---|---|
| copper_hookblade | ST1 | 3 | 7 | +2 | 8 | 110 | 30 | On crit: bleed 2 dmg/turn ×3 |
| iron_greatmaul | ST15 | 11 | 4 | −2 | 4 | 340 | 75 | 80%: knockback 1 tile |
| steel_warpike | ST30 | 12 | 8 | 0 | 5 | 520 | 160 | Melee range 2 blocks |
| emberite_flame_flail | ST45 | 17 | 6 | −1 | 6 | 760 | 320 | 50%: burn 4 dmg ×3 turns |
| meteoric_star_maul | ST60 | 24 | 5 | −2 | 5 | 1050 | 640 | AoE: adjacent tiles take 50%; 25% stun 1 turn |
| veilsteel_riftblade | ST75 | 30 | 9 | +1 | 8 | 1500 | 1300 | Phase strike: ignores 30% of target armor |

### 2.3 Bows (Fletching-made; shortbow spd +1, longbow spd −1)
| id | Gate | atk | acc | spd | crit% | range | dur | coin |
|---|---|---|---|---|---|---|---|---|
| oak_shortbow | R1 | 3 | 7 | +1 | 7 | 6 | 150 | 18 |
| oak_longbow | R5 | 5 | 9 | −1 | 6 | 7 | 170 | 26 |
| birch_shortbow | R15 | 6 | 8 | +1 | 7 | 6 | 280 | 55 |
| birch_longbow | R20 | 8 | 10 | −1 | 6 | 7 | 300 | 70 |
| willow_shortbow | R30 | 10 | 9 | +1 | 8 | 6 | 450 | 130 |
| willow_longbow | R35 | 13 | 11 | −1 | 7 | 7 | 480 | 160 |
| spruce_shortbow | R45 | 15 | 10 | +1 | 8 | 6 | 650 | 260 |
| spruce_longbow | R50 | 18 | 12 | −1 | 7 | 7 | 680 | 310 |
| duskwood_shortbow | R60 | 21 | 11 | +1 | 9 | 6 | 900 | 520 |
| duskwood_longbow | R65 | 25 | 13 | −1 | 8 | 7 | 950 | 620 |
| veilwood_shortbow | R75 | 28 | 12 | +1 | 10 | 6 | 1300 | 1050 |
| veilwood_longbow | R80 | 32 | 14 | −1 | 9 | 8 | 1350 | 1250 |

### 2.4 Crossbows
| id | Gate | atk | acc | spd | crit% | range | dur | coin |
|---|---|---|---|---|---|---|---|---|
| light_crossbow | R15 | 9 | 12 | −2 | 6 | 6 | 400 | 90 |
| heavy_crossbow | R45 | 18 | 14 | −2 | 7 | 7 | 800 | 380 |
| veil_crossbow | R75 | 30 | 16 | −2 | 8 | 7 | 1600 | 1500 |

### 2.5 Ammo (atk adds to bow/xbow atk; 1 consumed per shot; batch sizes are law)
| id | Gate | +atk | Batch | Coin ea | Effect |
|---|---|---|---|---|---|
| copper_arrow | R1 | +1 | 15 | 1 | — |
| iron_arrow | R15 | +2 | 15 | 1 | — |
| steel_arrow | R30 | +3 | 15 | 2 | — |
| emberite_arrow | R45 | +4 | 15 | 3 | 20%: burn 2 ×2 turns |
| meteoric_arrow | R60 | +5 | 15 | 5 | — |
| veilsteel_arrow | R75 | +7 | 15 | 8 | — |
| iron_bolt | R15 | +3 | 12 | 2 | — |
| steel_bolt | R30 | +5 | 12 | 3 | — |
| emberite_bolt | R45 | +7 | 12 | 5 | 25%: burn 3 ×2 turns |
| meteoric_bolt | R60 | +9 | 12 | 8 | — |
| veilsteel_bolt | R75 | +12 | 12 | 12 | — |

### 2.6 Staves (spd 0, range 5 default — spells may override range; magic dmg adds 0.45×MG + robe magic)
| id | Gate | atk | acc | +magic | +mana | dur | coin |
|---|---|---|---|---|---|---|---|
| oak_staff | MG1 | 3 | 6 | 0 | +5 | 200 | 20 |
| birch_staff | MG15 | 6 | 7 | +1 | +10 | 350 | 60 |
| willow_staff | MG30 | 10 | 8 | +2 | +15 | 550 | 140 |
| spruce_staff | MG45 | 15 | 9 | +3 | +20 | 800 | 290 |
| duskwood_staff | MG60 | 21 | 10 | +4 | +28 | 1100 | 580 |
| veilwood_staff | MG75 | 28 | 11 | +5 | +38 | 1500 | 1150 |

### 2.7 Metal armor (Defense-gated; per piece: armor / evasion / dur / coin)
| Tier (gate) | Helmet | Chestplate | Leggings | Boots | Shield | Set armor (+shield) | Mitigation |
|---|---|---|---|---|---|---|---|
| Copper (D1) | 3 / 0 / 140 / 18 | 5 / −1 / 160 / 35 | 4 / −1 / 150 / 28 | 2 / 0 / 130 / 16 | — | 14 | 31.8% |
| Iron (D15) | 5 / −1 / 320 / 45 | 8 / −2 / 360 / 90 | 6 / −1 / 340 / 70 | 3 / 0 / 300 / 40 | 6, block 8%, −1 eva / 340 / 65 | 22 (28) | 42.3% (48.3%) |
| Steel (D30) | 7 / −1 / 520 / 100 | 11 / −2 / 560 / 200 | 9 / −1 / 540 / 155 | 5 / 0 / 500 / 85 | 8, block 10%, −1 eva / 560 / 150 | 32 (40) | 51.6% (57.1%) |
| Emberite (D45)* | 10 / −1 / 780 / 210 | 15 / −2 / 820 / 420 | 12 / −1 / 800 / 330 | 7 / 0 / 760 / 190 | — | 44 | 59.5% |
| Meteoric (D60) | 13 / −1 / 1050 / 420 | 19 / −2 / 1100 / 850 | 15 / −1 / 1080 / 650 | 9 / 0 / 1000 / 380 | — | 56 | 65.1% |
| Veilsteel (D75) | 17 / −1 / 1500 / 850 | 24 / −2 / 1600 / 1700 | 19 / −1 / 1550 / 1300 | 12 / 0 / 1450 / 750 | 12, block 12%, −1 eva / 1550 / 1000 | 72 (84) | 70.6% (73.7%) |

*Every emberite piece also grants +2 magicResist (fire-kissed).

### 2.8 Ranged armor (hide line, Ranged-gated; armor / +evasion / dur / coin; body pieces carry crit)
| Tier (gate) | Coif | Body | Chaps | Set: armor / eva / crit | Mitigation |
|---|---|---|---|---|---|
| Leather (R1) | 1 / +2 / 140 / 10 | 2 / +3 / 150 / 18 (+1 crit) | 1 / +2 / 145 / 14 | 4 / +7 / +1 | 11.8% |
| Studded (R15) | 2 / +2 / 280 / 30 | 4 / +3 / 300 / 60 (+1 crit) | 3 / +2 / 290 / 45 | 9 / +7 / +1 | 23.1% |
| Hardleather (R30) | 4 / +3 / 450 / 70 | 6 / +4 / 470 / 140 (+1 crit) | 5 / +3 / 460 / 105 | 15 / +10 / +1 | 33.3% |
| Emberhide (R45)* | 6 / +3 / 650 / 150 | 9 / +4 / 680 / 300 (+2 crit) | 7 / +3 / 660 / 230 | 22 / +10 / +2 | 42.3% |
| Duskhide (R60) | 8 / +4 / 900 / 300 | 12 / +5 / 950 / 600 (+2 crit) | 10 / +4 / 920 / 460 | 30 / +13 / +2 | 50.0% |
| Veilhide (R75) | 11 / +5 / 1300 / 600 | 16 / +6 / 1350 / 1200 (+2 crit) | 13 / +5 / 1320 / 900 | 40 / +16 / +2 | 57.1% |

*Emberhide pieces +2 magicResist each. Ranged trades armor for evasion + opening range.

### 2.9 Robes (Magic-gated; armor / +magic / +mana / dur / coin)
| Tier (gate) | Hood | Robe Top | Robe Bottom | Set: armor / magic / mana |
|---|---|---|---|---|
| Linen (MG1) | 0 / +1 / +4 / 100 / 8 | 1 / +2 / +8 / 110 / 14 | 0 / +1 / +4 / 105 / 10 | 1 / +4 / +16 |
| Silkspun (MG15) | 1 / +2 / +7 / 250 / 28 | 2 / +3 / +12 / 260 / 50 | 1 / +2 / +7 / 255 / 38 | 4 / +7 / +26 |
| Runeweave (MG30)* | 2 / +3 / +10 / 420 / 65 | 3 / +4 / +16 / 440 / 120 | 2 / +3 / +10 / 430 / 90 | 7 / +10 / +36 |
| Emberweave (MG45) | 3 / +4 / +13 / 600 / 140 | 4 / +5 / +20 / 620 / 260 | 3 / +4 / +13 / 610 / 200 | 10 / +13 / +46 |
| Gloomweave (MG60) | 4 / +5 / +16 / 850 / 280 | 6 / +7 / +26 / 880 / 540 | 4 / +5 / +16 / 860 / 420 | 14 / +17 / +58 |
| Veilweave (MG75)** | 6 / +7 / +20 / 1250 / 560 | 8 / +9 / +32 / 1300 / 1100 | 6 / +7 / +20 / 1270 / 850 | 20 / +23 / +72 |

*Runeweave +2 magicResist/piece. **Veilweave +4 magicResist/piece.

### 2.10 Ring enemy reference targets (handshake with mob-slot framework — slot stat ranges must land in these bands)
| Band | Ring | Player lv | hp | atk | acc | eva | armor |
|---|---|---|---|---|---|---|---|
| R0 early | R0 | 1-14 | 8-25 | 3-5 | 55-62 | 8-15 | 0-2 |
| R0 late | R0 | 15-25 | 25-45 | 6-8 | 58-64 | 10-16 | 2-6 |
| R1 core | R1 | 25-45 | 45-90 | 8-14 | 60-68 | 10-18 | 4-10 |
| R1/R2 cusp | R1-2 | 45-55 | 90-150 | 14-19 | 64-72 | 12-20 | 8-14 |
| R2 core | R2 | 55-70 | 140-220 | 19-26 | 66-74 | 14-22 | 12-20 |
| R3 core | R3 | 70-85 | 240-340 | 26-34 | 70-78 | 16-24 | 20-28 |
| R3 deep | R3 | 85-99 | 300-420 | 34-42 | 74-82 | 18-26 | 26-34 |
Elites ×2 hp, +2 armor band. Bosses ×4-6 hp. Skitterers bottom of band, tanks/brutes top.

### 2.11 DPS progression check 1-99 (eff dmg/turn = atkTotal × hit% × (1 + crit × 0.75) × (1 − enemyArmor/(enemyArmor+30)); TTK vs band-median mob; target 4-7 turns early, 6-9 at cap)
| Lv | Loadout | atkTotal | vs band (armor) | hit% | Eff dmg/turn | TTK |
|---|---|---|---|---|---|---|
| 1 | copper_sword, ST1 | 4.4 | R0e (1) | 56 | 2.6 | 6 |
| 5 | copper_hookblade, ST5 | 5.0 | R0e (1) | 60 | 3.6 (incl bleed) | 4 |
| 15 | iron_sword, ST15 | 14.0 | R0l (4) | 62 | 8.2 | 4 |
| 15 | birch_shortbow + iron_arrow, R15 | 14.0 | R0l (4) | 62 | 8.2 | 4 |
| 20 | iron_greatmaul, ST20 | 19.0 | R0l (5) | 61 | 10.6 + knockback | 3-4 |
| 30 | steel_sword, ST30 | 25.0 | R1 (8) | 68 | 14.4 | 5 |
| 30 | willow_staff + runeweave, MG30 | 33.5 | R1 (8) | 69 | ~18 minus rune cost | 4 |
| 45 | emberite_sword, ST45 | 37.0 | cusp (12) | 75 | 23.3 (incl burn) | 5 |
| 45 | heavy_crossbow + emberite_bolt, R45 | 43.0 | cusp (12) | 79 | 26.7, spd −2 | 5 |
| 60 | meteoric_sword, ST60 | 50.0 | R2 (18) | 81 | 27.4 | 7 |
| 60 | meteoric_star_maul, ST60 | 48.0 | R2 pack | 77 | 25.1 + 50% splash | 7 (packs 4) |
| 75 | veilsteel_sword, ST75 | 64.0 | R3 (24) | 88 | 33.9 | 8 |
| 75 | veilsteel_riftblade, ST75 | 60.0 | R3 (24→16.8 phased) | 87 | 36.3 | 7-8 |
| 75 | veilwood_shortbow + veilsteel_arrow, R75 | 65.0 | R3 (24) | 89 | 35.0 | 8 |
| 90 | veilsteel_sword, ST90 | 70.0 | R3d (30) | 93 | 35.5 (40+ potioned) | 9-10 |
| 99 | veilsteel_sword, ST99 | 73.6 | R3d (30) | 95 | 38.1 (43 w/ potion+jewelry) | 8-9 |

Checks: monotonic eff-dmg within each band; no tier gap >15 levels without a weapon upgrade; ranged parity within ±5% of melee at every gate (crossbows +15% dmg for −2 spd and pricier ammo); magic ~+10% ahead pre-rune-cost, net-neutral after ~2-4 runes/cast; riftblade beats sword vs armor ≥18 (crossover by design); TTK drift 4→9 turns at deep R3 is closed by HB potions, jewelry, and food — intended endgame friction. Defense side: R3-deep hit of 38 vs full veilsteel+shield (84 armor) lands ~10, vs cooked_veilray-class heals — sustainable; same hit on unarmored is ~38 = 1-2-shot, enforcing the gear ladder.

---

## CROSS-SKILL CONTRACTS

**CONSTRUCTION consumes:**
| From | Item + level | Qty (typical per build / lifetime scale) |
|---|---|---|
| Fletching | oak_plank FL1 | 2-8/build; ~400 over CN1-15 |
| Fletching | birch_plank FL15 / willow FL30 / spruce FL45 / duskwood FL60 / veilwood FL75 | 2-8/build; ~600-1,500 per tier band (walls are the plank sink) |
| Smithing | nails SM5 (batch 15) | 2-8/build, most builds CN12+ |
| Smithing | copper_bar SM1 ×2 (anvil), iron_bar ×1-2 (CN18-32), steel_bar ×4 (CN50), emberite_bar ×2 (CN62), meteoric_bar ×4+2 (CN70/95), veilsteel_bar ×2-4 (CN75/99) | as listed |
| Crafting | bowstring CR1 ×2 (loom); linen_cloth CR1 ×2 (bed/dummy); leather CR1 ×1 (bellows); glass_vial CR10 ×2 (still); glass_orb CR25 ×1-2 (lamppost/fountain/lantern); glass_pane† ×1-6 (window/roof/dome); veilstone CR75 ×1 (beacon) | as listed |
| Mining/shovel | stone† M1 (bulk masonry), clay ×2 (furnace/planter/bricks), basalt ×4/batch (CN45+), veil_flux M75 ×1-2 (CN80/90) | stone is the bulk sink |
| Farming | wheat FA1 ×2-4 (thatch/bed) | renewable sink |
| Foraging | flax FO1 ×1-2 (torch/fence); bogmint FO20 ×2 (dye rack) | early sink |
| Runecraft | ward_rune RC25 ×2 (altar), gloom_rune RC60 ×1, veil_rune RC75 ×2 (beacon) | — |
| Archaeology | weathered_relic A1 ×1 (altar), engraved_relic A25 ×1 (lectern) | — |
| Mob drops | rough_hide ×1 (dummy), beast_trophy ×1 each (trophy mount CN40, slayer board CN65 — repeatable Slayer sink) | — |

**CONSTRUCTION provides:** all 8 stations (buildable: SM/CR/HB/C/RC/FL/CN/all); storage 8→48 slots; respawn bed; +10-20% station speed buffs (Smithing, Crafting, Herblore, Runecraft), +10% farm growth (Farming), +10% catch (Fishing); training dummy (half-rate combat XP for HP/ST/D/R/MG); slayer board (task reroll); night-spawn suppression (base safety); CN99 beacon (+5% gather speed/+2% luck, all gathering skills); heavy coin sink via bar/gold builds.

**COMBAT GEAR consumes:** Smithing — all §12 melee weapons/armor/signatures + arrow/bolt heads; Fletching — all bows/crossbows/staff hafts + arrow shafts (batch 15) + bolts (batch 12); Crafting — all hide armor (leather chain CR1-75), all robes (cloth chain), glass_orb per staff; Runecraft — runes per Magic cast (2-4/cast, Magic agent's spell_* costs); Herblore — strength/defense/ranging/magic potions (~+10% style dmg, HB's final numbers) required to hold TTK ≤9 at lv85+; Cooking — heal food scaled to incoming 10-38 dmg/hit bands; Crafting jewelry — gold_ruby_amulet/gold_diamond_necklace close the last ~10% at cap.

**COMBAT GEAR provides:** equip-gate law table (§2.0) to all agents; enemy stat bands (§2.10) as the binding contract for the mob-slot framework (slot generators must emit within band); ammo consumption rate (1/shot) → Fletching/Smithing demand; armor/(armor+30) set totals for Healing/food sizing; dur values → future repair sink for Smithing.

## REGISTRY GAPS
1. `stone` (Rough Stone) — no raw stone id exists in the 288; required by furnace/anvil/masonry and referenced by §20 meteor_slag "stone scrap." Proposed: M1 drop from breaking generic stone terrain with any pickaxe, coin 1.
2. `glass_pane` — theme mandate lists panes under Crafting glass ("vials/orbs/panes") but registry has only vial/orb. Proposed: CR15, furnace, 3 sand → 2 panes, coin 4. Consumed by cn_window, cn_glass_roof, cn_star_dome.
3. `chest_block` (engine storage block, items.js:167) — not in retained-ids list; superseded here by the cn_ chest/vault line reusing its storage behavior. Confirm retirement.
4. No hands-slot (gloves) items anywhere in the registry despite engine support (`items.js` slot 'hands') — acceptable cut, or assign to Crafting later.


# PART 8 — COMBAT SKILLS, SLAYER, BEASTLORE & THE MOB SLOT FRAMEWORK

Engine grounding confirmed (skills.js `xpForLevel = 60n^2.4+80n` → 99 ≈ 3.61M XP; combat.js `armor/(armor+30)` soak, dmg = weaponAtk + 0.4-0.45×lvl, XP = 1.5×dmg dealt; MOB_FORMAT.md stats block + 9 biomes; enemies.js drop schema `{item,qty:[a,b],chance}`). Deliverable follows.

# EMBERVEIL v2 — COMBAT SKILLS + SLAYER + BEASTLORE + MOB SLOT FRAMEWORK

## §0 ENGINE BINDINGS (law for every table below)

| binding | value |
|---|---|
| Skill key migration | `vitality`→`hitpoints`, `tactics`→`slayer`, NEW key `beastlore` (SKILL_DEFS 21→22). `magic/ranged/strength/defense/healing` unchanged |
| Max HP | 30 + 2×HP lvl + flat milestone bonuses + gear `est.hp` |
| Max mana | 20 + 1×MG lvl + staff bonus |
| Energy | 100 max (+HP milestones), regen 15/turn |
| Mana regen | 2/turn in combat |
| Melee dmg | (weapon atk + 0.4×ST) × ability power |
| Ranged dmg | (bow atk + ammo bonus + 0.4×R) × power |
| Magic dmg | (staff atk + 0.45×MG) × spell power |
| Heal | per-ability formula vs HL lvl |
| Soak | dmg × (1 − armor/(armor+30)); guard ×(1−guard%); crit ×1.6 base |
| Acc | melee 60+0.5×ST, ranged 58+0.6×R, magic 62+0.5×MG, ±weapon/ability mods, clamp 5–95 |
| XP awards | dealt dmg×1.5 → style skill; heal×1.2 → HL; dmg taken ×0.4 → HP, ×1.5 guarding / ×0.5 not → D; kill XP split 50% style / 20% HP / 15% D / 15% Slayer(on-task only, else 7.5% each style+HP); block +6 D; huntXp → Hunter |
| Equip gates | weapons=ST, melee armor=D, bows/hide=R, staves/robes=MG at metal/wood level 1/15/30/45/60/75 |
| XP to 99 | 3,610,000 (curve `60n^2.4+80n`); lv50=683k, lv75=1.85M |
| Namespaces | combat abilities = engine ABILITIES ids (plain snake_case); spells `spell_*`; Slayer/Beastlore `ab_*`; mobs `mob_*` |

### §0.1 GEAR COMBAT-STAT LAW (values other agents' recipes must carry)

Melee kits (armor per piece: helm/chest/legs/boots/shield → set total → soak):

| tier | D lv | helm | chest | legs | boots | shield | set | soak (no shield / with) |
|---|---|---|---|---|---|---|---|---|
| copper | 1 | 3 | 5 | 4 | 2 | — | 14 | 32% / — |
| iron | 15 | 5 | 8 | 6 | 3 | 4 | 22 | 42% / 46% |
| steel | 30 | 7 | 11 | 9 | 4 | 5 | 31 | 51% / 55% |
| emberite | 45 | 9 | 14 | 11 | 6 | — | 40 | 57% (+10% burn resist/pc, set: −1 turn burns) |
| meteoric | 60 | 12 | 18 | 14 | 8 | — | 52 | 63% |
| veilsteel | 75 | 15 | 22 | 17 | 10 | 8 | 64 | 68% / 71% |

Shields add block chance: iron 8%, steel 10%, veilsteel 15% (D milestones add more).

Ranged sets (coif/body/chaps → set, + ranged bonuses):

| tier | R lv | armor set | +R acc | +R dmg |
|---|---|---|---|---|
| leather | 1 | 6 (17%) | +2 | 0 |
| studded | 15 | 10 (25%) | +4 | +1 |
| hardleather | 30 | 15 (33%) | +6 | +2 |
| emberhide | 45 | 19 (39%) | +8 | +3 (set: burn immune 1st tick) |
| duskhide | 60 | 25 (45%) | +10 | +4 (+8 evasion at night) |
| veilhide | 75 | 32 (52%) | +12 | +6 |

Robes (hood/top/bottom → armor set / magicResist / +magic dmg):

| tier | MG lv | armor | MR | +MG dmg |
|---|---|---|---|---|
| linen | 1 | 2 | 6% | 0 |
| silkspun | 15 | 4 | 10% | +1 |
| runeweave | 30 | 6 | 15% | +2 (set: 10% chance cast refunds 1 rune) |
| emberweave | 45 | 9 | 20% | +3 |
| gloomweave | 60 | 12 | 26% | +4 (set: gloom/veil spells −1 mana) |
| veilweave | 75 | 16 | 32% | +6 |

Melee weapons (atk / accMod / trait):

| id | ST | atk | acc | trait |
|---|---|---|---|---|
| copper_sword | 1 | 4 | 0 | — |
| copper_hookblade | 1 | 3 | +8 | crit → bleed dot3×2t; crit +6 |
| iron_sword | 15 | 7 | 0 | — |
| iron_greatmaul | 15 | 9 | −8 | push 1 |
| steel_sword | 30 | 10 | 0 | — |
| steel_warpike | 30 | 10 | 0 | reach 2 tiles |
| emberite_sword | 45 | 14 | 0 | 10% burn dot4×2t |
| emberite_flame_flail | 45 | 13 | −3 | 35% burn dot4×2t |
| meteoric_sword | 60 | 18 | 0 | — |
| meteoric_star_maul | 60 | 17 | −6 | 50% splash to adjacent, 12% stun 1t |
| veilsteel_sword | 75 | 23 | +5 | — |
| veilsteel_riftblade | 75 | 22 | 0 | ignores 30% target armor |

Bows/crossbows (atk / acc / trait) and staves (atk / +max mana):

| id | R/MG | atk | acc | trait |
|---|---|---|---|---|
| oak_shortbow / oak_longbow | 1 / 5 | 3 / 5 | 0 / +5 | long: range 7 |
| birch_shortbow / birch_longbow | 15 / 20 | 6 / 8 | 0 / +5 | |
| willow_shortbow / willow_longbow | 30 / 35 | 9 / 11 | 0 / +5 | |
| spruce_shortbow / spruce_longbow | 45 / 50 | 12 / 15 | 0 / +5 | |
| duskwood_shortbow / duskwood_longbow | 60 / 65 | 16 / 19 | 0 / +5 | |
| veilwood_shortbow / veilwood_longbow | 75 / 80 | 20 / 24 | 0 / +5 | |
| light_crossbow | 15 | 9 | +10 | ignores 15% armor; bolts only |
| heavy_crossbow | 45 | 16 | +12 | ignores 15% armor |
| veil_crossbow | 75 | 26 | +15 | ignores 20% armor |
| oak_staff | 1 | 2 | 0 | +5 mana |
| birch_staff | 15 | 4 | 0 | +10 mana |
| willow_staff | 30 | 6 | 0 | +15 mana |
| spruce_staff | 45 | 9 | 0 | +20 mana |
| duskwood_staff | 60 | 12 | 0 | +30 mana |
| veilwood_staff | 75 | 16 | +5 | +40 mana |

---

## §1 HITPOINTS 1–99 (passive line; XP = 0.4×dmg taken + 20% kill XP)

| lv | unlock | effect (numbers) |
|---|---|---|
| 1 | Vital scaling | +2 max HP per level (base 30; 228 at 99 pre-bonus) |
| 5 | Hearty Appetite | food heals +10% |
| 10 | Traveler's Grit | out-of-combat regen 1 HP/10s |
| 15 | Poison Shrug I | 15% chance to resist poison application |
| 20 | Stamina I | +10 max energy (110) |
| 25 | Second Wind | 1/battle: survive killing blow at 1 HP |
| 30 | Battle Pulse I | +1 HP/turn combat regen |
| 35 | Fire Blood I | burn duration −1 turn (min 1) |
| 40 | Stamina II | +15 max energy (125) |
| 45 | Thick Blood | all DoT damage −25% |
| 50 | Iron Constitution | status application vs you −15% chance |
| 55 | Battle Pulse II | +2 HP/turn combat regen |
| 60 | Deep Reserves | +12 flat max HP |
| 65 | Poison Shrug II | 35% resist; venom_sac slots' poison −1 turn |
| 70 | Juggernaut | +20 flat max HP (flat total +32) |
| 75 | Second Wind+ | Second Wind restores 10% max HP instead of 1 |
| 80 | Battle Pulse III | +3 HP/turn combat regen |
| 85 | Bloodward | DoT −50% (replaces 45) |
| 90 | Twin Wind | Second Wind 2/battle |
| 95 | Deepest Reserves | +30 flat max HP (flat total +62; 290 max at 99) |
| 99 | Undying Ember | Second Wind trigger also heals 25% max HP + 1 turn damage immunity |

## §2 STRENGTH 1–99 (XP = 1.5×melee dmg + 50% kill-XP share)

| lv | unlock | type | cost/cd | effect |
|---|---|---|---|---|
| 1 | strike; equip copper_sword, copper_hookblade | ability/gate | — | 1.0× melee, range 1 |
| 5 | power_strike | ability | 25 en / cd2 | 1.6×, −5 acc |
| 10 | Sure Grip | passive | — | +5 melee acc |
| 15 | cleave; equip iron_sword, iron_greatmaul | ability/gate | 35 en / cd3 | 1.1× to all adjacent |
| 20 | Heavy Lean | passive | — | power_strike 1.6×→1.75× |
| 25 | sunder | ability | 30 en / cd3 | 1.1× + target armor −20% for 2t |
| 30 | equip steel_sword, steel_warpike | gate | — | see §0.1 |
| 35 | Killer Instinct | passive | — | +4 melee crit |
| 40 | Crushing Blows | passive | — | melee crit dmg 1.6×→1.8× |
| 45 | equip emberite_sword, emberite_flame_flail | gate | — | burn traits live |
| 50 | Rampage | passive | — | +10% dmg per kill this battle (max 3 stacks) |
| 55 | whirlwind | ability | 45 en / cd4 | 1.3× all adjacent (replaces cleave) |
| 60 | equip meteoric_sword, meteoric_star_maul | gate | — | |
| 65 | Iron Arms | passive | — | +5 flat melee atk |
| 70 | skullsplitter | ability | 40 en / cd4 | 2.0×, 25% stun 1t |
| 75 | equip veilsteel_sword, veilsteel_riftblade | gate | — | |
| 80 | Veteran's Eye | passive | — | +8 melee acc (total +13) |
| 85 | Executioner | passive | — | +25% dmg vs targets below 30% HP |
| 90 | Titan Grip | passive | — | signature weapons (§12 sig line) +15% dmg |
| 95 | Colossus | passive | — | +10 flat melee atk (total +15) |
| 99 | Warlord | capstone | — | power_strike/whirlwind/skullsplitter cd −1; +5% all melee dmg |

## §3 DEFENSE 1–99 (XP: block +6, guard action +3, dmg taken ×1.5 guarding / ×0.5, +15% kill XP)

| lv | unlock | type | cost/cd | effect |
|---|---|---|---|---|
| 1 | guard; equip copper kit | ability/gate | action | −50% dmg this round |
| 5 | Braced Guard | passive | — | guard −55% |
| 10 | Riposte | passive | — | after evading/blocking, +10 acc next attack |
| 15 | equip iron kit + iron_shield | gate | — | shield block 8% |
| 20 | shield_bash | ability | 20 en / cd3 | 0.7× ST dmg + push 1 + 20% stun 1t (needs shield) |
| 25 | Bulwark | passive | — | guarding grants pet/ally −25% dmg too |
| 30 | equip steel kit + steel_shield | gate | — | +2% block (all shields) |
| 35 | Stand Firm | passive | — | immune to push/knockback while guarding |
| 40 | Deflect | passive | — | −15% ranged dmg taken with shield |
| 45 | equip emberite kit | gate | — | guard −60% |
| 50 | Counter Stance | passive | — | 25% chance to counter (0.8× free strike) on block |
| 55 | Immovable | passive | — | slow/root on you −1 turn |
| 60 | equip meteoric kit | gate | — | +3 flat armor |
| 65 | aegis_wall | ability | 35 en / cd5 | next 2 hits vs you −50% (stacks with guard) |
| 70 | Fortress | passive | — | guard action no longer ends move (guard + move same turn) |
| 75 | equip veilsteel kit + veilsteel_shield | gate | — | shield block 15% |
| 80 | Wall of Dawn | passive | — | guard −65% |
| 85 | Last Bastion | passive | — | below 25% HP: +12 armor, +10% MR |
| 90 | Unbreakable | passive | — | 1/battle: lethal hit while guarding leaves 1 HP (separate from Second Wind) |
| 95 | Adamant Frame | passive | — | +5 flat armor (total +8) |
| 99 | Bastion Aura | capstone | — | permanent: you + pet/allies −10% all dmg |

## §4 RANGED 1–99 (XP = 1.5×ranged dmg + 50% kill share)

| lv | unlock | type | cost/cd | effect |
|---|---|---|---|---|
| 1 | shot; equip oak_shortbow, copper_arrow, leather set | ability/gate | 1 ammo | 1.0×, range 6 |
| 5 | aimed_shot; equip oak_longbow | ability/gate | 25 en / cd2 | 1.5×, +15 acc |
| 10 | Fletcher's Eye | passive | — | +3 ranged acc |
| 15 | pinning_shot; equip birch_shortbow, light_crossbow, iron_arrow/iron_bolt, studded set | ability/gate | 30 en / cd3 | 1.0× + slow 2t (90%) |
| 20 | Thrifty Quiver I; equip birch_longbow | passive/gate | — | ammo recovery 40%→45% |
| 25 | rapid_nock | ability | 30 en / cd3 | 2 shots at 0.7× (2 ammo) |
| 30 | equip willow bows, steel ammo, hardleather set | gate | — | +3 acc (total +6) |
| 35 | barbed_shot; equip willow_longbow | ability | 30 en / cd3 | 1.2× + bleed dot3×2t |
| 40 | Double Nock | passive | — | 20% chance: free extra 0.5× shot (no ammo) |
| 45 | equip spruce bows, heavy_crossbow, emberite ammo, emberhide set | gate | — | |
| 50 | snipe; equip spruce_longbow | ability | 35 en / cd3 | 2.2×, −10 acc, range +2 |
| 55 | volley | ability | 40 en / cd4 | 1.0× to 3×3 area (3 ammo) |
| 60 | equip duskwood bows, meteoric ammo, duskhide set | gate | — | Thrifty Quiver II: recovery 50% |
| 65 | Hawkeye; equip duskwood_longbow | passive | — | +5 ranged crit |
| 70 | piercing_draw | ability | 35 en / cd3 | 1.6×, ignores 30% armor |
| 75 | equip veilwood bows, veil_crossbow, veilsteel ammo, veilhide set | gate | — | |
| 80 | Thrifty Quiver III; equip veilwood_longbow | passive/gate | — | recovery 60% |
| 85 | Deadeye | passive | — | ranged crit dmg 1.6×→2.0× |
| 90 | storm_of_bolts | ability | 50 en / cd5 | 3 shots at 0.8× (3 ammo) |
| 95 | Farsight | passive | — | +5 acc, +1 range all bows |
| 99 | True Flight | capstone | — | hit chance floor 50% vs any evasion; +10% ranged dmg |

### §4.1 Ammo economics (workbench, knife+hammer; batch = 1 craft)

| ammo | craft lv (FL+SM) | inputs | batch | coin ea | dmg bonus | FL XP/batch |
|---|---|---|---|---|---|---|
| copper_arrow | FL1/SM1 | 1 copper_bar + 1 oak_log + 3 feather | 15 | 2 | +1 | 25 |
| iron_arrow | FL15/SM15 | 1 iron_bar + 1 birch_log + 3 feather | 15 | 4 | +2 | 55 |
| steel_arrow | FL30/SM30 | 1 steel_bar + 1 willow_log + 3 feather | 15 | 7 | +3 | 95 |
| emberite_arrow | FL45/SM45 | 1 emberite_bar + 1 spruce_log + 3 feather | 15 | 12 | +4, 15% burn dot4×2t | 150 |
| meteoric_arrow | FL60/SM60 | 1 meteoric_bar + 1 duskwood_log + 3 feather | 15 | 20 | +5 | 220 |
| veilsteel_arrow | FL75/SM75 | 1 veilsteel_bar + 1 veilwood_log + 3 feather | 15 | 35 | +6 | 320 |
| iron_bolt | FL15/SM15 | 1 iron_bar + 1 birch_plank | 12 | 6 | +3 | 60 |
| steel_bolt | FL30/SM30 | 1 steel_bar + 1 willow_plank | 12 | 10 | +4 | 100 |
| emberite_bolt | FL45/SM45 | 1 emberite_bar + 1 spruce_plank | 12 | 16 | +6, 20% burn | 160 |
| meteoric_bolt | FL60/SM60 | 1 meteoric_bar + 1 duskwood_plank | 12 | 26 | +7 | 235 |
| veilsteel_bolt | FL75/SM75 | 1 veilsteel_bar + 1 veilwood_plank | 12 | 45 | +9 | 340 |

Cost-per-kill check (matched tier, post-recovery, vs slot framework §9):

| ring | typical mob hp | dmg/shot (matched bow+ammo+lvl) | shots/kill | net ammo cost/kill | avg coin+loot/kill | margin |
|---|---|---|---|---|---|---|
| R0 | 14 | ~6 | 3 | 3.3c (55% loss ×2c) | ~14c | +10.6c |
| R1 | 32 | ~13 | 3 | 6.6c | ~32c | +25c |
| R2 | 65 | ~24 | 3 | 18c | ~68c | +50c |
| R3 | 115 | ~37 | 4 | 56c (40% loss ×35c) | ~150c | +94c |

## §5 MAGIC 1–99 — rune-powered spellbook (staff + robes gates; XP = 1.5×spell dmg + 50% kill share; utility = flat XP)

Engine change: free `spark` removed; every offensive cast consumes runes (RC §9). Runeweave set: 10% rune refund. Gloomweave set: gloom/veil casts −1 mana.

| lv | spell / unlock | runes/cast | mana | power | range | effect | XP |
|---|---|---|---|---|---|---|---|
| 1 | spell_gust; equip oak_staff, linen set | 1 air | 2 | 1.0× | 5 | air dart | 1.5×dmg |
| 5 | spell_windblade | 2 air | 3 | 1.3× | 5 | — | 1.5×dmg |
| 10 | spell_tidal_jet | 1 water + 1 air | 4 | 1.45× | 5 | 40% slow 1t | 1.5×dmg |
| 15 | spell_water_whip; equip birch_staff, silkspun set | 2 water + 1 air | 5 | 1.6× | 5 | +5 acc | 1.5×dmg |
| 20 | spell_stone_dart | 2 earth + 1 air | 6 | 1.75× | 5 | — | 1.5×dmg |
| 25 | spell_wardshell | 2 ward | 8 | — | self | −25% dmg taken 3t | flat 15 |
| 30 | spell_earthspikes + spell_recall; equip willow_staff, runeweave set | 3 earth + 1 air / 1 ward + 3 air | 8 / 5 | 1.9× | 5 | 35% root 1t / teleport to spawn (out of combat, 5s cast) | 1.5×dmg / flat 10 |
| 35 | spell_flamebolt | 2 fire + 2 air | 9 | 2.05× | 5 | 30% burn dot4×2t | 1.5×dmg |
| 40 | spell_ember_ring | 3 fire + 2 air | 14 | 1.5× | 4, AoE 3×3 | burn 20% each | 1.5×dmg |
| 45 | spell_magma_lance; equip spruce_staff, emberweave set | 4 fire + 2 earth | 12 | 2.3× | 5 | target armor −3 for 3t | 1.5×dmg |
| 50 | spell_cyclone | 4 air + 2 water | 13 | 2.0× | 5 | push 1 + slow 1t | 1.5×dmg |
| 55 | spell_stormcall | 3 air + 3 water + 1 earth | 15 | 2.2× | 6 | chains to 1 extra target at 60% | 1.5×dmg |
| 60 | spell_gloomcoil; equip duskwood_staff, gloomweave set | 3 gloom + 2 air | 14 | 2.5× | 6 | 50% atkDown 2t | 1.5×dmg |
| 65 | spell_shadow_rend | 3 gloom + 2 fire | 16 | 2.7× | 6 | ignores cover penalty | 1.5×dmg |
| 70 | spell_veilshade | 2 gloom + 2 ward | 12 | — | self | combat: +15 evasion 2t; overworld: aggro radius −75% for 60s | flat 25 |
| 75 | spell_veilbolt; equip veilwood_staff, veilweave set | 3 veil + 2 gloom | 17 | 3.0× | 6 | — | 1.5×dmg |
| 80 | spell_riftburst | 4 veil + 2 fire | 20 | 2.4× | 5, AoE 3×3 | 25% burn each | 1.5×dmg |
| 85 | spell_unravel | 3 veil + 3 gloom | 19 | 2.8× | 6 | ignores 40% armor | 1.5×dmg |
| 90 | spell_veilstorm | 5 veil + 3 air | 24 | 2.6× | all enemies | slow 1t all (cd 3) | 1.5×dmg |
| 95 | spell_nullshell | 3 veil + 3 ward | 16 | — | self | negate next hit, reflect 20% of it (cd 4) | flat 40 |
| 99 | spell_riftcall | 6 veil + 4 gloom | 24 | 3.5× | 6 | 60% stun 1t (cd 4) | 1.5×dmg |

Rune burn rate for RC contract: sustained training ≈ 12 casts/hr-of-combat per fight-cycle → lv1–20: 15–25 air + 10 water per 10 fights; lv35–55: 25 fire + 15 air/earth per 10; lv60+: 25 gloom / lv75+: 30 veil + 20 gloom per 10 fights.

## §6 HEALING 1–99 (style `heal`, mana-fueled; XP = 1.2×healing done; utility flat)

| lv | unlock | type | cost/cd | effect |
|---|---|---|---|---|
| 1 | mend + bandage use | ability/item | 5 mana / cd2; bandage = item action | mend heals 8+0.8×HL; bandage heals 6 (+0.5%/HL lvl item bonus, global passive) |
| 5 | First Aid | passive | — | bandage/healing_salve effects +20% |
| 10 | Field Dressing | passive | — | out of combat, bandage also grants 1 HP/4s for 20s |
| 15 | rally | ability | 12 mana / cd4 | heal 12+1.0×HL + atkUp (+25% dmg) 3t |
| 20 | cleanse | ability | 8 mana / cd3 | cure poison/burn/slow + heal 4+0.3×HL (flat 20 XP + heal XP) |
| 25 | Mending Pulse | passive | — | heals crit 15% for ×1.5 |
| 30 | Salvecraft | passive | — | healing_salve +35% (stacks First Aid); 1/battle use a salve as a free action |
| 35 | cleansing_light | ability | 14 mana / cd4 | cure ALL statuses + heal 10+0.6×HL |
| 40 | regrowth | ability | 12 mana / cd4 | HoT: (4+0.25×HL)/turn for 4 turns |
| 45 | warding_mend | ability | 16 mana / cd4 | heal 10+0.7×HL + guard status this round |
| 50 | Triage | passive | — | overheal converts to shield (max 15% maxHP, lasts 2t) |
| 55 | beacon | ability | 14 mana / cd3 | heal pet/ally 12+0.8×HL at range 6 |
| 60 | revitalize | ability | 18 mana / cd5 | +30 energy + heal 8+0.5×HL |
| 65 | Sustained Growth | passive | — | regrowth ticks 5 turns |
| 70 | guardian_aura | ability | 20 mana / cd6 | 3t: party −15% dmg taken + 3 HP/turn |
| 75 | veilmend | ability | 22 mana + 1 ward_rune / cd5 | heal 25+1.0×HL + cure all |
| 80 | Brightened Hands | passive | — | all heals +10% |
| 85 | Intercession | passive | — | 1/battle: hit that drops you below 20% triggers instant self-heal 30% maxHP |
| 90 | sanctuary | ability | 30 mana / cd8 | 1 turn: zero damage taken; you cannot attack that turn |
| 95 | Effortless Grace | passive | — | heal spells −20% mana |
| 99 | Dawnkeeper | capstone | — | permanent minor aura (−5% dmg taken, 1 HP/turn); all heals +15% total |

### §6.1 Sustained-support cadence (heal/turn sustainable on 2 mana/turn regen + pool cycling vs matched-tier incoming)

| HL lvl | mend | regrowth total | sustainable heal/turn | matched ring incoming dmg/turn (post-armor) | verdict |
|---|---|---|---|---|---|
| 10 | 16 | — | ~6 | R0: 3–6 | holds |
| 30 | 32 | — | ~11 | R1: 6–11 | holds |
| 50 | 48 | 66 over 4t (16.5/t) | ~18 | R2: 10–16 | holds |
| 70 | 64 | 107 over 5t + aura 3/t | ~27 | R2/3: 15–22 | holds |
| 90 | 80 (crit 120) | 132 + aura | ~38 | R3: 20–30 (boss 35) | holds; boss needs food supplement |

## §7 SLAYER 1–99 (replaces `tactics`; XP: on-task kill = 1.0×mob maxHp; task completion = 10×category avg hp; trophy turn-in r0/r1/r2/r3 = 40/100/250/600 XP)

### §7.1 Masters (NPC ids in `npc_*` namespace — see REGISTRY GAPS)

| master | id | location | Slayer req | task pool | task size | pts/task |
|---|---|---|---|---|---|---|
| Warden Maro | npc_slayer_maro | R0 town | 1 | r0 categories | 8–15 | 2 |
| Huntmaster Sylra | npc_slayer_sylra | R1 outpost (ancient_forest edge) | 20 | r0–r1 | 12–20 | 5 |
| Ashwarden Korr | npc_slayer_korr | R2 basalt fort (volcanic_wastes) | 45 | r1–r2 | 15–25 | 9 |
| The Veiled Sentinel | npc_slayer_sentinel | R3 rift gate (corrupted_wilds) | 70 | r2–r3 + boss slots | 18–30 (boss 3–5) | 15 |

### §7.2 Task categories (reference SLOTS by ring×role, never species; weights per master)

| category | Maro | Sylra | Korr | Sentinel | gate |
|---|---|---|---|---|---|
| r0_skitterer / r0_brute / r0_flyer | 30/30/20% | 10% ea | — | — | — |
| r0_stalker / r0_caster | 10/10% | 5% ea | — | — | — |
| r1_brute / r1_skitterer / r1_stalker | — | 20/15/15% | 10% ea | — | — |
| r1_caster (hexed variant) | — | 10% | 5% | — | Slayer 20 |
| r1_tank | — | 10% | 5% | — | — |
| r2_brute / r2_caster / r2_flyer | — | — | 20/15/10% | 10% ea | — |
| r2_stalker (duskbound variant) | — | — | 15% | 10% | Slayer 40 |
| r2_tank (molten variant) | — | — | 10% | 10% | Slayer 55 |
| r3_stalker / r3_caster (veiltouched) | — | — | — | 15/15% | Slayer 70 |
| r3_brute / r3_tank | — | — | — | 15% ea | — |
| r3_boss (rift tyrant slot) | — | — | — | 5% | Slayer 85 |

Slayer-gated variants: attacking a gated variant below its req → your dmg −50% and no Slayer/style kill XP. Gated variants use the base slot template +15% hp/atk and +1 rare-drop weight.

### §7.3 Unlock table 1–99

| lv | unlock | type | effect |
|---|---|---|---|
| 1 | ab_inspect + Maro tasks | ability | free action: see hp/atk/armor/evasion/speed (engine doInspect); +8 Slayer XP first inspect |
| 5 | Lore Read | passive | inspect also shows weak/resist |
| 10 | Intent Read | passive | inspect shows telegraphed intent; +0.15 initiative/lvl (engine) |
| 15 | ab_expose | ability | 15 en, cd3: mark target, +8 acc vs it (all styles) 3t |
| 20 | Sylra tasks; hexed casters | gate | r1_caster gated variant huntable |
| 25 | Trophy Hunter | passive | beast_trophy drop chance ×1.5 while on-task |
| 30 | Task Focus I | passive | +10% dmg vs on-task slots |
| 35 | ab_task_block | ability | pay 15 pts: never receive that category again (max 3 blocks) |
| 40 | duskbound stalkers | gate | r2_stalker gated variant |
| 45 | Korr tasks | gate | — |
| 50 | ab_finishing_blow | ability | 25 en, cd3: on-task target below 15% hp → instant kill |
| 55 | molten tanks | gate | r2_tank gated variant (bring ember_tonic: fire aura deals 3/turn without it) |
| 60 | Task Focus II | passive | +15% dmg on-task (replaces I); +1 pt per task |
| 65 | ab_double_task | ability | 20 pts: next task count ×2, points ×2.5 |
| 70 | Sentinel tasks; veiltouched casters | gate | r3_caster gated variant |
| 75 | Point Surge | passive | task points ×1.25 |
| 80 | Veil Sense | passive | on-task kills roll rare drops with +1 ring luck (engine distance-luck param) |
| 85 | rift tyrant | gate | r3_boss slot assignable |
| 90 | ab_call_mark | ability | 30 en, cd5: expose ALL enemies 2t |
| 95 | Master's Due | passive | task completion XP ×1.5 |
| 99 | Unbroken Streak | capstone | every 10th consecutive task: points ×3; permanent +5% dmg on-task |

### §7.4 Point shop (Maro redeems; trophies also convert: beast_trophy r0/r1/r2/r3 = 2/4/8/15 pts + 20/60/150/400 coin)

| item/service | cost |
|---|---|
| task reroll | 3 pts |
| task extend (+50% count & points) | 8 pts |
| category block slot (see ab_task_block) | 15 pts |
| emberite_bolt ×36 | 10 pts |
| meteoric_arrow ×45 | 14 pts |
| ranging_potion ×3 / magic_potion ×3 / strength_potion ×3 | 6 pts |
| ember_tonic ×2 | 5 pts |
| veilfire_elixir ×1 | 30 pts |
| gold_veilstone_amulet enchant voucher (RC service) | 60 pts |

## §8 BEASTLORE 1–99 (bestiary: discover → study ×3 stages → tame; XP: discover 20×(tier+1); study stage 15×(tier+1); tame success 60×(tier+1)²; failed tame 8)

Tame mechanics: consumable = beast_treat ×(1+tier) per attempt; success = 55% − 10×tier + 0.5%×(BL − req), cap 90%; only 1 active pet; pet stats = slot template × loyalty scale.

| lv | unlock | type | effect |
|---|---|---|---|
| 1 | ab_study + bestiary | ability | field/combat study action, 3 stages per species (sight → combat habits → close study); stage 3 requires 1 study action within 2 tiles |
| 5 | Tame I | gate | tame tier-0 skitterer/flyer (non-aggressive), pet scale 0.5 |
| 10 | ab_treat_toss | ability | throw beast_treat in combat: target beast −atk 25% for 2t (non-boss) |
| 15 | Habits Read | passive | stage-2 study reveals full drop table % |
| 20 | Tame II | gate | tame tier-0 aggressive slots |
| 25 | Tame III | gate | tame tier-1 beasts (huntXp slots: brute/skitterer); pet scale 0.6 |
| 30 | Bond | passive | pet heals 10% of its max between battles |
| 35 | ab_soothe | ability | 20 en, cd4: pacify one non-boss beast 2 turns (no attacks) |
| 40 | Scholar's Edge | passive | +3% dmg vs any fully-studied (3/3) species |
| 45 | Tame IV | gate | tame tier-2 slots (non-gated); pet scale 0.7 |
| 50 | Tame V | gate | tame tier-2 aggressive/stalker slots |
| 55 | Trained Fangs | passive | pet may use its slot ability (cd 3) |
| 60 | ab_beast_bond | ability | 25 en, cd5: pet intercepts 50% of dmg aimed at you for 2t |
| 65 | Stablemaster | gate | stable capacity 3 (requires CN build, `cn_*` stable) |
| 70 | Tame VI | gate | tame tier-3 non-boss slots; pet scale 0.8 |
| 75 | Field Notes | passive | studying a shiny or gated variant grants double study XP; shiny spot-glow visible |
| 80 | ab_wild_call | ability | 1/battle: summon 2 studied r≤2 skitterers as allies (0.5 scale, 3 turns) |
| 85 | Shiny Sense | passive | shinyChance ×2 while pet active |
| 90 | Night Whisperer | gate | tame nightOnly stalker slots incl. r3 |
| 95 | Loyal Heart | passive | pet scale 0.9; pet death → 5 min cooldown instead of loss |
| 99 | Mythic Bond | capstone | one pet may be a gated-variant beast; pet +1 ability slot; tame floor 35% at any tier |

### §8.1 Tameable-slot matrix

| tier | roles tameable | BL req | treats/attempt | success @req | pet examples of use |
|---|---|---|---|---|---|
| 0 | skitterer, flyer, brute | 5 (20 if aggressive) | 1 | 55% | scouting, early tank |
| 1 | + stalker | 25 (50 stalker) | 2 | 45% | combat ally R0–1 |
| 2 | skitterer/brute/flyer/stalker | 45 (50 aggr/stalker) | 3 | 35% | combat ally R1–2 |
| 3 | all non-boss, non-caster | 70 (90 nightOnly) | 4 | 25% | combat ally R2–3 |
| any | caster, tank | never (tank: BL85) | 5 | 20% | tank pets late |
| any | boss | never | — | — | — |

### §8.2 Custom-mob auto-enroll (emberveil-mob imports; runs at mobloader validate)

| rule | spec |
|---|---|
| enroll | every valid `mob_*` import gets a bestiary entry (discover/study/tame per §8) — no redesign needed |
| ring | = `stats.tier` (0–3) |
| role classification (first match wins) | 1. `phases` present → boss; 2. `armor ≥ 0.8×ring armor max` AND `speed ≤ 3` → tank; 3. `ranged:true` → caster; 4. `speed ≥ 8` AND drops include feather → flyer; 5. `nightOnly` OR (behavior aggressive AND evasion ≥ 0.8×ring max) → stalker; 6. `hp ≥ 1.2×ring base hp` → brute; 7. else skitterer |
| Slayer wiring | auto-joins task category `r{tier}_{role}`; appears in master pools covering that ring; gated only if author sets `"slayerReq": N` in stats (optional ext field) |
| tameable | boss/caster never; else per §8.1 using classified role; `huntXp` present → counts as beast (Hunter XP flows) |
| drop compliance | drops must be a subset of the r{tier}×{role} template (§9.4) + coin + at most 1 mob-specific rare, which MUST be an existing registry id; loader rejects otherwise |
| stat clamps | hp/atk/armor/evasion clamped to §9.2 role×ring range ±15%; xp clamped to 1.2–1.8×hp; huntXp ≤ 0.75×xp; respawn ≥ ring min |
| shiny | `shinyChance` 0–0.2 honored; shiny = double drops, ×3 coin, ×2 XP (engine) |

## §9 THE MOB SLOT FRAMEWORK (the deliverable — generated mobs plug in without redesign)

### §9.1 Role templates (multipliers on ring baseline; behavior/motion law)

| role | hp | atk | evasion | armor | speed | moveRange | behavior | aggro | pack | notes |
|---|---|---|---|---|---|---|---|---|---|---|
| skitterer | 0.6× | 0.8× | base+8 | 0–30% cap | 6–8 | 4–5 | aggressive | 4–5 | 2–4 | fast chaff |
| brute | 1.3× | 1.15× | base | 30–60% cap | 3–4 | 3 | defensive | 0 | 1–2 | huntXp beast, hide carrier |
| stalker | 0.9× | 1.35× | base+10 | 0–40% cap | 6–7 | 4 | aggressive | 6–7 | 1 | often nightOnly |
| caster | 0.7× | 1.1× | base+4 | 0–20% cap | 4–5 | 3 | aggressive | 6 | 1–2 | ranged:true, range 4–5, element required |
| flyer | 0.5× | 0.85× | base+14 | 0 | 8–9 | 5 | defensive | 0 | 2–3 | feather carrier |
| tank | 1.7× | 0.95× | base−4 | 80–100% cap | 2 | 2 | defensive | 0 | 1 | armor wall |
| boss | 3.5–4.5× | 1.6× | base | 60–80% cap | 4–5 | 3 | aggressive | 8 | 1 | 1–2 phases (addAtk +20%, summon 2 ring skitterers), landmark spawn |

### §9.2 Ring baselines and computed role ranges

Baselines: | ring | base hp | base atk | acc | base evasion | armor cap | xp | respawn s | coin (engine 5+tier×12 ×0.7–1.3) |
|---|---|---|---|---|---|---|---|---|
| R0 | 14 | 4 | 55–62 | 8 | 3 | 1.2–1.8×hp | 70–120 | 4–7 |
| R1 | 32 | 8 | 60–68 | 10 | 8 | 1.2–1.8×hp | 100–160 | 12–22 |
| R2 | 65 | 14 | 66–74 | 12 | 16 | 1.2–1.8×hp | 140–220 | 20–38 |
| R3 | 115 | 22 | 72–80 | 14 | 28 | 1.2–1.8×hp | 180–300 | 29–53 |

Computed hp/atk/armor ranges (min–max, generators must land inside ±15%):

| role | R0 | R1 | R2 | R3 |
|---|---|---|---|---|
| skitterer | 8hp/3atk/0ar | 19/6/0–2 | 39/11/0–5 | 69/18/0–8 |
| brute | 18/5/1–2 | 42/9/2–5 | 85/16/5–10 | 150/25/9–17 |
| stalker | 13/5/0–1 | 29/11/0–3 | 59/19/0–6 | 104/30/0–11 |
| caster | 10/4/0 | 22/9/0–2 | 46/15/0–3 | 81/24/0–6 |
| flyer | 7/3/0 | 16/7/0 | 33/12/0 | 58/19/0 |
| tank | 24/4/2–3 | 54/8/6–8 | 111/13/13–16 | 196/21/22–28 |
| boss | 49–63/6/2 | 112–144/13/5–6 | 228–293/22/10–13 | 403–518/35/17–22 |

Boss hp checks vs player DPS: R3 boss ~460 hp vs lv90 melee ~55 dmg/turn → ~9 turns. Sound.

### §9.3 Biome×ring slot matrix (slot key = `biome:role[#]`; every biome fills these; generator targets "count" species per slot)

| biome | ring | slots (role: tags, count) |
|---|---|---|
| greenwood_plains | R0 | skitterer ×2; brute ×2 (hide); flyer ×1 (feather); stalker ×1 (nightOnly); boss ×1 |
| coastal_shores | R0 | skitterer ×1; tank ×1 (shell); flyer ×2; caster ×1 (water); boss ×1 |
| ancient_forest | R0–1 | stalker ×2 (1 nightOnly); caster ×1 (nature); brute ×1 (hide); skitterer ×1 (poison→venom_sac); boss ×1 (R1) |
| misty_wetlands | R1 | caster ×2 (water); skitterer ×1 (poison); brute ×1 (hide); tank ×1; boss ×1 |
| rocky_highlands | R1–2 | tank ×1; brute ×2 (hide); flyer ×1; stalker ×1; boss ×1 (R2) |
| sunbaked_badlands | R2 | skitterer ×2 (poison); stalker ×1; caster ×1 (fire); brute ×1 (hide); boss ×1 |
| frostbound_tundra | R2 | brute ×2 (hide, ice); tank ×1 (ice); caster ×1 (ice); stalker ×1; boss ×1 |
| volcanic_wastes | R2–3 | caster ×2 (fire); tank ×1 (molten, Slayer 55); brute ×1 (hide); flyer ×1; boss ×1 (R2/R3) |
| corrupted_wilds | R3 | stalker ×2 (1 nightOnly, shadow); caster ×2 (1 veiltouched, Slayer 70; shadow); brute ×1 (hide); tank ×1; skitterer ×1; boss ×1 (rift tyrant, Slayer 85) |

Element law: volcanic=fire (weak: water/ice), tundra=ice (weak: fire), wetlands=water/nature (weak: fire), corrupted=shadow (weak: nature... use weak: fire+nature), plains/forest=nature or none (weak: fire). Density 0.001–0.003 per format spec; boss density 0 (landmark-spawned, respawn 300–600s).

### §9.4 Drop-table templates (per ring×role; generated mobs copy the template verbatim + ≤1 registry-id rare)

Universal (every slot): `bone 1 @80%` + engine coin.

| role add-on | R0 | R1 | R2 | R3 |
|---|---|---|---|---|
| brute/skitterer (beast, hide flag) | rough_hide 1–2 @85%, raw_meat 1–2 @90%, sinew 1 @55% | thick_hide 1–2 @85%, raw_meat 1–2 @90%, sinew 1–2 @55% | dusk_hide 1–2 @85%, raw_meat 2–3 @90%, sinew 1–2 @60% | veil_hide 1–2 @85%, raw_meat 2–3 @90%, sinew 2 @60% |
| poison tag (any role) | +venom_sac 1 @60% | +venom_sac 1–2 @65% | +venom_sac 1–2 @70% | +venom_sac 2 @75% |
| stalker | rough_hide 1 @60% | thick_hide 1 @60%, silk_thread 1–2 @55% | dusk_hide 1 @60%, silk_thread 1–2 @60% | veil_hide 1 @60%, silk_thread 2–3 @60% |
| caster | air_rune 3–6 @60%, rune_essence 2–4 @50% | water_rune/earth_rune 3–6 @55%, rune_essence 2–4 @50% | fire_rune 3–5 @50%, earth_rune 3–5 @35%, rune_essence 3–5 @50% | gloom_rune 2–4 @45%, veil_rune 1–2 @15%, rune_essence 4–6 @50% |
| flyer | feather 3–6 @95%, raw_meat 1 @60% | feather 4–7 @95%, raw_meat 1 @60% | feather 5–8 @95%, raw_meat 1–2 @60% | feather 6–10 @95%, raw_meat 1–2 @60% |
| tank | bone 2–3 @100%, ring hide 1 @40%, beast_trophy(ring) @5% | same pattern | same | same |
| boss | beast_trophy(ring meta) 1 @100%, ring hide 2–4 @100%, rare roll ×1 | same | same | same + veilgourd_seed 1 @8% |
| boss rare roll | uncut_sapphire @12% | uncut_emerald @12%, uncut_sapphire @15% | uncut_ruby @12%, uncut_diamond @5% | uncut_diamond @12%, uncut_veilstone @5% |
| R3 any slot | — | — | — | +veilgourd_seed 1 @2% (registry-mandated R3 drop source) |

Mob-specific rare whitelist (the ≤1 extra line): uncut gems (ring-appropriate), rune batches, duskmoss (R2 @8%), veilblossom (R3 @6%), flax_seed/sunmelon_seed (R0–1/R1–2 @6%), wheat_seed (R0 @8%).

### §9.5 Named example mobs (welcome-but-optional flavor; all conform to templates)

| id | slot | ring | one-line |
|---|---|---|---|
| mob_bristle_shrew | greenwood_plains:skitterer | 0 | hedgehog-rat, pack 3 |
| mob_shorehusk_crab | coastal_shores:tank | 0 | armored shell, drops bone 2–3 |
| mob_mirefang | misty_wetlands:skitterer (poison) | 1 | venom_sac carrier |
| mob_hexmoth_seer | ancient_forest:caster (hexed) | 1 | Slayer-20 gated, silk_thread + rune drops |
| mob_cragback_ram | rocky_highlands:brute | 2 | thick→dusk_hide edge case: use dusk (R2) |
| mob_cinder_shell | volcanic_wastes:tank (molten) | 2 | Slayer 55; fire aura 3/turn w/o ember_tonic |
| mob_rift_howler | corrupted_wilds:stalker (nightOnly) | 3 | veil_hide, BL90 tame |
| mob_ash_tyrant | volcanic_wastes:boss | 2 | 2 phases, summons 2 fire skitterers |
| mob_veil_tyrant | corrupted_wilds:boss (rift tyrant) | 3 | Slayer 85; capstone task |

---

# CROSS-SKILL CONTRACTS

**CONSUME (item ← from skill, at my level, rate):**

| item | from | needed at | qty/rate |
|---|---|---|---|
| air/water/earth/fire runes | Runecraft 1/10/20/35 | MG 1/10/20/35 | 1–4 per cast; ~20–30 per 10 fights |
| ward_rune | Runecraft 25 | MG 25 (wardshell), HL 75 (veilmend, 1/cast) | 2–3/cast |
| gloom_rune / veil_rune | Runecraft 60/75 | MG 60+/75+ | 2–5/cast; ~25–30 per 10 fights |
| all metal kits, swords, signatures, shields | Smithing 1–75 | ST/D 1/15/30/45/60/75 | 1 set per tier |
| arrows ×15 / bolts ×12 batches | Fletching+Smithing 1–75 | R 1–75 | ~45–60 ammo per 10 fights pre-recovery |
| bows, crossbows, staves | Fletching 1–75 (staves need glass_orb) | R/MG tier gates | 1 per tier |
| glass_orb | Crafting 25 | via FL staves | 1 per staff |
| leather/studded/hardleather/emberhide/duskhide/veilhide sets; robes (linen→veilweave) | Crafting 1–75 | R/MG tier gates | 1 set per tier |
| bandage (heal 6, ×2/craft) | Crafting 1 | HL 1 | 2–4 per early fight |
| healing_salve | Herblore 1 | HL 1/30 | 1–2 per fight |
| antipoison | Herblore 15 | vs poison-tag slots | 1 per task trip |
| strength/defense/ranging/magic potions | Herblore 25/35/50/60 | ST/D/R/MG training | 1–3 per task |
| ember_tonic | Herblore 45 | Slayer 55 molten tasks | 1–2 per task (mandatory) |
| veilfire_elixir | Herblore 75 | R3 boss fights | 1 per boss |
| cooked fish/meat/bread/stew/pie | Cooking 1–90 | HP sustain all levels (HL passives boost +%) | 3–8 per fight R2+ |
| beast_treat | Cooking 10 (cooked_meat+wildberries+bone) | BL 5–99 tames | 1+tier per attempt |
| jewelry buffs (§16) + RC enchants | Crafting 20–75 / Runecraft | combat buff slots | 1 each |
| cn_* stable build | Construction | BL 65 | 1 |

**PROVIDE (item → to skill, avg yield/kill from slot templates):**

| item | from slots | avg/kill | to |
|---|---|---|---|
| rough_hide / thick_hide / dusk_hide / veil_hide | R0/R1/R2/R3 beasts+stalkers | 1.3–1.6 | Crafting (leather chain), Hunter overlap |
| bone | all | 0.8 (tank 2.5) | Cooking (beast_treat), vendor |
| sinew | beasts | 0.55–1.2 | Fletching (alt bowstring), Crafting |
| feather | flyers | 4.3–7.6 | Fletching (3/arrow batch), Fishing (fly lures) |
| silk_thread | stalkers/casters R1+ | 0.8–1.5 | Crafting (3 → silk_cloth) |
| venom_sac | poison-tag slots | 0.6–1.5 | Herblore (antipoison) |
| raw_meat | beasts/flyers | 1.2–2.3 | Cooking |
| beast_trophy (meta r0–r3) | boss 100%, tank/brute 3–5% | — | Slayer points (2/4/8/15), Construction mounts, vendor (20–400c) |
| runes + rune_essence | casters | 2–5 | Magic rebate / Runecraft |
| uncut gems | boss rares | 5–15%/kill | Crafting |
| veilgourd_seed | R3 slots 2%, R3 boss 8% | — | Farming 75 |
| duskmoss/veilblossom/seed rares | whitelist rares | 6–8% | Herblore/Farming |
| huntXp | beast slots (0.75×xp) | — | Hunter |
| coin | all kills (engine 5+tier×12 ×0.7–1.3) | — | economy |

# REGISTRY GAPS

1. **Slayer master NPC ids** — no `npc_*` namespace declared in registry or delegated list. Used `npc_slayer_maro/sylra/korr/sentinel`; needs namespace ratification.
2. **Slayer points** — no item id; implemented as a non-item counter (like coin-adjacent meta currency). If owner wants it tradeable, needs a registry id.
3. **Crossbow "limbs"/"stocks"** (§13 roles mention "iron limbs + birch stock") — no intermediate ids exist; recipes must fold to `iron_bar + birch_plank` etc. Flagging the §13 role-text implication as fold-to-bar/plank.
4. **beast_trophy ring tiers** — single id with `meta: r0–r3` per §22; engine drop schema has no meta field today; loader/inventory needs a variant field or this becomes 4 ids.
5. **No arrowhead/shaft ids** — ammo folds to bar+log+feather (stated §4.1); consistent with registry but means Fletching-only ammo crafting is impossible without a bar (SM dependency at every tier).
6. **Pet system ids** — no collar/whistle/stable item ids; tames persist as bestiary state + `cn_*` stable build. Fine, but flagged.
7. **`slayerReq` mob-format extension** — MOB_FORMAT.md stats block lacks a slayer-gate field; auto-enroll spec (§8.2) adds optional `stats.slayerReq`; needs format v1.1 note.
8. **Engine spellbook migration** — combat.js hardcodes `spark` (free fire bolt) and mana-only casting; rune consumption per cast is new engine work, not just content.


# APPENDIX B — ADVERSARIAL COHERENCE AUDIT (fixes ratified by the rulings)

# EMBERVEIL v2 — ADVERSARIAL COHERENCE AUDIT

Severity: **CRIT** = ships broken / dead-locks progression · **HIGH** = two docs disagree on the same law · **MED** = contract mismatch, needs one owner to yield · **LOW** = tune/wording.

## A. CIRCULAR / DEAD BOOTSTRAPS (5)

1. **CRIT — Woodcutting/plank dead-lock.** First oak_log needs copper_axe (WC doc: "chop with copper_axe+", no hand rule) → axe needs anvil+oak_plank → planks sawn at workbench (FL1) → workbench needs 4 oak_plank. Nothing is obtainable. Fix: add WC bare-hands rule on tree_oak (×3 time, mirroring Mining §1.1) and change workbench recipe to `3 oak_log` (hand).
2. **CRIT — Loom dead-lock.** loom_block (CN5) requires 2 bowstring; bowstring (CR1) is made **at the loom**. Also blocks small_net→Fishing F1 and bird_snare→Hunter 1. Fix: loom recipe → `5 oak_plank + 4 flax`.
3. **HIGH — Runestone Altar circularity.** CN25 enchant_altar costs 2 ward_rune (RC25, needs an altar); RC doc's contract demands "CN ≤5, R0 mats" which CN doc ignores. World-ruin altars are asserted by CN doc but exist in no worldgen spec. Fix: change recipe to `6 cn_stone_brick + 1 weathered_relic + 5 rune_essence`, and ratify R0 stone-circle world altars in the worldgen deliverable; delete RC's CN≤5 line.
4. **MED — alchemy_table contract breach.** HB contract says buildable "CN ≤3"; CN doc builds it at CN8. No dead-lock (salve is hand-craft; first vialed brew is HB10). Fix: amend HB contract to "CN ≤10".
5. **LOW — harpoon cross-gate (SM25 needs willow_log WC30) and oak_staff wall (MG1 needs glass_orb CR25).** Both self-flagged. Fix: vendor stocks willow_log (14c×1.5) and oak_staff (~45c); no id changes.

## B. DUPLICATE / CONFLICTING SPECS (the worst cluster) (12)

6. **CRIT — Triplicated combat gear stats.** SM §2.4 + FL tables (real-time, spd in seconds, copper_sword atk 5, veilsteel_sword atk 27, copper set armor 8) vs CN Part 2 ("authoritative", turn-based, atk 4/34, set 14, crit ×1.75) vs combat-skills §0.1 ("LAW", atk 4/23, set 14, crit ×1.6, different acc formulas, different shield %s, different burn procs, different staff mana). Three incompatible universes for the *same 130+ items*. Ruling: **combat-skills §0.1/§0 is the single stat law** (it owns the turn model, XP formulas, and the mob framework the stats must balance against); SM/FL/CR/CN docs are stripped to recipes/inputs/XP/coin; CN §2.1–2.9 deleted.
7. **CRIT — Mob stat bands conflict.** CN §2.10 (R3 core hp 240–340) vs combat §9.2 (R3 baseline 115, tank 196, boss ≤518) — both claim to bind slot generators; TTK checks in each doc validate against their own numbers only. Fix: combat §9.2 is law (auto-enroll clamps cite it); delete CN §2.10–2.11.
8. **HIGH — Ammo tables duplicated with different numbers.** FL doc vs combat §4.1: tip bonuses (copper +2 vs +1, iron +4 vs +2), FL XP (15 vs 25/batch), coin, bolt inputs (FL: feather + off-tier planks birch/spruce; combat: no feather, matched-tier planks). Fix: recipes/XP/coin = FL doc **except** adopt combat's matched-tier bolt planks and no-feather bolts; combat bonuses (+atk, burn) = combat §4.1.
9. **HIGH — Jewelry effects specified three ways.** CR-A (%-based, enchant at RC25/59/76, cost 2 ward+2 air) vs RC-4 (luck-param-based, RC27/58/77, cost 1 ward+5 air) vs Mining §1.4 (amulet +0.15 luck). Fix: RC-4 owns enchant levels/costs/effects; CR-A owns base stats but converts to RC-4's base column; Mining §1.4 luck contributions re-pointed (ring +0.05/+0.10, amulet +0.10/+0.20); delete CR-C.
10. **HIGH — rune_essence roll conflict.** Mining §1.5: 6% flat, M90→12%. RC-1: 12%+0.2%×lvl cap 32%. Fix: Mining owns its node roll — 6%/12% stands; RC re-derives supply (dig_site + relic infusions cover the gap).
11. **MED — Uncut gem coin conflict, absurdity included.** Mining §1.7 (uncut_veilstone 1500) vs CR-B (uncut 600 → cut 1400): mining's uncut is worth more than the cut gem. Fix: CR-B values are law; delete gem rows from §1.7.
12. **MED — Fuel model ×3.** Mining: 1 coal = 4 furnace actions, 1 log = 1 action. Cooking: 1 coal/6 items, 1 log/10 cooks. WC: 1 log = 60s burn. Fix: unify — furnace 1 coal = 4 actions or 1 log = 1 action; campfire 1 log = 10 cooks; delete the 60s rule.
13. **MED — Vendor margin conflict.** Cooking: buy 50%/sell 150%. Hunter: buy 100%/sell 160%. Fix: global rule = listed coin is base value, vendors buy 50%, sell 150% (Cooking doc wins); Hunter's tables are base values, unchanged.
14. **MED — Herb node tables duplicated.** FO §2.2 vs HB-2 disagree on respawns (swamp 90 vs 60s, volcanic 150 vs 90s), XP (duskmoss 60 vs 72), and flax placement. Fix: Foraging owns all herb/berry nodes; delete HB-2.
15. **MED — beast_trophy value conflict.** Hunter coin 20/45/90/180 vs Slayer §7.4 20/60/150/400 (+pts). Fix: adopt §7.4 (Slayer owns trophy economy).
16. **LOW — Small-number conflicts.** bandage heal 4 (CR) vs 6 (HL) → 6; ember_tonic 6 min (Mining) vs 300s (HB) → 300s; duskmoss 30 vs 35c, emberbloom 18 vs 22c → Foraging's; rune_essence 3c vs 2c → 3c; diamond cut CR60 (registry §2) vs CR58 → ratify 58 in registry v2.1.
17. **LOW — XP formula cited two ways** (`60n^2.4+80n` vs `60(lv-1)^2.4+80(lv-1)`); cumulative tables agree. Fix: cite engine verbatim once; no content change.

## C. CROSS-SKILL CONTRACT MISMATCHES (7)

18. **HIGH — Hide↔ring mapping.** Registry §7 (thick=R1 brutes, dusk=R2-3 stalkers HU60) and Hunter agree; combat §9.4 gives dusk_hide to **all** R2 brutes/skitterers. Fix: combat §9.4 R2 brute/skitterer → thick_hide; R3 brute → dusk_hide + veil @60% (now matches Hunter HU85 exactly).
19. **MED — Saplings have no source.** Farming requires 6 saplings "3% WC rare roll" but WC's rare-drop tables contain zero saplings. Fix: add `<tier>_sapling 3%` rare to each tree node in WC doc.
20. **MED — Hunter trap recipes orphaned.** box_trap FL15, deadfall_trap FL30, veil_snare FL75, net_trap CR40 appear only in Hunter's doc; FL/CR unlock tables lack the rows (and FL15/30/75, CR40 rows exist with other content). Fix: FL/CR adopt the recipes at those levels with craft XP (30/55/240 FL; 60 CR).
21. **MED — Silver/gold bar ratio.** Mining contract: 2 ore/bar; CR doc: 1 ore/bar. Mining itself says "CR sets ratio" — fix: 1:1, amend Mining's contract table.
22. **MED — cn_stable missing.** BL65 Stablemaster requires a CN stable build that Construction never defines. Fix: add `cn_stable` ~CN40 (6 willow_plank + 4 nails + 2 rough_hide) to CN doc (cn_* namespace, no registry cost).
23. **LOW — RC contract says runeweave "CR30"; CR crafts it at CR40-44.** Fix wording in RC provides-table; the CR40-44 lag vs MG30 equip stands as CR's flagged deliberate stagger (add vendor silk_thread as relief valve, per CR gap 5).
24. **LOW — Misattributed sources.** HB-3 claims rough_hide from bird_snare @40% (snares yield feather/meat/bone only) → source is R0 tracking; Arch doc guesses weathered infusion "~RC15" (actual RC5) → fix text.

## D. SPINE / LAW VIOLATIONS (4)

25. **HIGH — Mob-drop law contradiction.** Delegated-namespace law says generated mobs wire drops "only to §7/§22 + coin", but registry §5 (venom_sac) and §18 (raw_meat) already declare mob sources, and combat §9.4 templates add runes, essence, gems, seeds, duskmoss/veilblossom. Fix: amend the law to the explicit §9.4 whitelist (hides §7, §22 items, venom_sac, raw_meat, caster runes/essence, boss gem rares, listed seed rares, coin) — the design is sound; the parenthetical is what's wrong.
26. **MED — gold_bar in cn_grand_arch (CN85)** breaches "Silver & Gold are Crafting/jewelry-ONLY". Fix: either owner-ratify décor as an allowed gold sink (healthy economy-wise) or substitute 2 cn_veiled_tile.
27. **MED — Registry omits glass panes.** Theme mandate explicitly lists "glass (sand→vials/orbs/**panes**)"; only vial/orb exist, while CN consumes panes at CN14/52/95 with no producer. Fix: add `glass_pane` (CR15, furnace, 3 sand → 2, coin 4) — also closes the source/sink hole.
28. **LOW — No other leakage found:** zero bronze/mithril/adamant/diamond-armor ids, zero gem nodes (riftstone's veilstone side-roll is a mining roll, compliant), no silver/gold weapons, all tier gates at 1/15/30/45/60/75, fish/tree/metal ladders match spine, dead v1 ids: zero reuse detected across all seven docs.

## E. IDS USED BUT NOT IN REGISTRY / SOURCE-SINK HOLES (3)

29. **HIGH — `rough_stone` vs `stone` dual naming.** Mining/SM docs use rough_stone; CN doc uses stone† for the *same* material in furnace/anvil/campfire/masonry recipes; neither is in the 288. Fix: add one id `rough_stone` (hand/pick break of stone terrain + meteor_slag drop, coin 1); CN doc renames.
30. **MED — 18 more unregistered ids in active recipes:** 4 traps (i20), 5 herb seeds + 6 saplings (Farming/Foraging tables), 3 HB potions (healing_potion/foragers_brew/hunters_brew). All have declared source+sink; ratify all (count below).
31. **LOW — Joint source/sink sweep result:** with glass_pane and rough_stone added, every one of the 288+additions has ≥1 source and ≥1 sink (verified: basalt→CN, fired_bowl→stew, relics→3 sinks each, veilstone→amulet/riftblade/beacon, silk_thread, ember_ash, all seeds). No other orphans found.

## F. DETAIL-BAR VIOLATIONS (2)

32. **LOW — Unquantified rows:** cn_fountain "minor energy refill 1/day" (set: +25 energy); Slayer shop "enchant voucher (RC service)" mechanics undefined (set: redeems one RC-4 enchant with runes waived). Everything else that the registry left vague ("minor gather-luck buff") is quantified downstream.
33. **LOW — Named example mobs (Hunter/`§9.5`) carry no stat rows** — acceptable: slot templates are the deliverable and fully numeric; examples inherit.

## G. CONSOLIDATED REGISTRY-GAPS RULINGS

| # | Gap (doc) | Ruling |
|---|---|---|
| G1 | rough_stone / stone (SM, CN) | **ADD** `rough_stone` — issue 29 |
| G2 | glass_pane (CN) | **ADD** CR15 — issue 27 |
| G3 | box_trap, deadfall_trap, net_trap, veil_snare (HU) | **ADD 4** — recipes adopted into FL/CR (issue 20) |
| G4 | 5 herb seeds + 6 saplings (HU/FA/FO) | **ADD 11** — WC adds sapling rares (issue 19) |
| G5 | healing_potion, foragers_brew, hunters_brew (HB) | **ADD 3** — fill classic gates 10/20/40 |
| G6 | weapon_poison id (HB) | **REJECT** — coating property, no id |
| G7 | burnt_food (F/C) | **REJECT** — burning destroys input |
| G8 | enchanted-jewelry ids (CR/RC) | **REJECT** — `enchanted:true` instance flag (both docs agree) |
| G9 | hunt_tracks node type (HU) | **RATIFY** as mechanics-namespace generic node (like fishing_spot); not counted |
| G10 | dig_site variants (A) / fishing_spot variants (F) | **RATIFY** as meta-params, not ids; nodes.js needs per-entry xp override (engine ticket) |
| G11 | npc_slayer_maro/sylra/korr/sentinel (combat) | **RATIFY** new `npc_*` delegated namespace; not counted |
| G12 | Slayer points (combat) | **RATIFY** as meta-currency counter, no id |
| G13 | beast_trophy r0–r3 meta (combat) | **KEEP 1 id**; engine ticket for drop-schema `meta` field; contingency +3 ids if refused |
| G14 | crossbow limbs/stocks, arrow shafts, unstrung bows (SM/FL/combat) | **REJECT** intermediates — fold to bar+plank/log (all docs already comply) |
| G15 | hand-tool / crude-pickaxe id (SM) | **REJECT** — bare-hands ×3 rule, now extended to oak (issue 1) |
| G16 | nails dual recipe SM5 copper / SM15 iron (SM) | **RATIFY** dual recipe |
| G17 | anvil ≤2 copper_bar constraint (SM/CN) | **RATIFY** — CN3 recipe complies; stone qty 4 vs 6 → adopt CN's 4 rough_stone |
| G18 | pottery ladder beyond fired_bowl (CR) | **DEFER** to v2.2 (batch perks cover; candidate: urn for CN/Arch) |
| G19 | chest_block retirement (CN) | **RATIFY** retire — cn_ chest/vault line supersedes |
| G20 | gloves/hands slot unused (CN) | **DEFER** — acceptable cut |
| G21 | vendor oak_staff + willow_log stock (FL/SM) | **RATIFY** — issue 5 |
| G22 | `stats.slayerReq` mob-format ext + spark removal + rune-cast engine work (combat) | **RATIFY** as engine tickets (format v1.1); not content |
| G23 | skill-key migration vitality/tactics/hunting/tailoring/alchemy→v2 names + new `beastlore` key | **RATIFY** — orchestrator applies once in skills.js |

## CORRECTED TOTAL

288 (registry) + 20 new item ids (rough_stone, glass_pane, 4 traps, 5 herb seeds, 6 saplings, 3 HB potions) = **308 canonical item ids** (v2.1 registry #289–308). Rejected/flagged-off: 0 removals. Plus non-item ratifications: 1 generic node type (`hunt_tracks`), 4 `npc_*` ids, `cn_stable` in the delegated cn_* namespace. Contingency: 311 if beast_trophy must split into 4 ring ids (G13). The 280 soft cap is now exceeded by 28 — owner sign-off required.


# APPENDIX C — ECONOMY & PACING AUDIT (fixes ratified by the rulings)

# EMBERVEIL v2 — ECONOMY & PACING AUDIT

Baseline used: curve `60n^2.4+80n` → cum. XP lv50=683k · lv75=1.84M · lv99=3.61M. "Hours" assume focused play at the cap-content XP/hr each doc's own numbers produce (node charges/respawns respected). Median target band: **150–250 h to 99**.

## §1 HOURS TO 50 / 75 / 99 PER SKILL

| Skill | est. XP/hr @cap content | h→50 | h→75 | h→99 | vs median |
|---|---|---|---|---|---|
| Mining | 15–25k (rift+crater rotation) | 35 | 90 | 150–240 | OK |
| Woodcutting | 10–15k (veilwood 250XP, ~40-60 logs/hr) | 55 | 140 | 250–350 | high |
| Fishing | 30–45k (multi-spot 90+) | 25 | 55 | 100–150 | OK |
| Cooking | rides Fishing (batch-5) | — | — | ≈Fishing | OK |
| Hunter | ~28k (3 traps @85, 240XP/90s ea) | 30 | 75 | 130–180 | OK |
| Foraging | 8–12k (veilblossom 90XP, 1-2 chg/300s) | 70 | 180 | 300–400 | **outlier** |
| Farming | ~10k perfect-cycled (8 plots + herbs + trees) | 80 | 190 | ~360 active | **outlier** |
| Archaeology | ~20k (veil_site 85+relic avg) | 35 | 90 | ~180 | OK |
| Smithing | XP fine; material-gated (see F7) | — | — | ~250h of Mining feed | **outlier** |
| Crafting | material-gated (see F4) | — | — | 400–500 | **outlier** |
| Fletching | material-gated (13.6k veilwood logs) | — | — | ~300h of WC feed | high |
| Herblore | secondary-gated (see F5) | — | — | 200–300+ | **outlier** |
| Runecraft | essence-gated (see F14/F2) | — | — | 300+ | **outlier** |
| Construction | see F9 | — | — | ~200 + WC feed | high |
| ST/R combat styles | ~260 XP/kill R3, ~60 kills/hr ≈ 15k | 45 | 120 | 230 | OK |
| Magic | rune-supply-gated | — | — | **impossible** (F2) | **broken** |
| Hitpoints | ~35 XP/kill passive | — | — | lv~78 after all 3 styles 99'd | low-OK |
| Defense | ~38 XP/kill | — | — | see F3 | **broken vs gates** |
| Healing | 1.2×heal, sustain table holds | — | — | ~250 est. | OK |
| Slayer | ~160 XP/on-task kill | 70 | 190 | 350–450 | **outlier** |
| Beastlore | finite pool | — | — | **unreachable** (F1) | **broken** |

## FINDINGS

### A. Pacing

**F1. CRITICAL — Beastlore mathematically cannot reach 99.** Total XP pool is finite: ~100 species × (discover 20-80 + study 3×15-60 + tame ≤960) ≈ **50–80k XP vs 3.61M needed** — off by ~50×. Failed-tame grinding (8 XP, 1-5 beast_treats each) would need 450k attempts. Fix: add a repeatable source — BL XP = 0.25× active pet's damage dealt (pet at 0.7 scale in R2 ≈ 12 XP/turn → ~15k/hr) + repeatable "field observation" of studied species (10×(tier+1), 1/species/day). Lands 99 at ~250h.

**F2. CRITICAL — Magic 99 is rune-starved into impossibility.** 3.61M XP at ~146 XP/kill (1.5×dmg + 50% kill share) = ~25k kills; net rune burn after caster-drop rebates ≈ 6–9/kill → **~150–220k runes ≈ 60–95k essence**. At Mining §1.5's 6% proc (~18 essence/hr) that is **3,000–5,000 h of mining**; even at RC-1's 32% cap, ~600–900 h. Melee pays zero. Fix package (all three): (a) ratify RC-1's rate and raise qty to 2-3 (→ ~90 essence/hr at M60+); (b) caster-slot rune drops ×2 (6-12 @60%) so caster-farming is rune-positive; (c) halve rune costs of the training-tier spell at each gate (T1-T6 "bread" spell = 1 rune). Target: ≤1 support-hr per 2 combat-hrs.

**F3. HIGH — Defense XP income can't keep up with its own equip gates.** D earns ~38 XP/kill (0.5×taken + 15% kill share + blocks) vs ST ~260. When ST hits 60 (4.1k kills), D ≈ 156k XP = **lv 28 — can't equip steel, two tiers behind**; at ST75, D ≈ lv 40. Guard-training only closes it to 3.5× slower. Fix: "defensive stance" toggle routing 50% of style XP to Defense (RS-controlled analog), or raise D kill share 15→30% and taken-multiplier 0.5→1.2. Verify: gates then reachable within ~1.3× the style kill count.

**F4. HIGH — Crafting 99 hide wall.** Tanning veil_leather (90 XP) as the volume lane needs ~19.7k veil_hides; supply (HU75 snare 1/90s + mob drops ~1.4/kill) ≈ **200–490 h of upstream farming**. Fix: veil/dusk tan XP ×2.5 (90→225, 55→140) and veilhide sew XP ×2 → ~8k hides ≈ 100–120 h supply. (Master Tanner perk already hints at this; make it base.)

**F5. HIGH — Herblore 75+ trains on a 1,500c gem.** veilfire_elixir (280 XP) consumes 1 uncut_veilstone; supply ≈ 1–4/hr (R3 gem roll × 13% weight). 75→99 = 6.3k brews = 6.3k veilstones — impossible, and it cannibalizes CR75 amulet + SM90 riftblade demand. Glowfin path (HB80, 320 XP) still needs 5.5k F80 catches. Fix: add HB78 "lesser veilfire" quality-flag brew (1 veilblossom + 2 duskmoss, 210 XP, no veilstone) as the training lane; keep veilstone elixir as the combat consumable.

**F6. MED — Farming ~10k XP/hr fully cycled → ~360 active-hours.** Fix: ×3 harvest XP at FA60+ (veilgourd 210→650, veilwood tree 650→2,000, veilblossom 260→700) — matches RS tree-run pacing → ~150 h.

**F7. MED — Smithing/Fletching 99 are disguised Mining/WC taxes.** SM 75→99 via veilsteel bars = 6.5k bars = 13k meteoric_ore + 6.5k veil_flux ≈ 250 h of crater/rift mining (crater yield ~25 ore/hr/crater). FL 75→99 via plank-saw = 13.6k veilwood logs ≈ 300 h WC. Fix: cap-tier craft XP ×1.8 (veilsteel_bar 270→480, veilwood plank-saw 130→230, veilsteel kit pieces ×1.5) → feed drops to ~140/170 h.

**F8. MED — Slayer ~160 XP/on-task kill → 22k kills (350–450 h), worst combat-adjacent grind.** Fix: task-completion bonus 10×→25× category avg hp and trophy turn-in XP ×2 (r3 600→1,200) → ~240 XP/kill-equivalent, ~250 h.

**F9. LOW — Construction's own estimate is internally wrong.** 75→99 = 1.77M; at cn_veilwood_wall 150 XP that is **11,800 builds (23.6k planks), not "2,600"**. Fix: veilwood_wall 150→300 XP, cn_veiled_tile 300→500, then the 2,600–4,000 estimate holds.

### B. Coin faucets/sinks & loops

**F10. HIGH — Vendor-margin law is defined twice, contradictorily.** Cooking doc: buy 50% / sell 150%. Hunter doc: player sells at **100%**, vendor sells ×1.6. At 100% sell, zero-risk chains print: 1 sand (1c) → 3-5 glass_vials = 12-20c/craft; 25 essence (~60c) → 8-25 veil_runes = 320-1,000c per 5s bind at RC99. Fix: ratify 50/150 globally; at 50% both loops fall under gather-value/hr and die.

**F11. HIGH — Endgame gem faucet dwarfs every other income.** M85+ R3: ~16% proc × ~490c avg gem value ≈ 78c/gather ≈ **15k coin/hr**, vs mob farming 2–3k/hr and R3 coin caches ~1k/hr. Fix: adopt the Crafting doc's lower uncut values (40/75/130/240/600 — Mining's 60/140/300/650/1500 column is the one to delete) and cap Prospector II at ×1.25. Result ≈ 5–6k/hr, still best-in-slot for miners without invalidating combat income.

**F12. MED — Conflicting coin tables enable cross-system arbitrage:** uncut gems (Mining vs Crafting, ×2.3 apart), beast_trophy r3 (Hunter 180c vs Slayer shop 400c — sell to Slayer, never vendor), copper_arrow 1c (FL) vs 2c (combat doc). Fix: single price owner per id — Crafting for gems, Slayer values for trophies (they're the sink), combat doc for ammo.

**F13. MED — Sink deficit at cap.** Durability exists on every item but repair is "future work"; after gear is bought there is no recurring coin drain vs 3–15k/hr faucets. Fix: activate anvil repair now at 10% of item coin value per full durability restore (veilsteel chest ≈ 225c/repair cycle), plus Slayer-master task-transport fee (r2 25c, r3 60c).

### C. Material flow at matched levels

**F14. HIGH — rune_essence supply is specified twice with a 2–5× disagreement** (Mining §1.5: 6% flat, 12% @M90 vs RC-1: 12%+0.2%/lvl cap 32%) — and it's the single most contested input (RC binds 25/action, HB magic_potion ×3, Magic combat burn). Fix: ratify RC-1's curve, qty 2-3, keep the R2+ +1. This is a precondition for F2's numbers.

**F15. MED — Fly-fishing feather sink is oversized.** F20→45 span ≈ 8k catches × 1 feather = 8k feathers ≈ 16 h of parallel snaring for a mid-tier fishing lane. Fix: feather consumed 1 per 5 casts, or a `fly_lure` craft (10 feathers → 50 casts).

**F16. LOW — Coal fuel rate conflict:** 1 coal = 4 furnace actions (Mining) vs 6 (Cooking). Coal supply (~200/hr) covers either; pick 6 and delete the other. Steel-kit budget (48 coal ≈ 15 min mining) is healthy.

**F17. LOW — Silver dead-ends at CR32.** Only sinks are sapphire/emerald jewelry; after ~lv40 silver_ore is junk despite a 180s-respawn node. Fix: silver thread ×1 in gloomweave pieces, or silver-tipped bolts (+dmg vs veiltouched slots).

**F18. LOW — ember_tonic duration 300s (HB) vs "6 min" (Mining §1.3).** Pick 300s.

### D. DPS/EHP vs ring tiers

**F19. CRITICAL (blocker) — Three agents each published "authoritative" stats for the same gear ids**, disagreeing by up to 45%: veilsteel_sword atk **27 / 34 / 23** (SM / CN / combat docs); emberite_sword 16/19/14; iron_bolt +6/+3/+3; copper set soak 21% vs 32%; crit ×1.75 (CN) vs ×1.6 (combat). Every TTK/EHP number below depends on which wins. Fix: ratify combat-skills §0.1 (it cites and matches the engine formulas), auto-regenerate the stat columns in the SM and CN docs from it. Until then this audit uses CN §2.11's own TTK table.

**F20. MED — Soft dead zone lv75–85 in deep R3.** Fresh-75 eff ~33.9/turn vs 300–420 hp = TTK 10–12, above the 6–9 target, while incoming ~38/hit forces heavy food burn. Acceptable if R3-deep is signposted as 85+; otherwise lower R3-deep hp floor 300→260 and acc 74–82→72–78. No other dead zones: TTK is 3–5 through lv45, 7–8 at 60–75; no ring is trivialized (gated variants' −50% dmg rule protects R2/R3).

**F21. LOW — 45-level shield gap (steel D30 → veilsteel D75; emberite/meteoric kits shieldless).** Sword-and-board Defense builds stagnate. Add meteoric_shield (D60, armor 10, block 12%) or declare the gap intentional.

**F22. LOW (pass) — Style parity holds on damage:** ranged within ±5% of melee at every gate, ammo margin positive at every ring (+10.6c to +94c/kill per §4.1); crossbows' +15% dmg for −2 spd is a fair trade. Magic's ~+10% pre-cost is fine — its failure is supply (F2), not tuning.

### E. Signature weapons

**F23. MED — steel_warpike is a strict upgrade, not a sidegrade:** ≈equal atk/acc to steel_sword plus reach 2 with no speed or damage tax (CN values; combat doc agrees at 10/10). Reach = free opening hit + safe kiting. Fix: warpike atk −2 or spd −1.

**F24. LOW — emberite_flame_flail edges out emberite_sword single-target** (~23 vs ~20 eff/turn with CN's 50% burn-4×3). Use the combat doc's 35% proc → parity restored.

**F25. LOW — Post-90 signature dominance stack:** ST90 Titan Grip (+15% sig dmg) × SM99 (+25% proc rate) retires the sword line entirely. Cap combined at +15% total or set Titan Grip to +8%.

**F26. MED — Jewelry/enchant defined four times with different numbers:** registry §16 ("minor gather-luck") vs CR-A (+3% double-drop) vs Mining §1.4 (+0.05 luck) vs RC-4 (+0.05→+0.10); enchant costs also conflict (CR-C: RC25, 2 ward+2 air vs RC-4: RC27, 1 ward+5 air) for all 8 pieces. Fix: RC doc owns enchant levels/costs, CR doc owns base effects, Mining/registry rows become references — regenerate accordingly.

## TOP 5 ACTIONS (ordered)
1. F19 — ratify combat §0.1 as the single gear-stat source (blocks everything else).
2. F2+F14 — unify essence at RC-1 rates, qty 2-3, caster drops ×2, 1-rune training spells.
3. F1 — give Beastlore a repeatable XP source (0.25× pet dmg).
4. F3 — defensive-stance XP toggle so armor gates are reachable.
5. F10/F12 — ratify 50/150 vendor law + single price owner per id.