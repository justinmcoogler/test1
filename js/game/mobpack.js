// Register imported Blockbench models (js/gfx/mobpack.js, generated from
// assets/mobs/*.bbmodel) over the built-in creature models. Each model carries
// its own embedded texture, so registration is async (decode → canvas → GL
// texture); it reuses the remake conversion (per-box UV islands) and the
// explicit-parts rigger. A dropped-in model fully replaces that type's model.
import { MOB_MODELS } from '../gfx/mobpack.js';
import { remakeParts } from './mobremake.js';
import { buildPartAnimations } from './rigs.js';

import { MOB_REMAKES } from './mobremakes/index.js';

export async function registerImportedMobs(renderer) {
  // assets/mobs/*.bbmodel drop-ins. {texW,texH,rig,texture,parts}.
  const ALL = { ...MOB_MODELS };
  // A hand-authored native owns its id. This loop runs async (after each texture
  // decodes) and does delete-then-register, so without this guard a drop-in
  // sharing an id would silently replace the remade model well after startup.
  const types = Object.keys(ALL).filter((t) => !MOB_REMAKES[t]);
  if (!types.length) return [];
  const done = [];
  await Promise.all(types.map((type) => new Promise((resolve) => {
    const def = ALL[type];
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
