'use strict';
/* Spieldaten: Kämpfer, Gegner, Sagas, Techniken, Passive, Relikte, Meta */

const MAX_TECHS = 4;
const RAR = { c: 'GEWÖHNLICH', r: 'SELTEN', e: 'EPISCH', l: 'RELIKT' };

/* ---------- Kämpfer ---------- */
const CHARS = {
  goku:    { n: 'Son Goku', hp: 120, atk: 14, def: 2, ki: 100, regen: 8, crit: .05, start: ['kamehameha'], cost: 0, ac: '#ff9a1f', mods: {},
             p: { skin: '#f6c8a0', hair: 'goku', hc: '#1b1b1f', top: '#ff7a12', bot: '#ff7a12', inner: '#1f4fc0', belt: '#1f4fc0', boots: '#1f4fc0', wrist: '#1f4fc0' },
             d: 'Ausgewogen. Startet mit Kamehameha.' },
  vegeta:  { n: 'Vegeta', hp: 105, atk: 16, def: 2, ki: 100, regen: 8, crit: .1, start: ['galick'], cost: 120, ac: '#4d7dff', mods: { atkPct: .1 },
             p: { skin: '#f6c8a0', hair: 'vegeta', hc: '#1b1b1f', top: '#2a55c8', bot: '#2a55c8', inner: '#2a55c8', belt: '#2a55c8', boots: '#f4f4f4', wrist: '#f4f4f4', ex: ['saiarmor'] },
             d: 'Glaskanone: +10% Angriff, +10% Krit. Startet mit Galick Ho.' },
  piccolo: { n: 'Piccolo', hp: 135, atk: 12, def: 4, ki: 100, regen: 8, crit: .05, start: ['makankosappo'], cost: 200, ac: '#7ccf62', mods: { hpRegen: .8 },
             p: { skin: '#7ccf62', hair: 'none', hc: '#000', top: '#7a3db8', bot: '#7a3db8', inner: '#7a3db8', belt: '#2a55c8', boots: '#6b3a1d', wrist: '#2a55c8', ex: ['cape', 'turban', 'antennae'] },
             d: 'Zäh: regeneriert 0,8 LP/s, +Rüstung. Startet mit Makankosappo.' },
  gohan:   { n: 'Son Gohan', hp: 115, atk: 13, def: 2, ki: 110, regen: 9, crit: .05, start: ['masenko'], cost: 320, ac: '#b685ff', mods: {},
             p: { skin: '#f6c8a0', hair: 'gohan', hc: '#1b1b1f', top: '#6a2cc0', bot: '#6a2cc0', inner: '#6a2cc0', belt: '#d83b3b', boots: '#2a55c8', wrist: '#d83b3b', ex: ['cape'] },
             d: 'Verborgene Kraft: bis zu +70% Angriff bei niedrigen LP. Startet mit Masenko.' },
  krillin: { n: 'Krillin', hp: 100, atk: 12, def: 2, ki: 120, regen: 11, crit: .12, start: ['destructo'], cost: 260, ac: '#ffb347', mods: { spdPct: .1 },
             p: { skin: '#f6c8a0', hair: 'bald', hc: '#000', top: '#ff7a12', bot: '#ff7a12', inner: '#1f4fc0', belt: '#1f4fc0', boots: '#1f4fc0', wrist: '#1f4fc0', build: 'small', ex: ['dots'] },
             d: 'Flink: +10% Tempo, viel Ki, +12% Krit. Startet mit Destructo-Scheibe.' },
  trunks:  { n: 'Trunks', hp: 110, atk: 15, def: 3, ki: 100, regen: 8, crit: .08, start: ['kiai'], cost: 450, ac: '#c9a0ff', mods: { critDmg: .4 },
             p: { skin: '#f6c8a0', hair: 'trunks', hc: '#a98cf0', top: '#2a3fa0', bot: '#555d7a', inner: '#3a2a70', belt: '#8a5a2a', boots: '#6b3a1d', wrist: '#2a3fa0', ex: ['sword'] },
             d: 'Schwertkämpfer: +40% Krit-Schaden. Startet mit Kiai.' },
};

