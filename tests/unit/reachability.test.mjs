// Guards the content graph: every item must be obtainable, every mob must spawn,
// every node must be placed, and no recipe may depend on an ungatherable input.
// Runs the same reachability closure as `node tools/audit.mjs`.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runAudit } from '../../tools/audit.mjs';

test('the whole content graph is reachable — nothing orphaned', () => {
  const { problems, stats } = runAudit();
  assert.ok(stats.items > 400, 'audited the full item catalog');
  if (problems.length) {
    const detail = problems.map(([title, list]) => `${title}: ${list.join(', ')}`).join('\n');
    assert.fail(`reachability problems found:\n${detail}`);
  }
  assert.equal(stats.reachable, stats.items, 'every item is obtainable');
});
