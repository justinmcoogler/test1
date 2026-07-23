# Human skin texture pack

The image-generated human pack contains **100 original 64×64 RGBA PNG skins**
for the project's classic-width humanoid proportions:

- head: 8×8×8 model pixels
- torso: 8×12×4
- arms: 4×12×4
- legs: 4×12×4

The PNGs use the standard 64×64 classic-arm base-layer UV layout. Unused and
outer-layer regions remain transparent. Every required head, torso, arm, and
leg base face is fully opaque.

## Content

The roster covers townsfolk, tradespeople, adventurers, warriors, scholars,
mages, biome-specific residents, nobles, and rogues. Characters vary in age,
skin tone, hair, clothing silhouette, and gender presentation. All designs are
original and contain no logos, text, or recognizable existing characters.

## Files

- Generated source sheets: `assets/human-skins-imagegen/sheets/raw/`
- Reconstructed 16×32 front designs: `assets/human-skins-imagegen/fronts/`
- Game-ready 64×64 atlases: `assets/human-skins-imagegen/final/`
- Contact and isometric review sheets: `art/human-skin-review-imagegen/`
- ZIPs, manifest, and QA: `art/human-skin-delivery-imagegen/`

Rebuild and validate with:

```sh
python tools/build-human-skins.py --process
```

## Runtime integration note

`registerPlayerModel()` currently assigns procedural `skin_*` material tiles
instead of binding an individual 64×64 player texture. These PNGs are ready for
the classic humanoid rig, but a skin-selection/texture-binding path is still
required before they appear on the player or built-in NPCs at runtime.
