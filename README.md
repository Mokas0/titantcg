# Titanrule — Simulator

A playable web simulator for **Titanrule**, a two-player trading card game set in a world
governed by a rigid caste system — and played by the people trying to break it.
Implements the comprehensive rules draft **v0.1** (see [RULES.md](RULES.md)).

## Play it

Three modes:

- **Hotseat** — two players sharing one screen (a pass-device overlay separates turns).
- **Solo** — you play Player Two against a simple AI running Player One.
- **Online** — play a friend over the internet with a 4-letter room code (requires the
  server, below).

For hotseat and solo, no server is needed: open `index.html` directly, or serve the folder
statically (`python3 -m http.server`).

For online play, run the Node server (it also serves the client):

```
npm install
npm start        # http://localhost:3000
```

One player picks a deck and clicks **Create room**, the other enters the room code and
clicks **Join room**. The host is Player One and goes first.

### Deploy to Railway

The repo is ready for [Railway](https://railway.app):

1. Push this repo to GitHub and create a new Railway project from it (or run `railway up`
   with the Railway CLI from this folder).
2. That's it — `railway.json` and `package.json` tell Railway to build with Nixpacks and
   run `npm start`; the server binds to Railway's `PORT` automatically and WebSockets work
   over the generated `https://…up.railway.app` domain out of the box.
3. Share the URL; both players open it and use a room code to play.

The server (`server.js`) is a small room-code relay: the game runs in the two clients as
replicated state with one writer at a time, and the server just matches players and
forwards state. There is no persistence and no account system — a room lives as long as
both sockets do.

## Decks

Sixteen prebuilt decks are generated from the card pool, one per Leader:

- **Six mono-faction decks** (54 cards: commons ×3, uncommons ×2, rares ×1, one titan) for
  Karvex, Maris, Vharn, Dornath, Seraphel, and Morvane — plus **three alternate mono
  Leaders** (Cindra of Fire, Tidelord Mirren of Water, Oakfather Bramm of Nature) running
  the same pools with different Leader stats and costs.
- **Six dual-faction decks** (50 cards drawing on both factions plus a signature dual-cost
  rare): Fire/Dark, Fire/Nature, Water/Light, Water/Dark, Earth/Light, and Earth/Nature.
- **The Hollow Crown** — a Void Leader whose identity holds no energy type: an all-Void
  44-card deck powered entirely by Void Rifts, leaning on the "any number of copies" rule.

## Rarities, packs, and your collection

The pool holds **146 collectible cards** across four rarities — **common**, **uncommon**,
**rare**, and **titan** (two colossal signature cards per faction, plus Entropy for Void).
Rarity is shown as a colored edge and tag on every card.

The main menu has a **booster pack** opener: each pack holds 8 cards — 5 commons,
2 uncommons, and a rare slot with a 15% chance to upgrade to a titan. You start with
5 packs and earn 2 more every time you finish a game. Your collection is saved in the
browser (localStorage) and can be browsed per faction from the menu.

### Dust

Duplicates aren't dead weight: every card in the collection view has **Dust** (disenchant)
and **Craft** buttons, and a one-click button disenchants every copy beyond the 3 you can
run. Rates per rarity:

| Rarity | Disenchant | Craft |
| --- | --- | --- |
| Common | ✦ 5 | ✦ 40 |
| Uncommon | ✦ 20 | ✦ 100 |
| Rare | ✦ 100 | ✦ 400 |
| Titan | ✦ 400 | ✦ 1600 |

Your dust balance shows in the menu and persists with the collection — open packs, dust
the extras, craft the exact cards your deck is missing.

## Deck builder

Pack pulls are playable: the **Deck Builder** (main menu) builds custom decks from your
collection. Pick any Leader — the collection view filters to cards inside that Leader's
faction identity — then click cards to add them and deck entries to remove them.
Validation is live and enforces the construction rules from RULES.md:

- 40–60 cards; basic energy is unlimited (Void Rift capped at 3), and **Auto-fill
  energy** tops the deck up to 40 with basics matching your Leader's identity;
- every energy symbol in a card's cost must appear in the Leader's identity;
- 3 copies max per card (1 for uniques) — except Void cards, which allow any number;
- you can't run more copies of a collectible than you own.

Saved decks persist in localStorage and appear in deck selection for **every mode** —
hotseat, solo vs AI, and online. Online play sends the full deck list with the room
handshake, so your opponent doesn't need your deck to exist on their machine.

## How a turn plays

1. **Preparation / Draw** happen automatically at the start of your turn.
2. **Main phase** — click an energy card to play it (one per turn), click a unit and then a
   highlighted row to deploy it, click your Leader chip to cast it (recasts cost +2 generic
   each time), play actions/augments/locations, or cast spells onto **the Order**.
3. **Fight phase**
   - *Movement step* — click one of your units, then a highlighted row. Units move up to
     **2 rows** per turn (Swift units 3). Units in a contested row cannot advance; moving
     into an enemy-occupied row ends that unit's movement.
   - *Assign damage* — split each unit's attack among enemies in its row (Guard units must
     be assigned lethal damage first). Anything left unassigned is distributed automatically.
     All damage resolves simultaneously; damage is persistent.
   - *Attack the player* — units standing uncontested on the enemy home row that did not
     fight may strike the enemy player directly.
4. **Second main phase**, then **End turn** (temporary effects expire).

Spells go on the Order: the opponent may respond, and the stack resolves last-in-first-out
(try Water's *Dispel* to counter a spell mid-Order).

Win by reducing the enemy from 25 life to 0 — or by decking them out.

## Repository layout

| Path | Purpose |
| --- | --- |
| `index.html`, `styles.css` | Page shell and theme |
| `server.js`, `railway.json` | Multiplayer room server (Node + ws) and Railway config |
| `js/cards.js` | Card database and generated deck lists |
| `js/engine.js` | Pure rules engine (no DOM) — zones, energy, the Order, movement, combat |
| `js/ai.js` | Heuristic AI opponent |
| `js/net.js` | WebSocket client for online play |
| `js/ui.js` | Interactive layer: board, hand, fight-phase flow, Order modal, packs |
| `test/sim.js` | Headless smoke test: `npm test` runs AI-vs-AI across all 256 deck pairings |
| `RULES.md` | Comprehensive rules draft v0.1 with locked rulings |

## Known v0.1 simplifications

- Spells can be cast on your own turn at any time, but on the opponent's turn only as
  responses on the Order (full priority passing is not yet modeled).
- The AI never responds on the Order, and its own spells resolve without offering you a
  response window.
- No mulligan rule yet (the draft leaves it open).
- Hotseat trusts players not to peek at the inactive hand.
- Online play replicates the full game state to both clients, so a determined opponent
  could read your hand from the browser console — fine among friends, not tournament-grade.
- Online combat assignment is sequential: the attacker assigns (or hands over), then the
  defender assigns and resolves. Disconnects end the game; there is no reconnect yet.
