# Rebuild prompt — Sproutlands

Paste everything below the line into Codex as the opening prompt. It is written
to be handed to an agent with an empty repository.

---

Build **Sproutlands**: an original voxel sandbox RPG that runs in a browser, plus
a LAN server so a family can play it together, plus a Learning Mode for a
four-year-old who cannot yet read.

This is a large build. Work through the milestones in order. Each milestone must
end with the game **playable** — not a scaffold, not a stub — and with tests that
prove it. Do not move to the next milestone until `npm run test:all` is green.

## Hard constraints

These are not preferences. They shape every decision below.

1. **No third-party runtime dependencies.** Not one. No three.js, no Babylon, no
   React, no physics library, no tweening library. `devDependencies` may contain
   only a test runner (Playwright), and a bundler + `postject` used *solely* for
   packaging the server as a single-file executable. The game itself imports
   nothing it does not contain.
2. **No build step to play.** Plain ES modules, served statically, opened in a
   browser. `npm run serve` starts a static file server and that is the whole
   toolchain. If a change requires a compile before it can be played, it is the
   wrong change.
3. **Plain JavaScript.** No TypeScript, no JSX, no decorators. Use JSDoc if you
   want types.
4. **Custom WebGL2 renderer.** You are writing the shaders, the chunk mesher, the
   frustum culling and the atlas packing yourself.
5. **Every asset is generated, not sourced.** Textures are painted procedurally
   into an atlas at load time from code. Audio is synthesized with WebAudio —
   no sample files. Creature and prop models are voxel data in JSON authored in
   this repo. Fonts are the one exception (a bitmap-style webfont is fine).
   Nothing is copied from Minecraft or any other game — not a texture, not a
   model, not a block name, not a mob name, not a recipe. Original world,
   original bestiary, original nouns.
6. **Node 18+ for the server, with no install.** `node server/server.mjs` must
   work in a fresh clone. `npm install` is only ever needed to run the tests.
7. **Desktop, tablet and phone.** WebGL2 is the only requirement. Touch is a
   first-class input, not an afterthought bolted on at the end.

## Layout

```
index.html            entry; loads js/main.js as a module
css/                  style.css, fonts.css
js/core/              math, seeded RNG, value/simplex noise, event bus, synthesized audio
js/gfx/               WebGL2 helpers, procedural texture atlas, chunk mesher (AO),
                      renderer, icon rasteriser, voxel-model painting
js/world/             block registry, worldgen + biomes, structures, roads, settlements,
                      dungeon, sky, weather, chunk store
js/player/            physics, desktop controls, touch controls
js/game/              items, skills, inventory, crafting, nodes, enemies, combat, NPCs,
                      quests, saves, characters, mounts, curriculum/
js/ui/                HUD, windows, dialogue, combat interface
js/net/               client transport + wire protocol
server/               LAN server: http+ws on one port, authoritative room, persistence
tests/unit/           node:test — determinism, curves, data integrity, reachability
tests/                Playwright suites that drive the real game
tools/                asset bakers, packagers, importers
docs/                 design docs written before the code they describe
```

Keep modules honest about their layer. `js/world` may not import `js/ui`.
`js/core` imports nothing but itself.

---

# Milestone 1 — the engine floor

A voxel world you can walk around, dig into and build in.

- **Chunked world.** 16×16×N chunks in a sparse store. Terrain is generated
  deterministically from a seed — same seed, same ground, on every machine and
  every run. This property is load-bearing later: multiplayer never streams
  terrain, only edits, because both ends generate identical ground from one
  number. Write the determinism test now, not later.
- **Mesher.** Cull hidden faces, bake per-vertex ambient occlusion, emit one
  buffer per chunk. Run it in a **Web Worker** with a transferable result; the
  main thread must never stall on a remesh. Pool chunk buffers — allocating a
  fresh one per remesh will visibly hitch.
- **Renderer.** One draw call per chunk, frustum culled, sorted front-to-back.
  Separate pass for transparent blocks (water, glass, leaves if you want them
  sorted). Dynamic resolution scaling: if frame time exceeds budget, render at a
  lower internal scale and upsample, so a cheap tablet stays smooth instead of
  dropping to a slideshow.
- **Physics.** Swept AABB against the voxel grid. Step-up over single blocks so
  walking a rocky slope doesn't require jumping every metre. Water slows you and
  lets you swim. Fall damage.
