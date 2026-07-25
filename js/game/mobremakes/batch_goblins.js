// Remade mob models — the goblins, and the rat.
//
// ONE BODY PLAN, EIGHT LIVERIES. Every hostile creature in this world is a
// goblin, and every goblin is this same skeleton: two stubby legs, a slab
// torso, long ears, a near-cube head with a toothy grin. The chiefs are the
// same skeleton scaled up, which is why they read as *bigger goblins* rather
// than as unrelated monsters.
//
// That is a deliberate content decision, not a shortcut. A player learns to
// read this silhouette in the first hour, and from then on the only variable
// is COLOUR — green means the scrappers near home, olive-brown means the bog,
// bone-white means it can see in the dark better than you, burnt-red means it
// throws fire, blue-white means it is armoured and does not care about the
// cold. So the geometry is generated from a shared builder and the liveries
// differ in palette plus two or three accessory boxes, because that is
// literally what distinguishes them in the fiction too.
//
// Geometry is authored in Minecraft units (whole pixels on the 16-per-block
// grid, limbs never thinner than 2px) via mcmodel.js; skins are per-creature
// 64x64 UV islands (see mobremake.js for the def format). +z is FORWARD.
import { b, part, limbPair } from './mcmodel.js';

// The shared UV atlas. Every livery paints into these same rectangles, so a new
// goblin is a palette and nothing else — no UV bookkeeping to get wrong.
const UV = {
  headSide: [0, 0, 16, 14], headFace: [18, 0, 16, 14],
  ear: [36, 0, 12, 6], hat: [36, 8, 16, 8],
  torso: [0, 18, 16, 18], belly: [18, 18, 14, 18],
  chest: [34, 18, 16, 10], pauldron: [34, 30, 14, 10],
  belt: [0, 38, 16, 6], arm: [50, 18, 8, 20], leg: [50, 40, 8, 18],
  kit: [0, 46, 24, 14],
};

// Three size classes on the one plan. Widths and depths are EVEN so the box
// centres land on the grid; heights add up to the creature's pixel height, so
// a goblin is 26px (1.6 blocks), a warchief 33px and the warlord 38px — you can
// see the rank across a room before you can see the colours.
const BUILD = {
  grunt:   { leg: [4, 8, 4],  body: [8, 10, 6],  head: [8, 8, 8],    arm: [3, 10, 4], ear: [4, 3, 2] },
  chief:   { leg: [5, 11, 5], body: [12, 13, 8], head: [10, 9, 10],  arm: [4, 13, 6], ear: [5, 4, 3] },
  warlord: { leg: [6, 13, 6], body: [14, 15, 8], head: [12, 10, 12], arm: [5, 15, 6], ear: [6, 4, 3] },
};

