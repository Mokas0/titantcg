# TITANRULE — Comprehensive Rules

**Draft v0.1** (with the designer's rulings on the open questions folded in; remaining open
questions are marked ⚑).

## 1. Overview

Titanrule is a two-player trading card game set in a world governed by a rigid caste
system — and played by the people trying to break it.

Each player builds a deck around a **Leader**, whose faction identity determines what that
deck may contain. Play unfolds across five shared rows stretching between the two players.
Units enter near their controller and must advance row by row through contested ground
before they can strike the enemy directly.

**Goal:** reduce your opponent's life from 25 to 0.

## 2. Deck Construction

| Rule | Value |
| --- | --- |
| Deck size | 40–60 cards |
| Leader | Exactly 1, kept outside the deck |
| Copy limit | 3 copies of any card |
| Unique cards | 1 copy only |
| Faction restriction | Every card must fall within the Leader's faction identity |

Faction identity is defined by the Leader's energy types. A card may only be included if
every energy symbol in its cost appears in the Leader's identity.

⚑ Open: does identity draw from energy symbols in the Leader's cost, its rules text, or
both? *(The simulator uses cost symbols only.)*

## 3. Energy

Energy is the resource that limits what you can play. There are six primary types, plus one
rare type.

| Type | Identity |
| --- | --- |
| Fire | Aggression and speed. Hasty units, immediate pressure. |
| Water | Control and synergy. Card draw and siege effects. |
| Nature | Ramp and mass. Abundant energy, large units. |
| Earth | Defense. Long-game synergy and combo assembly. |
| Light | Hierarchy. Going wide, rank-and-file structures. |
| Dark | Death and destruction. Removal and sacrifice. |
| Void | Rare and powerful. |

Energy cards are played to your energy row and tap for 1 energy of their type. Tapped
energy untaps during your preparation phase.

**Rulings:** one energy card may be played per turn. Unspent energy empties at end of
turn — it does not pool. Void cards are playable under any Leader and are exempt from the
copy limit (any number per deck); Void energy is simply rare in print.

## 4. The Board

The play space is five shared rows, numbered 1 through 5.

```
                     PLAYER ONE
        ┌──────────────────────────────────────┐
Row 1   │  ← Player One's home row             │
Row 2   │                                      │
Row 3   │  ← contested middle                  │
Row 4   │                                      │
Row 5   │  ← Player Two's home row             │
        └──────────────────────────────────────┘
                      PLAYER TWO
```

The player who takes the first turn is closest to row 1. Their opponent is closest to row 5.

- **Home row** — the row nearest to a given player (row 1 for Player One, row 5 for Player
  Two).
- **Deployment.** A unit enters play on either of the two rows closest to its controller.
  Player One deploys to rows 1 or 2; Player Two deploys to rows 4 or 5.
- **Reaching the enemy.** A unit may only attack a player while standing on that player's
  home row, unless an ability states otherwise.

Rows outside the board hold the other zones: your hand, deck, discard, energy row, and
command zone.

**Rulings:** locations sit off the board and affect the whole game. There is no limit to how
many units a single row can hold.

## 5. Card Types

| Type | Behaves like | Notes |
| --- | --- | --- |
| Unit | Creature | Has attack and defense. Occupies a row. Can move and fight. |
| Spell | Instant | Playable any time you hold priority. |
| Action | Sorcery | Playable only during your own main phases, with an empty Order. |
| Augment | Equipment / Aura | Attaches to a permanent. The card specifies what it may attach to. |
| Location | Enchantment | Persistent effect. Sits off-board. |
| Energy | Land | Taps for 1 energy of its type. |
| Leader | Commander | Begins in the command zone. See §9. |

**Unit stats.** Units have separate attack and defense numbers. A unit is destroyed when
its defense reaches 0.

## 6. Setup

1. Each player shuffles their deck and places their Leader face-up in their command zone.
2. Determine who goes first. That player is closest to row 1.
3. Each player draws an opening hand of **7 cards**.
4. Each player sets their life to 25.

⚑ Open: mulligan rule; whether the first player skips their first draw. *(The simulator has
no mulligan and both players draw on every turn, including the first.)*

