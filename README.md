# Titanrule — Simulator

A playable web simulator for **Titanrule**, a two-player trading card game set in a world
governed by a rigid caste system — and played by the people trying to break it.
Implements the comprehensive rules draft **v0.1** (see [RULES.md](RULES.md)).

## Play it

No build step, no dependencies. Either:

- open `index.html` directly in a browser, or
- serve the folder: `python3 -m http.server` then visit `http://localhost:8000`.

Two modes:

- **Hotseat** — two players sharing one screen (a pass-device overlay separates turns).
- **Solo** — you play Player Two against a simple AI running Player One.

Six prebuilt 40-card mono-faction decks are included (Fire, Water, Nature, Earth, Light,
Dark), each with its own Leader, plus a Void Rift energy in every deck.

## How a turn plays

1. **Preparation / Draw** happen automatically at the start of your turn.
2. **Main phase** — click an energy card to play it (one per turn), click a unit and then a
   highlighted row to deploy it, click your Leader chip to cast it (recasts cost +2 generic
   each time), play actions/augments/locations, or cast spells onto **the Order**.
3. **Fight phase**
   - *Movement step* — click one of your units, then a highlighted row. Units in a contested
     row cannot advance; moving into an enemy-occupied row ends that unit's movement.
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
| `js/cards.js` | Card database and prebuilt deck lists |
| `js/engine.js` | Pure rules engine (no DOM) — zones, energy, the Order, movement, combat |
| `js/ai.js` | Heuristic AI opponent |
| `js/ui.js` | Interactive layer: board, hand, fight-phase flow, Order modal |
| `test/sim.js` | Headless smoke test: `node test/sim.js` runs AI-vs-AI across all 36 faction pairings |
| `RULES.md` | Comprehensive rules draft v0.1 with locked rulings |

## Known v0.1 simplifications

- Spells can be cast on your own turn at any time, but on the opponent's turn only as
  responses on the Order (full priority passing is not yet modeled).
- The AI never responds on the Order, and its own spells resolve without offering you a
  response window.
- No mulligan rule yet (the draft leaves it open).
- Hotseat trusts players not to peek at the inactive hand.
