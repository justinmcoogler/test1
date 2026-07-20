# Education mode — architecture (foundation shipped, content later)

The product has two play modes. **Free play** is the survival sandbox as it
exists today. **Education mode** gates play time behind lessons: completing a
lesson banks minutes, active play spends them, and an empty bank locks the game
behind a friendly "finish a lesson" screen while the world stays saved.

The full backend for this is already built and tested in
[`js/game/education.js`](../js/game/education.js) — it just lies dormant until
a save is switched into education mode. Only lesson *content* and the lesson
player UI remain for a later phase.

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

## What the next phase adds

1. **Lesson content packs** — data files registered via `registerLesson()`
   (`{ id, subject, title, minutes, minScore, repeatable, payload }`), mirroring
   how quests and custom mobs are data-driven.
2. **Lesson player UI** — a window that renders a lesson's `payload`
   (questions, reading passages…), scores it, and calls
   `education.completeLesson(id, { score })`. The lock screen gets a
   "Start a lesson" button wired to it.
3. **Guardian settings surface** — mode switch + config, ideally PIN-guarded.
4. **Server sync (optional)** — because all state flows through
   `serialize()`/`deserialize()` and the events above, a backend adapter can
   mirror state to an account, deliver lesson packs, and power a
   parent/teacher dashboard without changes to game code.

## Design guardrails

- The world simulation is never damaged by locking: the game autosaves at the
  lock moment and the overlay simply sits above a paused-input game.
- Lessons grant *time*, not gameplay power — keeping the incentive clean.
- All accounting is server-replaceable: nothing in the game trusts the clock
  or balance beyond what a future backend could re-issue.
