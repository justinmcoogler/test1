// Remade mob models — the mounts and the whelp.
//
// Two parametric builders, for the same reason the goblins have one: a Courser
// and a Destrier are the same animal in different condition, and a Crag Drake
// and a Riftdrake are the same animal at different scales. Building each from a
// shared skeleton means a rider learns one silhouette per family and reads the
// rest off colour and size — exactly as with the goblins.
//
// Geometry is authored in Minecraft units (whole pixels on the 16-per-block
// grid, limbs never thinner than 2px) via mcmodel.js; skins are per-creature
// 64x64 UV islands (see mobremake.js for the def format). +z is FORWARD.
import { b, part } from './mcmodel.js';

// GRAZE — the head goes down to the grass, holds there, comes back up. The hold
// is the readable part, so it takes half the clip. (Same shape as the farm
// batch's clip; horses do this whatever else they are bred for.)
const GRAZE = (deg = 64) => ({
  length: 3.4, loop: false,
  parts: {
    head: { rotate: [[0, [0, 0, 0]], [0.6, [deg, 0, 0]], [2.6, [deg, 0, 0]], [3.4, [0, 0, 0]]] },
    body: { rotate: [[0, [0, 0, 0]], [0.6, [4, 0, 0]], [2.6, [4, 0, 0]], [3.4, [0, 0, 0]]] },
  },
});

// FLAP — a dragon settling its wings. Not flight: this plays while the animal is
// standing about, which is the only state you ever see a wild one in.
//
// The wings have a FOLDED rest rotation (see WING_REST), and a clip's rotation is
// ADDED to a part's rest rotation (js/game/mobloader.js evaluatePose), so these
// numbers are how far the wing opens FROM folded — not an absolute pose. A dragon
// standing in a field has its wings shut; it shrugs them open and settles them
// again, which is the only wing behaviour anyone has ever seen from the ground.
const FLAP = {
  length: 5.2, loop: true,
  parts: {
    wingL: { rotate: [[0, [0, 0, 0]], [1.3, [0, 0, 34]], [2.4, [0, 0, 8]], [3.6, [0, 0, 20]], [5.2, [0, 0, 0]]] },
    wingR: { rotate: [[0, [0, 0, 0]], [1.3, [0, 0, -34]], [2.4, [0, 0, -8]], [3.6, [0, 0, -20]], [5.2, [0, 0, 0]]] },
    neck: { rotate: [[0, [0, -8, 0]], [2.6, [0, 8, 0]], [5.2, [0, -8, 0]]] },
    head: { rotate: [[0, [2, -6, 0]], [2.6, [-2, 6, 0]], [5.2, [2, -6, 0]]] },
    tail: { rotate: [[0, [0, 5, 0]], [1.7, [0, -6, 0]], [3.4, [0, 6, 0]], [5.2, [0, 5, 0]]] },
  },
};

// A wing is AUTHORED FOLDED, and that is the whole trick.
//
// Two rest poses were tried and both failed for the same reason. The wing began
// life as a horizontal sheet — thin in Y, wide in X, deep in Z — because that is
// what an outstretched wing is. But a horizontal sheet stays horizontal however
// you sweep it about Y, so the "folded" wing came out lying flat beside the
// animal like a pair of water skis; and rolling it down about Z hung it under the
// belly like oars. Meanwhile these dragons are only ever seen STANDING, so the
// extended pose is the one nobody looks at.
//
// So the geometry is the folded wing: a vertical fan of skin lying along the ribs,
// deep at the shoulder and tapering back toward the tail. No rest rotation to get
// wrong, and FLAP opens it by rolling about Z — which, for a fan whose long axis
// runs fore-and-aft, is exactly the shrug a settling animal does.

// ---- horses -----------------------------------------------------------------
// Vanilla horse proportions: body 10x10x22, legs 4x14x4, arched neck, long head.
// A breed is a palette plus three numbers — height at the withers, how deep
// through the chest, how heavy the leg.
const H_UV = {
  flank: [0, 0, 26, 16], top: [0, 17, 26, 10], neck: [28, 0, 12, 16],
  chest: [40, 0, 12, 10], rump: [0, 28, 14, 12],
  headSide: [16, 28, 10, 12], headFace: [28, 28, 10, 12], muzzle: [40, 28, 10, 8],
  headTop: [0, 42, 12, 8],
  ear: [52, 28, 8, 6], mane: [52, 0, 6, 22], forelock: [58, 12, 6, 10],
  leg: [40, 42, 8, 20], hoof: [50, 42, 8, 4], tail: [56, 42, 8, 22], dock: [50, 48, 6, 8],
};

