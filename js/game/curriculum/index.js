// ONE lesson, made properly.
//
// There were ninety of these, ten per grade from Kindergarten to Grade 8. They are
// gone, and deliberately: every one of them was the same activity wearing a
// different hat. "Put N things in a rectangle", ninety times, with a story wrapped
// round it. The story was decoration and the child could tell.
//
// This is the replacement, and the thing it does differently is that THE NUMBER
// COMES OFF THE WORLD. Nobody says "count to four" — there are four cows in the
// byre, and they each want an apple, so you count the cows. Nobody says "sort by
// colour" — the feed for the cows and the feed for the pigs got tipped into one
// heap, and there are two bins. Every stop is a job somebody needs doing, the
// maths is how you do it, and the farm visibly changes when you have.
//
// The six stops use six different verbs, on purpose:
//
//   1. henhouse   one egg on EACH nest        one-to-one correspondence
//   2. byre       one apple for EACH cow      count a set, then match it
//   3. gate       mend the rail               make a row of eight (and it opens)
//   4. feedstore  reds here, greens there     sort by one attribute
//   5. topfield   find the lost lamb          search a real place
//   6. bell       write what you did          3 + 4 = 7, in number blocks
//
// The maths is Kindergarten: one-to-one matching, counting to five, sorting,
// and one addition inside ten. The reading is nil — it is all spoken.
import { BEFORE_THE_BELL } from './before-the-bell.js';

// Thirty minutes is what a lesson BANKS as play time, so it is also the deal
// being offered: a morning's work for a morning's play.
export const LESSON_MINUTES = 30;

// One band, one lesson. The menu still groups by band (js/ui/ui.js) because there
// will be more of these — but they will be built one at a time, each as good as
// this one, rather than generated ninety at a go.
export const GRADES = [
  { key: 'farm', label: 'Honeywood Farm', age: '5-7', lessons: BEFORE_THE_BELL },
];

export const CURRICULUM = [];
for (const g of GRADES) {
  g.lessons.forEach((l, i) => {
    CURRICULUM.push({
      minutes: LESSON_MINUTES,
      guide: 'nan',
      ...l,
      area: g.key,
      grade: g.label,
      next: g.lessons[i + 1]?.id ?? null,
      watch: ['blockPlaced', 'blockBroken'],
    });
  });
}
