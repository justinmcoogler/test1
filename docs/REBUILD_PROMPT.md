# Rebuild prompt — Sproutlands

Paste everything below the line into Codex as the opening prompt. It is written
to be handed to an agent with an empty repository.

---

Build **Sproutlands**: an original, **grounded** voxel sandbox RPG that runs in a
browser, plus a LAN server so a family can play it together, plus a Learning Mode
for a four-year-old who cannot yet read.

This is a large build. Work through the milestones in order. Each milestone must
end with the game **playable** — not a scaffold, not a stub — and with tests that
prove it. Do not move to the next milestone until `npm run test:all` is green.

## Hard constraints

These are not preferences. They shape every decision below.

1. **Nothing in this world is imaginary.** No monsters, no magic, no spells, no
   enchanting, no undead, no elementals, no golems, no dragons, no goblins, no
   sprites, no floating islands, no portals, no glowing runes. Every creature is
   an animal that exists or has existed. Every material is one you could hold.
   Every threat is a predator, a person, an injury or the weather. Every craft is
   one somebody really practised.

   **The period is medieval to early renaissance — up to and including black
   powder.** Swords, bows and flintlocks coexist, which is historically true.
   Nothing modern-industrial: no titanium, no steam engines, no electricity.

   When a system needs a fantasy element to work, that is a signal the system is
   wrong, not a licence to add one. The two places this bites hardest are called
   out where they arise (the hostile roster in Milestone 5, and vertical
   progression in Milestone 7); both have real answers that are better than the
   invented ones.

2. **No third-party runtime dependencies.** Not one. No three.js, no Babylon, no
   React, no physics library, no tweening library. `devDependencies` may contain
   only a test runner (Playwright), and a bundler + `postject` used *solely* for
   packaging the server as a single-file executable. The game itself imports
   nothing it does not contain.
3. **No build step to play.** Plain ES modules, served statically, opened in a
   browser. `npm run serve` starts a static file server and that is the whole
   toolchain. If a change requires a compile before it can be played, it is the
   wrong change.
4. **Plain JavaScript.** No TypeScript, no JSX, no decorators. Use JSDoc if you
   want types.
5. **Custom WebGL2 renderer.** You are writing the shaders, the chunk mesher, the
   frustum culling and the atlas packing yourself.
6. **Every asset is generated, not sourced.** Textures are painted procedurally
   into an atlas at load time from code. Audio is synthesized with WebAudio — no
   sample files. Creature and prop models are voxel data in JSON authored in this
   repo. Fonts are the one exception (a bitmap-style webfont is fine). Nothing is
   copied from Minecraft or any other game — not a texture, not a model, not a
   block name, not an animal name, not a recipe.
7. **Node 18+ for the server, with no install.** `node server/server.mjs` must
   work in a fresh clone. `npm install` is only ever needed to run the tests.
8. **Desktop, tablet and phone.** WebGL2 is the only requirement. Touch is a
   first-class input, not an afterthought bolted on at the end.

## Layout

