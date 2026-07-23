// The 16 Minecraft dye colors as id → representative hex. Drives the tinted
// colored-block families (wool, carpet, concrete, concrete powder, terracotta,
// glazed terracotta, stained glass + panes) and their procedural atlas tiles, so
// imported builds keep their colours instead of collapsing to one stand-in.
export const COLORS = [
  ['white', '#d7d9d4'], ['orange', '#e08f2b'], ['magenta', '#bd54c0'], ['light_blue', '#4a9ed4'],
  ['yellow', '#e5c327'], ['lime', '#78b02a'], ['pink', '#e08aa0'], ['gray', '#494f52'],
  ['light_gray', '#9d9d97'], ['cyan', '#277b8c'], ['purple', '#8636b3'], ['blue', '#3a44a6'],
  ['brown', '#6b4a2e'], ['green', '#5a7a2e'], ['red', '#a63229'], ['black', '#1d1d21'],
];
export const COLOR_IDS = COLORS.map(([id]) => id);