// WHAT MAKES A HORSE READ AS A HORSE.
//
// Rebuilt against the PUBLISHED Minecraft horse geometry rather than from memory
// of it (Mojang/bedrock-samples, resource_pack/models/entity/horse_v2.geo.json).
// Four passes of eyeballing this got steadily further from a horse, because the
// numbers I was carrying in my head were wrong in the places that matter. What
// the real model says, and what each of these fixes:
//
//   THE LEGS ARE BARELY LONGER THAN THE BARREL IS TALL. Reference: 4x11x4 legs
//   under a body 10 tall. Ours were fourteen to seventeen under a body of nine to
//   twelve — half again too long — so the animal read as a horse on stilts no
//   matter what was done above the shoulder.
//   THE NECK IS BURIED IN THE BODY. Its cube runs from halfway down the barrel to
//   well above it, twelve tall against a ten-tall body, so what SHOWS is a short
//   thick column. Ours started at the withers and was therefore a strut.
//   THE NECK IS SEVEN DEEP ON A TWENTY-TWO BODY, front face flush with the chest.
//   Nearly as deep through as the head is long. That mass is most of the animal.
//   THE HEAD IS FIVE TALL, sits ON the neck's top with NO overlap, and the mouth
//   carries on forward from it in the SAME height band, stepping in on width only.
//   Ours was seven or eight tall and sank into the neck, which is why the neck
//   kept disappearing and why raising the head left it perched.
//   THE WHOLE ASSEMBLY IS ONE RIGID GROUP at thirty degrees. There is no
//   counter-angle on the head: the muzzle points thirty degrees at the ground, and
//   that IS what a Minecraft horse looks like standing still.
//   THE MANE IS HALF THE NECK'S WIDTH and sits entirely PROUD BEHIND it, running
//   from the neck's base to past the top of the head.
//
// `rotation` is a rest pose the animation adds to (js/game/mobloader.js), and +X
// pitches +Y toward +Z — forward.
export function horseParts(d) {
  const { bw, bh, bd, legH, legW, neck } = d;
  const R = Math.round;
  const back = legH + bh;                      // top of the barrel
  const zF = bd / 2, zB = -bd / 2;
  const LEAN = 30;
  const nDeep = Math.max(5, R(bd * 0.32));     // seven on a twenty-two body
  const nzB = zF - nDeep;                      // the neck's back face
  const nBase = back - R(bh * 0.5);            // buried half the barrel's depth
  const nTop = nBase + neck;
  const headH = Math.max(4, R(bh * 0.5));
  const headW = Math.max(4, bw - 4);
  const mouthD = Math.max(3, R(bd * 0.23));
  const hTop = nTop + headH;
  const pivY = back - R(bh * 0.4), pivZ = zF - 3;
  const LEGS = [['leg0', -legW - 1, zF - legW], ['leg1', 1, zF - legW],
    ['leg2', -legW - 1, zB], ['leg3', 1, zB]];
  return [
    part('body', [0, legH, 0], [
      b([-bw / 2, legH, zB], [bw, bh, bd], { all: H_UV.flank, up: H_UV.top }),
      // A horse is not quite a brick: the chest is deeper through than the barrel
      // and the croup rounds up over the hips. Both stay FLUSH with the flank in x
      // and sit one pixel INSIDE the barrel's top — set proud they ran a ledge the
      // length of the animal and the whole body read as a stack of crates.
      b([-bw / 2, legH, zF - R(bd * 0.32)], [bw, bh - 1, R(bd * 0.32)], H_UV.chest),
      b([-bw / 2 + 1, legH + 1, zB], [bw - 2, bh - 2, R(bd * 0.3)], H_UV.rump),
    ]),
    // Neck and mane. The mane is a separate bone in the reference but it never
    // moves independently, so it rides here.
    part('neck', [0, pivY, pivZ], [
      b([-2, nBase, nzB], [4, neck, nDeep], H_UV.neck),
      b([-1, nBase + 1, nzB - 2], [2, hTop - nBase - 1, 2], H_UV.mane),
    ], { rotation: [LEAN, 0, 0] }),
    // The head is rigid with the neck — no rest rotation of its own. It stays a
    // separate bone only so the graze clip has something to swing.
    part('head', [0, nTop, pivZ], [
      b([-headW / 2, nTop, nzB], [headW, headH, nDeep],
        { all: H_UV.headSide, south: H_UV.headFace, up: H_UV.headTop }),
      b([-2, nTop, zF], [4, headH, mouthD], H_UV.muzzle),
      b([-3, hTop - 1, nzB], [2, 3, 1], H_UV.ear),
      b([1, hTop - 1, nzB], [2, 3, 1], H_UV.ear),
    ], { parent: 'neck' }),
    // ONE WIDTH ALL THE WAY DOWN. A tapered leg — muscled thigh, thin cannon,
    // flared hoof — is anatomically the right story and it read badly here: at
    // four pixels of leg the step in and out just looks like a knuckle, and four
    // of them turn the animal's underside into a row of knobbles. The reference
    // horse's legs are plain columns and so are these. The hoof keeps its own box
    // only so it can carry a darker tile; it is flush with the leg, not wider.
    ...LEGS.map(([id, sx, sz]) => part(id, [sx > 0 ? 3 : -3, legH, sz + legW / 2], [
      b([sx, 2, sz], [legW, legH - 2, legW], H_UV.leg),
      b([sx, 0, sz], [legW, 2, legW], H_UV.hoof),
    ])),
    // One tapering switch off the croup, swung back thirty degrees like the
    // reference — a dock box on top of it just read as a knuckle at this size.
    part('tail', [0, back - 1, zB], [
      b([-1.5, back - R(bh * 1.4), zB - 2], [3, R(bh * 1.4) - 1, 4], H_UV.tail),
    ], { rotation: [LEAN, 0, 0] }),
  ];
}

