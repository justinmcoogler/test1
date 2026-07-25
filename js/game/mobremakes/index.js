// Registry of remade mob models — detailed parts + per-creature painted UV
// skins (see js/game/mobremake.js for the def format). One module per region
// batch; a type present here overrides the flat legacy model in enemies.js.
import { WARDENS } from './batch_wardens.js';
import { MEADOW } from './batch_meadow.js';
import { WETLANDS } from './batch_wetlands.js';
import { HIGHLANDS } from './batch_highlands.js';
import { DRYLANDS } from './batch_drylands.js';
import { FROST } from './batch_frost.js';
import { EMBER } from './batch_ember.js';
import { FARM } from './batch_farm.js';
import { WOLF } from './batch_wolf.js';
import { VERMIN } from './batch_vermin.js';
import { FOLK } from './batch_folk.js';

export const MOB_REMAKES = {
  ...WARDENS, ...MEADOW, ...WETLANDS, ...HIGHLANDS, ...DRYLANDS, ...FROST, ...EMBER, ...FARM, ...WOLF, ...VERMIN, ...FOLK,
};
