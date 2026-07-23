// Register imported Blockbench models (js/gfx/mobpack.js, generated from
// assets/mobs/*.bbmodel) over the built-in creature models. Each model carries
// its own embedded texture, so registration is async (decode → canvas → GL
// texture); it reuses the remake conversion (per-box UV islands) and the
// explicit-parts rigger. A dropped-in model fully replaces that type's model.
import { MOB_MODELS } from '../gfx/mobpack.js';
import { remakeParts } from './mobremake.js';
import { buildPartAnimations } from './rigs.js';

export async function registerImportedMobs(renderer) {
  const types = Object.keys(MOB_MODELS);
  if (!types.length) return [];
  const done = [];
  await Promise.all(types.map((type) => new Promise((resolve) => {
    const def = MOB_MODELS[type];
    const img = new Image();
    img.onload = () => {
      try {
        const c = document.createElement('canvas');
        c.width = def.texW; c.height = def.texH;
        c.getContext('2d').drawImage(img, 0, 0, def.texW, def.texH);
        const tex = renderer.createMobTexture(c);
        renderer.deleteModel(type);
        renderer.registerAnimatedModel(type, remakeParts(def), buildPartAnimations(def.rig || 'lumberer', def.parts, def.animOverrides), tex);
        done.push(type);
      } catch (e) { console.warn('[mobpack] failed to register', type, e); }
      resolve();
    };
    img.onerror = () => { console.warn('[mobpack] texture failed to decode for', type); resolve(); };
    img.src = def.texture;
  })));
  return done;
}
