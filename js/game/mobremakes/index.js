// Registry of remade mob models — detailed parts + per-creature painted UV
// skins (see js/game/mobremake.js for the def format). One module per batch;
// a type present here overrides the flat legacy model in enemies.js.
//
// Four batches is the whole roster: the farm animals, the goblins (plus the
// rat), the town training dummy, and the mounts. See js/game/enemies.js for why
// the bestiary is deliberately this small.
import { TOWN } from './batch_town.js';
import { GOBLINS } from './batch_goblins.js';
import { FARM } from './batch_farm.js';
import { MOUNTS_BATCH } from './batch_mounts.js';

export const MOB_REMAKES = {
  ...TOWN, ...GOBLINS, ...FARM, ...MOUNTS_BATCH,
};
