# Sproutlands

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

### Play together on your wifi

Run this **on a computer in the house** — the one on the same wifi as everyone
else's devices.

**The easy way: one file, nothing installed.**

#### ⬇ [Download the Windows server](https://github.com/justinmcoogler/test1/releases/download/server-latest/Sproutlands-Server-win-x64.exe)

That link is the file itself — it starts downloading, no GitHub account and no
signing in. It lands in your **Downloads** folder as
`Sproutlands-Server-win-x64.exe`. Double-click it there. That is the whole
setup: no Node, no clone, no folder to keep beside it, nothing to unzip. The
entire game is inside the binary. A console window opens showing the address to
read out; closing it stops the server and saves.

([macOS](https://github.com/justinmcoogler/test1/releases/download/server-latest/Sproutlands-Server-darwin-arm64)
· [Linux](https://github.com/justinmcoogler/test1/releases/download/server-latest/Sproutlands-Server-linux-x64)
· [all builds](https://github.com/justinmcoogler/test1/releases/tag/server-latest)
— on those two, `chmod +x` the file first.)

> Windows will warn that it is from an unknown publisher, because it is not code
> signed. **More info → Run anyway.** Signing needs a certificate that costs
> money; on your own machine, for your own kids, it buys nothing.

**Or from source**, which needs Node 18+ and nothing else — no `npm install`, no
build step, no dependencies. (`npm install` is only for running the tests.)

```bash
git clone <this repo>
cd test1
npm run server          # or: node server/server.mjs
```

**Building the executable yourself:**

```bash
npm install                                  # postject + esbuild, dev only
npm run package                              # for this machine
node tools/package.mjs --target win-x64      # or another platform
```

Cross-building works — appending a runtime to a blob is just editing a file — but
it cannot *run* the result, and macOS binaries need a signature only macOS
tooling can apply. `.github/workflows/package.yml` builds each platform on a
runner of its own kind, starts the result there and asks it for a file that can
only have come from inside it, then publishes the three binaries to the
`server-latest` release. So the file behind the link above is one that has been
seen to serve the game.

The game and the game socket are served on **one port**, so the address on the
screen is the only address there is — open it on any device on the same wifi,
type a name, and press **Play together**. There is nothing to configure.

One world, shared: the same seed, the same blocks, the same creatures. A goblin
one child kills is dead for everyone.

What the server owns, and what it doesn't:

- **The world.** Terrain is deterministic from the seed, so nothing streams
  terrain — every device generates identical ground from one number and only the
  *edits* travel.
- **The creatures.** One wander, one health pool, one fight.
- **Not your movement.** Clients say where they are and the server believes them.
  Positions are bounds-checked so a bad value can't hurt the server, but there is
  no anti-cheat: the line is "can't break other people", not "can't advantage
  yourself". For a family in one house that is the right trade.

**It saves.** The world is written to `saves/<seed>.json` — every minute while
anything has changed, when the last player leaves, and on Ctrl-C. Blocks, chests,
crops, mined nodes, what has been killed and when it comes back, and where each
player was standing. Start the server again and everyone picks up where they
left off, at the spot they logged out from.

Writes are atomic (write, then rename), so a crash or a closed laptop lid during
a save leaves the previous one intact rather than half a file. A save that will
not parse, or one belonging to a different seed, **stops the server** instead of
being overwritten — replaying one world's edits onto another world's terrain
gives you doors in cliffsides, and the save is somebody's afternoon.

```bash
npm run server -- --seed honeywood     # pick the world (and its save file)
npm run server -- --save my/world.json # put the save somewhere else
npm run server -- --no-save            # run it in memory only
```

No accounts and no passwords — a name is the whole identity. Characters
(inventory, skills) still live in each device's own browser storage; the server
owns the world, not your pockets. Don't port-forward it.

### Install it as an app

Sproutlands is a PWA: a web app manifest, maskable icons and a service worker
that keeps the whole build cached, so once it has loaded online it starts and
plays with the wifi off.

**On the machine running the server** — open `http://localhost:8080` and use the
**Install Sproutlands** button on the title screen, or your browser's address-bar
install icon.

**On an iPad or iPhone** — open the page in Safari, tap **Share**, then **Add to
Home Screen**. Safari never offers an automatic install prompt, so the title
screen shows an **Add to Home Screen** button that explains this instead.

**On an Android tablet — read this bit.** A browser only registers a service
worker, and Chrome only offers to install, on a **secure context**: `https`, or
`localhost`. A LAN address like `http://192.168.1.20:8080` is neither, so over
plain http the kids' tablets can *play* perfectly well but cannot *install*.
The fix is to serve https from your own machine:

```bash
node tools/make-cert.mjs      # self-signed, covers this machine's LAN addresses
npm run server -- --tls       # now prints https:// URLs
```

Each device warns once that the certificate is not trusted — accept it
(**Advanced → Proceed**) and the app becomes installable. The certificate lives
in `.certs/` and is gitignored. Regenerate it if you change networks.

Playing never needs any of this. It is only about getting an icon on a home
screen.

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
- **Combat** — RuneScape-style battles in the open world: click a creature
  to engage and you exchange blows automatically on weapon-speed timers, with damage
  hitsplats, attack styles that route XP (Aggressive→Strength, Defensive→Defense,
  Balanced splits, plus Ranged and Magic with your bow or staff), food eaten straight
  from the hotbar mid-fight, special attacks on cooldowns (Power Strike, Cleave, Aimed
  Shot, Ember Burst, Mend), auto-retaliate, and fleeing by simply running away. Bosses
  keep real mechanics: the golem's slam telegraphs the ground under you — step out or
  take it — and it summons rootlings at half health. Enemies path through caves and
  can be safespotted from ledges with ranged weapons, as is right and proper.
  (A tactical grid engine also lives in the codebase, exercised by the test suite,
  but it is not part of the player experience.)
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
npm test           # unit tests (worldgen determinism, XP curves, data integrity…)
npm run test:e2e   # Playwright: smoke, gameplay loop, boss fight, mobile touch,
                   # multiplayer (two real clients), PWA install + offline
```

`tests/pwa.mjs` is the one that proves the install story: it registers the
service worker, pulls the network, reloads, and asserts the game — modules and
all, not just the HTML shell — still comes up.

Automated browsers do **not** get a service worker unless the page is opened with
`?sw=1`. Without that the whole e2e suite would race a worker busy caching the
build, which measurably shifts frame timing in the tests that count rounds of
combat.

The e2e suites drive the real game in headless Chromium: accepting quests through
dialogue, chopping trees by holding the mouse, crafting via the UI, watching nodes
deplete into stumps and regrow, fighting the boss through its phases, and reloading
saves to verify persistence.
