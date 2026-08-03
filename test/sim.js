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
const TRIGGER_KINDS = new Set(['draw', 'gainLife', 'dmgPlayer', 'rampEnergy',
  'dmgEnemiesInRow', 'tokensHere', 'buffAlliesInRow']);
for (const c of Object.values(CARDS)) {
  if (c.range !== undefined && !(Number.isInteger(c.range) && c.range >= 0 && c.range <= 3)) {
    console.error(`bad range on ${c.id}`); bad++;
  }
  if (c.triggers) {
    for (const [when, spec] of Object.entries(c.triggers)) {
      if (when === 'growth') {
        if (!((spec.a || 0) >= 0 && (spec.d || 0) >= 0)) { console.error(`bad growth on ${c.id}`); bad++; }
      } else if (!['arrival', 'lastword'].includes(when) || !TRIGGER_KINDS.has(spec.kind)) {
        console.error(`bad trigger on ${c.id}: ${when}/${spec.kind}`); bad++;
      }
    }
  }
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

/* ---------- Keyword & pacing mechanics ---------- */
function check(label, cond) {
  if (!cond) { console.error(`mechanic ${label}: FAILED`); bad++; }
  else console.log(`mechanic ${label}: ok`);
}
{
  const g = E.newGame('fire', 'earth', {});
  check('starting life is 20', g.players[0].life === 20 && g.players[1].life === 20);

  // Bloodrage: attack grows with marked damage.
  const br = { uid: 900, cardId: null, name: 'br', owner: 0, row: 1, atk: 1, def: 4, move: 2,
    keywords: ['bloodrage'], damage: 0, tempA: 0, tempD: 0, permA: 0, permD: 0, augments: [], enteredTurn: 0 };
  g.units.push(br);
  const base = E.effAtk(g, br);
  br.damage = 2;
  check('bloodrage +1 atk per wound', E.effAtk(g, br) === base + 2);
  br.damage = 0;

  // Phalanx: +1/+1 only with a rowmate.
  const ph = { ...br, uid: 901, keywords: ['phalanx'], row: 2 };
  g.units.push(ph);
  const alone = [E.effAtk(g, ph), E.effDef(g, ph)];
  const mate = { ...br, uid: 902, keywords: [], row: 2 };
  g.units.push(mate);
  check('phalanx +1/+1 with rowmate',
    E.effAtk(g, ph) === alone[0] + 1 && E.effDef(g, ph) === alone[1] + 1);

  // Phalanx death cascade: wounded to full base defense, mate dies -> it dies.
  ph.damage = 4; // base def 4 + phalanx 1 = 5 remaining 1
  E.destroyUnit(g, mate, 'test');
  E.checkDeaths(g, 'test');
  check('phalanx death cascade', !g.units.some(u => u.uid === 901));

  // Attunement: bonus switches on at 4 matching energy.
  const at = { ...br, uid: 903, keywords: [], attune: { t: 'F', n: 4, a: 2, d: 2 }, row: 1 };
  g.units.push(at);
  g.players[0].energy = [1, 2, 3].map(() => ({ cardId: 'energy_fire', provides: 'F', tapped: false }));
  const offA = E.effAtk(g, at);
  g.players[0].energy.push({ cardId: 'energy_void', provides: 'ANY', tapped: true });
  check('attunement on at 4 (void counts, tapped counts)', E.effAtk(g, at) === offA + 2);

  // Momentum: permanent attack per row advanced.
  const mo = { ...br, uid: 904, keywords: ['momentum'], row: 1, enteredTurn: 0 };
  g.units.push(mo);
  E.beginFight(g);
  E.moveUnit(g, 904, 3);
  check('momentum +2 after advancing 2 rows', mo.permA === 2);

  // Siege: eligible to attack the player from the adjacent row.
  g.units.length = 0;
  const sg = { ...br, uid: 905, keywords: ['siege'], row: 3, atk: 3 };
  const plain = { ...br, uid: 906, keywords: [], row: 3, atk: 3 };
  const guardHome = { ...br, uid: 907, owner: 1, row: 4, atk: 1 };
  g.units.push(sg, plain, guardHome);
  g.fought = [];
  E.prepDirect(g);
  check('siege attacks over the garrison, plain unit cannot',
    g.directEligible.includes(905) && !g.directEligible.includes(906));
}
{
  // Range: participation modes, optional fire, melee lock, guard, no return fire.
  const g = E.newGame('fire', 'earth', {});
  g.units.length = 0;
  const mk = (uid, owner, row, extra) => {
    const u = { uid, cardId: null, name: 'u' + uid, owner, row, atk: 2, def: 3, move: 2,
      keywords: [], damage: 0, tempA: 0, tempD: 0, permA: 0, permD: 0, augments: [],
      range: 0, enteredTurn: 0, ...extra };
    g.units.push(u);
    return u;
  };
  const archer = mk(910, 0, 1, { range: 2, atk: 3 });
  const foe = mk(911, 1, 3, {});
  check('archer is ranged at 2 rows', E.combatTargets(g, archer).mode === 'ranged'
    && E.combatTargets(g, archer).targets.some(t => t.uid === 911));
  check('melee foe of empty row does not participate', E.combatTargets(g, foe).mode === 'none');
  check('anyCombat sees a one-sided archer duel', E.anyCombat(g));
  // Optional fire: archer may assign 0.
  E.beginFight(g); E.finishMoves(g);
  g.assign = { 910: {} };
  check('ranged may hold fire', E.resolveCombat(g).ok && g.units.length === 2 && foe.damage === 0);
  // Firing: no return damage.
  E.beginFight(g); E.finishMoves(g);
  g.assign = { 910: { 911: 3 } };
  check('ranged fire resolves with no return', E.resolveCombat(g).ok
    && foe.damage === 3 && archer.damage === 0);
  // Guard protects rows against arrows.
  const wall = mk(912, 1, 3, { keywords: ['guard'], def: 5 });
  E.beginFight(g); E.finishMoves(g);
  g.assign = { 910: { 911: 3 } };
  check('guard blocks ranged assignment past it', !E.resolveCombat(g).ok);
  // Melee lock: an enemy in the archer's row forces melee there.
  mk(913, 1, 1, {});
  check('archer in contested row is melee-locked', E.combatTargets(g, archer).mode === 'melee');
}
{
  // Triggers: arrival, last word (with cascade), growth.
  const g = E.newGame('light', 'dark', {});
  check('arrival draw via card play', (function () {
    // Put a Herald of Dawn in hand and play it with energy cheated in.
    g.players[0].hand = ['herald_of_dawn'];
    g.players[0].energy = [
      { cardId: 'energy_light', provides: 'L', tapped: false },
      { cardId: 'energy_light', provides: 'L', tapped: false },
      { cardId: 'energy_light', provides: 'L', tapped: false },
    ];
    g.activePlayer = 0; g.phase = 'main1';
    const res = E.playCard(g, 0, 0, { row: 0 });
    return res.ok && g.players[0].hand.length === 1; // played 1, drew 1
  })());
  check('last word blast cascades', (function () {
    // Plague Husk dies; its blast finishes a wounded enemy in the row.
    g.units.length = 0;
    const husk = { uid: 920, cardId: 'plague_husk', name: 'Plague Husk', owner: 0, row: 2,
      atk: 2, def: 3, move: 2, keywords: [], damage: 3, tempA: 0, tempD: 0, permA: 0, permD: 0,
      augments: [], range: 0, enteredTurn: 0,
      triggers: { lastword: { kind: 'dmgEnemiesInRow', n: 2 } } };
    const vic = { uid: 921, cardId: null, name: 'vic', owner: 1, row: 2, atk: 1, def: 2, move: 2,
      keywords: [], damage: 1, tempA: 0, tempD: 0, permA: 0, permD: 0, augments: [], range: 0,
      enteredTurn: 0, isToken: true };
    g.units.push(husk, vic);
    E.checkDeaths(g, 'test');
    return g.units.length === 0; // husk dies (3 dmg >= 3 def), blast kills vic
  })());
  check('growth swells at turn start', (function () {
    const seed = { uid: 922, cardId: null, name: 'seed', owner: g.activePlayer === 0 ? 1 : 0,
      atk: 0, def: 3, move: 2, keywords: [], damage: 0, tempA: 0, tempD: 0, permA: 0, permD: 0,
      augments: [], range: 0, enteredTurn: 0, row: 2, isToken: true,
      triggers: { growth: { a: 2, d: 2 } } };
    g.units.push(seed);
    g.winner = null;
    E.endTurn(g); // passes to seed's owner; growth fires at their turn start
    return seed.permA === 2 && seed.permD === 2;
  })());
}
{
  // Mulligan: first-turn redraw, once only.
  const g = E.newGame('fire', 'water', {});
  const n = g.players[0].hand.length;
  check('canMulligan on first turn', E.canMulligan(g, 0));
  check('mulligan redraws same count', E.mulligan(g, 0).ok && g.players[0].hand.length === n);
  check('no second mulligan', !E.canMulligan(g, 0) && !E.mulligan(g, 0).ok);
  check('opponent cannot mulligan out of turn', !E.canMulligan(g, 1));
}
{
  // Sudden death: escalating burn once past the threshold.
  const g = E.newGame('fire', 'water', {});
  g.turnCount = E.SUDDEN_DEATH_AFTER + 1;
  const before = [g.players[0].life, g.players[1].life];
  E.startTurn(g);
  check('sudden death burns both players',
    g.players[0].life === before[0] - 1 && g.players[1].life === before[1] - 1);
  g.players[0].life = 1; g.players[1].life = 1;
  g.turnCount = E.SUDDEN_DEATH_AFTER + 3;
  g.activePlayer = 0;
  E.startTurn(g);
  check('simultaneous burn-out: turn player loses', g.winner === 1 && g.winReason === 'sudden death');
}

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
