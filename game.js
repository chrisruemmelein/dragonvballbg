'use strict';
/* Zenkai Quest – Dragon-Ball-Fan-Roguelite (Idle-Kampf + Build-Entscheidungen + Meta-Progression) */

/* ---------- Helfer ---------- */
const $ = s => document.querySelector(s);
const rnd = (a, b) => a + Math.random() * (b - a);
const ri = (a, b) => Math.floor(rnd(a, b + 1));
const pick = a => a[Math.floor(Math.random() * a.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const SAVE_KEY = 'zenkai_quest_v1';
const MAX_FLOOR = 10;
const SAGAS = {
  saiyan: { n: 'Saiyajin- & Freezer-Saga', i: '🌍', d: 'Der Einstieg: Raditz, Vegeta, Freezer.', bosses: { 5: 'vegeta', 10: 'freezer' }, off: 0, zmul: 1,
            a1: 'act1', a2: 'act2', e1: 'elite1', e2: 'elite2', win: 'Du hast Freezer bezwungen und den Planeten gerettet!' },
  cell:   { n: 'Cell-Saga', i: '🪲', d: 'Härter: Androiden und Cell. Schaltet sich nach dem ersten Sieg frei.', bosses: { 5: 'android18', 10: 'cell' }, off: 4, zmul: 1.6,
            a1: 'act3', a2: 'act4', e1: 'elite3', e2: 'elite4', win: 'Perfect Cell ist besiegt – die Erde ist sicher!' },
};
const bossAt = f => SAGAS[run.saga].bosses[f];
const MAX_TECHS = 4;

/* ---------- Spielstand ---------- */
function defSave() {
  return { zenkai: 0, meta: {}, chars: { goku: 1 }, sel: 'goku', best: 0, wins: 0, runs: 0,
           balls: 0, wish: {}, run: null, sound: true,
           set: { auto: true, fast: false, vib: true, nums: true, autoSenzu: true } };
}
function loadSave() {
  try {
    const s = JSON.parse(localStorage.getItem(SAVE_KEY));
    const d = Object.assign(defSave(), s || {});
    d.set = Object.assign(defSave().set, d.set);
    return d;
  } catch (e) { return defSave(); }
}
function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(SAVE)); } catch (e) {} }
let SAVE = loadSave();
let run = null;   // aktueller Run (liegt auch in SAVE.run)
let B = null;     // aktueller Kampf

/* ---------- Daten ---------- */
const CHARS = {
  goku:    { n: 'Son Goku', hair: '#1a1a1a', skin: '#f5c9a0', suit: '#ff8a1f', hp: 120, atk: 14, def: 2, ki: 100, regen: 8, crit: .05,
             start: ['kamehameha'], cost: 0, ac: '#ff9a1f', mods: {},
             d: 'Ausgewogen. Startet mit Kamehameha.' },
  vegeta:  { n: 'Vegeta', hair: '#1a1a1a', skin: '#f5c9a0', suit: '#2a55c8', hp: 105, atk: 16, def: 2, ki: 100, regen: 8, crit: .1,
             start: ['galick'], cost: 120, ac: '#4d7dff', mods: { atkPct: .1 },
             d: 'Glaskanone: +10% Angriff, +10% Krit. Startet mit Galick Ho.' },
  piccolo: { n: 'Piccolo', hair: null, skin: '#7ccf62', suit: '#7b3fb0', hp: 135, atk: 12, def: 4, ki: 100, regen: 8, crit: .05,
             start: ['makankosappo'], cost: 200, ac: '#7ccf62', mods: { hpRegen: 1.2 },
             d: 'Zäh: regeneriert 1,2 LP/s, +Rüstung. Startet mit Makankosappo.' },
  gohan:   { n: 'Son Gohan', hair: '#1a1a1a', skin: '#f5c9a0', suit: '#6a2cc0', hp: 115, atk: 13, def: 2, ki: 110, regen: 9, crit: .05,
             start: ['masenko'], cost: 320, ac: '#b685ff', mods: {},
             d: 'Verborgene Kraft: bis zu +70% Angriff bei niedrigen LP. Startet mit Masenko.' },
};

const RAR = { c: 'GEWÖHNLICH', r: 'SELTEN', e: 'EPISCH' };

const TECH = {
  kamehameha:   { n: 'Kamehameha', i: '🌊', cost: 40, cd: 2, r: 'c', mult: 3.2, d: 'Energiewelle: 320% Schaden' },
  kiblast:      { n: 'Ki-Salve', i: '✨', cost: 15, cd: 1, r: 'c', mult: .7, hits: 3, d: '3 Treffer à 70%' },
  kiai:         { n: 'Kiai', i: '💥', cost: 25, cd: 4, r: 'c', mult: 1.2, stun: 2.5, d: '120% Schaden, betäubt 2,5s, unterbricht Aufladungen' },
  galick:       { n: 'Galick Ho', i: '🟣', cost: 40, cd: 2, r: 'c', mult: 3.3, d: 'Violette Welle: 330% Schaden' },
  masenko:      { n: 'Masenko', i: '☀️', cost: 35, cd: 2, r: 'c', mult: 2.8, d: 'Gebündelter Schlag: 280% Schaden' },
  makankosappo: { n: 'Makankosappo', i: '🌀', cost: 50, cd: 3, r: 'r', mult: 3.8, pierce: true, d: '380% Schaden, ignoriert Rüstung' },
  teleport:     { n: 'Instant Transmission', i: '⚡', cost: 25, cd: 5, r: 'r', dodge: 3, d: 'Weicht 3s allen Angriffen aus, nächster Treffer kritisch' },
  heal:         { n: 'Dendes Heilung', i: '💚', cost: 40, cd: 6, r: 'r', heal: .35, d: 'Heilt 35% der Max-LP' },
  destructo:    { n: 'Destructo-Scheibe', i: '🔪', cost: 35, cd: 2, r: 'r', mult: 3, pierce: true, lock: 'destructo', d: '300% Schaden, ignoriert Rüstung' },
  ssj:          { n: 'Super Saiyajin', i: '👱', cost: 60, cd: 20, r: 'e', buff: 12, lock: 'ssj', d: '12s: +60% Angriff, +15% Tempo, +50% Ki-Regeneration' },
  genkidama:    { n: 'Genkidama', i: '🔵', cost: 90, cd: 8, r: 'e', mult: 8, lock: 'genkidama', d: 'Die ultimative Kugel: 800% Schaden' },
};

const PASS = {
  weights: { n: 'Gewichtsanzug', i: '🎽', r: 'c', m: { def: 4, spdPct: -.08 }, d: '+4 Rüstung, −8% Tempo' },
  scouter: { n: 'Scouter', i: '🔍', r: 'c', m: { crit: .08, critDmg: .25 }, d: '+8% Krit-Chance, +25% Krit-Schaden' },
  zenkai:  { n: 'Zenkai-Boost', i: '🔥', r: 'c', m: { atkPct: .15 }, d: '+15% Angriff' },
  kami:    { n: 'Kamis Training', i: '🏯', r: 'c', m: { hpPct: .2 }, d: '+20% Max-LP' },
  kictrl:  { n: 'Ki-Kontrolle', i: '🌀', r: 'c', m: { regenPct: .3 }, d: '+30% Ki-Regeneration' },
  shell:   { n: 'Kame-Panzer', i: '🐢', r: 'c', m: { def: 2, thorns: 4 }, d: '+2 Rüstung, reflektiert 4 Schaden' },
  roshi:   { n: 'Roshis Training', i: '🏝️', r: 'c', m: { spdPct: .12 }, d: '+12% Angriffstempo' },
  medit:   { n: 'Meditation', i: '🧘', r: 'r', m: { hpRegen: 1.5 }, d: 'Regeneriert 1,5 LP/s' },
  pride:   { n: 'Saiyajin-Stolz', i: '🦍', r: 'r', m: { ls: .06 }, d: '+6% Lebensraub' },
  radar:   { n: 'Drachenradar', i: '📡', r: 'r', m: { goldPct: .3, ballPct: .15 }, d: '+30% Gold, mehr Dragonball-Funde' },
  kaioken: { n: 'Kaio-Ken', i: '🔴', r: 'e', m: { atkPct: .4, taken: .15 }, lock: 'kaioken', d: '+40% Angriff, aber +15% erlittener Schaden' },
};

