'use strict';
/* Headless smoke test: runs AI-vs-AI games across every faction pairing and
 * asserts the engine reaches a winner without throwing.
 *   node test/sim.js
 */
require('../js/cards.js');
require('../js/engine.js');
require('../js/ai.js');

const E = globalThis.Engine;
const AI = globalThis.AI;
const CARDS = globalThis.TCG_CARDS;
const factions = Object.keys(globalThis.TCG_DECKS);

/* ---------- Static validation of the card pool, decks and packs ---------- */
const KNOWN_KINDS = new Set(['dmgUnit', 'dmgPlayer', 'dmgRow', 'heal', 'draw', 'destroy',
  'bounce', 'push', 'buff', 'counter', 'rampEnergy', 'sacDraw', 'tokens', 'augment',
  'location', 'drain', 'painDraw', 'gainLife']);
const KNOWN_TARGETS = new Set(['anyUnit', 'ownUnit', 'enemyUnit', 'order', 'row']);
const KNOWN_RARITIES = new Set(['common', 'uncommon', 'rare', 'titan', 'leader']);
let bad = 0;
for (const c of Object.values(CARDS)) {
  if (!KNOWN_RARITIES.has(c.rarity)) { console.error(`bad rarity on ${c.id}`); bad++; }
  if (c.effect && !KNOWN_KINDS.has(c.effect.kind)) { console.error(`unknown effect kind on ${c.id}: ${c.effect.kind}`); bad++; }
  if (c.target && !KNOWN_TARGETS.has(c.target)) { console.error(`unknown target on ${c.id}: ${c.target}`); bad++; }
  if ((c.type === 'unit' || c.type === 'leader') && !(c.atk >= 0 && c.def > 0)) { console.error(`bad stats on ${c.id}`); bad++; }
}
for (const [key, d] of Object.entries(globalThis.TCG_DECKS)) {
  const size = d.cards.reduce((s, [, n]) => s + n, 0);
  if (size < 40 || size > 60) { console.error(`deck ${key} has illegal size ${size}`); bad++; }
  for (const [id, n] of d.cards) {
    if (!CARDS[id]) { console.error(`deck ${key} references missing card ${id}`); bad++; }
    else if (n > 3 && !Object.keys(CARDS[id].cost).every(k => k === 'G') && CARDS[id].type !== 'energy') {
      console.error(`deck ${key} exceeds copy limit for ${id}`); bad++;
    }
  }
  console.log(`deck ${key}: ${size} cards`);
}
for (const slot of globalThis.TCG_PACK.slots) {
  for (const r of [slot.rarity, slot.upgradeTo].filter(Boolean)) {
    const pool = globalThis.TCG_COLLECTIBLES.filter(id => CARDS[id].rarity === r);
    if (pool.length === 0) { console.error(`empty pack pool for rarity ${r}`); bad++; }
    else console.log(`pack pool ${r}: ${pool.length} cards`);
  }
}
console.log(`collectible pool: ${globalThis.TCG_COLLECTIBLES.length} cards`);
if (bad) { console.error(`${bad} static validation errors`); process.exit(1); }

let games = 0, failures = 0;
const winReasons = {};

for (const a of factions) {
  for (const b of factions) {
    games++;
    const g = E.newGame(a, b, { ai: [true, true] });
    let turns = 0;
    try {
      while (g.winner === null && turns < 300) {
        AI.takeFullTurn(g);
        turns++;
      }
      if (g.winner === null) throw new Error(`no winner after ${turns} turns`);
      // Sanity: no unit with damage >= defense should still be alive.
      for (const u of g.units) {
        if (E.remainingDef(g, u) <= 0) throw new Error(`dead unit alive: ${u.name}`);
      }
      winReasons[g.winReason] = (winReasons[g.winReason] || 0) + 1;
      console.log(`${a} vs ${b}: P${g.winner + 1} wins in ${turns} turns (${g.winReason})`);
    } catch (err) {
      failures++;
      console.error(`${a} vs ${b}: FAILED — ${err.stack}`);
      console.error('Last log lines:', g.log.slice(-10).map(l => l.msg));
    }
  }
}

console.log(`\n${games} games, ${failures} failures.`);
console.log('Win reasons:', winReasons);
process.exit(failures ? 1 : 0);
