'use strict';
/* Simple heuristic AI for Titanrule.
 * Synchronous decision helpers; the UI (or the headless test harness) calls
 * these at each decision point. The AI never responds on the Order.
 */
(function () {
  const E = globalThis.Engine;
  const CARDS = globalThis.TCG_CARDS;

  function card(id) { return CARDS[id]; }

  /* Rough worth of a unit, for removal heuristics. */
  function unitValue(g, t) {
    if (t.isLeader) return 4;
    if (t.isToken) return 0;
    return E.costTotal(card(t.cardId).cost);
  }

  /* Best enemy unit to burn/remove: highest attack, then toughest. */
  function bestEnemyTarget(g, p) {
    const foes = g.units.filter(u => u.owner !== p);
    if (foes.length === 0) return null;
    foes.sort((a, b) => (E.effAtk(g, b) - E.effAtk(g, a)) || (E.remainingDef(g, b) - E.remainingDef(g, a)));
    return foes[0];
  }

  function mostWounded(g, p) {
    const mine = g.units.filter(u => u.owner === p && u.damage > 0);
    if (mine.length === 0) return null;
    mine.sort((a, b) => b.damage - a.damage);
    return mine[0];
  }

  function strongest(g, p) {
    const mine = g.units.filter(u => u.owner === p);
    if (mine.length === 0) return null;
    mine.sort((a, b) => E.effAtk(g, b) - E.effAtk(g, a));
    return mine[0];
  }

  /* Forward-most deploy row for aggression. */
  function deployRow(g, p) {
    const rows = E.deployRows(p);
    return p === 0 ? Math.max(...rows) : Math.min(...rows);
  }

  /* Play out the active AI player's main phase. Mutates g. */
  function mainPhase(g, p) {
    let acted = true;
    let guard = 0;
    while (acted && g.winner === null && guard++ < 50) {
      acted = false;
      const pl = g.players[p];

      // 1. Play an energy card.
      if (!g.energyPlayed) {
        const i = pl.hand.findIndex(id => card(id).type === 'energy');
        if (i !== -1 && E.playEnergy(g, p, i).ok) { acted = true; continue; }
      }

      // 2. Cast the Leader if affordable and not already out (cap recasts).
      if (!pl.leaderInPlay && pl.leaderCasts < 3 && E.canPay(g, p, E.leaderCost(g, p))) {
        if (E.castLeader(g, p, deployRow(g, p)).ok) { acted = true; continue; }
      }

      // 3. Play the most expensive affordable unit.
      const unitIdxs = pl.hand
        .map((id, i) => ({ id, i, c: card(id) }))
        .filter(x => x.c.type === 'unit' && E.canPay(g, p, x.c.cost))
        .sort((a, b) => E.costTotal(b.c.cost) - E.costTotal(a.c.cost));
      if (unitIdxs.length > 0) {
        if (E.playCard(g, p, unitIdxs[0].i, { row: deployRow(g, p) }).ok) { acted = true; continue; }
      }

      // 4. Actions / augments / locations / spells with simple heuristics.
      for (let i = 0; i < pl.hand.length; i++) {
        const c = card(pl.hand[i]);
        if (!c.effect || !E.canPay(g, p, c.cost)) continue;
        let res = null;
        const k = c.effect.kind;
        if (c.type === 'action') {
          if (k === 'draw' || k === 'rampEnergy') res = E.playCard(g, p, i, {});
          else if (k === 'tokens') res = E.playCard(g, p, i, {});
          else if (k === 'gainLife') {
            if (g.players[p].life <= 20) res = E.playCard(g, p, i, {});
          }
          else if (k === 'dmgRow') {
            let best = null, bestCount = 0;
            for (let r = 0; r < 5; r++) {
              const n = E.sideInRow(g, r, E.other(p)).length;
              if (n > bestCount) { best = r; bestCount = n; }
            }
            if (best !== null && bestCount >= 2) res = E.playCard(g, p, i, { targets: { row: best } });
          }
          else if (k === 'sacDraw') {
            const chaff = g.units.filter(u => u.owner === p && E.effAtk(g, u) <= 1 && !u.isLeader);
            if (chaff.length > 0) res = E.playCard(g, p, i, { targets: { uid: chaff[0].uid } });
          } else if (k === 'buff' && g.phase === 'main1') {
            const s = strongest(g, p);
            if (s) res = E.playCard(g, p, i, { targets: { uid: s.uid } });
          }
        } else if (c.type === 'augment') {
          const s = strongest(g, p);
          if (s && !s.isToken) res = E.playCard(g, p, i, { targetUid: s.uid });
        } else if (c.type === 'location') {
          res = E.playCard(g, p, i, {});
        } else if (c.type === 'spell') {
          // Cast damage/removal in main1 so the target can't profitably block.
          let targets = null;
          if (k === 'dmgUnit' || k === 'drain') {
            const t = bestEnemyTarget(g, p);
            if (t && (E.remainingDef(g, t) <= c.effect.n ||
                      (k === 'drain' && g.players[p].life <= 12))) targets = { uid: t.uid };
          } else if (k === 'painDraw') {
            if (g.players[p].life > 10) targets = {};
          } else if (k === 'destroy' || (k === 'buff' && c.target === 'enemyUnit')) {
            const t = bestEnemyTarget(g, p);
            if (t && (k !== 'destroy' || unitValue(g, t) >= 3)) targets = { uid: t.uid };
          } else if (k === 'heal') {
            const t = mostWounded(g, p);
            if (t) targets = { uid: t.uid };
          } else if (k === 'dmgPlayer') {
            targets = {};
          } else if (k === 'bounce') {
            const t = bestEnemyTarget(g, p);
            if (t && unitValue(g, t) >= 4) targets = { uid: t.uid };
          }
          if (targets) {
            res = E.castSpell(g, p, i, targets);
            if (res && res.ok) E.resolveOrder(g); // opponent response handled by UI layer for humans
          }
        }
        if (res && res.ok) { acted = true; break; }
      }
    }
  }

  /* Movement step: advance every unit as far as legal. */
  function movePhase(g, p) {
    let moved = true;
    let guard = 0;
    while (moved && guard++ < 100) {
      moved = false;
      for (const u of [...g.units]) {
        if (u.owner !== p) continue;
        const rows = E.legalMoveRows(g, u);
        if (rows.length === 0) continue;
        const fwd = E.forward(p);
        // Pick the row furthest toward the enemy edge (advance only).
        const advance = rows.filter(r => Math.sign(r - u.row) === fwd);
        if (advance.length === 0) continue;
        const dest = fwd > 0 ? Math.max(...advance) : Math.min(...advance);
        if (E.moveUnit(g, u.uid, dest).ok) { moved = true; }
      }
    }
  }

  /* Take the AI's whole fight phase, except that when a human defender has
   * combat choices, the caller can pause before resolveCombat. Returns true
   * if combat still needs human defender input. */
  function fightUntilAssign(g, p) {
    E.beginFight(g);
    movePhase(g, p);
    E.finishMoves(g);
    if (g.fightStep !== 'assign') return false;
    E.autoAssignFor(g, p);
    const humanDefender = !g.players[E.other(p)].isAI &&
      E.contestedRows(g).some(r => E.sideInRow(g, r, E.other(p)).some(u => E.effAtk(g, u) > 0));
    return humanDefender;
  }

  function finishFight(g, p) {
    if (g.fightStep === 'assign') {
      // resolveCombat auto-fills any side that left assignments blank while
      // preserving assignments the human defender already made.
      E.resolveCombat(g);
    }
    if (g.fightStep === 'direct') {
      E.doDirectAttacks(g, [...g.directEligible]);
    }
  }

  /* Full turn for a headless AI-vs-AI game (no human pauses). */
  function takeFullTurn(g) {
    const p = g.activePlayer;
    mainPhase(g, p);
    if (g.winner !== null) return;
    E.beginFight(g);
    movePhase(g, p);
    E.finishMoves(g);
    if (g.fightStep === 'assign') {
      E.autoAssignFor(g, p);
      E.autoAssignFor(g, E.other(p));
      E.resolveCombat(g);
    }
    if (g.fightStep === 'direct') E.doDirectAttacks(g, [...g.directEligible]);
    if (g.winner !== null) return;
    mainPhase(g, p); // second main
    E.endTurn(g);
  }

  globalThis.AI = { mainPhase, movePhase, fightUntilAssign, finishFight, takeFullTurn };
})();