/* ---------- Gegner (Aussehen als Parameter für art.js) ---------- */
const E = (n, p, o = {}) => Object.assign({ n, p, size: 1 }, o);
const ENEMY = {
  saibaman: E('Saibaman', { skin: '#6bb04a', hair: 'bald', hc: '#000', top: '#6bb04a', bot: '#6bb04a', build: 'small', ex: ['saiba'], eye: '#e33' }, { size: .8 }),
  scout:    E('Saiyajin-Späher', { skin: '#f0c090', hair: 'raditz', hc: '#2a1b12', top: '#8a5a2a', bot: '#3a3a3a', inner: '#3a3a3a', belt: '#222', boots: '#222', ex: ['saiarmor', 'scouter'] }),
  soldier:  E('Roter Soldat', { skin: '#f0c090', hair: 'none', hc: '#000', top: '#9a8a3a', bot: '#6b6a2a', inner: '#9a8a3a', belt: '#222', boots: '#222', ex: ['helmet'] }),
  nappa:    E('Nappa', { skin: '#e8b78a', hair: 'bald', hc: '#000', top: '#8a5a2a', bot: '#3a3a3a', inner: '#3a3a3a', belt: '#222', boots: '#f4f4f4', build: 'big', ex: ['saiarmor', 'mustache'] }, { size: 1.15 }),
  raditz:   E('Raditz', { skin: '#e8b78a', hair: 'raditz', hc: '#14110f', top: '#8a5a2a', bot: '#3a3a3a', inner: '#3a3a3a', belt: '#222', boots: '#222', ex: ['saiarmor', 'tail', 'scouter'] }, { size: 1.15 }),
  dodoria:  E('Dodoria', { skin: '#ff8ab0', hair: 'bald', hc: '#000', top: '#8a5a2a', bot: '#3a3a3a', inner: '#3a3a3a', belt: '#222', boots: '#222', build: 'big', ex: ['saiarmor', 'spikes'] }, { size: 1.2 }),
  zarbon:   E('Zarbon', { skin: '#b9e3d0', hair: 'long', hc: '#2d8a6a', top: '#8a5a2a', bot: '#f4f4f4', inner: '#3a3a3a', belt: '#222', boots: '#f4f4f4', ex: ['saiarmor'] }),
  recoome:  E('Recoome', { skin: '#f0c090', hair: 'recoome', hc: '#ff8a1f', top: '#8a5a2a', bot: '#3a3a3a', inner: '#3a3a3a', belt: '#222', boots: '#222', build: 'big', ex: ['saiarmor'] }, { size: 1.2 }),
  guldo:    E('Guldo', { skin: '#8fcf6a', hair: 'bald', hc: '#000', top: '#8a5a2a', bot: '#3a3a3a', inner: '#3a3a3a', belt: '#222', boots: '#222', build: 'small', ex: ['saiarmor', 'eyes4'] }, { size: .85 }),
  burter:   E('Burter', { skin: '#5aa0e0', hair: 'goku', hc: '#f4f4f4', top: '#8a5a2a', bot: '#3a3a3a', inner: '#3a3a3a', belt: '#222', boots: '#222', build: 'big', ex: ['saiarmor'] }, { size: 1.15 }),
  ginyu:    E('Captain Ginyu', { skin: '#a46bd6', hair: 'bald', hc: '#000', top: '#8a5a2a', bot: '#f4f4f4', inner: '#3a3a3a', belt: '#222', boots: '#f4f4f4', ex: ['saiarmor', 'horns'] }, { size: 1.1 }),
  fsoldier: E('Freezer-Soldat', { skin: '#d8a0e8', hair: 'bald', hc: '#000', top: '#6a2a9a', bot: '#3a3a3a', inner: '#3a3a3a', belt: '#222', boots: '#222', ex: ['saiarmor', 'scouter'] }),
  vegeta:   E('Vegeta', { skin: '#f6c8a0', hair: 'vegeta', hc: '#1b1b1f', top: '#2a55c8', bot: '#2a55c8', inner: '#2a55c8', belt: '#2a55c8', boots: '#f4f4f4', wrist: '#f4f4f4', ex: ['saiarmor', 'tail'] }, { size: 1.2 }),
  freezer:  E('Freezer', { skin: '#f2eefc', hair: 'bald', hc: '#000', top: '#7a3db8', bot: '#f2eefc', inner: '#f2eefc', belt: '#7a3db8', boots: '#7a3db8', build: 'slim', ex: ['horns', 'tail', 'fzparts'] }, { size: 1.3 }),
  gerobot:  E('Gero-Roboter', { skin: '#9aa6b8', hair: 'none', hc: '#000', top: '#566178', bot: '#566178', inner: '#566178', belt: '#222', boots: '#222', ex: ['visor'] }),
  cellJr:   E('Cell Jr.', { skin: '#5aa0e0', hair: 'bald', hc: '#000', top: '#5aa0e0', bot: '#5aa0e0', inner: '#232d5a', belt: '#232d5a', boots: '#232d5a', build: 'small', ex: ['spots'] }, { size: .85 }),
  android19:E('Android 19', { skin: '#f4f4f4', hair: 'bald', hc: '#000', top: '#2a55c8', bot: '#2a55c8', inner: '#2a55c8', belt: '#d83b3b', boots: '#d83b3b', build: 'big', ex: ['clown'] }, { size: 1.15 }),
  gero:     E('Dr. Gero', { skin: '#f0d8c0', hair: 'bald', hc: '#e8e8e8', top: '#2a55c8', bot: '#2a55c8', inner: '#2a55c8', belt: '#2a55c8', boots: '#333', build: 'small', ex: ['hat', 'mustache', 'glasses'] }, { size: .95 }),
  android16:E('Android 16', { skin: '#f0c090', hair: 'raditz', hc: '#d8561f', top: '#5a8a3a', bot: '#5a8a3a', inner: '#3a3a3a', belt: '#222', boots: '#222', build: 'big', ex: ['saiarmor'] }, { size: 1.3 }),
  android17:E('Android 17', { skin: '#f0c090', hair: 'long', hc: '#14110f', top: '#ff7a12', bot: '#444', inner: '#222', belt: '#222', boots: '#6b3a1d', ex: ['scarf'] }),
  android18:E('Android 18', { skin: '#f6d8b8', hair: 'long', hc: '#ffe14a', top: '#4a6aa8', bot: '#4a6aa8', inner: '#f4f4f4', belt: '#222', boots: '#6b3a1d', build: 'slim', ex: ['scarf'] }),
  cell1:    E('Semi-Perfect Cell', { skin: '#7fb85a', hair: 'bald', hc: '#000', top: '#7fb85a', bot: '#7fb85a', inner: '#2a2a2a', belt: '#2a2a2a', boots: '#2a2a2a', build: 'big', ex: ['spots', 'wings', 'cellhead'] }, { size: 1.25 }),
  cell2:    E('Perfect Cell', { skin: '#8fd060', hair: 'bald', hc: '#000', top: '#8fd060', bot: '#8fd060', inner: '#222', belt: '#222', boots: '#222', ex: ['spots', 'cellhead'] }, { size: 1.3 }),
  puipui:   E('Pui Pui', { skin: '#c85ad6', hair: 'bald', hc: '#000', top: '#6a2a9a', bot: '#3a2a70', inner: '#3a2a70', belt: '#222', boots: '#222', build: 'big', ex: ['horns'] }, { size: 1.1 }),
  yakon:    E('Yakon', { skin: '#e8a050', hair: 'bald', hc: '#000', top: '#6a8a2a', bot: '#3a3a3a', inner: '#3a3a3a', belt: '#222', boots: '#222', build: 'big', ex: ['spikes'] }, { size: 1.15 }),
  spopo:    E('Spopovich', { skin: '#9a6ad6', hair: 'bald', hc: '#000', top: '#222', bot: '#222', inner: '#222', belt: '#222', boots: '#222', build: 'big', ex: ['visor'] }, { size: 1.2 }),
  dabura:   E('Dabura', { skin: '#e03838', hair: 'raditz', hc: '#e8e8e8', top: '#222', bot: '#222', inner: '#222', belt: '#d8b020', boots: '#222', build: 'big', ex: ['cape', 'mustache'] }, { size: 1.3 }),
  fatbuu:   E('Majin Boo', { skin: '#ff9ac0', hair: 'none', hc: '#000', top: '#ff9ac0', bot: '#f4f4f4', inner: '#ff9ac0', belt: '#d8b020', boots: '#2a55c8', build: 'big', ex: ['buuhead', 'cape'] }, { size: 1.35 }),
  buuclone: E('Buu-Klon', { skin: '#ffb0cc', hair: 'none', hc: '#000', top: '#ffb0cc', bot: '#8a5a2a', inner: '#ffb0cc', belt: '#8a5a2a', boots: '#8a5a2a', build: 'small', ex: ['buuhead'] }, { size: .9 }),
  superbuu: E('Super Boo', { skin: '#ff8ab0', hair: 'none', hc: '#000', top: '#ff8ab0', bot: '#222', inner: '#ff8ab0', belt: '#d8b020', boots: '#2a55c8', ex: ['buuhead', 'cape'] }, { size: 1.3 }),
  kidbuu:   E('Kid Boo', { skin: '#ff9ac0', hair: 'none', hc: '#000', top: '#ff9ac0', bot: '#222', inner: '#ff9ac0', belt: '#222', boots: '#222', build: 'small', ex: ['buuhead'], eye: '#c11' }, { size: 1.15 }),
};

