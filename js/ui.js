'use strict';
/* Titanrule simulator UI. Drives js/engine.js; hotseat or vs-AI. */
(function () {
  const E = globalThis.Engine;
  const AI = globalThis.AI;
  const CARDS = globalThis.TCG_CARDS;
  const DECKS = globalThis.TCG_DECKS;
  const PACK = globalThis.TCG_PACK;
  const COLLECTIBLES = globalThis.TCG_COLLECTIBLES;
  const costSymbols = globalThis.TCG_COST_SYMBOLS;

  let G = null;
  const settings = { mode: 'hotseat', factions: ['fire', 'water'] };
  const ui = {
    mode: 'idle',          // idle | deploy | deployLeader | target
    handIdx: null,         // hand card being deployed/targeted
    targetCard: null,      // card def awaiting a target
    moveUid: null,         // unit selected to move
    respContext: null,     // {player, handIdx} while targeting a response spell
    directSel: new Set(),
    directInit: false,
    aiWaitingDefense: false,
    aiBusy: false,
    packsAwarded: false,
  };

  /* ---------- Collection & packs (persisted per device) ---------- */

  const STORE_KEY = 'titanrule.collection.v1';
  function loadCollection() {
    try {
      const d = JSON.parse(localStorage.getItem(STORE_KEY));
      if (d && typeof d === 'object') {
        return { packs: Number.isInteger(d.packs) ? d.packs : 5, cards: d.cards || {} };
      }
    } catch (e) { /* first run or storage unavailable */ }
    return { packs: 5, cards: {} };
  }
  const collection = loadCollection();
  function saveCollection() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(collection)); } catch (e) { /* ok */ }
  }

  function rollPack() {
    const byRarity = {};
    for (const id of COLLECTIBLES) {
      const r = CARDS[id].rarity;
      (byRarity[r] = byRarity[r] || []).push(id);
    }
    const pull = r => byRarity[r][Math.floor(Math.random() * byRarity[r].length)];
    const cards = [];
    for (const slot of PACK.slots) {
      for (let i = 0; i < slot.count; i++) {
        let r = slot.rarity;
        if (slot.upgradeTo && Math.random() < slot.upgradeChance) r = slot.upgradeTo;
        cards.push(pull(r));
      }
    }
    return cards;
  }

  const $ = id => document.getElementById(id);
  const el = (tag, cls, html) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html !== undefined) e.innerHTML = html;
    return e;
  };
  const esc = s => String(s).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  /* ---------- helpers ---------- */

  function humanPlayers() { return settings.mode === 'ai' ? [1] : [0, 1]; }
  function isHuman(p) { return humanPlayers().includes(p); }
  /* Whose hand is on screen. */
  function viewPlayer() {
    if (ui.respContext) return ui.respContext.player;
    if (settings.mode === 'ai') return 1;
    return G.activePlayer;
  }
  function myTurn() { return G.activePlayer === viewPlayer() && !ui.aiBusy && !ui.aiWaitingDefense; }
  function inMain() { return G.phase === 'main1' || G.phase === 'main2'; }

  function costHtml(cost) {
    let h = '<span class="cost">';
    for (const t of ['F', 'W', 'N', 'E', 'L', 'D']) {
      for (let i = 0; i < (cost[t] || 0); i++) h += `<span class="pip ${t}">${t}</span>`;
    }
    if (cost.G) h += `<span class="pip G">${cost.G}</span>`;
    h += '</span>';
    return h;
  }

  let bannerTimer = null;
  function banner(msg, sticky) {
    const b = $('banner');
    b.textContent = msg;
    b.style.display = 'block';
    clearTimeout(bannerTimer);
    if (!sticky) bannerTimer = setTimeout(() => { b.style.display = 'none'; }, 3500);
  }
  function clearBanner() { clearTimeout(bannerTimer); $('banner').style.display = 'none'; }

  function cancelMode() {
    const hadResp = ui.respContext;
    ui.mode = 'idle'; ui.handIdx = null; ui.targetCard = null; ui.moveUid = null;
    clearBanner();
    if (hadResp) { showOrderModal(hadResp.player); }
    ui.respContext = null;
    renderAll();
  }

  /* Shared card face for hand / packs / collection. */
  function cardFace(c, opts = {}) {
    const d = el('div', `card rarity-${c.rarity}` + (opts.extraClass ? ' ' + opts.extraClass : ''));
    let stats = '';
    if (c.type === 'unit' || c.type === 'leader') stats = ` <span class="cstats">${c.atk}/${c.def}</span>`;
    d.innerHTML =
      `<div class="cname">${esc(c.name)}${stats}${opts.count !== undefined ? `<span class="coll-count">×${opts.count}</span>` : ''}</div>` +
      `<div class="ctype">${esc(c.type)} ${costHtml(c.cost)} <span class="rtag ${c.rarity}">${esc(c.rarity)}</span></div>` +
      (c.text ? `<div class="ctext">${esc(c.text)}</div>` : '');
    return d;
  }

  /* ---------- Setup screen: packs & collection ---------- */

  function renderPacks() {
    $('packinfo').innerHTML =
      `You have <b>${collection.packs}</b> unopened pack${collection.packs === 1 ? '' : 's'} · ` +
      `${Object.values(collection.cards).reduce((a, b) => a + b, 0)} cards collected`;
    $('openpack').disabled = collection.packs <= 0;
    if ($('collection').style.display !== 'none') renderCollection();
  }

  function openPack() {
    if (collection.packs <= 0) return;
    collection.packs--;
    const pulls = rollPack();
    for (const id of pulls) collection.cards[id] = (collection.cards[id] || 0) + 1;
    saveCollection();
    const grid = $('packcards');
    grid.replaceChildren();
    for (const id of pulls) {
      const c = CARDS[id];
      const down = el('div', 'card facedown', 'TITANRULE');
      down.style.minWidth = '138px';
      down.onclick = () => { grid.replaceChild(cardFace(c), down); };
      grid.appendChild(down);
    }
    $('packmodal').style.display = 'flex';
    renderPacks();
  }

  const FACTION_ORDER = [
    ['F', 'Fire'], ['W', 'Water'], ['N', 'Nature'], ['E', 'Earth'],
    ['L', 'Light'], ['D', 'Dark'], [null, 'Void'],
  ];
  const RARITY_ORDER = { titan: 0, rare: 1, uncommon: 2, common: 3 };

  function renderCollection() {
    const box = $('collection');
    box.replaceChildren();
    for (const [sym, label] of FACTION_ORDER) {
      const ids = COLLECTIBLES.filter(id => {
        const syms = costSymbols(CARDS[id]);
        return sym === null ? syms.length === 0 : (syms.length === 1 && syms[0] === sym);
      }).sort((a, b) =>
        (RARITY_ORDER[CARDS[a].rarity] - RARITY_ORDER[CARDS[b].rarity]) ||
        (E.costTotal(CARDS[a].cost) - E.costTotal(CARDS[b].cost)));
      if (ids.length === 0) continue;
      const owned = ids.filter(id => collection.cards[id]).length;
      box.appendChild(el('h3', '', `${label} — ${owned}/${ids.length} collected`));
      const group = el('div', 'coll-group');
      for (const id of ids) {
        const n = collection.cards[id] || 0;
        group.appendChild(cardFace(CARDS[id], { count: n, extraClass: n === 0 ? 'unowned' : '' }));
      }
      box.appendChild(group);
    }
  }

  $('openpack').onclick = openPack;
  $('packdone').onclick = () => { $('packmodal').style.display = 'none'; renderPacks(); };
  $('togglecollection').onclick = () => {
    const box = $('collection');
    const show = box.style.display === 'none';
    box.style.display = show ? 'block' : 'none';
    $('togglecollection').textContent = show ? 'Hide collection' : 'View collection';
    if (show) renderCollection();
  };

  function buildSetup() {
    renderPacks();
    document.querySelectorAll('.mode-btn').forEach(b => {
      b.classList.toggle('selected', b.dataset.mode === settings.mode);
      b.onclick = () => { settings.mode = b.dataset.mode; buildSetup(); };
    });
    for (const p of [0, 1]) {
      const col = $(`deck-col-${p}`);
      col.querySelectorAll('.deck-btn').forEach(b => b.remove());
      for (const [key, d] of Object.entries(DECKS)) {
        const b = el('button', 'deck-btn' + (settings.factions[p] === key ? ' selected' : ''));
        const leader = CARDS[d.leader];
        b.innerHTML = `<b>${esc(d.name)}</b><br><span class="sub">Leader: ${esc(leader.name)} ${costHtml(leader.cost)} ${leader.atk}/${leader.def}</span>`;
        b.onclick = () => { settings.factions[p] = key; buildSetup(); };
        col.appendChild(b);
      }
    }
    $('startbtn').onclick = startGame;
  }

  function startGame() {
    G = E.newGame(settings.factions[0], settings.factions[1],
      { ai: [settings.mode === 'ai', false] });
    Object.assign(ui, { mode: 'idle', handIdx: null, targetCard: null, moveUid: null,
      respContext: null, directSel: new Set(), directInit: false,
      aiWaitingDefense: false, aiBusy: false, packsAwarded: false });
    $('setup').style.display = 'none';
    $('game').style.display = 'block';
    $('handwrap').style.display = 'block';
    renderAll();
    if (G.players[G.activePlayer].isAI) runAITurn();
    else if (settings.mode === 'hotseat') showPassOverlay();
  }

  function backToSetup() {
    G = null;
    $('game').style.display = 'none';
    $('handwrap').style.display = 'none';
    $('gameover').style.display = 'none';
    $('ordermodal').style.display = 'none';
    $('passoverlay').style.display = 'none';
    $('setup').style.display = 'block';
    buildSetup();
  }

  /* ---------- Rendering ---------- */

  function renderAll() {
    if (!G) return;
    renderPhasebar();
    renderStats(0); renderStats(1);
    renderBoard();
    renderHand();
    renderControls();
    renderAssignPanel();
    renderLog();
    if (G.winner !== null) showGameOver();
  }

  function phaseName() {
    if (G.phase === 'fight') {
      return 'Fight — ' + ({ move: 'movement step', assign: 'assign damage', direct: 'attack the player' }[G.fightStep] || 'combat');
    }
    return { main1: 'Main phase', main2: 'Second main phase' }[G.phase] || G.phase;
  }

  function renderPhasebar() {
    $('phasebar').innerHTML =
      `Turn ${G.turnCount} — <b>${E.playerName(G.activePlayer)}</b> — ${phaseName()}`;
  }

  function renderStats(p) {
    const pl = G.players[p];
    const box = $(`pstats-${p}`);
    box.className = '';
    const d = el('div', `pstats p${p + 1}` + (G.activePlayer === p ? ' active-turn' : ''));
    const leader = CARDS[pl.leaderId];
    const lcost = E.leaderCost(G, p);
    d.appendChild(el('span', 'pname', `${E.playerName(p)}${pl.isAI ? ' (AI)' : ''}`));
    d.appendChild(el('span', 'life', `♥ ${Math.max(0, pl.life)}`));
    d.appendChild(el('span', 'stat', `Deck ${pl.deck.length} · Hand ${pl.hand.length} · Discard ${pl.discard.length}`));
    const chips = el('span', 'energy-chips');
    const colors = { F: 'var(--fire)', W: 'var(--water)', N: 'var(--nature)', E: 'var(--earth)', L: 'var(--light)', D: 'var(--dark)', ANY: 'var(--void)' };
    for (const e of pl.energy) {
      const c = el('span', 'echip' + (e.tapped ? ' tapped' : ''));
      c.style.background = colors[e.provides] || '#888';
      c.title = CARDS[e.cardId].name + (e.tapped ? ' (tapped)' : '');
      chips.appendChild(c);
    }
    d.appendChild(chips);
    const lbtn = el('button', 'leader-chip' + (pl.leaderInPlay ? ' inplay' : ''));
    lbtn.innerHTML = pl.leaderInPlay
      ? `★ ${esc(leader.name)} — in play`
      : `★ ${esc(leader.name)} ${costHtml(lcost)} ${leader.atk}/${leader.def}`;
    lbtn.title = pl.leaderInPlay ? '' : `Cast your Leader (cast #${pl.leaderCasts + 1})`;
    if (!pl.leaderInPlay && isHuman(p) && p === G.activePlayer && myTurn() && inMain() && E.canPay(G, p, lcost)) {
      lbtn.onclick = () => {
        ui.mode = 'deployLeader'; ui.handIdx = null;
        banner(`Choose a deployment row for ${leader.name} (Esc to cancel).`, true);
        renderAll();
      };
    } else { lbtn.disabled = pl.leaderInPlay; }
    d.appendChild(lbtn);
    for (const id of pl.locations) {
      d.appendChild(el('span', 'loc-chip', `⌂ ${esc(CARDS[id].name)}: ${esc(CARDS[id].text)}`));
    }
    box.appendChild(d);
    box.replaceChildren(d);
  }

  function unitChip(u) {
    const p = u.owner;
    const chip = el('div', `unit p${p + 1}`);
    const ea = E.effAtk(G, u), ed = E.effDef(G, u), rd = E.remainingDef(G, u);
    let name = `${u.isLeader ? '<span class="star">★</span> ' : ''}${esc(u.name)}`;
    chip.appendChild(el('div', 'uname', name));
    const stats = el('div', 'stats');
    stats.appendChild(el('span', 'atk', `⚔${ea}`));
    stats.appendChild(el('span', 'defn' + (u.damage > 0 ? ' hurt' : ''), `⛨${rd}/${ed}`));
    if (u.keywords.length) stats.appendChild(el('span', 'kw', u.keywords.join(' ')));
    chip.appendChild(stats);
    if (u.augments.length) {
      chip.appendChild(el('div', 'augs', u.augments.map(a => '+' + esc(CARDS[a].name)).join(' ')));
    }
    chip.title = `${u.name} — ${ea} attack / ${rd} of ${ed} defense` +
      (u.enteredTurn === G.turnCount ? ' (entered this turn)' : '');

    // Targeting mode
    if (ui.mode === 'target' && ui.targetCard) {
      const caster = ui.respContext ? ui.respContext.player : viewPlayer();
      const t = ui.targetCard.target;
      const ok = t === 'anyUnit' || (t === 'ownUnit' && u.owner === caster) || (t === 'enemyUnit' && u.owner !== caster);
      if (ok) {
        chip.classList.add('selectable');
        chip.onclick = () => completeTarget(u.uid);
        return chip;
      }
    }
    // Movement step
    if (G.phase === 'fight' && G.fightStep === 'move' && myTurn() && u.owner === G.activePlayer) {
      if (G.movedThisFight.includes(u.uid)) chip.classList.add('moved');
      const rows = E.legalMoveRows(G, u);
      if (rows.length > 0) {
        chip.classList.add('selectable');
        if (ui.moveUid === u.uid) chip.classList.add('selected');
        chip.onclick = () => {
          ui.moveUid = ui.moveUid === u.uid ? null : u.uid;
          renderAll();
        };
      }
    }
    // Direct-attack step: checkbox on eligible units
    if (G.phase === 'fight' && G.fightStep === 'direct' && myTurn() && G.directEligible.includes(u.uid)) {
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = ui.directSel.has(u.uid);
      cb.onclick = ev => {
        ev.stopPropagation();
        if (cb.checked) ui.directSel.add(u.uid); else ui.directSel.delete(u.uid);
        renderControls();
      };
      chip.appendChild(cb);
      chip.classList.add('selectable');
    }
    return chip;
  }

  function renderBoard() {
    const board = $('board');
    board.replaceChildren();
    const contested = E.contestedRows(G);
    const moveRows = ui.moveUid ? E.legalMoveRows(G, E.unit(G, ui.moveUid)) : [];
    for (let r = 0; r < 5; r++) {
      const row = el('div', 'row' + (contested.includes(r) ? ' contested' : ''));
      const labels = [];
      if (r === 0) labels.push("Player One's home row");
      if (r === 4) labels.push("Player Two's home row");
      if (r === 2) labels.push('contested middle');
      const lab = el('div', 'row-label');
      lab.appendChild(el('div', 'num', `Row ${r + 1}`));
      if (labels.length) lab.appendChild(el('div', '', labels.join(' ')));
      row.appendChild(lab);
      const units = el('div', 'row-units');
      for (const u of E.sideInRow(G, r, 0)) units.appendChild(unitChip(u));
      units.appendChild(el('div', 'spacer'));
      for (const u of E.sideInRow(G, r, 1)) units.appendChild(unitChip(u));
      row.appendChild(units);

      let highlight = false;
      if ((ui.mode === 'deploy' || ui.mode === 'deployLeader') &&
          E.deployRows(viewPlayer()).includes(r)) highlight = true;
      if (ui.mode === 'target' && ui.targetCard && ui.targetCard.target === 'row') highlight = true;
      if (ui.moveUid && moveRows.includes(r)) highlight = true;
      if (highlight) {
        row.classList.add('highlight');
        row.onclick = () => clickRow(r);
      }
      board.appendChild(row);
    }
  }

  function clickRow(r) {
    const p = viewPlayer();
    if (ui.mode === 'target' && ui.targetCard && ui.targetCard.target === 'row') {
      completeRowTarget(r);
      return;
    }
    if (ui.mode === 'deploy' && ui.handIdx !== null) {
      const res = E.playCard(G, p, ui.handIdx, { row: r });
      if (!res.ok) { banner(res.err); return; }
      ui.mode = 'idle'; ui.handIdx = null; clearBanner();
      renderAll();
    } else if (ui.mode === 'deployLeader') {
      const res = E.castLeader(G, p, r);
      if (!res.ok) { banner(res.err); return; }
      ui.mode = 'idle'; clearBanner();
      renderAll();
    } else if (ui.moveUid) {
      const res = E.moveUnit(G, ui.moveUid, r);
      if (!res.ok) { banner(res.err); return; }
      ui.moveUid = null;
      renderAll();
    }
  }

  /* ---------- Hand ---------- */

  function cardPlayable(p, c) {
    if (G.winner !== null || !isHuman(p)) return false;
    if (c.type === 'spell') {
      // Own turn: main phases, or fight before combat resolves.
      if (!myTurn() || G.activePlayer !== p) return false;
      const okPhase = inMain() || (G.phase === 'fight' && (G.fightStep === 'move' || G.fightStep === 'assign'));
      return okPhase && E.spellPlayable(G, p, c);
    }
    if (G.activePlayer !== p || !myTurn() || !inMain()) return false;
    if (c.type === 'energy') return !G.energyPlayed;
    return E.canPay(G, p, c.cost);
  }

  function renderHand() {
    const p = viewPlayer();
    const pl = G.players[p];
    $('hand-owner').textContent =
      `${E.playerName(p)}'s hand (${pl.hand.length})${settings.mode === 'hotseat' ? ' — hotseat: only the active player should look' : ''}`;
    const hand = $('hand');
    hand.replaceChildren();
    pl.hand.forEach((id, i) => {
      const c = CARDS[id];
      const playable = cardPlayable(p, c);
      const d = cardFace(c, {
        extraClass: (playable ? '' : 'unplayable') +
          (ui.handIdx === i && ui.mode !== 'idle' ? ' selected' : ''),
      });
      if (playable) d.onclick = () => clickHandCard(p, i, c);
      hand.appendChild(d);
    });
  }

  function clickHandCard(p, i, c) {
    if (c.type === 'energy') {
      const res = E.playEnergy(G, p, i);
      if (!res.ok) banner(res.err);
      renderAll();
      return;
    }
    if (c.type === 'unit') {
      ui.mode = 'deploy'; ui.handIdx = i;
      banner(`Choose a deployment row for ${c.name} (Esc to cancel).`, true);
      renderAll();
      return;
    }
    if (c.type === 'location') {
      const res = E.playCard(G, p, i, {});
      if (!res.ok) banner(res.err);
      renderAll();
      return;
    }
    if (c.type === 'augment' || (c.type === 'action' && c.target)) {
      ui.mode = 'target'; ui.handIdx = i; ui.targetCard = c;
      banner(`Choose a target for ${c.name} (Esc to cancel).`, true);
      renderAll();
      return;
    }
    if (c.type === 'action') {
      const res = E.playCard(G, p, i, {});
      if (!res.ok) banner(res.err);
      renderAll();
      return;
    }
    if (c.type === 'spell') {
      if (!c.target) { castAndRunOrder(p, i, {}); return; }
      if (c.target === 'order') { banner('That spell can only respond to the Order.'); return; }
      ui.mode = 'target'; ui.handIdx = i; ui.targetCard = c;
      banner(`Choose a target for ${c.name} (Esc to cancel).`, true);
      renderAll();
    }
  }

  function completeTarget(uid) {
    const c = ui.targetCard;
    const i = ui.handIdx;
    clearBanner();
    if (ui.respContext) {
      const { player, handIdx } = ui.respContext;
      ui.mode = 'idle'; ui.handIdx = null; ui.targetCard = null; ui.respContext = null;
      const res = E.castSpell(G, player, handIdx, { uid });
      if (!res.ok) { banner(res.err); showOrderModal(player); return; }
      renderAll();
      runOrderLoop();
      return;
    }
    ui.mode = 'idle'; ui.handIdx = null; ui.targetCard = null;
    const p = viewPlayer();
    let res;
    if (c.type === 'spell') { castAndRunOrder(p, i, { uid }); return; }
    if (c.type === 'augment') res = E.playCard(G, p, i, { targetUid: uid });
    else res = E.playCard(G, p, i, { targets: { uid } });
    if (!res.ok) banner(res.err);
    renderAll();
  }

  function completeRowTarget(row) {
    const c = ui.targetCard;
    const i = ui.handIdx;
    clearBanner();
    if (ui.respContext) {
      const { player, handIdx } = ui.respContext;
      ui.mode = 'idle'; ui.handIdx = null; ui.targetCard = null; ui.respContext = null;
      const res = E.castSpell(G, player, handIdx, { row });
      if (!res.ok) { banner(res.err); showOrderModal(player); return; }
      renderAll();
      runOrderLoop();
      return;
    }
    ui.mode = 'idle'; ui.handIdx = null; ui.targetCard = null;
    const p = viewPlayer();
    if (c.type === 'spell') { castAndRunOrder(p, i, { row }); return; }
    const res = E.playCard(G, p, i, { targets: { row } });
    if (!res.ok) banner(res.err);
    renderAll();
  }

  /* ---------- The Order ---------- */

  function castAndRunOrder(p, handIdx, targets) {
    const res = E.castSpell(G, p, handIdx, targets);
    if (!res.ok) { banner(res.err); renderAll(); return; }
    renderAll();
    runOrderLoop();
  }

  function runOrderLoop() {
    if (G.order.length === 0) { renderAll(); return; }
    const last = G.order[G.order.length - 1];
    const responder = E.other(last.controller);
    const canRespond = isHuman(responder) &&
      G.players[responder].hand.some(id => E.spellPlayable(G, responder, CARDS[id]));
    if (!canRespond) { finishOrder(); return; }
    showOrderModal(responder);
  }

  function finishOrder() {
    $('ordermodal').style.display = 'none';
    E.resolveOrder(G);
    renderAll();
  }

  function showOrderModal(responder) {
    const modal = $('ordermodal');
    modal.style.display = 'flex';
    const stack = $('orderstack');
    stack.replaceChildren();
    // Top of the Order shown first (resolves first).
    [...G.order].reverse().forEach((item, ri) => {
      const idx = G.order.length - 1 - ri;
      const c = CARDS[item.cardId];
      const d = el('div', 'order-item' + (item.countered ? ' countered' : ''));
      d.innerHTML = `<b>${esc(c.name)}</b> — ${E.playerName(item.controller)}` +
        `<div class="oi-sub">${esc(c.text)}${ri === 0 ? ' · resolves first' : ''}</div>`;
      d.dataset.orderIdx = idx;
      stack.appendChild(d);
    });
    $('orderprompt').innerHTML =
      `<b>${E.playerName(responder)}</b>, respond with a spell or pass. (Last in, first out.)`;
    const list = $('resplist');
    list.replaceChildren();
    G.players[responder].hand.forEach((id, i) => {
      const c = CARDS[id];
      if (!E.spellPlayable(G, responder, c)) return;
      const b = el('button', '', `${esc(c.name)} ${costHtml(c.cost)}`);
      b.title = c.text;
      b.onclick = () => respondWith(responder, i, c);
      list.appendChild(b);
    });
    $('orderpass').onclick = finishOrder;
  }

  function respondWith(responder, handIdx, c) {
    if (c.target === 'order') {
      // Pick a spell on the Order to counter.
      $('orderprompt').innerHTML = `<b>${esc(c.name)}</b>: choose a spell on the Order to counter.`;
      document.querySelectorAll('#orderstack .order-item').forEach(d => {
        const idx = +d.dataset.orderIdx;
        if (G.order[idx] && !G.order[idx].countered) {
          d.classList.add('targetable');
          d.onclick = () => {
            const res = E.castSpell(G, responder, handIdx, { orderIdx: idx });
            if (!res.ok) { banner(res.err); showOrderModal(responder); return; }
            renderAll();
            runOrderLoop();
          };
        }
      });
      return;
    }
    if (!c.target) {
      const res = E.castSpell(G, responder, handIdx, {});
      if (!res.ok) { banner(res.err); return; }
      renderAll();
      runOrderLoop();
      return;
    }
    // Needs a board target: hide the modal and pick on the board.
    $('ordermodal').style.display = 'none';
    ui.mode = 'target'; ui.targetCard = c; ui.handIdx = handIdx;
    ui.respContext = { player: responder, handIdx };
    banner(`${E.playerName(responder)}: choose a target for ${c.name} (Esc to cancel).`, true);
    renderAll();
  }

  /* ---------- Controls / phases ---------- */

  function ctrlButton(label, fn, primary) {
    const b = el('button', primary ? 'primary' : '', label);
    b.onclick = fn;
    return b;
  }

  function renderControls() {
    const c = $('controls');
    c.replaceChildren();
    if (G.winner !== null) return;
    if (ui.aiBusy && !ui.aiWaitingDefense) {
      c.appendChild(el('span', '', 'AI is taking its turn…'));
      return;
    }
    if (ui.aiWaitingDefense) {
      c.appendChild(ctrlButton('Auto-assign my damage', () => { E.autoAssignFor(G, 1); renderAll(); }));
      c.appendChild(ctrlButton('Resolve Combat', onResolveCombat, true));
      return;
    }
    if (!myTurn()) return;
    if (G.phase === 'main1') {
      c.appendChild(ctrlButton('To Fight Phase ⚔', () => { E.beginFight(G); renderAll(); }, true));
    } else if (G.phase === 'fight' && G.fightStep === 'move') {
      c.appendChild(ctrlButton('Done Moving', () => {
        ui.moveUid = null;
        E.finishMoves(G);
        ui.directInit = false;
        renderAll();
      }, true));
    } else if (G.phase === 'fight' && G.fightStep === 'assign') {
      for (const p of humanPlayers()) {
        if (E.contestedRows(G).some(r => E.sideInRow(G, r, p).some(u => E.effAtk(G, u) > 0))) {
          c.appendChild(ctrlButton(`Auto-assign ${E.playerName(p)}`, () => { E.autoAssignFor(G, p); renderAll(); }));
        }
      }
      c.appendChild(ctrlButton('Resolve Combat', onResolveCombat, true));
    } else if (G.phase === 'fight' && G.fightStep === 'direct') {
      if (!ui.directInit) {
        ui.directSel = new Set(G.directEligible);
        ui.directInit = true;
      }
      let total = 0;
      for (const uid of ui.directSel) {
        const u = E.unit(G, uid);
        if (u) total += E.effAtk(G, u);
      }
      c.appendChild(ctrlButton(`Attack Player (${total} damage)`, () => {
        E.doDirectAttacks(G, [...ui.directSel]);
        ui.directInit = false;
        renderAll();
      }, true));
      c.appendChild(ctrlButton('Skip', () => {
        E.doDirectAttacks(G, []);
        ui.directInit = false;
        renderAll();
      }));
    } else if (G.phase === 'main2') {
      c.appendChild(ctrlButton('End Turn ⏭', onEndTurn, true));
    }
  }

  function onResolveCombat() {
    const res = E.resolveCombat(G);
    if (!res.ok) { banner(res.err); return; }
    ui.directInit = false;
    renderAll();
    if (ui.aiWaitingDefense) {
      ui.aiWaitingDefense = false;
      continueAITurn();
    }
  }

  function onEndTurn() {
    E.endTurn(G);
    ui.directInit = false;
    renderAll();
    if (G.winner !== null) return;
    if (G.players[G.activePlayer].isAI) runAITurn();
    else if (settings.mode === 'hotseat') showPassOverlay();
  }

  /* ---------- Assignment panel ---------- */

  function renderAssignPanel() {
    const panel = $('assignpanel');
    const inAssign = G.phase === 'fight' && G.fightStep === 'assign' && (myTurn() || ui.aiWaitingDefense);
    if (!inAssign) { panel.style.display = 'none'; panel.replaceChildren(); return; }
    panel.style.display = 'block';
    panel.replaceChildren();
    panel.appendChild(el('h3', '', 'Assign combat damage — all damage resolves simultaneously'));
    const editable = humanPlayers();
    for (const r of E.contestedRows(G)) {
      const rowBox = el('div', 'assign-row');
      rowBox.appendChild(el('h4', '', `Row ${r + 1}`));
      for (const p of [0, 1]) {
        for (const u of E.sideInRow(G, r, p)) {
          if (E.effAtk(G, u) === 0) continue;
          const line = el('div', 'assign-unit');
          const foes = E.sideInRow(G, r, E.other(p));
          const map = G.assign[u.uid] || (G.assign[u.uid] = {});
          const assigned = Object.values(map).reduce((a, b) => a + b, 0);
          line.appendChild(el('span', 'who',
            `${esc(u.name)} (${E.playerName(p)}) — ⚔${E.effAtk(G, u)}, assigned ${assigned}`));
          if (!editable.includes(p)) {
            line.appendChild(el('span', 'stat', 'AI assigns automatically'));
          } else {
            for (const f of foes) {
              const t = el('span', 'assign-target');
              t.appendChild(el('span', '', `${esc(f.name)} ⛨${E.remainingDef(G, f)}`));
              const minus = el('button', '', '−');
              const amt = el('span', 'amt', String(map[f.uid] || 0));
              const plus = el('button', '', '+');
              minus.onclick = () => {
                if ((map[f.uid] || 0) > 0) { map[f.uid]--; renderAll(); }
              };
              plus.onclick = () => {
                const total = Object.values(map).reduce((a, b) => a + b, 0);
                if (total < E.effAtk(G, u)) { map[f.uid] = (map[f.uid] || 0) + 1; renderAll(); }
              };
              t.appendChild(minus); t.appendChild(amt); t.appendChild(plus);
              line.appendChild(t);
            }
          }
          rowBox.appendChild(line);
        }
      }
      panel.appendChild(rowBox);
    }
    panel.appendChild(el('div', 'stat',
      'Guard: while a Guard unit stands in the row, enemies must assign it lethal damage before striking others. Unassigned damage is distributed automatically on resolve.'));
  }

  /* ---------- Log ---------- */

  function renderLog() {
    const box = $('log');
    box.replaceChildren();
    for (const entry of G.log.slice(-120)) {
      const d = el('div', entry.msg.startsWith('—') ? 'turnmark' : '', esc(entry.msg));
      box.appendChild(d);
    }
    box.parentElement.scrollTop = box.parentElement.scrollHeight;
  }

  /* ---------- AI turn ---------- */

  async function runAITurn() {
    ui.aiBusy = true;
    renderAll();
    await sleep(500);
    if (!G || G.winner !== null) { ui.aiBusy = false; renderAll(); return; }
    AI.mainPhase(G, G.activePlayer);
    renderAll();
    await sleep(600);
    if (!G || G.winner !== null) { ui.aiBusy = false; renderAll(); return; }
    const needHuman = AI.fightUntilAssign(G, G.activePlayer);
    renderAll();
    if (needHuman) {
      ui.aiWaitingDefense = true;
      banner('Defend! Assign your units’ combat damage, then Resolve Combat.', true);
      renderAll();
      return;
    }
    continueAITurn();
  }

  async function continueAITurn() {
    clearBanner();
    const p = G.activePlayer;
    AI.finishFight(G, p);
    renderAll();
    await sleep(600);
    if (!G || G.winner !== null) { ui.aiBusy = false; renderAll(); return; }
    AI.mainPhase(G, p);           // second main phase
    E.endTurn(G);
    ui.aiBusy = false;
    renderAll();
  }

  /* ---------- Overlays ---------- */

  function showPassOverlay() {
    $('passmsg').textContent = `${E.playerName(G.activePlayer)} — your turn`;
    $('passoverlay').style.display = 'flex';
  }
  $('passcontinue').onclick = () => { $('passoverlay').style.display = 'none'; renderAll(); };

  function showGameOver() {
    if (!ui.packsAwarded) {
      ui.packsAwarded = true;
      collection.packs += 2;
      saveCollection();
    }
    $('gameovermsg').textContent = `${E.playerName(G.winner)} rules the board!`;
    $('gameoversub').textContent =
      `Victory: ${G.winReason}. The caste system trembles. +2 booster packs earned — open them from the main menu.`;
    $('gameover').style.display = 'flex';
  }
  $('rematch').onclick = backToSetup;
  $('concede').onclick = () => {
    if (confirm('Abandon this game and return to setup?')) backToSetup();
  };

  document.addEventListener('keydown', ev => {
    if (ev.key === 'Escape' && G) {
      if (ui.mode !== 'idle' || ui.moveUid) cancelMode();
    }
  });

  buildSetup();
})();