const ITEMS = {
  senzu: { n: 'Senzu-Bohne', i: '🫘', r: 'c', d: 'Heilt 60% der Max-LP (im Kampf nutzbar)' },
  kicap: { n: 'Ki-Kapsel', i: '🔋', r: 'c', d: 'Füllt das Ki komplett auf (im Kampf nutzbar)' },
};

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
  { id: 'unlock_kaioken',   n: 'Kaio-Ken', i: '🔴', d: 'Schaltet den Boost in Belohnungen frei', max: 1, cost: () => 120, unlock: true },
  { id: 'unlock_ssj',       n: 'Super Saiyajin', i: '👱', d: 'Schaltet die Verwandlung in Belohnungen frei', max: 1, cost: () => 160, unlock: true },
  { id: 'unlock_genkidama', n: 'Genkidama', i: '🔵', d: 'Schaltet die ultimative Technik frei', max: 1, cost: () => 220, unlock: true },
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

const ENEMIES = {
  act1: [ { n: 'Saibaman', e: '🌱' }, { n: 'Raditz', e: '🦁' }, { n: 'Roter Soldat', e: '🪖' }, { n: 'Pterodaktylus', e: '🦖' } ],
  act2: [ { n: 'Dodoria', e: '🐷' }, { n: 'Zarbon', e: '🧝' }, { n: 'Recoome', e: '🦍' }, { n: 'Guldo', e: '🐸' }, { n: 'Burter', e: '🦎' } ],
  elite1: [ { n: 'Nappa', e: '🗿' } ],
  elite2: [ { n: 'Captain Ginyu', e: '🦹' }, { n: 'Cell Jr.', e: '🪲' } ],
  act3: [ { n: 'Android 19', e: '🤖' }, { n: 'Dr. Gero', e: '🧓' }, { n: 'Cell Jr.', e: '🪲' }, { n: 'Android 16', e: '🦾' } ],
  act4: [ { n: 'Android 17', e: '🧢' }, { n: 'Semi-Perfect Cell', e: '🦟' }, { n: 'Cell Jr. (Elite)', e: '👾' }, { n: 'Cooler-Klon', e: '🛰️' } ],
  elite3: [ { n: 'Android 17', e: '🧢' }, { n: 'Android 16', e: '🦾' } ],
  elite4: [ { n: 'Super Perfect Cell', e: '🦂' }, { n: 'Cell Jr. Anführer', e: '👹' } ],
  android18: { n: 'Android 18', e: '🧑‍🦰' },
  cell: { n: 'Perfect Cell', e: '🦗' },
  vegeta: { n: 'Vegeta', e: '👑' },
  freezer: { n: 'Freezer', e: '👽' },
};

/* ---------- Audio (winzig, WebAudio) ---------- */
let AC = null;
function sfx(kind) {
  if (!SAVE.sound) return;
  try {
    AC = AC || new (window.AudioContext || window.webkitAudioContext)();
    const o = AC.createOscillator(), g = AC.createGain();
    const f = { hit: [180, 90, .08], crit: [420, 160, .14], hurt: [120, 60, .12], tech: [300, 800, .22], ui: [520, 700, .06],
                win: [400, 900, .35], lose: [300, 60, .6], heal: [500, 900, .2] }[kind] || [300, 300, .05];
    o.type = kind === 'tech' || kind === 'win' || kind === 'heal' ? 'triangle' : 'square';
    o.frequency.setValueAtTime(f[0], AC.currentTime);
    o.frequency.exponentialRampToValueAtTime(f[1], AC.currentTime + f[2]);
    g.gain.setValueAtTime(.06, AC.currentTime);
    g.gain.exponentialRampToValueAtTime(.0001, AC.currentTime + f[2]);
    o.connect(g); g.connect(AC.destination); o.start(); o.stop(AC.currentTime + f[2]);
  } catch (e) {}
}
function buzz(ms) { try { if (SAVE.set.vib && navigator.vibrate) navigator.vibrate(ms); } catch (e) {} }

/* ---------- Avatar (selbst gezeichnet, SVG) ---------- */
function avatar(id, ssj) {
  const c = CHARS[id];
  const hair = ssj ? '#ffe14a' : c.hair;
  let h = '';
  if (hair) h = `<polygon points="16,50 6,24 24,34 22,4 40,28 58,4 56,34 74,24 64,50" fill="${hair}" stroke="#000" stroke-width="2" stroke-linejoin="round"/>`;
  else h = `<rect x="22" y="8" width="36" height="14" rx="4" fill="#fff" stroke="#000" stroke-width="2"/><rect x="26" y="2" width="28" height="10" rx="3" fill="#7b3fb0" stroke="#000" stroke-width="2"/>
            <polygon points="22,34 10,28 24,44" fill="${c.skin}" stroke="#000" stroke-width="2"/><polygon points="58,34 70,28 56,44" fill="${c.skin}" stroke="#000" stroke-width="2"/>`;
  const eye = ssj ? '#26e0c0' : '#111';
  return `<svg viewBox="0 0 80 90" aria-hidden="true">
    <rect x="14" y="68" width="52" height="20" rx="8" fill="${c.suit}" stroke="#000" stroke-width="2"/>
    ${id === 'piccolo' ? '<rect x="10" y="62" width="60" height="10" rx="5" fill="#fff" stroke="#000" stroke-width="2"/>' : ''}
    ${h}
    <circle cx="40" cy="50" r="22" fill="${c.skin}" stroke="#000" stroke-width="2"/>
    <path d="M26 44 l10 4 M54 44 l-10 4" stroke="#000" stroke-width="3" stroke-linecap="round"/>
    <ellipse cx="32" cy="52" rx="3" ry="4" fill="${eye}"/><ellipse cx="48" cy="52" rx="3" ry="4" fill="${eye}"/>
    <path d="M32 63 q8 5 16 0" stroke="#000" stroke-width="2.5" fill="none" stroke-linecap="round"/>
  </svg>`;
}

/* ---------- Run-Logik ---------- */
function meta(id) { return SAVE.meta[id] || 0; }

function stats() {
  const c = CHARS[run.char];
  const A = { atkPct: 0, hpPct: 0, hpFlat: 0, def: 0, regenPct: 0, crit: 0, critDmg: 0, ls: 0, spdPct: 0, hpRegen: 0, thorns: 0, taken: 0, goldPct: 0, ballPct: 0 };
  const add = m => { for (const k in m) A[k] += m[k]; };
  add(c.mods);
  run.pass.forEach(id => add(PASS[id].m));
  A.atkPct += meta('atk') * .08 + (SAVE.wish.power || 0) * .1;
  A.hpPct += meta('hp') * .10 + (SAVE.wish.power || 0) * .1;
  A.regenPct += meta('regen') * .08 + (SAVE.wish.ki || 0) * .15;
  A.crit += meta('crit') * .02;
  return {
    maxHp: Math.round((c.hp + A.hpFlat) * (1 + A.hpPct)),
    atk: (c.atk + run.bonusAtk) * (1 + A.atkPct),
    def: c.def + A.def, maxKi: c.ki, regen: c.regen * (1 + A.regenPct),
    crit: clamp(c.crit + A.crit, 0, .8), critDmg: 1.6 + A.critDmg,
    ls: A.ls, spd: Math.max(.5, 1 + A.spdPct), hpRegen: A.hpRegen, thorns: A.thorns,
    taken: 1 + A.taken, goldPct: A.goldPct, ballPct: A.ballPct,
  };
}