## 7. Turn Structure

A turn proceeds through six phases in fixed order.

1. **Preparation Phase** — Untap all your tapped permanents. "At the beginning of your
   turn" triggers happen now.
2. **Draw Phase** — Draw one card.
3. **Main Phase** — Play energy cards, units, actions, augments, and locations.
4. **Fight Phase** — Movement is declared here, then combat resolves. See §8.
5. **Second Main Phase** — As the first main phase.
6. **End Step** — End-of-turn triggers resolve. Damage marked on units remains. Play passes
   to the opponent.

**Ruling:** movement is declared as a step at the start of the fight phase, not in the main
phase.

## 8. Movement and Combat

### Movement

Movement does not cost energy — **move** is a unit stat (default 2: up to two rows toward
or away from any edge; keywords may raise it, e.g. **Swift** grants 3). During the fight
phase's movement step, each unit the turn player controls may move once. A unit that
entered play this turn may not move unless it has an ability permitting it (e.g.
**Hasty**).

**Ruling — blocking:** enemy units block advancement unless an ability says otherwise. A
unit that shares a row with enemy units cannot advance (it may still retreat), and a moving
unit stops when it enters an enemy-occupied row.

Moving into a row occupied by enemy units does not trigger combat immediately. Combat is
resolved only during the fight phase's later steps.

⚑ Open: may a unit move and attack the player in the same turn? *(The simulator allows it.)*

### The Fight Phase

1. **Contested rows.** Any row containing units controlled by both players is a contested
   row. Combat occurs in each contested row.
2. **Assign damage.** All damage in a contested row is assigned and dealt simultaneously.
   Each unit deals damage equal to its attack, and its controller chooses how to split that
   damage among the opposing units in the row. Because damage is simultaneous, both players
   assign before anything resolves. A unit destroyed in the exchange still deals its damage.
3. **Destruction.** Any unit reduced to 0 defense is destroyed and placed in its owner's
   discard.
4. **Attacking players.** A unit on the enemy home row that is not required to fight may
   attack the opposing player, dealing damage equal to its attack to that player's life
   total. *(Simulator ruling: a unit that fought in a contested row this fight phase cannot
   also attack the player.)*

**Damage is persistent.** Damage marked on a unit remains until the unit is destroyed or
the damage is removed by an effect.

**Ruling — healing exists:** effects that remove marked damage are real, homed in Earth and
Light.

## 9. Leaders

Your Leader begins the game in your command zone, face-up and visible to both players.

You may cast your Leader from the command zone at any time you could play a unit, paying
its energy cost. If your Leader is destroyed, it returns to the command zone.

**Ruling — escalating cost:** each subsequent casting of your Leader costs **2 more generic
energy** than the last. The Leader deploys like any other unit, has attack and defense, and
fights and attacks as a unit. Life is the only loss condition tied to it (no "leader
damage" loss).

## 10. The Order

When a player plays a spell or activates an ability, it does not resolve immediately. It is
placed on **the Order**. The opponent may respond by adding their own spell or ability.
When both players decline to add anything further, the Order resolves last in, first out.

- Spells may be played at any time you hold priority, including during your opponent's turn
  and during the fight phase.
- Actions may only be played during your own main phase while the Order is empty.

*(Naming note: "the Order" reads as a queue and as a caste hierarchy at once. Alternatives:
the Chain, the Cascade, the Directive, the Protocol.)*

## 11. Winning

- A player loses when their life total reaches 0.
- **Ruling:** a player who must draw from an empty deck loses (deck-out).

⚑ Open: alternate win conditions printed on cards.

## 12. Glossary

- **Contested row** — a row containing units controlled by both players.
- **Home row** — the row nearest a given player; row 1 for Player One, row 5 for Player Two.
- **Faction identity** — the set of energy types defined by a player's Leader, restricting
  deck contents.
- **The Order** — the LIFO resolution queue for spells and abilities.
- **Unique** — a card limited to one copy per deck.
- **Hasty** — this unit may move (and attack) the turn it enters play.
- **Guard** — enemies in this row must assign lethal damage to Guard units before assigning
  damage to others.
- **Swift** — this unit's move stat is 3 (one above the default of 2).
