# Sproutlands — Realism Roadmap (post-combat-pass)

The realistic-route build order. Each job is a tested commit pushed to the
working branch. The combat de-magick pass (mana→stamina, spells→Fantasy
Frontier, real bleed/Medicine) is done; this is what follows.

Engine facts that shape the plan:
- **Ambient occlusion + smooth vertex light** already bake in `js/gfx/mesher.js`.
- **Distance fog + day/night sky** already drive from the clock in `js/gfx/renderer.js`
  (`uFogColor/uFogNear/uFogFar`, cave-fog blend). Fog is *not* yet biome/weather-tinted.
- **Water** already has its own shader program.
- `js/world/worldgen.js` exposes `temperatureAt(x,z)` / `moistureAt(x,z)` (0–1) and
  `biomeAt` — the inputs for felt temperature.
- World clock: `DAY_LEN = 480 s`, `world.time` persisted, `world.dayPhase()` → 0–1.

## Job 1 — Climate & weather core  ⟶ foundation for 2 and 5
Season clock (over N days) + a per-region weather state machine
(clear/cloudy/rain/storm/snow/fog/heatwave/blizzard) chosen from biome
temp/moisture + season + noise. Weather tints sky/fog colour and density and
dims daylight; rain/snow particles render. HUD: season badge + weather icon +
day-length. Persist season/weather seed with the world.

## Job 2 — Body temperature  ⟶ the climate stakes
Felt temp = biome base + season + time-of-day + weather + altitude + in-water +
near-fire − clothing insulation + activity. Comfort band (widened by
Constitution); drift to cold → shiver → hypothermia, hot → sweat → heatstroke,
which drain stamina then health. Clothing (Tailoring) insulates; fire/shelter
warms. HUD thermometer + state badges.

## Job 3 — Hydration + Nutrition  ⟶ body needs
Hydration: thirst drains over time, faster when hot/sprinting; drink from water
sources / waterskin; low hydration drains stamina then health. Nutrition: track
food-group balance (carb/protein/fat/vitamin) from meals → regen / max-stamina
bonus; malnutrition → penalty. Nutrition tags on food items; ties Cooking +
Constitution. HUD hydration + nutrition gauges.

## Job 4 — Fuel-temperature smelting  ⟶ real metallurgy
Fuels carry heat ratings (wood < charcoal < coal < …); furnace / bloomery /
blast furnace reach temperatures; each metal needs a minimum temperature to
smelt, gating the ladder by real thermodynamics as well as Smithing level.
Extends the existing furnace/crafting code.

## Job 5 — Visual polish  ⟶ the reward lap
Per-biome + weather + season colour grading (fog tint + subtle grade); gradient
sky + sun/moon disc + night stars; water wave/fresnel upgrade if the current
water program is flat; bloom on emissive (lava/fire/sun) if a post pass is
feasible on mobile.

## Job 6 — Mob import  ⟶ DEFERRED (user uploads the pack)
Importer + validation harness ready (`docs/MOBS_TO_GENERATE.md` defines the
`mob` format; the combat pass added the optional `bleed` field). On
upload: spin an agent to import + validate every mob, wire per-biome spawn
tables, retire the fantasy `ENEMY_TYPES`, and test.
