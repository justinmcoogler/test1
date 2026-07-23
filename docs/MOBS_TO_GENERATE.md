# Emberveil — Mob Generation List (real-world route)

Feed this to the mob-file + texture generator. Each entry becomes one
**`emberveil-mob` v1 JSON** (the format the in-game importer already loads) plus
a **32×32-per-tile texture** on the mob's own UV sheet (same 32px scale as blocks).

## Output each mob as `emberveil-mob` v1
```
{ "format":"emberveil-mob", "version":1, "id":"red_deer", "label":"Red Deer",
  "scale":1.0,
  "texture": { "width":64, "height":64, "rgbaBase64":"…" },   // 64² sheet, 32px feel
  "parts": [ { "id":"body","parent":null,"pivot":[…],"boxes":[ { "from":[…],"size":[…],"uv":{…} } ] }, … ],
  "animations": { "idle":{…}, "walk":{…}, "attack":{…} },      // keyframed rotate/translate
  "stats": { "hp":…, "atk":…, "acc":…, "evasion":…, "armor":…, "speed":…, "moveRange":…,
             "behavior":"passive|defensive|aggressive", "tier":…, "xp":…, "huntXp":…, "respawn":…,
             "bleed":0.0 },   // optional 0–1: chance a hit opens a bleeding wound (claws/fangs)
  "drops": [ { "item":"…","qty":[min,max],"chance":… } ],
  "spawn": { "biomes":[…], "density":0.001, "packSize":[min,max] } }   // density pre-multiplier; game also applies MOB_SPAWN_RATE
```

## Reusable rig templates (pick one per mob so the generator reuses geometry)
- **quad_small** — fox/hare/cat size: body + head + 4 legs + tail (rabbit: big ears, stub tail)
- **quad_medium** — wolf/deer/boar/goat: + optional antlers/horns/tusks/snout
- **quad_large** — bear/moose/cattle/big cat/camel: heavier body, thicker legs
- **biped_bird** — ostrich/heron/hawk/owl/turkey: body + head/beak + 2 legs + 2 wings + tail
- **serpent** — snake/eel/anaconda: segmented body chain, head, no legs (slither anim)
- **fish** — trout/shark/salmon: body + tail fin + 2 side fins + dorsal (swim anim)
- **critter** — frog/crab/scorpion/lizard/bat: small custom (crab: claws; scorpion: tail+claws; bat: wings)
- **mega** — boss scale (scale 2.0–5.0) on the nearest quad/serpent/fish rig, tusks/horns/armor plates as needed

**Animations:** every mob needs `idle` (breathe/tail-flick), `walk` (leg alternation or slither/swim), `attack` (lunge/gore/bite/peck). Birds add a flap; fish/serpents replace walk with swim/slither.

**Roles → stat/behavior defaults**
- `prey` (deer, hare, gazelle…): passive, flees, high evasion, low atk, good hide/meat drops, `huntXp` high
- `predator` (wolf, big cat, bear…): aggressive/defensive, packs where noted
- `small` (fox, rabbit, birds…): passive/skittish, low hp
- `livestock`: passive, tameable/breedable (see husbandry)
- `boss`: aggressive, high hp, telegraphed specials, `tier` 3–4

Densities below are the mob's *base* `spawn.density`; the world also multiplies by the global `MOB_SPAWN_RATE` (0.4), so keep these ~0.0008–0.003.

---

## Core biomes — Grassland · Temperate Forest · Temperate Rainforest
| id | Name | role | rig | size | appearance |
|---|---|---|---|---|---|
| red_deer | Red Deer | prey | quad_medium | M | tan coat, white rump; stag has branching antlers |
| roe_deer | Roe Deer | prey | quad_small | S | small reddish deer, short antlers |
| wild_boar | Wild Boar | defensive | quad_medium | M | bristly dark-brown, tusks, snout |
| red_fox | Red Fox | small | quad_small | S | rust coat, white chest, bushy white-tip tail |
| gray_wolf | Gray Wolf | predator (pack 2–4) | quad_medium | M | gray fur, yellow eyes |
| brown_bear | Brown Bear | predator | quad_large | L | shaggy brown, shoulder hump |
| cougar | Cougar | predator | quad_medium | M | tawny, long tail, small round ears |
| elk | Elk | prey | quad_large | L | large, dark neck-mane, big antlers |
| european_badger | Badger | small | quad_small | S | black-white striped face, low body |
| river_otter | River Otter | small | quad_small | S | sleek brown, near water |
| rabbit | Rabbit | small | quad_small | XS | long ears, stub tail, brown/gray |
| gray_squirrel | Squirrel | small | critter | XS | bushy tail, tree-dweller |
| red_tailed_hawk | Hawk | small | biped_bird | S | brown back, rust tail, hooked beak (flies) |
| great_horned_owl | Owl | small | biped_bird | S | mottled brown, ear tufts (nocturnal) |
| wild_turkey | Wild Turkey | prey | biped_bird | M | dark iridescent, fan tail, wattle |

