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

  function online() { return settings.mode === 'online'; }
  function mySeat() { return globalThis.Net.seat; }
  /* Broadcast the game state after a local mutation (online mode only). */
  function sync() { if (online() && globalThis.Net.connected) globalThis.Net.sendState(G); }

  function humanPlayers() {
    if (online()) return [mySeat()];
    return settings.mode === 'ai' ? [1] : [0, 1];
  }
  function isHuman(p) { return humanPlayers().includes(p); }
  /* Whose hand is on screen. */
  function viewPlayer() {
    if (online()) return mySeat();
    if (ui.respContext) return ui.respContext.player;
    if (settings.mode === 'ai') return 1;
    return G.activePlayer;
  }
  /* Who currently drives the assign-damage step (online handoff). */
  function assignActor() {
    return G.mpStage === 'defender' ? E.other(G.activePlayer) : G.activePlayer;
  }
  function myTurn() {
    if (online()) {
      return G.activePlayer === mySeat() && G.order.length === 0 &&
        !(G.phase === 'fight' && G.fightStep === 'assign' && G.mpStage === 'defender');
    }
    return G.activePlayer === viewPlayer() && !ui.aiBusy && !ui.aiWaitingDefense;
  }
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

  /* ---------- Custom decks & the deck builder ---------- */

  const DECKSTORE_KEY = 'titanrule.decks.v1';
  function loadCustomDecks() {
    try {
      const d = JSON.parse(localStorage.getItem(DECKSTORE_KEY));
      if (Array.isArray(d)) return d;
    } catch (e) { /* first run */ }
    return [];
  }
  const customDecks = loadCustomDecks();
  function saveCustomDecks() {
    try { localStorage.setItem(DECKSTORE_KEY, JSON.stringify(customDecks)); } catch (e) { /* ok */ }
  }

  /* Resolve a deck-selection key ('fire' or 'custom:<id>') to a spec the
   * engine accepts: {name, leader, cards: [[id, n], ...]}. */
  function resolveDeckKey(key) {
    if (String(key).startsWith('custom:')) {
      const d = customDecks.find(x => 'custom:' + x.id === key);
      if (d) return { name: d.name, leader: d.leader, cards: Object.entries(d.cards) };
    }
    return DECKS[key] || DECKS.fire;
  }
  function deckKeyExists(key) {
    return String(key).startsWith('custom:')
      ? customDecks.some(x => 'custom:' + x.id === key)
      : key in DECKS;
  }

  const builder = { editingId: null, name: '', leader: 'leader_fire', cards: {} };
  const SYM_ENERGY = { F: 'energy_fire', W: 'energy_water', N: 'energy_nature',
                       E: 'energy_earth', L: 'energy_light', D: 'energy_dark' };
  const ENERGY_IDS = [...Object.values(SYM_ENERGY), 'energy_void'];

  function showBuilder() {
    $('setup').style.display = 'none';
    $('builder').style.display = 'block';
    loadBuilderDeck(customDecks.length > 0 ? customDecks[0].id : null);
  }
  function hideBuilder() {
    $('builder').style.display = 'none';
    $('setup').style.display = 'block';
    buildSetup();
  }

  function loadBuilderDeck(id) {
    const d = customDecks.find(x => x.id === id);
    if (d) {
      builder.editingId = d.id;
      builder.name = d.name;
      builder.leader = d.leader;
      builder.cards = { ...d.cards };
    } else {
      builder.editingId = null;
      builder.name = 'New deck';
      builder.leader = 'leader_fire';
      builder.cards = {};
    }
    $('b-savemsg').textContent = '';
    renderBuilder();
  }

  /* How many copies of a card the builder may still add. */
  function builderMax(c) {
    if (c.type === 'energy') return c.id === 'energy_void' ? 3 : Infinity;
    const syms = costSymbols(c);
    const ownedCap = collection.cards[c.id] || 0;
    if (syms.length === 0) return ownedCap;                       // Void: any number, but only what you own
    return Math.min(c.unique ? 1 : 3, ownedCap);
  }
  function legalForLeader(c) {
    const identity = costSymbols(CARDS[builder.leader]);
    return costSymbols(c).every(s => identity.includes(s));
  }

  function addToDeck(id) {
    const c = CARDS[id];
    const n = builder.cards[id] || 0;
    if (n >= builderMax(c)) return;
    builder.cards[id] = n + 1;
    renderBuilder();
  }
  function removeFromDeck(id) {
    if (!builder.cards[id]) return;
    builder.cards[id]--;
    if (builder.cards[id] === 0) delete builder.cards[id];
    renderBuilder();
  }

  function autoFillEnergy() {
    const identity = costSymbols(CARDS[builder.leader]);
    const pool = identity.length > 0
      ? identity.map(s => SYM_ENERGY[s])
      : Object.values(SYM_ENERGY);        // Void identity: any basic works
    let total = Object.values(builder.cards).reduce((a, b) => a + b, 0);
    let i = 0;
    while (total < 40) {
      const id = pool[i % pool.length];
      builder.cards[id] = (builder.cards[id] || 0) + 1;
      total++; i++;
    }
    renderBuilder();
  }

  function renderBuilder() {
    // Deck manager dropdown.
    const sel = $('b-deckselect');
    sel.replaceChildren();
    const optNew = el('option', '', 'New deck…');
    optNew.value = '';
    sel.appendChild(optNew);
    for (const d of customDecks) {
      const o = el('option', '', esc(d.name));
      o.value = d.id;
      if (d.id === builder.editingId) o.selected = true;
      sel.appendChild(o);
    }
    $('b-name').value = builder.name;

    // Leader picker.
    const lg = $('b-leaders');
    lg.replaceChildren();
    for (const c of Object.values(CARDS).filter(c => c.type === 'leader')) {
      const b = el('button', 'b-leader' + (builder.leader === c.id ? ' selected' : ''), esc(c.name));
      b.title = `${c.atk}/${c.def} — identity: ${costSymbols(c).join(', ') || 'Void (generic only)'}`;
      b.onclick = () => { builder.leader = c.id; renderBuilder(); };
      lg.appendChild(b);
    }

    // Stats + validation.
    const v = globalThis.TCG_VALIDATE_DECK(builder.leader, builder.cards, collection.cards);
    const energyCount = Object.entries(builder.cards)
      .filter(([id]) => CARDS[id].type === 'energy')
      .reduce((a, [, n]) => a + n, 0);
    $('b-stats').innerHTML = `<b>${v.total}</b> cards · ${energyCount} energy · 40–60 required`;
    const errBox = $('b-errors');
    errBox.replaceChildren();
    for (const err of v.errors) errBox.appendChild(el('div', '', esc(err)));
    $('b-save').disabled = !v.ok;

    // Deck list (energy first, then by cost).
    const list = $('b-decklist');
    list.replaceChildren();
    const entries = Object.entries(builder.cards).sort((a, b) => {
      const ca = CARDS[a[0]], cb = CARDS[b[0]];
      const ea = ca.type === 'energy' ? 0 : 1, eb = cb.type === 'energy' ? 0 : 1;
      return (ea - eb) || (E.costTotal(ca.cost) - E.costTotal(cb.cost)) || ca.name.localeCompare(cb.name);
    });
    for (const [id, n] of entries) {
      const c = CARDS[id];
      const row = el('div', 'b-entry');
      row.innerHTML = `<span class="n">${n}×</span><span style="flex:1">${esc(c.name)}</span>` +
        `<span class="rtag ${c.rarity}">${c.type === 'energy' ? 'energy' : esc(c.rarity)}</span><span class="rm">click to remove</span>`;
      row.onclick = () => removeFromDeck(id);
      list.appendChild(row);
    }

    // Collection grid: energy (always available) then owned, legal collectibles.
    const grid = $('b-collection');
    grid.replaceChildren();
    const showCard = (c, ownedLabel) => {
      const inDeck = builder.cards[c.id] || 0;
      const maxed = inDeck >= builderMax(c);
      const face = cardFace(c, { extraClass: maxed ? 'maxed' : '' });
      const badges = el('div', 'b-badges');
      badges.appendChild(el('span', 'own', ownedLabel));
      badges.appendChild(el('span', 'indeck', inDeck > 0 ? `in deck: ${inDeck}` : ''));
      face.appendChild(badges);
      if (!maxed) face.onclick = () => addToDeck(c.id);
      grid.appendChild(face);
    };
    for (const id of ENERGY_IDS) showCard(CARDS[id], id === 'energy_void' ? 'max 3' : 'unlimited');
    const owned = COLLECTIBLES
      .filter(id => (collection.cards[id] || 0) > 0 && legalForLeader(CARDS[id]))
      .sort((a, b) => {
        const ca = CARDS[a], cb = CARDS[b];
        return (RARITY_ORDER[cb.rarity] - RARITY_ORDER[ca.rarity]) ||
          (E.costTotal(ca.cost) - E.costTotal(cb.cost)) || ca.name.localeCompare(cb.name);
      });
    for (const id of owned) showCard(CARDS[id], `owned: ${collection.cards[id]}`);
    const hiddenCount = COLLECTIBLES.filter(id => (collection.cards[id] || 0) > 0 && !legalForLeader(CARDS[id])).length;
    $('b-collhint').textContent = hiddenCount > 0
      ? `(${hiddenCount} owned cards hidden — outside this Leader's identity)`
      : (owned.length === 0 ? '(open booster packs to collect playable cards)' : '');
  }

  function saveBuilderDeck() {
    const v = globalThis.TCG_VALIDATE_DECK(builder.leader, builder.cards, collection.cards);
    if (!v.ok) return;
    const name = builder.name.trim() || 'Unnamed deck';
    if (builder.editingId) {
      const d = customDecks.find(x => x.id === builder.editingId);
      Object.assign(d, { name, leader: builder.leader, cards: { ...builder.cards } });
    } else {
      const id = 'd' + Date.now().toString(36);
      customDecks.push({ id, name, leader: builder.leader, cards: { ...builder.cards } });
      builder.editingId = id;
    }
    saveCustomDecks();
    $('b-savemsg').textContent = `Saved — "${name}" is now available in deck selection.`;
    renderBuilder();
  }

  $('openbuilder').onclick = showBuilder;
  $('b-back').onclick = hideBuilder;
  $('b-deckselect').onchange = e => loadBuilderDeck(e.target.value || null);
  $('b-new').onclick = () => loadBuilderDeck(null);
  $('b-delete').onclick = () => {
    if (!builder.editingId) return;
    const d = customDecks.find(x => x.id === builder.editingId);
    if (!confirm(`Delete "${d.name}"?`)) return;
    customDecks.splice(customDecks.indexOf(d), 1);
    saveCustomDecks();
    loadBuilderDeck(customDecks.length > 0 ? customDecks[0].id : null);
  };
  $('b-name').oninput = e => { builder.name = e.target.value; };
  $('b-save').onclick = saveBuilderDeck;
  $('b-autoenergy').onclick = autoFillEnergy;

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
      if (b.dataset.mode === 'online' && !globalThis.Net.available) {
        b.disabled = true;
        b.textContent = 'Online — requires the server (npm start, or a Railway deploy)';
      } else {
        b.onclick = () => { settings.mode = b.dataset.mode; buildSetup(); };
      }
    });
    $('online-panel').style.display = online() ? 'flex' : 'none';
    $('deck-col-1').style.display = online() ? 'none' : 'block';
    $('deck-col-0').querySelector('h3').textContent = online() ? 'Your deck' : "Player One's deck";
    $('startbtn').style.display = online() ? 'none' : 'inline-block';
    const choices = [
      ...Object.entries(DECKS).map(([key, d]) => ({ key, d, custom: false })),
      ...customDecks.map(cd => ({
        key: 'custom:' + cd.id,
        d: { name: cd.name, leader: cd.leader },
        custom: true,
      })),
    ];
    for (const p of [0, 1]) {
      if (!deckKeyExists(settings.factions[p])) settings.factions[p] = 'fire';
      const col = $(`deck-col-${p}`);
      col.querySelectorAll('.deck-btn').forEach(b => b.remove());
      for (const { key, d, custom } of choices) {
        const b = el('button', 'deck-btn' + (settings.factions[p] === key ? ' selected' : ''));
        const leader = CARDS[d.leader];
        b.innerHTML = `<b>${esc(d.name)}</b>${custom ? ' <span class="custom-tag">custom</span>' : ''}` +
          `<br><span class="sub">Leader: ${esc(leader.name)} ${costHtml(leader.cost)} ${leader.atk}/${leader.def}</span>`;
        b.onclick = () => { settings.factions[p] = key; buildSetup(); };
        col.appendChild(b);
      }
    }
    $('startbtn').onclick = startGame;
  }

  /* ---------- Online lobby ---------- */

  function onlineStatus(msg) { $('online-status').textContent = msg; }

  function registerNetHandlers() {
    const Net = globalThis.Net;
    Net.on('created', msg => {
      onlineStatus(`Room ${msg.code} created — you are Player One. Waiting for your opponent…`);
    });
    Net.on('opponent_joined', msg => {
      // Host builds the game and broadcasts it.
      startOnlineGame(resolveDeckKey(settings.factions[0]), msg.guestDeck);
    });
    Net.on('joined', () => {
      onlineStatus('Joined — you are Player Two. Waiting for the host to start…');
    });
    Net.on('error', msg => { onlineStatus(msg.err); });
    Net.on('state', msg => onRemoteState(msg.g));
    Net.on('bye', () => {
      if (G && G.winner !== null) return; // game finished normally
      alert('Your opponent disconnected.');
      backToSetup();
    });
  }

  async function goOnline(action) {
    const Net = globalThis.Net;
    try {
      await Net.connect();
    } catch (e) {
      onlineStatus(e.message + ' Online play needs the Node server (npm start, or Railway).');
      return;
    }
    registerNetHandlers();
    const myDeck = resolveDeckKey(settings.factions[0]);
    if (action === 'create') {
      Net.create(myDeck);
    } else {
      const code = $('joincode').value.trim().toUpperCase();
      if (code.length !== 4) { onlineStatus('Enter the 4-letter room code.'); return; }
      Net.join(code, myDeck);
    }
  }

  function startOnlineGame(hostDeck, guestDeck) {
    G = E.newGame(hostDeck, guestDeck, {});
    resetUiState();
    ui.packsAwarded = false;
    enterGameScreen();
    renderAll();
    sync();
  }

  function onRemoteState(g) {
    G = g;
    const firstState = $('game').style.display !== 'block';
    if (firstState) ui.packsAwarded = false;
    resetUiState();
    enterGameScreen();
    $('ordermodal').style.display = 'none';
    renderAll();
    // If a spell is waiting on the Order and I'm the responder, open the modal.
    if (G.winner === null && G.order.length > 0) {
      const last = G.order[G.order.length - 1];
      if (E.other(last.controller) === mySeat()) showOrderModal(mySeat());
    }
  }

  function resetUiState() {
    Object.assign(ui, { mode: 'idle', handIdx: null, targetCard: null, moveUid: null,
      respContext: null, directSel: new Set(), directInit: false,
      aiWaitingDefense: false, aiBusy: false });
    clearBanner();
  }

  function enterGameScreen() {
    if ($('game').style.display !== 'block') {
      $('setup').style.display = 'none';
      $('game').style.display = 'block';
      $('handwrap').style.display = 'block';
    }
  }

  $('createroom').onclick = () => goOnline('create');
  $('joinroom').onclick = () => goOnline('join');

  function startGame() {
    G = E.newGame(resolveDeckKey(settings.factions[0]), resolveDeckKey(settings.factions[1]),
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
    globalThis.Net.close();
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
    const seat = online() ? ` · you are ${E.playerName(mySeat())}` : '';
    $('phasebar').innerHTML =
      `Turn ${G.turnCount} — <b>${E.playerName(G.activePlayer)}</b> — ${phaseName()}${seat}`;
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
      renderAll(); sync();
    } else if (ui.mode === 'deployLeader') {
      const res = E.castLeader(G, p, r);
      if (!res.ok) { banner(res.err); return; }
      ui.mode = 'idle'; clearBanner();
      renderAll(); sync();
    } else if (ui.moveUid) {
      const res = E.moveUnit(G, ui.moveUid, r);
      if (!res.ok) { banner(res.err); return; }
      ui.moveUid = null;
      renderAll(); sync();
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
      renderAll(); sync();
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
      renderAll(); sync();
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
      renderAll(); sync();
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
    renderAll(); sync();
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
    renderAll(); sync();
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
    if (online()) {
      const canRespond =
        G.players[responder].hand.some(id => E.spellPlayable(G, responder, CARDS[id]));
      if (!canRespond) { finishOrder(); return; }
      if (responder === mySeat()) { showOrderModal(responder); return; }
      // Remote player must respond: sync and wait for their state.
      renderAll(); sync();
      banner('Waiting for your opponent to respond on the Order…', true);
      return;
    }
    const canRespond = isHuman(responder) &&
      G.players[responder].hand.some(id => E.spellPlayable(G, responder, CARDS[id]));
    if (!canRespond) { finishOrder(); return; }
    showOrderModal(responder);
  }

  function finishOrder() {
    $('ordermodal').style.display = 'none';
    E.resolveOrder(G);
    renderAll(); sync();
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
    if (online()) {
      if (G.order.length > 0) {
        const last = G.order[G.order.length - 1];
        c.appendChild(el('span', '', E.other(last.controller) === mySeat()
          ? 'Respond on the Order…' : 'Waiting for opponent…'));
        return;
      }
      if (G.phase === 'fight' && G.fightStep === 'assign') {
        const me = mySeat();
        if (assignActor() === me) {
          c.appendChild(ctrlButton('Auto-assign my damage', () => { E.autoAssignFor(G, me); renderAll(); }));
          const defender = E.other(G.activePlayer);
          const defenderHasAttackers = E.contestedRows(G)
            .some(r => E.sideInRow(G, r, defender).some(u => E.effAtk(G, u) > 0));
          if (G.mpStage !== 'defender' && me === G.activePlayer && defenderHasAttackers) {
            c.appendChild(ctrlButton('Hand over to defender', () => {
              G.mpStage = 'defender';
              renderAll(); sync();
              banner('Waiting for the defender to assign their damage…', true);
            }, true));
          } else {
            c.appendChild(ctrlButton('Resolve Combat', onResolveCombat, true));
          }
        } else {
          c.appendChild(el('span', '', 'Waiting for opponent to assign combat damage…'));
        }
        return;
      }
      if (G.activePlayer !== mySeat()) {
        c.appendChild(el('span', '', "Opponent's turn…"));
        return;
      }
    }
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
      c.appendChild(ctrlButton('To Fight Phase ⚔', () => { E.beginFight(G); renderAll(); sync(); }, true));
    } else if (G.phase === 'fight' && G.fightStep === 'move') {
      c.appendChild(ctrlButton('Done Moving', () => {
        ui.moveUid = null;
        E.finishMoves(G);
        if (online() && G.fightStep === 'assign') G.mpStage = 'attacker';
        ui.directInit = false;
        renderAll(); sync();
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
        renderAll(); sync();
      }, true));
      c.appendChild(ctrlButton('Skip', () => {
        E.doDirectAttacks(G, []);
        ui.directInit = false;
        renderAll(); sync();
      }));
    } else if (G.phase === 'main2') {
      c.appendChild(ctrlButton('End Turn ⏭', onEndTurn, true));
    }
  }

  function onResolveCombat() {
    const res = E.resolveCombat(G);
    if (!res.ok) { banner(res.err); return; }
    delete G.mpStage;
    ui.directInit = false;
    clearBanner();
    renderAll(); sync();
    if (ui.aiWaitingDefense) {
      ui.aiWaitingDefense = false;
      continueAITurn();
    }
  }

  function onEndTurn() {
    E.endTurn(G);
    delete G.mpStage;
    ui.directInit = false;
    renderAll(); sync();
    if (G.winner !== null) return;
    if (!online() && G.players[G.activePlayer].isAI) runAITurn();
    else if (settings.mode === 'hotseat') showPassOverlay();
  }

  /* ---------- Assignment panel ---------- */

  function renderAssignPanel() {
    const panel = $('assignpanel');
    const inAssign = G.phase === 'fight' && G.fightStep === 'assign' &&
      (online() ? assignActor() === mySeat() : (myTurn() || ui.aiWaitingDefense));
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
            line.appendChild(el('span', 'stat',
              online() ? 'Assigned by your opponent' : 'AI assigns automatically'));
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