```
index.html            entry; loads js/main.js as a module
css/                  style.css, fonts.css
js/core/              math, seeded RNG, value/simplex noise, event bus, synthesized audio
js/gfx/               WebGL2 helpers, procedural texture atlas, chunk mesher (AO),
                      renderer, icon rasteriser, voxel-model painting
js/world/             block registry, worldgen + climate biomes, structures, roads,
                      settlements, mines, caves, sky, weather, chunk store
js/player/            physics, desktop controls, touch controls
js/game/              materials, items, skills, inventory, crafting, nodes, animals,
                      combat, NPCs, quests, saves, characters, mounts, curriculum/
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
  Separate pass for transparent blocks. Dynamic resolution scaling: if frame time
  exceeds budget, render at a lower internal scale and upsample, so a cheap
  tablet stays smooth instead of dropping to a slideshow.
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

# Milestone 2 — the material spine

**Do this before content, and generate content from it.** One file is the single
source of truth for every metal, wood, stone, fibre and gem in the game, ordered
by real-world rarity, hardness and smelting difficulty. Blocks, items, nodes,
recipes, worldgen and the texture manifest are all derived from it and validated
against it.

The metal ladder is real metallurgy, in the order humans actually worked it:

**copper** (soft, sometimes found native — the first metal) → **tin** (scarce
partner metal, not used alone) → **bronze** (copper + tin) → **iron** (abundant
ore, needs a much hotter furnace) → **steel** (iron + carbon) → **damascus**
(folded and refined) → **meteoric iron** (nickel-iron from a crater; genuinely
worked in antiquity, and the right rare cap precisely because it is real).

Plus the support materials that make the chain work: **coal** for fuel,
**charcoal** as the earlier fuel, **lead** for shot, **zinc** for brass,
**sulfur** and **saltpeter** for powder, **limestone** for mortar and flux.
Precious metals and gems are jewellery only — never weapons, never armour.

Each entry declares its role (tool / alloy / fuel / ammo / jewellery), its tier,
and the skill level needed to gather, smelt or work it. Everything downstream
reads those numbers rather than restating them.

**Test:** every material is reachable from the starting world; every alloy's
inputs exist; no id collisions; the tier ordering is consistent with the skill
gates.

# Milestone 3 — the world worth looking at

- **Procedural texture atlas.** Every block texture is *painted in code* into a
  64×64 tile: noise, strata, grain, speckle, edge wear. Bake into one atlas at
  load with mipmaps. Keep the painter functions small and named after what they
  draw. Write a screenshot harness that renders every tile to a contact sheet.
- **Sky.** Day/night on a fixed-length day (480 seconds works well). Sun and moon
  positions, a gradient sky through dawn/day/dusk/night, stars that fade in,
  clouds. Fog to hide the chunk-load boundary.
- **Climate, not fantasy zones.** Generate temperature and rainfall fields from
  latitude, altitude and continental noise, then **look up the biome from that
  pair** the way real climate classification does. You should get, and should
  name honestly: grassland, temperate forest, temperate rainforest, deep wood,
  boreal forest, tundra, polar ice, alpine meadow, snowy mountains, mountains,
  chalk downs, mediterranean shrubland, savanna, desert, cold desert, monsoon
  forest, tropical rainforest, marshland, swamp, mangrove coast, coast, volcanic
  fields. No "corrupted" or "cursed" anything — a hostile place is hostile
  because it is high, dry, freezing or a long way from help.
- **Seasons and weather** driven by the same fields: rain, snow, storms, fog.
  Get the season curve right — see *Traps*.
- **Difficulty is remoteness.** The further from the starting settlement, the
  harsher the climate, the scarcer the shelter, the larger the predators and the
  longer the walk home. That is your difficulty curve and your exploration
  incentive in one honest mechanism.

**Test:** biome lookup determinism, sky colour at known times, temperature at
known (day-of-year, altitude, latitude) triples, and a flyover screenshot suite.

# Milestone 4 — survival, and a body that can fail

This is where a grounded game earns the word. The player has a body with real
needs, and every one of them is a design lever.

- **Core temperature.** Ambient temperature comes from biome, altitude, season,
  time of day, weather and wind. Wet clothing and immersion cool you fast. Fire,
  shelter, and layered clothing warm you. Hypothermia and heatstroke are real
  failure states with visible warning stages, and acclimatization softens both
  over time.
- **Hydration and nutrition.** Water sources need finding and often boiling. Food
  has an actual nutritional profile, not a single "hunger" number — a diet of
  only meat should eventually be a problem. Preservation is a craft: drying,
  salting, smoking, fermenting.
- **Injury.** Wounds, bleeding, fractures and infection, treated with real first
  aid — pressure, bandages, splints, poultices, cleaning. Not a health potion.
- **Fuel-temperature smelting.** Different fuels reach different temperatures,
  and an ore that needs a hotter furnace than your fuel provides simply will not
  reduce. This is why the metal ladder is a ladder: iron is gated behind coal and
  a better furnace, not behind an arbitrary level number.
- Health, stamina, sleep. Sleep in a bed to pass the night.
- Hotbar, inventory grid, chests, drag-and-drop that works with touch.
- **Resource nodes** — trees, ore veins, clay pits, reed beds, fishing spots,
  herb patches, berry bushes, dig sites, farm plots. A node holds limited
  charges, shows a **depleted state** (a stump, a spent face), and **regenerates
  on a real timer that survives saving and reloading**. Store the wall-clock
  timestamp, not a tick count.
- **Crops** grow through visible stages on a timer. Eight stages for wheat reads
  far better than three. Livestock breed and need feeding.

**Test:** temperature model at known conditions, dehydration and starvation
timing, wound and infection progression, smelting success/failure across
fuel-ore pairs, node regen across a simulated reload, crop stage timing.

# Milestone 5 — skills, craft, and gear

**21 skills, levels 1–99, XP through use**, named for the real craft rather than
a game-ism. Use a stable internal key and a separate display label so content and
saves never break when a name changes.

- *Gathering* — Mining, Woodcutting, Fishing, Foraging, Hunting, Farming,
  Handling (winning the trust of animals).
- *Processing* — Smithing, Woodworking, Cooking, Tailoring, Apothecary,
  Construction, Jewelcraft.
- *Survival* — Constitution, Medicine, Athletics.
- *Combat* — Strength, Defense, Marksmanship.
- *Knowledge* — Archaeology.

An exponential curve so early levels come fast. Gathering speed and yield scale
with level *and* tool tier. Visible unlock tables so a player can see what the
next level buys. **No Magic. No Enchanting.** If you find yourself wanting a
skill that does something impossible, you have found a design gap, not a missing
skill.

**Crafting**, 60+ recipes, across hand-crafting plus real stations: workbench,
furnace, forge and anvil, campfire, loom, tannery, apothecary's bench,
lapidary's wheel, construction bench. Tool durability that dulls and is
resharpened before it breaks. Some recipes learned by handling an unfamiliar
material.

**Equipment**, 11 slots, with real tradeoffs — mail is heavy and hot, leather is
quiet and cool, a shield costs you a hand. Clothing feeds directly into the
temperature model, so dressing for the weather is gear optimisation. Worn gear
must **change the player's voxel model**, or none of it feels earned.

**Test:** XP curve monotonicity and level boundaries, every recipe's inputs exist
and are reachable from the starting world, durability arithmetic, no item id
collisions, and that every piece of clothing declares its insulation.

# Milestone 6 — animals, and the things that can hurt you

**A voxel model format** of your own: a JSON file listing named boxes with size,
origin, pivot, rotation and per-face UVs into a per-creature texture, plus named
animations as keyframed pivot rotations. Write an importer so models can be
authored outside the code, and a validator that rejects floating boxes and
off-atlas UVs.

**The roster is small on purpose.** A bestiary of sixty reads like a list someone
was filling in; you cannot tell at a glance whether the thing across the field is
a threat, and you never learn, because each appears too rarely to teach you
anything. Aim for **about twenty**, and make each one legible.

- **Livestock and domestic animals** — the world's calm. Cattle, sheep, pigs,
  goats, chickens, ducks, geese, horses, donkeys, dogs, cats. They live near
  settlements and mostly ignore you. They are also your farm, your wool, your
  milk and your transport.
- **Wild game** — deer, hare, boar, wildfowl, fish. Hunted for meat, hide, sinew,
  bone and antler. They flee, and they are *hard to approach*: scent, wind
  direction, noise and cover should all matter. Hunting well is a skill, not a
  click.
- **Vermin** — rats, crows, foxes. The floor of the threat scale, and a real
  problem for stored grain and a henhouse.
- **Predators** — wolves, bear, lynx, wild dogs. **These are not monsters and
  must not behave like them.** A predator does not beeline at you across a field
  because you exist. It is territorial, or hungry, or defending a kill or its
  young. It assesses you: a lone wolf in summer avoids a healthy adult; a pack in
  a hard winter does not. A wounded animal breaks off and runs. Being able to
  read that — and to back away slowly rather than fight — is the mechanic.
- **People** — bandits, poachers, raiders, deserters, camped in places you can
  find and avoid or clear. **This is your hostile faction**, and it is the honest
  replacement for a monster roster. A person demands your purse before drawing.
  A person can be paid, intimidated, ambushed or outrun. A person surrenders. A
  camp has sentries, a fire, loot worth taking and someone in charge of it.

**Combat.** Click to engage; blows exchange on weapon-speed timers. Damage
numbers. Attack styles route XP to different skills. Food eaten from the hotbar
mid-fight. Auto-retaliate. Fleeing is just running away — and against animals it
should often be the correct play. Ranged safespotting from a ledge works: it is a
reward for using terrain, which is exactly what a real hunter does.

**Instead of a boss**, build **apex encounters** that are dangerous for real
reasons and telegraph honestly:
- a bear defending a carcass, which stands, huffs and bluff-charges *before* it
  commits — the warning is the mechanic, and walking away is a win;
- a wolf pack in deep winter that circles, tests, and cuts you off from home;
- a fortified bandit camp with a captain, sentries to remove quietly or loudly,
  and the option of doing it at night;
- and the weather itself: a blizzard, a flooded mine level, a cave-in. A storm
  that can kill you is a better antagonist than anything with a health bar.

**Gaits.** Legs must move, and move *correctly*: a walk cycle driven by distance
travelled, not by wall time, or animals moonwalk when they slow down. Quadrupeds
diagonal-pair, bipeds alternate. **Pathfinding** on the voxel grid with jump and
drop costs.

**Test:** damage formulas, drop tables, predator decision-making across
(hunger, pack size, player condition) cases — assert that a lone wolf in summer
*declines* — a Playwright suite that fights through an apex encounter, and a gait
test that asserts the legs are in different positions between two frames while
walking.

# Milestone 7 — a world with people in it, and somewhere to go

- **A hand-authored starter settlement.** Not procedural. Place it block by block
  via a schematic format with an importer tool. It is the first thing anyone sees.
- **Procedural villages, farmsteads, roads and camps** further out. Roads bend
  around terrain rather than bulldozing it.
- **Depth, distance and altitude are the progression axes.** This is the honest
  replacement for a fantasy vertical axis, and it is a better one, because each
  gate is a real problem with a real solution:
  - **Down** — a working mine goes deeper than a cave. Depth brings darkness
    (lamps, and the fuel to keep them lit), water (drainage), bad air
    (ventilation shafts), and unstable rock (shoring timber). Every rung of the
    metal ladder lives deeper than the last, so mining infrastructure *is* the
    tech tree.
  - **Out** — remoteness means no shelter, no resupply and a long walk. It is
    gated by food preservation, water carriage, pack animals and a cart.
  - **Up** — alpine terrain needs rope, warm layers, and Constitution enough to
    handle thin air. The mountain does not need a ceiling rule; the cold and the
    climb are the ceiling.
- **Real underground:** natural cave systems, historic abandoned workings,
  catacombs and barrows. **Archaeology is a real discipline here** — excavate
  strata for artefacts, and dig fossils of animals that genuinely went extinct.
  That is where wonder comes from in a grounded world: the past, not the impossible.
- **Waystones become roads, inns and stables.** Fast travel is a coach, a river
  boat or a horse you actually own and have to feed.
- **Mounts and working animals** — horse breeds with real differences in speed,
  stamina and temperament; donkeys and mules to carry what you cannot. The
  Handling skill paces taming and training. No flying mounts, because there is no
  animal you could ride into the sky.
- **NPCs** with dialogue trees, a merchant who buys and sells, and a quest chain
  that **teaches the entire game** — fell timber, craft a bench and tools, mine
  copper and tin, smelt bronze, build and heat a shelter, cook and preserve food,
  treat a wound, then equip properly and deal with the bandit camp on the road.
  A player who follows the marker has been taught every system without a tutorial.

**Test:** every quest step completable from a fresh save, driven through the real
dialogue UI; settlements place no building inside terrain; roads connect; every
mine depth is survivable with the equipment obtainable by that point.

# Milestone 8 — the second way to play

Ship a **Classic view**: third person with click-to-move, toggled with **V** or in
Settings. Click the ground to walk there, with automatic hops up small ledges.
Click a tree or vein to walk over and gather until depleted. Click an animal to
walk over and engage, auto-following. Click an NPC to talk. Shift+click
(long-press on mobile) breaks a block; right click places one. Middle-drag or
arrow keys orbit; wheel zooms; WASD still walks camera-relative.

This is not a camera mode. It is a complete second control scheme over the same
game, and it needs its own e2e suite.

**Mobile controls:** left virtual joystick, right side drag to look, large touch
buttons for gather / jump / sprint / place, and a left-handed layout in Settings.
Menus need touch-sized targets throughout.

# Milestone 9 — saving

Three save slots in localStorage. Persist: seed, every block edit, node regen
timers, skills, inventory, equipment, quests, chest contents, kills, discovered
map, settings, and the body's state. Autosave plus manual save.

**Write atomically wherever you can, and refuse to load a save whose seed does not
match the world.** Replaying one world's edits onto another world's terrain gives
you doors in cliff faces, and the save is somebody's afternoon.

# Milestone 10 — multiplayer, for a house

The audience is one family on one wifi. Design for that, and say so.

- **One port.** Serve the game and the websocket from the same http server, so
  the address on screen is the only address there is. No configuration.
- **The server is authoritative over the world, the animals, the clock and the
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
  animals, recipes, lesson progress, position. Play on the iPad, put it down,
  pick up the laptop, be the same person. Nothing about a character is written to
  the browser while connected: one copy, or it is not really saved. Device-local
  settings (text scale, handedness, sensitivity) stay device-local — those are
  properties of the screen, not the child.
- **Persistence:** one JSON file per seed, written every minute while dirty, when
  the last player leaves, and on SIGINT. Write-then-rename so a crash leaves the
  previous save intact. A save that will not parse, or belongs to another seed,
  **stops the server** rather than being overwritten.
- **Flags:** `--seed`, `--save`, `--no-save`, `--time`, `--tls`.
- **Package the server as a single-file executable** for Windows, macOS and
  Linux, with the entire game inside the binary — bundle the client, embed it as
  a blob in a Node SEA, inject with postject. A parent downloads one file,
  double-clicks it, and reads an address off the console. Build each platform on
  a CI runner of its own kind, **start the result there and ask it for a file that
  could only have come from inside it**, then publish to a release. Put the direct
  download link in the README — not "go to the Actions tab".

**Test:** two real browser contexts in one Playwright run. Prove the world is
shared. Prove the *people* are shared: play as a child in one context, close it,
join from a **second context with its own storage**, and assert same levels, same
pack, same coordinates. Then stop the server, read the save file, start it again.

# Milestone 11 — install it

Make it a PWA: web app manifest, maskable icons, and a service worker caching the
whole build so it starts and plays with the wifi off. An install button on the
title screen, and an "Add to Home Screen" explainer for iOS, which never offers a
prompt. Document the Android catch honestly: service workers need a secure
context, a LAN `http://` address is not one, so ship a self-signed cert tool and
a `--tls` flag for parents who want the icon.