/* ---------- Eigenschaften der Gegner ---------- */
const TRAITS = {
  armor:   { i: '🛡️', n: 'Panzerung', d: '+60% Rüstung – Durchdringende Techniken (Pierce) wirken stark' },
  fast:    { i: '💨', n: 'Flink', d: 'Greift 30% schneller an' },
  regen:   { i: '💚', n: 'Regeneration', d: 'Heilt 1% LP pro Sekunde' },
  drain:   { i: '🧛', n: 'Saugend', d: 'Heilt sich um 40% des verursachten Schadens' },
  barrage: { i: '🔥', n: 'Sperrfeuer', d: 'Jeder 3. Angriff trifft dreimal' },
  berserk: { i: '😡', n: 'Berserker', d: 'Wird mit sinkenden LP bis zu 40% schneller' },
};
const TRAIT_KEYS = Object.keys(TRAITS);

/* ---------- Sagas ---------- */
const SAGAS = {
  saiyan: { n: 'Saiyajin-Saga', short: 'Saiyajin', i: '🌍', d: 'Der Einstieg: Raditz, Vegeta und Freezer. 15 Etagen.',
            floors: 15, off: 0, zmul: 1, req: null,
            win: 'Freezer ist besiegt – Namek ist gerettet!',
            acts: [
              { n: 'Erde', bg: 'earth', pool: ['saibaman', 'scout', 'soldier'], elite: ['nappa'], boss: 'raditz' },
              { n: 'Namek', bg: 'namek', pool: ['dodoria', 'zarbon', 'saibaman', 'guldo'], elite: ['recoome', 'burter'], boss: 'vegeta' },
              { n: "Freezers Raumschiff", bg: 'space', pool: ['fsoldier', 'guldo', 'burter', 'zarbon'], elite: ['ginyu', 'recoome'], boss: 'freezer' },
            ] },
  cell:   { n: 'Cell-Saga', short: 'Cell', i: '🪲', d: 'Androiden und Cell. 20 Etagen. Nach dem ersten Sieg in der Saiyajin-Saga.',
            floors: 20, off: 3, zmul: 1.8, req: 'saiyan',
            win: 'Perfect Cell ist besiegt – die Erde ist sicher!',
            acts: [
              { n: 'Wüste', bg: 'wasteland', pool: ['gerobot', 'cellJr', 'scout'], elite: ['android19'], boss: 'gero' },
              { n: 'Stadt in Trümmern', bg: 'city', pool: ['cellJr', 'android16', 'gerobot'], elite: ['android16', 'android19'], boss: 'android17' },
              { n: 'Raum von Geist und Zeit', bg: 'chamber', pool: ['cellJr', 'android17', 'gerobot'], elite: ['android18', 'android16'], boss: 'cell1' },
              { n: 'Cell-Spiele', bg: 'arena', pool: ['cellJr', 'android18', 'cell1'], elite: ['cell1', 'android17'], boss: 'cell2' },
            ] },
  buu:    { n: 'Boo-Saga', short: 'Boo', i: '🍬', d: 'Dabura, Boo und Kid Boo. 20 Etagen. Nach dem ersten Sieg in der Cell-Saga.',
            floors: 20, off: 6, zmul: 2.6, req: 'cell',
            win: 'Kid Boo ist besiegt – das Universum ist gerettet!',
            acts: [
              { n: 'Kamis Palast', bg: 'lookout', pool: ['puipui', 'yakon', 'spopo'], elite: ['yakon', 'spopo'], boss: 'dabura' },
              { n: 'Boos Haus', bg: 'buuhouse', pool: ['buuclone', 'puipui', 'spopo'], elite: ['puipui', 'dabura'], boss: 'fatbuu' },
              { n: 'Jenseits', bg: 'otherworld', pool: ['buuclone', 'dabura', 'spopo'], elite: ['fatbuu'], boss: 'superbuu' },
              { n: 'Zerstörte Welt', bg: 'ruins', pool: ['buuclone', 'superbuu', 'fatbuu'], elite: ['superbuu'], boss: 'kidbuu' },
            ] },
};
const SAGA_KEYS = Object.keys(SAGAS);

