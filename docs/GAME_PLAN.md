# Emberveil — Clean-Slate Content Plan (v1)

> **This document replaces the entire previous item catalog.** Nothing from the old
> ~90-item set is reused — every id below is new. The engine (voxel world, biomes,
> distance rings, stations, combat modes, node system) stays; the *content* restarts.
> Old saves will not carry over.

## Locked design principles

1. **Distance = rarity.** The world's danger rings (`worldgen.tierAt`: R0 <260 · R1 260–520 · R2 520–900 · R3 900+) feed a luck bonus into *every* gather. Better fish, rarer herbs, richer relics, rarer saps the farther you go. Skill bands per ring: R0 lv1-15 · R1 lv10-30 · R2 lv25-45 · R3 lv40-60.
2. **Gems are never mined.** Geodes drop as rare byproducts of *any* ore vein (ring decides geode grade). The gem type is decided when the geode is **cut** at the runestone altar — better types weighted by geode grade. Cut gems socket into jewelry and imbue weapons.
3. **Coal + steel.** Coal is a shallow fuel ore consumed by every smelt; steel is an alloy recipe. The precious metal (gold) is **jewelry-only**, never tools or weapons.
4. **Woods map to weapon lines.** Each of the 5 species feeds specific bow/staff/handle lines (fletching lives in woodworking). Magic and ranged get a full ladder — no more starvation.
5. **Every item has a source AND a sink. Every skill milestone is real.** The old catalog's dead-ends (top-tier bars with no recipes) and ~40 fake milestones are structurally banned.
6. **Beastlore** joins as skill #22 — discover/study/tame, bestiary, and auto-enrollment of user-imported custom mobs.
7. All art becomes a **32×32 PNG texture pack** (externally generated) — see `docs/TEXTURES.md`.

## Design rulings (adversarial-review resolutions)

An adversarial review pass (Appendix A) found 5 blockers, 12 moderates, 6 nits.
These rulings are authoritative where they conflict with the catalog text below:

- **R1 (blocker 1):** `runestone_altar` recipe = `quarried_stone 6 + mossy_geode 1 + root_relic 1` (construction 18). Gloamshard moves to a **tier-2 altar upgrade**; T2+ casters (not T3-only) drop gloamshard 10%.
- **R2 (blocker 2):** every craft skill's first recipe sits at **level 1**: `bronze_ingot` smithing 1 · roast brookperch cooking 1 · minor heal tonic alchemy 1 · mossy geode cut enchanting 1.
- **R3 (blocker 3):** `tree_lanternwood` splits: **wc 35** at the Crystal Caverns fringe (R2) + a richer **wc 50** corrupted-wilds variant. The T2 caster path is gatherable, not buy-only.
- **R4 (blocker 4):** the §10 trim list is void. Instead of cutting, **merge**: flawless gems become a quality flag not separate ids (−5), one tiered whetstone (−1), gold blanks folded into signet/amulet recipes (−2), iron→steel heavy collapsed into one steel set (−3), drop candied spinefruit (−1). Final count ≈ **204**; anything in 200–210 is acceptable.
- **R5 (blocker 5):** resolved — the gear catalog §1–6 was a pipeline truncation, recovered in full below. Counts reconcile per R4.
- **R6 (mod 6):** single XP rule: **catalog base XP × BAND_XP_TUNE[ring]** applied at grant. All per-node "+ring×N" notes are void.
- **R7 (mod 7):** station id is `runestone_altar` everywhere (applied).
- **R8 (mod 9):** engine currency (`coin`) is retained as-is — the one deliberate carry-over; "longsword/spade/ale/wand/kiln/masonry" mentions are void or map to real ids (kiln duties → furnace).
- **R9 (mod 10):** add `tall_grass` cross-block (per-biome tint) with the ring-gated seed table (+1 texture).
- **R10 (mod 11):** `materialXpValue(item)` = node xp for raws; 0.6 × Σ inputs (memoized) for crafted — craft XP uses this.
- **R11 (mod 12):** all smithing ≤14 recipes are **furnace/workbench-only**; the anvil (construction 6, needs iron) gates smithing 15+.
- **R12 (mod 13):** `pyrewarden` heavy T3 is a **3-piece set** (smithing 48/50/52) with published per-piece armor; ~60 total armor comes from the full set.
- **R13 (mod 14-15):** `bonepoint_arrow`: 1 pitchgum + 1 bone_shards + 1 featherbarb → **14 arrows** (30% recovery). Iron arrowhead recipe at smithing 14/ww 12; steelpoint moves to ranged 18.
- **R14 (mod 17):** keep `trophy_mount`; add totem → Beastlore treat conversion at the campfire.
- **R15 (nits):** rod line is deliberately 3 tiers; light/cloth armor equip-gates on ranged/magic levels; poisonous tag is cross-tier; texture manifest in `docs/TEXTURES.md` is the exact list (supersedes in-doc counts).

## Implementation phases

1. **Engine prep:** texture-pack loader (PNGs → atlas + item icons), enforce tool `minTier`, real milestone registry, `BAND_XP_TUNE` luck/XP wiring, save-version bump (wipe).
2. **Materials + nodes:** new blocks, node types, drop tables (catalog §1).
3. **Gear + recipes:** items, recipe web, stat curves (catalog §2).
4. **Skill ladders + Beastlore:** milestones, engine payoffs, bestiary (catalog §3).
5. **Textures:** import ChatGPT-generated pack batch-by-batch (`docs/TEXTURES.md`).
6. **Balance pass:** XP-per-hour targets per band, combat curve verification, playtest.

---



# PART 1 — MATERIALS & GATHERING CATALOG

# Emberveil — Materials & Gathering Catalog (v1, clean-slate namespace)

Verified against: `js/game/nodes.js` (rollNodeDrops luck param, node schema), `js/world/worldgen.js` (tierAt rings, 10 biomes, FROST_CAMP pin), `js/world/blocks.js` (block schema, unenforced minTier), `js/game/skills.js` (22nd skill slot), `docs/MOB_FORMAT.md` (mob drops/spawn schema). No id or label below collides with any old item/block/node id or label. All audit dead-end/orphan/bottleneck patterns have explicit fixes (marked ⚑).

**Legend** — Ring: R0 <260, R1 260–520, R2 520–900, R3 900+ (`worldgen.tierAt`). Sources: N=node drop, Nr=node rare, E=creature, B=block break, A=archaeology, Fi=fishing, F=farming, S=smelt/process. All items are also vendor-sellable (secondary sink); "consumed by" lists primary sinks only. Skill bands per spine: R0 lv1-15, R1 lv10-30, R2 lv25-45, R3 lv40-60.

---

## 1. RAW MATERIAL ITEMS (95 total)

### 1a. Minerals & terrain (13)

| id | label | ring | obtained from | consumed by |
|---|---|---|---|---|
| raw_copper | Copper Ore | R0 | N:vein_copper | smelt → bronze_ingot (Bronze tool/weapon/heavy-armor line) |
| raw_tin | Tin Ore | R0 | N:vein_tin | smelt → bronze_ingot |
| coal | Coal | R0-1 | N:seam_coal; B:stone 1% | fuel: iron ×1, steel ×2, caldrite ×3, pyrelith ×4 per smelt; kiln firing (brick/pottery/glass); torch line; campfire fuel |
| raw_iron | Iron Ore | R1 | N:vein_iron | smelt → iron_ingot (Iron line; + coal → steel_ingot, Steel line); nails/fittings (construction) |
| raw_gold | Gold Ore | R1-2 | N:lode_gold; S:tarnished_trinket ×3 | smelt → gold_ingot: ring/amulet blanks (jewelry line), gilt thread (T3 cloth armor), gilded lorestone (construction). ⚑ NOT a tool/weapon metal |
| raw_caldrite | Caldrite Ore | R2 | N:vein_caldrite | smelt (+coal ×3) → caldrite_ingot: T2 weapon/armor lines, tier-4 tools |
| raw_pyrelith | Pyrelith Ore | R3 | N:lode_pyrelith | smelt (×2 + coal ×4 + gloamshard ×1 flux, in clay crucible) → pyrelith_ingot: T3 endgame gear, tier-5 tools. ⚑ consumer recipes mandatory in Gear phase — no embersteel repeat |
| gloamshard | Gloamshard | R2-3 | N:cluster_gloamshard; E:T3 casters 10% | pyrelith flux; staff/wand cores; charm line (enchanting); **craftable runestone_altar recipe** ⚑ (fixes altar bottleneck); imbue reagent |
| radiant_gloamshard | Radiant Gloamshard | R3 | Nr:cluster_gloamshard 6%×luck; T3 boss chest | capstone enchants, veil-lantern utility, T3 amulet core |
| quarried_stone | Quarried Stone | any | B:stone/basalt/ruins; N:spent nodes | masonry line, furnace/kiln/anvil, whetstones (consumable) |
| river_clay | River Clay | R0-1 | N:clay_bed; B:clay terrain | fired bricks (kiln), **crucible** (pyrelith smelt), potion flasks (alchemy bottle economy), planters |
| fine_sand | Fine Sand | R1-2 | B:sand (deserts/shores) | glass (vials/panes), **gem-cutting abrasive ×2 per cut**, casting molds (smithing) |
| packed_earth | Packed Earth | any | B:dirt/grass/soils | placeable; farm terracing |

### 1b. Geodes & gems (14) — see §3 for full system

| id | label | ring found | obtained from | consumed by |
|---|---|---|---|---|
| mossy_geode | Mossy Geode | R0 | Nr: any ore vein in R0 (2.5%) | cut at runestone altar (ench 5) |
| banded_geode | Banded Geode | R1 | Nr: any ore vein in R1 (3.25%) | cut (ench 18) |
| glassy_geode | Glassy Geode | R2 | Nr: any ore vein in R2 (4%) | cut (ench 32) |
| starlit_geode | Starlit Geode | R3 | Nr: any ore vein in R3 (5%) | cut (ench 46) |
| dawn_garnet / flawless_dawn_garnet | Dawn Garnet | — | cutting | socket: melee-power rings/amulets; weapon imbue |
| gale_beryl / flawless_gale_beryl | Gale Beryl | — | cutting | socket: ranged power; bow imbue |
| veilstar / flawless_veilstar | Veilstar | — | cutting (rare, R3-weighted) | socket: magic power; staff imbue; signature gem |
| warden_jade / flawless_warden_jade | Warden Jade | — | cutting | socket: armor/HP; shield imbue |
| foxfire_amber / flawless_foxfire_amber | Foxfire Amber | — | cutting | socket: gather-luck (+0.15/+0.30 luck); fortune tonics |

### 1c. Woods (15) — 5 species, each with sap rare + sapling

| id | label | ring | obtained from | consumed by |
|---|---|---|---|---|
| alder_log | Alder Log | R0 | N:tree_alder | alder planks: T0 tool handles, cudgel line, shortbow, novice staff, stations; fuel |
| tidewillow_log | Tidewillow Log | R1 | N:tree_tidewillow | T1 bow line (laminated), fishing rod line, light hafts |
| rimefir_log | Rimefir Log | R2 | N:tree_rimefir | T2 warbow, heavy tool hafts (tier 4-5), spear shafts, arrow shafts T2 |
| duskbough_log | Duskbough Log | R3 | N:tree_duskbough | T3 recurve bow line, T3 weapon grips/handles |
| lanternwood_log | Lanternwood Log | R2-3 rare | N:tree_lanternwood | **staff/wand line T2-3** ⚑ (magic no longer starved), glowlamp furniture, arrow shafts T3 |
| pitchgum | Pitchgum | R0 | Nr:tree_alder 4% | fletching glue (all arrows), handle binding, torches, waterproofing |
| withy_cane | Withy Cane | R1 | Nr:tree_tidewillow 4% | rod line T2+, bow lamination T1-2, baskets |
| coldsap | Coldsap | R2 | Nr:tree_rimefir 4% | frost-resist tonics, food preservation (buff-duration +), armor wax |
| duskrosin | Duskrosin | R3 | Nr:tree_duskbough 4% | bow wax consumable (+ranged buff), shadow tonic line, T3 bow lamination |
| glowpith | Glowpith | R2-3 | Nr:tree_lanternwood 12% | wand/staff cores, lantern craft, sigil ink (enchanting) |
| alder_sapling … lanternwood_sapling (5) | (species) Sapling | as species | Nr: chop 4% (lanternwood 10%) | **plantable** ⚑ (farming 5/15/28/42/50) — grows into the tree node in 20-60 min; fixes seed-dead-end pattern; makes lanternwood renewable |

### 1d. Herbs & forage (13)

| id | label | ring | obtained from | consumed by |
|---|---|---|---|---|
| hearthmint | Hearthmint | R0 | N:herb_thicket | minor heal tonic, teas (cooking) |
| woundwort | Woundwort | R0 | N:herb_thicket | salves, heal tonic line |
| marshbell | Marshbell | R1 | N:herb_thicket (ring≥1, lv10) | mana tonic T1 |
| stonecress | Stonecress | R1 | N:herb_thicket (ring≥1, lv14) | antidote (with venom_gland), defense tonic |
| cinderbloom | Cinderbloom | R2 | N:herb_thicket (ring≥2, lv27) | fire-resist + attack tonics T2 |
| frostcap | Frostcap | R2 | N:gloomcap_hollow | frost-resist, greater mana tonic |
| emberlace | Emberlace | R3 | N:herb_thicket (ring 3, lv42) | greater attack / last-stand tonics T3 |
| hollowroot | Hollowroot | R3 | N:gloomcap_hollow (ring 3, lv45) | greater heal, veilsight tonic T3 |
| glowspore | Glowspore | R2-3 | Nr:gloomcap_hollow 5% | glow vial (utility light), dream tonic, radiance enchant reagent |
| brambleberry | Brambleberry | R0-1 | N:berry_bramble | eat (2hp), preserve (cook buff), red dye |
| spinefruit | Spinefruit | R2 | N:spinebloom_cactus | eat (stamina), sunquench tonic, candied (cook) |
| flax_fibre | Flax Fibre | R0-1 | N:flax_stand ⚑ (fibre finally gatherable) | twine (→ ~15 recipes), linen cloth (loom, cloth armor T0-1), bowstring (with sinew) |
| gloamfibre | Gloamfibre | R2-3 | N:gloamflax_stand | gloamweave cloth (T2-3 cloth armor), veilstring (T3 bows/staff bindings) |

### 1e. Fish & fishing extras (10) — catch tables in §6

brookperch (R0), mosscarp (R0), saltdarter (R1), bogpike (R1), stonebass (R2), icechar (R2), emberkoi (R3, volcanic hot springs), gloameel (R3, corrupted waters). Each fish: source Fi (see §6); sink = its own cooked **buff-food** recipe (heal / gather-speed / evasion / attack / defense / frost-res+HP / fire-res+attack / mana+magic respectively) + aquatic taming treats (Beastlore).
| id | label | ring | obtained | consumed by |
|---|---|---|---|---|
| drowned_coffer | Drowned Coffer | any | Nr: fishing 2-4%×luck | open → ring-scaled loot (coin, geode of ring, relic of ring, bait, 1% flawless gem) |
| bait_grubs | Grub Bait | R0+ | Nr:clay_bed 20%, berry_bramble 10%, game_trail 15% | consume on cast: +0.5 luck next catch; taming treat (small beasts); compost |