function sagaSel() { return SAGAS[SAVE.saga] && (SAVE.saga === 'saiyan' || SAVE.wins > 0) ? SAVE.saga : 'saiyan'; }
function newRun() {
  const id = SAVE.sel;
  run = { char: id, saga: sagaSel(), floor: 1, hp: 1, gold: 20 + meta('gold') * 30, techs: CHARS[id].start.map(t => ({ id: t, lv: 1 })),
          pass: [], items: [], bonusAtk: 0, balls: 0, kills: 0, bosses: 0, revived: false,
          screen: 'map', opts: null, node: null, reward: null, shop: null, event: null };
  for (let i = 0; i < meta('senzu') + 1; i++) run.items.push('senzu');
  run.hp = stats().maxHp;
  SAVE.run = run; SAVE.runs++;
  run.opts = genNodes();
  save(); go('map');
}

function genNodes() {
  const f = run.floor;
  if (bossAt(f)) return [{ type: 'boss' }];
  if (f === 1) return [{ type: 'battle' }, { type: 'battle' }];
  const pool = [['battle', 45], ['elite', f >= 3 ? 16 : 0], ['shop', 13], ['rest', 14], ['event', 14]];
  const out = [];
  const wp = () => {
    const tot = pool.reduce((s, p) => s + p[1], 0); let r = Math.random() * tot;
    for (const p of pool) { if ((r -= p[1]) < 0) return p[0]; }
    return 'battle';
  };
  while (out.length < 2) {
    const t = wp();
    if (!out.includes(t)) out.push(t);
  }
  // Vor dem Boss immer eine Verschnaufpause anbieten
  if (bossAt(f + 1) && !out.some(t => t === 'rest' || t === 'shop')) out[1] = pick(['rest', 'shop']);
  return out.map(type => ({ type }));
}

function makeEnemy(f, type) {
  const sf = f + SAGAS[run.saga].off, sc = Math.pow(1.26, sf - 1);
  let hp = 135 * sc, atk = 3.0 * Math.pow(1.21, sf - 1), int = 1.7, def = sf * .8, chargeEvery = 0, boss = false;
  const sg = SAGAS[run.saga];
  let who = f <= 4 ? pick(ENEMIES[sg.a1]) : pick(ENEMIES[sg.a2]);
  if (type === 'elite') { who = f <= 5 ? pick(ENEMIES[sg.e1]) : pick(ENEMIES[sg.e2]); hp *= 1.9; atk *= 1.3; int = 1.6; chargeEvery = 4; }
  if (type === 'boss') { who = ENEMIES[bossAt(f)]; hp *= 2.7; atk *= 1.3; int = 1.5; chargeEvery = 3; boss = true; def *= 1.1; }
  return { n: who.n, e: who.e, hp: Math.round(hp), atk, int, def, chargeEvery, boss, type };
}

function heal(x) { const s = B ? B.S : stats(); run.hp = Math.min(s.maxHp, run.hp + x); }
function addGold(x) { run.gold += Math.round(x); }

function nextFloor() {
  run.floor++;
  if (run.floor > MAX_FLOOR) return endRun(true);
  run.opts = genNodes(); run.node = null; run.reward = null; run.shop = null; run.event = null;
  run.screen = 'map'; save(); go('map');
}

function enterNode(i) {
  const n = run.opts[i];
  run.node = n; sfx('ui');
  if (n.type === 'battle' || n.type === 'elite' || n.type === 'boss') { run.screen = 'battle'; save(); go('battle'); }
  else if (n.type === 'shop') { run.shop = genShop(); run.screen = 'shop'; save(); go('shop'); }
  else if (n.type === 'rest') { run.screen = 'rest'; save(); go('rest'); }
  else if (n.type === 'event') { run.event = { id: pick(Object.keys(EVENTS)), res: null }; run.screen = 'event'; save(); go('event'); }
}

/* ---------- Karten / Belohnungen ---------- */
function cardInfo(c) {
  if (c.kind === 'tech') return TECH[c.id];
  if (c.kind === 'pass') return PASS[c.id];
  return ITEMS[c.id];
}
function cardPool(minRar) {
  const out = [];
  for (const id in TECH) { const t = TECH[id]; if (!t.lock || meta('unlock_' + t.lock)) out.push({ kind: 'tech', id, r: t.r }); }
  for (const id in PASS) {
    const p = PASS[id]; if (p.lock && !meta('unlock_' + p.lock)) continue;
    if (run.pass.filter(x => x === id).length >= 4) continue;
    out.push({ kind: 'pass', id, r: p.r });
  }
  for (const id in ITEMS) out.push({ kind: 'item', id, r: 'c' });
  return out.filter(c => !(minRar === 'r' && c.r === 'c'));
}
function genCards(n, minRar) {
  const pool = cardPool(minRar), res = [];
  const bonus = run.floor * 1.5;
  const w = c => ({ c: 60 - bonus, r: 30 + bonus * .6, e: 10 + bonus * .5 }[c.r]) * (c.kind === 'item' ? .5 : 1);
  while (res.length < n && pool.length) {
    const tot = pool.reduce((s, c) => s + w(c), 0); let r = Math.random() * tot, idx = 0;
    for (; idx < pool.length; idx++) { if ((r -= w(pool[idx])) < 0) break; }
    idx = Math.min(idx, pool.length - 1);
    res.push(pool.splice(idx, 1)[0]);
  }
  return res;
}

function giveCard(c, ignoreFull) {
  const { maxHp: before } = stats();
  if (c.kind === 'tech') {
    const have = run.techs.find(t => t.id === c.id);
    if (have) have.lv++;
    else if (run.techs.length < MAX_TECHS) run.techs.push({ id: c.id, lv: 1 });
    else if (!ignoreFull) return 'full';
  } else if (c.kind === 'pass') run.pass.push(c.id);
  else if (c.kind === 'item') { if (run.items.length < 4) run.items.push(c.id); else addGold(25); }
  const after = stats().maxHp;
  if (after > before) run.hp += after - before;
  return 'ok';
}

function pickReward(i) {
  const c = run.reward.cards[i];
  const res = giveCard(c);
  if (res === 'full') return showReplace(c, () => finishReward());
  sfx('win'); finishReward();
}
function finishReward() { run.reward = null; nextFloor(); }

function genShop() {
  const f = run.floor;
  const cards = genCards(3).map(c => ({ k: 'card', card: c, price: Math.round(({ c: 40, r: 75, e: 130 }[c.r]) * (1 + f * .06)), sold: false }));
  return { items: [
    ...cards,
    { k: 'senzu', price: 35 }, { k: 'heal', price: 45 }, { k: 'train', price: 70, sold: false },
  ] };
}

