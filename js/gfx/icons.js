// Procedural 16×16 pixel-art icons — the game's entire icon set (no emoji).
// Each shape is drawn once onto a canvas and cached as a data URL; the <img>
// tags render with image-rendering: pixelated (class "pix").
import { TEXPACK_ITEMS } from './texpack.js';

const SIZE = 16;
const cache = new Map(); // icon name → data URL

// ---- shape painters --------------------------------------------------------
// p(x, y, w, h, color) paints a pixel rectangle.
const SHAPES = {
  // tools -----------------------------------------------------------------
  axe(p, head = '#c9cdd6', handle = '#8a6a3a') {
    p(4, 9, 2, 6, handle); p(5, 7, 2, 3, handle);
    p(6, 3, 5, 2, head); p(5, 4, 7, 3, head); p(6, 7, 4, 2, head);
    p(5, 4, 1, 2, '#ffffff33');
  },
  pickaxe(p, head = '#c9cdd6', handle = '#8a6a3a') {
    p(7, 6, 2, 9, handle);
    p(3, 4, 10, 2, head); p(2, 5, 2, 3, head); p(12, 5, 2, 3, head);
    p(3, 4, 3, 1, '#ffffff33');
  },
  shovel(p, head = '#c9cdd6', handle = '#8a6a3a') {
    p(7, 2, 2, 8, handle); p(6, 1, 4, 2, handle);
    p(5, 10, 6, 4, head); p(6, 14, 4, 1, head);
  },
  rod(p, wood = '#8a6a3a') {
    p(3, 12, 2, 2, wood); p(4, 10, 2, 2, wood); p(5, 8, 2, 2, wood);
    p(6, 6, 2, 2, wood); p(7, 4, 2, 2, wood); p(8, 2, 3, 2, wood);
    p(11, 3, 1, 6, '#c9cdd6'); p(10, 9, 2, 2, '#e2b13c');
  },
  hammer(p, head = '#9aa0ac', handle = '#8a6a3a') {
    p(7, 6, 2, 9, handle);
    p(3, 2, 10, 4, head); p(4, 6, 3, 2, head);
    p(3, 2, 4, 1, '#ffffff33');
  },
  saw(p) {
    p(2, 5, 10, 3, '#c9cdd6');
    p(2, 8, 2, 2, '#c9cdd6'); p(5, 8, 2, 2, '#c9cdd6'); p(8, 8, 2, 2, '#c9cdd6');
    p(12, 4, 3, 5, '#8a6a3a');
  },
  hoe(p, head = '#c9cdd6', handle = '#8a6a3a') {
    p(7, 5, 2, 10, handle);
    p(4, 3, 6, 2, head); p(4, 5, 2, 3, head);
  },
  seeds(p) {
    p(4, 9, 3, 3, '#c9a86a'); p(9, 8, 3, 3, '#b8945a'); p(6, 12, 3, 3, '#d8b47a');
    p(5, 10, 1, 1, '#8a6a3a'); p(10, 9, 1, 1, '#8a6a3a'); p(7, 13, 1, 1, '#8a6a3a');
    p(6, 3, 4, 4, '#7fb069'); p(7, 2, 2, 2, '#8aa03a');
  },
  needle(p) {
    p(4, 11, 2, 2, '#e8e2d0'); p(6, 9, 2, 2, '#e8e2d0'); p(8, 7, 2, 2, '#e8e2d0');
    p(10, 5, 2, 2, '#e8e2d0'); p(12, 3, 1, 2, '#e8e2d0');
    p(3, 13, 2, 1, '#9a86c0'); p(2, 14, 4, 1, '#9a86c0');
  },
  // weapons ---------------------------------------------------------------
  sword(p, blade = '#d7dbe2', guard = '#8a6a3a') {
    p(9, 2, 2, 2, blade); p(8, 4, 2, 2, blade); p(7, 6, 2, 2, blade); p(6, 8, 2, 2, blade);
    p(4, 10, 3, 2, guard); p(7, 9, 2, 3, guard);
    p(3, 12, 2, 2, '#5a4326');
  },
  club(p, wood = '#8a6a3a') {
    p(4, 11, 2, 3, '#5a4326');
    p(6, 8, 3, 3, wood); p(8, 5, 4, 4, wood); p(9, 3, 4, 4, wood);
    p(10, 4, 1, 1, '#ffffff2e');
  },
  spear(p) {
    p(3, 12, 2, 2, '#8a6a3a'); p(5, 10, 2, 2, '#8a6a3a'); p(7, 8, 2, 2, '#8a6a3a');
    p(9, 6, 2, 2, '#8a6a3a');
    p(11, 2, 3, 3, '#e8e2d0'); p(11, 4, 2, 2, '#e8e2d0');
  },
  bow(p, wood = '#7a5c38') {
    p(5, 2, 4, 2, wood); p(9, 3, 2, 2, wood); p(10, 5, 2, 2, wood); p(11, 7, 2, 3, wood);
    p(10, 9, 2, 2, wood); p(9, 11, 2, 2, wood); p(5, 12, 4, 2, wood);
    p(4, 3, 1, 10, '#e8e2d0');
  },
  staff(p) {
    p(4, 12, 2, 2, '#5a4326'); p(6, 9, 2, 3, '#8a6a3a'); p(8, 6, 2, 3, '#8a6a3a');
    p(9, 3, 3, 3, '#e2622a'); p(10, 2, 2, 2, '#ffb347');
  },
  // armor -----------------------------------------------------------------
  helmet(p, c = '#c88a3f') {
    p(4, 4, 8, 3, c); p(3, 6, 10, 4, c);
    p(3, 10, 3, 2, c); p(10, 10, 3, 2, c);
    p(5, 5, 2, 1, '#ffffff30'); p(6, 8, 4, 2, '#00000045');
  },
  chestplate(p, c = '#c88a3f') {
    p(3, 3, 3, 3, c); p(10, 3, 3, 3, c);
    p(5, 3, 6, 5, c); p(4, 6, 8, 7, c);
    p(6, 4, 4, 1, '#00000035'); p(5, 7, 1, 4, '#ffffff28');
  },
  leggings(p, c = '#c88a3f') {
    p(4, 3, 8, 4, c);
    p(4, 7, 3, 7, c); p(9, 7, 3, 7, c);
    p(4, 3, 8, 1, '#ffffff28');
  },
  gloves(p, c = '#8a5a34') {
    p(4, 4, 5, 6, c); p(3, 5, 2, 3, c); p(9, 5, 2, 4, c);
    p(5, 10, 4, 3, '#6a4426');
  },
  boots(p, c = '#6a4426') {
    p(4, 3, 4, 6, c); p(4, 9, 7, 4, c); p(4, 12, 8, 2, '#4a2f1a');
  },
  shield(p, c = '#8a6a3a') {
    p(4, 2, 8, 8, c); p(5, 10, 6, 2, c); p(6, 12, 4, 2, c); p(7, 14, 2, 1, c);
    p(7, 3, 2, 9, '#e2b13c'); p(5, 6, 6, 2, '#e2b13c');
  },
  hood(p, c = '#9a86c0') {
    p(5, 2, 6, 3, c); p(4, 4, 8, 5, c); p(3, 8, 10, 4, c);
    p(6, 6, 4, 4, '#191324');
  },
  robe(p, c = '#9a86c0') {
    p(5, 2, 6, 3, c); p(4, 4, 8, 9, c); p(3, 12, 10, 2, c);
    p(7, 5, 2, 8, '#00000030');
  },
  cap(p, c = '#8a5a34') {
    p(4, 6, 8, 4, c); p(5, 4, 6, 3, c); p(3, 9, 11, 2, '#6a4426');
  },
  // materials -------------------------------------------------------------
  log(p, bark = '#7a5c38', ring = '#c9a86a') {
    p(3, 5, 10, 7, bark); p(2, 6, 1, 5, bark);
    p(11, 5, 3, 7, ring); p(12, 7, 1, 3, bark);
    p(4, 6, 6, 1, '#00000025'); p(4, 9, 6, 1, '#00000025');
  },
  stone(p, c = '#8f9298') {
    p(4, 6, 8, 6, c); p(5, 4, 6, 3, c); p(3, 8, 2, 3, c);
    p(5, 5, 3, 1, '#ffffff28'); p(6, 9, 4, 2, '#00000030');
  },
  ore(p, fleck = '#c47a3f') {
    SHAPES.stone(p, '#75787e');
    p(6, 6, 2, 2, fleck); p(9, 8, 2, 2, fleck); p(5, 9, 1, 1, fleck);
  },
  bar(p, c = '#b87e3c') {
    p(3, 6, 10, 5, c); p(2, 7, 1, 4, c); p(13, 7, 1, 3, c);
    p(4, 7, 8, 1, '#ffffff35'); p(4, 9, 8, 2, '#00000028');
  },
  gem(p, c = '#4fc3e8') {
    p(5, 4, 6, 2, c); p(4, 6, 8, 3, c); p(5, 9, 6, 2, c); p(6, 11, 4, 2, c); p(7, 13, 2, 1, c);
    p(6, 5, 2, 2, '#ffffff55');
  },
  crystal(p, c = '#4fc3e8') {
    p(7, 2, 2, 3, c); p(6, 4, 4, 6, c); p(7, 10, 2, 3, c);
    p(3, 7, 2, 5, c); p(11, 6, 2, 6, c);
    p(7, 4, 1, 4, '#ffffff55');
  },
  drop(p, c = '#e8a52a') {
    p(7, 3, 2, 2, c); p(6, 5, 4, 3, c); p(5, 7, 6, 4, c); p(6, 11, 4, 2, c);
    p(6, 7, 1, 3, '#ffffff45');
  },
  leaf(p, c = '#4a8a3a') {
    p(8, 3, 4, 2, c); p(6, 4, 6, 3, c); p(4, 6, 7, 3, c); p(4, 9, 4, 2, c);
    p(3, 11, 2, 2, '#7a5c38');
    p(7, 6, 1, 3, '#00000030');
  },
  root(p) {
    p(5, 3, 5, 3, '#7fb069');
    p(6, 6, 4, 4, '#e08a3f'); p(7, 10, 3, 3, '#d0742f'); p(7, 13, 2, 1, '#c06428');
  },
  mushroom(p, capc = '#6a4e8a') {
    p(4, 4, 8, 3, capc); p(5, 3, 6, 2, capc); p(3, 6, 10, 2, capc);
    p(6, 8, 4, 5, '#e0d8c0');
  },
  flower(p, c = '#e8c53a') {
    p(6, 3, 4, 4, c); p(4, 5, 3, 3, c); p(9, 5, 3, 3, c); p(6, 7, 4, 2, c);
    p(7, 5, 2, 2, '#8a4e2a');
    p(7, 9, 2, 4, '#4a8a3a'); p(9, 10, 2, 1, '#4a8a3a');
  },
  berries(p, c = '#5a6ac0') {
    p(4, 6, 4, 4, c); p(9, 5, 4, 4, c); p(6, 9, 4, 4, c);
    p(5, 7, 1, 1, '#ffffff45'); p(10, 6, 1, 1, '#ffffff45'); p(7, 10, 1, 1, '#ffffff45');
    p(7, 3, 3, 2, '#4a8a3a');
  },
  grain(p, c = '#d8b13c') {
    p(7, 8, 2, 6, '#8aa03a');
    p(5, 2, 2, 2, c); p(9, 2, 2, 2, c);
    p(4, 4, 3, 2, c); p(9, 4, 3, 2, c);
    p(5, 6, 3, 2, c); p(8, 6, 3, 2, c);
  },
  seed(p) {
    p(6, 6, 4, 5, '#8a5a34'); p(7, 5, 2, 2, '#6a4426'); p(7, 7, 1, 2, '#ffffff28');
  },
  fiber(p, c = '#a8c05a') {
    p(4, 3, 2, 10, c); p(7, 2, 2, 11, c); p(10, 4, 2, 9, c);
    p(3, 12, 10, 2, '#8aa03a');
  },
  cloth(p, c = '#9a86c0') {
    p(3, 4, 10, 8, c);
    p(3, 6, 10, 1, '#00000028'); p(3, 9, 10, 1, '#00000028');
    p(5, 4, 1, 8, '#ffffff20'); p(9, 4, 1, 8, '#ffffff20');
  },
  hide(p, c = '#8a5a34') {
    p(4, 3, 8, 10, c); p(3, 5, 1, 6, c); p(12, 5, 1, 6, c);
    p(5, 3, 2, 1, '#6a4426'); p(9, 12, 2, 1, '#6a4426');
    p(6, 6, 4, 3, '#00000022');
  },
  bone(p) {
    p(3, 10, 3, 3, '#e8e2d0'); p(5, 8, 3, 3, '#e8e2d0'); p(7, 6, 3, 3, '#e8e2d0');
    p(9, 4, 3, 3, '#e8e2d0'); p(11, 2, 3, 3, '#e8e2d0'); p(10, 2, 2, 2, '#e8e2d0');
  },
  shard(p, c = '#c08a5a') {
    p(5, 3, 6, 2, c); p(4, 5, 8, 4, c); p(6, 9, 5, 3, c);
    p(7, 5, 1, 4, '#00000035'); p(5, 6, 1, 2, '#ffffff28');
  },
  puzzle(p) {
    p(4, 4, 8, 8, '#7ac0c8'); p(7, 2, 3, 3, '#7ac0c8'); p(11, 7, 3, 3, '#7ac0c8');
    p(4, 8, 2, 2, '#0d1015'); p(7, 4, 2, 2, '#ffffff30');
  },
  coin(p, c = '#e2b13c') {
    p(5, 3, 6, 2, c); p(3, 5, 10, 6, c); p(5, 11, 6, 2, c);
    p(6, 5, 2, 6, '#a87e1e'); p(9, 5, 1, 6, '#a87e1e');
    p(5, 4, 2, 1, '#ffffff45');
  },
  heart(p, c = '#e04a4a') {
    p(3, 4, 4, 3, c); p(9, 4, 4, 3, c);
    p(3, 6, 10, 3, c); p(4, 9, 8, 2, c); p(6, 11, 4, 2, c); p(7, 13, 2, 1, c);
    p(4, 5, 2, 1, '#ffffff40');
  },
  heartplus(p) {
    SHAPES.heart(p, '#4ac06a');
    p(11, 1, 2, 6, '#e8fff0'); p(9, 3, 6, 2, '#e8fff0');
  },
  box(p, c = '#8a6a3a') {
    p(3, 5, 10, 8, c); p(3, 5, 10, 2, '#a8803f');
    p(3, 8, 10, 1, '#5a4326'); p(7, 7, 2, 3, '#e2b13c');
  },
  fish(p, c = '#b8c8d8') {
    p(4, 6, 7, 5, c); p(3, 7, 2, 3, c);
    p(11, 5, 2, 3, c); p(11, 9, 2, 3, c); p(12, 7, 2, 3, c);
    p(5, 7, 1, 1, '#0d1015'); p(6, 10, 4, 1, '#00000028');
  },
  eel(p) {
    p(2, 9, 4, 3, '#5a6a4a'); p(5, 7, 4, 3, '#6a7a52'); p(8, 5, 4, 3, '#5a6a4a');
    p(11, 3, 3, 3, '#6a7a52'); p(12, 4, 1, 1, '#0d1015');
  },
  meat(p, cooked = false) {
    const m = cooked ? '#a8582a' : '#d06a5a';
    p(4, 4, 8, 8, m); p(3, 6, 2, 4, m);
    p(6, 6, 4, 4, cooked ? '#c8825a' : '#e8a08a');
    p(11, 10, 3, 3, '#e8e2d0'); p(12, 12, 2, 2, '#e8e2d0');
  },
  bread(p) {
    p(3, 6, 10, 6, '#c08a3f'); p(4, 5, 8, 2, '#d8a45a');
    p(5, 7, 2, 1, '#8a5a24'); p(8, 8, 2, 1, '#8a5a24'); p(6, 10, 2, 1, '#8a5a24');
  },
  cookie(p) {
    p(4, 4, 8, 8, '#d8a45a'); p(3, 5, 1, 6, '#d8a45a'); p(12, 5, 1, 6, '#d8a45a');
    p(5, 6, 2, 2, '#6a4426'); p(9, 5, 2, 2, '#6a4426'); p(7, 9, 2, 2, '#6a4426');
  },
  plate(p) {
    p(2, 9, 12, 2, '#c9cdd6'); p(4, 11, 8, 1, '#9aa0ac');
    p(5, 6, 6, 3, '#a8582a'); p(6, 5, 4, 1, '#c8825a');
  },
  potion(p, c = '#e04a4a') {
    p(7, 2, 2, 2, '#c9a86a'); p(6, 4, 4, 2, '#b8d8e8');
    p(5, 6, 6, 6, c); p(4, 8, 8, 4, c); p(5, 12, 6, 1, c);
    p(6, 7, 1, 2, '#ffffff50');
  },
  lantern(p) {
    p(6, 2, 4, 1, '#5a5f68'); p(5, 3, 6, 2, '#5a5f68');
    p(4, 5, 8, 7, '#8a8f98'); p(5, 6, 6, 5, '#ffd76a');
    p(5, 12, 6, 2, '#5a5f68'); p(7, 8, 2, 2, '#fff2b8');
  },
  ring(p) {
    p(5, 5, 6, 2, '#e2b13c'); p(4, 6, 2, 5, '#e2b13c'); p(10, 6, 2, 5, '#e2b13c');
    p(5, 11, 6, 2, '#e2b13c'); p(6, 2, 4, 3, '#7ac0c8');
  },
  eye(p) {
    p(4, 5, 8, 6, '#3a5ac0'); p(3, 6, 1, 4, '#3a5ac0'); p(12, 6, 1, 4, '#3a5ac0');
    p(6, 6, 4, 4, '#e8f0ff'); p(7, 7, 2, 2, '#101318');
  },
  swirl(p, c = '#7ac0c8') {
    p(6, 3, 5, 2, c); p(10, 4, 2, 4, c); p(8, 7, 3, 2, c);
    p(5, 5, 2, 6, c); p(6, 10, 5, 2, c); p(11, 9, 2, 2, c);
  },
  orb(p, c = '#b06ae0') {
    p(5, 4, 6, 2, c); p(4, 5, 8, 6, c); p(5, 11, 6, 2, c);
    p(6, 5, 2, 2, '#ffffff50'); p(6, 13, 4, 1, '#8a6a3a');
  },
  urn(p) {
    p(5, 2, 6, 2, '#b8825a'); p(6, 4, 4, 1, '#8a5a34');
    p(4, 5, 8, 7, '#c08a5a'); p(5, 12, 6, 2, '#a8703f');
    p(5, 7, 6, 2, '#8a5a34');
  },
  pan(p) {
    p(3, 6, 8, 5, '#3a3f48'); p(4, 5, 6, 1, '#5a5f68');
    p(11, 7, 4, 2, '#8a6a3a');
    p(5, 7, 4, 2, '#e8c53a');
  },
  flask(p) {
    p(7, 2, 2, 4, '#b8d8e8'); p(5, 6, 6, 2, '#b8d8e8');
    p(4, 8, 8, 5, '#4ac06a'); p(5, 13, 6, 1, '#38a055');
    p(6, 9, 1, 2, '#ffffff45');
  },
  frame(p) {
    p(3, 12, 10, 2, '#8a6a3a');
    p(4, 7, 2, 5, '#8a6a3a'); p(10, 7, 2, 5, '#8a6a3a');
    p(3, 5, 10, 2, '#a8803f'); p(6, 2, 4, 3, '#c9cdd6');
  },
  muscle(p) {
    p(3, 9, 4, 4, '#d8a45a'); p(5, 6, 4, 5, '#d8a45a'); p(8, 4, 4, 4, '#d8a45a');
    p(9, 3, 4, 3, '#e8b86a'); p(11, 6, 2, 3, '#d8a45a');
  },
  brain(p) {
    p(4, 4, 8, 3, '#e08a9a'); p(3, 6, 10, 4, '#e08a9a'); p(4, 10, 7, 2, '#e08a9a');
    p(7, 4, 1, 8, '#b85a70'); p(4, 7, 3, 1, '#b85a70'); p(9, 8, 3, 1, '#b85a70');
  },
  target(p) {
    p(5, 3, 6, 2, '#e04a4a'); p(3, 5, 2, 6, '#e04a4a'); p(11, 5, 2, 6, '#e04a4a');
    p(5, 11, 6, 2, '#e04a4a'); p(5, 5, 6, 6, '#e8e2d0'); p(7, 7, 2, 2, '#e04a4a');
  },
  sparkle(p, c = '#e8d56a') {
    p(7, 2, 2, 12, c); p(2, 7, 12, 2, c);
    p(4, 4, 2, 2, c); p(10, 4, 2, 2, c); p(4, 10, 2, 2, c); p(10, 10, 2, 2, c);
    p(7, 7, 2, 2, '#fff8d0');
  },
  flame(p) {
    p(7, 2, 2, 3, '#e2622a'); p(5, 4, 5, 4, '#e2622a'); p(4, 7, 8, 5, '#e2622a');
    p(6, 6, 4, 5, '#ffb347'); p(7, 8, 2, 3, '#fff2b8'); p(5, 12, 6, 2, '#c04a1e');
  },
  burst(p) {
    p(7, 1, 2, 4, '#ffb347'); p(7, 11, 2, 4, '#ffb347');
    p(1, 7, 4, 2, '#ffb347'); p(11, 7, 4, 2, '#ffb347');
    p(3, 3, 3, 3, '#e2622a'); p(10, 3, 3, 3, '#e2622a');
    p(3, 10, 3, 3, '#e2622a'); p(10, 10, 3, 3, '#e2622a');
    p(6, 6, 4, 4, '#fff2b8');
  },
  swords(p) {
    p(2, 2, 2, 2, '#d7dbe2'); p(4, 4, 2, 2, '#d7dbe2'); p(6, 6, 2, 2, '#d7dbe2');
    p(12, 2, 2, 2, '#d7dbe2'); p(10, 4, 2, 2, '#d7dbe2'); p(8, 6, 2, 2, '#d7dbe2');
    p(6, 8, 4, 4, '#c9cdd6');
    p(4, 12, 3, 2, '#8a6a3a'); p(9, 12, 3, 2, '#8a6a3a');
  },
  // UI --------------------------------------------------------------------
  bag(p) {
    p(6, 2, 4, 2, '#6a4426'); p(5, 3, 2, 2, '#6a4426'); p(9, 3, 2, 2, '#6a4426');
    p(4, 5, 8, 8, '#8a5a34'); p(3, 6, 1, 6, '#8a5a34'); p(12, 6, 1, 6, '#8a5a34');
    p(6, 8, 4, 2, '#e2b13c');
  },
  chart(p) {
    p(2, 2, 2, 12, '#9aa0ac'); p(2, 12, 12, 2, '#9aa0ac');
    p(5, 9, 2, 3, '#4ac06a'); p(8, 6, 2, 6, '#e2b13c'); p(11, 3, 2, 9, '#e04a4a');
  },
  scroll(p) {
    p(4, 2, 8, 12, '#e8dcb8');
    p(3, 2, 2, 3, '#c9a86a'); p(11, 11, 2, 3, '#c9a86a');
    p(6, 5, 5, 1, '#8a7248'); p(6, 7, 5, 1, '#8a7248'); p(6, 9, 4, 1, '#8a7248');
  },
  mapicon(p) {
    p(2, 3, 4, 10, '#d8ce9a'); p(6, 4, 4, 10, '#c9be88'); p(10, 3, 4, 10, '#d8ce9a');
    p(4, 6, 5, 1, '#a05a3f'); p(8, 7, 3, 1, '#a05a3f');
    p(11, 5, 2, 2, '#e04a4a');
  },
  gear(p) {
    p(7, 1, 2, 3, '#9aa0ac'); p(7, 12, 2, 3, '#9aa0ac');
    p(1, 7, 3, 2, '#9aa0ac'); p(12, 7, 3, 2, '#9aa0ac');
    p(3, 3, 2, 2, '#9aa0ac'); p(11, 3, 2, 2, '#9aa0ac');
    p(3, 11, 2, 2, '#9aa0ac'); p(11, 11, 2, 2, '#9aa0ac');
    p(4, 4, 8, 8, '#c9cdd6'); p(6, 6, 4, 4, '#3a3f48');
  },
  trash(p) {
    p(5, 2, 6, 1, '#9aa0ac'); p(3, 3, 10, 2, '#9aa0ac');
    p(4, 5, 8, 9, '#7a7f88'); p(6, 7, 1, 5, '#3a3f48'); p(9, 7, 1, 5, '#3a3f48');
  },
  disk(p) {
    p(3, 3, 10, 10, '#3a5ac0'); p(11, 3, 2, 2, '#0d1015');
    p(5, 3, 6, 4, '#c9cdd6'); p(8, 4, 2, 2, '#3a3f48');
    p(5, 9, 6, 4, '#e8e2d0');
  },
  house(p) {
    p(7, 2, 2, 2, '#c05a3f'); p(5, 4, 6, 2, '#c05a3f'); p(3, 6, 10, 2, '#c05a3f');
    p(4, 8, 8, 6, '#c9a86a'); p(7, 10, 2, 4, '#6a4426'); p(5, 9, 2, 2, '#8ac4e8');
  },
  arrowup(p) {
    p(7, 2, 2, 2, '#e8e2d0'); p(5, 4, 6, 2, '#e8e2d0'); p(3, 6, 10, 2, '#e8e2d0');
    p(6, 8, 4, 6, '#e8e2d0');
  },
  chevrons(p) {
    p(3, 3, 2, 2, '#e8e2d0'); p(5, 5, 2, 2, '#e8e2d0'); p(7, 7, 2, 2, '#e8e2d0');
    p(5, 9, 2, 2, '#e8e2d0'); p(3, 11, 2, 2, '#e8e2d0');
    p(8, 3, 2, 2, '#e8e2d0'); p(10, 5, 2, 2, '#e8e2d0'); p(12, 7, 2, 2, '#e8e2d0');
    p(10, 9, 2, 2, '#e8e2d0'); p(8, 11, 2, 2, '#e8e2d0');
  },
  handstar(p) {
    p(7, 2, 2, 4, '#e8d56a'); p(3, 6, 10, 2, '#e8d56a');
    p(5, 8, 2, 3, '#e8d56a'); p(9, 8, 2, 3, '#e8d56a');
    p(4, 4, 2, 2, '#e8d56a'); p(10, 4, 2, 2, '#e8d56a');
    p(7, 6, 2, 2, '#fff8d0');
  },
  blockicon(p) {
    p(4, 6, 8, 7, '#b87e3c'); p(4, 4, 8, 3, '#d8a45a');
    p(4, 6, 8, 1, '#8a5a24'); p(7, 8, 2, 2, '#8a5a24');
  },
  bolt(p) {
    p(8, 1, 3, 4, '#e8d56a'); p(6, 4, 4, 4, '#e8d56a'); p(4, 7, 5, 3, '#e8d56a');
    p(6, 10, 3, 3, '#e8d56a'); p(5, 12, 2, 3, '#e8d56a');
  },
  hourglass(p) {
    p(4, 2, 8, 2, '#8a6a3a'); p(4, 12, 8, 2, '#8a6a3a');
    p(5, 4, 6, 2, '#b8d8e8'); p(6, 6, 4, 2, '#b8d8e8'); p(7, 8, 2, 1, '#e8d56a');
    p(6, 9, 4, 1, '#e8d56a'); p(5, 10, 6, 2, '#e8d56a');
  },
  camera(p) {
    p(3, 5, 10, 8, '#5a5f68'); p(6, 3, 4, 3, '#3a3f48');
    p(6, 7, 4, 4, '#8ac4e8'); p(7, 8, 1, 1, '#e8f0ff');
  },
  trophy(p) {
    p(4, 2, 8, 2, '#e2b13c'); p(5, 4, 6, 4, '#e2b13c');
    p(3, 3, 2, 3, '#c9971e'); p(11, 3, 2, 3, '#c9971e');
    p(7, 8, 2, 3, '#c9971e'); p(5, 11, 6, 2, '#8a6a3a');
  },
  skull(p) {
    p(4, 3, 8, 7, '#e8e2d0'); p(5, 10, 6, 3, '#e8e2d0');
    p(5, 5, 2, 2, '#101318'); p(9, 5, 2, 2, '#101318'); p(7, 8, 2, 1, '#101318');
    p(5, 11, 1, 2, '#101318'); p(8, 11, 1, 2, '#101318');
  },
  warn(p) {
    p(7, 1, 2, 2, '#e8c53a'); p(6, 3, 4, 4, '#e8c53a'); p(5, 7, 6, 4, '#e8c53a');
    p(4, 11, 8, 3, '#e8c53a');
    p(7, 4, 2, 6, '#3a3018'); p(7, 11, 2, 2, '#3a3018');
  },
  cart(p) {
    p(3, 4, 10, 6, '#8a6a3a'); p(2, 3, 2, 2, '#6a4426');
    p(4, 11, 3, 3, '#3a3f48'); p(10, 11, 3, 3, '#3a3f48');
    p(5, 5, 2, 2, '#e2b13c'); p(8, 6, 3, 2, '#c05a3f');
  },
  torch(p) {
    p(7, 6, 2, 8, '#8a6a3a');
    p(6, 3, 4, 4, '#ffb347'); p(7, 1, 2, 3, '#e2622a'); p(7, 4, 2, 2, '#fff2b8');
  },
  // ---- realistic-catalog additions --------------------------------------
  plank(p, c = '#b8945a', edge = '#8a6a3a') {
    p(2, 4, 12, 8, c); p(2, 4, 12, 1, edge); p(2, 11, 12, 1, edge);
    p(2, 7, 12, 1, '#00000022'); p(4, 5, 1, 6, edge);
  },
  arrows(p) {
    for (const dx of [-3, 0, 3]) {
      p(3 + dx + 3, 3, 1, 10, '#8a6a3a'); // shaft
      p(2 + dx + 3, 2, 3, 3, '#c9cdd6');  // head
      p(3 + dx + 3, 12, 1, 2, '#e8e2d0'); // fletch
    }
  },
  quarrel(p) {
    p(6, 3, 2, 9, '#7a5c38'); p(5, 2, 4, 3, '#9aa0ac'); p(5, 11, 4, 2, '#c05a3f');
    p(9, 3, 2, 9, '#7a5c38'); p(8, 2, 4, 3, '#9aa0ac');
  },
  pistol(p, steel = '#7a808c', wood = '#6a4426') {
    p(3, 5, 9, 2, steel); p(3, 4, 3, 1, steel);   // barrel
    p(3, 7, 3, 5, wood); p(4, 12, 3, 2, wood);     // grip
    p(6, 7, 2, 2, '#c9a24a');                       // brass lock
  },
  musket(p, steel = '#7a808c', wood = '#6a4426') {
    p(2, 6, 12, 2, steel); p(2, 8, 11, 2, wood);   // barrel + stock
    p(11, 8, 3, 4, wood); p(7, 8, 2, 2, '#c9a24a');
  },
  powder(p) {
    p(5, 5, 6, 8, '#4a3a2a'); p(6, 3, 4, 3, '#3a2c1e'); // horn/pouch
    p(7, 8, 2, 3, '#2a2622'); p(6, 6, 1, 1, '#e2b13c');
  },
  amulet(p, c = '#e6ebf2') {
    p(5, 2, 6, 1, c); p(4, 3, 2, 4, c); p(10, 3, 2, 4, c);      // chain
    p(6, 7, 4, 4, c); p(7, 8, 2, 2, '#4fc3e8');                 // pendant + gem
  },
};

