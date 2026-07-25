// Baked mob-config defaults, shipped with the build so every player gets them.
// Local overrides still win over these; "Reset to default" falls back here.
//   { active, rate, biomes: string[]|null, drops: [{item,qty:[min,max],chance}] }
//
// The whole roster is eighteen creatures now (see js/game/enemies.js), and all
// eighteen ship ON. The old file listed a hundred and fifty-odd ids at
// `active: false`, because the world carried a ninety-six-model imported pack
// on top of sixty natives and shipping that lot switched on would have been a
// zoo. A roster small enough to enumerate is a roster you can just turn on.
//
// NOTE: `mobActive` defaults an unlisted native to ON, so anything that should
// ship off has to be named here explicitly.
export const MOB_DEFAULTS = {
  // farm animals — the world's calm
  "cow": { active: true },
  "pig": { active: true },
  "sheep": { active: true },
  "goat": { active: true },
  "horse": { active: true },
  "chicken": { active: true },
  "duck": { active: true },
  "rabbit": { active: true },
  // town
  "practice_dummy": { active: true },
  // vermin
  "rat": { active: true },
  // goblins — the hostile roster, and all of it
  "scrap_goblin": { active: true },
  "bog_goblin": { active: true },
  "cave_goblin": { active: true },
  "ash_goblin": { active: true },
  "frost_goblin": { active: true },
  "goblin_slinger": { active: true },
  "goblin_warchief": { active: true },
  "goblin_warlord": { active: true },
};