// A hank of coarse hair — mane, forelock, tail switch. Long strokes running the
// length of the island in three values, so it reads as hair falling rather than as
// a dark slab with speckles on it.
function hair(P, x, y, w, h, base) {
  P.panel(x, y, w, h, base, { light: 0.2, vary: 0.02, seam: 0.14 });
  const dk = P.tone(base, -0.3), hi = P.tone(base, 0.22);
  for (let i = 0; i < w; i++) {
    const c = i % 3 === 0 ? hi : (i % 3 === 1 ? dk : null);
    if (!c) continue;
    const from = 1 + ((P.r() * 3) | 0), to = h - 1 - ((P.r() * 2) | 0);
    for (let j = from; j < to; j++) P.px(x + i, y + j, c);
  }
  for (let k = 0; k < w; k++) if (P.r() < 0.4) P.px(x + k, y + h - 1, dk);  // ragged end
}

export function paintHorseSkin(P, pal) {
  const { coat, cdk, shine, mane, blaze, hoof, muz, eye } = pal;
  // flank — short coat with the grain lying along the body, dappled
  P.hide(0, 0, 26, 16, coat, cdk, { speck: { chance: 0.05, color: shine } });
  P.spots(2, 3, 22, 8, 10, P.tone(shine, 0.05));
  P.crease(1, 11, 24, 12, P.tone(cdk, -0.18), P.tone(coat, 0.08));   // the barrel's underline
  P.ramp(0, 13, 26, 3, P.tone(cdk, -0.05), cdk, 'v');
  // topline: a top face gets no downward ramp, just the spine a shade darker
  P.hide(0, 17, 26, 10, coat, cdk, { light: 0.05, seam: 0.1 });
  P.rect(11, 17, 4, 10, P.tone(cdk, -0.1));
  // neck, chest and rump — the same coat, each with its own form shading so the
  // three masses read as three masses
  P.hide(28, 0, 12, 16, coat, cdk);
  P.hide(40, 0, 12, 10, P.tone(coat, 0.04), cdk);      // chest catches the light
  P.hide(0, 28, 14, 12, coat, cdk);
  P.crease(1, 34, 12, 32, P.tone(cdk, -0.16));         // the point of the hip
  // Head. The EYE GOES ON THE SIDE ISLAND, because that is where a horse's eyes
  // are and the side of the skull is the whole of what you see in profile. It used
  // to sit on the face-front island with its twin, which was survivable while the
  // head was a tall block seen three-quarter-on; now that the head is a long
  // shallow wedge with a muzzle across most of its front, that face is barely
  // visible and the animal had no eye from the side at all.
  P.hide(16, 28, 10, 12, coat, cdk, { seam: 0.13 });
  P.eye(18, 31, '#0d0906', eye);
  // The crown gets an island of its own so the eye does not also land on top of
  // the skull — every other face of this box shares the side island.
  P.hide(0, 42, 12, 8, coat, cdk, { light: 0.06, seam: 0.1 });
  // The face front is mostly behind the muzzle now — only a one-pixel border of it
  // shows, all the way round. So it is painted to EXACTLY the value of the side
  // island: lit a shade brighter, as a face front reasonably would be, that border
  // read as a bright gap between the skull and the muzzle rather than as the front
  // of the head. For the same reason the blaze stops short of the bottom edge,
  // where it was showing under the muzzle as a white notch.
  P.hide(28, 28, 10, 12, coat, cdk, { seam: 0.13 });
  if (blaze) { P.ramp(32, 28, 2, 7, blaze, P.tone(blaze, -0.1), 'v'); }
  P.rect(28, 28, 10, 2, P.tone(cdk, -0.1));            // the forehead in shadow
  // Muzzle — the SAME HIDE as the rest of the head, going dark only at the lip.
  // Flooding the whole island with `muz` (a near-black on every breed) turned the
  // nose into a black brick stuck to the front of the face, and once the head was
  // rebuilt long and shallow that brick was half of it.
  P.hide(40, 28, 10, 8, coat, cdk, { seam: 0.12 });
  P.ramp(40, 32, 10, 3, P.tone(coat, -0.16), muz, 'v');   // shading down into the lip
  P.rect(40, 35, 10, 1, muz);
  // ears — coat outside, dark inside
  P.panel(52, 28, 8, 6, coat, { light: 0.1 });
  P.rect(53, 29, 2, 4, P.tone(cdk, -0.18)); P.rect(57, 29, 2, 4, P.tone(cdk, -0.18));
  // mane, forelock and tail — all the same coarse hair
  hair(P, 52, 0, 6, 22, mane);
  hair(P, 58, 12, 6, 10, mane);
  hair(P, 56, 42, 8, 22, mane);
  P.panel(50, 48, 6, 8, coat, { light: 0.14 });        // the tail dock is coat, not hair
  // legs — coat down to a dark sock, then a horn hoof
  P.hide(40, 42, 8, 20, coat, cdk);
  P.ramp(40, 55, 8, 7, coat, mane, 'v', 0.7);          // the sock fades in
  P.horn(50, 42, 8, 4, hoof, { rings: 2 });
}

