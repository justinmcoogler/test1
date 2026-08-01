// THREE lessons, made properly.
//
// There were ninety of these, ten per grade from Kindergarten to Grade 8. They are
// gone, and deliberately: every one of them was the same activity wearing a
// different hat. "Put N things in a rectangle", ninety times, with a story wrapped
// round it. The story was decoration and the child could tell.
//
// These are the replacement, and the thing they do differently is that THE NUMBER
// COMES OFF THE WORLD. Nobody says "count to four" — there are four cows in the
// byre, and they each want an apple, so you count the cows. Nobody says "sort by
// colour" — the feed for the cows and the feed for the pigs got tipped into one
// heap, and there are two bins. Every stop is a job somebody needs doing, the
// maths is how you do it, and the place visibly changes when you have.
//
// ONE VALLEY, THREE MORNINGS — the farm, the mill downstream of it, and the market
// town above it. The same guide walks the child round all three, because a
// four-year-old who has spent a morning with Nan Willow should not arrive at the
// mill and be handed to a stranger. Each is a different PLACE and not the same
// lane repainted: its own ground underfoot, its own walls, and eighteen buildings
// between them that exist nowhere else (js/world/lessonpath.js).
//
// Each morning has a different question behind it, which is what stops the second
// one being the first one with bigger numbers:
//
//   Before the Bell        how many are there       counting, matching, sorting
//   The Mill on Marrow…    how many are LEFT        taking away, bonds, comparing
//   Market Day             how they are ARRANGED    patterns, groups, shape, symmetry
//
//   1. henhouse   one egg on EACH nest        one-to-one correspondence
//   2. byre       one apple for EACH cow      count a set, then match it
//   3. gate       mend the rail               make a row of eight (and it opens)
//   4. feedstore  reds here, greens there     sort by one attribute
//   5. topfield   find the lost lamb          search a real place
//   6. bell       write what you did          3 + 4 = 7, in number blocks
//
// Every lesson is built from six DIFFERENT verbs, and the test suite enforces it:
// six stops that are all the same activity is a worksheet, whatever the story says.
//
// The maths is Reception throughout — one-to-one matching, counting and taking
// away inside ten, sorting, pattern, and shape. The reading is nil: it is all
// spoken.
import { BEFORE_THE_BELL } from './before-the-bell.js';
import { MARROW_MILL } from './marrow-mill.js';
import { MARKET_DAY } from './market-day.js';

// Thirty minutes is what a lesson BANKS as play time, so it is also the deal
// being offered: a morning's work for a morning's play.
export const LESSON_MINUTES = 30;

// One band, because it is one valley and one age: everything here is for a child
// of four to six who is still being read to. The menu groups by band and shows
// how many are done, so three mornings in one band reads as "1 of 3" rather than
// as three separate courses.
export const GRADES = [
  { key: 'farm', label: 'Honeywood Vale', age: '4-6',
    lessons: [...BEFORE_THE_BELL, ...MARROW_MILL, ...MARKET_DAY] },
];

export const CURRICULUM = [];
for (const g of GRADES) {
  for (const l of g.lessons) {
    CURRICULUM.push({
      minutes: LESSON_MINUTES,
      guide: 'nan',
      ...l,
      area: g.key,
      grade: g.label,
      // NOTHING CHAINS. Every morning ends with "off you go and play", and it
      // means it: finishing banks half an hour and hands the child back their
      // day. Rolling straight into the next lesson would make that line a lie and
      // turn a morning's work into an afternoon of it. The next one is waiting in
      // the menu, and startArea() resumes at the first they have not passed.
      next: null,
      watch: ['blockPlaced', 'blockBroken'],
    });
  }
}
