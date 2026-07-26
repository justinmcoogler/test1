// Saving the shared world to disk.
//
// The room holds everything in memory, so without this, stopping the server
// throws away whatever the children built. That is the wrong failure for a thing
// people get attached to.
//
// TWO RULES, and both are about not destroying a good save with a bad one.
//
//   WRITE ATOMICALLY. Save to a temporary file and rename it into place. rename
//   is atomic on every filesystem this will ever run on, so a crash — or a
//   Ctrl-C, or a laptop lid — during a write leaves the PREVIOUS save intact
//   rather than a half-written file that parses as nothing. Writing in place is
//   the difference between losing five minutes and losing the base.
//
//   NEVER LOAD A SAVE FROM ANOTHER SEED. A save is a set of block edits; the
//   terrain underneath comes from the seed. Replay one world's edits onto
//   another world's ground and you get doors in cliffs and floating floors, and
//   no obvious cause. The seed is checked and a mismatch refuses to load.
import { readFile, writeFile, rename, mkdir, stat } from 'node:fs/promises';
import { dirname, join } from 'node:path';

export const SAVE_VERSION = 1;

// One file per seed, so running two worlds on one machine is just two commands.
export function savePathFor(seed, dir = 'saves') {
  // A seed is whatever someone typed on the command line and it is about to be
  // a filename. Anything that is not plainly safe becomes an underscore.
  const safe = String(seed).replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 64) || 'world';
  return join(dir, `${safe}.json`);
}

// Returns the parsed save, or null when there is nothing usable. A missing file
// is the ordinary case on a first run and is not an error; a corrupt one is
// reported, because silently starting a fresh world over the top of a save
// somebody cares about is far worse than refusing to start.
export async function loadRoom(path, { seed, onLog = () => {} } = {}) {
  let raw;
  try {
    raw = await readFile(path, 'utf8');
  } catch (err) {
    if (err.code !== 'ENOENT') onLog(`could not read ${path}: ${err.message}`);
    return null;
  }
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    onLog(`${path} is not valid JSON — refusing to start rather than overwrite it.`);
    throw new Error(`corrupt save at ${path}`);
  }
  if (data?.version !== SAVE_VERSION) {
    onLog(`${path} is version ${data?.version}, this server writes ${SAVE_VERSION} — starting fresh.`);
    return null;
  }
  if (seed !== undefined && String(data.seed) !== String(seed)) {
    onLog(`${path} holds seed "${data.seed}" but this server is running "${seed}".`);
    throw new Error('seed mismatch — refusing to replay one world\'s edits onto another\'s terrain');
  }
  return data;
}

export async function saveRoom(path, data) {
  await mkdir(dirname(path), { recursive: true });
  const tmp = `${path}.tmp`;
  await writeFile(tmp, JSON.stringify(data), 'utf8');
  // Atomic: the old save survives intact until the instant the new one is whole.
  await rename(tmp, path);
}

export async function saveSize(path) {
  try { return (await stat(path)).size; } catch { return 0; }
}
