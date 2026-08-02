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
const factions = Object.keys(globalThis.TCG_DECKS);

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