/* ---------- Techniken ---------- */
// fx: Effektart für fx.js, col: Farbe
const TECH = {
  kamehameha:   { n: 'Kamehameha', i: '🌊', cost: 40, cd: 2, r: 'c', mult: 3.2, fx: 'beam', col: '#4db8ff', d: 'Energiewelle: 320% Schaden' },
  kiblast:      { n: 'Ki-Salve', i: '✨', cost: 15, cd: 1, r: 'c', mult: .7, hits: 3, fx: 'orbs', col: '#8fd8ff', d: '3 Treffer à 70%' },
  kiai:         { n: 'Kiai', i: '💥', cost: 25, cd: 4, r: 'c', mult: 1.2, stun: 2.5, fx: 'ring', col: '#ffffff', d: '120% Schaden, betäubt 2,5s, unterbricht Aufladungen' },
  galick:       { n: 'Galick Ho', i: '🟣', cost: 40, cd: 2, r: 'c', mult: 3.3, fx: 'beam', col: '#c15bff', d: 'Violette Welle: 330% Schaden' },
  masenko:      { n: 'Masenko', i: '☀️', cost: 35, cd: 2, r: 'c', mult: 2.8, fx: 'beam', col: '#ffe14a', d: 'Gebündelter Schlag: 280% Schaden' },
  powerup:      { n: 'Ki sammeln', i: '🔋', cost: 0, cd: 9, r: 'c', kigain: 40, fx: 'powerup', col: '#ffe14a', d: 'Sofort +40 Ki' },
  makankosappo: { n: 'Makankosappo', i: '🌀', cost: 50, cd: 3, r: 'r', mult: 3.8, pierce: true, fx: 'beam', col: '#ff7bd5', d: '380% Schaden, ignoriert Rüstung' },
  teleport:     { n: 'Instant Transmission', i: '⚡', cost: 25, cd: 5, r: 'r', dodge: 3, fx: 'blink', col: '#9fe9ff', d: 'Weicht 3s allen Angriffen aus, nächster Treffer kritisch' },
  heal:         { n: 'Dendes Heilung', i: '💚', cost: 45, cd: 12, r: 'r', heal: .22, fx: 'heal', col: '#3ddc84', d: 'Heilt 22% der Max-LP (12s Abklingzeit)' },
  taiyoken:     { n: 'Solar Flare', i: '🌞', cost: 25, cd: 8, r: 'r', blind: 4, fx: 'flash', col: '#ffffff', d: 'Blendet den Gegner 4s: seine Angriffe gehen ins Leere' },
  kishield:     { n: 'Ki-Barriere', i: '🛡️', cost: 35, cd: 10, r: 'r', shield: .3, fx: 'shield', col: '#7fe0ff', d: 'Schild: absorbiert Schaden in Höhe von 30% Max-LP (8s)' },
  combo:        { n: 'Kombo-Angriff', i: '👊', cost: 20, cd: 5, r: 'r', combo: 6, fx: 'combo', col: '#ffb347', d: 'Die nächsten 6 Standardangriffe machen ×2,2 Schaden' },
  bigbang:      { n: 'Big Bang Attack', i: '🔴', cost: 45, cd: 3, r: 'r', mult: 2, burn: 5, fx: 'sphere', col: '#ff6a3d', d: '200% Schaden + Verbrennung (5s)' },
  destructo:    { n: 'Destructo-Scheibe', i: '🔪', cost: 35, cd: 2, r: 'r', mult: 3, pierce: true, lock: 'destructo', fx: 'disc', col: '#ffd83a', d: '300% Schaden, ignoriert Rüstung' },
  form:         { n: 'Transformation', i: '⚡', cost: 50, cd: 24, r: 'e', form: true, lock: 'form', fx: 'form', col: '#ffe14a', d: 'Verwandlung: wird mit jedem Aufstieg stärker (Kaio-Ken → Super Saiyajin → … → Ultra Instinct)' },
  genkidama:    { n: 'Genkidama', i: '🔵', cost: 90, cd: 8, r: 'e', mult: 8, lock: 'genkidama', fx: 'sphere', col: '#8fd8ff', d: 'Die ultimative Kugel: 800% Schaden' },
  finalflash:   { n: 'Final Flash', i: '🟡', cost: 75, cd: 5, r: 'e', mult: 6.5, lock: 'finalflash', fx: 'beam', col: '#ffd05a', d: 'Gleißender Strahl: 650% Schaden' },
  hakai:        { n: 'Hakai', i: '🟪', cost: 60, cd: 12, r: 'e', hakai: .25, lock: 'hakai', fx: 'sphere', col: '#a06bff', d: 'Zerstört 25% der aktuellen LP des Gegners (Bosse 12%) + 100% Schaden' },
};