**Test:** register the worker, pull the network, reload, and assert the game —
modules and all, not just the HTML shell — still comes up.

---

# Milestone 12 — Learning Mode

**Design this from scratch.** What follows is a brief and a set of boundaries,
not a specification to implement. There is no existing design to port and you
should not infer one. Decide the shape yourself, write the design doc first, and
justify it against the constraints below.

## Who it is for

**A child of four to six who is still being read to and cannot read the screen.**
Everything else follows from that single fact. If a feature only works for a
child who can read, it does not work.

## What it is for

A parent wants their child's screen time to buy something. The mode should make
real early-years learning — Reception-level maths, roughly: counting, one-to-one
correspondence, sorting, comparing, subtraction within ten, pattern, shape — into
something the child *does*, in the game, with the blocks they already know how to
place.

## Boundaries — these are not negotiable

1. **Every word is spoken aloud** (SpeechSynthesis). Text on screen is a courtesy
   to the adult in the room, never the channel. A lesson that can only be
   understood by reading it is a locked door.
2. **The child performs, they do not answer.** No multiple choice, no quiz UI, no
   buttons labelled A/B/C. Whatever the activity is, the child does it with the
   game's own verbs — walking, placing, gathering, feeding. If you could ship it
   as a worksheet, it is a worksheet.