/* ---------- Ereignisse ---------- */
const EVENTS = {
  karin: { t: 'Der Karin-Turm', i: '🐱', txt: 'Meister Karin bietet dir seine Hilfe an.',
           o: [['Senzu-Bohne nehmen', 'a'], ['Mit Karin trainieren (+2 Angriff, −10% LP)', 'b']] },
  wreck: { t: 'Raumschiff-Wrack', i: '🛸', txt: 'Ein abgestürzte Landekapsel liegt im Krater. Vielleicht ist noch etwas drin.',
           o: [['Plündern (Gold, aber Falle möglich)', 'a'], ['Weiterziehen', 'b']] },
  kaio:  { t: 'Kaios Planet', i: '🪐', txt: 'Hohe Schwerkraft! Training ist hier extrem effektiv – und anstrengend.',
           o: [['Schwerkrafttraining (+3 Angriff, −20% LP)', 'a'], ['Kurze Meditation (heilt 25% LP)', 'b']] },
  bulma: { t: 'Bulmas Labor', i: '🧪', txt: 'Bulma hat ein neues Gadget gebastelt. "Teste es mal!"',
           o: [['Gadget testen (50 Gold → zufällige Ausrüstung)', 'a'], ['Nur die Kekse essen (heilt 15% LP)', 'b']] },
  radar: { t: 'Dragonball-Spur', i: '📡', txt: 'Dein Radar piept! Ein Dragonball ist ganz in der Nähe.',
           o: [['Der Spur folgen (50% Dragonball, sonst −15% LP)', 'a'], ['Ignorieren', 'b']] },
};
function eventPick(k) {
  const ev = run.event; if (ev.res) return;
  const s = stats(); let msg = '';
  switch (ev.id + k) {
    case 'karina': if (run.items.length < 4) run.items.push('senzu'); else addGold(30); msg = '🫘 Du erhältst eine Senzu-Bohne!'; break;
    case 'karinb': run.bonusAtk += 2; run.hp = Math.max(1, run.hp - s.maxHp * .1); msg = '💪 +2 Angriff!'; break;
    case 'wrecka':
      if (Math.random() < .3) { run.hp = Math.max(1, run.hp - s.maxHp * .15); msg = '💣 Eine Falle! −15% LP.'; }
      else { const g = ri(45, 90); addGold(g); msg = `🪙 Du findest ${g} Gold!`; }
      break;
    case 'wreckb': msg = 'Du ziehst weiter.'; break;
    case 'kaioa': run.bonusAtk += 3; run.hp = Math.max(1, run.hp - s.maxHp * .2); msg = '💪 +3 Angriff!'; break;
    case 'kaiob': heal(s.maxHp * .25); msg = '💚 Du fühlst dich erfrischt.'; break;
    case 'bulmaa':
      if (run.gold < 50) { msg = '🪙 Zu wenig Gold!'; break; }
      addGold(-50); { const c = genCards(1)[0]; giveCard(c, true); msg = `🎁 Du erhältst: ${cardInfo(c).i} ${cardInfo(c).n}`; } break;
    case 'bulmab': heal(s.maxHp * .15); msg = '🍪 Lecker!'; break;
    case 'radara':
      if (Math.random() < .5 + s.ballPct) { findBall(); msg = '🟠 Du findest einen Dragonball!'; }
      else { run.hp = Math.max(1, run.hp - s.maxHp * .15); msg = '💥 Ein Hinterhalt! −15% LP.'; }
      break;
    case 'radarb': msg = 'Du ziehst weiter.'; break;
  }
  ev.res = msg; save(); go('event');
}

function findBall() {
  SAVE.balls = Math.min(7, SAVE.balls + 1); run.balls++; toast('🟠 Dragonball gefunden! (' + SAVE.balls + '/7)'); save();
}

/* ---------- Kampf ---------- */
function startBattle() {
  const n = run.node, e = makeEnemy(run.floor, n.type), S = stats();
  B = { e, S, ehp: e.hp, eMax: e.hp, pT: 0, eT: e.int * .5, ki: S.maxKi * .5, cd: {}, buff: { ssj: 0, dodge: 0 },
        intro: .8, stun: 0, charge: null, eCount: 0, over: false, nextCrit: false, enraged: false, auto: SAVE.set.auto, fast: SAVE.set.fast, autoT: 0, time: 0 };
  go('battle-ui');
  startLoop();
}

let raf = 0, lastT = 0;
function startLoop() {
  cancelAnimationFrame(raf); lastT = performance.now();
  const loop = t => {
    const dt = Math.min(.1, (t - lastT) / 1000); lastT = t;
    if (B && !B.over) {
      const steps = B.fast ? 2 : 1;
      for (let i = 0; i < steps; i++) tick(dt);
      updateBattleUI();
    }
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);
}

function tick(dt) {
  if (!B || B.over) return;
  if (B.intro > 0) { B.intro -= dt; return; }
  const s = B.S, e = B.e;
  B.time += dt;
  B.ki = Math.min(s.maxKi, B.ki + s.regen * (B.buff.ssj > 0 ? 1.5 : 1) * dt);
  if (s.hpRegen) heal(s.hpRegen * dt);
  for (const k in B.cd) B.cd[k] = Math.max(0, B.cd[k] - dt);
  B.buff.ssj = Math.max(0, B.buff.ssj - dt);
  B.buff.dodge = Math.max(0, B.buff.dodge - dt);

  B.pT += dt * s.spd * (B.buff.ssj > 0 ? 1.15 : 1);
  if (B.pT >= 1) { B.pT -= 1; dealDamage(1); }
  if (B.ehp <= 0) return winBattle();

  if (B.stun > 0) { B.stun -= dt; B.charge = null; }
  else if (B.charge) {
    B.charge.t -= dt;
    if (B.charge.t <= 0) { enemyHit(2.4); B.charge = null; B.eT = 0; }
  } else {
    B.eT += dt;
    if (B.eT >= e.int) {
      B.eT = 0; B.eCount++;
      if (e.chargeEvery && B.eCount % e.chargeEvery === 0) { B.charge = { t: 1.8, max: 1.8 }; sfx('tech'); }
      else enemyHit(1);
    }
  }
  if (e.boss && !B.enraged && B.ehp < B.eMax / 2) { B.enraged = true; e.atk *= 1.25; e.int *= .8; toast('😡 ' + e.n + ' rastet aus!'); }

  if (B.auto) { B.autoT -= dt; if (B.autoT <= 0) { B.autoT = .25; autoPlay(); } }
  if (run.hp <= 0) playerDown();
}

function dealDamage(mult, o = {}) {
  const s = B.S;
  let atk = s.atk;
  if (run.char === 'gohan') atk *= 1 + (1 - run.hp / s.maxHp) * .7;
  if (B.buff.ssj > 0) atk *= 1.6;
  let crit = Math.random() < s.crit;
  if (B.nextCrit) { crit = true; B.nextCrit = false; }
  let d = atk * mult * (crit ? s.critDmg : 1);
  if (!o.pierce) d /= (1 + B.e.def * .06);
  d = Math.max(1, Math.round(d * rnd(.92, 1.08)));
  B.ehp = Math.max(0, B.ehp - d);
  if (s.ls) heal(d * s.ls);
  floatText(d, 'e', crit ? 'crit' : '');
  sfx(crit ? 'crit' : 'hit');
  pulse('#enemyAv');
}

function enemyHit(mult) {
  const s = B.S, e = B.e;
  if (B.buff.dodge > 0) { floatText('Verfehlt!', 'p', 'miss'); return; }
  let d = e.atk * mult * rnd(.9, 1.1) / (1 + s.def * .06) * s.taken;
  d = Math.max(1, Math.round(d));
  run.hp -= d;
  if (s.thorns) B.ehp = Math.max(1, B.ehp - s.thorns);
  floatText('-' + d, 'p', 'me');
  sfx('hurt'); buzz(mult > 1 ? 60 : 20); pulse('#playerAv');
}

function useTech(i) {
  if (!B || B.over) return;
  const t = run.techs[i]; if (!t) return;
  const T = TECH[t.id], s = B.S;
  if ((B.cd[t.id] || 0) > 0 || B.ki < T.cost) return;
  B.ki -= T.cost; B.cd[t.id] = T.cd;
  const lvm = 1 + .3 * (t.lv - 1);
  sfx('tech');
  if (T.mult) for (let h = 0; h < (T.hits || 1); h++) dealDamage(T.mult * lvm, { pierce: T.pierce });
  if (T.stun) { B.stun = Math.max(B.stun, B.e.boss ? T.stun * .5 : T.stun); B.charge = null; B.eT = 0; }
  if (T.dodge) { B.buff.dodge = T.dodge; B.nextCrit = true; }
  if (T.heal) { heal(s.maxHp * T.heal * lvm); floatText('+' + Math.round(s.maxHp * T.heal * lvm), 'p', 'heal'); sfx('heal'); }
  if (T.buff) B.buff.ssj = T.buff * (1 + (t.lv - 1) * .25);
  if (B.ehp <= 0) winBattle();
}
function useItem(i) {
  if (!B || B.over) return;
  const id = run.items[i]; if (!id) return;
  const s = B.S;
  if (id === 'senzu') { if (run.hp >= s.maxHp) return; heal(s.maxHp * .6); floatText('+' + Math.round(s.maxHp * .6), 'p', 'heal'); sfx('heal'); }
  if (id === 'kicap') { if (B.ki >= s.maxKi - 5) return; B.ki = s.maxKi; sfx('heal'); }
  run.items.splice(i, 1);
}