### 1f. Creature parts (14) — tier mapping in §5

| id | label | tier | obtained from | consumed by |
|---|---|---|---|---|
| ragged_pelt | Ragged Pelt | T0 | E:T0 beasts; N:game_trail | tan → light-armor line T0, grips |
| sturdy_hide | Sturdy Hide | T1 | E:T1 beasts | light-armor T1, quivers, tool wraps |
| direhide | Direhide | T2 | E:T2 beasts | light-armor T2, heavy-armor padding |
| shadehide | Shadehide | T3 | E:T3 beasts | light-armor T3, endgame grips/quiver |
| beast_sinew | Beast Sinew | T0-1 | E: any beast T0-1 | bowstrings T0-2, haft bindings, snares |
| ironsinew | Ironsinew | T2-3 | E: elites T2-3 | bowstrings T3, heavy bow line, T3 bindings |
| totem_fang / totem_horn / totem_skull / totem_heart | Totem (Fang/Horn/Skull/Heart) | T0/1/2/3 | E: rare 6% per tier; Nr:game_trail | **Beastlore study** (consume: XP), charm line (enchanting), trophy mounts (construction), tame-proof quests |
| lean_cut | Lean Cut | T0-1 | E: beasts; N:game_trail | cooking T0-1, taming treats |
| prime_cut | Prime Cut | T2-3 | E: beasts T2-3 | cooking T2-3 feasts, taming treats (large beasts) |
| venom_gland | Venom Gland | T1-3 | E: serpents/stalkers/poisoners 25% | venom arrows (ammo line), toxin tonic, antidote ingredient |
| featherbarb | Featherbarb | T0-2 | E: birds 60%; N:game_trail | arrow fletching (all tiers), quills (enchant scrolls) |

### 1g. Archaeology (6)

| id | label | ring | obtained from | consumed by |
|---|---|---|---|---|
| root_relic | Root-Age Relic | R0-1 | A:surface_cairn | tier-1 rune imbues (enchanting), scholar questline, lorestone decor |
| forge_relic | Forge-Age Relic | R1-2 | A:sunken_barrow | tier-2 rune imbues, scholar quests |
| storm_relic | Storm-Age Relic | R2 | A:kiln_ruin | tier-3 rune imbues, scholar quests |
| veil_relic | Veil-Age Relic | R3 | A:veilgrave | capstone imbues, T3 dungeon key component, scholar finale |
| tarnished_trinket | Tarnished Trinket | R1+ | A: any dig common | smelt ×3 → raw_gold ⚑ (no vendor-trash-only); quest turn-ins |
| bone_shards | Bone Shards | any | A: dig common; E: skeletal | bonemeal fertilizer (farming, −25% growth time), bone arrowtips T0, tailoring needles |

### 1h. Crops (10) — detail in §6

hearthwheat, sweetbulb, mireroot, sunmelon, glimmergourd + matching `*_seeds` (5). Seeds: F:harvest return, ring-gated tall-grass drops, vendor. Produce sinks: flour/bread/ale; aromatics; stews T1 + animal feed (taming); stamina refreshers; mana feasts + gourd lanterns + glimmer-candy (Beastlore lure for magical mobs).

---

## 2. RESOURCE NODE TYPES (22)

Format: drops `item wN [lv] [r≥ring]`; rare `item %` (all rare % are base — multiplied by (1+luck), §4). minTier is the **enforced** tool tier (see §4 implementation — single gate, no blocks.js contradiction ⚑). Tool tiers: 1 crude, 2 bronze, 3 steel, 4 caldrite, 5 pyrelith (tier 5 = speed only, stated honestly ⚑).

| id | label | skill lv | tool (minTier) | biomes / ring | xp | time s | charges | respawn s | drops | rare |
|---|---|---|---|---|---|---|---|---|---|---|
| tree_alder | Alder | wc 1 | axe 1 | greenwood_plains, ancient_forest / R0+ | 16 | 2.8 | 3-5 | 40 | alder_log 1 | pitchgum 4%, alder_sapling 4% |
| tree_tidewillow | Tidewillow | wc 10 | axe 2 | misty_wetlands, coastal_shores / R1 | 40 | 3.6 | 3-6 | 90 | tidewillow_log 1 | withy_cane 4%, sapling 3% |
| tree_rimefir | Rimefir | wc 25 | axe 3 | frostbound_tundra, rocky_highlands / R2 | 90 | 4.4 | 4-6 | 180 | rimefir_log 1 | coldsap 4%, sapling 3% |
| tree_duskbough | Duskbough | wc 40 | axe 4 | corrupted_wilds / R3 | 170 | 5.2 | 4-6 | 300 | duskbough_log 1 | duskrosin 4%, sapling 3% |
| tree_lanternwood | Lanternwood | wc 50 | axe 4 | corrupted_wilds rare (d 0.001), crystal_caverns fringe | 260 | 6.0 | 3-5 | 480 | lanternwood_log 1 | glowpith 12%, sapling 10% |
| clay_bed | Clay Bed | mine 1 | shovel 1 | wetlands, coastal / R0-1 | 10 | 2.2 | 2-4 | 50 | river_clay 1-2 | bait_grubs 20% |
| vein_copper | Copper Vein | mine 1 | pick 1 | plains/forest caves, highlands / R0 | 18 | 3.0 | 2-4 | 60 | raw_copper 1 | geode (§3) |
| vein_tin | Tin Vein | mine 1 | pick 1 | same as copper / R0 | 18 | 3.0 | 2-4 | 60 | raw_tin 1 | geode |
| seam_coal | Coal Seam | mine 5 | pick 1 | shallow caves + highlands / R0-1 | 24 | 3.2 | 3-5 | 80 | coal 1-2 | geode |
| vein_iron | Iron Vein | mine 12 | pick 2 | rocky_highlands, frostbound_tundra / R1+ | 45 | 4.0 | 2-5 | 150 | raw_iron 1 | geode |
| lode_gold | Gold Lode | mine 22 | pick 2 | sunbaked_badlands, highland rivers / R1-2 | 70 | 4.6 | 2-3 | 300 | raw_gold 1 | geode ×1.5 chance |
| vein_caldrite | Caldrite Vein | mine 30 | pick 3 | badlands, tundra deep rock / R2 | 110 | 5.2 | 2-4 | 420 | raw_caldrite 1 | geode |
| cluster_gloamshard | Gloamshard Cluster | mine 42 | pick 4 | crystal_caverns / R2, corrupted_wilds / R3 | 180 | 5.8 | 1-3 | 600 | gloamshard 1 | radiant_gloamshard 6%, geode |
| lode_pyrelith | Pyrelith Lode | mine 48 | pick 4 | volcanic_wastes / R3 | 250 | 6.2 | 2-4 | 720 | raw_pyrelith 1-2 | geode |
| herb_thicket | Herb Thicket | forage 1 | — | plains, forest, wetlands, badlands, volcanic edge / all rings | 12→(+ring×20) | 1.8 | 1-2 | 45 | hearthmint w3; woundwort w2; marshbell w2 lv10 r≥1; stonecress w2 lv14 r≥1; cinderbloom w2 lv27 r≥2; emberlace w1 lv42 r3 | — |
| gloomcap_hollow | Gloomcap Hollow | forage 25 | — | caves, tundra shade / R2; corrupted / R3 | 85 | 2.2 | 1-2 | 90 | frostcap w3; hollowroot w1 lv45 r3 | glowspore 5% |
| berry_bramble | Berry Bramble | forage 1 | — | plains, forest / R0-1 | 9 | 1.6 | 2-3 | 70 | brambleberry 1-3 | bait_grubs 10% |
| flax_stand | Wild Flax | forage 3 | — | plains, wetlands / R0-1 | 11 | 1.6 | 2-3 | 60 | flax_fibre 1-2 | — |
| gloamflax_stand | Gloamflax | forage 30 | — | corrupted, tundra / R2-3 | 95 | 2.4 | 2-3 | 180 | gloamfibre 1-2 | — |
| spinebloom_cactus | Spinebloom | forage 20 | — | sunbaked_badlands / R2 | 60 | 2.0 | 1-2 | 120 | spinefruit 1-2 | — |
| fishing_shallows | Calm Waters | fish 1 | rod 1 | any still water, all rings | 22→(+ring×25) | 4.5 | 3-6 | 50 | see §6 | drowned_coffer 2%, bait_grubs 8% |
| deepwater_run | Deepwater Run | fish 35 | rod 3 | deep coast / R2, ice holes / R2, corrupted+volcanic springs / R3 | 130 | 5.5 | 2-4 | 150 | see §6 | drowned_coffer 4% |
| surface_cairn | Weathered Cairn | arch 1 | shovel 1 | plains, highlands / R0-1 | 30 | 5.0 | 1-2 | 300 | root_relic w3; bone_shards w3; tarnished_trinket w1 r≥1 | mossy_geode 3% |
| sunken_barrow | Sunken Barrow | arch 15 | shovel 2 | wetlands, coastal / R1-2 | 65 | 5.5 | 1-2 | 400 | forge_relic w3; tarnished_trinket w2; bone_shards w2 | banded_geode 3% |
| kiln_ruin | Kiln Ruin | arch 30 | shovel 3 | badlands, highlands / R2 | 120 | 6.0 | 1-2 | 500 | storm_relic w3; tarnished_trinket w2; coal w1 | glassy_geode 3% |
| veilgrave | Veilgrave | arch 45 | shovel 4 | corrupted, volcanic edge / R3 | 210 | 6.5 | 1 | 700 | veil_relic w3; tarnished_trinket w1 | starlit_geode 3%, radiant_gloamshard 2% |
| game_trail | Game Trail | hunt 1 | — | all beast biomes, all rings | 15→(+ring×20) | 3.0 | 1-2 | 240 | lean_cut w4; ragged_pelt w3; featherbarb w2; beast_sinew w2 lv10; prime_cut w2 lv30 r≥2 | totem of ring's tier 3% |

Every skill now has a real 1→50+ node ladder ⚑ (mining 1/5/12/22/30/42/48, wc 1/10/25/40/50, forage 1/3/20/25/30 + entry gates to 45, fishing 1→48, arch 1/15/30/45, hunting via ring-gated entries + kill scaling §5).

---

## 3. GEM SYSTEM (end-to-end)

**Chosen implementation: per-ring rough-gem variants (4 geode items), NOT a luck param at cutting.** Rationale: the geode's tier is fixed at find-time (matches owner rule "weighted by the distance tier where the rough was found"), survives inventory/save trivially, is player-legible ("a Starlit Geode is worth carrying home"), and needs zero new plumbing — the node's stamped `ring` (§4) picks the item id.

**Drop rule:** every ore-type node (copper, tin, coal, iron, gold ×1.5, caldrite, gloamshard, pyrelith — never a dedicated "gem node") carries rare entry `{ item: GEODE_BY_RING[node.ring], chance: 0.025 }`, scaled by (1+luck) → effective: R0 2.5%, R1 3.25%, R2 4.0%, R3 5.0% (before gear/potion luck). Secondary sources: archaeology rares, drowned_coffer, custom-mob templates (§5).

**Cutting** (runestone altar, enchanting-side recipe; altar now craftable: quarried_stone ×6 + gloamshard ×2 + root_relic ×1 ⚑): consumes geode ×1 + fine_sand ×2.

| geode | ench lv | xp | dawn_garnet | gale_beryl | warden_jade | foxfire_amber | veilstar | flawless chance |
|---|---|---|---|---|---|---|---|---|
| mossy_geode | 5 | 25 | 32 | 27 | 27 | 12 | 2 | 2% |
| banded_geode | 18 | 60 | 26 | 24 | 24 | 18 | 8 | 5% |
| glassy_geode | 32 | 110 | 22 | 21 | 21 | 21 | 15 | 9% |
| starlit_geode | 46 | 180 | 18 | 18 | 18 | 21 | 25 | 14% |

(Weights are per-cut type odds; flawless roll is independent and upgrades the produced gem to its `flawless_` variant.) Gem sinks: socketing gold rings/amulets (jewelry line), weapon/armor imbues (rune recipes consuming relics + gems), foxfire luck gear (+0.15 / flawless +0.30 luck). Five types × 2 qualities = 10 items, all with guaranteed sinks.

---

## 4. DISTANCE = RARITY (concrete numbers + implementation)

1. **Stamp ring at spawn:** `node.ring = worldgen.tierAt(node.x, node.z)` (Frostwatch pin correctly yields ring 2).
2. **Ring luck:** `RING_LUCK = [0, 0.30, 0.60, 1.00]`. Total luck = ringLuck + gear (foxfire sockets) + potion + bait, **capped at 2.0** (rare chances thus ×1.0 … ×3.0). Feeds the existing unused `luck` param — `rd.chance * (1 + luck)` already works in `rollNodeDrops` (nodes.js:189).
3. **Ring-gated table entries:** extend entry schema with `ring`; change eligibility filter to `(!d.level || level >= d.level) && (!d.ring || (node.ring ?? 0) >= d.ring)`; signature becomes `rollNodeDrops(def, level, rand, luck = 0, ring = 0)`. This is how one node type (herb_thicket, fishing_shallows, game_trail) gets richer with distance.
4. **Crit gathers:** +2% crit chance per ring (stacks with skill crit formula) — double yield farther out.
5. **XP scaling:** generic nodes grant `baseXp × (1 + 0.9 × ring)` so far-ring gathering pays into the band curve.
6. **Tool gate unification ⚑:** delete the dead `blocks.js minTier` path or make it authoritative — single helper `canHarvest(nodeOrBlock, tool)` reading the node's declared `tool`+`minTier` (values in §2), enforced on BOTH the node-gather and block-break paths (fixes audit contradiction: old main.js:1049 formula vs blocks.js:22).

---

## 5. CREATURE-PART FAMILIES × ENEMY TIERS (incl. custom mobs)

Drop template per creature tier (applies to built-ins and is the **documented recommended `drops` block for emberveil-mob JSON** — keyed off `stats.tier`; mobloader should warn on unknown item ids):

| tier | hide (55-60%) | sinew (40-50%) | meat (50-60%) | totem (6%) | extras |
|---|---|---|---|---|---|
| 0 | ragged_pelt | beast_sinew | lean_cut | totem_fang | birds: featherbarb 60% |
| 1 | sturdy_hide | beast_sinew | lean_cut | totem_horn | poisonous: venom_gland 25% |
| 2 | direhide | ironsinew | prime_cut | totem_skull | glassy_geode 2%; casters: gloamshard 10% |
| 3 | shadehide | ironsinew | prime_cut | totem_heart | starlit_geode 2%; casters: gloamshard 10%; bosses: radiant_gloamshard 25% |

