# World & progression plan

Two parts: what the skills audit actually found, and the staged plan for the
world rebuild. Written to be executed in order — each phase ships and tests on
its own.

---

# Part 1 — Skills audit (measured, not guessed)

Counts pulled straight from `SKILL_DEFS`, `NODE_TYPES`, `RECIPES` and
`SKILL_UNLOCKS`.

| skill | nodes | recipes | unlocks | top recipe level |
| --- | --- | --- | --- | --- |
| mining | 13 | 0 | 10 | — |
| woodcutting | 12 | 0 | 12 | — |
| foraging | 11 | 10 | 5 | 1 |
| fishing | **1** | 0 | 6 | — |
| farming | **1** | 0 | 5 | — |
| archaeology | **1** | 0 | 4 | — |
| smithing | 0 | 121 | 7 | 73 |
| woodworking | 0 | 53 | 7 | 90 |
| crafting | 0 | 35 | 7 | 75 |
| construction | 0 | **173** | 5 | **6** |
| tailoring | 0 | 44 | 5 | **12** |
| alchemy | 0 | 20 | 5 | **15** |
| cooking | 0 | 6 | 6 | **20** |
| enchanting | 0 | 6 | 1 | 25 |
| hunting / vitality / healing / athletics / strength / defense / ranged / magic | 0 | 0 | 4–6 | — |

XP curve: L2 = 140, L10 = 12.4k, L25 = 125k, L50 = 687k, L99 = 3.61M.

### The three real problems

**1. Content ceilings do not match the level curve.** Every skill advertises 99
levels. Construction has **173 recipes and every one of them unlocks by level
6** — so 93 levels award nothing. Tailoring stops at 12, alchemy at 15, cooking
at 20. Only smithing (73), woodworking (90) and crafting (75) actually use the
curve. This is the single biggest progression defect: most skills are
functionally finished in the first hour, and the XP bar keeps filling for no
reward.

*Fix:* re-tier recipe level gates so each crafting skill spreads its unlocks
across 1–90 in bands (1–15 basic, 15–40 improved, 40–70 fine, 70–90 master),
and add a handful of master-tier recipes where a skill runs out of ceiling.

**2. Three skills have exactly one activity.** Fishing, farming and archaeology
have a single node type each. There is no progression *within* the activity — no
better fishing spots, no harder-to-work soil, no deeper digs. Levelling changes
nothing about what you do.

*Fix:* tier them like mining and woodcutting, which already have 12–13 node
types. Fishing needs shallow/deep/river/coastal spots with level gates; farming
needs soil tiers; archaeology needs dig sites that scale with distance.

**3. Combat and body skills award XP through code paths, not data.** Hunting,
strength, defense, ranged, vitality, healing, athletics and magic have no node
or recipe source — they are granted in combat and movement code. That is fine in
principle, but it means their rates are invisible and unauditable, and magic in
particular has only **one** unlock.

*Fix:* move combat/body XP rates into a data table so they can be balanced and
tested like everything else, and give magic a real unlock ladder.

---

# Part 2 — World rebuild

## The core idea: difficulty is distance

Everything below hangs off one rule — **`ring = floor(distance from spawn /
512)`**. Ring 0 is the starting bowl; every ring out raises biome tier, mob
tier, node tier and structure richness. The player never sees a difficulty
number; they just feel the world get sharper the further they walk.

| ring | distance | biomes | mobs | nodes |
| --- | --- | --- | --- | --- |
| 0 | 0–512 | meadow, light forest, pond | rabbit, cow, sheep, boar; rat at night | copper, tin, oak/birch |
| 1 | 512–1536 | dense forest, hills, marsh | wolf, goblin, spider, zombie, skeleton | iron, coal, ash/hickory |
| 2 | 1536–3072 | highlands, moor, badlands | packs, elites | silver, gold, deep stone |
| 3 | 3072+ | frost peaks, ashlands, deep wood | bosses, rare spawns | gems, meteoric iron |

Spawn is force-set to ring 0 so a new player never lands somewhere lethal.

## Biome blending

The current generator picks a biome per column from climate noise, which gives
hard seams. Replace with **weighted blending**: sample the 4 nearest biome
candidates, weight by climate distance, and lerp *height, surface block and
foliage density* across the boundary. Concretely:

- height = weighted average of each candidate's height function
- surface = the highest-weight candidate, but with a noise-dithered band ±6
  blocks either side of the seam so the edge breaks up instead of drawing a line
- trees/plants = each candidate seeds its own foliage at its own weight, so a
  forest thins into meadow rather than stopping dead

## New biomes (12, tiered)

Ring 0: **meadow**, **birchwood**, **reed pond**
Ring 1: **oakwood**, **pine hills**, **marsh**, **heath**
Ring 2: **highland moor**, **chalk downs**, **badlands**
Ring 3: **frost peaks**, **deep wood**

Each gets its own surface/filler pair, tree set, plant set, node table and mob
table, so a biome is a complete content bundle rather than a recolour.

## Trees

One tree *builder* parameterised by trunk height, lean, branch count, canopy
shape (round / conical / spreading / weeping) and leaf block — then ~14 species
across the rings. Ring 0 species stay small and easy to fell; ring 3 species are
tall, branched and drop rarer wood.

## Roads that never end

A deterministic road graph, generated per-chunk with no global state:

- eight **arterial roads** leave spawn on the compass points and continue
  forever, their path a low-frequency noise walk so they curve
- roads *carve*: they flatten to a max 1-block step, bridge water, and cut
  shallow cuttings through hills
- **waystones** every 256 blocks — a lit marker, a bench, and a signpost naming
  the next settlement. These double as the fast-travel network
- side lanes branch toward any town within 200 blocks of an arterial

## Towns

Procedural, seeded by position, one per ~1200 blocks along an arterial, sized
and themed by ring:

- pick a plot from the road, lay a street grid that follows terrain contours
- place 5–20 buildings from the `js/world/town.js` vocabulary already built
  (timber frame, jetty, plinth, steep roofs) with size/roof/door varied by seed
- always: a well or market square, lanterns, and a road connection
- ring-scaled extras: ring 1 adds a smithy and palisade, ring 2 a moot hall and
  walls, ring 3 a keep
- **2–5 NPCs per town** from a name/role pool, each with a generated quest from
  templates (fetch N of a local resource / clear a nearby den / deliver to the
  next town along the road). Quest difficulty and reward scale with ring.

## Dungeons & mineshafts

- **Mineshafts**: branching corridors on a grid, wooden supports every 4
  blocks, ore veins richer with depth, occasional collapsed sections and a
  chest room. Seeded per region, entrance is a shaft head on the surface.
- **Dungeons**: room-and-corridor layout from a seeded graph — 6–14 rooms, one
  boss room, locked door + key held by a mini-boss. Themed by ring (crypt →
  ruin → fortress → vault).

## Execution order

Each phase ships green and is independently testable.

1. **Ring scaffolding** — `ringAt(x,z)`, spawn pinned to ring 0, existing mobs
   and nodes gated by ring. *Smallest change with the biggest gameplay effect.*
2. **Biome blending** — kill the hard seams on the existing biome set.
3. **Skills re-tier** — fix the level-gate bands and give fishing/farming/
   archaeology their node tiers. *Independent of world gen; can land in parallel.*
4. **New biomes + trees** — the 12-biome table and the parameterised tree
   builder.
5. **Roads + waystones** — endless arterials, then side lanes.
6. **Procedural towns + NPCs + quests** — needs roads first.
7. **Mineshafts, then dungeons.**

Phases 1–3 are the ones that change how the game *feels* today; 4–7 are what
make it large.