3. **Nothing is punitive.** No score, no timer, no failure state, no red X. A
   wrong attempt simply does not advance; hints are available for the asking; the
   child keeps trying. Getting it wrong must cost nothing but another go.
4. **It has its own world, and its own save.** Blocks placed for a counting
   exercise must never become real edits to the child's actual world. Entering
   and leaving must be lossless — the child returns to exactly where they stood.
5. **Strip the screen to what the activity needs.** The lesson world has no
   night, no weather, no distance, no predators and no hunger, so it must not
   inherit the survival HUD — no health, stamina, water or temperature readouts,
   no minimap, no compass, no FPS counter, no menu buttons for systems that do
   not exist in there. Restore all of it on the way out, and **test both
   directions**.
6. **Hand the child the right tool, in the right slot.** If slot one holds an axe
   — because that is what every saved character carries — then the first act of a
   child who cannot read the prompt is to click on the world and destroy their own
   work. Whatever the activity needs must be what is already in hand.
7. **Show where things go.** A child who does not know what is being asked needs
   the target visible, not merely described. Reveal it *when the question is
   asked*, never before, and let a parent switch it off for a child who is past
   needing it.
8. **Every activity must be machine-solvable, and the test suite must solve it.**
   Whatever structure you choose, it has to be possible to generate a correct
   solution from the activity's own declaration and play it through
   automatically. An activity that only a human can complete is one nobody can
   prove is finishable — and a four-year-old stuck on step five with no way
   forward is the worst outcome this mode has. This constraint should drive your
   whole architecture: prefer declarative activity definitions that yield the
   check, the solution, the materials handed over, and a guarantee the answer
   fits in the space provided.