function autoPlay() {
  const s = B.S, has = id => run.techs.findIndex(t => t.id === id);
  const ready = i => i >= 0 && (B.cd[run.techs[i].id] || 0) <= 0 && B.ki >= TECH[run.techs[i].id].cost;
  if (B.charge) {
    for (const id of ['kiai', 'teleport']) { const i = has(id); if (ready(i)) return useTech(i); }
  }
  if (run.hp < s.maxHp * .45) { const i = has('heal'); if (ready(i)) return useTech(i); }
  if (SAVE.set.autoSenzu && run.hp < s.maxHp * .3) { const i = run.items.indexOf('senzu'); if (i >= 0) return useItem(i); }
  const si = has('ssj'); if (si >= 0 && B.buff.ssj <= 0 && ready(si)) return useTech(si);
  const order = run.techs.map((t, i) => i).filter(i => !['kiai', 'teleport', 'heal', 'ssj'].includes(run.techs[i].id))
    .sort((a, b) => TECH[run.techs[b].id].cost - TECH[run.techs[a].id].cost);
  for (const i of order) if (ready(i)) return useTech(i);
}

function winBattle() {
  B.over = true; sfx('win');
  const e = B.e, f = run.floor, S = B.S;
  run.kills++; if (e.boss) run.bosses++;
  const base = (8 + f * 4) * ({ battle: 1, elite: 1.8, boss: 3 }[e.type]);
  const gold = Math.round(base * (1 + S.goldPct) * rnd(.9, 1.15));
  addGold(gold);
  heal(S.maxHp * .08);
  const ballChance = ({ battle: .05, elite: .6, boss: 1 }[e.type]) + S.ballPct;
  let ball = false;
  if (SAVE.balls < 7 && Math.random() < ballChance) { findBall(); ball = true; }
  const n = 3 + meta('pick');
  run.reward = { cards: genCards(n, e.type === 'boss' ? 'r' : null), gold, ball, boss: e.type === 'boss' };
  run.screen = 'reward'; save();
  setTimeout(() => { if (run && run.screen === 'reward') go('reward'); }, 650);
}

function playerDown() {
  if (B.over) return;
  if (meta('revive') && !run.revived) {
    run.revived = true; run.hp = B.S.maxHp * .4; toast('🐉 Shenlong belebt dich wieder!'); sfx('heal'); return;
  }
  B.over = true; sfx('lose');
  setTimeout(() => endRun(false), 700);
}

function endRun(victory) {
  const cleared = victory ? MAX_FLOOR : run.floor - 1;
  let z = cleared * 6 + run.bosses * 25 + (victory ? 100 : 0) + Math.floor(run.kills * 1.5);
  z = Math.round(z * (1 + meta('zgain') * .1) * SAGAS[run.saga].zmul);
  const prevBest = SAVE.best, winTxt = SAGAS[run.saga].win;
  SAVE.zenkai += z; SAVE.best = Math.max(SAVE.best, victory ? MAX_FLOOR : run.floor);
  if (victory) SAVE.wins++;
  const summary = { victory, winTxt, floor: victory ? MAX_FLOOR : run.floor, z, kills: run.kills, bosses: run.bosses, balls: run.balls, gold: run.gold, newBest: SAVE.best > prevBest };
  SAVE.run = null; run = null; B = null; save();
  go('end', summary);
}

/* ---------- UI ---------- */
const view = html => { $('#app').innerHTML = html; };
function toast(t) {
  const el = $('#toast'); el.textContent = t; el.classList.add('show');
  clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove('show'), 1800);
}
function floatText(txt, who, cls) {
  if (!SAVE.set.nums) return;
  const el = document.createElement('div');
  el.className = 'fl ' + (cls || ''); el.textContent = txt;
  const r = $(who === 'e' ? '#enemyAv' : '#playerAv');
  if (r) {
    const b = r.getBoundingClientRect();
    el.style.left = (b.left + b.width / 2 + rnd(-30, 30)) + 'px'; el.style.top = (b.top + 4) + 'px';
  } else { el.style.left = '50%'; el.style.top = '40%'; }
  $('#floats').appendChild(el); setTimeout(() => el.remove(), 900);
}
function pulse(sel) { const el = $(sel); if (!el) return; el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); }
function modal(html) { const m = $('#modal'); m.innerHTML = '<div class="sheet">' + html + '</div>'; m.hidden = false; }
function closeModal() { $('#modal').hidden = true; }

function hud() {
  const s = stats();
  return `<div class="hud"><span class="chip">⛰️ ${run.floor}/${MAX_FLOOR}</span><span class="chip">🪙 ${run.gold}</span>
    <span class="chip">🟠 ${SAVE.balls}/7</span><span class="sp"></span>
    <button class="chip" data-a="build" style="color:inherit;font:inherit;border:1px solid var(--line)">🎒 Build</button></div>
    <div class="bar hp" style="margin-bottom:8px"><i style="width:${clamp(run.hp / s.maxHp * 100, 0, 100)}%"></i><span>${Math.ceil(run.hp)} / ${s.maxHp} LP</span></div>`;
}
function pathBar() {
  let h = '<div class="path">';
  for (let f = 1; f <= MAX_FLOOR; f++) h += `<i class="${f < run.floor ? 'done' : f === run.floor ? 'cur' : ''} ${bossAt(f) ? 'boss' : ''}"></i>`;
  return h + '</div>';
}
function cardHtml(c, extra = '', attrs = '', cls = '') {
  const I = cardInfo(c), lvTxt = c.kind === 'tech' ? ` · ${TECH[c.id].cost} Ki` : '';
  const have = c.kind === 'tech' ? run.techs.find(t => t.id === c.id) : null;
  const up = have ? ` <span style="color:var(--grn)">▲ Stufe ${have.lv + 1}</span>` : '';
  const kind = { tech: 'TECHNIK', pass: 'PASSIV', item: 'ITEM' }[c.kind];
  const cnt = c.kind === 'pass' ? run.pass.filter(x => x === c.id).length : 0;
  return `<button class="card ${c.r} ${cls}" ${attrs}><span class="ic">${I.i}</span><span><span class="tag">${RAR[c.r]} · ${kind}${lvTxt}</span>
    <b>${I.n}${up}${cnt ? ` <span class="mut small">(×${cnt})</span>` : ''}</b><span class="d">${I.d}</span></span>${extra}</button>`;
}