// ---- concrete icon registry ------------------------------------------------
// name → [shape, ...args]
const DEFS = {
  // UI
  bag: ['bag'], chart: ['chart'], hammer: ['hammer'], scroll: ['scroll'],
  mapicon: ['mapicon'], gear: ['gear'], trash: ['trash'], disk: ['disk'],
  house: ['house'], arrowup: ['arrowup'], chevrons: ['chevrons'],
  handstar: ['handstar'], blockicon: ['blockicon'], coin: ['coin'],
  heart: ['heart'], bolt: ['bolt'], sparkle: ['sparkle'], warn: ['warn'],
  hourglass: ['hourglass'], camera: ['camera'], trophy: ['trophy'],
  skull: ['skull'], cart: ['cart'], swords: ['swords'], burst: ['burst'],
  shield: ['shield', '#8f9298'], target: ['target'], flame: ['flame'],
  heartplus: ['heartplus'], swirlicon: ['swirl'], boxicon: ['box'],
  // skills
  sk_mining: ['pickaxe', '#c9cdd6'], sk_woodcutting: ['axe', '#c9cdd6'],
  sk_fishing: ['rod'], sk_foraging: ['leaf'], sk_hunting: ['bow'],
  sk_farming: ['grain'], sk_archaeology: ['urn'], sk_smithing: ['hammer'],
  sk_woodworking: ['saw'], sk_cooking: ['pan'], sk_tailoring: ['needle'],
  sk_alchemy: ['flask'], sk_construction: ['frame'], sk_crafting: ['gem'], sk_enchanting: ['orb'],
  sk_vitality: ['heart'], sk_strength: ['muscle'], sk_defense: ['shield', '#8f9298'],
  sk_ranged: ['target'], sk_magic: ['sparkle'], sk_healing: ['heartplus'],
  sk_tactics: ['brain'], sk_athletics: ['burst'],
  // items
  it_coin: ['coin'], it_old_coin: ['coin', '#b87e3c'],
  it_warchief_standard: ['staff', '#c0a24a'], it_relic_fragment: ['puzzle'],
  it_waterlogged_cache: ['box', '#4a7a8a'],
  it_rough_stone: ['stone'], it_clay_lump: ['stone', '#c98a4f'],
  it_plant_fibre: ['fiber'], it_cord: ['fiber', '#c9a86a'], it_sinew: ['fiber', '#d8c9a8'],
  it_fernwood_log: ['log'], it_silverbark_log: ['log', '#b8bfc9', '#e2e6ea'],
  it_emberpine_log: ['log', '#5a3f28', '#a8703f'],
  it_copper_ore_chunk: ['ore', '#c47a3f'], it_tin_ore_chunk: ['ore', '#c9ccd4'],
  it_iron_ore_chunk: ['ore', '#b08674'], it_silver_ore_chunk: ['ore', '#eef1f6'],
  it_emberstone_shard: ['gem', '#e2622a'], it_veilcrystal: ['crystal'],
  it_flawless_veilcrystal: ['crystal', '#9be8ff'], it_rough_gem: ['gem', '#7ac74f'],
  it_flame_opal: ['gem', '#ff7a2a'],
  it_bronze_bar: ['bar'], it_iron_bar: ['bar', '#c8ccd4'],
  it_silver_bar: ['bar', '#e6ebf2'], it_embersteel_bar: ['bar', '#d84f2f'],
  it_amber_resin: ['drop'], it_ember_sap: ['drop', '#d84a2a'],
  it_silverleaf: ['leaf', '#c5d6dd'], it_fernwood_seed: ['seed'],
  it_boarhide: ['hide'], it_cured_hide: ['hide', '#a8783f'],
  it_woven_cloth: ['cloth'], it_pottery_shard: ['shard'], it_bone_needle: ['bone'],
  it_bitterleaf: ['leaf'], it_springroot: ['root'], it_duskcap: ['mushroom'],
  it_sunpetal: ['flower'], it_tartberries: ['berries'], it_grainsheaf: ['grain'],
  it_golden_grain: ['grain', '#ffd76a'],
  it_silverfin: ['fish'], it_mudwhisker: ['fish', '#8a7a5a'], it_duskeel: ['eel'],
  it_reedpike: ['fish', '#7a9a5a'], it_saltcrab: ['fish', '#c9683f'], it_palefin: ['fish', '#e6ecf4'],
  it_boar_haunch: ['meat', false], it_roast_haunch: ['meat', true],
  it_roast_silverfin: ['plate'], it_smoked_mudwhisker: ['plate'],
  it_seared_duskeel: ['plate'], it_hearth_loaf: ['bread'], it_travel_biscuit: ['cookie'],
  it_grilled_reedpike: ['plate'], it_saltcrab_boil: ['pan'],
  it_palefin_steak: ['plate'], it_harvest_feast: ['urn'],
  it_minor_healing_tonic: ['potion', '#e04a4a'], it_energy_tonic: ['potion', '#e8c53a'],
  it_lesser_mana_tonic: ['potion', '#4a7ae0'], it_antidote: ['potion', '#4ac06a'],
  it_greater_healing_draught: ['potion', '#ff5a7a'], it_veilwater_elixir: ['potion', '#6ad0e8'],
  it_worn_hatchet: ['axe', '#8f9298'], it_crude_axe: ['axe', '#8f9298'],
  it_bronze_axe: ['axe', '#c88a3f'], it_iron_axe: ['axe', '#d7dbe2'],
  it_crude_pickaxe: ['pickaxe', '#8f9298'], it_bronze_pickaxe: ['pickaxe', '#c88a3f'],
  it_iron_pickaxe: ['pickaxe', '#d7dbe2'],
  it_crude_shovel: ['shovel', '#8f9298'], it_bronze_shovel: ['shovel', '#c88a3f'],
  it_fishing_rod: ['rod'], it_reinforced_rod: ['rod', '#5a4326'],
  it_crude_hoe: ['hoe', '#8f9298'], it_bronze_hoe: ['hoe', '#c88a3f'],
  it_grain_seeds: ['seeds'],
  it_wooden_cudgel: ['club'], it_bronze_blade: ['sword', '#e0b06a'],
  it_iron_blade: ['sword'], it_boneshard_spear: ['spear'],
  it_thornwood_bow: ['bow'], it_recurve_silverbow: ['bow', '#c5d6dd'],
  it_ember_staff: ['staff'],
  it_frostbrand_blade: ['sword', '#9be8ff'],
  it_hide_cap: ['cap'], it_hide_jerkin: ['chestplate', '#8a5a34'],
  it_hide_leggings: ['leggings', '#8a5a34'], it_hide_gloves: ['gloves'],
  it_hide_boots: ['boots'], it_bronze_helm: ['helmet'],
  it_bronze_cuirass: ['chestplate'], it_bronze_greaves: ['leggings'],
  it_woven_hood: ['hood'], it_woven_robe: ['robe'], it_timber_shield: ['shield'],
  it_frostweave_coat: ['robe', '#cfe0ea'],
  it_ironbud_charm: ['flower', '#c8ccd4'], it_keen_charm: ['orb'],
  it_forager_band: ['ring'], it_ward_talisman: ['eye'], it_veilcharm: ['swirl'],
  it_emberward_sigil: ['orb', '#e2622a'], it_riftwarden_seal: ['swirl', '#9be8ff'],
  it_lantern: ['lantern'], it_torch_item: ['torch'],
};

