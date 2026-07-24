// Register the Nature Props Pack models (js/gfx/proppack.js) as static 3D forage
// props under `prop_<id>`. Each carries its own embedded texture, so
// registration is async (decode → canvas → GL texture) and reuses the mob remake
// conversion (per-box UV islands). Props have no animations — the game draws them
// at rest in the entity pass; the forage node defs (js/game/nodes.js) reference
// these model names, and worldgen scatters them (js/world/world.js).
import { PROP_MODELS } from '../gfx/proppack.js';
import { remakeParts } from './mobremake.js';

export async function registerProps(renderer) {
  const ids = Object.keys(PROP_MODELS);
  if (!ids.length) return [];
  const done = [];
  await Promise.all(ids.map((id) => new Promise((resolve) => {
    const def = PROP_MODELS[id];
    const img = new Image();
    img.onload = () => {
      try {
        const c = document.createElement('canvas');
        c.width = def.texW; c.height = def.texH;
        c.getContext('2d').drawImage(img, 0, 0, def.texW, def.texH);
        const tex = renderer.createMobTexture(c);
        renderer.registerAnimatedModel(`prop_${id}`, remakeParts(def), {}, tex);
        done.push(id);
      } catch (e) { console.warn('[proppack] failed to register', id, e); }
      resolve();
    };
    img.onerror = () => { console.warn('[proppack] texture failed to decode for', id); resolve(); };
    img.src = def.texture;
  })));
  return done;
}
