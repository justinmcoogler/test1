# Education mode — architecture

The product has two play modes. **Free play** is the survival sandbox as it
exists today. **Education mode** gates play time behind lessons: completing a
lesson banks minutes, active play spends them, and an empty bank locks the game
behind a friendly "finish a lesson" screen while the world stays saved.

The ledger lives in [`js/game/education.js`](../js/game/education.js); the
lessons themselves live in [`js/game/curriculum/`](../js/game/curriculum/) and
are run by [`js/game/lessons.js`](../js/game/lessons.js).

## The curriculum

**Ninety lessons: ten for each grade band, Kindergarten through Grade 8.** Each
one is a story told in five steps, banks **30 minutes** of play, and is **read
aloud** end to end.

- **A lesson is a story.** Pip loses the hen's eggs in the long grass; the goat
  gets into the cabbages; two toll roads charge differently and cross somewhere.
  Each of the five steps is a beat of it, and each beat asks for something to be
  BUILT on the work mat.
- **Everything is spoken** ([`js/game/speech.js`](../js/game/speech.js)). The
  audience is five to thirteen and four of the ten lessons in every band are
  about learning to read — a prompt that only exists on screen is a prompt half
  of them cannot use. Settings → *Read lessons aloud* turns it off; a platform
  with no voices degrades to a silent game, never a broken one.
- **A lesson has a room of its own**, in a world of its own
  ([`js/world/classroom.js`](../js/world/classroom.js)): a sealed classroom at
  (30000, 30000, 420), reached by picking the lesson from the menu and left by
  finishing it or asking to go. Nothing a child builds in there touches the
  world they play in, and nothing from that world can reach them.
- **Finishing pays the character**, not the world: banked minutes *plus* coins
  and materials, all on the character side of the save
  ([`js/game/characters.js`](../js/game/characters.js)), so starting a new world
  keeps every minute and every coin.
- **Subjects**: roughly six maths and four reading lessons per band, each tagged
  with its Common Core standard (`K.CC.B.5`, `4.NF.B.3`, `8.EE.C.8`…).

### How a step is written

A step declares its SHAPE, and [`js/game/buildshapes.js`](../js/game/buildshapes.js)
derives everything else from that one sentence:

```js
{ say: 'Here come the first eggs, rolling out of the grass. Three of them!',
  prompt: 'Put 3 white blocks on the mat.',
  hint: 'Take a white block from your bag and put it down. Then another…',
  success: 'Three eggs, safe in the nest. Well counted!',
  build: { kind: 'count', block: 'white_wool', n: 3 } }
```

From `build` alone the engine gets the **check** (is the mat right?), the
**worked solution** (the moves a child would make), the **kit** (what has to be
in the pack for those moves to be possible), and **validation** (does the answer
even fit on a 13 × 5 × 7 mat?).

That last pair is why ninety lessons can be trusted. The test suite plays every
step's own solution through the real runner
([`tests/unit/lessons.test.mjs`](../tests/unit/lessons.test.mjs)), so a lesson
that cannot be finished cannot reach a child — and a shape that cannot fit fails
before anyone reads a word of it. The sixteen kinds are `count`, `sort`,
`subtract`, `bond`, `tower`, `compare`, `pattern`, `array`, `groups`, `word`,
`words`, `fraction`, `mirror`, `stack`, `box`, `frame` and `cells`.

Adding a lesson means writing one object in a grade file. Everything mechanical
— its room, the lesson that follows it, its minutes, which events re-check it —
is filled in by [`js/game/curriculum/index.js`](../js/game/curriculum/index.js).

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

1. **Guardian settings surface** — mode switch + config, ideally PIN-guarded.
2. **Grade placement** — the menu currently shows all nine bands and lets the
   child pick; a first-run "how old are you?" would open the right one.
3. **Server sync (optional)** — because all state flows through
   `serialize()`/`deserialize()` and the events above, a backend adapter can
   mirror state to an account, deliver lesson packs, and power a
   parent/teacher dashboard without changes to game code.

## Design guardrails

- The world simulation is never damaged by locking: the game autosaves at the
  lock moment and the overlay simply sits above a paused-input game.
- Lessons grant *time*, not gameplay power — keeping the incentive clean.
- All accounting is server-replaceable: nothing in the game trusts the clock
  or balance beyond what a future backend could re-issue.