// ---- generated icon defs for the realistic catalog (js/game/materials.js) --
// Presentation colors only; keeps every generated item off the boxicon fallback.
import { METALS, WOODS, GEMS, FIREARMS, toolMetals, jewelryMetals } from '../game/materials.js';
import { COLORS } from '../core/colors.js';
const METAL_COL = {
  copper: '#c47a3f', tin: '#cdd2da', bronze: '#c88a3f', iron: '#c8ccd4', steel: '#9aa4b0',
  damascus: '#8790a0', meteoric: '#6f6e78', lead: '#6c7079', zinc: '#b8c0c4', silver: '#e6ebf2',
  gold: '#e2b13c', platinum: '#dfe2e8', brass: '#c9a24a', electrum: '#d9c96a', pewter: '#9a9ba0',
};
const WOOD_COL = {
  pine: ['#7c5a3a', '#c8a878'], cedar: ['#8a4f38', '#c99a72'], birch: ['#d9d4c6', '#e2d6b6'],
  oak: ['#7a6248', '#b39468'], ash: ['#9a8c74', '#c9bd9e'], hickory: ['#7d6244', '#c0a074'],
  maple: ['#8a6a4a', '#d2b280'], walnut: ['#4f3a28', '#8a6a48'], yew: ['#7a4a3a', '#b98a6a'],
  teak: ['#9a6f42', '#c99a5e'], ebony: ['#2c2620', '#4a4038'], lignum_vitae: ['#5a5236', '#7a7248'],
};
const GEM_COL = {
  quartz: '#d8e8f0', amethyst: '#9a6ad0', garnet: '#a33040', topaz: '#e0b040',
  emerald: '#2fa860', sapphire: '#2f60c0', ruby: '#d0304a', diamond: '#9be8ff',
};
const D = (id, def) => { DEFS[`it_${id}`] = def; };
for (const m of METALS) {
  const c = METAL_COL[m.id] || '#9aa0ac';
  if ((m.smelt || []).some((s) => s.endsWith('_ore'))) D(`${m.id}_ore`, ['ore', c]);
  if (m.role !== 'fuel') D(`${m.id}_bar`, ['bar', c]);
}
D('coal', ['stone', '#2c2a28']); D('charcoal', ['stone', '#3a3a3a']);
D('saltpeter', ['drop', '#e7e2c0']); D('sulfur', ['drop', '#e0c838']);
for (const g of GEMS) { D(g.id, ['gem', GEM_COL[g.id]]); D(`uncut_${g.id}`, ['crystal', GEM_COL[g.id]]); }
for (const w of WOODS) { const [bark, ring] = WOOD_COL[w.id] || ['#7a5c38', '#c9a86a']; D(`${w.id}_log`, ['log', bark, ring]); D(`${w.id}_plank`, ['plank', ring, bark]); }
const TOOL_ICON = { pickaxe: 'pickaxe', axe: 'axe', shovel: 'shovel', hoe: 'hoe', chisel: 'hammer', hammer: 'hammer' };
const WEAP_ICON = { sword: 'sword', dagger: 'sword', battleaxe: 'axe', spear: 'spear' };
const ARMOR_ICON = { helmet: 'helmet', chestplate: 'chestplate', leggings: 'leggings', boots: 'boots', shield: 'shield' };
for (const m of toolMetals()) {
  const c = METAL_COL[m.id];
  for (const k in TOOL_ICON) D(`${m.id}_${k}`, [TOOL_ICON[k], c]);
  for (const k in WEAP_ICON) D(`${m.id}_${k}`, k === 'spear' ? ['spear'] : [WEAP_ICON[k], c]);
  for (const k in ARMOR_ICON) D(`${m.id}_${k}`, [ARMOR_ICON[k], c]);
}
for (const wid of ['ash', 'hickory', 'yew', 'oak', 'lignum_vitae']) {
  const bark = (WOOD_COL[wid] || ['#7a5c38'])[0];
  D(`${wid}_shortbow`, ['bow', bark]); D(`${wid}_longbow`, ['bow', bark]);
}
D('arrow', ['arrows']); D('bolt', ['quarrel']);
D(FIREARMS.powder.id, ['powder']);
for (const a of FIREARMS.ammo) D(a.id, ['ore', '#6c7079']);
for (const g of FIREARMS.guns) D(g.id, [g.id.includes('musket') || g.id.includes('blunder') ? 'musket' : 'pistol']);
for (const m of jewelryMetals()) { const c = METAL_COL[m.id]; D(`${m.id}_ring`, ['ring']); D(`${m.id}_necklace`, ['amulet', c]); D(`${m.id}_amulet`, ['amulet', c]); }
for (const [c, hex] of COLORS) D(`${c}_dye`, ['drop', hex]); // colored dye droplet