/* ---------- Passive (stapelbar bis ×4) ---------- */
const PASS = {
  weights: { n: 'Gewichtsanzug', i: '🎽', r: 'c', m: { def: 4, spdPct: -.08 }, d: '+4 Rüstung, −8% Tempo' },
  scouter: { n: 'Scouter', i: '🔍', r: 'c', m: { crit: .10, critDmg: .40 }, d: '+10% Krit-Chance, +40% Krit-Schaden' },
  zenkai:  { n: 'Zenkai-Boost', i: '🔥', r: 'c', m: { atkPct: .30 }, d: '+30% Angriff (multipliziert sich mit anderen Boni)' },
  kami:    { n: 'Kamis Training', i: '🏯', r: 'c', m: { hpPct: .2 }, d: '+20% Max-LP' },
  kictrl:  { n: 'Ki-Kontrolle', i: '🌀', r: 'c', m: { regenPct: .3 }, d: '+30% Ki-Regeneration' },
  shell:   { n: 'Kame-Panzer', i: '🐢', r: 'c', m: { def: 2, thorns: 4 }, d: '+2 Rüstung, reflektiert 4 Schaden' },
  roshi:   { n: 'Roshis Training', i: '🏝️', r: 'c', m: { spdPct: .20 }, d: '+20% Angriffstempo' },
  spirit:  { n: 'Kampfgeist', i: '🥋', r: 'c', m: { kiOnHit: 1.2 }, d: 'Jeder Treffer gibt +1,2 Ki' },
  reserve: { n: 'Ki-Reserve', i: '🔷', r: 'c', m: { maxKi: 30 }, d: '+30 maximales Ki' },
  armor:   { n: 'Saiyajin-Rüstung', i: '🦺', r: 'c', m: { hpFlat: 25, def: 2 }, d: '+25 LP, +2 Rüstung' },
  rush:    { n: 'Siegesrausch', i: '🏁', r: 'c', m: { killHeal: .05 }, d: 'Heilt 5% Max-LP nach jedem Sieg' },
  medit:   { n: 'Meditation', i: '🧘', r: 'r', m: { hpRegen: .8 }, d: 'Regeneriert 0,8 LP/s' },
  pride:   { n: 'Saiyajin-Stolz', i: '🦍', r: 'r', m: { ls: .04 }, d: '+4% Lebensraub' },
  radar:   { n: 'Drachenradar', i: '📡', r: 'r', m: { goldPct: .3, ballPct: .15 }, d: '+30% Gold, mehr Dragonball-Funde' },
  blood:   { n: 'Saiyajin-Blut', i: '🩸', r: 'r', m: { lowHpAtk: .7 }, d: '+70% Angriff, solange du unter 50% LP bist' },
  absorb:  { n: 'Ki-Absorption', i: '🧲', r: 'r', m: { kiOnHurt: 5 }, d: 'Jeder erlittene Treffer gibt +5 Ki' },
  finisher:{ n: 'Henker', i: '☠️', r: 'r', m: { execute: .8 }, d: '+80% Schaden gegen Gegner unter 30% LP' },
  gravity: { n: 'Schwerkraftkammer', i: '🪐', r: 'r', m: { atkPct: .40, spdPct: -.05 }, d: '+40% Angriff, −5% Tempo' },
};