const horse = (pal, d) => ({
  texW: 64, texH: 64, rig: 'quadruped',
  paint(ctx, P) { paintHorseSkin(P, pal); },
  anims: { graze: GRAZE(64) },
  ambient: { clip: 'graze', every: [12, 28] },
  parts: horseParts(d),
});

// ---- dragons ----------------------------------------------------------------
// One skeleton: a deep chest tapering to narrow hips, an arched neck of two
// segments, a wedge head with a jaw and horns, four legs (fore shorter than
// hind, as on anything that rears), a tail that tapers over three segments to a
// spade, and a pair of folding membrane wings. The whelp is the same animal at a
// quarter scale, which is the joke — it is not a baby, it is just small.
//
// WHAT WAS WRONG WITH THE FIRST VERSION. The wing was ONE BOX, [span, 2, chord]:
// a rectangular plank sticking straight out sideways, with a corrugated band
// texture on it. It read as sheet metal, and since all three dragons and the
// whelp share this builder, it read as sheet metal four times. A wing has three
// things this now has — a thick leading-edge SPAR, finger struts the membrane
// hangs off, and a swept TAPER so the outline is a sail rather than a door. It
// also has a rest pose: folded.
const D_UV = {
  chest: [0, 0, 26, 13], top: [0, 14, 26, 8], hip: [28, 0, 18, 12],
  neck: [0, 23, 14, 9], neck2: [16, 23, 12, 8],
  headSide: [30, 14, 12, 9], headFace: [44, 14, 12, 9], snout: [30, 24, 10, 6],
  jaw: [42, 24, 10, 5], horn: [52, 0, 6, 10], spine: [58, 0, 6, 14],
  spar: [0, 33, 30, 3], web: [0, 37, 30, 11], webTip: [32, 37, 16, 9],
  legFore: [48, 24, 8, 14], legHind: [48, 39, 8, 16],
  foot: [0, 49, 12, 6], tail1: [14, 49, 12, 8], tail2: [28, 49, 10, 7], fluke: [40, 49, 10, 8],
};