export function iconDataURL(name) {
  let url = cache.get(name);
  if (url) return url;
  const def = DEFS[name];
  if (!def) return null;
  const c = document.createElement('canvas');
  c.width = SIZE; c.height = SIZE;
  const ctx = c.getContext('2d');
  const p = (x, y, w, h, col) => { ctx.fillStyle = col; ctx.fillRect(x, y, w, h); };
  SHAPES[def[0]](p, ...def.slice(1));
  url = c.toDataURL();
  cache.set(name, url);
  return url;
}

// Draw an item's procedural icon shape straight onto a 2D context (nearest-
// neighbour scaled). Used to paint the held weapon/shield onto the player skin.
// Uses the procedural silhouette (DEFS) — recognisable and synchronous; pack
// art (async data URIs) isn't used here.
export function drawItemIcon(ctx, id, dx, dy, size) {
  const def = DEFS[`it_${id}`] || DEFS[id] || DEFS.boxicon;
  const c = document.createElement('canvas');
  c.width = SIZE; c.height = SIZE;
  const g = c.getContext('2d');
  const p = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
  SHAPES[def[0]](p, ...def.slice(1));
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(c, 0, 0, SIZE, SIZE, dx, dy, size, size);
}

// inline <img> markup (pixelated via .pix css)
export function icon(name, size = 18, cls = '') {
  const url = iconDataURL(name);
  if (!url) return '';
  return `<img class="pix ${cls}" src="${url}" width="${size}" height="${size}" alt="">`;
}