/* ---------- Relikte: nur als Boss-Belohnung ---------- */
const RELIC = {
  zsword:  { n: 'Z-Schwert', i: '🗡️', r: 'l', m: { atkPct: .60 }, d: '+60% Angriff' },
  pothala: { n: 'Pothala-Ohrringe', i: '💎', r: 'l', m: { atkPct: .30, hpPct: .18, regenPct: .25 }, d: '+30% Angriff, +18% LP, +25% Ki-Regeneration' },
  majin:   { n: 'Majin-Zeichen', i: '〽️', r: 'l', m: { atkPct: .85, taken: .12 }, d: '+85% Angriff, +12% erlittener Schaden' },
  crystal: { n: 'Drachenkristall', i: '🔮', r: 'l', m: { crit: .12, critDmg: .5 }, d: '+12% Krit-Chance, +50% Krit-Schaden' },
  kaio:    { n: 'Kaios Lehre', i: '🐒', r: 'l', m: { kiOnHit: 2, regenPct: .3 }, d: 'Treffer geben +2 Ki, +30% Ki-Regeneration' },
  senzubag:{ n: 'Senzu-Beutel', i: '👝', r: 'l', m: { hpRegen: .6, killHeal: .04 }, d: 'Regeneriert 0,6 LP/s, +4% LP nach Siegen; sofort 2 Senzu-Bohnen', onGet: 'senzu2' },
  dragonfist:{ n: 'Drachenfaust', i: '🐲', r: 'l', m: { spdPct: .30, ls: .04 }, d: '+30% Tempo, +4% Lebensraub' },
};

