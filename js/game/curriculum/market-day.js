// Market Day at Thistlewick — the third morning, and the one about SHAPE.
//
// The farm counted things. The mill changed how many there were. This one is
// about how things are arranged, which is the other half of early maths and the
// half that gets left out: a repeating pattern, equal shares, a row of bars you
// can read at a glance, a rectangle you go round rather than fill, and two halves
// that match.
//
// None of it is counting practice wearing a hat. A pattern is bunting, because
// bunting really does go red-white-red-white and a child can see when it has gone
// wrong. Equal groups are three baskets that have to hold the same or somebody is
// cheated. Symmetry is a rocking horse that would fall over.
//
// It is also a MORNING BEFORE, not a morning after: everything here is setting up
// a market that has not opened yet, so the last stop is the bell that opens it and
// the child is the reason it can.

export const MARKET_DAY = [
  {
    id: 'market_morning', subject: 'math', standard: 'K.MD.B.3', title: 'Market Day at Thistlewick',
    walk: true,
    theme: 'market',
    story: 'Thistlewick holds its market on the square once a month, and it opens when the hall '
      + 'bell rings at nine. It is half past seven, the carts are in, and not one stall is '
      + 'ready. Nan has a stall of her own to set up and cannot be everywhere. '
      + 'Go up the square and get the market on its feet before the bell.',
    steps: [
      // 1 ── a repeating pattern, which is a shape made of order rather than of
      // blocks. Two colours and five repeats: long enough that it is a rule
      // rather than a coincidence.
      { station: { kind: 'buntingline' },
        travel: 'Up the cobbles to the bunting poles at the top of the square.',
        say: 'The bunting goes up first — it is what tells the village there is a market on. '
          + 'It always goes the same way: red, white, red, white, all along the rope.',
        prompt: 'Lay the bunting in a row: red, white, red, white — 10 flags.',
        hint: 'Start with red. Then white. Then red again. Keep going, always swapping, and '
          + 'keep them all touching in ONE line until you have ten.',
        success: 'Red, white, red, white, right along. That is a pattern — you can tell what '
          + 'comes next without being told.',
        build: { kind: 'pattern', seq: ['red_wool', 'white_wool'], reps: 5 } },

      // 2 ── equal groups. Not "place nine": three lots of three, with gaps, so
      // the grouping is visible and unfair shares are visibly unfair.
      { station: { kind: 'fruitstall' },
        travel: 'Along to the fruit stall.',
        say: 'Three baskets to fill, and nine apples to fill them with. They must have the SAME '
          + 'in each — the first three people to buy one would notice quick enough if they '
          + 'did not.',
        prompt: 'Make 3 baskets of 3 apples, with a gap between each basket.',
        hint: 'Three together, then a space, then three more, then a space, then the last three. '
          + 'The gaps are what makes them three baskets instead of one long line.',
        success: 'Three, three and three. Every basket the same, and nobody short-changed.',
        build: { kind: 'groups', block: 'apple_red', sizes: [3, 3, 3] } },

      // 3 ── bar heights. A pictogram before it is called one: how much is in each
      // crate, read off the tops without counting anything.
      { station: { kind: 'cratestack' },
        travel: 'Past the baskets to the crates.',
        say: 'Three crates to fill, and each one has a mark up the side saying how full it goes. '
          + 'The first to two. The middle one all the way to five. The last one to three.',
        prompt: 'Fill the crates: one 2 high, one 5 high, one 3 high.',
        hint: 'Three separate piles, each on its own square. Build one up to two blocks, one up '
          + 'to five, one up to three. Which crate is fullest? You can see it without counting.',
        success: 'Two, five and three. You can tell which crate has most just by looking — that '
          + 'is what a row of piles is FOR.',
        build: { kind: 'stack', block: 'planks', heights: [2, 5, 3] } },

      // 4 ── the obstacle, and the one shape here that is about going ROUND
      // something rather than covering it. A pen is a fence, and a fence with a
      // filled-in middle is not a pen, it is a floor.
      { station: { kind: 'goosepen', barrier: 'gate', animals: [{ type: 'duck', n: 4 }] },
        travel: 'On up the square. There are ducks loose on the cobbles.',
        say: 'The duck seller has gone for his breakfast and left his birds wandering, and the '
          + 'market cannot open with ducks under everybody’s feet. He needs another run of '
          + 'hurdles made up: five along and three back, fence all the way round.',
        prompt: 'Lay out the hurdles: a fence 5 across and 3 back, hollow in the middle.',
        hint: 'Go ROUND the edge only — five along the front, five along the back, and the two '
          + 'ends joining them. Leave the middle EMPTY. A pen with a filled-in middle is not '
          + 'a pen, it is a floor.',
        success: 'Fence all the way round and a hole in the middle for the ducks to stand in. '
          + 'They are penned, the square is clear, and the way through is open.',
        build: { kind: 'frame', block: 'planks', w: 5, d: 3 } },

      // 5 ── symmetry. The only activity in the vale where the answer is on both
      // sides at once, and the plank line down the middle of the plot finally
      // gets used as a mirror rather than as a divider.
      { station: { kind: 'toystall' },
        travel: 'Down to the toy stall by the hall.',
        say: 'The wooden horse fell off the cart and came apart, and it has to be built the '
          + 'same on both sides of its middle or it will not stand up. The plank line down '
          + 'the mat is its middle.',
        prompt: 'Build the same thing on BOTH sides of the plank line, matching.',
        hint: 'Every block you put on one side, put one on the other side the SAME distance from '
          + 'the plank line. Two out on the left, two out on the right. Like a mirror.',
        success: 'The same both ways from the middle. That is what makes it stand up — and it '
          + 'is called symmetry.',
        build: { kind: 'mirror', block: 'planks', pairs: 6 } },

      // 6 ── the sum that opens the market. Nine and one, or five and five: the
      // numbers are the two rows of stalls the child has just walked between.
      { station: { kind: 'markethall' },
        travel: 'Last stop. The hall, and the bell that opens the market.',
        say: 'Nan rings the bell at nine and the market is open. She writes the stall count in '
          + 'the book first. Five stalls down one side of the square. Five down the other. '
          + 'How many stalls is that altogether?',
        prompt: 'Write it in the book: 5 + 5 = 10',
        hint: 'Six blocks in a row, all touching: the five, the plus sign, the other five, the '
          + 'equals sign, and the answer. Five and five more — count on: six, seven, eight, '
          + 'nine, ten.',
        success: 'Five and five makes TEN. Nan rings the bell, the whole square starts talking '
          + 'at once, and every stall on it is ready because you got here first. '
          + 'Off you go and play.',
        build: { kind: 'sentence', text: '5+5=10' } },
    ],
    reward: { coins: 50, items: [['hearth_loaf', 2], ['apple_red', 6]] },
  },
];