// pixel icon for an item id (block items use their atlas tile elsewhere).
// Real 32×32 pack art wins when present, else the procedural icon.
export function itemIcon(id, size = 18) {
  const uri = TEXPACK_ITEMS[id];
  if (uri) return `<img class="pix" src="${uri}" width="${size}" height="${size}" alt="">`;
  return icon(DEFS[`it_${id}`] ? `it_${id}` : 'boxicon', size);
}

export function skillIcon(key, size = 16) {
  return icon(DEFS[`sk_${key}`] ? `sk_${key}` : 'sparkle', size);
}

// ---- socketed-weapon icons: the weapon with a small gem set into its hilt ----
function gemShade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const ch = (sh) => Math.max(0, Math.min(255, ((n >> sh) & 255) + amt * 255)) | 0;
  return `rgb(${ch(16)},${ch(8)},${ch(0)})`;
}
// Draw the weapon icon, then a ~4px faceted gem on its hilt. Cached under
// `it_<id>#<gem>` so each socketed combination renders once.
export function gemmedItemDataURL(id, gemId) {
  const key = `it_${id}#${gemId}`;
  let url = cache.get(key);
  if (url) return url;
  const def = DEFS[`it_${id}`];
  const c = document.createElement('canvas');
  c.width = SIZE; c.height = SIZE;
  const ctx = c.getContext('2d');
  const p = (x, y, w, h, col) => { ctx.fillStyle = col; ctx.fillRect(x, y, w, h); };
  if (def) SHAPES[def[0]](p, ...def.slice(1)); else SHAPES.boxicon(p);
  const hue = GEM_COL[gemId] || '#c8d0e8';
  const gx = 6, gy = 9; // hilt, lower-centre — sized to sit on the grip, not the blade
  p(gx - 1, gy - 1, 6, 6, 'rgba(0,0,0,0.55)');  // dark bezel
  p(gx, gy, 4, 4, gemShade(hue, -0.05));        // gem body
  p(gx, gy, 3, 1, gemShade(hue, 0.30));         // top facet
  p(gx, gy, 1, 3, gemShade(hue, 0.14));         // left facet
  p(gx + 2, gy + 2, 2, 2, gemShade(hue, -0.24)); // shadow facet
  p(gx + 1, gy + 1, 1, 1, '#ffffff');           // sparkle
  url = c.toDataURL(); cache.set(key, url);
  return url;
}
export function gemmedItemHTML(id, size, gemId) {
  return `<img class="pix" src="${gemmedItemDataURL(id, gemId)}" width="${size}" height="${size}" alt="">`;
}

// True when an item id has a dedicated icon (not the boxicon fallback). Used by
// tests to guarantee generated catalog items are all covered.
export function hasItemIcon(id) { return !!DEFS[`it_${id}`] || !!TEXPACK_ITEMS[id]; }