## Cold biomes — Boreal Forest · Tundra · Snowy Mountains · Polar Ice Cap
| id | Name | role | rig | size | appearance |
|---|---|---|---|---|---|
| moose | Moose | defensive | quad_large | L | very tall, dark, palmate antlers, dewlap |
| caribou | Caribou / Reindeer | prey (herd) | quad_medium | M | gray-brown, both sexes antlered |
| musk_ox | Musk Ox | defensive (herd) | quad_large | L | shaggy dark skirt, curved horns |
| brown_bear_boreal | Brown Bear | predator | quad_large | L | as brown bear, thicker coat |
| polar_bear | Polar Bear | predator | quad_large | L | cream-white, long neck (polar/ice) |
| eurasian_lynx | Lynx | predator | quad_small | S | spotted gray, ear tufts, ruff |
| arctic_fox | Arctic Fox | small | quad_small | XS | white (winter) fluffy |
| arctic_wolf | Arctic Wolf | predator (pack 2–3) | quad_medium | M | white/pale gray |
| snow_leopard | Snow Leopard | predator | quad_medium | M | pale gray rosettes, thick tail (snowy peaks) |
| ibex | Ibex | prey | quad_medium | M | brown, huge ridged back-curved horns |
| wolverine | Wolverine | defensive | quad_small | S | dark brown, pale side stripe, stocky |
| mountain_hare | Mountain Hare | small | quad_small | XS | white/gray, long ears |
| walrus | Walrus | defensive | quad_large | L | blubbery, tusks, whiskers (ice coast) |
| harbor_seal_ice | Seal | small | quad_small | M | mottled gray, flippers (ice edge) |
| orca | Orca | predator | fish | L | black-white, tall dorsal (open water) |
| snowy_owl | Snowy Owl | small | biped_bird | S | white, yellow eyes |
| ptarmigan | Ptarmigan | prey | biped_bird | S | white/mottled grouse |

## Hot & arid — Savanna · Desert · Cold Desert · Mediterranean Shrubland
| id | Name | role | rig | size | appearance |
|---|---|---|---|---|---|
| plains_zebra | Zebra | prey (herd) | quad_medium | M | black-white stripes, erect mane |
| gazelle | Gazelle | prey (herd) | quad_small | S | tan, white belly, ringed horns |
| lion | Lion | predator (pride 2–4) | quad_large | L | tawny; male has mane |
| spotted_hyena | Hyena | predator (pack) | quad_medium | M | spotted, sloped back |
| ostrich | Ostrich | prey | biped_bird | L | tall, black/white plumes, long neck |
| vulture | Vulture | small | biped_bird | M | bald head, dark, hunched (scavenger) |
| dromedary | Camel | livestock/prey | quad_large | L | one hump, sandy (desert) |
| bactrian_camel | Bactrian Camel | livestock/prey | quad_large | L | two humps, shaggy (cold desert) |
| fennec_fox | Fennec Fox | small | quad_small | XS | sandy, huge ears |
| corsac_fox | Corsac Fox | small | quad_small | XS | pale gray (steppe) |
| przewalski_horse | Wild Horse | prey (herd) | quad_medium | M | dun, erect mane (steppe) |
| saiga | Saiga Antelope | prey | quad_small | S | pale, bulbous drooping nose |
| rattlesnake | Rattlesnake | defensive | serpent | S | banded, rattle tail |
| desert_monitor | Monitor Lizard | defensive | critter | S | sandy, long tail, forked tongue |
| scorpion | Scorpion | defensive | critter | XS | segmented, claws + stinger tail |
| jerboa | Jerboa | small | critter | XS | tiny, long hind legs, tufted tail |
| mouflon | Mouflon | prey | quad_medium | M | brown, curled horns (shrubland) |
| iberian_lynx | Iberian Lynx | predator | quad_small | S | spotted tawny, ear tufts, beard |