- **Hunting ladder ⚑ (was empty):** bonus part roll on every beast kill, chance `20% + 1.5% × hunting level` (cap 80%); hunting 10 unlocks double-hide crits; 25 unlocks totem chance ×2; 40 unlocks prime_cut from T1 beasts. Plus the game_trail node (§2).
- **Beastlore (skill #22):** XP = first-discovery `40×(tier+1)` (kill or close observe), study `25×(tier+1)` consuming a matching totem at the bestiary, taming attempts (treats: lean_cut/prime_cut/bait_grubs/fish; magical mobs need glimmer-candy). Custom mobs enter the bestiary automatically via manifest — their `stats.tier` selects totem/hide family, so user-generated content plugs into the same economy with zero new items.

---

## 6. FARMING & FISHING

**Crops** (hoe → tilled_loam, plant seeds; 3 visual stages; bonemeal −25% time; mulch/compost sink for surplus produce named for Gear phase):

| crop | farm lv | ring seeds appear | growth (min) | yield | seed return | produce sinks |
|---|---|---|---|---|---|---|
| hearthwheat | 1 | R0 (tall grass 25%, vendor) | 8 | 1-2 | 65% +1 | flour → bread/ale line |
| sweetbulb | 6 | R0-1 | 10 | 1-2 | 60% | aromatics (all savory cooking) |
| mireroot | 15 | R1 (wetland grass) | 14 | 2-3 | 60% | hearty stews (T1 buff food), animal feed (taming) |
| sunmelon | 28 | R2 (badlands, kiln_ruin rare) | 18 | 1 (big) | 80% ×2 | stamina refreshers, candied |
| glimmergourd | 42 | R3 (veilgrave rare, corrupted grass) | 25 | 1 | 70% | mana feasts, gourd lantern (construction), glimmer-candy (Beastlore lure) |

Tree farming: saplings per §1c (farming 5/15/28/42/50) — farming's ladder now spans 1→50 ⚑.

**Fishing catch tables** (weights; `lv` = fishing level gate, `r` = ring gate — both enforced by §4 filter):

- `fishing_shallows` (all rings): brookperch w5 lv1 · mosscarp w3 lv6 · saltdarter w3 lv12 r≥1 · bogpike w2 lv18 r≥1 · stonebass w2 lv28 r≥2 · icechar w1 lv33 r≥2. Rare: drowned_coffer 2%×luck, bait_grubs 8%.
- `deepwater_run` (fish 35, r≥2): stonebass w3 · icechar w3 · emberkoi w2 lv40 r3 · gloameel w1 lv48 r3. Rare: drowned_coffer 4%×luck.
- Bait: +0.5 luck for the next catch. Per-ring effective rarity comes free from ring gates + ring luck — a R3 cast is ~2× rarer-catch-prone than R0 with strictly better tables.

---

## 7. WORLD BLOCKS REQUIRED (new; 32×32 tiles)

- **Ore ready-states (9):** copper_vein, tin_vein, coal_seam, iron_vein, gold_lode, caldrite_vein, pyrelith_lode (emissive 0.3), gloamshard_cluster (cross-ish, non-opaque, emissive 0.6), clay_bed_block. Shared depleted: **spent_rock** (drops quarried_stone).
- **Trees (16):** {alder, tidewillow, rimefir, duskbough, lanternwood}_log (top+side tiles) + alder_leaves, tidewillow_fronds, rimefir_needles, duskbough_canopy, lanternwood_glowleaves (emissive 0.5); 5 × sapling blocks (cross); shared tree_stump (slab).
- **Forage node states (12, cross unless noted):** herb_tussock / herb_tussock_cut; gloomcap_cluster / gloomcap_stubs; bramble_bush / bramble_bare (cube non-opaque); flax_plant / flax_stubble; gloamflax_plant / gloamflax_stubble; spinebloom_ripe / spinebloom_cut (cube non-opaque).
- **Archaeology (4, slab):** cairn_mound, barrow_stone, kiln_rubble, veilgrave_marker (emissive 0.2). Hunting: trampled_track (slab decal).
- **Farming (12):** tilled_loam (top tile); crop_sprout (shared cross); {hearthwheat, sweetbulb, mireroot, sunmelon, glimmergourd}_green / _ripe (cross).
- **Terrain retained** (engine blocks keep working, drops remapped to new ids): stone→quarried_stone, basalt/ruins→quarried_stone, sand→fine_sand, clay terrain→river_clay, dirt/soils→packed_earth. Old Nightglass ghost-drop bug ⚑: any obsidian-like block must map to a registered item or drop null — no unregistered ids.
- Fishing nodes use rendered markers, no blocks.

**Texture order for this half:** ~54 new block tiles + 95 item icons ≈ **149 PNGs (32×32)**.

**Budget check:** 95 material/gathering items (13 mineral/terrain + 14 gem + 15 wood + 13 herb/forage + 10 fishing + 14 creature + 6 archaeology + 10 crop) → leaves 65-105 slots for the Gear/Consumables phase within the 160-200 target (recommend 3-piece armor sets to fit). Hard rules verified: every item above has ≥1 non-vendor sink and ≥1 source; no fake milestones — every listed level gate corresponds to a node, table entry, recipe, or mechanic specified here.


# PART 2 — GEAR, CONSUMABLES & RECIPE CATALOG

# Emberveil — Gear, Consumables & Recipe Catalog (v1, phase 2 — builds on Materials Catalog v1)

Verified against `js/game/combatrs.js` (dmg = weaponAtk + skill×0.4–0.45, mitigation = armor/(armor+30), variance 0.7–1.3, crit ×1.6), `js/game/crafting.js` (recipe/station schema, station ids), `js/game/items.js` (item schema: tool power/dur, weapon atk/acc/spd/crit/range, armor slots), `js/game/skills.js` (xpForLevel, 22-skill slot), audit files (all three). **No id below collides with any old item id.** Every phase-1 material id is consumed by ≥1 recipe here (§8 checklist). **All 127 phase-2 items are craftable via the recipe web (§ tables double as the recipe list); zero drop-only items** — boss/dungeon chests pay out in materials (geodes, radiant_gloamshard, relics), never in unique gear (fixes frostbrand/ironbud one-copy pattern).

**Budget reconciliation:** phase 2 = **127 items** → catalog total **222**. The spine's own minimums (17+ tool grid, 12+ weapons, ammo, 27 armor, 8 mandated fish dishes, 4 potion bands, jewelry) cannot fit in 105. **21 items are flagged † = cut-first**; trimming all † lands at **201 ≈ target**, with re-routed sinks stated in §10. Recommend keeping all 127.

**Engine notes (required, small):** add slots `ring1, ring2, amulet, charm` (sets use head/body/legs; `off` = shield **or** quiver — a real ranged-vs-block tradeoff; hands/feet retired). Ammo: bows require arrows, 1 consumed/shot, arrow atk adds to bow atk. Runes: consumable, applied to one equip item, permanent, max 1/item. Buff stacking: 1 food + 1 potion + 1 coating(oil/wax/whetstone). Craft XP = `10 + 2.5 × recipeLevel` (round to 5). Skill bands honored: T0 lv1-15, T1 10-30, T2 25-45, T3 40-60.

---

## 1. TOOLS (17) — grid + recipes

Power/dur by tier: t1 1.0/70 · t2 1.45/190 · t3 1.95/420 · t4 2.5/750 · t5 3.1/1200. minTier enforced via phase-1 §4 `canHarvest`. t5 = speed only (stated honestly). Gaps in grid are deliberate: no node demands the missing tier (shovel t3 covers the t2 barrow gate; hoe/rod have no high gates).

| id | kind/tier | station | skill lv | inputs |
|---|---|---|---|---|
| stonebit_axe | axe 1 | workbench | woodworking 1 | hewn_plank 2, quarried_stone 2, twine 1 |
| bronzehead_axe | axe 2 | anvil_block | smithing 8 | bronze_ingot 2, alder_log 1, twine 1 |
| steelhead_axe | axe 3 | anvil_block | smithing 22 | steel_ingot 2, alder_log 1, sturdy_hide 1 |
| caldrite_axe | axe 4 | anvil_block | smithing 32 | caldrite_ingot 2, rimefir_log 1, direhide 1 |
| pyrelith_axe † | axe 5 | anvil_block | smithing 47 | pyrelith_ingot 2, rimefir_log 1, shadehide 1 |
| stonebit_pick | pick 1 | workbench | woodworking 1 | hewn_plank 2, quarried_stone 3, twine 1 |
| bronzehead_pick | pick 2 | anvil_block | smithing 8 | bronze_ingot 2, alder_log 1, twine 1 |
| steelhead_pick | pick 3 | anvil_block | smithing 22 | steel_ingot 2, alder_log 1, sturdy_hide 1 |
| caldrite_pick | pick 4 | anvil_block | smithing 33 | caldrite_ingot 2, rimefir_log 1, direhide 1 |
| pyrelith_pick | pick 5 | anvil_block | smithing 48 | pyrelith_ingot 2, rimefir_log 1, shadehide 1 |
| stonebit_spade | shovel 1 | workbench | woodworking 2 | hewn_plank 2, quarried_stone 1, twine 1 |
| steelhead_spade | shovel 3 | anvil_block | smithing 23 | steel_ingot 1, alder_log 1, twine 1 |
| caldrite_spade | shovel 4 | anvil_block | smithing 34 | caldrite_ingot 1, rimefir_log 1, beast_sinew 1 |
| stonebit_hoe | hoe 1 | workbench | woodworking 2 | hewn_plank 2, quarried_stone 1, twine 1 |
| bronzehead_hoe † | hoe 2 | anvil_block | smithing 9 | bronze_ingot 1, alder_log 1 |
| springcast_rod | rod 1 | workbench | woodworking 3 | alder_log 2, twine 2 |
| deepcast_rod | rod 3 | workbench | woodworking 28 | tidewillow_log 2, withy_cane 2, steel_ingot 1, twine 2 |

Wood→tool mapping per catalog: alder = handles t1-3, rimefir = heavy hafts t4-5, tidewillow+withy = rod line.

## 2. WEAPONS (13) + AMMO (4) — melee/ranged/magic at EVERY tier

Stats tuned to armor/(armor+30) + audit enemy tiers. TTK sanity: T0 falchion (6+str) → golem ~14 hits (was 40); T1 longsword → shell_snapper 2 hits; T2 warspear → rimehowl_alpha ~8 hits; T3 greatsword (17 + str50×.45 ≈ 39 raw, ×0.79 vs armor 8 ≈ 31) → magma_hulk 3 hits. Parity: ranged = melee−1 atk but arrows add +0/+2/+4/+6 (pays ammo); magic = ranged base, no ammo, costs mana, staves grant +mana.

| id | class/tier | atk | acc | spd | crit | rng | dur | station | skill lv | inputs |
|---|---|---|---|---|---|---|---|---|---|---|
| alder_cudgel | melee T0a | 3 | 5 | 1 | 3 | — | 90 | workbench | woodworking 2 | alder_log 2, twine 1 |
| bronze_falchion | melee T0 | 6 | 6 | 0 | 5 | — | 220 | anvil_block | smithing 8 | bronze_ingot 2, hewn_plank 1, ragged_pelt 1 |
| steel_longsword | melee T1 | 10 | 7 | 0 | 6 | — | 380 | anvil_block | smithing 18 | steel_ingot 2, hewn_plank 1, beast_sinew 1 |
| caldrite_warspear | melee T2 | 13 | 9 | 1 | 8 | — | 500 | anvil_block | smithing 36 | caldrite_ingot 2, rimefir_log 2, twine 2 |
| veilbrand_greatsword | melee T3 | 17 | 8 | -1 | 8 | — | 700 | anvil_block | smithing 50 | pyrelith_ingot 3, duskbough_log 1, shadehide 1 |
| alder_shortbow | ranged T0 | 5 | 8 | 1 | 6 | 6 | 150 | workbench | woodworking 4 | alder_log 2, twine 2 |
| tidewillow_recurve | ranged T1 | 8 | 10 | 1 | 8 | 7 | 300 | workbench | woodworking 16 | tidewillow_log 3, withy_cane 2, beast_sinew 2, twine 1 |
| rimefir_warbow | ranged T2 | 12 | 11 | 1 | 9 | 7 | 460 | workbench | woodworking 30 | rimefir_log 3, withy_cane 2, beast_sinew 3, twine 2 |
| duskbough_recurve | ranged T3 | 16 | 12 | 2 | 11 | 8 | 650 | workbench | woodworking 46 | duskbough_log 3, duskrosin 2, ironsinew 2, gloamfibre 2 |
| hearthspark_staff | magic T0 | 5 | 7 | 0 | 4 | 5 | 140 (+5 mana) | workbench | woodworking 6 | alder_log 2, coal 2, twine 1 |
| tideward_scepter | magic T1 | 8 | 8 | 0 | 6 | 5 | 280 (+10 mana) | workbench | woodworking 20 | tidewillow_log 2, steel_ingot 1, marshbell 3 |
| lanternglow_staff | magic T2 | 12 | 9 | 0 | 8 | 6 | 440 (+18 mana) | workbench | woodworking 36 | lanternwood_log 2, glowpith 1, gloamshard 1 |
| gloamcaller_staff | magic T3 | 16 | 10 | 1 | 10 | 7 | 620 (+30 mana) | workbench | woodworking 50 | lanternwood_log 2, duskbough_log 1, glowpith 2, gloamshard 2, veilstar 1 |

**Magic starvation fixed:** entry at woodworking 6 with zero rare mats; 4-step staff ladder; mana pool scales via cloth armor + staves + potions. **Ranged fixed:** 4-step bow ladder + ammo economy + quiver.

Ammo (×12 per craft, workbench, woodworking; 1 consumed/shot, usable in any bow):

| id | +atk | skill lv | inputs |
|---|---|---|---|
| bonepoint_arrow | +0 | woodworking 5 | alder_log 1, bone_shards 2, featherbarb 2, pitchgum 1 |
| steelpoint_arrow | +2 | woodworking 18 | alder_log 1, steel_ingot 1, featherbarb 2, pitchgum 1 |
| caldrite_arrow | +4 | woodworking 32 | rimefir_log 1, caldrite_ingot 1, featherbarb 3, pitchgum 1 |
| pyrepoint_arrow | +6 | woodworking 44 | lanternwood_log 1, pyrelith_ingot 1, featherbarb 3, pitchgum 1 |

Venom arrows are delivered via `venom_oil` coating (§6) applied to any arrow stack — one item covers all tiers.

## 3. ARMOR (27) + SHIELDS (2) + QUIVER (1) — new cap curve

**Proposed cap curve** (old cap ~18 = 37% DR): T0 kit ~7 armor (19%) · T1 heavy+targe 18 (37%) · T2 heavy+bulwark 29 (49%) · T3 heavy+bulwark+2 jade signets **41 (58%) hard practical cap**. Vs enemy atk 18 (T3 elite) → ~7.6 avg hit against ~110-125 endgame HP. Light path trades ~40% of that armor for evasion/speed/crit; cloth trades armor for magic/mana. Enemy-side armor (0-8) unchanged — new weapon atk keeps mitigated TTKs in §2.

Heavy (anvil_block, smithing) — heavy starts at steel; T0 heavy identity = light set + bronzebound_targe (bronze stays a tool/weapon/shield metal):

| id | slot/tier | armor | other | skill lv | inputs |
|---|---|---|---|---|---|
| steel_warhelm | head T1 | 4 | -1 eva | smithing 24 | steel_ingot 2, sturdy_hide 1 |
| steel_hauberk | body T1 | 7 | -2 eva, -1 spd, +5 hp | smithing 28 | steel_ingot 4, sturdy_hide 1, twine 1 |
| steel_legplates | legs T1 | 4 | -1 eva | smithing 26 | steel_ingot 3, twine 1 |
| caldrite_casque | head T2 | 6 | -1 eva, +3 hp | smithing 38 | caldrite_ingot 2, direhide 1 |
| caldrite_warplate | body T2 | 10 | -2 eva, -1 spd, +8 hp | smithing 42 | caldrite_ingot 4, direhide 2, twine 2 |
| caldrite_legguards | legs T2 | 6 | -1 eva, +3 hp | smithing 40 | caldrite_ingot 3, direhide 1 |
| pyrewarden_helm | head T3 | 8 | +5 hp | smithing 48 | pyrelith_ingot 2, shadehide 1 |
| pyrewarden_plate | body T3 | 13 | -3 eva, -1 spd, +10 hp | smithing 52 | pyrelith_ingot 4, shadehide 2, ironsinew 2 |
| pyrewarden_greaves | legs T3 | 9 | -1 eva, +5 hp | smithing 49 | pyrelith_ingot 3, shadehide 1 |

Light (loom_block, tailoring; hide tiers = ragged/sturdy/dire/shade; bone_shards = needles):

| id | slot/tier | armor | other | skill lv | inputs |
|---|---|---|---|---|---|
| trapper_hood | head T0 | 1 | +2 eva | tailoring 4 | ragged_pelt 1, twine 1 |
| trapper_vest | body T0 | 2 | +3 eva, +3% gather | tailoring 6 | ragged_pelt 3, twine 1, bone_shards 1 |
| trapper_breeches | legs T0 | 1 | +2 eva | tailoring 5 | ragged_pelt 2, twine 1 |
| wayfarer_hood | head T1 | 2 | +3 eva | tailoring 14 | sturdy_hide 1, twine 1 |
| wayfarer_jacket | body T1 | 4 | +4 eva, +5% gather, +1 spd | tailoring 18 | sturdy_hide 3, twine 2, bone_shards 1 |
| wayfarer_leggings | legs T1 | 2 | +2 eva | tailoring 16 | sturdy_hide 2, twine 1 |
| direhide_cowl | head T2 | 3 | +4 eva | tailoring 30 | direhide 1, twine 1 |
| direhide_harness | body T2 | 6 | +5 eva, +5% gather | tailoring 34 | direhide 3, twine 2, bone_shards 1 |
| direhide_striders | legs T2 | 3 | +3 eva, +1 spd | tailoring 32 | direhide 2, twine 1 |
| shadewalker_cowl | head T3 | 5 | +5 eva, +2% crit | tailoring 44 | shadehide 1, gloamfibre 1 |
| shadewalker_garb | body T3 | 8 | +7 eva, +5% gather, +1 spd | tailoring 48 | shadehide 3, ironsinew 1, gloamfibre 2 |
| shadewalker_treads | legs T3 | 5 | +4 eva, +1 spd | tailoring 46 | shadehide 2, gloamfibre 1 |

Cloth (loom_block, tailoring; 2-piece hood+robe per old woven precedent):

| id | slot/tier | armor | other | skill lv | inputs |
|---|---|---|---|---|---|
| hearthspun_hood | head T0-1 | 1 | +6 mana | tailoring 5 | linen_cloth 2, twine 1 |
| hearthspun_robe | body T0-1 | 1 | +2 magic, +10 mana | tailoring 9 | linen_cloth 4, twine 1, bone_shards 1 |
| gloamweave_hood | head T2 | 2 | +2 magic, +12 mana | tailoring 28 | gloamweave_cloth 2, twine 1 |
| gloamweave_robe | body T2 | 3 | +5 magic, +20 mana | tailoring 32 | gloamweave_cloth 4, glowspore 1, twine 1 |
| veilcloth_hood | head T3 | 4 | +4 magic, +20 mana | tailoring 46 | gloamweave_cloth 2, gold_ingot 1 (gilt thread), gloamfibre 1 |
| veilcloth_robe | body T3 | 5 | +8 magic, +35 mana, +5 hp | tailoring 50 | gloamweave_cloth 4, gold_ingot 2, radiant_gloamshard 0? — no: gloamfibre 2, bone_shards 1 |

(veilcloth_robe inputs final: gloamweave_cloth 4, gold_ingot 2, gloamfibre 2, bone_shards 1.)

Shields & quiver (`off` slot — shield OR quiver, never both):

| id | stats | station | skill lv | inputs |
|---|---|---|---|---|
| bronzebound_targe | +3 armor, 12% block | anvil_block | smithing 10 | hewn_plank 4, bronze_ingot 2, ragged_pelt 1 |
| caldrite_bulwark | +7 armor, 20% block | anvil_block | smithing 40 | caldrite_ingot 4, rimefir_log 2, direhide 1, ironsinew 1 |
| hunters_quiver † | +1 ranged spd, 25% chance arrow not consumed | loom_block | tailoring 16 | sturdy_hide 2, twine 2, featherbarb 2 |

## 4. JEWELRY (9) + CHARM (1) + RUNES (4) — gems end-to-end

Socket rules: **regular cut gems → rings** (runestone altar, consumes gold_ring blank + gem); **flawless gems → amulets + capstone rune**; gem type ↔ stat is fixed and legible:

| gem | ring (regular) | stat | flawless sink |
|---|---|---|---|
| dawn_garnet | garnet_signet | +2 melee atk | rune_of_the_veil |
| gale_beryl | beryl_signet | +2 ranged atk | rune_of_the_veil |
| veilstar | veilstar_signet | +2 magic atk, +5 mana | veilstar_amulet, rune_of_the_veil |
| warden_jade | jade_signet | +2 armor, +5 hp | wardenheart_amulet †, rune_of_the_veil |
| foxfire_amber | amber_signet | +0.15 luck (phase-1 luck pool, cap 2.0) | rune_of_the_veil |

| id | slot | stats | station | skill lv | inputs |
|---|---|---|---|---|---|
| gold_ring † | ring | +1 armor, +1 acc | anvil_block | smithing 26 | gold_ingot 1, fine_sand 1 (cast mold) |
| gold_amulet † | amulet | +5 hp | anvil_block | smithing 28 | gold_ingot 2, fine_sand 1 |
| garnet_signet | ring | see above | runestone_altar | enchanting 12 | gold_ring 1, dawn_garnet 1 |
| beryl_signet | ring | see above | runestone_altar | enchanting 14 | gold_ring 1, gale_beryl 1 |
| jade_signet | ring | see above | runestone_altar | enchanting 16 | gold_ring 1, warden_jade 1 |
| amber_signet | ring | see above | runestone_altar | enchanting 20 | gold_ring 1, foxfire_amber 1 |
| veilstar_signet | ring | see above | runestone_altar | enchanting 26 | gold_ring 1, veilstar 1 |
| wardenheart_amulet † | amulet | +4 armor, +15 hp | runestone_altar | enchanting 44 | gold_amulet 1, flawless_warden_jade 1, radiant_gloamshard 1 |
| veilstar_amulet | amulet | +5 magic, +25 mana, +1 all atk | runestone_altar | enchanting 48 | gold_amulet 1, flawless_veilstar 1, radiant_gloamshard 1 |
| wildheart_charm | charm | +10% tame chance, +15% Beastlore XP, +5% dmg vs beasts | runestone_altar | enchanting 22 (equip req Beastlore 15) | totem_horn 1, gloamshard 1, sturdy_hide 1 |

Runes (runestone_altar; consumed on application to ONE weapon/armor/shield: +N atk or +N armor permanently, 1 rune/item; featherbarb = quill, glowpith = ink):

| id | bonus | skill lv | inputs |
|---|---|---|---|
| rune_of_roots | +2 | enchanting 8 | root_relic 1, dawn_garnet 1, featherbarb 1, pitchgum 1 |
| rune_of_forges | +4 | enchanting 20 | forge_relic 1, gale_beryl 1, featherbarb 1, pitchgum 1 |
| rune_of_storms | +6 | enchanting 36 | storm_relic 1, warden_jade 1, featherbarb 1, glowpith 1 |
| rune_of_the_veil | +9 | enchanting 50 | veil_relic 1, any flawless gem 1 (5 recipe variants, same output), radiant_gloamshard 1, glowpith 1 |

Geode cutting recipes (from phase-1 §3, restated as recipe rows): mossy/banded/glassy/starlit_geode + fine_sand 2 → 1 weighted-random gem @ runestone_altar, enchanting 5/18/32/46, xp 25/60/110/180.

## 5. COOKED BUFF-FOODS (13) — campfire, cooking (buffs 10 min, one food active)

| id | ring | effect | skill lv | inputs |
|---|---|---|---|---|
| grilled_brookperch | R0 | heal 8, +1 hp/10s regen | cooking 2 | brookperch 1 |
| hearth_bread † | R0 | heal 10, +20 stamina | cooking 5 | hearthwheat 2 |
| hunters_skewer † | R0 | heal 9, +1 melee atk | cooking 7 | lean_cut 2, sweetbulb 1 |
| herbed_mosscarp | R0 | +10% gather speed | cooking 8 | mosscarp 1, sweetbulb 1, hearthmint 1 |
| seared_saltdarter | R1 | +8 evasion | cooking 14 | saltdarter 1, brambleberry 2 |
| bogpike_pie | R1 | +2 all atk | cooking 18 | bogpike 1, hearthwheat 2 |
| mireroot_stew | R1 | heal 20, +2 armor | cooking 20 | mireroot 2, sweetbulb 1, lean_cut 1 |
| stonebass_bake | R2 | +3 armor | cooking 28 | stonebass 1, hearthwheat 1 |
| glazed_icechar | R2 | frost-res, +10 max hp | cooking 32 | icechar 1, coldsap 1 |
| emberkoi_roast | R3 | fire-res, +3 melee/ranged atk | cooking 42 | emberkoi 1, cinderbloom 1 |
| glimmer_candy | R3 | Beastlore lure: magical mobs tameable 5 min | cooking 44 | glimmergourd 1, brambleberry 3 |
| gloameel_soup | R3 | +30 mana, +3 magic | cooking 46 | gloameel 1, glimmergourd 1 |
| wildfeast_platter | R3 | heal 40, +2 ALL stats (party-share) | cooking 48 | prime_cut 2, sunmelon 1, sweetbulb 2 |
| gourd_mana_feast | R3 | +40 mana, mana regen ×2 | cooking 50 | glimmergourd 2, hearthwheat 1 |

(14 rows listed; gourd_mana_feast + glimmer_candy both counted in the 13 foods + 1 utility split — glimmer_candy is tallied under Utility.)

## 6. POTIONS (13, alchemy_table) + UTILITY (7) + PLACEABLES (3)

Flask economy: every potion consumes `river_clay 1` (clay flask, implied) — a permanent whole-game clay sink.

| id | band | effect | skill lv | inputs (+river_clay 1 each) |
|---|---|---|---|---|
| hearth_salve | T0 | heal 18 | alchemy 2 | woundwort 2, hearthmint 1 |
| marshlight_tonic | T1 | restore 30 mana | alchemy 12 | marshbell 2 |
| wound_draught | T1 | heal 40 | alchemy 14 | woundwort 2, marshbell 1 |
| stoneskin_tonic † | T1 | +5 armor 5 min | alchemy 18 | stonecress 2, bone_shards 1 |
| antivenom | T1 | cure + poison immunity 5 min | alchemy 20 | stonecress 1, venom_gland 1 |
| venom_oil † | T1-3 | coat weapon/arrow stack: +poison 5 min | alchemy 24 | venom_gland 2, pitchgum 1 |
| cinderheart_tonic | T2 | +3 atk, fire-res 5 min | alchemy 28 | cinderbloom 2, spinefruit 1 |
| deepmana_elixir | T2 | restore 70 mana | alchemy 32 | frostcap 2, marshbell 1 |
| fortune_tonic † | T2 | +0.5 luck 10 min (phase-1 pool, cap 2.0) | alchemy 36 | foxfire_amber 1, glowspore 1 |
| emberlace_wrath | T3 | +5 all atk 5 min | alchemy 42 | emberlace 2, cinderbloom 1 |
| veilsight_philter | T3 | darkvision + reveal veilgraves/gloam nodes 10 min | alchemy 44 | hollowroot 1, glowspore 2 |
| hollow_elixir | T3 | heal 85 + regen | alchemy 46 | hollowroot 2, hearthmint 1 |
| laststand_draught † | T3 | survive one killing blow (1/battle) | alchemy 50 | emberlace 1, hollowroot 2 |

Utility (7):

| id | effect | station | skill lv | inputs |
|---|---|---|---|---|
| forge_whetstone † | +2 melee atk 5 min (coating slot) | workbench | smithing 6 | quarried_stone 2, fine_sand 1 |
| pitch_torch (×4) | placeable light | hand | construction 1 | alder_log 1, pitchgum 1, coal 1 |
| coldsap_balm † | +3 armor 5 min (coating slot) | alchemy_table | alchemy 26 | coldsap 2, river_clay 1 |
| glow_vial † | portable/placeable light 5 min | alchemy_table | alchemy 30 | glowspore 2, fine_sand 2 |
| bow_rosin † | +2 ranged atk, +3% crit 5 min (coating) | workbench | woodworking 34 | duskrosin 1, pitchgum 1 |
| veil_lantern † | equip: bright light, reveals hidden R3 nodes | runestone_altar | enchanting 44 | radiant_gloamshard 1, gloamshard 2, fine_sand 2, gold_ingot 1 |
| glimmer_candy | (stats in §5) | campfire | cooking 44 | glimmergourd 1, brambleberry 3 |

Placeables (3): gourd_lantern † (light block; construction_bench, construction 30: glimmergourd 1, pitchgum 1, hewn_plank 1) · trophy_mount † (decor; construction_bench, construction 20: hewn_plank 4 + any totem 1 — 4 recipe variants, same output) · gilded_lorestone † (decor/lore; construction_bench, construction 

35: quarried_stone 4, gold_ingot 1, root_relic 1).

## 7. INTERMEDIATES (13) — smelting chain + processing

| id | station | skill lv | inputs → out qty |
|---|---|---|---|
| bronze_ingot | furnace | smithing 4 | raw_copper 1 + raw_tin 1 → 1 (no coal — T0 entry) |
| iron_ingot | furnace | smithing 14 | raw_iron 2 + coal 1 → 1 |
| steel_ingot | furnace | smithing 20 | iron_ingot 1 + coal 2 → 1 |
| gold_ingot | furnace | smithing 24 | raw_gold 2 + coal 1 → 1 (also: raw_gold 1 ← tarnished_trinket 3, furnace, smithing 16) |
| caldrite_ingot | furnace | smithing 30 | raw_caldrite 2 + coal 3 → 1 |
| pyrelith_ingot | furnace | smithing 46 | raw_pyrelith 2 + coal 4 + gloamshard 1 (flux) + clay_crucible 1 (consumed) → 1 |
| clay_crucible | furnace | smithing 40 | river_clay 4 + coal 1 → 1 |
| fired_brick † | furnace | construction 12 | river_clay 2 + coal 1 → 2 (masonry/kiln builds) |
| hewn_plank | hand | woodworking 1 / 12 / 27 | alder_log 1 → 4 · tidewillow_log 1 → 5 · rimefir_log 1 → 6 (3 recipes, one output — log overflow sink) |
| twine | hand | tailoring 1 | flax_fibre 3 → 1 (feeds ~20 recipes) |
| linen_cloth | loom_block | tailoring 3 | flax_fibre 5 → 1 |
| gloamweave_cloth | loom_block | tailoring 26 | gloamfibre 4 + twine 1 → 1 |
| bonemeal | workbench | farming 8 | bone_shards 2 → 3 (fertilizer: −25% crop growth) |

Station & storage recipes (engine ids **retained**, not counted in item budget; re-specced to new materials): workbench ← hewn_plank 4 (constr 1) · campfire ← alder_log 2 + quarried_stone 2 (constr 1) · furnace ← quarried_stone 8 + river_clay 2 (constr 2) · loom_block ← hewn_plank 5 + twine 2 (constr 3) · alchemy_table ← hewn_plank 4 + river_clay 2 (constr 3) · construction_bench ← hewn_plank 6 + quarried_stone 2 (constr 5) · anvil_block ← iron_ingot 2 + quarried_stone 4 (constr 6) · chest_block ← hewn_plank 8 (constr 4) · **runestone_altar ← quarried_stone 6 + gloamshard 2 + root_relic 1 (constr 18)** ⚑ altar bottleneck fixed per phase-1.

## 8. MATERIALS COVERAGE CHECKLIST — all 95 phase-1 items consumed

| material group | consumed by (recipe refs above) |
|---|---|
| raw_copper, raw_tin | bronze_ingot |
| coal | all smelts, hearthspark_staff, pitch_torch, fired_brick, crucible (+campfire fuel mechanic) |
| raw_iron / raw_gold / raw_caldrite / raw_pyrelith | iron/gold/caldrite/pyrelith ingots |
| gloamshard | pyrelith flux, lanternglow+gloamcaller staves, wildheart_charm, veil_lantern, runestone_altar recipe |
| radiant_gloamshard | rune_of_the_veil, both T3 amulets, veil_lantern |
| quarried_stone | stonebit tools ×4, whetstone, furnace/campfire/bench/altar, gilded_lorestone |
| river_clay | ALL 13 potions (flask), fired_brick, clay_crucible, coldsap_balm, alchemy_table |
| fine_sand | gem cutting ×2 (phase-1), whetstone, glow_vial, veil_lantern (glass), gold_ring/amulet (cast mold) |
| packed_earth | placeable + farm terracing (declared sink, phase-1) |
| 4 geodes | cutting recipes (ench 5/18/32/46) |
| 5 gems + 5 flawless | signets ×5, runes ×4, staves (veilstar), amulets (flawless veilstar/jade), fortune_tonic (amber), rune_of_the_veil (any flawless ×5 variants) |
| alder_log | planks, cudgel, shortbow, hearthspark, rod, torch, bonepoint/steelpoint arrows, tool handles, campfire |
| tidewillow_log / withy_cane | recurve, scepter, deepcast_rod, planks / recurve, warbow, rod |
| rimefir_log | warbow, warspear, caldrite_arrow, planks, t4-5 tool hafts, bulwark |
| duskbough_log | duskbough_recurve, greatsword grip, gloamcaller |
| lanternwood_log | lanternglow, gloamcaller, pyrepoint_arrow |
| pitchgum / coldsap / duskrosin / glowpith | arrows+torch+venom_oil+runes / glazed_icechar+balm / T3 bow+rosin / staves+runes+veilsight-adjacent |
| 5 saplings | plantable (farming 5/15/28/42/50, phase-1 mechanic) |
| 13 herbs/forage | potions §6, foods §5, twine/linen (flax), gloamweave (gloamfibre), scepter (marshbell), staff (coal…), glimmer_candy (brambleberry) |
| 8 fish | 8 dedicated dishes + taming treats |
| drowned_coffer / bait_grubs | use-open / cast-consume + treats |
| 4 hides | armor lines T0-3, weapon grips, targe, quiver |
| beast_sinew / ironsinew | bows T0-2, longsword, spade / T3 bow, bulwark, pyrewarden_plate |
| 4 totems | Beastlore study (phase-1), wildheart_charm (horn), trophy_mount (any) |
| lean_cut / prime_cut / venom_gland / featherbarb | skewer+stew+treats / platter+treats / antivenom+venom_oil / arrows ×4 + rune quills |
| 4 relics | runes ×4, altar recipe (root), lorestone, scholar quests |
| tarnished_trinket / bone_shards | gold smelt / arrows, bonemeal, armor needles, stoneskin |
| 5 crops + 5 seeds | foods §5 (all 5 crops), gourd_lantern, glimmer_candy, mireroot=animal feed / plantable |

**Verdict: 95/95 have ≥1 recipe sink; all 127 phase-2 items have ≥1 source (craftable) and ≥1 sink (equip/consume/place/apply + vendor).**

## 9. CROSS-SKILL INTERLOCK MAP

| producing skill | produces | consumed by |
|---|---|---|
| mining | ores, coal, geodes, gloamshard, stone, clay, sand | smithing (all metal), enchanting (geodes/gems), construction (stone/brick), alchemy (flasks) |
| woodcutting | 5 logs, saps, canes, glowpith, saplings | woodworking (bows/staves/tools/ammo), smithing (hafts), construction, farming (saplings), alchemy (rosin/balm) |
| foraging | herbs, flax, gloamfibre, berries, spinefruit | alchemy (all potions), tailoring (twine/cloth), cooking, woodworking (marshbell scepter) |
| fishing | 8 fish, coffers, bait | cooking (8 dishes), Beastlore (treats) |
| hunting | hides, sinews, totems, meat, glands, feathers | tailoring (all light armor), woodworking (bowstrings/fletching), cooking, enchanting (charm/quills), Beastlore (study) |
| farming | 5 crops, seeds, tree farms | cooking (breads/stews/feasts), Beastlore (feed/lures), construction (gourd_lantern) |
| archaeology | relics, trinkets, bone_shards | enchanting (runes/altar), smithing (gold), farming (bonemeal), woodworking (arrow tips) |
| smithing | ingots, tools, melee, heavy armor, shields, jewelry blanks | ALL gathering (tools), melee combat, enchanting (blanks) |
| woodworking | planks, bows, staves, rods, ammo | ranged+magic combat, fishing, construction |
| tailoring | twine, cloths, light/cloth armor, quiver | ranged/magic/gathering builds, woodworking (bow bindings) |
| cooking | buff foods | all combat + gathering (buffs), Beastlore (candy) |
| alchemy | potions, oils, waxes | all combat, gathering (fortune/luck) |
| enchanting | cut gems, signets, amulets, runes, charm, lantern | every gear line (rune slots), gathering (amber luck), Beastlore (charm) |
| construction | stations, torches, decor | every crafting skill (stations), Beastlore (trophy) |
| Beastlore | bestiary buffs, tames | consumes totems/treats/candy; custom emberveil-mob JSON drops feed hunting economy (phase-1 §5) |
| combat skills | — | consume weapons/armor/ammo/potions/foods/runes (durability + ammo + buff economy) |

## 10. BUDGET & TRIM LIST

Phase 2 = **127 items** (13 intermediates, 17 tools, 13 weapons, 4 ammo, 2 shields, 1 quiver, 27 armor, 9 jewelry, 1 charm, 4 runes, 7 utility, 3 placeables, 13 foods, 13 potions). Catalog total **222**. The 21 † items trim to **201 ≈ target**; every † cut leaves all sinks intact: pyrelith_axe, bronzehead_hoe, gold_ring+gold_amulet (signets/amulets then take gold_ingot + fine_sand directly), wardenheart_amulet, glow_vial, gilded_lorestone, trophy_mount, gourd_lantern, hunters_quiver, hearth_bread, hunters_skewer, stoneskin_tonic, fortune_tonic, laststand_draught, coldsap_balm, bow_rosin, forge_whetstone, veil_lantern, fired_brick, venom_oil (venom_gland keeps antivenom).

**Deviations from phase-1 named sinks (folded, not lost):** sand molds/gilt thread/sigil ink/bowstring/veilstring/flour = direct material inputs instead of intermediate items; vials/flasks = river_clay per potion; dream/shadow tonics, snares, baskets, red dye, planters, glowlamp, dressed stone, mulch = deferred to a decor/QoL pass (every affected material retains ≥2 other sinks); venom arrows = venom_oil coating.

## 11. CRAFTING LADDERS (no fake milestones — every level = a recipe above) + TEXTURES

smithing 4/6/8/9/10/14/16/18/20/22-28/30/32-42/46-52 · woodworking 1-6/12/16/18/20/27/28/30/32/34/36/44/46/50 · tailoring 1/3/4-9/14-18/26/28-34/44-50 · cooking 2-50 (14 steps) · alchemy 2-50 (14 steps) · enchanting 5/8/12-26/32/36/44/46/48/50 · construction 1-6/12/18/20/30/35 · farming 5/8/15/28/42/50 (saplings+bonemeal) · Beastlore 15 gate (charm) + study/tame ladder (phase-1 §5). Bands match spine T0-T3.

**Textures:** 127 item icons + 4 placeable block tiles (pitch_torch, gourd_lantern, trophy_mount, gilded_lorestone) = **131 PNGs (32×32)**; grand total with phase-1's 149 = **280 PNGs**.


# PART 3 — SKILL PATHS (22 × 1→50)

# Emberveil — 22 Skill Paths v1 (real 1→50 ladders)

Grounded in: `skills.js` (SKILL_DEFS 21 + curve `60n^2.4+80n`, gatherTimeMult, critChance), `combat.js` (ABILITIES registry, armor/(armor+30) @400, tactics hooks @140/351/619, XP splits @825-827), `combatrs.js` (styles, @276/311/330/353), `nodes.js:179-189` (rollNodeDrops luck), `main.js:1049/1169`, `blocks.js:22/103`, `enemies.js` (def.xp/tier/drops), `items.js`, `mobloader.js`. All milestones reference phase-1 materials catalog (§ refs = that doc) or phase-2 gear catalog, or are tagged **[mech]** = named engine mechanic to implement (each appears in checklist E). **No entry lacks a backing ref.** Continuous per-level formulas (gather speed, crit, +2 HP/lvl, initiative) are listed once per skill as `cont:` — they are formulas, not milestones. Levels 51-99: formulas continue, zero content claimed (honest cap; T3 band 40-60 is paced by XP, not new unlocks, except smithing 52).

Legend: **needs** = cross-skill input to use the unlock · **feeds** = what it enables elsewhere. Tool tiers 1-5 = crude/bronze/steel/caldrite/pyrelith.

## A. GATHERING SKILLS (7)

### mining — cont: gatherTimeMult, critChance (double ore), +2% crit/ring
| lv | unlock | needs | feeds |
|---|---|---|---|
| 1 | vein_copper, vein_tin, clay_bed (pick 1 / shovel 1) | crude tools (workbench, smithing-free) | bronze_ingot chain; river_clay → flasks/brick/crucible |
| 5 | seam_coal | pick 1 | ALL smelts, kiln, torches, campfire fuel |
| 12 | vein_iron | pick 2 (smithing 6) | iron/steel lines; anvil recipe |
| 20 | **[mech] Prospector's Sense**: ore nodes within 48 blocks ping on compass | — | QoL; supports far-ring geode hunting |
| 22 | lode_gold (geode chance ×1.5) | pick 2 | jewelry line (ench 26), gilt thread, lorestone |
| 30 | vein_caldrite | pick 3 (smithing 22) | T2 gear + tier-4 tools |
| 36 | **[mech] Sparing Swing**: 10% chance node charge not consumed | — | throughput on 1-3-charge R2/R3 nodes |
| 42 | cluster_gloamshard | pick 4 (smithing 32-38) | pyrelith flux, staves, altar, charms; radiant 6% |
| 48 | lode_pyrelith | pick 4 | endgame smithing (smithing 46+) |

### woodcutting — cont: gatherTimeMult, crit double logs
| lv | unlock | needs | feeds |
|---|---|---|---|
| 1 | tree_alder (axe 1) | — | planks, cudgel, shortbow, hearthspark_staff, arrows, stations; pitchgum/sapling 4% |
| 10 | tree_tidewillow (axe 2) | smithing 6 | T1 bows, rods; withy_cane |
| 25 | tree_rimefir (axe 3) | smithing 22 | warbow, warspear, t4-5 hafts, bulwark; coldsap |
| 30 | **[mech] Careful Felling**: sapling drop chance ×1.5 | — | farming tree plots (renewable wood) |
| 40 | tree_duskbough (axe 4) | smithing 32-38 | T3 recurve, greatsword grip, gloamcaller; duskrosin |
| 50 | tree_lanternwood (axe 4) | smithing 32-38 | T2-3 staves (magic parity), pyrepoint_arrow; glowpith 12% |

### fishing — cont: gatherTimeMult; all rare % ×(1+luck)
| lv | unlock | needs | feeds |
|---|---|---|---|
| 1 | fishing_shallows; brookperch | rod 1 (woodworking 4) | cooking 2 (heal dish); taming treats |
| 4 | **[mech] Bait Pouch**: bait_grubs auto-consumed on cast (+0.5 luck) | bait (clay_bed/bramble/game_trail rares) | coffer/rare-catch rate |
| 6 | mosscarp | — | cooking 8 (gather-speed dish) |
| 12 | saltdarter (r≥1) | travel R1 | cooking 14 (evasion) |
| 18 | bogpike (r≥1) | — | cooking 18 (attack) |
| 28 | stonebass (r≥2) | — | cooking 28 (defense) |
| 33 | icechar (r≥2) | — | cooking 33 glazed_icechar (frost-res+HP) |
| 35 | deepwater_run (rod 3, r≥2); coffer 4% | rod 3 (woodworking 20) | ring-scaled coffer loot incl. geodes/flawless 1% |
| 40 | emberkoi (r3, volcanic springs) | — | cooking 40 (fire-res+attack) |
| 48 | gloameel (r3, corrupted waters) | — | cooking 48 (mana+magic); Beastlore aquatic treats |

### foraging — cont: gatherTimeMult, crit double
| lv | unlock | needs | feeds |
|---|---|---|---|
| 1 | herb_thicket (hearthmint, woundwort); berry_bramble | — | alchemy 2/6; brambleberry food/dye; bait 10% |
| 3 | flax_stand | — | twine (tailoring 1) → ~20 recipes; linen; bowstrings |
| 10 | marshbell (thicket entry, r≥1) | — | mana tonic (alch 10); scepter (ww 18) |
| 14 | stonecress (r≥1) | — | antivenom (alch 14), defense tonic (18) |
| 20 | spinebloom_cactus (r2) | — | spinefruit foods, sunquench |
| 25 | gloomcap_hollow (frostcap) | — | alch 33; glowspore 5% → enchant reagents |
| 27 | cinderbloom (r≥2) | — | alch 26/28 (T2 combat tonics) |
| 30 | gloamflax_stand (r≥2) | — | gloamweave_cloth (tailoring 26) → T2-3 cloth |
| 42 | emberlace (r3) | — | laststand_draught (alch 48) |
| 45 | hollowroot (r3, gloomcap entry) | — | greater heal / veilsight (alch 44/46) |

### hunting — cont: **[mech] part-roll** `20% + 1.5%×lv` (cap 80%) bonus part per beast kill
| lv | unlock | needs | feeds |
|---|---|---|---|
| 1 | game_trail node; T0 part economy (ragged_pelt, lean_cut, featherbarb) | any weapon | tailoring T0 light, fletching, cooking 12 |
| 10 | beast_sinew from game_trail; **[mech] double-hide crits** | — | bowstrings T0-2, haft bindings |
| 16 | **[mech] Tracking**: game_trail nodes ping on compass 60 blocks | — | totem farming (3% node rare) |
| 25 | **[mech] totem drop chance ×2** (6%→12%) | — | Beastlore study economy, wildheart_charm |
| 30 | prime_cut from game_trail (r≥2 entry) | travel R2 | cooking 44 platter; large-beast treats |
| 40 | **[mech] prime_cut drops from T1 beasts** | — | smooths T2→T3 food economy |
| 46 | **[mech] Clean Kill**: +15% part roll if you took no damage in the fight | — | rewards skilled play; shadehide/ironsinew supply |

### farming — cont: crop yield crit
| lv | unlock | needs | feeds |
|---|---|---|---|
| 1 | tilled_loam (hoe 1) + hearthwheat | hoe, seeds (grass/vendor) | flour → hearth_bread/ale (cooking 5) |
| 5 | plant alder_sapling (grows to tree_alder node, 20 min) | wc rare drop | renewable alder |
| 6 | sweetbulb | R0-1 seeds | aromatics (all savory cooking) |
| 8 | bonemeal (workbench: bone_shards 2→3; −25% growth) | archaeology bone_shards | all crop/tree plots |
| 15 | mireroot + plant tidewillow_sapling | R1 wetland seeds | stews (cooking 22), animal feed (Beastlore) |
| 28 | sunmelon + plant rimefir_sapling | R2 seeds (kiln_ruin rare) | stamina refresher (cooking 36) |
| 42 | glimmergourd + plant duskbough_sapling | R3 seeds (veilgrave rare) | mana feast (cooking 50), gourd_lantern, glimmer_candy |
| 50 | plant lanternwood_sapling (60 min) | wc 50 rare 10% | renewable lanternwood → staves/T3 arrows |

### archaeology — cont: gatherTimeMult
| lv | unlock | needs | feeds |
|---|---|---|---|
| 1 | surface_cairn (shovel 1): root_relic, bone_shards | — | tier-1 runes (ench 12), altar recipe, bonemeal |
| 10 | **[mech] Surveying**: dig sites revealed on minimap 60 blocks | — | dig-route play |
| 15 | sunken_barrow (shovel 2): forge_relic, trinkets ×2 | smithing 6 shovel | tier-2 runes (ench 22); trinket→gold smelt (smithing 16) |
| 30 | kiln_ruin (shovel 3): storm_relic | smithing 22 | tier-3 runes (ench 36) |
| 38 | **[mech] Delicate Hands**: geode rare at digs ×1.5 | — | secondary gem source |
| 45 | veilgrave (shovel 4): veil_relic; starlit_geode 3%, radiant 2% | smithing 32-38 | capstone runes (ench 48), T3 dungeon key |

## B. CRAFTING SKILLS (8)

### smithing (furnace/anvil)
| lv | unlock | needs | feeds |
|---|---|---|---|
| 4 | bronze_ingot (copper+tin, no coal) | mining 1 | all bronze recipes |
| 6 | bronze tool set: pick/axe/shovel/hoe tier-2 | alder handles (ww 1) | mining 12+, wc 10, farming |
| 8 | bronze melee arms + targe (hide shield) | ragged_pelt (hunting) | melee T0; defense 1 equip |
| 9-11 | bronze heavy set (3 pc) | hide padding | defense-build T0 |
| 10 | whetstone (quarried_stone + fine_sand; consumable +melee dmg) | mining | melee buff economy |
| 14 | iron_ingot (coal ×1) | mining 5/12 | iron arms, nails/fittings |
| 16 | tarnished_trinket ×3 → raw_gold | archaeology | jewelry supply (no vendor-trash) |
| 18 | iron melee arms + iron heavy set start | — | melee/heavy T1 |
| 20 | steel_ingot (iron+coal ×2) | — | steel tools, steelpoint_arrow heads |
| 22 | steel tool set tier-3 | rimefir hafts later; alder ok | mining 30, wc 25, fishing 35 rod fittings |
| 24 | gold_ingot | lode_gold (mining 22) | ring/amulet blanks, gilt thread |
| 26 | gold_ring + gold_amulet blanks (fine_sand cast) | mining sand | enchanting 8/26 socketing |
| 28 | steel arms; iron→steel heavy completion | — | melee T1 top |
| 30 | caldrite_ingot (coal ×3) | mining 30 | T2 lines |
| 32-38 | caldrite tool set tier-4; T2 melee arms; caldrite heavy set | rimefir hafts (wc 25), direhide padding | mining 42/48, wc 40/50, arch 45; melee/def T2 |
| 40 | clay_crucible | river_clay | pyrelith smelt |
| 42 | forge_whetstone (T2+ sharpening) | — | melee buff T2-3 |
| 46 | pyrelith_ingot (coal ×4 + gloamshard flux + crucible) | mining 42/48 | T3 everything |
| 48 | pyrelith tool set tier-5 (speed only — stated honestly) | — | max gather speed |
| 50 | T3 melee (greatsword: duskbough grip, ironsinew) | wc 40, hunting | strength 40 equip |
| 52 | pyrewarden_plate (heavy T3, ironsinew) | hunting elites | defense 40 equip |

### woodworking (workbench)
| lv | unlock | needs | feeds |
|---|---|---|---|
| 1 | hewn_plank (alder 1→4); tool handles | wc 1 | ALL stations, every tool craft |
| 2 | cudgel (T0 melee) | twine (tailoring 1) | strength 1 |
| 3 | shortbow (flax bowstring + beast_sinew) | foraging 3, hunting | ranged 1 |
| 4 | alder fishing rod (rod 1) | twine | fishing 1 |
| 5 | hearthspark_staff (alder + coal) | mining 5 | magic 1 (T0 staff) |
| 6 | bonepoint_arrow (bone_shards + featherbarb + pitchgum) | archaeology, hunting | ammo T0 |
| 12 | tidewillow planks (1→5) | wc 10 | T1 builds |
| 16 | tidewillow recurve (withy lamination, sinew string) | wc 10 rares | ranged 10 |
| 18 | marshbell scepter (T1 caster) | foraging 10 | magic 12 |
| 20 | deepcast_rod (rod 3, withy_cane) + steelpoint_arrow | smithing 20 heads | fishing 35; ammo T1 |
| 27 | rimefir planks (1→6) | wc 25 | log overflow sink |
| 28 | warbow (rimefir) | ironsinew (hunting T2) | ranged 25 |
| 30 | warspear (rimefir shaft + caldrite head) | smithing 30 | strength 25 alt |
| 32 | caldrite_arrow (rimefir shaft) | smithing 30 heads | ammo T2 |
| 34 | tier-4/5 tool hafts (rimefir) | — | smithing 32-38/48 tools |
| 36 | lanternglow staff (lanternwood + glowpith + gloamshard) | wc 50 or R2 fringe trees | magic 28 (T2 — magic un-starved) |
| 44 | duskbough_recurve (duskrosin lamination, ironsinew/veilstring) | wc 40, gloamfibre | ranged 40 |
| 46 | gloamcaller staff (duskbough + gloamshard + veilstar) | ench-cut veilstar | magic 44 (T3) |
| 50 | pyrepoint_arrow (lanternwood shaft) | smithing 46 heads | ammo T3 |

### tailoring (loom)
| lv | unlock | needs | feeds |
|---|---|---|---|
| 1 | twine (flax ×3) | foraging 3 | ~20 recipes across 5 skills |
| 3 | linen_cloth | flax | cloth T0 |
| 4-6 | linen cloth set (3 pc) | — | magic-build T0 |
| 7-9 | ragged_pelt light set (3 pc; bone needles) | hunting 1, arch bone_shards | ranged/gather builds T0 |
| 14-16 | sturdy_hide light set (3 pc) | hunting T1 kills | light T1 |
| 18 | hunters_quiver (sturdy_hide) | — | ranged 20 quiver perk |
| 26 | gloamweave_cloth (gloamfibre + twine) | foraging 30 | cloth T2-3 base |
| 28-31 | direhide light set (3 pc) | hunting T2 | light T2 |
| 32-34 | gloamweave cloth set (3 pc) | — | magic T2 |
| 44-47 | shadehide light set (3 pc) | hunting T3 | light T3 |
| 48-50 | T3 cloth set (gloamweave + gold gilt thread) | smithing 24 gold | magic T3 |

### cooking (campfire) — every dish = buff-food, not just heal
| lv | dish | needs | buff |
|---|---|---|---|
| 2 | roast brookperch | fishing 1 | heal |
| 5 | hearth_bread (hearthwheat flour) | farming 1 | +max stamina |
| 8 | mosscarp dish | fishing 6 | gather speed |
| 12 | hunters_skewer (lean_cut + sweetbulb) | hunting, farming 6 | +melee |
| 14 | saltdarter dish | fishing 12 | evasion |
| 18 | bogpike dish | fishing 18 | +attack |
| 22 | mireroot stew (T1 feast) | farming 15 | +HP regen; also animal feed |
| 28 | stonebass dish | fishing 28 | +defense |
| 33 | glazed_icechar (coldsap) | fishing 33, wc 25 rare | frost-res + HP |
| 36 | sunmelon refresher / candied spinefruit | farming 28, foraging 20 | stamina burst |
| 40 | emberkoi dish | fishing 40 | fire-res + attack |
| 44 | prime platter (prime_cut) | hunting 30 | party feast (all +) |
| 48 | gloameel dish | fishing 48 | mana + magic |
| 50 | glimmergourd mana feast + glimmer_candy | farming 42 | mana regen; candy = Beastlore lure |

### alchemy (alchemy table) — every potion consumes river_clay flask (mining sink)
| lv | unlock | needs | feeds |
|---|---|---|---|
| 2 | minor heal tonic (hearthmint) | foraging 1 | early survival |
| 6 | woundwort salve | foraging 1 | healing 8 field dressing |
| 10 | mana tonic (marshbell) | foraging 10 | magic sustain T1 |
| 14 | antivenom (stonecress + venom_gland) | hunting poisoners | T1+ serpent zones |
| 18 | defense tonic (stonecress) | — | combat buff |
| 22 | stoneskin_tonic (bone_shards) | archaeology | +armor burst |
| 26 | fire-resist tonic (cinderbloom) | foraging 27 | volcanic_wastes access |
| 28 | attack tonic T2 (cinderbloom) | — | combat T2 |
| 33 | greater mana + frost-resist (frostcap) | foraging 25 | tundra/magic T2 |
| 36 | fortune_tonic (foxfire_amber) | enchanting cuts | +0.5 gather luck 10 min |
| 38 | venom_oil (venom_gland) | hunting | weapon/arrow coating |
| 42 | coldsap_balm (armor wax) | wc 25 rare | durability economy |
| 44 | greater heal tonic (hollowroot) | foraging 45 | T3 survival |
| 46 | veilsight tonic (hollowroot + glowspore) | foraging 25 rare | corrupted_wilds vision |
| 48 | laststand_draught (emberlace) | foraging 42 | T3 boss fights |

### enchanting (runestone_altar — craftable at construction 18)
| lv | unlock | needs | feeds |
|---|---|---|---|
| 5 | cut mossy_geode (+fine_sand ×2) | mining rares R0 | 5 gem types, flawless 2% |
| 8 | socket signets (gem + gold_ring blank) | smithing 26 | stat rings all builds |
| 12 | tier-1 rune (root_relic + gem + featherbarb quill) | archaeology 1, hunting | weapon/armor imbue T0-1 |
| 15 | wildheart_charm (totem_horn + gloamshard; **requires Beastlore 15**) | hunting totems | taming success +15% |
| 18 | cut banded_geode | R1 mining | flawless 5% |
| 22 | tier-2 rune (forge_relic) | archaeology 15 | imbue T1-2 |
| 26 | socket amulets (gold_amulet blank) | smithing 26 | amulet line |
| 32 | cut glassy_geode | R2 mining | flawless 9% |
| 36 | tier-3 rune (storm_relic) | archaeology 30 | imbue T2-3 |
| 44 | veil_lantern (radiant_gloamshard + fine_sand glass) | mining 42 rare | utility light, corrupted zones |
| 46 | cut starlit_geode | R3 mining | veilstar 25%, flawless 14% |
| 48 | capstone rune (veil_relic) | archaeology 45 | T3 imbues, dungeon key part |
| 50 | rune_of_the_veil (any flawless gem + radiant_gloamshard) | flawless cuts | best-in-slot enchant |

### construction (construction bench; stations use retained engine ids)
| lv | unlock | needs | feeds |
|---|---|---|---|
| 1 | workbench (planks 4) + campfire (alder+stone) | ww 1 | everything; cooking |
| 2 | furnace (stone 8 + clay 2) + pitch_torch (pitchgum) | mining | smithing; light |
| 3 | loom (planks+twine) + alchemy_table (planks+clay) | tailoring 1 | tailoring; alchemy |
| 4 | chest (planks 8) | — | storage |
| 5 | construction_bench | — | self-hosting |
| 6 | anvil (iron_ingot 2 + stone 4) | smithing 14 | smithing arms |
| 12 | fired_brick (clay+coal, 2×) + masonry blocks | — | base building |
| 18 | **runestone_altar** (stone 6 + gloamshard 2 + root_relic 1) | mining 42*, arch 1 (*or trade/coffer gloamshard) | entire enchanting skill |
| 20 | gourd_lantern | farming 42 | decor light |
| 30 | trophy_mount (any totem) | hunting | totem display sink |
| 35 | gilded_lorestone (stone 4 + gold_ingot + root_relic) | smithing 24 | lore decor, quest turn-in |

## C. COMBAT SKILLS (7)
Equip gates = **[mech] items.js `equipReq:{skill,lv}`**, enforced on equip. Gear tiers gate at band starts: T0=1, T1=10, T2=25, T3=40. All abilities live in the `ABILITIES` registry (combat.js) with RS-mode equivalents in combatrs.js specials.

### vitality — cont: +2 maxHP/lvl (combat.js:103; hoist to shared playerStats for both modes)
| lv | unlock | needs | feeds |
|---|---|---|---|
| 10 | **[mech] Hardy**: out-of-combat regen +0.5 hp/s | — | fewer food interrupts |
| 25 | **[mech] Second Wind**: survive one killing blow per battle (both modes) | — | T2 danger rings viable |
| 40 | **[mech] Stoutheart**: buff-food durations +25% | cooking dishes | food economy sink |
| 50 | **[mech] Emberheart**: +25 flat maxHP | — | T3 boss checks |

### strength — cont: melee dmg scaling (existing)
| lv | unlock | needs | feeds |
|---|---|---|---|
| 1 | equip T0 melee (cudgel, bronze arms) | ww 2 / smithing 8 | melee play |
| 5 | **[mech] ability `crush_swing`**: 1.5× hit, cd 3 | — | burst |
| 10 | equip T1 melee (iron/steel) | smithing 18/28 | — |
| 15 | **[mech] ability `cleave_arc`**: hit 3-tile arc (grid) / adjacent splash (RS) | — | pack clearing |
| 25 | equip T2 melee (caldrite, warspear) | smithing 32-38 / ww 30 | — |
| 30 | **[mech] ability `sunder`**: applies armor-shred status | — | counters armored T2-3 mobs |
| 40 | equip T3 melee (pyrelith greatsword) | smithing 50 | endgame melee |
| 45 | **[mech] `rampart_breaker`**: +50% dmg vs guarding/shielded targets | — | PvE variety |

### defense — cont: **[mech] +0.25 flat armor/lvl in BOTH modes** (combat.js:400, combatrs.js:276/330) + existing evasion @combatrs:311
| lv | unlock | needs | feeds |
|---|---|---|---|
| 1 | equip T0 heavy + targe | smithing 8-11 | tank play |
| 5 | **[mech] guard improves**: block 50%→60% (scales +0.5%/lvl to 80%) | — | defensive style value (RS) |
| 10 | equip T1 heavy | smithing 18/28 | — |
| 15 | **[mech] ability `shield_bash`**: dmg + 1-turn stun (needs shield) | shield equipped | control |
| 20 | **[mech] Bulwark stance**: guarding also shields adjacent ally/companion (grid) | — | tames/party synergy |
| 25 | equip T2 heavy + bulwark shield (rimefir + ironsinew) | smithing 32-38, ww/hunting | — |
| 35 | **[mech] Retaliation**: thorns 15% of blocked dmg while guarding | — | guard payoff |
| 40 | equip T3 heavy (pyrewarden_plate) | smithing 52 | endgame tank |
| 45 | **[mech] Immovable**: 50% resist to slow/stun/knockback | — | T3 caster mobs |

### ranged — cont: accuracy scaling; **[mech] ammo system** (arrows consumed per shot, 30% recovery, quiver slot)
| lv | unlock | needs | feeds |
|---|---|---|---|
| 1 | equip shortbow; bonepoint_arrow | ww 3/6 | ranged play from lv1 (parity fix) |
| 5 | **[mech] ability `aimed_shot`**: +acc +crit, cd 2 | — | single-target |
| 10 | equip tidewillow recurve; steelpoint_arrow | ww 16/20 | — |
| 15 | **[mech] ability `pinning_shot`**: dmg + slow status | — | kiting |
| 20 | **[mech] quiver perk**: hunters_quiver = 20% chance no ammo consumed | tailoring 18 | ammo economy |
| 25 | equip warbow; caldrite_arrow | ww 28/32 | — |
| 30 | **[mech] ability `split_volley`**: hit 2 targets | — | AoE parity |
| 38 | **[mech] venom coating**: apply venom_oil to arrows (poison status) | alchemy 38 | hunter build |
| 40 | equip duskbough_recurve; pyrepoint_arrow | ww 44/50 | endgame ranged |
| 45 | **[mech] Deadeye**: guaranteed crit if you didn't move last turn (grid) / after 3s still (RS) | — | skill expression |

### magic — cont: maxMana = 20 + magic lvl (combat.js:106); **[mech] staves carry `spellPower` multiplier** (parity fix)
| lv | unlock | needs | feeds |
|---|---|---|---|
| 1 | `spark` (Emberbolt, retained); equip hearthspark_staff | ww 5 | caster viable lv1 |
| 5 | `frost_bind` (retained) | — | control |
| 10 | `ember_burst` (retained AoE) | — | packs |
| 12 | equip marshbell scepter (T1) | ww 18 | — |
| 20 | **[mech] spell `cinder_lance`**: piercing fire line, mana 12 | — | T1-2 single target |
| 28 | equip lanternglow staff (T2) | ww 36 | magic un-starved at T2 |
| 30 | **[mech] spell `hailrend`**: AoE ice + slow, mana 16 | — | T2 AoE |
| 40 | **[mech] spell `veilrend`**: shadow bolt, ignores 50% armor, mana 20 | — | anti-armor |
| 44 | equip gloamcaller staff (T3) | ww 46 | endgame caster |
| 48 | **[mech] spell `starfall`**: capstone AoE, mana 30, cd 5 | — | T3 packs/boss adds |

### healing — cont: heal amounts scale with level (existing)
| lv | unlock | needs | feeds |
|---|---|---|---|
| 1 | `mend` (retained) | mana | sustain |
| 8 | **[mech] Field Dressing**: salves usable instantly in combat (1 action, no mana) | alchemy 6 | non-caster sustain |
| 15 | `rally` (retained: heal + atkUp) | — | offense hybrid |
| 25 | **[mech] `cleanse`**: remove poison/slow/burn | — | venom/caster zones |
| 35 | **[mech] `radiant_mending`**: AoE heal self+companions/allies | Beastlore tames | party/tame play |
| 45 | **[mech] `guardian_light`**: aura, 20% of ally dmg redirected to caster | — | endgame support |

### tactics — cont: initiative +0.15/lvl (combat.js:140), crit +0.1/lvl (:351); **RS-mode value fix: [mech] +0.2% accuracy/lvl in combatrs** (currently XP-only @353)
| lv | unlock | needs | feeds |
|---|---|---|---|
| 1 | Inspect: enemy stats & intent (retained @619-625) | — | information play |
| 10 | **[mech] Inspect+**: shows drop table, weaknesses, tier | — | Beastlore/hunting targeting |
| 15 | **[mech] Ambush**: initiating combat grants first-strike bonus (both modes) | — | exploration aggression |
| 20 | **[mech] Flanking**: +15% dmg when ally/companion adjacent to target (grid) | Beastlore tame or NPC | positioning game |
| 25 | **[mech] Weak-point proc (RS)**: 10% chance +50% hit, scales +0.2%/lvl | — | RS parity |
| 30 | **[mech] Read the Field**: enemy next action telegraphed (grid) | — | counterplay |
| 40 | **[mech] Foresight**: reroll initiative 1/battle (grid) / auto-evade next heavy hit (RS) | — | boss fights |
| 45 | **[mech] Beast Tactics**: +5% dmg vs families you've fully studied | Beastlore studies | cross-skill capstone |

## D. BEASTLORE — FULL SPEC (skill #22)

**Registration:** `SKILL_DEFS.beastlore = { label: 'Beastlore', group: 'Gathering', desc: 'Discover, study and tame the creatures of the veil.' }` (skills.js). New module `js/game/bestiary.js`.

**XP sources** (supersedes phase-1 §5 placeholder values — retuned to the engine curve, see §F):
| action | XP | notes |
|---|---|---|
| discover species | 350×(tier+1)² | first kill OR observe within 6 blocks for 4s (once/species) |
| study totem | 200×(tier+1)² | consumes matching totem (fang/horn/skull/heart = T0/1/2/3) at bestiary UI; cap 5 studies/species |
| tame attempt | 60×(tier+1) | consumes treat, success or fail |
| tame success | 500×(tier+1)² | once per active tame |
| companion assist | 20% of kill XP → beastlore | tame participates in kill |

**Ladder:**
| lv | unlock | needs | feeds |
|---|---|---|---|
| 1 | Bestiary UI + discovery XP | — | collection loop |
| 5 | Tame slot 1; tame T0 (treats: bait_grubs, lean_cut) | fishing/hunting treats | companion combat |
| 10 | Study unlock (consume totems) | hunting totem drops | totem sink; family perks |
| 15 | wildheart_charm craft gate | enchanting 15 | +15% tame success |
| 18 | tame T1 (treats: lean_cut, mireroot feed) | farming 15 | — |
| 20 | Tame slot 2 | — | duo companions |
| 25 | aquatic tames (treats: raw fish) | fishing | water content |
| 32 | tame T2 (treats: prime_cut) | hunting 30 | — |
| 38 | lure magical mobs (glimmer_candy) | cooking 50 / farming 42 | rare species access |
| 40 | Tame slot 3 | — | — |
| 46 | tame T3 non-boss (treats: prime_cut + glimmer_candy) | — | endgame companions |
| 50 | **[mech] Veilbond**: studied-family perks doubled; totem_heart study grants +0.1 permanent gather luck (once) | totem_heart | luck capstone |

**Family perks** (per fully-studied family = 5 studies): +5% part-roll vs family, +10% tame success, tactics 45 synergy. Families: beast, bird, serpent, caster, undead, construct — declared in def or inferred from drops template.

**Bestiary data model** (persisted in save.js):
```js
bestiary: { [speciesId]: { discovered: ts, kills: n, studies: 0-5, tamedEver: bool, source: 'builtin'|'custom:<manifestId>' } }
tames: [{ speciesId, name, level, xp, slot }]   // companion stats = 60% of def stats × (1 + BL_lvl×0.01)
```
Species record derived at boot from `ENEMY_DEFS` (enemies.js) + mobloader manifests: `{ id, label, tier, family, biomes, drops }`.

**Custom-mob auto-enrollment (emberveil-mob JSON):** mobloader.js on manifest load → `bestiary.registerSpecies(def)`. `stats.tier` selects the phase-1 §5 drop template (hide/sinew/meat/totem family) as the documented recommended `drops` block; loader **warns on unknown item ids** in drops; custom species get discovery/study/tame identically and count toward their tier bracket (completion perks use percentage, not absolute counts, so custom content never breaks completion).

## E. ENGINE FIX CHECKLIST (audit-driven; every [mech] above rolls up here)

1. **Tool minTier enforced (single gate):** `canHarvest(defOrBlock, tool)` in nodes.js reading declared `tool`+`minTier` (§2 values); call in main.js gather path (~:1169) AND block-break path (~:1049). Strip per-block minTier from blocks.js old ore rows (replaced anyway); blocks.js:22 field kept only as passthrough to the same helper.
2. **Real milestone registry (kills fake milestones):** delete static `SKILL_UNLOCKS` strings (skills.js:32-104). Build `MILESTONES[skill]` at boot from: CRAFT_RECIPES (crafting.js `lv`), NODE_TYPES (nodes.js `level` + entry `level/ring`), ABILITIES/SPELLS (combat.js `req`), `equipReq` (items.js), sapling/crop defs, Beastlore table. Each entry `{lv, label, ref}`; dev-mode assert: **no entry without a resolvable ref**. UI reads registry.
3. **Defense/vitality payoff BOTH modes:** keep `armor/(armor+30)` but respec gear totals — heavy T3 ≈ 60 armor (67% DR), light ≈ 35 (54%), cloth ≈ 18 (37%) vs old cap ~18; + flat +0.25 armor/defense lvl added in combat.js:400 AND combatrs.js:276/330. Hoist shared `playerStats()` (HP/mana/armor derivation, currently combat.js:103-116) so combatrs uses identical numbers.
4. **Tactics value in RS mode:** combatrs.js — +0.2% accuracy/lvl, weak-point proc (tactics 25), Ambush (15), Foresight auto-evade (40). Currently tactics only receives XP (@353) and grants nothing in RS.
5. **Ranged/magic parity:** ammo system (items type:'ammo', quiver equip slot, consume per shot, 30% ground recovery, quiver perk); staves as weapons with `spellPower`; 4 arrow tiers + 4 staff tiers + T2/T3 spells (`cinder_lance`, `hailrend`, `veilrend`, `starfall`) close the audit's starvation gap; ranged/magic weapon exists at every tier (ww 3/16/28/44 bows, 5/18/36/46 staves).
6. **Luck + ring plumbing:** `rollNodeDrops(def, level, rand, luck=0, ring=0)`; eligibility `(!d.level || lvl>=d.level) && (!d.ring || (ring)>=d.ring)`; stamp `node.ring = worldgen.tierAt(x,z)` at spawn; `RING_LUCK=[0,.30,.60,1.00]`, total luck cap 2.0; crit +2%/ring; main.js:1169 passes real luck (currently hardcoded `crit?0.5:0`).
7. **Geode-by-ring injection:** every ore node def gets rare `{item: GEODE_BY_RING[node.ring], chance: .025}` (gold ×1.5) — no gem nodes ever.
8. **Equip gates:** items.js `equipReq:{skill,lv}` checked in inventory equip path — replaces the old declared-but-unenforced pattern.
9. **Dead-end/top-tier fix verification:** pyrelith_ingot has 4+ consumer recipes (smithing 48-52, ww 50 heads); no bar without gear line (no embersteel repeat).
10. **Ghost-drop fix:** blocks.js:103 nightglass and all terrain remaps drop registered new ids or null (§7 terrain table).
11. **Beastlore:** SKILL_DEFS entry, bestiary.js, mobloader enrollment + drops-id validation, save.js persistence, companion AI hooks (pathfind.js reuse).
12. **Saplings plantable:** farming plant path accepts sapling items on tilled/soil → timer → spawns the tree NODE_TYPE (renewable lanternwood).
13. **XP retune:** enemies.js `xp` per tier (table §F); node XP granted as `def.xp × BAND_XP_TUNE[ring]`; crafting XP rule §F.
14. **Milestone abilities implemented:** ABILITIES additions (crush_swing, cleave_arc, sunder, rampart_breaker, aimed_shot, pinning_shot, split_volley, shield_bash, cleanse, radiant_mending, guardian_light, 4 spells) + RS specials; Second Wind/Stoutheart/Hardy passives in shared stats layer.

## F. XP ECONOMY SANITY

Curve (unchanged, skills.js:107): cumulative lv15≈34.9k, lv25≈125k, lv30≈196k, lv40≈398k, lv45≈531k, lv50≈686k, lv60≈1,073k. Band deltas: T0(1→15)=35k, T1(10→30)=184k, T2(25→45)=406k, T3(40→60)=675k.

Raw catalog gather rates (~70% uptime, gather+travel): R0≈8k/hr, R1≈17k/hr, R2≈33k/hr, R3≈52k/hr → bands of 4.4/10.8/12.3/13h (back-loaded). **Tune: `BAND_XP_TUNE = [1.0, 1.45, 1.65, 1.8]`** applied at XP grant (nodes keep catalog values):

| band | gather xp/hr (tuned) | craft xp/hr | combat primary xp/hr | band XP | hrs/band (focused) |
|---|---|---|---|---|---|
| T0 (1-15) | ~8k | ~7k | ~7k | 35k | ~4.5 |
| T1 (10-30) | ~25k | ~22k | ~21k | 184k | ~7.5 |
| T2 (25-45) | ~55k | ~48k | ~46k | 406k | ~7.5 |
| T3 (40-60) | ~95k | ~80k | ~85k | 675k | ~7-8 |

- **Crafting XP rule:** `craftXp = 0.6 × Σ(gatherXp of consumed inputs)`, min 10 — self-balancing; a gather→craft loop yields ~1.6× gather-only XP split across two skills, so crafters never out- or under-pace gatherers.
- **Combat kill XP (enemies.js retune):** T0=100, T1=300, T2=700, T3=1250 base; elite ×2, boss ×6. At 55-70 kills/hr → primary-style rates above; combat.js:825-827 splits (vitality 0.2, defense 0.15, tactics 0.15 of total) mean total combat throughput ≈ 1.5× primary — combat mains level 4 skills at once, matching a gatherer's aggregate.
- **Beastlore pacing:** full T0-T2 discovery+studies ≈ 180k; tames + assist share carry to 46 alongside normal T3 play (~686k needs the §D quadratic values — the phase-1 linear 40×(tier+1) placeholder is superseded, flagged as deviation).
- Sanity check: 22 skills × ~27h to 60 is the max-completionist ceiling; a focused single-band loop always pays 7-8h regardless of skill group. ✓

## G. FILE-TOUCH MAP

| file | changes |
|---|---|
| js/game/skills.js | +beastlore def; delete static SKILL_UNLOCKS → generated MILESTONES registry; BAND_XP_TUNE helper |
| js/game/nodes.js | new NODE_TYPES (§2); `rollNodeDrops(..., luck, ring)` + ring filter (:179-189); `canHarvest()`; geode injection |
| js/game/items.js | full new catalog (~200 ids); `equipReq`, `type:'ammo'`, spellPower on staves; remove all old ids |
| js/game/crafting.js | all §B recipes with `lv` fields (feeds registry); craftXp rule |
| js/game/enemies.js | drops → §5 tier template; xp retune; `family` field; totem/hide/geode entries |
| js/game/combat.js | ABILITIES/spell additions + req gates; flat armor/lvl (:400); shared playerStats extraction (:103-116); passives (Second Wind etc.) |
| js/game/combatrs.js | tactics payoffs (acc/proc/ambush/foresight); flat armor (:276/330); ammo consumption; shared stats |
| js/game/mobloader.js | bestiary enrollment; drops item-id validation warning; tier→template doc hook |
| js/game/bestiary.js | **new**: data model, discovery/study/tame XP, family perks, companion spawning |
| js/game/inventory.js | equipReq enforcement; quiver slot |
| js/game/save.js | bestiary + tames + node.ring persistence |
| js/world/blocks.js | new block set (§7); nightglass/terrain drop remap (:103); minTier passthrough only (:22) |
| js/world/worldgen.js | node placement for new NODE_TYPES per biome/ring (tierAt untouched) |
| js/main.js | canHarvest on both paths (:1049/:1169); real luck+ring into rollNodeDrops; sapling planting; node ring stamp; compass pings (mining 20/hunting 16/arch 10) |
| js/ui/* | milestone registry display; bestiary UI; quiver/ammo HUD |
| docs/MOB_FORMAT.md | document recommended tier-keyed drops template + bestiary enrollment |

**Verification:** all 22 skills have content-backed 1→50 ladders (0 fake milestones; every row = catalog item, recipe, node/table entry, or checklist-E mechanic); 5 previously-empty skills (hunting, farming, archaeology, tactics-in-RS, +new beastlore) now have full loops; every gear tier reachable and consumed; ranged/magic have weapons+ammo/spells at all 4 tiers; armor endgame ≈ 60 vs old cap 18.


# APPENDIX A — ADVERSARIAL REVIEW (resolved by the rulings above)

Engine citations in the docs verified against source (nodes.js:179/189 luck param, combat.js:400-401 armor formula, skills.js:107-110 curve, main.js:1169 hardcoded luck, 21 SKILL_DEFS) — all accurate. Flaws below are in the design documents themselves.

## BLOCKERS

1. **blocker — Enchanting is dead until endgame (circular/band gate).** enchant_altar (constr 18) requires gloamshard ×2, obtainable only from cluster_gloamshard (mining 42, pick 4 → smithing 32-38) or T2/T3 caster kills; the footnote's "or trade/coffer gloamshard" is false — drowned_coffer's loot table (coin, geode, relic, bait, flawless gem) contains no gloamshard. All of ench 5/8/12/15/18 (R0-R1 band content: mossy/banded cutting, signets, tier-1 runes, wildheart_charm) is locked behind R2+ progression. Fix: altar recipe = quarried_stone 6 + mossy_geode 1 + root_relic 1 (or add gloamshard to coffer/vendor), keep gloamshard for a tier-2 altar upgrade.

2. **blocker — Four craft skills are unreachable at level 1.** First recipes: smithing 4 (bronze_ingot), enchanting 5, cooking 2, alchemy 2 — no XP source exists below those levels (crude tools are explicitly "smithing-free"), and the curve needs 140 XP just for lv2, so the gates can never be met. Fix: move each skill's first recipe to lv 1 (bronze_ingot smithing 1, roast brookperch cooking 1, minor heal alch 1, mossy cut ench 1 — combined with fix #1).

3. **blocker — Magic re-starved at T2, repeating the audit mistake.** lanternglow_staff (equip magic 28, mid-T2 band) requires lanternwood_log, but tree_lanternwood is wc 50 (axe 4) everywhere — the "R2 fringe trees" alternative doesn't exist because the node's skill gate is 50 regardless of location. The only T2 caster path is buying logs. Fix: split into tree_lanternwood wc 35 at crystal_caverns fringe (R2) and keep a richer wc 50 corrupted variant, or make lanternglow use rimefir + glowpith.

4. **blocker — The §10 trim list violates both hard rules it claims to preserve.** (a) Cutting laststand_draught orphans emberlace (its only remaining sink — "greater attack tonic" was never specced); cutting hearth_bread orphans hearthwheat/flour ("ale" is named in materials but no ale recipe exists anywhere). (b) ~12 of the 21 † items ARE ladder milestones: alch 22/36/42/48, cooking 5/12, smithing 42, constr 12/20/30/35, ench 44, tailoring 18, ranged 20 (quiver perk) and ranged 38 (venom_oil) — cutting them reintroduces fake milestones, directly contradicting §11's "every level = a recipe above." Fix: re-derive the trim list to only non-milestone, non-sole-sink items (see corrected count below) and restate the ladders post-trim.

5. **blocker — Gear doc is truncated/incomplete: §1-6 missing.** Recipe lines for ~114 items (17 tools, 13 weapons, 4 ammo, 2 shields, 27 armor, 9 jewelry, runes, foods, potions) are absent, so the "127 items all sourced" verdict is unverifiable — and the visible fragments contradict the counts: tools claimed 17 but implied 22 (4 types × 5 tiers + 2 rods; trim list confirms pyrelith_axe/bronzehead_hoe exist); armor claimed 27 but ladders imply 31 (heavy 10 + light 12 + cloth 9); budget says "3 placeables" but 4 placeable block tiles are listed. Fix: publish §1-6 and reconcile the three counts.

## MODERATE

6. **moderate — Triple-dipping ring-XP scaling contradiction.** §2 bakes "+ring×20/25" into node XP, §4.5 says baseXp × (1+0.9×ring), checklist E13/§F says def.xp × BAND_XP_TUNE[ring] with "nodes keep catalog values." Three incompatible rules; §F's hrs/band math only works for one. Fix: single rule — catalog base XP × BAND_XP_TUNE at grant; delete §4.5 and the per-node "+ring×N" notes.

7. **moderate — Altar id conflict.** Materials doc: "craftable runestone_altar recipe"; gear/skills docs: enchant_altar, while claiming "engine ids retained" (engine station is runestone altar). Same station, two ids. Fix: use the retained engine id runestone_altar everywhere.

8. **moderate — Gloamshard mob-source contradiction.** §1a says "E:T3 casters 10%"; §5 drop template gives casters gloamshard 10% at tier 2 AND 3. Fix: standardize on T2+ casters 10% (also softens blocker #1).

9. **moderate — Undefined/broken ids referenced as sinks or loot:** "coin" (coffer loot — no currency item specced), "longsword" and "spade" (§8 coverage row for sinews), "masonry blocks" (constr 12), "ale" (hearthwheat sink), "wand" (glowpith sink — no wand items exist), "kiln" (coal sink "kiln firing" — no kiln station exists; fired_brick uses furnace). Fix: spec a currency item or state engine currency is retained; replace longsword/spade with the actual arms/tool ids; define masonry block items; delete ale/wand/kiln mentions or add the content.

10. **moderate — Seed source has no substrate.** Seeds come from "ring-gated tall-grass drops," but no tall_grass/grass-plant block exists in §7 (no block, no texture, no drop table). Fix: add tall_grass block (cross, per-biome tint) with ring-gated seed table, +1 texture.

11. **moderate — craftXp rule undefined for crafted inputs.** "0.6 × Σ(gatherXp of consumed inputs)" — ingots, planks, cloth have no gatherXp. Recursive evaluation compounds (steel chain triple-dips coal); zero evaluation starves smithing 20+. Fix: define materialXpValue per item (raw = node xp/drop; crafted = 0.6 × Σ inputs, memoized) and use that.

12. **moderate — Anvil bootstrap unspecified.** Anvil (constr 6) needs iron_ingot (smithing 14); nothing states which smithing 1-14 recipes are furnace/workbench-only. If bronze tools/arms need the anvil, T0 smithing soft-locks. Fix: explicitly mark smithing ≤14 recipes as furnace+workbench.

13. **moderate — Heavy T3 armor math doesn't close.** Checklist E3 claims "heavy T3 ≈ 60 armor" but T3 heavy is a single piece (pyrewarden_plate, smithing 52) vs 3-piece sets at every other tier — either one chest = 60 armor (breaks the per-piece curve and makes T2 3-piece ≈ T3 1-piece ambiguous) or the 60 target is unreachable. Also tailoring set ranges 28-31 and 44-47 span 4 levels for 3-piece sets. Fix: make pyrewarden a 3-piece set (52/53/54 within the honest 51+ exception, or 48/50/52) and publish per-piece armor values.

14. **moderate — Early ranged ammo chokepoint.** bonepoint_arrow requires pitchgum (4% rare, ~1 per 25 alder logs) with no batch yield specified — risk of repeating the audit's ranged starvation at lv 1-10. Fix: specify 1 pitchgum + 1 bone_shards + 1 featherbarb → 12-16 arrows, and 30% recovery already helps.

15. **moderate — Ranged 10 milestone lists steelpoint_arrow, which needs ww 20 + smithing 20** — a lv-10 unlock unusable until mid-band. Fix: move steelpoint to the ranged 15-20 rows or add an iron arrowhead at smithing 14/ww 12.

16. **moderate — Texture math undercounts.** §7 claims ~54 block tiles but lists ~55 block types before double tiles (5 logs need top+side = +5 minimum; tilled_loam top+side), plus missing tall_grass (#10) and fishing marker sprites; phase-2 counts 131 vs "3 placeables." True total is ~290-295 PNGs, not 280. Fix: publish an exact per-tile manifest (the external art pipeline needs a precise list anyway).

17. **moderate — Totem long-run dead end.** Studies cap at 5/species but totems drop forever at 6-12%; after cap, totem_fang/skull/heart have only trophy_mount (†-cut in trim) as sink. Fix: keep trophy_mount, and/or add totem → Beastlore treat/charm conversion recipe.

## NITS

18. **nit** — Rod line has tiers 1 and 3 only vs spine's "rod × 4-5 tiers"; state the deviation deliberately.
19. **nit** — Vestigial sink text: "tan →" (no tanning step exists), bait_grubs "compost" (compost deferred), gloamshard "imbue reagent" (no rune recipe consumes it), coffer "1% flawless gem" type/ring unspecified.
20. **nit** — venom_gland declared T1-3 but §5 template only lists it on the tier-1 row; add "poisonous" as a cross-tier tag.
21. **nit** — Light/cloth armor have no equipReq gates (weapons and heavy do); either gate on ranged/magic levels or state armor is ungated by design.
22. **nit** — fine_sand (R1-2) in smithing 10 whetstone puts an R1 travel need inside the T0 band (defensible, band overlap starts at 10 — but note it).
23. **nit** — Trimmed count 201 still exceeds the 160-200 target by 1 even under the (broken) trim list.

## CORRECTED CONSOLIDATED ITEM COUNT

As designed: **222** (95 materials — internally verified — + 127 gear/consumables, pending #5's missing sections). The §10 trim is invalid (#4): only **6** † items are safely cuttable without orphaning a material or killing a ladder milestone (pyrelith_axe, bronzehead_hoe, wardenheart_amulet, glow_vial, bow_rosin, hunters_quiver — the last only if the ranged 20 perk moves onto shadehide light-set chest), giving **216**. To reach the ≤200 target, merge instead of cut: collapse flawless gems from 5 separate ids into a quality flag (−5), merge whetstone/forge_whetstone into one tiered consumable (−1), fold gold_ring/gold_amulet blanks into the signet/amulet recipes with skill-doc rows rewritten (−2), collapse iron→steel heavy into a single steel set (−3), drop candied spinefruit variant (−1) → **204**, or additionally make targe/bulwark a 2-tier single shield line and cut one utility (−2 to −4) → **~200-201 final**, with all sources, sinks, and 22 content-backed ladders intact.