const SCREENS = {
  menu() {
    const ch = CHARS[SAVE.sel];
    view(`<div class="scroll center">
      <div class="logo">ZENKAI<br>QUEST</div><div class="sub">Roguelite · Idle-Kampf · Dragon-Ball-Fan-Projekt</div>
      <div class="panel" style="width:100%"><div class="stats">
        <div><b>${SAVE.best || '–'}</b><span>Beste Etage</span></div><div><b>${SAVE.wins}</b><span>Siege</span></div>
        <div><b>${SAVE.runs}</b><span>Runs</span></div><div><b>⭐${SAVE.zenkai}</b><span>Zenkai</span></div></div></div>
      <div class="panel" style="width:100%;display:flex;gap:12px;align-items:center">
        <div class="aura" style="--ac:${ch.ac};width:64px;height:64px">${avatar(SAVE.sel)}</div>
        <div style="text-align:left"><b>${ch.n}</b><div class="small mut">${ch.d}</div></div></div>
      <div class="row">${Object.keys(SAGAS).map(id => { const g = SAGAS[id], ok = id === 'saiyan' || SAVE.wins > 0; return `<button class="btn ${sagaSel() === id ? '' : 'sec'}" data-a="saga" data-id="${id}" ${ok ? '' : 'disabled'}>${ok ? g.i : '🔒'} ${g.n.split(' ')[0].replace('Saiyajin-', 'Saiyajin')}</button>`; }).join('')}</div>
      <div class="small mut" style="margin-top:-4px">${SAGAS[sagaSel()].d}</div>
      ${SAVE.run ? '<button class="btn grn" data-a="resume">▶ Run fortsetzen (Etage ' + SAVE.run.floor + ')</button>' : ''}
      <button class="btn" data-a="start">${SAVE.run ? '⚔️ Neuer Run (verwirft den alten)' : '⚔️ Run starten'}</button>
      <div class="row"><button class="btn sec" data-a="metaScr">🏋️ Training</button><button class="btn sec" data-a="chars">🥋 Kämpfer</button></div>
      ${SAVE.balls >= 7 ? '<button class="btn red" data-a="wish">🐉 SHENLONG RUFEN! (7/7)</button>' : `<div class="panel small mut" style="width:100%">🟠 Dragonbälle: <b style="color:var(--org2)">${SAVE.balls}/7</b> – gefunden in Elite-Kämpfen, Bossen und Ereignissen. Sie bleiben auch nach dem Tod erhalten!</div>`}
      <div class="panel small mut" style="width:100%;text-align:left"><b style="color:var(--txt)">So geht's:</b><br>Der Kampf läuft automatisch. Du nutzt <b>Techniken</b> (Ki) im richtigen Moment und baust zwischen den Kämpfen deinen <b>Build</b>. Bei <b>⚠️ Aufladung</b> unterbrichst du mit Kiai oder weichst per Instant Transmission aus. Stirbst du, bekommst du ⭐ Zenkai und wirst dauerhaft stärker.</div>
      <div class="row" style="width:100%"><button class="btn sec" data-a="settings">⚙️ Einstellungen</button><button class="btn sec" data-a="reset">🗑️ Reset</button></div>
    </div>`);
  },
  map() {
    view(`${hud()}${pathBar()}<div class="scroll">
      <h2 class="center">Etage ${run.floor}${bossAt(run.floor) ? ' – BOSS' : ''}</h2>
      <p class="mut center small">Wähle deinen Weg</p>
      ${run.opts.map((n, i) => {
        const inf = n.type === 'boss' ? { i: ENEMIES[bossAt(run.floor)].e, n: 'Boss: ' + ENEMIES[bossAt(run.floor)].n, d: 'Zeit für die Entscheidung!' } : NODE_INFO[n.type];
        return `<button class="node ${n.type}" data-a="node" data-i="${i}"><span class="ic">${inf.i}</span><span><b>${inf.n}</b><span class="mut small">${inf.d}</span></span></button>`;
      }).join('')}
      <button class="btn sec" data-a="menu" style="margin-top:auto">⬅ Hauptmenü (Run bleibt gespeichert)</button>
    </div>`);
  },
  battle() { startBattle(); },
  'battle-ui'() {
    const e = B.e, ch = CHARS[run.char];
    view(`<div class="battle">
      <div class="ctrl"><button class="ib ${B.auto ? 'on' : ''}" id="autoB" data-a="auto" style="flex:1">🤖 Auto: ${B.auto ? 'AN' : 'AUS'}</button><button class="ib ${B.fast ? 'on' : ''}" id="fastB" data-a="fast">⏩ x${B.fast ? 2 : 1}</button></div>
      <div class="fighter"><div class="top"><div class="av" id="enemyAv">${e.e}</div>
        <div style="flex:1"><div class="nm">${e.n}${e.type === 'elite' ? ' 💀' : ''}${e.boss ? ' 👑' : ''}</div>
        <div class="bar hp e"><i id="eHp"></i><span id="eHpT"></span></div></div></div></div>
      <div class="arena"><div class="vs" id="vs">VS</div><div class="warn" id="warn" hidden>⚠️ AUFLADUNG! Kiai oder Ausweichen!<div class="bar"><i id="warnB"></i></div></div></div>
      <div class="fighter"><div class="top"><div class="av aura" id="playerAv" style="--ac:${ch.ac}">${avatar(run.char)}</div>
        <div style="flex:1"><div class="nm">${ch.n} <span class="bufflist" id="buffs"></span></div>
        <div class="bar hp"><i id="pHp"></i><span id="pHpT"></span></div>
        <div class="bar ki" style="margin-top:4px"><i id="pKi"></i><span id="pKiT"></span></div></div></div></div>
      <div class="techs" id="techs"></div>
      <div class="items" id="items"></div>
    </div>`);
    B.uiBuilt = false; updateBattleUI();
  },
  reward() {
    const r = run.reward;
    view(`${hud()}<div class="scroll">
      <div class="center"><div class="big">${r.boss ? '🏆' : '✅'}</div><h2>${r.boss ? 'Boss besiegt!' : 'Sieg!'}</h2>
      <p class="mut">+${r.gold} 🪙 Gold${r.ball ? ' · <b style="color:var(--org2)">🟠 Dragonball gefunden!</b>' : ''}</p></div>
      <p class="center small mut">Wähle eine Belohnung</p>
      ${r.cards.map((c, i) => cardHtml(c, '', `data-a="reward" data-i="${i}"`)).join('')}
      <button class="btn sec" data-a="skipReward">Überspringen (+25 🪙)</button>
    </div>`);
  },
  shop() {
    view(`${hud()}<div class="scroll"><h2 class="center">🛒 Bulmas Shop</h2>
      ${run.shop.items.map((it, i) => {
        const afford = run.gold >= it.price && !it.sold;
        const price = `<span class="price">${it.sold ? 'VERKAUFT' : it.price + ' 🪙'}</span>`;
        if (it.k === 'card') return cardHtml(it.card, price, `data-a="buy" data-i="${i}"`, (afford ? '' : 'off ') + (it.sold ? 'sold' : ''));
        const info = { senzu: ['🫘', 'Senzu-Bohne', 'Item: heilt 60% LP im Kampf'], heal: ['🍖', 'Festmahl', 'Heilt sofort 40% LP'], train: ['🏋️', 'Privattraining', '+3 Angriff dauerhaft (nur im Run)'] }[it.k];
        return `<button class="card ${afford ? '' : 'off'} ${it.sold ? 'sold' : ''}" data-a="buy" data-i="${i}"><span class="ic">${info[0]}</span><span><b>${info[1]}</b><span class="d">${info[2]}</span></span>${price}</button>`;
      }).join('')}
      <button class="btn" data-a="leave" style="margin-top:6px">Weiter ➜</button></div>`);
  },
  rest() {
    const s = stats();
    view(`${hud()}<div class="scroll center"><div class="big">🏕️</div><h2>Rastplatz</h2><p class="mut">Ruhe dich aus oder trainiere.</p>
      <button class="btn grn" data-a="restHeal">💚 Ausruhen: +45% LP (${Math.round(s.maxHp * .45)})</button>
      <button class="btn" data-a="restTrain">💪 Trainieren: +2 Angriff dauerhaft</button>
      <button class="btn sec" data-a="restItem" ${run.items.length >= 4 ? 'disabled' : ''}>🔋 Ki-Kapsel basteln (Item)</button></div>`);
  },
  event() {
    const ev = run.event, E = EVENTS[ev.id];
    view(`${hud()}<div class="scroll center"><div class="big">${E.i}</div><h2>${E.t}</h2><p class="mut">${E.txt}</p>
      ${ev.res ? `<div class="panel" style="width:100%"><b>${ev.res}</b></div><button class="btn" data-a="leave">Weiter ➜</button>`
        : E.o.map(o => `<button class="btn sec" data-a="ev" data-k="${o[1]}">${o[0]}</button>`).join('')}</div>`);
  },
  end(sm) {
    view(`<div class="scroll center"><div class="big">${sm.victory ? '🏆' : '💀'}</div>
      <h1>${sm.victory ? 'SIEG!' : 'Besiegt…'}</h1>
      <p class="mut">${sm.victory ? sm.winTxt : 'Ein Saiyajin wird nach jeder Niederlage stärker.'}</p>
      <div class="panel" style="width:100%"><div class="stats" style="grid-template-columns:repeat(3,1fr)">
        <div><b>${sm.floor}</b><span>Etage</span></div><div><b>${sm.kills}</b><span>Siege</span></div><div><b>${sm.bosses}</b><span>Bosse</span></div></div></div>
      <div class="panel" style="width:100%"><div style="font-size:30px;font-weight:900;color:var(--org2)">+${sm.z} ⭐ Zenkai</div>
        <div class="small mut">Gesamt: ${SAVE.zenkai} ⭐${sm.newBest ? ' · 🎉 Neue Bestleistung!' : ''}${sm.balls ? ' · 🟠 +' + sm.balls + ' Dragonball' : ''}</div></div>
      ${SAVE.balls >= 7 ? '<button class="btn red" data-a="wish">🐉 SHENLONG RUFEN!</button>' : ''}
      <button class="btn" data-a="metaScr">🏋️ Zenkai ausgeben</button>
      <button class="btn grn" data-a="start">⚔️ Nochmal!</button>
      <button class="btn sec" data-a="menu">Hauptmenü</button></div>`);
  },
  meta() {
    view(`<div class="hud"><button class="chip" data-a="menu" style="color:inherit;font:inherit">⬅ Zurück</button><span class="sp"></span><span class="chip">⭐ ${SAVE.zenkai}</span></div>
      <div class="scroll"><h2 class="center">🏋️ Training bei Meister Kaio</h2><p class="center mut small">Dauerhafte Verbesserungen für alle Runs</p>
      ${META.map(m => {
        const l = meta(m.id), maxed = l >= m.max, c = m.cost(l);
        return `<div class="meta"><span class="ic">${m.i}</span><span class="tx"><b>${m.n} ${m.max > 1 ? `<span class="lvl">Stufe ${l}/${m.max}</span>` : (l ? '<span class="lvl">✔ FREIGESCHALTET</span>' : '')}</b><span class="small mut">${m.d}</span></span>
        <button class="btn ${maxed ? 'sec' : ''}" data-a="buyMeta" data-id="${m.id}" ${maxed || SAVE.zenkai < c ? 'disabled' : ''}>${maxed ? 'MAX' : c + ' ⭐'}</button></div>`;
      }).join('')}</div>`);
  },
  chars() {
    view(`<div class="hud"><button class="chip" data-a="menu" style="color:inherit;font:inherit">⬅ Zurück</button><span class="sp"></span><span class="chip">⭐ ${SAVE.zenkai}</span></div>
      <div class="scroll"><h2 class="center">🥋 Kämpfer wählen</h2>
      ${Object.keys(CHARS).map(id => {
        const c = CHARS[id], own = SAVE.chars[id], sel = SAVE.sel === id;
        return `<div class="meta" style="${sel ? 'border-color:var(--org)' : ''}"><div class="aura" style="--ac:${c.ac};width:52px;height:52px;flex:none">${avatar(id)}</div>
          <span class="tx"><b>${c.n}</b><span class="small mut">${c.d}</span><span class="small">❤️${c.hp} · 💪${c.atk} · 🛡️${c.def}</span></span>
          <button class="btn ${own ? 'sec' : ''}" data-a="${own ? 'selChar' : 'buyChar'}" data-id="${id}" ${sel || (!own && SAVE.zenkai < c.cost) ? 'disabled' : ''}>${sel ? '✔' : own ? 'Wählen' : c.cost + ' ⭐'}</button></div>`;
      }).join('')}</div>`);
  },
  settings() {
    const t = (k, label, d) => `<button class="meta" data-a="set" data-k="${k}" style="width:100%;color:inherit;font:inherit;text-align:left"><span class="tx"><b>${label}</b><span class="small mut">${d}</span></span><span class="btn ${(k === 'sound' ? SAVE.sound : SAVE.set[k]) ? 'grn' : 'sec'}" style="width:auto;min-height:40px;padding:8px 14px">${(k === 'sound' ? SAVE.sound : SAVE.set[k]) ? 'AN' : 'AUS'}</span></button>`;
    view(`<div class="hud"><button class="chip" data-a="menu" style="color:inherit;font:inherit">⬅ Zurück</button></div>
      <div class="scroll"><h2 class="center">⚙️ Einstellungen</h2>
      ${t('auto', '🤖 Auto-Kampf', 'Techniken werden automatisch eingesetzt (startet jeden Kampf an)')}
      ${t('autoSenzu', '🫘 Auto-Senzu', 'Auto-Modus isst bei unter 30% LP eine Senzu-Bohne')}
      ${t('fast', '⏩ Doppelte Geschwindigkeit', 'Kämpfe laufen mit x2')}
      ${t('sound', '🔊 Ton', 'Soundeffekte')}
      ${t('vib', '📳 Vibration', 'Bei Treffern (nur Android)')}
      ${t('nums', '🔢 Schadenszahlen', 'Zahlen über den Kämpfern anzeigen')}
      </div>`);
  },
  wish() {
    view(`<div class="scroll center"><div class="big">🐉</div><h2>Shenlong erscheint!</h2><p class="mut">"Sprich deinen Wunsch aus!"</p>
      ${Object.keys(WISHES).map(id => `<button class="card c" data-a="makeWish" data-id="${id}"><span class="ic">${WISHES[id].i}</span><span><b>${WISHES[id].n}</b><span class="d">${WISHES[id].d}</span></span></button>`).join('')}
      <button class="btn sec" data-a="menu">Später</button></div>`);
  },
};