- **Controls.** WASD, space, shift-to-sprint, pointer lock for look. Hold left
  click to break, right click to place, 1–8 and wheel for the hotbar.
- **Block registry.** Data-driven: id, name, textures per face, hardness, tool
  class, drops, whether it's solid/liquid/transparent, light emission.

**Test:** worldgen determinism (same seed → identical column hashes), mesher
face-culling counts, swept-AABB against known geometry, and a Playwright smoke
test that boots the page, waits for first frame, walks forward and asserts the
player moved.

# Milestone 2 — the world worth looking at

- **Procedural texture atlas.** Every block texture is *painted in code* into a
  64×64 tile: noise, strata, grain, speckle, edge wear. Bake into one atlas
  texture at load with a mipmap chain. Keep the painter functions small and
  named after what they draw. Write a screenshot harness that renders every tile
  to a contact sheet so you can look at them all at once.
- **Sky.** Day/night on a fixed-length day (480 seconds works well). Sun and moon
  positions, a gradient sky that shifts through dawn/day/dusk/night, stars that
  fade in, clouds. Fog to hide the chunk-load boundary.
- **Weather.** Rain and snow by biome and season, with particles and an audio bed.
- **Biomes.** Nine of them, arranged in **danger tiers that grow harsher with
  distance from the start town** — this is your difficulty curve and your
  exploration incentive in one mechanism. Give each its own ground blocks, tree
  species, creature roster and palette. Height by continental noise + erosion,
  rivers that flow downhill, lakes, caves, cliffs.

**Test:** biome assignment determinism, sky colour at known times, the season
curve (see *Traps* — the freezing-in-spring bug), and a flyover screenshot suite.

# Milestone 3 — survival and the loop

- Health, stamina, hunger, thirst. Sleep in a bed to pass the night.
- Hotbar, inventory grid, chests, drag-and-drop that works with touch.
- **Resource nodes** — trees (several species), ore veins, crystal growths,
  fishing spots, herb patches, berry bushes, clay deposits, dig sites, farm plots.
  A node holds limited charges, shows a **depleted state** (a stump, a spent
  rock), and **regenerates on a real timer that survives saving and reloading**.
  Store the wall-clock timestamp, not a tick count.
- **Crops** grow through visible stages on a timer. Eight stages for wheat reads
  much better than three.
- **21 skills, levels 1–99.** XP through use. An exponential curve so early
  levels come fast. Gathering speed and yield scale with level *and* tool tier.
  Visible unlock tables so a child can see what the next level buys.
- **Crafting**, 60+ recipes, across hand-crafting plus stations (workbench,
  furnace, anvil, campfire, loom, alchemy table, altar, construction bench).
  Tool durability. Some recipes discovered by holding a rare material.
- **Equipment**, 11 slots, with real tradeoffs — armour vs evasion vs speed.
  Worn gear must **change the player's voxel model**, or none of it feels earned.

**Test:** XP curve monotonicity and level boundaries, every recipe's inputs exist
and are reachable from the starting world, node regen across a simulated reload,
crop stage timing, no item id collisions.

# Milestone 4 — creatures

- **A voxel model format** of your own: a JSON file listing named boxes with
  size, origin, pivot, rotation and per-face UVs into a per-creature texture,
  plus named animations as keyframed pivot rotations. Write an importer tool so
  models can be authored outside the code, and a validator that rejects floating
  boxes and off-atlas UVs.
- **20 creatures** with distinct silhouettes, behaviours, drop tables and quirks.
- **Gaits.** Legs must move, and move *correctly*: a walk cycle driven by
  distance travelled, not by wall time, or animals moonwalk when they slow down.
  Quadrupeds diagonal-pair, bipeds alternate.
- **Pathfinding** on the voxel grid with jump and drop costs. Creatures path
  through caves.
- **Combat, RuneScape-style, in the open world.** Click a creature to engage;
  blows exchange automatically on weapon-speed timers. Damage hitsplats. Attack
  styles route XP to different skills. Food eaten straight from the hotbar
  mid-fight. Special attacks on cooldowns. Auto-retaliate. Fleeing is just
  running away. Ranged safespotting from a ledge should work — it is a reward for
  thinking, not an exploit to patch.
- **A boss** with real mechanics: an area slam that **telegraphs on the ground
  under you** so stepping out is a decision, and a summon phase at half health.