## Tropical — Tropical Rainforest · Monsoon Forest · Mangrove
| id | Name | role | rig | size | appearance |
|---|---|---|---|---|---|
| jaguar | Jaguar | predator | quad_medium | M | golden rosettes, stocky |
| tiger | Tiger | predator | quad_large | L | orange, black stripes (monsoon) |
| asian_elephant | Elephant | defensive | quad_large | XL | gray, trunk, small tusks, big ears |
| tapir | Tapir | prey | quad_medium | M | dark body, short prehensile snout |
| capybara | Capybara | prey | quad_medium | M | barrel-shaped, brown, blunt head |
| sambar_deer | Sambar Deer | prey | quad_medium | M | dark shaggy, rugged antlers |
| sloth_bear | Sloth Bear | defensive | quad_medium | M | shaggy black, pale muzzle, chest V |
| howler_monkey | Howler Monkey | small | critter | S | dark, prehensile tail (arboreal) |
| macaque | Macaque | small | critter | S | brown, pink face |
| green_anaconda | Anaconda | predator | serpent | L | olive-green, dark blotches (water) |
| king_cobra | King Cobra | defensive | serpent | M | olive, hood |
| pit_viper | Pit Viper | defensive | serpent | S | green, triangular head |
| scarlet_macaw | Macaw | small | biped_bird | S | red/yellow/blue, long tail |
| toucan | Toucan | small | biped_bird | S | black body, huge orange bill |
| peafowl | Peafowl | prey | biped_bird | M | iridescent blue, eyed tail fan |
| poison_dart_frog | Dart Frog | small | critter | XS | tiny, vivid warning colors |
| saltwater_croc | Saltwater Crocodile | predator | quad_large | L | armored, long jaws (mangrove) |
| water_monitor | Water Monitor | defensive | critter | M | dark, long tail (mangrove) |
| mudskipper | Mudskipper | small | fish | XS | amphibious, bulging eyes (mangrove) |
| fiddler_crab | Fiddler Crab | small | critter | XS | one giant claw (mangrove) |
| egret | Egret | small | biped_bird | S | white, long neck & legs |

## Wetland · Coast · Mountain — Swamp · Marshland · Mountains · Alpine Meadow · Coast
| id | Name | role | rig | size | appearance |
|---|---|---|---|---|---|
| american_alligator | Alligator | predator | quad_large | L | dark armored, broad snout (swamp) |
| snapping_turtle | Snapping Turtle | defensive | critter | S | dark shell, hooked beak |
| cottonmouth | Cottonmouth | defensive | serpent | S | dark, white mouth (swamp) |
| bullfrog | Bullfrog | small | critter | XS | green, big throat |
| great_blue_heron | Heron | small | biped_bird | M | blue-gray, dagger bill, long legs |
| mallard | Duck | small | biped_bird | S | green head (drake), brown hen |
| muskrat | Muskrat | small | quad_small | XS | brown, ratlike, near water |
| coot | Coot | small | biped_bird | S | black, white bill |
| bighorn_sheep | Bighorn Sheep | prey | quad_medium | M | brown, massive curled horns |
| mountain_goat | Mountain Goat | prey | quad_medium | M | white shaggy, black horns (alpine) |
| chamois | Chamois | prey | quad_small | S | tan, small hooked horns |
| golden_eagle | Eagle | small | biped_bird | M | dark brown, golden nape (flies) |
| marmot | Marmot | small | quad_small | S | plump brown, burrower |
| pika | Pika | small | critter | XS | tiny round, no visible tail |
| alpine_chough | Chough | small | biped_bird | S | black, yellow bill |
| seagull | Gull | small | biped_bird | S | white/gray, coast |
| shore_crab | Crab | small | critter | XS | two claws, sidestep (coast) |
| sandpiper | Sandpiper | small | biped_bird | XS | small brown wader |
| harbor_seal | Harbor Seal | small | quad_small | M | mottled gray, flippers (coast) |
| sea_turtle | Sea Turtle | small | fish | M | flippered, shell (coast shallows) |

