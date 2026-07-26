// The whole K-8 curriculum, assembled.
//
// Ninety lessons: ten for each grade band, each one a story told in five steps,
// each step a thing to build. Every lesson is read aloud (js/game/speech.js),
// because the children this is for are still learning to read — and four of the
// ten lessons in every band are the reading lessons themselves.
//
// Grade files hold ONLY what is different about a lesson: its id, its title, its
// story, its steps and what it pays. Everything mechanical — which room it uses,
// which lesson follows it, how long it takes, which events re-check it — is
// filled in here, once, so that adding a lesson is an act of writing rather than
// an act of plumbing.
import { GRADE_K } from './grade-k.js';
import { GRADE_1 } from './grade-1.js';
import { GRADE_2 } from './grade-2.js';
import { GRADE_3 } from './grade-3.js';
import { GRADE_4 } from './grade-4.js';
import { GRADE_5 } from './grade-5.js';
import { GRADE_6 } from './grade-6.js';
import { GRADE_7 } from './grade-7.js';
import { GRADE_8 } from './grade-8.js';

// Thirty minutes is the floor the whole curriculum was written to: five steps of
// story, instruction, building and celebration, at roughly six minutes each. It
// is what a lesson BANKS as play time, so it is also the deal being offered —
// half an hour of work for half an hour of Sproutlands.
export const LESSON_MINUTES = 30;

export const GRADES = [
  { key: 'grade_k', label: 'Kindergarten', age: '5-6', lessons: GRADE_K },
  { key: 'grade_1', label: 'Grade 1', age: '6-7', lessons: GRADE_1 },
  { key: 'grade_2', label: 'Grade 2', age: '7-8', lessons: GRADE_2 },
  { key: 'grade_3', label: 'Grade 3', age: '8-9', lessons: GRADE_3 },
  { key: 'grade_4', label: 'Grade 4', age: '9-10', lessons: GRADE_4 },
  { key: 'grade_5', label: 'Grade 5', age: '10-11', lessons: GRADE_5 },
  { key: 'grade_6', label: 'Grade 6', age: '11-12', lessons: GRADE_6 },
  { key: 'grade_7', label: 'Grade 7', age: '12-13', lessons: GRADE_7 },
  { key: 'grade_8', label: 'Grade 8', age: '13-14', lessons: GRADE_8 },
];

// One flat list, in teaching order: every lesson of Kindergarten, then every
// lesson of Grade 1, and so on. Position in this list is a lesson's room number
// (js/world/classroom.js), so the order is load-bearing — append, don't insert.
export const CURRICULUM = [];
for (const g of GRADES) {
  g.lessons.forEach((l, i) => {
    CURRICULUM.push({
      minutes: LESSON_MINUTES,
      guide: 'pip',
      ...l,
      area: g.key,
      grade: g.label,
      // A band is a chain: finishing one lesson walks straight into the next
      // room. The last of a band ends the chain rather than crossing into the
      // next year — moving up a grade is a decision, not a side effect.
      next: g.lessons[i + 1]?.id ?? null,
      watch: ['blockPlaced', 'blockBroken'],
    });
  });
}
