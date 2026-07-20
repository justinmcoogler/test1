# Emberveil

A playable, original **voxel sandbox RPG** for the browser — block-based exploration,
mining, building and crafting fused with deep skill progression, regenerating resource
nodes, quests, equipment, monsters, a dungeon, and **tactical turn-based combat**.

Everything is original and built from scratch: a custom WebGL2 voxel engine, procedurally
painted 64×64 textures, synthesized audio, hand-authored starter town, creatures, items
and quests. No third-party runtime dependencies, no copied assets.

## Play

```bash
npm run serve        # then open http://localhost:8080
```

Any static file server works — the game is plain ES modules with no build step.
Works on desktop, tablet and phone browsers (WebGL2 required).

### Your first ten minutes

You wash up in **Brookhollow**, a settlement on a green plateau. Talk to **Elder Maren**
(the ❗ villager by the cottage) — her quest chain teaches the whole game: chopping
fernwoods in the grove, crafting a workbench and tools, mining copper and tin in the
settlement mine, smelting bronze, building a shelter, cooking, fighting the training
dummy, and finally descending past the ore chamber into the **Rootgrave** to face the
Rootbound Golem. **Merchant Tam** at the stall buys goods, sells supplies, and has side
contracts.

### Two ways to play

**First person** (default) — Minecraft-style immersion:

| Input | Action |
|---|---|
| WASD / Space / Shift | Move / jump / sprint |
| Mouse (click canvas to capture) | Look |
| Hold Left click | Gather node · mine block · engage enemy |
| Right click | Place block · interact |
| F | Talk / use station / open chest |
| 1–8, wheel | Hotbar |
| E K C J M O | Inventory · Skills · Crafting · Quests · Map · Settings |
| V | Switch camera view |
| Esc | Close / settings |

**Classic view** (press **V** or toggle in Settings) — RuneScape-style third person
with click-to-move: click the ground to walk there (your character hops small
ledges on its own), click a tree/vein/spot to walk over and gather until it's
depleted, click a creature to walk over and fight, click a villager to talk,
click a station or chest to use it. Shift+click (long-press on mobile) breaks a
block, right-click places one. Middle-drag or arrow keys orbit the camera,
wheel zooms, and WASD still walks camera-relative. In combat your character
auto-follows the target, RuneScape-style.

### Mobile controls

Left virtual joystick to move, drag the right side to look. **✦** hold-to-gather /
tap-to-interact / attack, **⤒** jump, **»** sprint toggle, **▣** place block. Menus use
large touch targets; a left-handed layout is available in Settings.

## Systems

- **World** — seeded, deterministic chunk generation; nine original biomes (Greenwood
  Plains, Ancient Forest, Rocky Highlands, Sun-baked Badlands, Frostbound Tundra, Misty
  Wetlands, Volcanic Wastes, Corrupted Wilderness, Coastal Shores) arranged in danger
  tiers that grow harsher with distance from Brookhollow; hills, rivers, lakes, caves,
  cliffs and an underground dungeon; all player edits persist.
- **Resource nodes** — trees (3 species), ore veins (copper/tin/iron/silver/emberstone),
  crystal growths, fishing spots, herb patches, berry bushes, clay deposits, archaeology
  dig sites and farm plots. Nodes hold limited charges, show a depleted state (stumps,
  spent rock…), and regenerate on real timers that survive saving and reloading.
- **21 skills**, levels 1–99 (Mining, Woodcutting, Fishing, Foraging, Hunting, Farming,
  Archaeology, Smithing, Woodworking, Cooking, Tailoring, Alchemy, Construction,
  Enchanting, Vitality, Strength, Defense, Ranged, Magic, Healing, Tactics) — XP through
  use, visible unlock tables, gathering speed and yields scale with level and tool tier.
- **Crafting** — 60+ recipes across hand-crafting, Workbench, Furnace, Anvil, Campfire,
  Loom, Alchemy Table, Runestone Altar and Construction Bench; tool/weapon durability;
  recipe discovery through rare materials.
- **Equipment** — 11 slots (head/body/legs/hands/feet/main/off/ranged/2 accessories/
  utility) with real tradeoffs (armor vs evasion vs speed, hide vs bronze vs woven);
  gear changes your voxel character's appearance in combat.
- **Combat, two ways**
  - **Classic (default)** — RuneScape-style battles in the open world: click a creature
    to engage and you exchange blows automatically on weapon-speed timers, with damage
    hitsplats, attack styles that route XP (Aggressive→Strength, Defensive→Defense,
    Balanced splits, plus Ranged and Magic with your bow or staff), food eaten straight
    from the hotbar mid-fight, special attacks on cooldowns (Power Strike, Cleave, Aimed
    Shot, Ember Burst, Mend), auto-retaliate, and fleeing by simply running away. Bosses
    keep real mechanics: the golem's slam telegraphs the ground under you — step out or
    take it — and it summons rootlings at half health. Enemies path through caves and
    can be safespotted from ledges with ranged weapons, as is right and proper.
  - **Tactical (Settings toggle)** — grid battles carved from the terrain around you:
    initiative order, move + action per turn, height advantage, cover, line of sight,
    elemental weaknesses, statuses, telegraphed danger tiles, hit-chance and damage
    previews, inspect, items, defend, flee.
- **Creatures** — 20 original creatures from Mudback Boars and Thicket Sprites to
  Frostmaw Wolves, Magma Hulks and Hollow Watchers, each with voxel models, behaviors,
  drop tables and combat quirks; the **Rootbound Golem** boss telegraphs area slams,
  roots you in place, and summons rootlings at half health.
- **Persistence** — three save slots in localStorage; world seed, edits, node timers,
  skills, inventory, equipment, quests, chests, kills, discovered map and settings all
  save (autosave + manual).
- **Accessibility** — UI/text scaling, colorblind-safe palette, reduced motion, screen
  shake toggle, sprint hold/toggle, invert-Y, camera sensitivity, left-handed mobile
  layout, remappable-friendly key handling, separate SFX/music volume.

## Development

```
js/core     math, seeded RNG/noise, events, synthesized audio
js/gfx      WebGL2 helpers, procedural texture atlas, chunk mesher (AO), renderer
js/world    block registry, worldgen/biomes, hand-built structures, chunk store
js/player   physics/controls (desktop + touch)
js/game     items, skills, inventory, crafting, nodes, enemies, combat, NPCs, quests, saves
js/ui       HUD, windows, dialogue, combat interface
```

### Tests

```bash
npm test           # 16 unit tests (worldgen determinism, XP curves, data integrity…)
npm run test:e2e   # Playwright: smoke, full gameplay loop, boss fight, mobile touch
```

The e2e suites drive the real game in headless Chromium: accepting quests through
dialogue, chopping trees by holding the mouse, crafting via the UI, watching nodes
deplete into stumps and regrow, fighting the boss through its phases, and reloading
saves to verify persistence.
