# Mob authoring brief

The prompt for building any creature in Sproutlands. Written so a person or a
model can follow it and land a mob that sits next to a Minecraft cow without
looking wrong. Every rule here comes from how vanilla entity models are actually
constructed — the machine-checkable parts are enforced by
`js/game/mobremakes/mcmodel.js` and `tools/mc-grid-mobs.mjs`.

---

## 1. The roster

Start small and real. The shipping roster is **farm animals plus a wolf**:

| mob | rig | reads as |
| --- | --- | --- |
| cow | quadruped | heavy Holstein grazer |
| pig | quadruped | low pink porker |
| sheep | quadruped | fleece barrel on dark legs |
| goat | quadruped | lean climber, swept horns |
| horse | quadruped | tall, arched neck, long head |
| chicken | pecker | plump hen, comb + wattle |
| duck | pecker | boat body, flat bill |
| rabbit | scamper | hunched, tall ears, big hind feet |
| wolf | quadruped | slender predator, mane, howl |

Fantasy creatures stay out of the starter set. A mob earns a place by being
something a player already recognises; invented monsters come later, built to the
same rules.

## 2. Geometry — the non-negotiables

1. **One block = 16 pixels.** Author in pixels. Every offset and every size is a
   whole pixel. Nothing lands between texels.
2. **Limbs are never thinner than 2px.** The default cross-section is **4×4**
   (cow, pig, sheep, goat, horse, player). **3×3** for small mobs (chicken,
   duck). **2×2** only where the silhouette is deliberately slender — wolf legs,
   skeletons, bats. A limb thinner than the texel painted on it reads as wire.
3. **Detail boxes may be 1px** — horns, ears, beaks, wattles, wings. That is
   vanilla practice, not a violation.
4. **Mass over frame.** The readable silhouette is a big body on short thick
   legs. When unsure, make the body bigger and the legs shorter.
5. **Pivots sit at the joint** — shoulder at the top of the arm, hip at the top
   of the leg, base of the skull for the head — and on the grid, so a limb
   rotates about a texel edge instead of shimmering.
6. **Hard edges only.** Axis-aligned boxes, no bevels. Shape comes from stacking
   boxes; detail comes from the painted skin.
7. **Feet at y = 0** unless the creature genuinely hovers.

Canonical vanilla dimensions live in `MC_REF` in `mcmodel.js`. A remake should
land within a pixel or two of its reference:

```
cow      body 12×10×18   head 8×8×6   legs 4×12×4   ~26px tall
pig      body 10×8×16    head 8×8×8   legs 4×6×4    ~16px
sheep    body 8×10×16    head 6×6×8   legs 4×12×4   ~26px
chicken  body 6×8×6      head 4×6×3   legs 3×5×3    ~16px
wolf     body 6×6×9      head 6×6×4   legs 2×8×2    ~18px, mane 8×7×6
horse    body 10×10×22   head 6×6×9   legs 4×14×4   ~36px
rabbit   body 6×4×8      head 6×5×5   legs 2×3×2    ~16px with ears
```

## 3. Skin

- One texture per creature, 64×64, painted in-engine by the def's `paint()`.
- Flat colour fields, 2–3 shades per material, light dithering for texture. No
  gradients, no anti-aliasing, no outlines drawn in a lighter colour than the
  fill.
- Eyes are 1–2px blocks with a single lighter pixel for the catch-light. Two eyes
  on the **south** face — `+Z is forward` in this engine.
- Paint the underside darker than the top; it does the shading the flat geometry
  can't.

## 4. Animation — what each clip is for

Animation is what sells a box as an animal. Every mob gets the three base clips;
each species adds an **ambient** clip that fires occasionally while idle, which
is where the personality lives.

**Base clips (built automatically from the rig):**
- `idle` — breathing, a slow head turn, a tail sway. Never perfectly still.
- `walk` — diagonal leg pairs swing together (front-left with rear-right). Body
  bobs a little. This is the single strongest cue that a quadruped is an animal.
- `attack` — a committed lunge with a recoil, not a wiggle.

**Ambient clips (species-specific, the point of the exercise):**
| mob | clip | what it does |
| --- | --- | --- |
| wolf | `howl` | head tilts up ~55°, holds, settles — with a tail lift |
| wolf | `shake` | fast body/tail shudder, wet-dog |
| cow, sheep, goat, horse | `graze` | head drops to the ground, holds, comes up |
| chicken, duck | `peck` | sharp head stab down and back |
| rabbit | `sniff` | quick nose bobs, ears twitch |

Rules for a good clip:
- **Hold the pose.** The readable part of a howl is the *hold*, not the travel.
  Ease in over ~20% of the clip, hold for ~50%, settle over the rest.
- **Move more than one part.** A howl that only moves the head looks broken; the
  body lifts slightly and the tail rises with it.
- **Never loop an ambient.** It plays once and hands back to `idle`.
- **Stagger by entity** so a herd doesn't move in lockstep.

## 5. Definition shape

```js
mobname: {
  texW: 64, texH: 64, rig: 'quadruped',
  paint(ctx, P) { /* draw the 64×64 skin */ },
  anims: {                       // extra named clips
    howl: { length: 3.2, loop: false, parts: { head: { rotate: [...] } } },
  },
  ambient: { clip: 'howl', every: [12, 30] },   // seconds between plays
  parts: [
    part('body', [0, 8, 0], [ b([-3, 8, -5], [6, 6, 9], uv) ]),
    part('head', [0, 14, 4], [ b([-3, 12, 4], [6, 6, 4], uv) ]),
    part('leg0', [-2, 8, 4], [ b([-3, 0, 3], [2, 8, 2], uv) ]),
    ...
  ],
}
```
Part ids drive the rig: `body` (required), `head`, `tail`, `leg*` for the walk
cycle, `arm*` for swings. Pivot x/z sign decides which diagonal pair a leg
belongs to, so put the hips where they really are.

## 6. Before you call it done

- `node tools/mc-grid-mobs.mjs` reports **0 numbers off-grid**.
- No walking limb thinner than its species rule allows. (The wolf's 2×2 legs are
  the deliberate exception — vanilla builds them that way.)
- `node tests/mobposedir.mjs` — proves each ambient clip moves the muzzle the way
  it should: graze/peck/sniff **down**, howl **up**. Cheap insurance against a
  sign flip that would otherwise ship as a head rotating into the body.
- `node tests/mobaudit.mjs` — renders the whole roster in every clip onto one
  contact sheet (`tests/screenshots/roster-audit.png`) and flags anything that
  drew nothing, sits tiny in frame, or runs off the edge.
- **Then actually look at the sheet.** The numeric checks cannot see a shapeless
  animal. Judge it from a 3/4 side view, never head-on — a quadruped seen from
  the front is unreadable, and a dipped head hides behind the body, which looks
  like a bug that isn't there. If the walk doesn't read as an animal from three
  metres away, the legs are too thin or the body is too small.