const ITEMS = {
  senzu:   { n: 'Senzu-Bohne', i: '🫘', r: 'c', d: 'Heilt 50% der Max-LP' },
  kicap:   { n: 'Ki-Kapsel', i: '🔋', r: 'c', d: 'Füllt das Ki komplett auf' },
  granate: { n: 'Ki-Granate', i: '💣', r: 'c', d: '400% Schaden, ignoriert Rüstung' },
  blitz:   { n: 'Blitzkapsel', i: '💡', r: 'c', d: 'Blendet den Gegner 5s (Bosse 3s)' },
  stun:    { n: 'Betäubungskapsel', i: '💫', r: 'c', d: 'Betäubt den Gegner 4s (Bosse 2s), stoppt Aufladungen' },
  schild:  { n: 'Schildkapsel', i: '🛡️', r: 'r', d: 'Schild über 40% Max-LP für 10s' },
  pille:   { n: 'Berserker-Pille', i: '💊', r: 'r', d: '15s lang +60% Angriff' },
  zeit:    { n: 'Zeitkapsel', i: '⏳', r: 'r', d: 'Setzt alle Abklingzeiten zurück, +40 Ki' },
  elixier: { n: 'Elixier', i: '🧪', r: 'r', d: 'Heilt komplett (100% Max-LP)' },
  bombe:   { n: 'Mega-Ki-Bombe', i: '☄️', r: 'r', d: '900% Schaden, ignoriert Rüstung' },
};


/* ---------- Training (Meta) ---------- */
const META = [
  { id: 'hp',    n: 'Ausdauer-Training', i: '❤️', d: '+10% Start-LP', max: 10, cost: l => 20 + l * 15 },
  { id: 'atk',   n: 'Kraft-Training', i: '💪', d: '+8% Angriff', max: 10, cost: l => 25 + l * 18 },
  { id: 'regen', n: 'Ki-Meditation', i: '🌀', d: '+8% Ki-Regeneration', max: 8, cost: l => 20 + l * 14 },
  { id: 'crit',  n: 'Kampfinstinkt', i: '🎯', d: '+2% Krit-Chance', max: 8, cost: l => 25 + l * 15 },
  { id: 'gold',  n: 'Preisgeld', i: '🪙', d: '+30 Start-Gold', max: 6, cost: l => 15 + l * 12 },
  { id: 'senzu', n: 'Senzu-Vorrat', i: '🫘', d: 'Starte mit +1 Senzu-Bohne', max: 3, cost: l => 40 + l * 40 },
  { id: 'zgain', n: 'Zenkai-Sinn', i: '⭐', d: '+10% Zenkai-Punkte', max: 10, cost: l => 40 + l * 30 },
  { id: 'pick',  n: 'Kampfanalyse', i: '🧠', d: '+1 Auswahl bei Belohnungen', max: 1, cost: () => 250 },
  { id: 'revive', n: 'Shenlongs Gnade', i: '🐉', d: 'Wiederbelebung 1× pro Run mit 40% LP', max: 1, cost: () => 300 },
  { id: 'unlock_destructo', n: 'Destructo-Scheibe', i: '🔪', d: 'Schaltet die Technik in Belohnungen frei', max: 1, cost: () => 80, unlock: true },
  { id: 'unlock_form',      n: 'Transformation', i: '⚡', d: 'Schaltet Kaio-Ken, Super Saiyajin … bis Ultra Instinct frei (in Belohnungen & Shop aufwertbar)', max: 1, cost: () => 150, unlock: true },
  { id: 'startform', n: 'Start-Form', i: '🔥', d: 'Starte jeden Run mit höherer Transformationsstufe (braucht „Transformation“)', max: 9, cost: l => 90 + l * 80, needs: 'unlock_form' },
  { id: 'unlock_genkidama', n: 'Genkidama', i: '🔵', d: 'Schaltet die ultimative Technik frei', max: 1, cost: () => 220, unlock: true },
  { id: 'unlock_finalflash', n: 'Final Flash', i: '🟡', d: 'Schaltet Vegetas Strahl frei', max: 1, cost: () => 260, unlock: true },
  { id: 'unlock_hakai',     n: 'Hakai', i: '🟪', d: 'Schaltet die Zerstörung frei', max: 1, cost: () => 320, unlock: true },
];

const WISHES = {
  power: { n: 'Unendliche Kraft', i: '💪', d: 'Dauerhaft +10% Angriff und +10% LP' },
  ki:    { n: 'Unerschöpfliches Ki', i: '🌀', d: 'Dauerhaft +15% Ki-Regeneration' },
  zenkai: { n: 'Schatz des Drachen', i: '⭐', d: 'Sofort +300 Zenkai-Punkte' },
};

