'use strict';
/* Titanrule rules engine — draft v0.1.
 * Pure game logic, no DOM. UI (js/ui.js) and AI (js/ai.js) drive it.
 *
 * Locked rulings from the draft's open questions:
 *  - Movement is free (no energy cost); "move" is a unit stat (default 1).
 *  - Enemy units block advancement: a unit in a contested row cannot advance,
 *    and a moving unit stops when it enters an enemy-occupied row.
 *  - Movement is declared during the fight phase (movement step), turn player only.
 *  - Damage removal (healing) exists (Earth, Light).
 *  - One energy card per turn; energy untaps in preparation, unspent energy
 *    does not carry over (costs are paid by tapping energy cards directly).
 *  - Locations sit off-board.
 *  - Leader recasts cost +2 generic per previous cast; the Leader fights as a unit.
 *  - Opening hand: 7. Life: 25. No row capacity limit. Deck-out is a loss.
 *  - A unit that fought in a contested row this fight phase cannot also attack
 *    the player; an uncontested unit on the enemy home row can.
 */
(function () {
  const CARDS = globalThis.TCG_CARDS;
  const DECKS = globalThis.TCG_DECKS;

  const HOME_ROW = [0, 4];          // row index of each player's home row (0-based; displayed as 1..5)
  const DEPLOY_ROWS = [[0, 1], [3, 4]];
  const STARTING_LIFE = 25;
  const OPENING_HAND = 7;
  const LEADER_RECAST_STEP = 2;

  let uidCounter = 1;

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function card(id) { return CARDS[id]; }
  function other(p) { return 1 - p; }
  function homeRow(p) { return HOME_ROW[p]; }
  function enemyHomeRow(p) { return HOME_ROW[other(p)]; }
  function deployRows(p) { return DEPLOY_ROWS[p]; }
  /* Direction of advance: toward the enemy's edge. */
  function forward(p) { return p === 0 ? 1 : -1; }

  function log(g, msg) {
    g.log.push({ turn: g.turnCount, msg });
  }

  function newGame(factionA, factionB, opts = {}) {
    const g = {
      players: [],
      units: [],
      activePlayer: 0,
      phase: 'main1',
      fightStep: null,      // 'move' | 'assign' | 'direct' | null
      turnCount: 1,
      energyPlayed: false,
      movedThisFight: [],   // uids that already moved this fight phase
      fought: [],           // uids that fought in a contested row this fight phase
      assign: {},           // uid -> { targetUid: damage } during assign step
      directEligible: [],   // uids able to attack the enemy player this fight phase
      order: [],            // the Order (LIFO stack): {cardId, controller, targets, countered}
      winner: null,
      winReason: null,
      log: [],
    };
    for (const [i, faction] of [factionA, factionB].entries()) {
      const list = DECKS[faction];
      const deck = [];
      for (const [id, count] of list.cards) for (let k = 0; k < count; k++) deck.push(id);
      shuffle(deck);
      g.players.push({
        faction,
        deckName: list.name,
        leaderId: list.leader,
        leaderCasts: 0,       // times cast so far (escalation counter)
        leaderInPlay: false,
        life: STARTING_LIFE,
        deck,
        hand: [],
        discard: [],
        energy: [],           // {cardId, provides, tapped}
        locations: [],        // cardIds, off-board
        isAI: !!(opts.ai && opts.ai[i]),
      });
    }
    drawCards(g, 0, OPENING_HAND);
    drawCards(g, 1, OPENING_HAND);
    log(g, `Game start: ${g.players[0].deckName} vs ${g.players[1].deckName}.`);
    log(g, `Player One's turn 1.`);
    return g;
  }

  function setWinner(g, p, reason) {
    if (g.winner !== null) return;
    g.winner = p;
    g.winReason = reason;
    log(g, `Player ${p === 0 ? 'One' : 'Two'} wins — ${reason}.`);
  }

  function drawCards(g, p, n) {
    const pl = g.players[p];
    for (let i = 0; i < n; i++) {
      if (g.winner !== null) return;
      if (pl.deck.length === 0) {
        setWinner(g, other(p), `Player ${p === 0 ? 'One' : 'Two'} tried to draw from an empty deck`);
        return;
      }
      pl.hand.push(pl.deck.pop());
    }
  }

  /* ---------- Energy and costs ---------- */

  function playEnergy(g, p, handIdx) {
    const pl = g.players[p];
    const id = pl.hand[handIdx];
    const c = card(id);
    if (!c || c.type !== 'energy') return { ok: false, err: 'Not an energy card.' };
    if (g.energyPlayed) return { ok: false, err: 'Already played an energy card this turn.' };
    pl.hand.splice(handIdx, 1);
    pl.energy.push({ cardId: id, provides: c.provides, tapped: false });
    g.energyPlayed = true;
    log(g, `${playerName(p)} plays ${c.name}.`);
    return { ok: true };
  }

  /* Plan which energy cards to tap for a cost. Returns array of energy-row
   * indices, or null if unpayable. Typed needs use matching types first, then
   * Void wildcards; generic uses whatever is left (non-wildcards first). */
  function planPayment(g, p, cost) {
    const pool = g.players[p].energy
      .map((e, i) => ({ i, provides: e.provides, tapped: e.tapped }))
      .filter(e => !e.tapped);
    const used = new Set();
    for (const [type, amt] of Object.entries(cost)) {
      if (type === 'G' || !amt) continue;
      let need = amt;
      for (const e of pool) {
        if (need === 0) break;
        if (!used.has(e.i) && e.provides === type) { used.add(e.i); need--; }
      }
      for (const e of pool) {
        if (need === 0) break;
        if (!used.has(e.i) && e.provides === 'ANY') { used.add(e.i); need--; }
      }
      if (need > 0) return null;
    }
    let generic = cost.G || 0;
    const rest = pool.filter(e => !used.has(e.i));
    rest.sort((a, b) => (a.provides === 'ANY' ? 1 : 0) - (b.provides === 'ANY' ? 1 : 0));
    for (const e of rest) {
      if (generic === 0) break;
      used.add(e.i); generic--;
    }
    if (generic > 0) return null;
    return [...used];
  }

  function canPay(g, p, cost) { return planPayment(g, p, cost) !== null; }

  function payCost(g, p, cost) {
    const plan = planPayment(g, p, cost);
    if (!plan) return false;
    for (const i of plan) g.players[p].energy[i].tapped = true;
    return true;
  }

  function costTotal(cost) {
    return Object.values(cost).reduce((a, b) => a + b, 0);
  }

  function leaderCost(g, p) {
    const pl = g.players[p];
    const base = card(pl.leaderId).cost;
    const cost = { ...base };
    if (pl.leaderCasts > 0) cost.G = (cost.G || 0) + LEADER_RECAST_STEP * pl.leaderCasts;
    return cost;
  }

  /* ---------- Units and stats ---------- */

  function makeUnit(g, p, c, row, flags = {}) {
    const u = {
      uid: uidCounter++,
      cardId: flags.isToken ? null : c.id,
      name: c.name,
      owner: p,
      row,
      atk: c.atk, def: c.def, move: c.move || 1,
      keywords: [...(c.keywords || [])],
      damage: 0,
      tempA: 0, tempD: 0, permA: 0, permD: 0,
      augments: [],           // cardIds
      isLeader: !!flags.isLeader,
      isToken: !!flags.isToken,
      enteredTurn: g.turnCount,
    };
    g.units.push(u);
    return u;
  }

  function unit(g, uid) { return g.units.find(u => u.uid === uid) || null; }
  function unitsInRow(g, row) { return g.units.filter(u => u.row === row); }
  function sideInRow(g, row, p) { return g.units.filter(u => u.row === row && u.owner === p); }

  function locBonus(g, p, key) {
    let n = 0;
    for (const id of g.players[p].locations) n += card(id).effect[key] || 0;
    return n;
  }
  function augBonus(u, key) {
    let n = 0;
    for (const id of u.augments) n += card(id).effect[key] || 0;
    return n;
  }
  function effAtk(g, u) {
    return Math.max(0, u.atk + u.tempA + u.permA + augBonus(u, 'a') + locBonus(g, u.owner, 'a'));
  }
  function effDef(g, u) {
    return u.def + u.tempD + u.permD + augBonus(u, 'd') + locBonus(g, u.owner, 'd');
  }
  function remainingDef(g, u) { return effDef(g, u) - u.damage; }
  function hasKw(u, kw) { return u.keywords.includes(kw); }

  function destroyUnit(g, u, cause) {
    const idx = g.units.indexOf(u);
    if (idx === -1) return;
    g.units.splice(idx, 1);
    for (const augId of u.augments) g.players[u.owner].discard.push(augId);
    const pl = g.players[u.owner];
    if (u.isLeader) {
      pl.leaderInPlay = false;
      log(g, `${u.name} is destroyed${cause ? ` (${cause})` : ''} and returns to the command zone.`);
    } else if (u.isToken) {
      log(g, `${u.name} (token) is destroyed${cause ? ` (${cause})` : ''}.`);
    } else {
      pl.discard.push(u.cardId);
      log(g, `${u.name} is destroyed${cause ? ` (${cause})` : ''}.`);
    }
  }

  /* State-based check: any unit whose damage meets its (possibly reduced)
   * defense is destroyed. Simultaneous. */
  function checkDeaths(g, cause) {
    const dead = g.units.filter(u => remainingDef(g, u) <= 0);
    for (const u of dead) destroyUnit(g, u, cause);
    return dead.length;
  }

  /* ---------- Playing cards (main phases) ---------- */

  function canDeployRow(p, row) { return deployRows(p).includes(row); }

  function inMainPhase(g) { return g.phase === 'main1' || g.phase === 'main2'; }

  /* Play a non-spell card from hand. opts: {row} for units, {targetUid} for augments. */
  function playCard(g, p, handIdx, opts = {}) {
    if (g.winner !== null) return { ok: false, err: 'Game over.' };
    const pl = g.players[p];
    const id = pl.hand[handIdx];
    const c = card(id);
    if (!c) return { ok: false, err: 'No such card.' };
    if (c.type === 'energy') return playEnergy(g, p, handIdx);
    if (c.type === 'spell') return { ok: false, err: 'Spells are cast onto the Order.' };
    if (g.activePlayer !== p || !inMainPhase(g))
      return { ok: false, err: 'Only during your own main phase.' };
    if (!canPay(g, p, c.cost)) return { ok: false, err: 'Not enough energy.' };

    if (c.type === 'unit') {
      if (!canDeployRow(p, opts.row)) return { ok: false, err: 'Deploy to one of your two nearest rows.' };
      payCost(g, p, c.cost);
      pl.hand.splice(handIdx, 1);
      makeUnit(g, p, c, opts.row);
      log(g, `${playerName(p)} deploys ${c.name} to row ${opts.row + 1}.`);
      return { ok: true };
    }
    if (c.type === 'augment') {
      const t = unit(g, opts.targetUid);
      if (!t || t.owner !== p) return { ok: false, err: 'Attach to a unit you control.' };
      payCost(g, p, c.cost);
      pl.hand.splice(handIdx, 1);
      t.augments.push(id);
      log(g, `${playerName(p)} attaches ${c.name} to ${t.name}.`);
      return { ok: true };
    }
    if (c.type === 'location') {
      payCost(g, p, c.cost);
      pl.hand.splice(handIdx, 1);
      pl.locations.push(id);
      log(g, `${playerName(p)} establishes ${c.name}.`);
      return { ok: true };
    }
    if (c.type === 'action') {
      if (g.order.length > 0) return { ok: false, err: 'The Order must be empty.' };
      const need = targetCheck(g, p, c, opts.targets);
      if (!need.ok) return need;
      payCost(g, p, c.cost);
      pl.hand.splice(handIdx, 1);
      log(g, `${playerName(p)} plays ${c.name}.`);
      applyEffect(g, p, c, opts.targets || {});
      pl.discard.push(id);
      return { ok: true };
    }
    return { ok: false, err: `Cannot play ${c.type} this way.` };
  }

  function castLeader(g, p, row) {
    if (g.winner !== null) return { ok: false, err: 'Game over.' };
    const pl = g.players[p];
    if (g.activePlayer !== p || !inMainPhase(g))
      return { ok: false, err: 'Only during your own main phase.' };
    if (pl.leaderInPlay) return { ok: false, err: 'Your Leader is already in play.' };
    if (!canDeployRow(p, row)) return { ok: false, err: 'Deploy to one of your two nearest rows.' };
    const cost = leaderCost(g, p);
    if (!canPay(g, p, cost)) return { ok: false, err: 'Not enough energy.' };
    payCost(g, p, cost);
    pl.leaderCasts++;
    pl.leaderInPlay = true;
    const c = card(pl.leaderId);
    makeUnit(g, p, c, row, { isLeader: true });
    log(g, `${playerName(p)} casts ${c.name} (cast #${pl.leaderCasts}) to row ${row + 1}.`);
    return { ok: true };
  }

  /* ---------- Targeting ---------- */

  function targetCheck(g, p, c, targets) {
    if (!c.target) return { ok: true };
    targets = targets || {};
    if (c.target === 'order') {
      const i = targets.orderIdx;
      if (i === undefined || !g.order[i] || g.order[i].countered)
        return { ok: false, err: 'Choose a spell on the Order.' };
      return { ok: true };
    }
    const t = unit(g, targets.uid);
    if (!t) return { ok: false, err: 'Choose a target unit.' };
    if (c.target === 'ownUnit' && t.owner !== p) return { ok: false, err: 'Target a unit you control.' };
    if (c.target === 'enemyUnit' && t.owner === p) return { ok: false, err: 'Target an enemy unit.' };
    return { ok: true };
  }

  /* ---------- The Order (spells) ---------- */

  function spellPlayable(g, p, c) {
    if (c.type !== 'spell') return false;
    if (!canPay(g, p, c.cost)) return false;
    if (c.target === 'order') return g.order.some(it => !it.countered);
    return true;
  }

  /* Cast a spell onto the Order (cost paid now, card leaves hand now). */
  function castSpell(g, p, handIdx, targets) {
    if (g.winner !== null) return { ok: false, err: 'Game over.' };
    const pl = g.players[p];
    const id = pl.hand[handIdx];
    const c = card(id);
    if (!c || c.type !== 'spell') return { ok: false, err: 'Not a spell.' };
    const need = targetCheck(g, p, c, targets);
    if (!need.ok) return need;
    if (!canPay(g, p, c.cost)) return { ok: false, err: 'Not enough energy.' };
    payCost(g, p, c.cost);
    pl.hand.splice(handIdx, 1);
    g.order.push({ cardId: id, controller: p, targets: targets || {}, countered: false });
    log(g, `${playerName(p)} adds ${c.name} to the Order.`);
    return { ok: true };
  }

  /* Resolve the whole Order, last in first out. */
  function resolveOrder(g) {
    while (g.order.length > 0 && g.winner === null) {
      const item = g.order.pop();
      const c = card(item.cardId);
      if (item.countered) {
        log(g, `${c.name} was countered — no effect.`);
        g.players[item.controller].discard.push(item.cardId);
        continue;
      }
      const chk = targetCheck(g, item.controller, c, item.targets);
      if (!chk.ok && c.target && c.target !== 'order') {
        log(g, `${c.name} fizzles — its target is gone.`);
        g.players[item.controller].discard.push(item.cardId);
        continue;
      }
      log(g, `${c.name} resolves.`);
      applyEffect(g, item.controller, c, item.targets);
      g.players[item.controller].discard.push(item.cardId);
    }
    g.order.length = 0;
  }

  /* ---------- Effects ---------- */

  function applyEffect(g, p, c, targets) {
    const e = c.effect;
    if (!e) return;
    const t = targets && targets.uid !== undefined ? unit(g, targets.uid) : null;
    switch (e.kind) {
      case 'dmgUnit':
        if (t) {
          t.damage += e.n;
          log(g, `${c.name} deals ${e.n} damage to ${t.name}.`);
          checkDeaths(g, c.name);
        }
        break;
      case 'dmgPlayer': {
        const foe = other(p);
        g.players[foe].life -= e.n;
        log(g, `${c.name} deals ${e.n} damage to ${playerName(foe)} (${g.players[foe].life} life).`);
        if (g.players[foe].life <= 0) setWinner(g, p, 'life reached 0');
        break;
      }
      case 'heal':
        if (t) {
          const healed = Math.min(t.damage, e.n);
          t.damage -= healed;
          log(g, `${c.name} removes ${healed} damage from ${t.name}.`);
        }
        break;
      case 'draw':
        drawCards(g, p, e.n);
        log(g, `${playerName(p)} draws ${e.n} card${e.n > 1 ? 's' : ''}.`);
        break;
      case 'destroy':
        if (t) destroyUnit(g, t, c.name);
        break;
      case 'bounce':
        if (t) {
          const idx = g.units.indexOf(t);
          if (idx !== -1) g.units.splice(idx, 1);
          for (const augId of t.augments) g.players[t.owner].discard.push(augId);
          if (t.isLeader) {
            g.players[t.owner].leaderInPlay = false;
            log(g, `${t.name} is swept back to the command zone.`);
          } else if (t.isToken) {
            log(g, `${t.name} (token) is swept away.`);
          } else {
            g.players[t.owner].hand.push(t.cardId);
            log(g, `${t.name} is returned to its owner's hand.`);
          }
        }
        break;
      case 'push':
        if (t) {
          const back = -forward(t.owner);
          const dest = Math.max(0, Math.min(4, t.row + back * e.n));
          t.row = dest;
          log(g, `${t.name} is pushed back to row ${dest + 1}.`);
        }
        break;
      case 'buff':
        if (t) {
          if (e.temp) { t.tempA += e.a; t.tempD += e.d; }
          else { t.permA += e.a; t.permD += e.d; }
          log(g, `${t.name} gets ${e.a >= 0 ? '+' : ''}${e.a}/${e.d >= 0 ? '+' : ''}${e.d}${e.temp ? ' until end of turn' : ''}.`);
          checkDeaths(g, c.name);
        }
        break;
      case 'counter': {
        const it = g.order[targets.orderIdx];
        if (it && !it.countered) {
          it.countered = true;
          log(g, `${card(it.cardId).name} is countered by ${c.name}.`);
        }
        break;
      }
      case 'rampEnergy': {
        const pl = g.players[p];
        const di = pl.deck.findIndex(id => card(id).type === 'energy');
        if (di !== -1) {
          const [id] = pl.deck.splice(di, 1);
          pl.energy.push({ cardId: id, provides: card(id).provides, tapped: true });
          shuffle(pl.deck);
          log(g, `${playerName(p)} puts ${card(id).name} into their energy row, tapped.`);
        } else {
          log(g, `No energy card left in the deck.`);
        }
        break;
      }
      case 'sacDraw':
        if (t && t.owner === p) {
          destroyUnit(g, t, 'sacrificed');
          drawCards(g, p, e.n);
          log(g, `${playerName(p)} draws ${e.n} cards.`);
        }
        break;
      case 'tokens': {
        for (let i = 0; i < e.count; i++) {
          makeUnit(g, p, { id: null, name: e.name, atk: e.a, def: e.d, move: 1, keywords: [] },
                   homeRow(p), { isToken: true });
        }
        log(g, `${playerName(p)} creates ${e.count} ${e.name} token${e.count > 1 ? 's' : ''} on row ${homeRow(p) + 1}.`);
        break;
      }
    }
  }

  /* ---------- Movement (fight phase, movement step) ---------- */

  function beginFight(g) {
    g.phase = 'fight';
    g.fightStep = 'move';
    g.movedThisFight = [];
    g.fought = [];
    g.assign = {};
    log(g, `Fight phase begins.`);
  }

  /* Rows a unit can legally end its movement in this turn. */
  function legalMoveRows(g, u) {
    if (g.phase !== 'fight' || g.fightStep !== 'move') return [];
    if (u.owner !== g.activePlayer) return [];
    if (g.movedThisFight.includes(u.uid)) return [];
    if (u.enteredTurn === g.turnCount && !hasKw(u, 'hasty')) return [];
    const fwd = forward(u.owner);
    const rows = [];
    // Advance: blocked entirely while in a contested row; otherwise step
    // forward up to `move` rows, stopping upon entering an enemy-occupied row.
    if (sideInRow(g, u.row, other(u.owner)).length === 0) {
      let r = u.row;
      for (let step = 0; step < u.move; step++) {
        const next = r + fwd;
        if (next < 0 || next > 4) break;
        r = next;
        rows.push(r);
        if (sideInRow(g, r, other(u.owner)).length > 0) break;
      }
    }
    // Retreat: up to `move` rows toward your own edge, same stop rule.
    {
      let r = u.row;
      for (let step = 0; step < u.move; step++) {
        const next = r - fwd;
        if (next < 0 || next > 4) break;
        r = next;
        rows.push(r);
        if (sideInRow(g, r, other(u.owner)).length > 0) break;
      }
    }
    return rows;
  }

  function moveUnit(g, uid, row) {
    const u = unit(g, uid);
    if (!u) return { ok: false, err: 'No such unit.' };
    if (!legalMoveRows(g, u).includes(row)) return { ok: false, err: 'Illegal move.' };
    const from = u.row;
    u.row = row;
    g.movedThisFight.push(uid);
    log(g, `${u.name} moves from row ${from + 1} to row ${row + 1}.`);
    return { ok: true };
  }

  /* ---------- Combat ---------- */

  function contestedRows(g) {
    const rows = [];
    for (let r = 0; r < 5; r++) {
      if (sideInRow(g, r, 0).length > 0 && sideInRow(g, r, 1).length > 0) rows.push(r);
    }
    return rows;
  }

  function finishMoves(g) {
    g.fightStep = 'assign';
    g.assign = {};
    if (contestedRows(g).length === 0) {
      log(g, `No contested rows.`);
      prepDirect(g);
    }
  }

  /* Greedy auto-assignment for player p's units in every contested row:
   * satisfy Guard first, then concentrate damage to kill cheapest-to-kill
   * enemies, dumping any overkill onto the last target. */
  function autoAssignFor(g, p) {
    for (const r of contestedRows(g)) {
      const mine = sideInRow(g, r, p);
      const foes = sideInRow(g, r, other(p));
      const incoming = {};           // planned damage per enemy uid this pass
      for (const f of foes) incoming[f.uid] = 0;
      let budget = mine.reduce((s, u) => s + effAtk(g, u), 0);
      const orderOfKill = [];
      const guards = foes.filter(f => hasKw(f, 'guard'));
      const rest = foes.filter(f => !hasKw(f, 'guard'));
      guards.sort((a, b) => remainingDef(g, a) - remainingDef(g, b));
      rest.sort((a, b) => remainingDef(g, a) - remainingDef(g, b));
      // Guards must be dealt with first; only plan damage past them if we
      // can assign lethal to every guard.
      const guardTotal = guards.reduce((s, f) => s + remainingDef(g, f), 0);
      if (guards.length > 0 && budget <= guardTotal) {
        orderOfKill.push(...guards);
      } else {
        orderOfKill.push(...guards, ...rest);
      }
      for (const f of orderOfKill) {
        const want = Math.min(budget, Math.max(remainingDef(g, f), 0));
        incoming[f.uid] += want;
        budget -= want;
        if (budget === 0) break;
      }
      // Dump leftover damage onto the toughest planned target.
      if (budget > 0 && orderOfKill.length > 0) {
        incoming[orderOfKill[orderOfKill.length - 1].uid] += budget;
        budget = 0;
      }
      // Convert row-level plan into per-unit assignments.
      const owed = { ...incoming };
      for (const u of mine) {
        let dmg = effAtk(g, u);
        const map = {};
        for (const f of foes) {
          if (dmg === 0) break;
          const give = Math.min(dmg, owed[f.uid]);
          if (give > 0) { map[f.uid] = give; owed[f.uid] -= give; dmg -= give; }
        }
        if (dmg > 0 && foes.length > 0) {
          const last = foes[foes.length - 1].uid;
          map[last] = (map[last] || 0) + dmg;
        }
        g.assign[u.uid] = map;
      }
    }
  }

  /* Fill any unassigned damage, then validate totals and the Guard rule.
   * Returns {ok, err}. */
  function validateAssignments(g) {
    for (const r of contestedRows(g)) {
      for (const p of [0, 1]) {
        const mine = sideInRow(g, r, p);
        const foes = sideInRow(g, r, other(p));
        // Per-unit totals must equal the unit's attack (mandatory combat).
        for (const u of mine) {
          const map = g.assign[u.uid] || {};
          let total = 0;
          for (const [tu, n] of Object.entries(map)) {
            if (n < 0) return { ok: false, err: 'Negative damage assigned.' };
            if (!foes.some(f => f.uid === +tu))
              return { ok: false, err: `${u.name} may only assign damage to enemies in its row.` };
            total += n;
          }
          if (total !== effAtk(g, u))
            return { ok: false, err: `${u.name} must assign exactly ${effAtk(g, u)} damage.` };
        }
        // Guard: enemies with damage assigned to non-guards require every
        // guard to have lethal assigned (from this side's combined attacks).
        const guards = foes.filter(f => hasKw(f, 'guard'));
        if (guards.length > 0) {
          const totalTo = {};
          for (const u of mine) {
            for (const [tu, n] of Object.entries(g.assign[u.uid] || {}))
              totalTo[tu] = (totalTo[tu] || 0) + n;
          }
          const hitsNonGuard = foes.some(f => !hasKw(f, 'guard') && (totalTo[f.uid] || 0) > 0);
          if (hitsNonGuard) {
            for (const gu of guards) {
              if ((totalTo[gu.uid] || 0) < remainingDef(g, gu))
                return { ok: false, err: `Guard: ${gu.name} must be assigned lethal damage first.` };
            }
          }
        }
      }
    }
    return { ok: true };
  }

  /* Top up any unit whose assigned damage is short of its attack: guards
   * needing lethal first, then cheapest kills, overkill onto a legal target. */
  function topUpAssignments(g) {
    for (const r of contestedRows(g)) {
      for (const p of [0, 1]) {
        const mine = sideInRow(g, r, p);
        const foes = sideInRow(g, r, other(p));
        if (foes.length === 0) continue;
        const totalTo = {};
        for (const u of mine) {
          for (const [tu, n] of Object.entries(g.assign[u.uid] || {}))
            totalTo[tu] = (totalTo[tu] || 0) + n;
        }
        const guards = foes.filter(f => hasKw(f, 'guard'));
        const give = (u, f, n) => {
          const map = g.assign[u.uid] || (g.assign[u.uid] = {});
          map[f.uid] = (map[f.uid] || 0) + n;
          totalTo[f.uid] = (totalTo[f.uid] || 0) + n;
        };
        for (const u of mine) {
          const map = g.assign[u.uid] || (g.assign[u.uid] = {});
          let rem = effAtk(g, u) - Object.values(map).reduce((a, b) => a + b, 0);
          // Guards lacking lethal come first.
          for (const f of guards) {
            if (rem <= 0) break;
            const need = Math.max(0, remainingDef(g, f) - (totalTo[f.uid] || 0));
            if (need > 0) { const n = Math.min(rem, need); give(u, f, n); rem -= n; }
          }
          // Then cheapest remaining kills among the rest.
          const rest = foes.filter(f => !hasKw(f, 'guard'))
            .sort((a, b) => remainingDef(g, a) - remainingDef(g, b));
          const guardsLethal = guards.every(f => (totalTo[f.uid] || 0) >= remainingDef(g, f));
          if (guardsLethal) {
            for (const f of rest) {
              if (rem <= 0) break;
              const need = Math.max(0, remainingDef(g, f) - (totalTo[f.uid] || 0));
              if (need > 0) { const n = Math.min(rem, need); give(u, f, n); rem -= n; }
            }
          }
          // Overkill: onto a guard if guards still stand, else the last foe.
          if (rem > 0) {
            const dump = guards.length > 0 && !guardsLethal ? guards[0]
              : (guards.length > 0 ? guards[0] : foes[foes.length - 1]);
            give(u, dump, rem);
          }
        }
      }
    }
  }

  /* Complete assignments, validate, then resolve all contested rows
   * simultaneously. */
  function resolveCombat(g) {
    topUpAssignments(g);
    const v = validateAssignments(g);
    if (!v.ok) return v;

    const rows = contestedRows(g);
    const totals = {}; // uid -> incoming damage
    for (const r of rows) {
      for (const u of unitsInRow(g, r)) {
        g.fought.push(u.uid);
        for (const [tu, n] of Object.entries(g.assign[u.uid] || {}))
          totals[tu] = (totals[tu] || 0) + n;
      }
    }
    for (const [tu, n] of Object.entries(totals)) {
      const t = unit(g, +tu);
      if (t && n > 0) {
        t.damage += n;
        log(g, `${t.name} takes ${n} damage (${Math.max(0, remainingDef(g, t))} defense left).`);
      }
    }
    checkDeaths(g, 'combat');
    g.assign = {};
    prepDirect(g);
    return { ok: true };
  }

  /* ---------- Attacking the player ---------- */

  function prepDirect(g) {
    const p = g.activePlayer;
    const target = enemyHomeRow(p);
    g.directEligible = g.units
      .filter(u => u.owner === p && u.row === target
        && sideInRow(g, target, other(p)).length === 0
        && !g.fought.includes(u.uid)
        && effAtk(g, u) > 0)
      .map(u => u.uid);
    g.fightStep = 'direct';
    if (g.directEligible.length === 0) endFight(g);
  }

  function doDirectAttacks(g, uids) {
    const p = g.activePlayer;
    const foe = other(p);
    let total = 0;
    for (const uid of uids) {
      if (!g.directEligible.includes(uid)) continue;
      const u = unit(g, uid);
      if (u) total += effAtk(g, u);
    }
    if (total > 0) {
      g.players[foe].life -= total;
      log(g, `${playerName(p)}'s forces strike for ${total} — ${playerName(foe)} falls to ${Math.max(0, g.players[foe].life)} life.`);
      if (g.players[foe].life <= 0) setWinner(g, p, 'life reached 0');
    }
    endFight(g);
  }

  function endFight(g) {
    g.fightStep = null;
    g.directEligible = [];
    if (g.winner === null) g.phase = 'main2';
  }

  /* ---------- Turn flow ---------- */

  function endTurn(g) {
    if (g.winner !== null) return;
    // End step: temporary buffs expire; persistent damage remains.
    for (const u of g.units) { u.tempA = 0; u.tempD = 0; }
    checkDeaths(g, 'end of turn');
    g.activePlayer = other(g.activePlayer);
    g.turnCount++;
    startTurn(g);
  }

  function startTurn(g) {
    if (g.winner !== null) return;
    const p = g.activePlayer;
    // Preparation: untap.
    for (const e of g.players[p].energy) e.tapped = false;
    g.energyPlayed = false;
    g.phase = 'main1';
    g.fightStep = null;
    log(g, `— ${playerName(p)}'s turn (turn ${g.turnCount}) —`);
    // Draw phase.
    drawCards(g, p, 1);
  }

  function playerName(p) { return p === 0 ? 'Player One' : 'Player Two'; }

  globalThis.Engine = {
    HOME_ROW, DEPLOY_ROWS, STARTING_LIFE,
    card, other, homeRow, enemyHomeRow, deployRows, forward, playerName,
    newGame, drawCards, log,
    playEnergy, canPay, payCost, planPayment, leaderCost, costTotal,
    playCard, castLeader, castSpell, resolveOrder, spellPlayable, targetCheck,
    unit, unitsInRow, sideInRow, effAtk, effDef, remainingDef, hasKw,
    destroyUnit, checkDeaths,
    beginFight, legalMoveRows, moveUnit, finishMoves,
    contestedRows, autoAssignFor, validateAssignments, resolveCombat,
    prepDirect, doDirectAttacks, endTurn, startTurn,
    setWinner,
  };
})();