// ---- geometry ---------------------------------------------------------------
// `kit` switches the accessory boxes on: helm, ruff, chest plate, pauldron, a
// weapon welded to the right arm (so it swings with the attack animation rather
// than floating), and a shoulder pack.
function goblinParts(d, kit = {}) {
  const [lw, lh, ld] = d.leg;
  const [bw, bh, bd] = d.body;
  const [hw, hh, hd] = d.head;
  const [aw, ah, ad] = d.arm;
  const [ew, eh, ed] = d.ear;
  const hip = lh, neck = lh + bh, crown = neck + hh;

  const bodyBoxes = [
    b([-bw / 2, hip, -bd / 2], [bw, bh, bd], { all: UV.torso, south: UV.belly }),
    // belt, one pixel proud of the torso on every side so it never z-fights
    b([-bw / 2 - 1, hip + Math.round(bh * 0.18), -bd / 2 - 1], [bw + 2, 2, bd + 2], UV.belt),
  ];
  if (kit.chest) bodyBoxes.push(b([-bw / 2, hip + Math.round(bh * 0.3), bd / 2], [bw, Math.round(bh * 0.55), 1], UV.chest));
  if (kit.pauldron) bodyBoxes.push(b([-bw / 2 - 2, neck - 3, -bd / 2], [Math.round(bw * 0.4), 3, bd], UV.pauldron));
  if (kit.pack) bodyBoxes.push(b([-3, hip + 2, -bd / 2 - 2], [6, 6, 2], UV.kit));

  const headBoxes = [
    b([-hw / 2, neck, -hd / 2], [hw, hh, hd], { all: UV.headSide, south: UV.headFace }),
    b([-hw / 2 - ew, neck + Math.round(hh * 0.45), -ed], [ew, eh, ed * 2], UV.ear),
    b([hw / 2, neck + Math.round(hh * 0.45), -ed], [ew, eh, ed * 2], UV.ear),
  ];
  // A helm sits ON the crown; a ruff wraps the NECK. Both overlap their host box
  // by a pixel — a cap flush with the skull reads as a bald patch, not a hat.
  if (kit.helm) headBoxes.push(b([-hw / 2 - 1, crown - 1, -hd / 2 - 1], [hw + 2, 3, hd + 2], UV.hat));
  if (kit.ruff) headBoxes.push(b([-hw / 2 - 2, neck - 1, -hd / 2 - 2], [hw + 4, 3, hd + 4], UV.hat));

  const [legL, legR] = limbPair('leg', { size: [lw, lh, ld], y: 0, z: -ld / 2, xInner: 0, uv: UV.leg });
  const armBoxL = [b([-bw / 2 - aw, hip, -ad / 2], [aw, ah, ad], UV.arm)];
  const armBoxR = [b([bw / 2, hip, -ad / 2], [aw, ah, ad], UV.arm)];
  // The weapon hangs from the right fist, below the arm, angled forward.
  if (kit.weapon) armBoxR.push(b([bw / 2, hip - 4, ad], [2, Math.round(ah * 1.3), 2], UV.kit));
  if (kit.sling) armBoxR.push(b([bw / 2, hip - 6, 0], [1, 10, 1], UV.kit));

  return [
    part('body', [0, hip, 0], bodyBoxes),
    part('head', [0, neck, 0], headBoxes),
    part('armL', [-bw / 2, neck, 0], armBoxL),
    part('armR', [bw / 2, neck, 0], armBoxR),
    legL, legR,
  ];
}

// ---- skin -------------------------------------------------------------------
// The one paint routine, driven by a palette. `pal.eye` is doing most of the
// communication work: yellow reads as ordinary malice, orange as fire, pale
// blue as cold, and huge washed-out white as "this thing lives in the dark".
function paintGoblin(P, pal) {
  const { skin, dark, ear, eye, cloth, metal, mdk, rust } = pal;
  const tooth = '#e8dcbc', maw = '#1c1208';

  // head sides — warty hide, flecked with the darker tone
  P.noise(0, 0, 16, 14, skin, 0.08, { chance: 0.12, color: dark });
  P.strokes(0, 0, 16, 14, 10, dark, 3);
  P.spots(0, 0, 16, 14, 5, P.shade(skin, 0.06));
  // face — heavy brow, eyes, a mouth of bad teeth
  P.noise(18, 0, 16, 14, skin, 0.07);
  P.rect(18, 0, 16, 3, dark);
  P.eye(21, 5, '#12100a', eye);
  P.eye(29, 5, '#12100a', eye);
  P.rect(21, 10, 12, 2, maw);
  P.px(23, 10, tooth); P.px(26, 10, tooth); P.px(29, 10, tooth); P.px(31, 11, tooth);
  // ears — thinner skin, so a lighter tone with a dark inner ridge
  P.noise(36, 0, 12, 6, ear, 0.07);
  P.rect(37, 1, 10, 2, dark);
  // headgear tile — beaten metal, dented and rusted
  P.noise(36, 8, 16, 8, metal, 0.08, { chance: 0.2, color: rust });
  P.bands(36, 8, 16, 8, 3, mdk);
  P.spots(36, 8, 16, 8, 6, P.shade(metal, 0.1));
  // torso + belly
  P.noise(0, 18, 16, 18, skin, 0.07);
  P.strokes(0, 18, 16, 18, 12, dark, 4);
  P.noise(18, 18, 14, 18, P.shade(skin, 0.04), 0.06);
  P.strokes(18, 18, 14, 18, 8, dark, 3);
  // chest plate tile — scavenged armour over stolen cloth
  P.noise(34, 18, 16, 10, metal, 0.08, { chance: 0.2, color: rust });
  P.bands(34, 18, 16, 10, 3, mdk);
  P.outline(34, 18, 16, 10, '#241f18');
  // pauldron tile
  P.noise(34, 30, 14, 10, metal, 0.08, { chance: 0.18, color: rust });
  P.outline(34, 30, 14, 10, mdk);
  // belt tile — leather with a brass buckle
  P.noise(0, 38, 16, 6, rust, 0.08);
  P.rect(6, 39, 4, 4, '#c8b23a');
  // arms + legs, with wrappings at wrist and ankle
  P.noise(50, 18, 8, 20, skin, 0.07);
  P.strokes(50, 18, 8, 20, 10, dark, 4);
  P.rect(50, 34, 8, 3, cloth);
  P.noise(50, 40, 8, 18, skin, 0.07);
  P.strokes(50, 40, 8, 18, 8, dark, 4);
  P.rect(50, 54, 8, 4, cloth);
  // kit tile — the rag-and-timber bundle every accessory box shares
  P.noise(0, 46, 24, 14, cloth, 0.09, { chance: 0.16, color: rust });
  P.strokes(0, 46, 24, 14, 20, P.shade(cloth, -0.08), 5);
  P.bands(0, 46, 24, 14, 5, mdk);
}

