'use strict';
/* Titanrule card database — draft v0.1 sample pool.
 * Cost keys: F fire, W water, N nature, E earth, L light, D dark, G generic.
 * Void energy ("provides: ANY") taps for any one type.
 * Rarities: common, uncommon, rare, titan. Energy is common (Void Rift rare);
 * Leaders sit outside the rarity ladder and never appear in packs.
 */
(function () {

  const C = {};
  function def(card) {
    card.move = card.move ?? (card.type === 'unit' || card.type === 'leader' ? 1 : 0);
    card.keywords = card.keywords || [];
    card.rarity = card.rarity || 'common';
    C[card.id] = card;
  }

  /* ---------- Energy ---------- */
  def({ id: 'energy_fire',  name: 'Emberstone Vein', type: 'energy', cost: {}, provides: 'F', text: 'Taps for 1 Fire energy.' });
  def({ id: 'energy_water', name: 'Tidewell',        type: 'energy', cost: {}, provides: 'W', text: 'Taps for 1 Water energy.' });
  def({ id: 'energy_nature',name: 'Verdant Glade',   type: 'energy', cost: {}, provides: 'N', text: 'Taps for 1 Nature energy.' });
  def({ id: 'energy_earth', name: 'Granite Quarry',  type: 'energy', cost: {}, provides: 'E', text: 'Taps for 1 Earth energy.' });
  def({ id: 'energy_light', name: 'Sunspire',        type: 'energy', cost: {}, provides: 'L', text: 'Taps for 1 Light energy.' });
  def({ id: 'energy_dark',  name: 'Gloom Hollow',    type: 'energy', cost: {}, provides: 'D', text: 'Taps for 1 Dark energy.' });
  def({ id: 'energy_void',  name: 'Void Rift',       type: 'energy', cost: {}, provides: 'ANY', rarity: 'rare', text: 'Taps for 1 energy of any type. Rare.' });

  /* ---------- Fire — aggression and speed ---------- */
  // Commons
  def({ id: 'ember_whelp', name: 'Ember Whelp', type: 'unit', cost: { F: 1 }, atk: 2, def: 1,
        keywords: ['hasty'], text: 'Hasty. (May move the turn it enters play.)' });
  def({ id: 'flame_adept', name: 'Flamecaller Adept', type: 'unit', cost: { F: 2 }, atk: 2, def: 2,
        keywords: ['hasty'], text: 'Hasty.' });
  def({ id: 'ashborn_raider', name: 'Ashborn Raider', type: 'unit', cost: { F: 1, G: 1 }, atk: 3, def: 2, text: '' });
  def({ id: 'pyre_zealot', name: 'Pyre Zealot', type: 'unit', cost: { F: 2, G: 1 }, atk: 4, def: 2, text: '' });
  def({ id: 'lava_bolt', name: 'Lava Bolt', type: 'spell', cost: { F: 1 },
        effect: { kind: 'dmgUnit', n: 2 }, target: 'anyUnit', text: 'Deal 2 damage to target unit.' });
  def({ id: 'searing_brand', name: 'Searing Brand', type: 'spell', cost: { F: 2 },
        effect: { kind: 'dmgPlayer', n: 2 }, target: null, text: 'Deal 2 damage to the enemy player.' });
  def({ id: 'battle_fury', name: 'Battle Fury', type: 'action', cost: { F: 1 },
        effect: { kind: 'buff', a: 2, d: 0, temp: true }, target: 'ownUnit',
        text: 'Target unit you control gets +2/+0 until end of turn.' });
  // Uncommons
  def({ id: 'pyroclast_brute', name: 'Pyroclast Brute', type: 'unit', cost: { F: 2, G: 2 }, atk: 5, def: 3,
        rarity: 'uncommon', text: '' });
  def({ id: 'inferno_herald', name: 'Inferno Herald', type: 'unit', cost: { F: 3, G: 1 }, atk: 5, def: 3,
        rarity: 'uncommon', keywords: ['hasty'], text: 'Hasty.' });
  def({ id: 'immolate', name: 'Immolate', type: 'spell', cost: { F: 2, G: 1 },
        rarity: 'uncommon', effect: { kind: 'dmgUnit', n: 4 }, target: 'anyUnit', text: 'Deal 4 damage to target unit.' });
  def({ id: 'twinflame', name: 'Twinflame', type: 'spell', cost: { F: 2 },
        rarity: 'uncommon', effect: { kind: 'dmgUnit', n: 3 }, target: 'anyUnit', text: 'Deal 3 damage to target unit.' });
  def({ id: 'rage_of_the_low', name: 'Rage of the Low', type: 'action', cost: { F: 2 },
        rarity: 'uncommon', effect: { kind: 'buff', a: 3, d: 1, temp: true }, target: 'ownUnit',
        text: 'Target unit you control gets +3/+1 until end of turn.' });
  // Rares
  def({ id: 'flame_juggernaut', name: 'Flame Juggernaut', type: 'unit', cost: { F: 3, G: 2 }, atk: 6, def: 4,
        rarity: 'rare', keywords: ['hasty'], text: 'Hasty.' });
  def({ id: 'wildfire', name: 'Wildfire', type: 'action', cost: { F: 3, G: 2 },
        rarity: 'rare', effect: { kind: 'dmgRow', n: 2 }, target: 'row',
        text: 'Deal 2 damage to each enemy unit in target row.' });
  // Titan
  def({ id: 'ember_titan', name: 'Ember Titan of the Forgeheart', type: 'unit', cost: { F: 4, G: 3 }, atk: 8, def: 5,
        rarity: 'titan', keywords: ['hasty'], text: 'Hasty.' });

  /* ---------- Water — control and synergy ---------- */
  // Commons
  def({ id: 'tidecaller', name: 'Tidecaller', type: 'unit', cost: { W: 1 }, atk: 1, def: 3, text: '' });
  def({ id: 'reef_guard', name: 'Reef Guard', type: 'unit', cost: { W: 1, G: 1 }, atk: 1, def: 4, text: '' });
  def({ id: 'abyss_stalker', name: 'Abyss Stalker', type: 'unit', cost: { W: 2, G: 1 }, atk: 3, def: 3, text: '' });
  def({ id: 'grand_archivist', name: 'Grand Archivist', type: 'unit', cost: { W: 2, G: 1 }, atk: 2, def: 4, text: '' });
  def({ id: 'tidal_shove', name: 'Tidal Shove', type: 'spell', cost: { W: 1 },
        effect: { kind: 'push', n: 1 }, target: 'enemyUnit',
        text: "Move target enemy unit 1 row toward its owner's edge." });
  def({ id: 'insight', name: 'Insight', type: 'action', cost: { W: 1, G: 1 },
        effect: { kind: 'draw', n: 2 }, target: null, text: 'Draw 2 cards.' });
  def({ id: 'ripple', name: 'Ripple', type: 'action', cost: { W: 1 },
        effect: { kind: 'draw', n: 1 }, target: null, text: 'Draw a card.' });
  // Uncommons
  def({ id: 'current_rider', name: 'Current Rider', type: 'unit', cost: { W: 2 }, atk: 2, def: 3,
        rarity: 'uncommon', move: 2, keywords: ['swift'], text: 'Swift. (May move up to 2 rows.)' });
  def({ id: 'mist_dancer', name: 'Mist Dancer', type: 'unit', cost: { W: 1, G: 1 }, atk: 2, def: 2,
        rarity: 'uncommon', move: 2, keywords: ['swift'], text: 'Swift.' });
  def({ id: 'undertow', name: 'Undertow', type: 'spell', cost: { W: 1, G: 1 },
        rarity: 'uncommon', effect: { kind: 'bounce' }, target: 'anyUnit', text: "Return target unit to its owner's hand." });
  def({ id: 'dispel', name: 'Dispel', type: 'spell', cost: { W: 2 },
        rarity: 'uncommon', effect: { kind: 'counter' }, target: 'order', text: 'Counter target spell on the Order.' });
  def({ id: 'numbing_tide', name: 'Numbing Tide', type: 'spell', cost: { W: 1 },
        rarity: 'uncommon', effect: { kind: 'buff', a: -3, d: 0, temp: true }, target: 'enemyUnit',
        text: 'Target enemy unit gets -3/-0 until end of turn.' });
  // Rares
  def({ id: 'deep_leviathan', name: 'Deep Leviathan', type: 'unit', cost: { W: 3, G: 3 }, atk: 6, def: 6,
        rarity: 'rare', text: '' });
  def({ id: 'maelstrom', name: 'Maelstrom', type: 'action', cost: { W: 3, G: 2 },
        rarity: 'rare', effect: { kind: 'dmgRow', n: 2 }, target: 'row',
        text: 'Deal 2 damage to each enemy unit in target row.' });
  // Titan
  def({ id: 'leviathan_sovereign', name: 'Sovereign of the Drowned Court', type: 'unit', cost: { W: 4, G: 3 }, atk: 7, def: 8,
        rarity: 'titan', text: '' });

  /* ---------- Nature — ramp and mass ---------- */
  // Commons
  def({ id: 'sprout_warden', name: 'Sprout Warden', type: 'unit', cost: { N: 1 }, atk: 1, def: 2, text: '' });
  def({ id: 'canopy_stalker', name: 'Canopy Stalker', type: 'unit', cost: { N: 1, G: 1 }, atk: 2, def: 3, text: '' });
  def({ id: 'bramble_beast', name: 'Bramble Beast', type: 'unit', cost: { N: 2 }, atk: 3, def: 3, text: '' });
  def({ id: 'verdant_ox', name: 'Verdant Ox', type: 'unit', cost: { N: 2, G: 1 }, atk: 3, def: 4, text: '' });
  def({ id: 'thorn_lash', name: 'Thorn Lash', type: 'spell', cost: { N: 1, G: 1 },
        effect: { kind: 'dmgUnit', n: 2 }, target: 'anyUnit', text: 'Deal 2 damage to target unit.' });
  def({ id: 'wild_growth', name: 'Wild Growth', type: 'action', cost: { N: 1 },
        effect: { kind: 'rampEnergy' }, target: null,
        text: 'Search your deck for an energy card and put it into your energy row tapped.' });
  def({ id: 'great_bloom', name: 'Great Bloom', type: 'action', cost: { N: 2, G: 1 },
        effect: { kind: 'rampEnergy' }, target: null,
        text: 'Search your deck for an energy card and put it into your energy row tapped.' });
  // Uncommons
  def({ id: 'elder_treant', name: 'Elder Treant', type: 'unit', cost: { N: 2, G: 2 }, atk: 4, def: 5,
        rarity: 'uncommon', text: '' });
  def({ id: 'moss_giant', name: 'Moss Giant', type: 'unit', cost: { N: 3, G: 2 }, atk: 5, def: 7,
        rarity: 'uncommon', text: '' });
  def({ id: 'primal_surge', name: 'Primal Surge', type: 'spell', cost: { N: 2, G: 1 },
        rarity: 'uncommon', effect: { kind: 'buff', a: 3, d: 3, temp: true }, target: 'ownUnit',
        text: 'Target unit you control gets +3/+3 until end of turn.' });
  def({ id: 'regrowth', name: 'Regrowth', type: 'spell', cost: { N: 2 },
        rarity: 'uncommon', effect: { kind: 'heal', n: 4 }, target: 'anyUnit', text: 'Remove 4 damage from target unit.' });
  def({ id: 'abundance', name: 'Abundance', type: 'action', cost: { N: 2, G: 1 },
        rarity: 'uncommon', effect: { kind: 'draw', n: 2 }, target: null, text: 'Draw 2 cards.' });
  // Rares
  def({ id: 'thornhide_colossus', name: 'Thornhide Colossus', type: 'unit', cost: { N: 3, G: 3 }, atk: 7, def: 7,
        rarity: 'rare', text: '' });
  def({ id: 'call_the_wilds', name: 'Call the Wilds', type: 'action', cost: { N: 2, G: 2 },
        rarity: 'rare', effect: { kind: 'tokens', count: 2, name: 'Wolf', a: 2, d: 2 }, target: null,
        text: 'Create two 2/2 Wolf tokens on your home row.' });
  // Titan
  def({ id: 'worldroot_titan', name: 'Worldroot Titan', type: 'unit', cost: { N: 4, G: 4 }, atk: 9, def: 10,
        rarity: 'titan', text: '' });

  /* ---------- Earth — defense and the long game ---------- */
  // Commons
  def({ id: 'stone_sentinel', name: 'Stone Sentinel', type: 'unit', cost: { E: 1 }, atk: 0, def: 4,
        keywords: ['guard'], text: 'Guard. (Enemies in this row must assign lethal damage to Guard units first.)' });
  def({ id: 'granite_wall', name: 'Granite Wall', type: 'unit', cost: { E: 1, G: 1 }, atk: 1, def: 5,
        keywords: ['guard'], text: 'Guard.' });
  def({ id: 'pebble_golem', name: 'Pebble Golem', type: 'unit', cost: { E: 1, G: 1 }, atk: 2, def: 3, text: '' });
  def({ id: 'quarry_loader', name: 'Quarry Loader', type: 'unit', cost: { E: 2, G: 1 }, atk: 3, def: 4, text: '' });
  def({ id: 'mend', name: 'Mend', type: 'spell', cost: { E: 1 },
        effect: { kind: 'heal', n: 3 }, target: 'anyUnit', text: 'Remove 3 damage from target unit.' });
  def({ id: 'stone_skin', name: 'Stone Skin', type: 'spell', cost: { E: 1 },
        effect: { kind: 'buff', a: 0, d: 3, temp: true }, target: 'ownUnit',
        text: 'Target unit you control gets +0/+3 until end of turn.' });
  def({ id: 'hurl_stone', name: 'Hurl Stone', type: 'spell', cost: { E: 2, G: 1 },
        effect: { kind: 'dmgUnit', n: 3 }, target: 'anyUnit', text: 'Deal 3 damage to target unit.' });
  // Uncommons
  def({ id: 'bulwark_golem', name: 'Bulwark Golem', type: 'unit', cost: { E: 2, G: 2 }, atk: 3, def: 7,
        rarity: 'uncommon', text: '' });
  def({ id: 'cliff_breaker', name: 'Cliff Breaker', type: 'unit', cost: { E: 3, G: 2 }, atk: 5, def: 6,
        rarity: 'uncommon', text: '' });
  def({ id: 'fortify', name: 'Fortify', type: 'augment', cost: { E: 1, G: 1 },
        rarity: 'uncommon', effect: { kind: 'augment', a: 1, d: 3 }, target: 'ownUnit', text: 'Attached unit gets +1/+3.' });
  def({ id: 'deep_mend', name: 'Deep Mend', type: 'spell', cost: { E: 2, G: 1 },
        rarity: 'uncommon', effect: { kind: 'heal', n: 5 }, target: 'anyUnit', text: 'Remove 5 damage from target unit.' });
  def({ id: 'seismic_slam', name: 'Seismic Slam', type: 'spell', cost: { E: 3, G: 2 },
        rarity: 'uncommon', effect: { kind: 'dmgUnit', n: 5 }, target: 'anyUnit', text: 'Deal 5 damage to target unit.' });
  // Rares
  def({ id: 'bastion_grounds', name: 'Bastion Grounds', type: 'location', cost: { E: 2, G: 1 },
        rarity: 'rare', effect: { kind: 'location', a: 0, d: 1 }, target: null, text: 'Units you control get +0/+1.' });
  def({ id: 'rampart_colossus', name: 'Rampart Colossus', type: 'unit', cost: { E: 3, G: 3 }, atk: 4, def: 9,
        rarity: 'rare', keywords: ['guard'], text: 'Guard.' });
  // Titan
  def({ id: 'mountain_heart', name: 'Heart of the Mountain', type: 'unit', cost: { E: 4, G: 3 }, atk: 6, def: 10,
        rarity: 'titan', keywords: ['guard'], text: 'Guard.' });

  /* ---------- Light — hierarchy, going wide ---------- */
  // Commons
  def({ id: 'rank_initiate', name: 'Rank Initiate', type: 'unit', cost: { L: 1 }, atk: 2, def: 1, text: '' });
  def({ id: 'castellan', name: 'Castellan of Ranks', type: 'unit', cost: { L: 1, G: 1 }, atk: 2, def: 3, text: '' });
  def({ id: 'oath_sworn', name: 'Oath-Sworn', type: 'unit', cost: { L: 1, G: 1 }, atk: 3, def: 2, text: '' });
  def({ id: 'shieldmate', name: 'Shieldmate', type: 'unit', cost: { L: 1, G: 1 }, atk: 1, def: 4, text: '' });
  def({ id: 'sunlance_templar', name: 'Sunlance Templar', type: 'unit', cost: { L: 2, G: 1 }, atk: 3, def: 3, text: '' });
  def({ id: 'radiant_mend', name: 'Radiant Mend', type: 'spell', cost: { L: 1 },
        effect: { kind: 'heal', n: 2 }, target: 'anyUnit', text: 'Remove 2 damage from target unit.' });
  def({ id: 'consecrate', name: 'Consecrate', type: 'augment', cost: { L: 1, G: 1 },
        effect: { kind: 'augment', a: 1, d: 1 }, target: 'ownUnit', text: 'Attached unit gets +1/+1.' });
  // Uncommons
  def({ id: 'high_justicar', name: 'High Justicar', type: 'unit', cost: { L: 2, G: 2 }, atk: 4, def: 4,
        rarity: 'uncommon', text: '' });
  def({ id: 'phalanx_captain', name: 'Phalanx Captain', type: 'unit', cost: { L: 2, G: 2 }, atk: 3, def: 5,
        rarity: 'uncommon', text: '' });
  def({ id: 'muster', name: 'Muster', type: 'action', cost: { L: 1, G: 1 },
        rarity: 'uncommon', effect: { kind: 'tokens', count: 2, name: 'Footman', a: 1, d: 1 }, target: null,
        text: 'Create two 1/1 Footman tokens on your home row.' });
  def({ id: 'judgment_ray', name: 'Judgment Ray', type: 'spell', cost: { L: 2, G: 1 },
        rarity: 'uncommon', effect: { kind: 'dmgUnit', n: 3 }, target: 'anyUnit', text: 'Deal 3 damage to target unit.' });
  def({ id: 'choir_of_dawn', name: 'Choir of Dawn', type: 'spell', cost: { L: 2, G: 2 },
        rarity: 'uncommon', effect: { kind: 'heal', n: 4 }, target: 'anyUnit', text: 'Remove 4 damage from target unit.' });
  // Rares
  def({ id: 'banner_high', name: 'Banner of the High', type: 'location', cost: { L: 2, G: 1 },
        rarity: 'rare', effect: { kind: 'location', a: 1, d: 0 }, target: null, text: 'Units you control get +1/+0.' });
  def({ id: 'grand_muster', name: 'Grand Muster', type: 'action', cost: { L: 3, G: 2 },
        rarity: 'rare', effect: { kind: 'tokens', count: 3, name: 'Footman', a: 1, d: 1 }, target: null,
        text: 'Create three 1/1 Footman tokens on your home row.' });
  // Titan
  def({ id: 'archon_summit', name: 'Archon of the Summit', type: 'unit', cost: { L: 4, G: 3 }, atk: 7, def: 7,
        rarity: 'titan', text: '' });

  /* ---------- Dark — death and destruction ---------- */
  // Commons
  def({ id: 'gutter_shade', name: 'Gutter Shade', type: 'unit', cost: { D: 1 }, atk: 2, def: 1, text: '' });
  def({ id: 'carrion_fiend', name: 'Carrion Fiend', type: 'unit', cost: { D: 1, G: 1 }, atk: 3, def: 2, text: '' });
  def({ id: 'tomb_haunt', name: 'Tomb Haunt', type: 'unit', cost: { D: 1, G: 1 }, atk: 2, def: 3, text: '' });
  def({ id: 'bone_stalker', name: 'Bone Stalker', type: 'unit', cost: { D: 2 }, atk: 4, def: 2, text: '' });
  def({ id: 'festering_husk', name: 'Festering Husk', type: 'unit', cost: { D: 2, G: 1 }, atk: 2, def: 4, text: '' });
  def({ id: 'wither', name: 'Wither', type: 'spell', cost: { D: 1 },
        effect: { kind: 'buff', a: -2, d: -2, temp: true }, target: 'enemyUnit',
        text: 'Target enemy unit gets -2/-2 until end of turn.' });
  def({ id: 'cull_the_weak', name: 'Cull the Weak', type: 'action', cost: { D: 2, G: 1 },
        effect: { kind: 'dmgRow', n: 1 }, target: 'row',
        text: 'Deal 1 damage to each enemy unit in target row.' });
  // Uncommons
  def({ id: 'plague_bearer', name: 'Plague Bearer', type: 'unit', cost: { D: 2, G: 1 }, atk: 3, def: 3,
        rarity: 'uncommon', text: '' });
  def({ id: 'dread_marauder', name: 'Dread Marauder', type: 'unit', cost: { D: 2, G: 2 }, atk: 5, def: 3,
        rarity: 'uncommon', text: '' });
  def({ id: 'execution', name: 'Execution', type: 'spell', cost: { D: 1, G: 2 },
        rarity: 'uncommon', effect: { kind: 'destroy' }, target: 'anyUnit', text: 'Destroy target unit.' });
  def({ id: 'dark_bargain', name: 'Dark Bargain', type: 'action', cost: { D: 1, G: 1 },
        rarity: 'uncommon', effect: { kind: 'sacDraw', n: 2 }, target: 'ownUnit',
        text: 'Sacrifice target unit you control: draw 2 cards.' });
  def({ id: 'grim_insight', name: 'Grim Insight', type: 'spell', cost: { D: 2 },
        rarity: 'uncommon', effect: { kind: 'painDraw', n: 2, life: 2 }, target: null,
        text: 'Draw 2 cards. You lose 2 life.' });
  // Rares
  def({ id: 'reaper_casteless', name: 'Reaper of the Casteless', type: 'unit', cost: { D: 3, G: 2 }, atk: 6, def: 4,
        rarity: 'rare', text: '' });
  def({ id: 'soul_drain', name: 'Soul Drain', type: 'spell', cost: { D: 2, G: 2 },
        rarity: 'rare', effect: { kind: 'drain', n: 3 }, target: 'anyUnit',
        text: 'Deal 3 damage to target unit. You gain 3 life.' });
  // Titan
  def({ id: 'tyrant_last_caste', name: 'Tyrant of the Last Caste', type: 'unit', cost: { D: 4, G: 3 }, atk: 8, def: 6,
        rarity: 'titan', text: '' });

  /* ---------- Void — rare and powerful, playable by any Leader ---------- */
  def({ id: 'void_crawler', name: 'Void Crawler', type: 'unit', cost: { G: 2 }, atk: 2, def: 2,
        text: 'Void. May be included in any deck, in any number.' });
  def({ id: 'void_pulse', name: 'Void Pulse', type: 'spell', cost: { G: 3 },
        rarity: 'uncommon', effect: { kind: 'dmgUnit', n: 3 }, target: 'anyUnit',
        text: 'Void. Deal 3 damage to target unit.' });
  def({ id: 'void_spawn', name: 'Void Spawn', type: 'unit', cost: { G: 4 }, atk: 4, def: 4,
        rarity: 'uncommon', text: 'Void. May be included in any deck, in any number.' });
  def({ id: 'rift_horror', name: 'Rift Horror', type: 'unit', cost: { G: 6 }, atk: 6, def: 6,
        rarity: 'rare', text: 'Void. May be included in any deck, in any number.' });
  def({ id: 'null_titan', name: 'Null Titan', type: 'unit', cost: { G: 8 }, atk: 9, def: 9,
        rarity: 'rare', text: 'Void. May be included in any deck, in any number.' });
  def({ id: 'entropy_titan', name: 'Entropy, Devourer of Castes', type: 'unit', cost: { G: 10 }, atk: 12, def: 12,
        rarity: 'titan', text: 'Void. May be included in any deck, in any number.' });

  /* ---------- Leaders (unique, start in command zone) ---------- */
  def({ id: 'leader_fire', name: 'Karvex, Flame Sovereign', type: 'leader', cost: { F: 2, G: 1 },
        atk: 4, def: 3, keywords: ['hasty'], unique: true, rarity: 'leader', text: 'Hasty.' });
  def({ id: 'leader_water', name: 'Maris, Tide Regent', type: 'leader', cost: { W: 2, G: 1 },
        atk: 3, def: 4, unique: true, rarity: 'leader', text: '' });
  def({ id: 'leader_nature', name: 'Vharn, the Rootking', type: 'leader', cost: { N: 2, G: 2 },
        atk: 5, def: 5, unique: true, rarity: 'leader', text: '' });
  def({ id: 'leader_earth', name: 'Dornath, Bulwark of the Low', type: 'leader', cost: { E: 1, G: 2 },
        atk: 2, def: 7, keywords: ['guard'], unique: true, rarity: 'leader', text: 'Guard.' });
  def({ id: 'leader_light', name: 'Seraphel, Voice of the Order', type: 'leader', cost: { L: 2, G: 1 },
        atk: 3, def: 4, unique: true, rarity: 'leader', text: '' });
  def({ id: 'leader_dark', name: 'Morvane, the Unchained', type: 'leader', cost: { D: 2, G: 1 },
        atk: 4, def: 3, unique: true, rarity: 'leader', text: '' });

  /* ================= EXPANSION: The Broken Ladder ================= */

  /* ---- Fire ---- */
  def({ id: 'cinder_sprite', name: 'Cinder Sprite', type: 'unit', cost: { F: 1 }, atk: 1, def: 1,
        keywords: ['hasty'], text: 'Hasty.' });
  def({ id: 'ash_hound', name: 'Ash Hound', type: 'unit', cost: { F: 2 }, atk: 3, def: 2,
        keywords: ['hasty'], text: 'Hasty.' });
  def({ id: 'kindle', name: 'Kindle', type: 'spell', cost: { F: 1 },
        effect: { kind: 'dmgUnit', n: 1 }, target: 'anyUnit', text: 'Deal 1 damage to target unit.' });
  def({ id: 'blaze_knight', name: 'Blaze Knight', type: 'unit', cost: { F: 2, G: 1 }, atk: 4, def: 3,
        rarity: 'uncommon', keywords: ['hasty'], text: 'Hasty.' });
  def({ id: 'magma_serpent', name: 'Magma Serpent', type: 'unit', cost: { F: 3, G: 2 }, atk: 5, def: 5,
        rarity: 'uncommon', text: '' });
  def({ id: 'avatar_cinders', name: 'Avatar of Cinders', type: 'unit', cost: { F: 3, G: 3 }, atk: 6, def: 5,
        rarity: 'rare', keywords: ['hasty'], text: 'Hasty.' });
  def({ id: 'volkran', name: 'Volkran, Furnace Colossus', type: 'unit', cost: { F: 5, G: 3 }, atk: 9, def: 6,
        rarity: 'titan', keywords: ['hasty'], text: 'Hasty.' });

  /* ---- Water ---- */
  def({ id: 'pearl_diver', name: 'Pearl Diver', type: 'unit', cost: { W: 1, G: 1 }, atk: 2, def: 2, text: '' });
  def({ id: 'stream_spirit', name: 'Stream Spirit', type: 'unit', cost: { W: 1 }, atk: 1, def: 2,
        move: 2, keywords: ['swift'], text: 'Swift.' });
  def({ id: 'soothing_springs', name: 'Soothing Springs', type: 'spell', cost: { W: 1 },
        effect: { kind: 'heal', n: 2 }, target: 'anyUnit', text: 'Remove 2 damage from target unit.' });
  def({ id: 'tempest_caller', name: 'Tempest Caller', type: 'unit', cost: { W: 3, G: 1 }, atk: 4, def: 4,
        rarity: 'uncommon', text: '' });
  def({ id: 'whirlpool', name: 'Whirlpool', type: 'spell', cost: { W: 2, G: 1 },
        rarity: 'uncommon', effect: { kind: 'push', n: 2 }, target: 'enemyUnit',
        text: "Move target enemy unit 2 rows toward its owner's edge." });
  def({ id: 'abyssal_tyrant', name: 'Abyssal Tyrant', type: 'unit', cost: { W: 4, G: 2 }, atk: 6, def: 7,
        rarity: 'rare', text: '' });
  def({ id: 'okeanos', name: 'Okeanos, the World-Tide', type: 'unit', cost: { W: 5, G: 4 }, atk: 8, def: 9,
        rarity: 'titan', text: '' });

  /* ---- Nature ---- */
  def({ id: 'timber_wolf', name: 'Timber Wolf', type: 'unit', cost: { N: 1, G: 1 }, atk: 3, def: 2, text: '' });
  def({ id: 'grazing_titanoth', name: 'Grazing Titanoth', type: 'unit', cost: { N: 2, G: 1 }, atk: 2, def: 5, text: '' });
  def({ id: 'sap_surge', name: 'Sap Surge', type: 'spell', cost: { N: 1 },
        effect: { kind: 'buff', a: 1, d: 1, temp: true }, target: 'ownUnit',
        text: 'Target unit you control gets +1/+1 until end of turn.' });
  def({ id: 'ancient_of_vines', name: 'Ancient of Vines', type: 'unit', cost: { N: 3, G: 2 }, atk: 4, def: 6,
        rarity: 'uncommon', text: '' });
  def({ id: 'verdant_champion', name: 'Verdant Champion', type: 'unit', cost: { N: 2, G: 2 }, atk: 5, def: 4,
        rarity: 'uncommon', text: '' });
  def({ id: 'heartwood_grove', name: 'Heartwood Grove', type: 'location', cost: { N: 3, G: 2 },
        rarity: 'rare', effect: { kind: 'location', a: 1, d: 1 }, target: null, text: 'Units you control get +1/+1.' });
  def({ id: 'gaiathar', name: 'Gaiathar, First Forest', type: 'unit', cost: { N: 5, G: 4 }, atk: 10, def: 11,
        rarity: 'titan', text: '' });

  /* ---- Earth ---- */
  def({ id: 'shale_skirmisher', name: 'Shale Skirmisher', type: 'unit', cost: { E: 2 }, atk: 3, def: 3, text: '' });
  def({ id: 'tunnel_digger', name: 'Tunnel Digger', type: 'unit', cost: { E: 1 }, atk: 1, def: 3, text: '' });
  def({ id: 'brace', name: 'Brace', type: 'spell', cost: { E: 1, G: 1 },
        effect: { kind: 'buff', a: 0, d: 4, temp: true }, target: 'ownUnit',
        text: 'Target unit you control gets +0/+4 until end of turn.' });
  def({ id: 'obsidian_warden', name: 'Obsidian Warden', type: 'unit', cost: { E: 3, G: 2 }, atk: 4, def: 7,
        rarity: 'uncommon', keywords: ['guard'], text: 'Guard.' });
  def({ id: 'landslide', name: 'Landslide', type: 'action', cost: { E: 3, G: 2 },
        rarity: 'uncommon', effect: { kind: 'dmgRow', n: 2 }, target: 'row',
        text: 'Deal 2 damage to each enemy unit in target row.' });
  def({ id: 'ramparts_low_city', name: 'Ramparts of the Low City', type: 'location', cost: { E: 3, G: 3 },
        rarity: 'rare', effect: { kind: 'location', a: 0, d: 2 }, target: null, text: 'Units you control get +0/+2.' });
  def({ id: 'korrun', name: 'Korrun, the Unmoved', type: 'unit', cost: { E: 5, G: 4 }, atk: 7, def: 12,
        rarity: 'titan', keywords: ['guard'], text: 'Guard.' });

  /* ---- Light ---- */
  def({ id: 'vanguard_squire', name: 'Vanguard Squire', type: 'unit', cost: { L: 1 }, atk: 1, def: 3, text: '' });
  def({ id: 'lance_corporal', name: 'Lance Corporal', type: 'unit', cost: { L: 2, G: 1 }, atk: 4, def: 2, text: '' });
  def({ id: 'prayer_of_ranks', name: 'Prayer of the Ranks', type: 'action', cost: { L: 1, G: 1 },
        effect: { kind: 'gainLife', n: 4 }, target: null, text: 'You gain 4 life.' });
  def({ id: 'exemplar_of_duty', name: 'Exemplar of Duty', type: 'unit', cost: { L: 3, G: 1 }, atk: 5, def: 4,
        rarity: 'uncommon', text: '' });
  def({ id: 'sun_shield', name: 'Sun Shield', type: 'augment', cost: { L: 1, G: 1 },
        rarity: 'uncommon', effect: { kind: 'augment', a: 0, d: 3 }, target: 'ownUnit', text: 'Attached unit gets +0/+3.' });
  def({ id: 'sunburst_avatar', name: 'Sunburst Avatar', type: 'unit', cost: { L: 4, G: 2 }, atk: 6, def: 6,
        rarity: 'rare', text: '' });
  def({ id: 'aurelion', name: 'Aurelion, the Summit Throne', type: 'unit', cost: { L: 5, G: 4 }, atk: 8, def: 9,
        rarity: 'titan', text: '' });

  /* ---- Dark ---- */
  def({ id: 'crypt_lurker', name: 'Crypt Lurker', type: 'unit', cost: { D: 2, G: 1 }, atk: 3, def: 3, text: '' });
  def({ id: 'bleed', name: 'Bleed', type: 'spell', cost: { D: 1, G: 1 },
        effect: { kind: 'dmgUnit', n: 2 }, target: 'anyUnit', text: 'Deal 2 damage to target unit.' });
  def({ id: 'night_prowler', name: 'Night Prowler', type: 'unit', cost: { D: 1, G: 1 }, atk: 3, def: 1, text: '' });
  def({ id: 'gravemarsh_ghoul', name: 'Gravemarsh Ghoul', type: 'unit', cost: { D: 2, G: 2 }, atk: 4, def: 4,
        rarity: 'uncommon', text: '' });
  def({ id: 'death_toll', name: 'Death Toll', type: 'spell', cost: { D: 2, G: 2 },
        rarity: 'uncommon', effect: { kind: 'dmgPlayer', n: 3 }, target: null,
        text: 'Deal 3 damage to the enemy player.' });
  def({ id: 'butcher_of_hopes', name: 'Butcher of Hopes', type: 'unit', cost: { D: 4, G: 2 }, atk: 7, def: 5,
        rarity: 'rare', text: '' });
  def({ id: 'vhorgoth', name: 'Vhorgoth, Hunger Eternal', type: 'unit', cost: { D: 5, G: 4 }, atk: 9, def: 7,
        rarity: 'titan', text: '' });

  /* ---- Void ---- */
  def({ id: 'rift_stalker', name: 'Rift Stalker', type: 'unit', cost: { G: 5 }, atk: 5, def: 5,
        rarity: 'uncommon', text: 'Void. May be included in any deck, in any number.' });
  def({ id: 'unmake', name: 'Unmake', type: 'spell', cost: { G: 7 },
        rarity: 'rare', effect: { kind: 'destroy' }, target: 'anyUnit',
        text: 'Void. Destroy target unit.' });

  /* ---- Dual-faction rares (for the two-color Leaders) ---- */
  def({ id: 'hatefire', name: 'Hatefire', type: 'spell', cost: { F: 1, D: 1 },
        rarity: 'rare', effect: { kind: 'dmgUnit', n: 4 }, target: 'anyUnit', text: 'Deal 4 damage to target unit.' });
  def({ id: 'wildheart_ravager', name: 'Wildheart Ravager', type: 'unit', cost: { F: 1, N: 1, G: 1 }, atk: 5, def: 4,
        rarity: 'rare', keywords: ['hasty'], text: 'Hasty.' });
  def({ id: 'mirrorlight_sentinel', name: 'Mirrorlight Sentinel', type: 'unit', cost: { W: 1, L: 1, G: 1 }, atk: 4, def: 5,
        rarity: 'rare', text: '' });
  def({ id: 'drowned_whisperer', name: 'Drowned Whisperer', type: 'unit', cost: { W: 1, D: 1, G: 1 }, atk: 4, def: 4,
        rarity: 'rare', move: 2, keywords: ['swift'], text: 'Swift.' });
  def({ id: 'citadel_colossus', name: 'Citadel Colossus', type: 'unit', cost: { E: 1, L: 1, G: 2 }, atk: 5, def: 8,
        rarity: 'rare', keywords: ['guard'], text: 'Guard.' });
  def({ id: 'verdant_rampart', name: 'Verdant Rampart', type: 'unit', cost: { E: 1, N: 1, G: 1 }, atk: 3, def: 7,
        rarity: 'rare', keywords: ['guard'], text: 'Guard.' });

  /* ---- Expansion Leaders ---- */
  def({ id: 'leader_ashka', name: 'Ashka, Pyre of the Fallen', type: 'leader', cost: { F: 1, D: 1, G: 1 },
        atk: 4, def: 3, keywords: ['hasty'], unique: true, rarity: 'leader', text: 'Hasty.' });
  def({ id: 'leader_grovnar', name: 'Grovnar, Wildfire Shaman', type: 'leader', cost: { F: 1, N: 1, G: 1 },
        atk: 4, def: 4, unique: true, rarity: 'leader', text: '' });
  def({ id: 'leader_serelia', name: 'Serelia, Mirror Magistrate', type: 'leader', cost: { W: 1, L: 1, G: 1 },
        atk: 3, def: 4, unique: true, rarity: 'leader', text: '' });
  def({ id: 'leader_nix', name: 'Nix, Whisper of the Depths', type: 'leader', cost: { W: 1, D: 1, G: 1 },
        atk: 3, def: 3, move: 2, keywords: ['swift'], unique: true, rarity: 'leader', text: 'Swift.' });
  def({ id: 'leader_ossic', name: 'Tribune Ossic, the Adamant', type: 'leader', cost: { E: 1, L: 1, G: 1 },
        atk: 2, def: 6, keywords: ['guard'], unique: true, rarity: 'leader', text: 'Guard.' });
  def({ id: 'leader_thaelen', name: 'Thaelen, Root-Warden', type: 'leader', cost: { E: 1, N: 1, G: 2 },
        atk: 4, def: 6, unique: true, rarity: 'leader', text: '' });
  def({ id: 'leader_cindra', name: 'Cindra, Ember Queen', type: 'leader', cost: { F: 1, G: 1 },
        atk: 3, def: 2, keywords: ['hasty'], unique: true, rarity: 'leader', text: 'Hasty.' });
  def({ id: 'leader_mirren', name: 'Tidelord Mirren', type: 'leader', cost: { W: 2, G: 2 },
        atk: 4, def: 5, unique: true, rarity: 'leader', text: '' });
  def({ id: 'leader_bramm', name: 'Oakfather Bramm', type: 'leader', cost: { N: 2, G: 3 },
        atk: 6, def: 6, unique: true, rarity: 'leader', text: '' });
  def({ id: 'leader_hollow', name: 'The Hollow Crown', type: 'leader', cost: { G: 3 },
        atk: 3, def: 3, unique: true, rarity: 'leader',
        text: 'Void. Its identity holds no energy type: only Void and generic-cost cards.' });

  /* ---------- Derived info ---------- */

  /* Typed energy symbols in a card's cost — its faction identity. */
  function costSymbols(c) {
    return Object.keys(c.cost || {}).filter(k => k !== 'G');
  }

  /* Cards that can appear in booster packs: everything except energy and Leaders. */
  const COLLECTIBLES = Object.values(C)
    .filter(c => c.type !== 'energy' && c.type !== 'leader')
    .map(c => c.id);

  /* ---------- Prebuilt decks, generated from the pool ----------
   * Selection is deterministic: within each rarity, cheapest first. */

  function costTotal(c) { return Object.values(c.cost).reduce((a, b) => a + b, 0); }

  function poolFor(pred) {
    return Object.values(C)
      .filter(c => c.type !== 'energy' && c.type !== 'leader' && pred(c))
      .sort((a, b) => (costTotal(a) - costTotal(b)) || a.id.localeCompare(b.id));
  }
  function take(pool, rarity, n, copies, list) {
    for (const c of pool.filter(c => c.rarity === rarity).slice(0, n)) list.push([c.id, copies]);
  }

  /* Mono deck: 20 energy + commons 7×3, uncommons 5×2, rares 2×1, titan 1. (54) */
  function genMono(sym, energyId) {
    const pool = poolFor(c => { const s = costSymbols(c); return s.length === 1 && s[0] === sym; });
    const list = [[energyId, 19], ['energy_void', 1]];
    take(pool, 'common', 7, 3, list);
    take(pool, 'uncommon', 5, 2, list);
    take(pool, 'rare', 2, 1, list);
    take(pool, 'titan', 1, 1, list);
    return list;
  }

  /* Dual deck: 20 energy + per faction commons 5×2, uncommons 3×1, rare 1×1,
   * plus every dual card of the pair ×1 and the pair's cheapest titan. (~50) */
  function genDual(symA, symB, energyA, energyB) {
    const list = [[energyA, 10], [energyB, 9], ['energy_void', 1]];
    for (const sym of [symA, symB]) {
      const pool = poolFor(c => { const s = costSymbols(c); return s.length === 1 && s[0] === sym; });
      take(pool, 'common', 5, 2, list);
      take(pool, 'uncommon', 3, 1, list);
      take(pool, 'rare', 1, 1, list);
    }
    const duals = poolFor(c => {
      const s = costSymbols(c);
      return s.length === 2 && s.every(x => x === symA || x === symB);
    });
    for (const c of duals) list.push([c.id, 1]);
    const titans = poolFor(c => {
      const s = costSymbols(c);
      return c.rarity === 'titan' && s.length === 1 && (s[0] === symA || s[0] === symB);
    });
    if (titans.length > 0) list.push([titans[0].id, 1]);
    return list;
  }

  /* Void deck: colorless identity — Void cards in any number. */
  function genVoid() {
    return [['energy_void', 20],
      ['void_crawler', 6], ['void_pulse', 4], ['void_spawn', 4], ['rift_stalker', 3],
      ['rift_horror', 2], ['null_titan', 2], ['unmake', 2], ['entropy_titan', 1]];
  }

  const DECKS = {
    fire:    { name: 'Fire — Ashborn Uprising',        leader: 'leader_fire',    cards: genMono('F', 'energy_fire') },
    water:   { name: 'Water — Tidebound Court',        leader: 'leader_water',   cards: genMono('W', 'energy_water') },
    nature:  { name: 'Nature — Rootking Horde',        leader: 'leader_nature',  cards: genMono('N', 'energy_nature') },
    earth:   { name: 'Earth — Unbroken Bulwark',       leader: 'leader_earth',   cards: genMono('E', 'energy_earth') },
    light:   { name: 'Light — Rank and File',          leader: 'leader_light',   cards: genMono('L', 'energy_light') },
    dark:    { name: 'Dark — The Casteless',           leader: 'leader_dark',    cards: genMono('D', 'energy_dark') },
    cindra:  { name: 'Fire — Cindra’s Vanguard',  leader: 'leader_cindra',  cards: genMono('F', 'energy_fire') },
    mirren:  { name: 'Water — Mirren’s Armada',   leader: 'leader_mirren',  cards: genMono('W', 'energy_water') },
    bramm:   { name: 'Nature — Bramm’s Grove',    leader: 'leader_bramm',   cards: genMono('N', 'energy_nature') },
    ashka:   { name: 'Fire/Dark — Pyre of the Fallen', leader: 'leader_ashka',   cards: genDual('F', 'D', 'energy_fire', 'energy_dark') },
    grovnar: { name: 'Fire/Nature — Wildfire Rite',    leader: 'leader_grovnar', cards: genDual('F', 'N', 'energy_fire', 'energy_nature') },
    serelia: { name: 'Water/Light — Mirror Court',     leader: 'leader_serelia', cards: genDual('W', 'L', 'energy_water', 'energy_light') },
    nix:     { name: 'Water/Dark — Drowned Whispers',  leader: 'leader_nix',     cards: genDual('W', 'D', 'energy_water', 'energy_dark') },
    ossic:   { name: 'Earth/Light — Adamant Tribunal', leader: 'leader_ossic',   cards: genDual('E', 'L', 'energy_earth', 'energy_light') },
    thaelen: { name: 'Earth/Nature — Rooted Bulwark',  leader: 'leader_thaelen', cards: genDual('E', 'N', 'energy_earth', 'energy_nature') },
    hollow:  { name: 'Void — The Hollow Crown',        leader: 'leader_hollow',  cards: genVoid() },
  };

  /* ---------- Booster packs ----------
   * 8 cards: 5 commons, 2 uncommons, 1 rare — 15% of rare slots upgrade
   * to a titan. Drawn from the full collectible pool, Void included. */
  const PACK = {
    size: 8,
    slots: [
      { rarity: 'common', count: 5 },
      { rarity: 'uncommon', count: 2 },
      { rarity: 'rare', count: 1, upgradeTo: 'titan', upgradeChance: 0.15 },
    ],
  };

  /* ---------- Custom deck validation (deck builder) ----------
   * cardCounts: {cardId: copies}. collectionCards: {cardId: owned}.
   * Rules: 40–60 cards; every symbol in a card's cost must appear in the
   * Leader's identity; 3-copy limit (1 for unique) except basic energy and
   * Void cards, which are unlimited (Void Rift itself is capped at 3); you
   * cannot run more copies of a collectible than you own. */
  function validateDeck(leaderId, cardCounts, collectionCards) {
    const errors = [];
    const leader = C[leaderId];
    if (!leader || leader.type !== 'leader') errors.push('Choose a Leader.');
    const identity = leader ? costSymbols(leader) : [];
    let total = 0;
    for (const [id, n] of Object.entries(cardCounts)) {
      if (!n || n <= 0) continue;
      const c = C[id];
      if (!c || c.type === 'leader') { errors.push(`Illegal card: ${id}.`); continue; }
      total += n;
      const syms = costSymbols(c);
      if (!syms.every(s => identity.includes(s)))
        errors.push(`${c.name} falls outside your Leader's faction identity.`);
      const isVoidCard = c.type !== 'energy' && syms.length === 0;
      if (c.type === 'energy') {
        if (id === 'energy_void' && n > 3) errors.push('Void Rift is limited to 3 copies.');
      } else if (!isVoidCard) {
        const limit = c.unique ? 1 : 3;
        if (n > limit) errors.push(`${c.name}: at most ${limit} ${limit === 1 ? 'copy' : 'copies'}.`);
      }
      if (c.type !== 'energy') {
        const owned = (collectionCards && collectionCards[id]) || 0;
        if (n > owned) errors.push(`${c.name}: you own ${owned}, the deck runs ${n}.`);
      }
    }
    if (total < 40) errors.push(`${total} cards — a deck needs at least 40.`);
    if (total > 60) errors.push(`${total} cards — a deck may hold at most 60.`);
    return { ok: errors.length === 0, errors, total };
  }

  const ENERGY_NAMES = { F: 'Fire', W: 'Water', N: 'Nature', E: 'Earth', L: 'Light', D: 'Dark', V: 'Void', G: 'Generic' };

  globalThis.TCG_CARDS = C;
  globalThis.TCG_DECKS = DECKS;
  globalThis.TCG_VALIDATE_DECK = validateDeck;
  globalThis.TCG_PACK = PACK;
  globalThis.TCG_COLLECTIBLES = COLLECTIBLES;
  globalThis.TCG_COST_SYMBOLS = costSymbols;
  globalThis.TCG_ENERGY_NAMES = ENERGY_NAMES;
})();
