# Education mode — architecture

The product has two play modes. **Free play** is the survival sandbox as it
exists today. **Education mode** gates play time behind lessons: completing a
lesson banks minutes, active play spends them, and an empty bank locks the game
behind a friendly "finish a lesson" screen while the world stays saved.

The ledger lives in [`js/game/education.js`](../js/game/education.js); the
lessons themselves live in [`js/game/curriculum/`](../js/game/curriculum/) and
are run by [`js/game/lessons.js`](../js/game/lessons.js).

## The curriculum

**One lesson, done properly.** There were ninety, one story each, told over five
prompts on a work mat in a sealed room. They were rejected for what they were: a
worksheet with a skybox. What replaced them is a single lesson built the way all
the others will be, and nothing ships until it is that good.

### Before the Bell — the morning round at Honeywood Farm

Nan Willow's knee has finally gone and the animals have not been seen to. The
child takes her round for her: six stops up a farm lane, each one a place with
animals in it that need something, ending at the bell.

| Stop | Place | What is asked | What it teaches |
|---|---|---|---|
| 1 | Hen house | one egg on each of three strawed nests | one-to-one correspondence |
| 2 | Byre | count the cows, then one apple per trough | the number comes off the world |
| 3 | Field gate | a row of eight planks to mend the rail | counting a row, and an obstacle |
| 4 | Feed store | four red apples one side, four green the other | sorting by one attribute |
| 5 | Top field | find the lamb that got out through the wall | searching a real place |
| 6 | The bell | write `3 + 4 = 7` in number blocks | writing the arithmetic down |

Every step is READ ALOUD, one instruction at a time, and every number in it is
said out loud rather than only shown. The lesson banks **30 minutes** of play and
pays 40 coins, two loaves and six eggs.

- **You walk it.** ([`js/world/lessonpath.js`](../js/world/lessonpath.js).) A
  gravel lane through a hedged farm, a stop every twenty blocks. Each step has two
  halves — **travel** then **work** — and nothing is judged while the child is
  walking. Arriving is what starts a stop, and arriving turns the child to face
  the plot, because "it is behind you" is not a thing this game should ever need
  to say to a five-year-old.
- **Gold lights show the way.** The same quest trail dots the survival game uses
  (`game.lessonDest` → `updateQuestTrail`), pathfound along the lane. "Follow the
  lights" is an instruction that needs no reading at all. The one stop the child
  is meant to SEARCH gets no dots, because dots to the lost lamb would be the
  whole activity done for them.
- **The numbers come off the world.** Three hens stand behind three nests; four
  cows stand in front of four troughs. "Count the cows, that is how many apples"
  is only a real question if the cows are really there — so a lesson world is the
  one world besides the child's own that spawns creatures, and the pen goes in
  FRONT of the shed so no animal is ever hidden inside its own byre.
- **The gate really bars the lane** until the rail is mended, and then it is
  *gone* — the whole span, not just the middle, because a child who finds a way
  round a closed gate has learned that the game is lying. That is the difference
  between an obstacle and a next button.
- **The lost lamb is really there.** The stop declares `find` (where) and `lost`
  (what), and a fifth sheep is standing on that spot behind the wall. "There she
  is!" over an empty corner of a field would be the game lying again.
- **A lesson has a world of its own**, reached by picking it from the menu and
  left by finishing it or asking to go. Nothing a child builds in there touches
  the world they play in, and nothing from that world can reach them: no terrain,
  no caves, no roads, no ore, no night, no weather (the sky is pinned clear — a
  maths lesson should not be rained off), and nothing that can pick a fight.
- **Finishing pays the character**, not the world: banked minutes *plus* coins
  and materials, all on the character side of the save
  ([`js/game/characters.js`](../js/game/characters.js)), so starting a new world
  keeps every minute and every coin.

### How a step is written

A step declares its SHAPE, and [`js/game/buildshapes.js`](../js/game/buildshapes.js)
derives everything else from that one sentence:

```js
{ station: { kind: 'byre', marks: TROUGHS, animals: [{ type: 'cow', n: 4 }] },
  travel: 'Up the lane to the byre — the cows have been shouting since dawn.',
  say: 'Cows get an apple each. Nan did not say how many apples: count the cows.',
  prompt: 'Count the cows, then put ONE apple in each trough.',
  hint: 'One, two, three, four cows. So four apples — one in every stone trough.',
  success: 'Four cows, four apples, one each.',
  build: { kind: 'cells', block: 'apple_red', at: TROUGHS } }
```

From `build` alone the engine gets the **check** (is the plot right?), the
**worked solution** (the moves a child would make), the **kit** (what has to be
in the pack for those moves to be possible), and **validation** (does the answer
even fit on a 13 × 5 × 7 plot?).

`TROUGHS` is declared once and used by BOTH the stop that paints the pads on the
ground and the activity that checks what is on them, so the marks and the answer
cannot drift apart. That is the whole trick to one-to-one correspondence being
checkable: the spots are real places, not a count.

Two of the twenty kinds are not about the plot at all. `reach` is answered by
STANDING somewhere — the spot lives on the station, so a lesson says "eleven
along and thirteen back from this stop", never a world coordinate. `gather` sends
the child out to find things and pick them up, counted as a delta from what they
were holding when the step began (the kit hands out blocks by the dozen, so "do
you have three eggs" would be true before the hunt started).

### Blocks of its own

Learning Mode used to borrow from the building set: white wool for eggs, yellow
wool for apples, light grey wool for the mat. That asks a five-year-old to pretend
a cube is an egg *while* doing the counting, and "sort the red apples from the
yellow ones" is a harder sentence when both apples are squares of felt. There are
now **49 education blocks** (`EDUCATION_BLOCKS` + `LETTER_BLOCKS` in
[`js/world/blocks.js`](../js/world/blocks.js), art in
[`js/gfx/textures.js`](../js/gfx/textures.js)):

- **26 letters**, **10 numerals** and **7 maths signs** — one typeface in three
  card colours (bone, pale blue, pale green), so a child can tell which shelf a
  block is off before they read it. A row of them is read back as a string, which
  is how `word` checks CAT and `sentence` checks `3+4=7` with the same code.
- **6 props**: an egg, a red and a green apple, a lit and an unlit lantern (the lit
  one really emits light), and the work mat itself — squared paper you can stand
  on, so "make a row of five" starts with the row already drawn.

Letters, numerals and signs are craftable at a workbench like any other block. The
props are not: an egg is not something you make at a bench, so they are obtained
inside a lesson — the kit hands out what the steps need and a station can scatter
things to find. `tools/audit.mjs` derives that from the curriculum rather than
exempting a list by name, so a prop block that **no** lesson hands out or scatters
is still reported unreachable.

### Why the lesson can be trusted

[`tests/unit/lessons.test.mjs`](../tests/unit/lessons.test.mjs) walks to every
stop and plays that stop's own declared solution through the real runner, so a
lesson that cannot be finished cannot reach a child — and a shape that cannot fit
fails validation before anyone reads a word of it. It also asserts the things a
reading could never catch: that the marked nests match the eggs asked for, that
the animal count matches the activity, that no animal is standing inside a
building, and that an empty plot completes nothing at any stop.

[`tests/unit/buildshapes.test.mjs`](../tests/unit/buildshapes.test.mjs) is the
other half. Every one of the twenty shape kinds is exercised there against its
own solution, its own empty-plot rejection and its own near misses — coverage
lives there rather than in the curriculum test, where it would only ever mean
"somebody wrote a lesson using it". The kinds are `count`, `sort`, `subtract`,
`bond`, `tower`, `compare`, `pattern`, `array`, `groups`, `word`, `words`,
`fraction`, `mirror`, `stack`, `box`, `frame`, `sentence`, `reach`, `gather` and
`cells`.

[`tests/_lessonwalk.mjs`](../tests/_lessonwalk.mjs) then drives the real game:
walks the lane on the keyboard, checks the gold dots lead somewhere real, does
every stop, checks the gate opens, and photographs each one — because "the farm
is there" and "the farm looks like a farm" are different claims.

Adding a lesson means writing one object in a curriculum file. Everything
mechanical — its area, the lesson that follows it, its minutes, which events
re-check it — is filled in by
[`js/game/curriculum/index.js`](../js/game/curriculum/index.js).

## What's implemented now

- **Modes**: `free` (default) and `education`, per save slot, persisted.
- **Playtime bank**: seconds-precision balance; drains only during *active*
  play (not menus, dialogue, or the lock screen). A lifetime play clock runs in
  both modes (useful for parent dashboards later).
- **Lock flow**: at zero balance the game saves, disables input, and shows the
  lock screen; granting minutes unlocks instantly. A low-balance warning fires
  at a configurable threshold (default 2 minutes).
- **Lesson ledger**: every attempt recorded (`lessonId → [{at, score, passed}]`).
  Passing grants that lesson's minute reward. Registered lessons can enforce a
  minimum score and one-time rewards; unregistered ids also work, so a remote
  lesson service can be the authority.
- **Config**: `minutesPerLesson`, `dailyFreeMinutes` (auto-granted once per
  day), `lockWhenExhausted`, `warnAtSeconds`.
- **Events** (on the global bus, for UI and future sync):
  `educationModeChanged`, `playtimeGranted`, `playtimeLow`,
  `playtimeExhausted`, `playtimeUnlocked`, `lessonCompleted`.
- **Persistence**: the whole state is one JSON blob inside the save slot.
- **Tests**: `tests/unit/education.test.mjs` covers drain/lock/grant/lesson
  scoring/daily allowance/serialization.

## Try it from the console today

```js
const ed = __game.education;
ed.setMode('education', { minutesPerLesson: 10, warnAtSeconds: 30 });
ed.grantMinutes(1);                 // play for a minute → lock screen appears
ed.completeLesson('demo_math_1', { score: 1 });   // banks minutes, unlocks
```

## What a later phase could add

1. **The next lessons** — `farm_morning` is the pattern: a place, a story, stops
   you walk to, an obstacle, and something to search for. Each new one needs a
   route (what the stops are, what is different to do at each, which bar the way)
   and a reason for the numbers to matter to somebody in the story.
2. **Guardian settings surface** — mode switch + config, ideally PIN-guarded.
3. **Grade placement** — one band today; a first-run "how old are you?" would
   open the right one once there are several.
4. **Server sync (optional)** — because all state flows through
   `serialize()`/`deserialize()` and the events above, a backend adapter can
   mirror state to an account, deliver lesson packs, and power a
   parent/teacher dashboard without changes to game code.

## Design guardrails

- **No survival furniture in a lesson.** Inside a lesson world the quest tracker
  hides and NPC dialogue carries no quest offers or turn-ins: Nan is standing on a
  farm of her own, so "talk to Maren at the camp" is advice a child cannot take.
  Talking to Nan re-reads the current step aloud instead of opening a box. Nothing
  in there can pick a fight, animals included.
- **Every dialogue can be closed.** There is a × on the box. The only ways out
  used to be the Escape key and whatever "Thank you." option a node happened to
  carry — which on a phone, on a node without one, was a dead end.
- **The prompt panel can always be got out of the way** and never follows the
  child home. It folds to a 52px strip, caps at 46% of the screen (38% on a
  phone), scrolls its own overflow, and sits *below* the menus. Leaving a lesson
  keeps the child's place on purpose, so the panel has to ask where they are
  rather than only what they were doing.
- The world simulation is never damaged by locking: the game autosaves at the
  lock moment and the overlay simply sits above a paused-input game.
- Lessons grant *time*, not gameplay power — keeping the incentive clean.
- All accounting is server-replaceable: nothing in the game trusts the clock
  or balance beyond what a future backend could re-issue.
