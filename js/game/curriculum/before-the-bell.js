// Before the Bell — the morning round at Honeywood Farm.
//
// Every word here is written to be HEARD, not read: the child this is for cannot
// read the screen yet. Short sentences, one instruction at a time, the number said
// out loud, and nothing a five-year-old has to hold in their head while their hands
// are busy.
//
// Two lists appear twice each — the nests and the troughs. They are declared once,
// at the top, and used by BOTH the stop that paints them on the ground and the
// activity that checks what is on them, so the marks and the answer cannot drift
// apart. That is the whole trick to one-to-one correspondence being checkable: the
// spots are real places, not a count.
//
// Offsets are plot-relative: [across, back] from the front-left corner of the work
// plot, which is 13 across and 5 back.
const NESTS = [[2, 2], [6, 2], [10, 2]];              // three hens, three nests
const TROUGHS = [[1, 2], [5, 2], [8, 2], [11, 2]];    // four cows, four troughs

const at = (spots, block) => ({ kind: 'cells', block, at: spots.map(([dx, dz]) => [dx, 0, dz]) });

export const BEFORE_THE_BELL = [
  {
    id: 'farm_morning', subject: 'math', standard: 'K.CC.B.4', title: 'Before the Bell',
    walk: true,
    story: 'Nan Willow has kept Honeywood Farm on her own for forty years, and this morning her '
      + 'knee has finally said no. Everybody is awake and hungry and nobody has been seen to. '
      + 'Take the round for her: follow the little gold lights up the lane, do what each stop '
      + 'needs, and get to the bell before the sun clears the hill.',
    steps: [
      // 1 ── one-to-one correspondence. Not "place three": one on EACH nest.
      { station: { kind: 'henhouse', marks: NESTS, animals: [{ type: 'chicken', n: 3 }] },
        travel: 'Follow the gold lights up the lane to the hen house.',
        say: 'Three hens, and behind you three nests of straw. They laid in the yard again, so '
          + 'the eggs are all in your bag — and every hen wants her own egg in her own nest.',
        prompt: 'Put ONE egg on each of the three nests.',
        hint: 'One egg, one nest. Put an egg on the straw, then walk to the next nest and do it again. '
          + 'Not two on one nest — the hens do argue.',
        success: 'One each, and nobody arguing. Three hens, three eggs, three nests!',
        build: at(NESTS, 'nest_egg') },

      // 2 ── the number is READ OFF THE WORLD. Count the cows to know how many.
      { station: { kind: 'byre', marks: TROUGHS, animals: [{ type: 'cow', n: 4 }] },
        travel: 'Up the lane to the byre — the cows have been shouting since dawn.',
        say: 'Cows get an apple each. Nan did not say how many apples: count the cows and that is '
          + 'your answer. Go on — count them out loud.',
        prompt: 'Count the cows, then put ONE apple in each trough.',
        hint: 'One, two, three, four cows. So four apples — one in every stone trough, none left over.',
        success: 'Four cows, four apples, one each. That is how you know a number is right!',
        build: at(TROUGHS, 'apple_red') },

      // 3 ── the obstacle. The lane is shut until the rail is mended.
      { station: { kind: 'gate', barrier: 'gate' },
        travel: 'On up the lane. Something is in the way.',
        say: 'The top rail of the field gate has gone, and until it is mended the sheep get out '
          + 'and nobody gets through — you included. A rail is eight planks, all in a row, '
          + 'touching end to end.',
        prompt: 'Lay a row of 8 planks on the mending patch.',
        hint: 'Eight planks in ONE straight line, each one against the last. Count them as you lay them: '
          + 'one, two, three… If there is a gap it is two short rails, not a rail.',
        success: 'Eight planks, one rail, and the gate swings open. Straight through!',
        build: { kind: 'groups', block: 'planks', sizes: [8] } },

      // 4 ── sort by one attribute, with a reason to.
      { station: { kind: 'feedstore' },
        travel: 'Past the gate to the feed store.',
        say: 'Disaster. The cow apples and the pig apples went into one heap, and they must not be '
          + 'mixed — pigs will not touch a red one. There are two bins, one either side of the '
          + 'plank line.',
        prompt: 'Put 4 red apples on one side of the plank line and 4 green ones on the other.',
        hint: 'All the reds together on ONE side. All the greens together on the OTHER. '
          + 'It does not matter which side is which — only that none of them are mixed.',
        success: 'Reds one side, greens the other, not one in the wrong bin. The pigs thank you.',
        build: { kind: 'sort', a: 'apple_red', b: 'apple_green', n: 4 } },

      // 5 ── search a real place. No plot, no building: walking and looking.
      // `find` is where she is, `lost` is what is standing there — the field really
      // does have a fifth sheep in it, hidden round the back of the wall, and the
      // child really does walk up and see her.
      { station: { kind: 'topfield', plot: false, animals: [{ type: 'sheep', n: 4 }],
        find: [11, 13, 4], lost: 'sheep' },
        travel: 'Up to the top field, where the sheep are.',
        say: 'There should be five sheep in this field. Count them… four. One lamb has got out '
          + 'through the gap in that stone wall and is hiding somewhere round the back of it. '
          + 'No lights for this one — you will have to go and look.',
        prompt: 'Find the lost lamb. Look behind the wall at the top of the field.',
        hint: 'Walk away from the lane, up to the long stone wall, and go through the gap in it. '
          + 'Then follow the wall along to the far corner. She is behind it.',
        success: 'There she is! Five sheep in the field again — four and one more makes five.',
        build: { kind: 'reach' } },

      // 6 ── write the round down. The number blocks earn their keep.
      { station: { kind: 'bell' },
        travel: 'Last stop. Nan is waiting at the bell by the farmhouse.',
        say: 'The farm is fed and it is not yet seven. Nan rings the bell once for every animal '
          + 'seen to, and she wants it written in her book first. Three hens. Four cows. '
          + 'How many is that altogether?',
        prompt: 'Write it with the number blocks: 3 + 4 = 7',
        hint: 'Five blocks in a row, all touching: the 3, the plus sign, the 4, the equals sign, '
          + 'and the answer. Three and four more — count on from three: four, five, six, seven.',
        success: 'Three and four makes SEVEN. Nan rings the bell seven times and the whole farm '
          + 'answers. You did the round on your own — off you go and play.',
        build: { kind: 'sentence', text: '3+4=7' } },
    ],
    reward: { coins: 40, items: [['hearth_loaf', 2], ['nest_egg', 6]] },
  },
];