function dragonParts(d) {
  const { bw, bh, bd, legH, legW, neck, headW, headH, headD, wingW, wingD } = d;
  const R = Math.round;
  const back = legH + bh;                       // top of the barrel
  const chestD = R(bd * 0.5), hipD = bd - chestD;
  const hipW = Math.max(2, bw - 2), hipH = Math.max(2, bh - 1);
  const n1 = R(neck * 0.55), n2 = neck - n1;    // two neck segments, tapering
  const nw = Math.max(3, R(bw / 2)), nw2 = Math.max(2, nw - 2);
  const foreH = Math.max(2, R(legH * 0.82)), foreW = Math.max(2, legW - 1);
  const tailD = R(bd * 0.42);
  // Accessory sizes, derived so the same builder works at Riftdrake and whelp scale.
  const hornW = headW >= 8 ? 2 : 1;
  const hornD = Math.max(2, R(headD * 0.42));
  const spikeD = Math.max(2, R(headD * 0.25));
  const flukeH = Math.max(2, R(bh * 0.34));
  // The folded wing, in three panels running back along the ribs and shrinking as
  // they go. `wingW` sets how far back it reaches, `wingD` how deep the fan is at
  // the shoulder.
  //
  // EVERY Y HERE IS ABSOLUTE. A box's `from` is a world position, not an offset
  // from the part's pivot — the pivot only says what the part rotates ABOUT. The
  // first version of this authored the fold around y=0 as though it were local, so
  // both wings ended up down among the animal's feet.
  const reach = Math.min(bd - 4, wingW + 4);
  const L1 = R(reach * 0.4), L2 = R(reach * 0.34), L3 = reach - L1 - L2;
  const h1 = Math.max(2, R(wingD * 0.62)), h2 = Math.max(2, R(wingD * 0.44)), h3 = Math.max(1, R(wingD * 0.26));
  // A wing hangs from the SHOULDER, which is the top of the ribcage — so the fold
  // starts at the backline and the membrane drops from there. It never reaches the
  // belly, let alone the ground.
  const fold = back - 1;                 // the top edge of the folded wing
  const shoulderY = fold;
  const zFront = bd / 2 - 4;             // where along the body the fold starts

  // One wing, folded along the flank on the given side (-1 left, +1 right). Every
  // box is one pixel thick in X and sits just clear of the ribs, so the fan reads
  // as skin lying against the body rather than as part of it.
  const wingBoxes = (s) => {
    const xw = s < 0 ? -bw / 2 - 1 : bw / 2;
    const elbow = Math.max(3, h1);
    return [
      // the folded elbow, standing above the shoulder — the highest point of a
      // resting dragon, and what gives the silhouette its hunch
      b([xw, fold, zFront - 3], [1, elbow, 5], D_UV.spar),
      // the spar, running back along the top of the fold
      b([xw, fold - 1, zFront - reach], [1, 2, reach], D_UV.spar),
      // and the membrane hanging beneath it, deep at the front, thin at the tail
      b([xw, fold - h1, zFront - L1], [1, h1 - 1, L1], D_UV.web),
      b([xw, fold - h2, zFront - L1 - L2], [1, h2 - 1, L2], D_UV.web),
      b([xw, fold - h3, zFront - reach], [1, Math.max(1, h3 - 1), L3], D_UV.webTip),
      // the thumb claw, at the leading edge of the folded elbow
      b([xw, fold + elbow, zFront + 1], [1, 2, 3], D_UV.horn),
    ];
  };

  return [
    part('body', [0, legH, 0], [
      // chest: deep and forward, the mass a flier needs for its wings
      b([-bw / 2, legH, bd / 2 - chestD], [bw, bh, chestD], { all: D_UV.chest, up: D_UV.top }),
      // hips: narrower and a pixel lower, so the barrel tapers to the tail
      b([-hipW / 2, legH, -bd / 2], [hipW, hipH, hipD], { all: D_UV.hip, up: D_UV.top }),
      // spine plates — the ridge that makes a dragon read as a dragon from above.
      // Count scales with the animal: four on a Riftdrake, two on the whelp, and
      // never one stamped out past the hips into open air.
      ...Array.from({ length: Math.max(2, Math.min(4, R(bd / 7))) }, (_, i) => {
        const step = R((bd - 8) / Math.max(1, Math.max(2, Math.min(4, R(bd / 7))) - 1));
        return b([-1, back, bd / 2 - 4 - i * step], [2, 2, 2], D_UV.spine);
      }),
    ]),
    // The neck is its own bone so it can turn independently of the shoulders,
    // and the head hangs off it — which is what lets a dragon look at you.
    part('neck', [0, back - 1, bd / 2 - 3], [
      b([-nw / 2, back - 2, bd / 2 - 3], [nw, n1 + 2, nw], D_UV.neck),
      b([-nw2 / 2, back + n1 - 1, bd / 2 - 2], [nw2, n2 + 1, nw2 + 1], D_UV.neck2),
    ]),
    part('head', [0, back + neck - 1, bd / 2 + 1], [
      b([-headW / 2, back + neck - 1, bd / 2 - 1], [headW, headH, headD], { all: D_UV.headSide, south: D_UV.headFace }),
      // a narrower snout in front of the skull, so the head is a wedge
      b([-headW / 2 + 2, back + neck, bd / 2 - 1 + headD], [headW - 4, Math.max(2, headH - 3), R(headD * 0.4)], D_UV.snout),
      // lower jaw, hung a pixel below and set proud, so the mouth line reads
      b([-headW / 2 + 1, back + neck - 2, bd / 2], [headW - 2, 2, headD - 1], D_UV.jaw),
      // brow horns sweeping back off the skull, and a pair of cheek spikes. Sized
      // off the head rather than fixed: the whelp's skull is four pixels tall, and a
      // 2x2x5 horn on that is a cream brick strapped to its face.
      b([-headW / 2, back + neck + headH - 2, bd / 2 - 4], [hornW, 2, hornD], D_UV.horn),
      b([headW / 2 - hornW, back + neck + headH - 2, bd / 2 - 4], [hornW, 2, hornD], D_UV.horn),
      b([-headW / 2 - 1, back + neck, bd / 2 + 1], [1, 1, spikeD], D_UV.horn),
      b([headW / 2, back + neck, bd / 2 + 1], [1, 1, spikeD], D_UV.horn),
    ], { parent: 'neck' }),
    // Wings pivot at the shoulder, so a flap swings them about the body rather
    // than about their own middles. Boxes are authored around y=0 and the pivot
    // lifts them, which keeps the fold rotation readable.
    part('wingL', [-bw / 2, shoulderY, zFront], wingBoxes(-1)),
    part('wingR', [bw / 2, shoulderY, zFront], wingBoxes(1)),
    // Fore legs shorter and lighter than the hind pair; every one gets a foot,
    // so the animal stands on something rather than ending in a stump.
    part('leg0', [-R(bw / 3), foreH, bd / 2 - 4], [
      b([-R(bw / 3) - foreW, 0, bd / 2 - 4 - foreW], [foreW, foreH, foreW], D_UV.legFore),
      b([-R(bw / 3) - foreW - 1, 0, bd / 2 - 3 - foreW], [foreW + 1, 1, foreW + 2], D_UV.foot),
    ]),
    part('leg1', [R(bw / 3), foreH, bd / 2 - 4], [
      b([R(bw / 3), 0, bd / 2 - 4 - foreW], [foreW, foreH, foreW], D_UV.legFore),
      b([R(bw / 3), 0, bd / 2 - 3 - foreW], [foreW + 1, 1, foreW + 2], D_UV.foot),
    ]),
    part('leg2', [-R(bw / 3), legH, -bd / 2 + 4], [
      b([-R(bw / 3) - legW, 0, -bd / 2 + 4], [legW, legH, legW], D_UV.legHind),
      b([-R(bw / 3) - legW - 1, 0, -bd / 2 + 3], [legW + 1, 1, legW + 2], D_UV.foot),
    ]),
    part('leg3', [R(bw / 3), legH, -bd / 2 + 4], [
      b([R(bw / 3), 0, -bd / 2 + 4], [legW, legH, legW], D_UV.legHind),
      b([R(bw / 3), 0, -bd / 2 + 3], [legW + 1, 1, legW + 2], D_UV.foot),
    ]),
    // Tail: three segments narrowing to a spade. One box was a stump.
    part('tail', [0, back - 3, -bd / 2], [
      b([-2, back - 5, -bd / 2 - tailD], [4, 4, tailD], D_UV.tail1),
      b([-1, back - 5, -bd / 2 - tailD - R(tailD * 0.8)], [3, 3, R(tailD * 0.8)], D_UV.tail2),
      b([-1, back - 5, -bd / 2 - tailD - R(tailD * 0.8) - 3], [2, 2, 3], D_UV.tail2),
      // the fluke, standing up off the tip
      b([-1, back - 4, -bd / 2 - tailD - R(tailD * 0.8) - 3], [2, flukeH, 2], D_UV.fluke),
    ]),
  ];
}