9. **Content is data, separate from the runner**, in its own directory, so a
   lesson is authored like a quest and not like a code change.
10. **Earning is character-side.** Whatever finishing grants, store it with the
    character rather than the world, so a child who starts a new world keeps what
    they earned.

## The trap — read this before you plan the content

The obvious plan is broad coverage: a curriculum of dozens of lessons across
several grades. **That plan fails, and it fails in a specific way.** It produces
many copies of one activity with a different story painted on each, because the
easiest activity to implement — put N objects in a marked space — can be dressed
as counting, adding, sorting, grouping or pattern-making without changing at all.
The result looks like a curriculum on a spreadsheet and reads to the child as the
same thing over and over. They notice immediately.

Build **a small number of genuinely different experiences instead**, and ship none
until it is as good as the first. Two tests for whether an activity is real:

- **Does the number come off the world?** "Count to four" is a worksheet. Four
  cows in a byre that each want feeding is a reason to count. The quantity should
  be something the child observes, not something they are told.
- **Does the place change when they are done?** If the work is real, the world
  should visibly show it — a mended fence that now opens, a fed animal that
  settles, a full basket. A congratulation message is not a consequence.

And one structural rule: **if the activities within a lesson all use the same
verb, it is one activity repeated.** Vary the verb, and enforce that in tests.