// A livery is a palette, a size class and a handful of accessory boxes.
const goblin = (pal, size = 'grunt', kit = {}) => ({
  texW: 64, texH: 64, rig: 'biped',
  paint(ctx, P) { paintGoblin(P, pal); },
  parts: goblinParts(BUILD[size], kit),
});

export const GOBLINS = {
  // --------------------------------------------------------------------------
  // rat — the floor of the threat scale. Grey, low, quick, and mostly tail.
  // The only creature in the world that is not livestock and not a goblin.
  // --------------------------------------------------------------------------
  rat: {
    texW: 64, texH: 64, rig: 'scamper',
    paint(ctx, P) {
      const fur = '#6e6a64', dk = '#4a4742', pale = '#8a857c', pink = '#c08a86';
      P.noise(0, 0, 16, 8, fur, 0.07, { chance: 0.1, color: dk });      // flank
      P.strokes(0, 0, 16, 8, 22, dk, 3);
      P.noise(0, 10, 16, 6, pale, 0.06);                                 // belly
      P.noise(18, 0, 10, 8, fur, 0.07);                                  // head sides
      P.strokes(18, 0, 10, 8, 10, dk, 3);
      P.noise(30, 0, 10, 8, pale, 0.06);                                 // face
      P.eye(32, 3, '#100c0a', '#c83030'); P.eye(36, 3, '#100c0a', '#c83030');
      P.rect(34, 6, 2, 1, pink);                                         // nose
      P.px(33, 7, '#f0e8d8'); P.px(36, 7, '#f0e8d8');                    // incisors
      P.noise(42, 0, 8, 6, pink, 0.06); P.outline(42, 0, 8, 6, dk);      // ears
      P.noise(18, 10, 8, 6, fur, 0.06);                                  // legs
      P.noise(28, 10, 20, 4, pink, 0.05);                                // tail
      P.bands(28, 10, 20, 4, 2, P.shade(pink, -0.1));
    },
    parts: [
      part('body', [0, 2, 0], [b([-2, 2, -4], [4, 4, 8], { all: [0, 0, 16, 8], down: [0, 10, 16, 6] })]),
      part('head', [0, 3, 4], [
        b([-2, 2, 4], [4, 4, 4], { all: [18, 0, 10, 8], south: [30, 0, 10, 8] }),
        b([-3, 5, 5], [2, 2, 1], [42, 0, 8, 6]),
        b([1, 5, 5], [2, 2, 1], [42, 0, 8, 6]),
      ]),
      part('tail', [0, 3, -4], [b([-1, 3, -12], [2, 1, 8], [28, 10, 20, 4])]),
      ...limbPair('legF', { size: [2, 2, 2], y: 0, z: 2, xInner: 1, uv: [18, 10, 8, 6] }),
      ...limbPair('legB', { size: [2, 2, 2], y: 0, z: -4, xInner: 1, uv: [18, 10, 8, 6] }),
    ],
  },

  // --------------------------------------------------------------------------
  // The six field liveries. Same skeleton every time — read the colour.
  // --------------------------------------------------------------------------

  // scrap_goblin — bright warty green in stolen rags and a dented pot helm.
  // The one you meet first, and the reference every other livery is read against.
  scrap_goblin: goblin({
    skin: '#4a7a3a', dark: '#2e5220', ear: '#5c8c46', eye: '#ffe23a',
    cloth: '#7a6440', metal: '#6f6b64', mdk: '#413d36', rust: '#7a5a30',
  }, 'grunt', { helm: true, chest: true }),

  // bog_goblin — olive and silt, plastered in the mud it comes up out of.
  bog_goblin: goblin({
    skin: '#4c5a38', dark: '#2c361f', ear: '#5e6c46', eye: '#b8d040',
    cloth: '#4a4632', metal: '#5a5c4e', mdk: '#33352a', rust: '#5c4a26',
  }, 'grunt', { pack: true }),

  // cave_goblin — bone-pale, huge washed-out eyes, no light needed.
  cave_goblin: goblin({
    skin: '#b4b0a6', dark: '#7e7a70', ear: '#c6c2b8', eye: '#f4f0d0',
    cloth: '#5e5a50', metal: '#787468', mdk: '#46433c', rust: '#6a5a3e',
  }, 'grunt', { pack: true }),

  // ash_goblin — burnt red and grey, ash in every crease, carrying fire.
  ash_goblin: goblin({
    skin: '#8a4030', dark: '#54241a', ear: '#9c5040', eye: '#ff9020',
    cloth: '#4a3a30', metal: '#6a5a52', mdk: '#3a322c', rust: '#8a4a1c',
  }, 'grunt', { helm: true, chest: true, pauldron: true }),

  // frost_goblin — rimed blue-white under more fur than it can possibly need.
  frost_goblin: goblin({
    skin: '#9ab4c4', dark: '#68849a', ear: '#aec6d4', eye: '#c8ecff',
    cloth: '#cfd6dc', metal: '#7e8e9a', mdk: '#4c5a66', rust: '#6a6252',
  }, 'grunt', { ruff: true, chest: true }),

  // goblin_slinger — a yellow-green runt with a sling and a good eye. Smallest
  // silhouette of the six, which is the tell: the one hanging back is the one
  // hitting you from range.
  goblin_slinger: goblin({
    skin: '#8a9a3a', dark: '#5a6820', ear: '#9caa4e', eye: '#ffe860',
    cloth: '#6e5c38', metal: '#6a6660', mdk: '#3e3b35', rust: '#74562e',
  }, 'grunt', { sling: true, pack: true }),

  // --------------------------------------------------------------------------
  // The two chiefs. Same plan, scaled — a warchief is unmistakably a goblin,
  // just one wearing most of a stolen smithy.
  // --------------------------------------------------------------------------

  // goblin_warchief — Gorrak. Deep green, iron crown, a club that swings with
  // the arm it is welded to.
  goblin_warchief: goblin({
    skin: '#3a6428', dark: '#22401a', ear: '#4a7434', eye: '#ffd020',
    cloth: '#6a5636', metal: '#7c7870', mdk: '#403c34', rust: '#7e5c2e',
  }, 'chief', { helm: true, chest: true, pauldron: true, weapon: true }),

  // goblin_warlord — Vashk. Iron-shod and ash-scarred, eyes lit like coals,
  // carrying a brand that has clearly been in use a very long time.
  goblin_warlord: goblin({
    skin: '#5a4a34', dark: '#332818', ear: '#6c5a40', eye: '#ff7018',
    cloth: '#4e4038', metal: '#8a8278', mdk: '#453f36', rust: '#96501e',
  }, 'warlord', { helm: true, chest: true, pauldron: true, weapon: true, pack: true }),
};