## Cave & Volcanic (nice-to-have)
| id | Name | role | rig | size | appearance |
|---|---|---|---|---|---|
| cave_bat | Cave Bat | small (swarm) | critter | XS | dark, wings (underground) |
| olm | Olm | small | fish | XS | pale, blind, external gills |
| blind_cavefish | Blind Cavefish | small | fish | XS | pale, eyeless |
| cave_cricket | Cave Cricket | small | critter | XS | long antennae/legs |
| cave_spider | Cave Spider | defensive | critter | XS | dark, 8 legs |
| raven | Raven | small | biped_bird | S | glossy black (volcanic slopes) |
| wild_goat_volcanic | Wild Goat | prey | quad_medium | M | on cooled slopes |

## Livestock (Farming / Husbandry) — tameable + breedable, adults + juveniles
| id | Name | rig | note |
|---|---|---|---|
| cow / calf | Cattle | quad_large / quad_small | milk, meat, hide, horn; breed for traits |
| pig / piglet | Pig | quad_medium / quad_small | meat, hide, tallow |
| sheep / lamb | Sheep | quad_medium / quad_small | wool (shear), meat |
| goat / kid | Goat | quad_medium / quad_small | milk, meat, hide; climbs |
| horse / foal | Horse | quad_large / quad_small | riding/hauling; multiple coat colors |
| chicken / chick | Chicken | biped_bird / critter | eggs, meat, feathers |
| duck | Duck | biped_bird | eggs, meat, down |
| honeybee + beehive | Bees | critter + block | honey, wax (beehive is a block, not a mob rig) |

## Bosses — legendary specimens & extinct megafauna (scale 2.0–5.0, tier 3–4)
| id | Name | biome | rig | special (telegraphed, non-magical) |
|---|---|---|---|---|
| woolly_mammoth | Woolly Mammoth | tundra/snowy | mega quad_large | tusk sweep, ground-stomp shockwave, trumpet-charge |
| woolly_rhino | Woolly Rhino | tundra | mega quad_large | horn gore + charge |
| mastodon | Mastodon | boreal | mega quad_large | tusk swat, trample |
| cave_bear | Cave Bear | mountains/cave | mega quad_large | maul, enrage below half HP |
| cave_lion | Cave Lion | cold/steppe | mega quad_medium | pounce, roar (fear/knockback) |
| smilodon | Sabertooth (Smilodon) | savanna/temperate | mega quad_medium | saber lunge (bleed), pin |
| dire_wolf_alpha | Dire Wolf Alpha | boreal/temperate | mega quad_medium | summons pack, coordinated flank |
| titanoboa | Titanoboa | swamp/tropical | mega serpent | constrict (root), lunge-swallow |
| megalodon | Megalodon | deep coast/open water | mega fish | breach-bite, tail slam (water boss) |
| megatherium | Giant Ground Sloth | tropical/temperate | mega quad_large | claw rake, rear-up slam |
| irish_elk | Irish Elk (Megaloceros) | temperate/boreal | mega quad_large | enormous antler sweep, charge |
| glyptodon | Glyptodon | savanna/swamp | mega critter | shell tuck (armor), tail-club |
| terror_bird | Terror Bird | savanna/grassland | mega biped_bird | beak stab, kick, sprint-chase |
| short_faced_bear | Short-faced Bear | mountains/tundra | mega quad_large | long-legged rush, swat |
| aurochs_bull | Aurochs Bull | grassland/marsh | mega quad_large | gore + charge (wild ancestor of cattle) |
| castoroides | Giant Beaver | marsh/swamp | mega quad_medium | incisor bite, tail slam, floods area |
| great_stag | Great Stag (legendary) | temperate forest | mega quad_large | legendary red deer — antler charge |
| alpha_lion | Legendary Lion | savanna | mega quad_large | oversized maned lion, pride-caller |
| record_fish | The One That Never Got Away | any deep water | mega fish | legendary Fishing target, not combat |

**Totals:** ~120 wild animals + ~19 bosses + ~12 livestock/juveniles. Each = 1 mob JSON + 1 texture sheet.