**Test:** damage formulas, drop table probabilities summing correctly, a
Playwright suite that fights the boss through both phases, and a **gait test that
asserts the legs are in different positions between two frames while walking** —
see *Traps*.

# Milestone 5 — a world with people in it

- **A hand-authored starter town.** Not procedural. Place it block by block via a
  schematic format, with an importer tool. It is the first thing anyone sees.
- **Procedural settlements, roads and camps** further out, so the world beyond
  the town isn't empty. Roads should bend around terrain, not bulldoze it.
- **A dungeon** and a mineshaft, with a lock-and-key progression.
- **NPCs** with dialogue trees, a merchant who buys and sells, and a quest chain
  that **teaches the entire game** — chop, craft a workbench and tools, mine two
  ores, smelt an alloy, build a shelter, cook, fight a dummy, then descend into
  the dungeon and face the boss. A player who follows the quest marker has been
  taught every system without being handed a tutorial.
- **Waystones** for fast travel between discovered points.
- **Mounts and pets**, including a flying mount as a mid-game reward.

**Test:** every quest step is completable from a fresh save (drive it in
Playwright through the real dialogue UI), settlement generation places no
building inside terrain, roads connect.

# Milestone 6 — the second way to play

Ship a **Classic view**: RuneScape-style third person with click-to-move, toggled
with **V** or in Settings. Click the ground to walk there, with automatic hops up
small ledges. Click a tree or vein to walk over and gather until depleted. Click
a creature to walk over and fight, auto-following in combat. Click an NPC to
talk. Shift+click (long-press on mobile) breaks a block; right click places one.
Middle-drag or arrow keys orbit; wheel zooms; WASD still walks camera-relative.

This is not a camera mode. It is a complete second control scheme over the same
game, and it needs its own e2e suite.

**Mobile controls:** left virtual joystick, right side drag to look, and large
touch buttons for gather / jump / sprint / place. A left-handed layout in
Settings. Menus need touch-sized targets throughout.

# Milestone 7 — saving

Three save slots in localStorage. Persist: seed, every block edit, node regen
timers, skills, inventory, equipment, quests, chest contents, kills, discovered
map, settings. Autosave plus manual save.

**Write atomically wherever you can, and refuse to load a save whose seed does not
match the world.** Replaying one world's edits onto another world's terrain gives
you doors in cliff faces, and the save is somebody's afternoon.

# Milestone 8 — multiplayer, for a house

The audience is one family on one wifi. Design for that, and say so.

- **One port.** Serve the game and the websocket from the same http server, so
  the address on screen is the only address there is. No configuration.
- **The server is authoritative over the world, the creatures, the clock and the
  people. It is not authoritative over movement** — clients say where they are
  and the server believes them, bounds-checked so a bad value cannot hurt the
  server. The line is "can't break other people", not "can't advantage yourself".
  For a family that is the right trade; write it down so nobody re-litigates it.
- **Terrain never travels.** Deterministic from the seed. Only edits go on the wire.
- **One clock for the house.** Each client runs the sun smoothly at its own frame
  rate and is *eased* back onto server time as snapshots arrive — never snapped.
- **Any one player sleeping carries the night for everyone**, and the others are
  told who did it. Requiring a majority in bed is sensible among strangers and
  miserable for a family: it means four children must find four beds before
  anyone gets a morning.
- **Characters live on the server**, keyed by name — pack, skills, quests,
  mounts, recipes, lesson progress, position. Play on the iPad, put it down, pick
  up the laptop, be the same person. Nothing about a character is written to the
  browser while connected: one copy, or it is not really saved. Device-local
  settings (text scale, handedness, sensitivity) stay device-local — those are
  properties of the screen, not the child.
- **Persistence:** one JSON file per seed, written every minute while dirty, when
  the last player leaves, and on SIGINT. Write-then-rename so a crash leaves the
  previous save intact. A save that will not parse, or belongs to another seed,
  **stops the server** rather than being overwritten.
- **Flags:** `--seed`, `--save`, `--no-save`, `--time`, `--tls`.
- **Package the server as a single-file executable** for Windows, macOS and
  Linux, with the entire game inside the binary — bundle the client, embed it as
  a blob in a Node SEA, and inject with postject. A parent should download one
  file, double-click it, and read an address off the console. Build each platform
  on a CI runner of its own kind, **start the result there and ask it for a file
  that could only have come from inside it**, then publish to a release. Put the
  direct download link in the README — not "go to the Actions tab".