const NODE_INFO = {
  battle: { i: '⚔️', n: 'Kampf', d: 'Ein gewöhnlicher Gegner' },
  elite:  { i: '💀', n: 'Elite-Kampf', d: 'Stärker, lädt Angriffe auf – bessere Beute & Dragonball-Chance' },
  shop:   { i: '🛒', n: 'Bulmas Shop', d: 'Gold gegen Ausrüstung' },
  rest:   { i: '🏕️', n: 'Rastplatz', d: 'Heilen oder trainieren' },
  event:  { i: '❓', n: 'Zufallsereignis', d: 'Riskant, aber lohnend' },
};

/* ---------- Schwerkraft-Stufen (Schwierigkeit) ---------- */
const GRAV_MAX = 10;
const gravInfo = g => g === 0 ? 'Normal' : `Gegner +${g * 22}% LP, +${g * 14}% Schaden · Zenkai +${g * 35}%`
  + (g >= 2 ? ' · mehr Elite-Kämpfe' : '') + (g >= 3 ? ' · Shop +20%' : '') + (g >= 4 ? ' · keine Heilung nach Kämpfen' : '') + (g >= 6 ? ' · alle Gegner mit Eigenschaft' : '');


/* ---------- Transformations-Leiter: ein Item, unendlich aufwertbar ---------- */
const FORM_MAX = 11;
const FORMS = [null,
  { n: 'Kaio-Ken ×2',  ico: '🔴', hair: null, eye: null, aura: '#ff4a3d', atk: .30, spd: .10, regen: 0, taken: 0, drain: .010, dodge: 0, crit: 0, style: 'kk' },
  { n: 'Kaio-Ken ×4',  ico: '🔴', hair: null, eye: null, aura: '#ff3a2d', atk: .45, spd: .15, regen: 0, taken: 0, drain: .013, dodge: 0, crit: 0, style: 'kk' },
  { n: 'Kaio-Ken ×10', ico: '🔴', hair: null, eye: null, aura: '#ff2a2a', atk: .80, spd: .25, regen: 0, taken: 0, drain: .020, dodge: 0, crit: 0, style: 'kk' },
  { n: 'Super Saiyajin',   ico: '👱', hair: '#ffe14a', eye: '#27e0c4', aura: '#ffe14a', atk: .60, spd: .15, regen: .50, taken: 0, dodge: 0, crit: 0, style: 'ssj' },
  { n: 'Super Saiyajin 2', ico: '⚡', hair: '#ffe94a', eye: '#27e0c4', aura: '#fff06a', atk: .85, spd: .20, regen: .60, taken: 0, dodge: 0, crit: 0, style: 'ssj2' },
  { n: 'Super Saiyajin 3', ico: '🦁', hair: '#ffd21a', eye: '#27e0c4', aura: '#ffd21a', atk: 1.20, spd: .25, regen: .70, taken: 0, dodge: 0, crit: 0, kidrain: 2.5, style: 'ssj3' },
  { n: 'Super Saiyajin God',  ico: '🔥', hair: '#ff3b4a', eye: '#ff8a96', aura: '#ff4a5e', atk: 1.10, spd: .30, regen: .80, taken: -.15, dodge: 0, crit: 0, style: 'ssj' },
  { n: 'Super Saiyajin Blue', ico: '💠', hair: '#38b6ff', eye: '#8fe0ff', aura: '#38b6ff', atk: 1.50, spd: .35, regen: 1.0, taken: -.20, dodge: 0, crit: .10, style: 'ssj2' },
  { n: 'Blue Kaio-Ken ×20',   ico: '🌌', hair: '#38b6ff', eye: '#ff6aa0', aura: '#ff3d8a', atk: 2.30, spd: .45, regen: 1.0, taken: -.20, drain: .015, dodge: 0, crit: .10, style: 'ssj2' },
  { n: 'Ultra Instinct (Zeichen)',    ico: '🪽', hair: '#cfd9ea', eye: '#e8f2ff', aura: '#cfe0ff', atk: 1.70, spd: .50, regen: .5, taken: -.25, dodge: .35, crit: 0, style: 'ssj' },
  { n: 'Ultra Instinct (gemeistert)', ico: '🪽', hair: '#f4f8ff', eye: '#ffffff', aura: '#ffffff', atk: 2.60, spd: .60, regen: .5, taken: -.30, dodge: .60, crit: .15, style: 'mui' },
];