function paintDragon(P, pal) {
  const { hide, dark, belly, membrane, horn, eye, glow } = pal;
  // The wing bones are NOT the horn colour. A horn is a bright accent on a small
  // box and reads well; the same value stretched along a 30px spar and five
  // struts turns the whole wing into the brightest thing on the animal.
  const spar = pal.spar || P.tone(P.mix(membrane, horn, 0.35), -0.05);
  const hi = P.tone(hide, 0.14), tooth = '#efe8d4';
  const seam = glow || null;      // a lit creature glows along its scale seams

  // chest — scale courses, a pale keeled belly, and the seam glow if it has one
  P.scaled(0, 0, 26, 13, hide, dark, hi);
  P.ramp(0, 10, 26, 3, P.mix(hide, belly, 0.4), belly, 'v');
  P.crease(1, 9, 24, 9, P.tone(dark, -0.12), hi);    // where the flank meets the keel
  if (seam) for (let i = 2; i < 25; i += 5) P.px(i, 4 + (i % 3), seam);
  // topline — darker, with the spine ridge running down the middle of it
  P.scaled(0, 14, 26, 8, dark, P.tone(dark, -0.14), P.tone(hide, 0.08));
  P.rect(12, 14, 2, 8, P.tone(horn, -0.28));
  // hips — the same hide a shade cooler, so the taper reads as a change of plane
  P.scaled(28, 0, 18, 12, P.tone(hide, -0.07), dark, hi);
  P.ramp(28, 9, 18, 3, P.mix(hide, belly, 0.5), belly, 'v');
  // neck, in two segments
  P.scaled(0, 23, 14, 9, hide, dark, hi);
  P.scaled(16, 23, 12, 8, P.tone(hide, 0.05), dark, hi, 2);
  if (seam) { P.px(4, 26, seam); P.px(9, 28, seam); P.px(20, 26, seam); }
  // head — sides, then the face: a heavy brow over slit eyes
  P.scaled(30, 14, 12, 9, hide, dark, hi, 2);
  P.panel(44, 14, 12, 9, hide, { light: 0.14, vary: 0.025 });
  P.rect(44, 14, 12, 2, dark);                       // brow ridge
  P.rect(44, 16, 12, 1, P.tone(dark, 0.12));
  P.eye(46, 17, '#0a0806', eye);
  P.eye(52, 17, '#0a0806', eye);
  P.crease(45, 21, 54, 21, P.tone(dark, -0.2));      // the mouth line
  // snout — nostrils, and the heat showing through if the animal is lit
  P.panel(30, 24, 10, 6, P.tone(hide, 0.06), { light: 0.12 });
  P.px(32, 27, '#100c08'); P.px(37, 27, '#100c08');
  // jaw, with a row of bad teeth along its top edge
  P.panel(42, 24, 10, 5, P.tone(hide, -0.14), { light: -0.06 });
  for (let i = 0; i < 4; i++) P.px(43 + i * 2, 24, tooth);
  if (glow) P.glow(43, 27, 8, 2, glow, P.tone(hide, -0.16));   // fire in the throat
  // horns, claws and spines — all one keratin
  P.horn(52, 0, 6, 10, horn);
  P.horn(58, 0, 6, 14, P.tone(horn, -0.12), { rings: 3 });
  // WING. The spar is bone under skin — a shade of the membrane, not of the horn;
  // the web is skin you can see daylight through.
  P.horn(0, 33, 30, 3, spar, { rings: 4 });
  P.membrane(0, 37, 30, 11, membrane, spar, { ribs: 5 });
  P.membrane(32, 37, 16, 9, membrane, spar, { ribs: 2 });
  // legs — scaled, and darker below the knee where a heavy animal gets muddy
  P.scaled(48, 24, 8, 14, hide, dark, hi, 2);
  P.rect(48, 35, 8, 3, P.tone(dark, -0.16));
  P.scaled(48, 39, 8, 16, hide, dark, hi, 2);
  P.rect(48, 52, 8, 3, P.tone(dark, -0.16));
  // feet and claws
  P.panel(0, 49, 12, 6, P.tone(dark, 0.08), { light: 0.1 });
  for (let i = 1; i < 11; i += 3) { P.px(i, 54, horn); P.px(i + 1, 54, horn); }
  // tail segments and the fluke
  P.scaled(14, 49, 12, 8, hide, dark, hi, 2);
  P.scaled(28, 49, 10, 7, P.tone(hide, -0.06), dark, hi, 2);
  P.horn(40, 49, 10, 8, P.tone(membrane, 0.1), { rings: 3 });
}