function go(name, arg) {
  closeModal();
  if (!name.startsWith('battle')) B = null;
  (SCREENS[name] || SCREENS.menu)(arg);
}

/* Live-Update des Kampf-UI */
function updateBattleUI() {
  if (!B || !$('#eHp')) return;
  const s = B.S, e = B.e;
  $('#eHp').style.width = (B.ehp / B.eMax * 100) + '%'; $('#eHpT').textContent = Math.ceil(B.ehp) + ' / ' + B.eMax;
  $('#pHp').style.width = clamp(run.hp / s.maxHp * 100, 0, 100) + '%'; $('#pHpT').textContent = Math.max(0, Math.ceil(run.hp)) + ' / ' + s.maxHp;
  $('#pKi').style.width = (B.ki / s.maxKi * 100) + '%'; $('#pKiT').textContent = 'Ki ' + Math.floor(B.ki);
  const w = $('#warn'); w.hidden = !B.charge; $('#vs').hidden = !!B.charge;
  if (B.charge) $('#warnB').style.width = (B.charge.t / B.charge.max * 100) + '%';
  const bl = [];
  if (B.buff.ssj > 0) bl.push('👱 SSJ ' + Math.ceil(B.buff.ssj) + 's');
  if (B.buff.dodge > 0) bl.push('⚡ ' + B.buff.dodge.toFixed(1) + 's');
  if (B.stun > 0) bl.push('💫 Gegner betäubt');
  $('#buffs').textContent = bl.join(' · ');
  $('#playerAv').classList.toggle('ssj', B.buff.ssj > 0);
  if (B.buff.ssj > 0 !== !!B.ssjShown) { B.ssjShown = B.buff.ssj > 0; $('#playerAv').innerHTML = avatar(run.char, B.ssjShown); }
  // Techniken
  const tc = $('#techs');
  if (!B.uiBuilt) {
    tc.innerHTML = Array.from({ length: MAX_TECHS }, (_, i) => {
      const t = run.techs[i];
      if (!t) return '<button class="tb empty">–</button>';
      const T = TECH[t.id];
      return `<button class="tb" data-a="tech" data-i="${i}"><span class="ic">${T.i}</span><span><b>${T.n}${t.lv > 1 ? ' ★' + t.lv : ''}</b><small>${T.cost} Ki</small></span><span class="cdo"></span></button>`;
    }).join('');
    const ic = $('#items');
    ic.innerHTML = run.items.length ? run.items.map((id, i) => `<button class="ib" data-a="item" data-i="${i}">${ITEMS[id].i} ${ITEMS[id].n}</button>`).join('') : '<span class="small mut" style="flex:1;text-align:center">Keine Items</span>';
    B.uiBuilt = true; B.itemN = run.items.length;
  }
  if (B.itemN !== run.items.length) B.uiBuilt = false;
  [...tc.children].forEach((b, i) => {
    const t = run.techs[i]; if (!t) return;
    const T = TECH[t.id], cd = B.cd[t.id] || 0, ok = B.ki >= T.cost && cd <= 0;
    b.classList.toggle('ready', ok); b.classList.toggle('nokai', B.ki < T.cost);
    b.querySelector('.cdo').style.width = (T.cd ? cd / T.cd * 100 : 0) + '%';
  });
}

