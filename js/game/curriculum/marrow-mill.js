// The Mill on Marrow Brook — the second morning in the vale.
//
// Before the Bell is about how many there are. This one is about how many are
// LEFT, which is the harder half of early number and the half a counting lesson
// never reaches: you cannot see seven by looking at ten.
//
// So four of the six stops are about a quantity CHANGING while the child watches
// it. Three sacks go on the cart and the pile is smaller. Six sacks go into a bin
// that holds ten and now it is full. One pan of the weigh beam goes down and the
// other goes up. Every one of them is a thing that happens, not a thing that is
// there — and the last stop is where they write down what happened.
//
// Same guide as the farm. Nan Willow is the grown-up in this valley, and a child
// of four who has spent a morning with her should not arrive at the mill and be
// handed to a stranger.
//
// Numbers stay inside ten, and nothing has to be held in the head while the hands
// are busy. Every word is written to be HEARD.

export const MARROW_MILL = [
  {
    id: 'mill_morning', subject: 'math', standard: 'K.OA.A.1', title: 'The Mill on Marrow Brook',
    walk: true,
    theme: 'mill',
    story: 'Down the lane from Honeywood the brook runs fast, and on it sits the mill that grinds '
      + 'the flour for the whole vale. Old Tobin the miller has gone up to Thistlewick for the day '
      + 'and left the work half done. The baker comes at noon and he will want ten sacks. '
      + 'Nan has walked you down. Follow the towpath and see it right.',
    steps: [
      // 1 ── a hunt. Nothing to build: walk about a real place and pick things up.
      // The first verb of the lesson is deliberately not "place a block" — the
      // child has spent a whole morning doing that and needs to be shown that
      // this is somewhere else.
      { station: { kind: 'reedbed', plot: false, animals: [{ type: 'duck', n: 3 }],
        scatter: { block: 'nest_egg', n: 9 } },
        travel: 'Down the towpath to the millpond, where the ducks are.',
        say: 'The mill ducks lay wherever they please and today they have pleased themselves all '
          + 'over the bank. Tobin wants five eggs for his tea. There are more than five out '
          + 'there — bring back five and leave the rest.',
        prompt: 'Find 5 duck eggs in the rushes.',
        hint: 'Walk along the water and look in the long grass. Touch an egg to pick it up. '
          + 'Count as you go: one, two, three, four, five — then stop.',
        success: 'Five eggs, and the ducks none the wiser. That is five.',
        build: { kind: 'gather', block: 'nest_egg', n: 5 } },

      // 2 ── the obstacle. Ten of something, counted out one at a time.
      { station: { kind: 'footbridge', barrier: 'gate' },
        travel: 'On along the towpath. The bridge over the leat is not finished.',
        say: 'The frame of the little bridge is up and the planks are not on it, so nobody is '
          + 'crossing — you included. It takes ten planks to deck a bridge this wide.',
        prompt: 'Put 10 planks down on the bridge.',
        hint: 'Count them out loud as you lay each one: one, two, three… all the way to ten. '
          + 'They do not have to be in a line. Ten is ten however you put them down.',
        success: 'Ten planks, one bridge, and the way is open. Straight across!',
        build: { kind: 'count', block: 'planks', n: 10 } },

      // 3 ── TAKING AWAY, and the point of the whole lesson. The check remembers
      // that ten were once there, so a child cannot pass this by placing seven:
      // the ten has to be built and then broken into.
      { station: { kind: 'sackstore' },
        travel: 'Over the bridge to the sack store.',
        say: 'Ten sacks of flour were ground yesterday and they are all still here. But the '
          + 'carter is at the door and three of them are his — they are paid for and they '
          + 'are going on his cart.',
        prompt: 'Stack the 10 sacks, then take 3 away for the carter.',
        hint: 'First put down all ten and count them. THEN take three back off — hit them to '
          + 'pick them up again. Count what is left: how many sacks has Tobin still got?',
        success: 'Ten, take away three, leaves SEVEN. The carter has his and Tobin has the rest.',
        build: { kind: 'subtract', block: 'planks', from: 10, take: 3 } },

      // 4 ── comparison, built as two towers either side of the line. Nothing to
      // count up to here: the answer is which one is taller, and that can be seen
      // from across the yard.
      { station: { kind: 'weighbeam' },
        travel: 'Past the store to the weigh beam.',
        say: 'Every sack is weighed before it leaves. The beam has a pan on each side, and this '
          + 'morning there is a heavy sack and a light one. The heavy one weighs five. '
          + 'The light one weighs two.',
        prompt: 'Build a tower 5 high on one side of the line and 2 high on the other.',
        hint: 'One tall pile on one side of the plank line, one short pile on the other. '
          + 'Five blocks on top of each other, then two on top of each other. '
          + 'Which one is taller? That is the heavy one.',
        success: 'Five is taller than two, so five is heavier. That is what the beam is for.',
        build: { kind: 'compare', block: 'planks', left: 5, right: 2 } },

      // 5 ── a number bond, laid out half-done. The child is completing ten
      // rather than building it, which is a different question and the one that
      // actually gets used later: how many MORE do we need?
      { station: { kind: 'granary' },
        travel: 'Up the yard to the granary.',
        say: 'The baker wants ten sacks at noon. Four pale ones are already in the bin — I have '
          + 'put them out for you. The rest of the flour is the dark sort.',
        prompt: 'The bin holds 10. There are 4 pale sacks in it. Add dark ones until there are 10.',
        hint: 'Count the pale ones: one, two, three, four. Now keep counting as you put dark ones '
          + 'in — five, six, seven, eight, nine, TEN. Stop at ten.',
        success: 'Four and six more makes ten. The baker will have his ten sacks.',
        build: { kind: 'bond', have: { block: 'white_wool', n: 4 }, add: { block: 'brown_wool', n: 6 } } },

      // 6 ── write down what happened at the sack store. Same closing verb as the
      // farm on purpose: a morning's work ends with it written in the book.
      { station: { kind: 'tallyboard' },
        travel: 'Last stop — the tally board by Tobin’s cottage.',
        say: 'Tobin chalks up every day on this board, and he will want to know about his sacks. '
          + 'There were ten. The carter took three away. Seven are left.',
        prompt: 'Write it on the board: 10 - 3 = 7',
        hint: 'Six blocks in a row, all touching: the one, the nought, the take-away sign, '
          + 'the three, the equals sign, and the seven.',
        success: 'Ten take away three leaves seven, written up where Tobin will see it. '
          + 'The mill is ready for noon and it is not yet nine. Off you go and play.',
        build: { kind: 'sentence', text: '10-3=7' } },
    ],
    reward: { coins: 45, items: [['hearth_loaf', 2], ['nest_egg', 5]] },
  },
];