const dragon = (pal, d) => ({
  texW: 64, texH: 64, rig: 'quadruped',
  paint(ctx, P) { paintDragon(P, pal); },
  anims: { flap: FLAP },
  ambient: { clip: 'flap', every: [8, 20] },
  parts: dragonParts(d),
});

export const MOUNTS_BATCH = {
  // --------------------------------------------------------------------------
  // The horse breeds. Same skeleton as the farm horse, at three builds — you can
  // tell them apart across a field by outline alone, before the colour lands.
  // --------------------------------------------------------------------------

  // courser — dapple grey, leggy, built for the road. Taller and lighter than
  // the pony, and the tallest thing in the paddock until a Destrier walks in.
  courser: horse({
    coat: '#a8a49e', cdk: '#6e6a64', shine: '#c8c4bc', mane: '#3a352e',
    blaze: '#efe7d6', hoof: '#2a2620', muz: '#4a453e', eye: '#c8a06a',
  }, { bw: 10, bh: 10, bd: 22, legH: 13, legW: 4, neck: 12 }),

  // destrier — black, deep through the chest, heavy in the leg. Shorter at the
  // withers than a Courser and about half again as wide.
  destrier: horse({
    coat: '#2e2a28', cdk: '#171414', shine: '#4a4442', mane: '#0e0c0c',
    blaze: null, hoof: '#100e0c', muz: '#231f1e', eye: '#a08050',
  }, { bw: 12, bh: 12, bd: 24, legH: 11, legW: 5, neck: 12 }),

  // steppe_runner — dun with a dark dorsal stripe and a coarse upright mane.
  // The lightest frame of the three, and it never quite stands still.
  steppe_runner: horse({
    coat: '#c2a068', cdk: '#8a6c3c', shine: '#dcc08c', mane: '#2c2016',
    blaze: '#e8dcc4', hoof: '#241c14', muz: '#5a4428', eye: '#d8b070',
  }, { bw: 9, bh: 9, bd: 21, legH: 12, legW: 4, neck: 12 }),

  // --------------------------------------------------------------------------
  // The dragons. One skeleton at three scales, plus the whelp. Wingspan is the
  // tell: a Crag Drake is broad and slow, a Storm Wyrm is narrow and long, and a
  // Riftdrake is simply bigger than either with the Veil showing through it.
  // --------------------------------------------------------------------------

  // crag_drake — slate and lichen, a cliff-coloured animal on a cliff. Broadest
  // wings of the three and the shortest neck: it soars, it does not chase.
  crag_drake: dragon({
    hide: '#6a7078', dark: '#41464e', belly: '#9aa09a', membrane: '#5f5c58',
    horn: '#9a9284', spar: '#6e6a63', eye: '#e8c860', glow: null,
  }, { bw: 12, bh: 10, bd: 24, legH: 10, legW: 4, neck: 8, headW: 8, headH: 7, headD: 10, wingW: 18, wingD: 14 }),

  // storm_wyrm — blue-black with a pale storm-belly, long and narrow, wings
  // more spar than sail. Built to ride wind rather than beat against it.
  storm_wyrm: dragon({
    hide: '#3b4770', dark: '#232c48', belly: '#93a6c6', membrane: '#4e5b84',
    horn: '#aab2c2', spar: '#7c86a6', eye: '#9fe4ff', glow: null,
  }, { bw: 11, bh: 9, bd: 26, legH: 11, legW: 4, neck: 10, headW: 7, headH: 6, headD: 12, wingW: 22, wingD: 12 }),

  // riftdrake — violet-black with the Veil showing along every seam and a lit
  // throat. Bigger than either of the others in every dimension.
  riftdrake: dragon({
    hide: '#523c6c', dark: '#2e2142', belly: '#7d6794', membrane: '#5c3f7e',
    horn: '#bdb0d0', spar: '#8a74a6', eye: '#b0ffe8', glow: '#7fe8d0',
  }, { bw: 14, bh: 12, bd: 30, legH: 13, legW: 5, neck: 12, headW: 9, headH: 8, headD: 14, wingW: 26, wingD: 16 }),

  // dragon_whelp — the same animal at a quarter scale, and it stays that way.
  // Ember-orange, permanently warm, throat lit like a banked fire.
  dragon_whelp: dragon({
    hide: '#b0552c', dark: '#77321a', belly: '#e0a45c', membrane: '#96482c',
    horn: '#d6c096', spar: '#a87c58', eye: '#ffd050', glow: '#ff9430',
  }, { bw: 6, bh: 5, bd: 10, legH: 3, legW: 2, neck: 3, headW: 5, headH: 4, headD: 5, wingW: 5, wingD: 4 }),
};