/* Build-Übersicht & Technik-Ersetzen */
function showBuild() {
  const s = stats();
  modal(`<h3>🎒 Dein Build</h3>
    <div class="panel small">❤️ ${s.maxHp} LP · 💪 ${s.atk.toFixed(1)} Angriff · 🛡️ ${s.def} Rüstung · 🌀 ${s.regen.toFixed(1)} Ki/s<br>🎯 ${Math.round(s.crit * 100)}% Krit (×${s.critDmg.toFixed(2)}) · ⚡ ${Math.round(s.spd * 100)}% Tempo</div>
    <b>Techniken (${run.techs.length}/${MAX_TECHS})</b>
    ${run.techs.map(t => `<div class="meta"><span class="ic">${TECH[t.id].i}</span><span class="tx"><b>${TECH[t.id].n} <span class="lvl">Stufe ${t.lv}</span></b><span class="small mut">${TECH[t.id].d}</span></span></div>`).join('')}
    <b>Passive</b>
    ${run.pass.length ? Object.entries(run.pass.reduce((a, x) => (a[x] = (a[x] || 0) + 1, a), {})).map(([id, n]) => `<div class="meta"><span class="ic">${PASS[id].i}</span><span class="tx"><b>${PASS[id].n} ×${n}</b><span class="small mut">${PASS[id].d}</span></span></div>`).join('') : '<span class="mut small">Noch keine</span>'}
    <button class="btn sec" data-a="closeModal">Schließen</button>`);
}
function showReplace(card, done) {
  const I = cardInfo(card);
  window.__replaceDone = done; window.__replaceCard = card;
  modal(`<h3>Technik-Slots voll!</h3><p class="mut small">Welche Technik ersetzt du durch ${I.i} <b>${I.n}</b>?</p>
    ${run.techs.map((t, i) => `<button class="card c" data-a="replace" data-i="${i}"><span class="ic">${TECH[t.id].i}</span><span><b>${TECH[t.id].n} (Stufe ${t.lv})</b><span class="d">${TECH[t.id].d}</span></span></button>`).join('')}
    <button class="btn sec" data-a="closeModal">Abbrechen</button>`);
}

/* ---------- Eingabe ---------- */
const ACT = {
  start() { sfx('ui'); if (SAVE.run && !confirm('Den gespeicherten Run verwerfen und neu starten?')) return; newRun(); },
  resume() { run = SAVE.run; run.saga = run.saga || 'saiyan'; sfx('ui'); go(run.screen === 'reward' && !run.reward ? 'map' : run.screen); },
  saga(d) { SAVE.saga = d.id; save(); sfx('ui'); go('menu'); },
  menu() { if (B) B = null; sfx('ui'); go('menu'); },
  metaScr() { go('meta'); }, chars() { go('chars'); }, wish() { go('wish'); },
  settings() { go('settings'); },
  set(d) { if (d.k === 'sound') SAVE.sound = !SAVE.sound; else SAVE.set[d.k] = !SAVE.set[d.k]; save(); sfx('ui'); go('settings'); },
  snd() { SAVE.sound = !SAVE.sound; save(); go('menu'); },
  reset() { if (confirm('Wirklich ALLES zurücksetzen (Zenkai, Freischaltungen, Run)?')) { SAVE = defSave(); save(); go('menu'); } },
  node(d) { enterNode(+d.i); },
  tech(d) { useTech(+d.i); },
  item(d) { useItem(+d.i); },
  auto() { B.auto = !B.auto; SAVE.set.auto = B.auto; save(); $('#autoB').textContent = '🤖 Auto: ' + (B.auto ? 'AN' : 'AUS'); $('#autoB').classList.toggle('on', B.auto); },
  fast() { B.fast = !B.fast; SAVE.set.fast = B.fast; save(); $('#fastB').textContent = '⏩ x' + (B.fast ? 2 : 1); $('#fastB').classList.toggle('on', B.fast); },
  reward(d) { pickReward(+d.i); },
  skipReward() { addGold(25); finishReward(); },
  buy(d) {
    const it = run.shop.items[+d.i]; if (it.sold || run.gold < it.price) return sfx('hurt');
    const s = stats();
    if (it.k === 'card') { const r = giveCard(it.card); if (r === 'full') { return showReplace(it.card, () => { addGold(-it.price); it.sold = true; save(); go('shop'); }); } }
    else if (it.k === 'senzu') { if (run.items.length >= 4) return toast('Item-Slots voll'); run.items.push('senzu'); }
    else if (it.k === 'heal') heal(s.maxHp * .4);
    else if (it.k === 'train') run.bonusAtk += 3;
    addGold(-it.price); sfx('win');
    if (it.k !== 'senzu') it.sold = it.k === 'card' || it.k === 'train' ? true : it.sold;
    if (it.k === 'card') it.sold = true;
    save(); go('shop');
  },
  leave() { nextFloor(); },
  restHeal() { heal(stats().maxHp * .45); nextFloor(); },
  restTrain() { run.bonusAtk += 2; nextFloor(); },
  restItem() { if (run.items.length < 4) { run.items.push('kicap'); nextFloor(); } },
  ev(d) { eventPick(d.k); },
  buyMeta(d) {
    const m = META.find(x => x.id === d.id), l = meta(m.id), c = m.cost(l);
    if (l >= m.max || SAVE.zenkai < c) return;
    SAVE.zenkai -= c; SAVE.meta[m.id] = l + 1; save(); sfx('win'); go('meta');
  },
  selChar(d) { SAVE.sel = d.id; save(); go('chars'); },
  buyChar(d) { const c = CHARS[d.id]; if (SAVE.zenkai < c.cost) return; SAVE.zenkai -= c.cost; SAVE.chars[d.id] = 1; SAVE.sel = d.id; save(); sfx('win'); go('chars'); },
  makeWish(d) {
    SAVE.balls = 0;
    if (d.id === 'zenkai') SAVE.zenkai += 300; else SAVE.wish[d.id] = (SAVE.wish[d.id] || 0) + 1;
    save(); sfx('win'); toast('🐉 Dein Wunsch wurde erfüllt!'); go('menu');
  },
  build() { showBuild(); },
  closeModal() { closeModal(); },
  replace(d) {
    const i = +d.i, card = window.__replaceCard, done = window.__replaceDone;
    if (B && !B.over) return;
    run.techs.splice(i, 1, { id: card.id, lv: 1 });
    closeModal(); sfx('win'); done();
  },
};

document.addEventListener('click', e => {
  const b = e.target.closest('[data-a]'); if (!b || b.disabled) return;
  const f = ACT[b.dataset.a]; if (f) f(b.dataset);
});

/* Pausiere nichts künstlich – dt ist gedeckelt, ein versteckter Tab hält den Kampf praktisch an. */
document.addEventListener('visibilitychange', () => { lastT = performance.now(); });

/* ---------- Start ---------- */
go('menu');
if ('serviceWorker' in navigator) { /* bewusst kein SW: einfache Updates über Netlify */ }