**Test:** two real browser contexts in one Playwright run. Prove the world is
shared (one child's kill is dead for the other). Prove the *people* are shared:
play as a child in one context, close it, join from a **second context with its
own storage**, and assert same levels, same pack, same coordinates. Then stop the
server, read the save file, start it again.

# Milestone 9 — install it

Make it a PWA: web app manifest, maskable icons, and a service worker caching the
whole build so it starts and plays with the wifi off. An install button on the
title screen, and an "Add to Home Screen" explainer for iOS, which never offers a
prompt. Document the Android catch honestly: service workers need a secure
context, a LAN `http://` address is not one, so ship `tools/make-cert.mjs` and a
`--tls` flag for parents who want the icon.

**Test:** register the worker, pull the network, reload, and assert the game —
modules and all, not just the HTML shell — still comes up.

---

# Milestone 10 — Learning Mode

Read this section twice before writing any of it. It is the part most likely to
come out looking finished and be worthless.

**The audience is four to six years old and is still being read to.** They cannot
read the screen. Everything else follows from that.

### The engine

- **Lesson content is data, in `js/game/curriculum/`, separate from the runner in
  `js/game/lessons.js`.** A lesson pack is a data file, exactly like a quest.
- A lesson is a **story told in steps, and the child performs each step by
  placing blocks.** The runner watches world events, re-reads the work mat, and
  when the build matches the step it celebrates, clears the mat and moves on.
- **A step declares a SHAPE, declaratively** (a small shape vocabulary: a row of
  N, a rectangle, one-per-slot, sorted bins, a symmetric pair). From that one
  declaration derive *all* of: the check, the worked solution the test suite
  plays through, the blocks the child is handed, and a guarantee the answer fits
  on the mat. **Never allow a hand-written `check()` function.** A hand-written
  check cannot be auto-solved, and a step that cannot be auto-solved is one
  nobody can prove is finishable.
- **Every word is spoken aloud** through SpeechSynthesis — the story, the step,
  the hint, the cheer. A lesson that can only be understood by reading it is a
  locked door.
- **Nothing is punitive.** A wrong build simply does not advance. Hints are there
  for the asking. There is no score on screen, no timer, no failure state.
- **A lesson has its own world**, and starting one puts the child inside it.
  Blocks placed for a counting exercise must never become real edits to the
  child's real save. Leaving returns them to the exact block they left from.
- **Highlight where each block goes** — light the target squares on the mat in
  gold. Light them *on arrival at the stop*, not while the child is still walking
  to it, so the guide never answers the question before asking it. Make it
  switchable off in Settings for a child who is past needing it.
- **Finishing pays the character, not the world**: banked play minutes, coins,
  materials — all stored character-side, so a child who starts a new world keeps
  what they earned.

### The screen

A lesson world has no night, no weather, no distance, no danger and no hunger.
**It must not inherit the survival HUD.** Strip, on entry, and restore on exit:
the health/stamina/water bars, the well-fed badge, the minimap, the compass, the
FPS chip, the weather badge, and every menu button for a system the lesson world
does not contain (skills, crafting, quests, map).

**Start the child with a block in hand.** If slot 1 holds an axe — because that is
what every saved character carries — then the first act of a child who cannot yet
read the prompt is to click on the world and chop a hole in their own work mat.

Do not caption harmless animals with threat labels. A hen is "Chicken", not
"Chicken — HARMLESS".

Keep: the prompt, the hotbar, the crosshair, the camera toggle (hiding it can
strand a child in a mode they cannot leave), and Settings, where the larger text
and read-aloud controls live.

### The content, and the trap

The obvious plan is ninety lessons, ten per grade, K to 8. **Do not build that.**
It produces ninety copies of "put N things in a rectangle" with a different story
painted on each one, and the child can tell.

Build **three mornings, done properly**, and ship none of them until it is as good
as the first:

| Morning | The question behind it | What it covers |
|---|---|---|
| Before the Bell | how many are there | matching, counting, sorting, adding |
| The Mill on Marrow Brook | how many are **left** | subtraction, number bonds, comparing |
| Market Day at Thistlewick | how they are **arranged** | pattern, equal groups, shape, symmetry |

Rules that make them different from a worksheet:

- **The number comes off the world.** Nobody says "count to four" — there are
  four cows in the byre and they each want an apple, so you count the cows.
  Nobody says "sort by colour" — two kinds of feed got tipped into one heap and
  there are two bins.
- **Every stop is a job somebody needs doing**, the maths is *how* you do it, and
  **the place visibly changes** when you have. Mend the rail and the gate opens.
- **Six stops, six different verbs**, and enforce it in the test suite. Six stops
  that are the same activity is a worksheet whatever the story says.
- **One valley, three mornings, one guide.** A four-year-old who has spent a
  morning with Nan Willow should not arrive at the mill and be handed to a
  stranger. Each morning is a genuinely different **place** — its own ground, its
  own buildings — not the same lane repainted.
- **Nothing chains.** Each morning ends with "off you go and play" and means it.
  Finishing banks half an hour and hands the child back their day.
- The maths is Reception level throughout. The reading is nil.

### The ledger

A separate, storage-agnostic module holding the whole state machine as one
serializable object: mode (`free` | `education`), banked play seconds, a lifetime
play clock, lesson attempt history, lock state, and a config (minutes per lesson,
optional daily free allowance, warn-before-empty seconds). In education mode,
completing a lesson banks minutes and active play spends them; an empty bank
locks play behind a friendly "finish a lesson" screen while the world stays
saved. Keep it storage-agnostic so a parent dashboard can own the same state
later without touching game code.

**Test:** unit-test the ledger's arithmetic and lock transitions. Auto-solve every
lesson from its shape declarations and assert each one completes — a lesson
nobody has proven finishable is a lesson that will strand a child. Then drive
each lesson in a real browser, and separately assert the **chrome**: that the
survival HUD is gone inside a lesson, that the first hotbar slot holds a block,
and that the ordinary world still has its full HUD and gets it all back on exit.

---

# Testing discipline

Two layers, both required.

**Unit** (`node --test tests/unit/*.test.mjs`): worldgen determinism, XP curves,
recipe reachability, drop tables, data integrity across every registry, save
round-trips, the education ledger, model-format validation. Aim for hundreds of
these; they are what let you refactor the engine without fear.

**End-to-end** (Playwright, headless Chromium, driving the *real* game): boot and
walk, accept a quest through the dialogue UI, chop a tree by holding the mouse,
craft through the crafting window, watch a node deplete to a stump and regrow,
fight the boss through both phases, reload and verify persistence, mobile touch
input, two-client multiplayer, PWA offline, and the lesson suites.

Also build **screenshot harnesses** — small scripts that pose the camera at a
tree, a building, a creature, a texture contact sheet — and *look at the output*.
Several of the worst bugs in this game were invisible to assertions and obvious
in a picture: flowers too thin to see, mushrooms with no bodies, reeds that did
not exist.

Two rules learned the hard way:

- **Check a value against the thing it is supposed to match, not against
  plausibility.** Every multiplayer bug that shipped — remote players drawn facing
  backwards, never animating, each browser keeping its own time of day — was a
  value that looked reasonable with nothing to compare it to. Assert the drawn
  facing against the direction that player is actually looking; the walk pose
  against whether the legs moved between frames; one browser's clock against the
  other's.
- **Do not let the service worker race the e2e suite.** Register it only when the
  page is opened with `?sw=1`. Otherwise every timing-sensitive test is racing a
  worker busy caching the build.

# Traps found the hard way

- Season and altitude both feed temperature. Get the curve wrong and it snows in
  spring at sea level. Unit-test temperature at known (day-of-year, altitude)
  pairs.
- HUD elements that stack will eventually overlap on some aspect ratio. Lay the
  HUD out as regions, not as absolutely-positioned corners chosen by eye.
- Animation driven by wall time instead of distance travelled makes creatures
  moonwalk whenever their speed changes.
- Anything that regenerates on a timer must store a timestamp, not a countdown,
  or a reload resets it.
- A quest that can be accepted twice, a recipe whose input is unobtainable, and a
  lesson step with no solution are all the same bug: content that was never
  played. Auto-play every content path in tests.

# Voice

The README and the docs are read by a parent, not a developer. Say what the thing
does and what it costs. When a trade-off was made — no anti-cheat, no code
signing, a name as the whole identity — state it plainly, say who it is right
for, and say who it is not right for. Do not oversell, and do not hide the
Android https caveat in a footnote.

Commit messages describe what changed for the player, not which files moved.
