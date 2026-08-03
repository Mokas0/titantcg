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
  if ((c.type === 'unit' || c.type === 'leader') && c.move < 2) { console.error(`${c.id} moves ${c.move} — base movement is 2`); bad++; }
  if ((c.type === 'unit' || c.type === 'leader') && c.keywords.includes('swift') && c.move !== 3) { console.error(`swift unit ${c.id} should have move 3`); bad++; }
}
for (const r of ['common', 'uncommon', 'rare', 'titan']) {
  const D = globalThis.TCG_DUST;
  if (!(D.disenchant[r] > 0 && D.craft[r] > D.disenchant[r])) { console.error(`bad dust rates for ${r}`); bad++; }
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

/* ---------- Deck-builder validation ---------- */
const V = globalThis.TCG_VALIDATE_DECK;
function expectDeck(label, res, ok, errPattern) {
  const passed = res.ok === ok && (!errPattern || res.errors.some(e => errPattern.test(e)));
  if (!passed) { console.error(`validateDeck ${label}: got ok=${res.ok}, errors=${JSON.stringify(res.errors)}`); bad++; }
  else console.log(`validateDeck ${label}: ok`);
}
const own = { ember_whelp: 3, lava_bolt: 3, ashborn_raider: 3, pyre_zealot: 3,
  flame_adept: 3, searing_brand: 3, battle_fury: 2, void_crawler: 5, tidecaller: 3 };
const goodDeck = { energy_fire: 19, energy_void: 1, ember_whelp: 3, lava_bolt: 3,
  ashborn_raider: 3, pyre_zealot: 3, flame_adept: 3, searing_brand: 3, battle_fury: 2 };
expectDeck('valid 40-card fire deck', V('leader_fire', goodDeck, own), true);
expectDeck('too small', V('leader_fire', { energy_fire: 39 }, own), false, /at least 40/);
expectDeck('too big', V('leader_fire', { energy_fire: 61 }, own), false, /at most 60/);
expectDeck('identity violation', V('leader_fire', { ...goodDeck, tidecaller: 1 }, own), false, /identity/);
expectDeck('copy limit', V('leader_fire', { ...goodDeck, lava_bolt: 4 }, own), false, /at most 3/);
expectDeck('not owned', V('leader_fire', { ...goodDeck, immolate: 1 }, own), false, /you own 0/);
expectDeck('void rift cap', V('leader_fire', { ...goodDeck, energy_void: 4 }, own), false, /Void Rift/);
expectDeck('void any-number within owned',
  V('leader_hollow', { energy_void: 3, energy_fire: 32, void_crawler: 5 }, own), true);
expectDeck('void limited by ownership',
  V('leader_hollow', { energy_fire: 34, void_crawler: 6 }, own), false, /you own 5/);

/* Engine accepts a full deck spec (as used for custom decks and online play). */
{
  const spec = { name: 'Custom Burn', leader: 'leader_fire', cards: Object.entries(goodDeck) };
  const g = E.newGame(spec, 'earth', { ai: [true, true] });
  let t = 0;
  while (g.winner === null && t++ < 300) AI.takeFullTurn(g);
  if (g.winner === null) { console.error('custom-spec game never finished'); bad++; }
  else console.log(`custom-spec deck game: P${g.winner + 1} wins in ${t} turns`);
}

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
