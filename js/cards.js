'use strict';
/* Titanrule card database — draft v0.1 sample pool.
 * Cost keys: F fire, W water, N nature, E earth, L light, D dark, G generic.
 * Void energy ("provides: ANY") taps for any one type.
 */
(function () {

  const C = {};
  function def(card) {
    card.move = card.move ?? (card.type === 'unit' || card.type === 'leader' ? 1 : 0);
    card.keywords = card.keywords || [];
    C[card.id] = card;
  }

  /* ---------- Energy ---------- */
  def({ id: 'energy_fire',  name: 'Emberstone Vein', type: 'energy', cost: {}, provides: 'F', text: 'Taps for 1 Fire energy.' });
  def({ id: 'energy_water', name: 'Tidewell',        type: 'energy', cost: {}, provides: 'W', text: 'Taps for 1 Water energy.' });
  def({ id: 'energy_nature',name: 'Verdant Glade',   type: 'energy', cost: {}, provides: 'N', text: 'Taps for 1 Nature energy.' });
  def({ id: 'energy_earth', name: 'Granite Quarry',  type: 'energy', cost: {}, provides: 'E', text: 'Taps for 1 Earth energy.' });
  def({ id: 'energy_light', name: 'Sunspire',        type: 'energy', cost: {}, provides: 'L', text: 'Taps for 1 Light energy.' });
  def({ id: 'energy_dark',  name: 'Gloom Hollow',    type: 'energy', cost: {}, provides: 'D', text: 'Taps for 1 Dark energy.' });
  def({ id: 'energy_void',  name: 'Void Rift',       type: 'energy', cost: {}, provides: 'ANY', text: 'Taps for 1 energy of any type. Rare.' });

  /* ---------- Fire — aggression and speed ---------- */
  def({ id: 'ember_whelp', name: 'Ember Whelp', type: 'unit', cost: { F: 1 }, atk: 2, def: 1,
        keywords: ['hasty'], text: 'Hasty. (May move the turn it enters play.)' });
  def({ id: 'flame_adept', name: 'Flamecaller Adept', type: 'unit', cost: { F: 2 }, atk: 2, def: 2,
        keywords: ['hasty'], text: 'Hasty.' });
  def({ id: 'ashborn_raider', name: 'Ashborn Raider', type: 'unit', cost: { F: 1, G: 1 }, atk: 3, def: 2, text: '' });
  def({ id: 'pyroclast_brute', name: 'Pyroclast Brute', type: 'unit', cost: { F: 2, G: 2 }, atk: 5, def: 3, text: '' });
  def({ id: 'lava_bolt', name: 'Lava Bolt', type: 'spell', cost: { F: 1 },
        effect: { kind: 'dmgUnit', n: 2 }, target: 'anyUnit', text: 'Deal 2 damage to target unit.' });
  def({ id: 'immolate', name: 'Immolate', type: 'spell', cost: { F: 2, G: 1 },
        effect: { kind: 'dmgUnit', n: 4 }, target: 'anyUnit', text: 'Deal 4 damage to target unit.' });
  def({ id: 'searing_brand', name: 'Searing Brand', type: 'spell', cost: { F: 2 },
        effect: { kind: 'dmgPlayer', n: 2 }, target: null, text: 'Deal 2 damage to the enemy player.' });
  def({ id: 'battle_fury', name: 'Battle Fury', type: 'action', cost: { F: 1 },
        effect: { kind: 'buff', a: 2, d: 0, temp: true }, target: 'ownUnit',
        text: 'Target unit you control gets +2/+0 until end of turn.' });

  /* ---------- Water — control and synergy ---------- */
  def({ id: 'tidecaller', name: 'Tidecaller', type: 'unit', cost: { W: 1 }, atk: 1, def: 3, text: '' });
  def({ id: 'current_rider', name: 'Current Rider', type: 'unit', cost: { W: 2 }, atk: 2, def: 3,
        move: 2, keywords: ['swift'], text: 'Swift. (May move up to 2 rows.)' });
  def({ id: 'abyss_stalker', name: 'Abyss Stalker', type: 'unit', cost: { W: 2, G: 1 }, atk: 3, def: 3, text: '' });
  def({ id: 'deep_leviathan', name: 'Deep Leviathan', type: 'unit', cost: { W: 3, G: 3 }, atk: 6, def: 6, text: '' });
  def({ id: 'undertow', name: 'Undertow', type: 'spell', cost: { W: 1, G: 1 },
        effect: { kind: 'bounce' }, target: 'anyUnit', text: "Return target unit to its owner's hand." });
  def({ id: 'tidal_shove', name: 'Tidal Shove', type: 'spell', cost: { W: 1 },
        effect: { kind: 'push', n: 1 }, target: 'enemyUnit',
        text: "Move target enemy unit 1 row toward its owner's edge." });
  def({ id: 'insight', name: 'Insight', type: 'action', cost: { W: 1, G: 1 },
        effect: { kind: 'draw', n: 2 }, target: null, text: 'Draw 2 cards.' });
  def({ id: 'dispel', name: 'Dispel', type: 'spell', cost: { W: 2 },
        effect: { kind: 'counter' }, target: 'order', text: 'Counter target spell on the Order.' });

  /* ---------- Nature — ramp and mass ---------- */
  def({ id: 'sprout_warden', name: 'Sprout Warden', type: 'unit', cost: { N: 1 }, atk: 1, def: 2, text: '' });
  def({ id: 'canopy_stalker', name: 'Canopy Stalker', type: 'unit', cost: { N: 1, G: 1 }, atk: 2, def: 3, text: '' });
  def({ id: 'verdant_ox', name: 'Verdant Ox', type: 'unit', cost: { N: 2, G: 1 }, atk: 3, def: 4, text: '' });
  def({ id: 'elder_treant', name: 'Elder Treant', type: 'unit', cost: { N: 2, G: 2 }, atk: 4, def: 5, text: '' });
  def({ id: 'thornhide_colossus', name: 'Thornhide Colossus', type: 'unit', cost: { N: 3, G: 3 }, atk: 7, def: 7, text: '' });
  def({ id: 'wild_growth', name: 'Wild Growth', type: 'action', cost: { N: 1 },
        effect: { kind: 'rampEnergy' }, target: null,
        text: 'Search your deck for an energy card and put it into your energy row tapped.' });
  def({ id: 'primal_surge', name: 'Primal Surge', type: 'spell', cost: { N: 2, G: 1 },
        effect: { kind: 'buff', a: 3, d: 3, temp: true }, target: 'ownUnit',
        text: 'Target unit you control gets +3/+3 until end of turn.' });
  def({ id: 'abundance', name: 'Abundance', type: 'action', cost: { N: 2, G: 1 },
        effect: { kind: 'draw', n: 2 }, target: null, text: 'Draw 2 cards.' });

  /* ---------- Earth — defense and the long game ---------- */
  def({ id: 'stone_sentinel', name: 'Stone Sentinel', type: 'unit', cost: { E: 1 }, atk: 0, def: 4,
        keywords: ['guard'], text: 'Guard. (Enemies in this row must assign lethal damage to Guard units first.)' });
  def({ id: 'granite_wall', name: 'Granite Wall', type: 'unit', cost: { E: 1, G: 1 }, atk: 1, def: 5,
        keywords: ['guard'], text: 'Guard.' });
  def({ id: 'bulwark_golem', name: 'Bulwark Golem', type: 'unit', cost: { E: 2, G: 2 }, atk: 3, def: 7, text: '' });
  def({ id: 'cliff_breaker', name: 'Cliff Breaker', type: 'unit', cost: { E: 3, G: 2 }, atk: 5, def: 6, text: '' });
  def({ id: 'mend', name: 'Mend', type: 'spell', cost: { E: 1 },
        effect: { kind: 'heal', n: 3 }, target: 'anyUnit', text: 'Remove 3 damage from target unit.' });
  def({ id: 'hurl_stone', name: 'Hurl Stone', type: 'spell', cost: { E: 2, G: 1 },
        effect: { kind: 'dmgUnit', n: 3 }, target: 'anyUnit', text: 'Deal 3 damage to target unit.' });
  def({ id: 'fortify', name: 'Fortify', type: 'augment', cost: { E: 1, G: 1 },
        effect: { kind: 'augment', a: 1, d: 3 }, target: 'ownUnit', text: 'Attached unit gets +1/+3.' });
  def({ id: 'bastion_grounds', name: 'Bastion Grounds', type: 'location', cost: { E: 2, G: 1 },
        effect: { kind: 'location', a: 0, d: 1 }, target: null, text: 'Units you control get +0/+1.' });

  /* ---------- Light — hierarchy, going wide ---------- */
  def({ id: 'rank_initiate', name: 'Rank Initiate', type: 'unit', cost: { L: 1 }, atk: 2, def: 1, text: '' });
  def({ id: 'castellan', name: 'Castellan of Ranks', type: 'unit', cost: { L: 1, G: 1 }, atk: 2, def: 3, text: '' });
  def({ id: 'sunlance_templar', name: 'Sunlance Templar', type: 'unit', cost: { L: 2, G: 1 }, atk: 3, def: 3, text: '' });
  def({ id: 'high_justicar', name: 'High Justicar', type: 'unit', cost: { L: 2, G: 2 }, atk: 4, def: 4, text: '' });
  def({ id: 'muster', name: 'Muster', type: 'action', cost: { L: 1, G: 1 },
        effect: { kind: 'tokens', count: 2, name: 'Footman', a: 1, d: 1 }, target: null,
        text: 'Create two 1/1 Footman tokens on your home row.' });
  def({ id: 'radiant_mend', name: 'Radiant Mend', type: 'spell', cost: { L: 1 },
        effect: { kind: 'heal', n: 2 }, target: 'anyUnit', text: 'Remove 2 damage from target unit.' });
  def({ id: 'consecrate', name: 'Consecrate', type: 'augment', cost: { L: 1, G: 1 },
        effect: { kind: 'augment', a: 1, d: 1 }, target: 'ownUnit', text: 'Attached unit gets +1/+1.' });
  def({ id: 'banner_high', name: 'Banner of the High', type: 'location', cost: { L: 2, G: 1 },
        effect: { kind: 'location', a: 1, d: 0 }, target: null, text: 'Units you control get +1/+0.' });

  /* ---------- Dark — death and destruction ---------- */
  def({ id: 'gutter_shade', name: 'Gutter Shade', type: 'unit', cost: { D: 1 }, atk: 2, def: 1, text: '' });
  def({ id: 'carrion_fiend', name: 'Carrion Fiend', type: 'unit', cost: { D: 1, G: 1 }, atk: 3, def: 2, text: '' });
  def({ id: 'bone_stalker', name: 'Bone Stalker', type: 'unit', cost: { D: 2 }, atk: 4, def: 2, text: '' });
  def({ id: 'plague_bearer', name: 'Plague Bearer', type: 'unit', cost: { D: 2, G: 1 }, atk: 3, def: 3, text: '' });
  def({ id: 'reaper_casteless', name: 'Reaper of the Casteless', type: 'unit', cost: { D: 3, G: 2 }, atk: 6, def: 4, text: '' });
  def({ id: 'execution', name: 'Execution', type: 'spell', cost: { D: 1, G: 2 },
        effect: { kind: 'destroy' }, target: 'anyUnit', text: 'Destroy target unit.' });
  def({ id: 'wither', name: 'Wither', type: 'spell', cost: { D: 1 },
        effect: { kind: 'buff', a: -2, d: -2, temp: true }, target: 'enemyUnit',
        text: 'Target enemy unit gets -2/-2 until end of turn.' });
  def({ id: 'dark_bargain', name: 'Dark Bargain', type: 'action', cost: { D: 1, G: 1 },
        effect: { kind: 'sacDraw', n: 2 }, target: 'ownUnit',
        text: 'Sacrifice target unit you control: draw 2 cards.' });

  /* ---------- Void — rare and powerful, playable by any Leader ---------- */
  def({ id: 'void_spawn', name: 'Void Spawn', type: 'unit', cost: { G: 4 }, atk: 4, def: 4,
        text: 'Void. May be included in any deck, in any number.' });
  def({ id: 'null_titan', name: 'Null Titan', type: 'unit', cost: { G: 8 }, atk: 9, def: 9,
        text: 'Void. May be included in any deck, in any number.' });

  /* ---------- Leaders (unique, start in command zone) ---------- */
  def({ id: 'leader_fire', name: 'Karvex, Flame Sovereign', type: 'leader', cost: { F: 2, G: 1 },
        atk: 4, def: 3, keywords: ['hasty'], unique: true, text: 'Hasty.' });
  def({ id: 'leader_water', name: 'Maris, Tide Regent', type: 'leader', cost: { W: 2, G: 1 },
        atk: 3, def: 4, unique: true, text: '' });
  def({ id: 'leader_nature', name: 'Vharn, the Rootking', type: 'leader', cost: { N: 2, G: 2 },
        atk: 5, def: 5, unique: true, text: '' });
  def({ id: 'leader_earth', name: 'Dornath, Bulwark of the Low', type: 'leader', cost: { E: 1, G: 2 },
        atk: 2, def: 7, keywords: ['guard'], unique: true, text: 'Guard.' });
  def({ id: 'leader_light', name: 'Seraphel, Voice of the Order', type: 'leader', cost: { L: 2, G: 1 },
        atk: 3, def: 4, unique: true, text: '' });
  def({ id: 'leader_dark', name: 'Morvane, the Unchained', type: 'leader', cost: { D: 2, G: 1 },
        atk: 4, def: 3, unique: true, text: '' });

  /* ---------- Prebuilt 40-card decks: 15 faction energy + 1 Void Rift + 3x8 cards ---------- */
  function deckList(energyId, cardIds) {
    const list = [[energyId, 15], ['energy_void', 1]];
    for (const id of cardIds) list.push([id, 3]);
    return list;
  }

  const DECKS = {
    fire: {
      name: 'Fire — Ashborn Uprising', leader: 'leader_fire',
      cards: deckList('energy_fire',
        ['ember_whelp', 'flame_adept', 'ashborn_raider', 'pyroclast_brute',
         'lava_bolt', 'immolate', 'searing_brand', 'battle_fury']),
    },
    water: {
      name: 'Water — Tidebound Court', leader: 'leader_water',
      cards: deckList('energy_water',
        ['tidecaller', 'current_rider', 'abyss_stalker', 'deep_leviathan',
         'undertow', 'tidal_shove', 'insight', 'dispel']),
    },
    nature: {
      name: 'Nature — Rootking Horde', leader: 'leader_nature',
      cards: deckList('energy_nature',
        ['sprout_warden', 'canopy_stalker', 'verdant_ox', 'elder_treant',
         'thornhide_colossus', 'wild_growth', 'primal_surge', 'abundance']),
    },
    earth: {
      name: 'Earth — Unbroken Bulwark', leader: 'leader_earth',
      cards: deckList('energy_earth',
        ['stone_sentinel', 'granite_wall', 'bulwark_golem', 'cliff_breaker',
         'mend', 'hurl_stone', 'fortify', 'bastion_grounds']),
    },
    light: {
      name: 'Light — Rank and File', leader: 'leader_light',
      cards: deckList('energy_light',
        ['rank_initiate', 'castellan', 'sunlance_templar', 'high_justicar',
         'muster', 'radiant_mend', 'consecrate', 'banner_high']),
    },
    dark: {
      name: 'Dark — The Casteless', leader: 'leader_dark',
      cards: deckList('energy_dark',
        ['gutter_shade', 'carrion_fiend', 'bone_stalker', 'plague_bearer',
         'reaper_casteless', 'execution', 'wither', 'dark_bargain']),
    },
  };

  const ENERGY_NAMES = { F: 'Fire', W: 'Water', N: 'Nature', E: 'Earth', L: 'Light', D: 'Dark', V: 'Void', G: 'Generic' };

  globalThis.TCG_CARDS = C;
  globalThis.TCG_DECKS = DECKS;
  globalThis.TCG_ENERGY_NAMES = ENERGY_NAMES;
})();