Everything else — how a lesson is structured, how it is presented, where it
happens, who guides it, how progress is tracked, how a parent configures it — is
yours to design. Write the doc, then build it.

## The ledger

Whatever the lessons look like, keep the accounting in a separate,
storage-agnostic module: one serializable object holding mode, banked play time,
a lifetime play clock, attempt history, lock state and configuration. In
education mode, finishing a lesson banks minutes and active play spends them; an
empty bank pauses play behind a friendly screen while the world stays saved. Keep
it storage-agnostic so a parent dashboard can own the same state later without
touching game code.

**Test:** the ledger's arithmetic and lock transitions as unit tests; every
activity auto-solved and asserted to complete; each lesson driven in a real
browser; and the chrome assertions from boundary 5 and 6, in both directions.

---

# Testing discipline

Two layers, both required.

**Unit** (`node --test tests/unit/*.test.mjs`): worldgen and climate determinism,
XP curves, the material spine's internal consistency, recipe reachability, drop
tables, the temperature and nutrition models, save round-trips, the education
ledger, model-format validation. Aim for hundreds; they are what let you refactor
the engine without fear.

**End-to-end** (Playwright, headless Chromium, driving the *real* game): boot and
walk, accept a quest through the dialogue UI, fell a tree by holding the mouse,
craft through the crafting window, watch a node deplete to a stump and regrow,
survive a cold night, work through an apex encounter, reload and verify
persistence, mobile touch, two-client multiplayer, PWA offline, and the lesson
suites.

Also build **screenshot harnesses** — small scripts that pose the camera at a
tree, a building, an animal, a texture contact sheet — and *look at the output*.
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
  spring at sea level, or a player freezes in a temperate summer. Unit-test
  temperature at known (day-of-year, altitude, latitude) triples.
- HUD elements that stack will eventually overlap on some aspect ratio. Lay the
  HUD out as regions, not as absolutely-positioned corners chosen by eye.
- Animation driven by wall time instead of distance travelled makes animals
  moonwalk whenever their speed changes.
- Anything that regenerates on a timer must store a timestamp, not a countdown,
  or a reload resets it.
- A quest that can be accepted twice, a recipe whose input is unobtainable, and a
  lesson step with no solution are all the same bug: content that was never
  played. Auto-play every content path in tests.
- A roster that grows because adding one more is easy will stop being legible
  long before it stops being possible. Cap it deliberately.

# Voice

The README and the docs are read by a parent, not a developer. Say what the thing
does and what it costs. When a trade-off was made — no anti-cheat, no code
signing, a name as the whole identity — state it plainly, say who it is right for,
and say who it is not right for. Do not oversell, and do not hide the Android
https caveat in a footnote.

Commit messages describe what changed for the player, not which files moved.
