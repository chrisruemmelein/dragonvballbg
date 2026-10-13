'use strict';
/* Zenkai Quest – Spiellogik & UI. Daten: data.js · Grafik: art.js · Effekte: fx.js */

/* ---------- Helfer ---------- */
const $ = s => document.querySelector(s);
const rnd = (a, b) => a + Math.random() * (b - a);
const ri = (a, b) => Math.floor(rnd(a, b + 1));
const pick = a => a[Math.floor(Math.random() * a.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const SAVE_KEY = 'zenkai_quest_v1';
const RUN_VER = 3;
const MAX_ITEMS = 5;
let VIS = true; // false = keine Optik (für Tests)

/* ---------- Spielstand ---------- */
function defSave() {
  return { zenkai: 0, meta: {}, chars: { goku: 1 }, sel: 'goku', saga: 'saiyan', grav: 0, gravMax: 0, sagaWins: {}, best: 0, wins: 0, runs: 0,
           balls: 0, wish: {}, run: null, sound: true,
           set: { auto: true, fast: false, vib: true, nums: true, autoSenzu: true, shake: true } };
}
function loadSave() {
  try {
    const s = JSON.parse(localStorage.getItem(SAVE_KEY)) || {};
    const d = Object.assign(defSave(), s);
    d.set = Object.assign(defSave().set, d.set);
    if (d.run && d.run.v !== RUN_VER) d.run = null; // alte Run-Struktur verwerfen
    if (d.meta && (d.meta.unlock_ssj || d.meta.unlock_kaioken || d.meta.unlock_ui)) d.meta.unlock_form = 1; // alte Freischaltungen -> Transformation
    return d;
  } catch (e) { return defSave(); }
}
function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(SAVE)); } catch (e) {} }
let SAVE = loadSave();
let run = null;   // aktueller Run (liegt auch in SAVE.run)
let B = null;     // aktueller Kampf

/* ---------- Saga-/Etagen-Helfer ---------- */
const sg = () => SAGAS[run.saga];
const maxFloor = () => sg().floors;
const actIdx = f => Math.floor((f - 1) / 5) % sg().acts.length;
const actOf = f => sg().acts[actIdx(f)];
const isBossFloor = f => f % 5 === 0;
const bossAt = f => isBossFloor(f) ? actOf(f).boss : null;
const sagaOpen = id => !SAGAS[id].req || (SAVE.sagaWins[SAGAS[id].req] || 0) > 0;
const curSaga = () => sagaOpen(SAVE.saga) ? SAVE.saga : 'saiyan';
const meta = id => SAVE.meta[id] || 0;
const NOFORM = { atk: 0, spd: 0, regen: 0, taken: 0, dodge: 0, crit: 0, drain: 0, kidrain: 0 };
const formLv = () => { const t = run.techs.find(t => t.id === 'form'); return t ? t.lv : 0; };
const formDur = l => Math.round(12 + Math.min(l, FORM_MAX) * .8);
function formAt(l) {
  const f = FORMS[Math.min(l, FORM_MAX)], x = l > FORM_MAX ? 1 + .12 * (l - FORM_MAX) : 1;
  return Object.assign({}, NOFORM, f, { atk: f.atk * x, spd: f.spd * x, regen: f.regen * x, crit: f.crit * x, dodge: Math.min(.8, f.dodge * x) });
}
function formDesc(l) {
  const f = formAt(l), pc = v => Math.round(v * 100), p = [];
  p.push('+' + pc(f.atk) + '% Angriff', '+' + pc(f.spd) + '% Tempo');
  if (f.regen) p.push('+' + pc(f.regen) + '% Ki-Regen');
  if (f.taken) p.push(pc(f.taken) + '% erlittener Schaden');
  if (f.dodge) p.push(pc(f.dodge) + '% Ausweichen');
  if (f.crit) p.push('+' + pc(f.crit) + '% Krit');
  if (f.drain) p.push('−' + (f.drain * 100).toFixed(1).replace('.0', '') + '% LP/s');
  if (f.kidrain) p.push('−' + f.kidrain + ' Ki/s');
  return p.join(' · ') + ' · ' + formDur(l) + 's';
}
const formName = l => FORMS[Math.min(l, FORM_MAX)].n + (l > FORM_MAX ? ' +' + (l - FORM_MAX) : '');
const tName = t => t.id === 'form' ? formName(t.lv) : TECH[t.id].n + (t.lv > 1 ? ' ★' + t.lv : '');
const tIcon = t => t.id === 'form' ? FORMS[Math.min(t.lv, FORM_MAX)].ico : TECH[t.id].i;
const tDesc = t => t.id === 'form' ? formDesc(t.lv) : TECH[t.id].d;

/* ---------- Audio (winzig, WebAudio) ---------- */
let AC = null;
function sfx(kind) {
  if (!SAVE.sound) return;
  try {
    AC = AC || new (window.AudioContext || window.webkitAudioContext)();
    const o = AC.createOscillator(), g = AC.createGain();
    const f = { hit: [180, 90, .08], crit: [420, 160, .14], hurt: [120, 60, .12], tech: [300, 900, .25], ui: [520, 700, .06],
                win: [400, 900, .35], lose: [300, 60, .6], heal: [500, 900, .2], boom: [120, 30, .4], power: [200, 1200, .6] }[kind] || [300, 300, .05];
    o.type = ['tech', 'win', 'heal', 'power'].includes(kind) ? 'triangle' : 'square';
    o.frequency.setValueAtTime(f[0], AC.currentTime);
    o.frequency.exponentialRampToValueAtTime(f[1], AC.currentTime + f[2]);
    g.gain.setValueAtTime(.06, AC.currentTime);
    g.gain.exponentialRampToValueAtTime(.0001, AC.currentTime + f[2]);
    o.connect(g); g.connect(AC.destination); o.start(); o.stop(AC.currentTime + f[2]);
  } catch (e) {}
}
function buzz(ms) { try { if (SAVE.set.vib && navigator.vibrate) navigator.vibrate(ms); } catch (e) {} }

/* ---------- Run-Logik ---------- */
function stats() {
  const c = CHARS[run.char];
  const A = { atkPct: 0, hpPct: 0, hpFlat: 0, def: 0, regenPct: 0, crit: 0, critDmg: 0, ls: 0, spdPct: 0, hpRegen: 0, thorns: 0, taken: 0, goldPct: 0,
              ballPct: 0, lowHpAtk: 0, kiOnHit: 0, kiOnHurt: 0, execute: 0, killHeal: 0, maxKi: 0 };
  let atkMul = 1;
  const add = m => { for (const k in m) { if (k === 'atkPct') atkMul *= 1 + m[k]; else A[k] += m[k]; } };
  add(c.mods);
  run.pass.forEach(id => add(PASS[id].m));
  run.relics.forEach(id => add(RELIC[id].m));
  atkMul *= (1 + meta('atk') * .08) * (1 + (SAVE.wish.power || 0) * .1);
  A.hpPct += meta('hp') * .10 + (SAVE.wish.power || 0) * .1;
  A.regenPct += meta('regen') * .08 + (SAVE.wish.ki || 0) * .15;
  A.crit += meta('crit') * .02;
  A.def += run.bonusDef || 0; A.hpFlat += run.bonusHp || 0;
  return {
    maxHp: Math.round((c.hp + A.hpFlat) * (1 + A.hpPct)),
    atk: (c.atk + run.bonusAtk) * atkMul,
    def: c.def + A.def, maxKi: c.ki + A.maxKi, regen: c.regen * (1 + A.regenPct),
    crit: clamp(c.crit + A.crit, 0, .8), critDmg: 1.6 + A.critDmg,
    ls: A.ls, spd: Math.max(.5, 1 + A.spdPct), hpRegen: A.hpRegen, thorns: A.thorns,
    taken: 1 + A.taken, goldPct: A.goldPct, ballPct: A.ballPct,
    lowHpAtk: A.lowHpAtk, kiOnHit: A.kiOnHit, kiOnHurt: A.kiOnHurt, execute: A.execute, killHeal: A.killHeal,
  };
}

function newRun() {
  const id = SAVE.sel, saga = curSaga(), grav = clamp(SAVE.grav, 0, SAVE.gravMax);
  run = { v: RUN_VER, char: id, saga, grav, floor: 1, hp: 1, gold: 20 + meta('gold') * 30,
          techs: CHARS[id].start.map(t => ({ id: t, lv: 1 })), pass: [], relics: [], items: [], bonusAtk: 0, bonusDef: 0, bonusHp: 0, buys: {}, balls: 0, kills: 0, bosses: 0,
          revived: false, endless: false, won: false, screen: 'map', opts: null, node: null, reward: null, shop: null, event: null };
  for (let i = 0; i < meta('senzu') + 1; i++) run.items.push('senzu');
  if (meta('unlock_form') && meta('startform') > 0) run.techs.push({ id: 'form', lv: meta('startform') });
  run.hp = stats().maxHp;
  SAVE.run = run; SAVE.runs++;
  run.opts = genNodes();
  save(); go('map');
}

function genNodes() {
  const f = run.floor, g = run.grav;
  if (isBossFloor(f)) return [{ type: 'boss' }];
  if (f === 1) return [{ type: 'battle' }, { type: 'battle' }];
  const pool = [['battle', 45], ['elite', f >= 3 ? (g >= 2 ? 28 : 16) : 0], ['shop', 13], ['rest', 14 - Math.min(g, 6)], ['event', 14]];
  const out = [];
  const wp = () => {
    const tot = pool.reduce((s, p) => s + p[1], 0); let r = Math.random() * tot;
    for (const p of pool) { if ((r -= p[1]) < 0) return p[0]; }
    return 'battle';
  };
  while (out.length < 2) { const t = wp(); if (!out.includes(t)) out.push(t); }
  if (isBossFloor(f + 1) && !out.some(t => t === 'rest' || t === 'shop')) out[1] = pick(['rest', 'shop']);
  return out.map(type => ({ type }));
}

const BOSS_TRAITS = {
  raditz: ['fast'], vegeta: ['barrage', 'berserk'], freezer: ['barrage', 'regen', 'armor'],
  gero: ['drain', 'armor'], android17: ['fast', 'barrage'], cell1: ['regen', 'barrage'], cell2: ['regen', 'armor', 'barrage'],
  dabura: ['armor', 'berserk'], fatbuu: ['regen', 'drain'], superbuu: ['barrage', 'regen', 'berserk'], kidbuu: ['fast', 'barrage', 'berserk'],
};

function makeEnemy(f, type) {
  const S = sg(), sf = f + S.off, g = run.grav;
  const act = actOf(f);
  const grow = (a, b) => sf <= 10 ? Math.pow(a, sf - 1) : Math.pow(a, 9) * Math.pow(b, sf - 10);
  let hp = 135 * grow(1.17, 1.11) * (1 + g * .22);
  let atk = 3 * grow(1.15, 1.09) * (1 + g * .14);
  let int = 1.7, def = sf * .7, chargeEvery = 0, boss = false;
  let id = pick(act.pool), nT = 0;
  if (f >= 4 && Math.random() < .55) nT = 1;
  if (g >= 6) nT = Math.max(nT, 1);
  if (f >= 6) chargeEvery = 4;
  if (type === 'elite') { id = pick(act.elite); hp *= 1.9; atk *= 1.3; int = 1.6; chargeEvery = 3; nT = 2; }
  if (type === 'boss') { id = act.boss; hp *= 2.5; atk *= 1.3; int = 1.5; chargeEvery = 3; boss = true; def *= 1.1; nT = 0; }
  const d = ENEMY[id];
  let tr = [];
  if (boss) tr = (BOSS_TRAITS[id] || []).slice();
  else { const k = TRAIT_KEYS.slice(); while (tr.length < nT) tr.push(k.splice(ri(0, k.length - 1), 1)[0]); }
  const traits = {}; tr.forEach(t => traits[t] = 1);
  if (traits.armor) def *= 1.6;
  if (traits.fast) int *= .75;
  return { id, n: d.n, p: d.p, size: d.size * (boss ? 1.08 : 1), hp: Math.round(hp), atk, int, def, chargeEvery, boss, type, traits };
}

function heal(x) { const s = B ? B.S : stats(); run.hp = Math.min(s.maxHp, run.hp + x); }
function addGold(x) { run.gold += Math.round(x); }

function nextFloor() {
  run.floor++;
  if (run.floor > maxFloor() && !run.endless && !run.won) return finalScreen();
  run.opts = genNodes(); run.node = null; run.reward = null; run.shop = null; run.event = null;
  run.screen = 'map'; save(); go('map');
}

function finalScreen() {
  // Saga geschafft: Sieg zählt sofort
  run.won = true;
  SAVE.wins++; SAVE.sagaWins[run.saga] = (SAVE.sagaWins[run.saga] || 0) + 1;
  if (run.grav === SAVE.gravMax && SAVE.gravMax < GRAV_MAX) SAVE.gravMax++;
  run.screen = 'final'; save(); sfx('win'); go('final');
}

function enterNode(i) {
  const n = run.opts[i];
  run.node = n; sfx('ui');
  if (['battle', 'elite', 'boss'].includes(n.type)) { run.screen = 'battle'; save(); go('battle'); }
  else if (n.type === 'shop') { run.shop = genShop(); run.screen = 'shop'; save(); go('shop'); }
  else if (n.type === 'rest') { run.screen = 'rest'; save(); go('rest'); }
  else if (n.type === 'event') { run.event = { id: pick(Object.keys(EVENTS)), res: null }; run.screen = 'event'; save(); go('event'); }
}

/* ---------- Karten / Belohnungen ---------- */
function cardInfo(c) {
  if (c.kind === 'tech' && c.id === 'form') { const nl = formLv() + 1; return { i: FORMS[Math.min(nl, FORM_MAX)].ico, n: formName(nl), d: 'Nächste Form: ' + formDesc(nl), cost: TECH.form.cost }; }
  return c.kind === 'tech' ? TECH[c.id] : c.kind === 'pass' ? PASS[c.id] : c.kind === 'relic' ? RELIC[c.id] : ITEMS[c.id];
}
function cardPool(minRar) {
  const out = [];
  for (const id in TECH) { const t = TECH[id]; if (!t.lock || meta('unlock_' + t.lock)) out.push({ kind: 'tech', id, r: t.r }); }
  for (const id in PASS) {
    const p = PASS[id]; if (p.lock && !meta('unlock_' + p.lock)) continue;
    if (run.pass.filter(x => x === id).length >= 4) continue;
    out.push({ kind: 'pass', id, r: p.r });
  }
  for (const id in ITEMS) out.push({ kind: 'item', id, r: ITEMS[id].r });
  return out.filter(c => !(minRar === 'r' && c.r === 'c'));
}
function genCards(n, minRar) {
  const pool = cardPool(minRar), res = [];
  const bonus = Math.min(run.floor, 20) * 1.2;
  const w = c => ({ c: 60 - bonus, r: 30 + bonus * .6, e: 10 + bonus * .5 }[c.r]) * (c.kind === 'item' ? .5 : 1);
  while (res.length < n && pool.length) {
    const tot = pool.reduce((s, c) => s + w(c), 0); let r = Math.random() * tot, idx = 0;
    for (; idx < pool.length; idx++) { if ((r -= w(pool[idx])) < 0) break; }
    idx = Math.min(idx, pool.length - 1);
    res.push(pool.splice(idx, 1)[0]);
  }
  return res;
}
function genRelics(n) {
  const ids = Object.keys(RELIC).filter(id => !run.relics.includes(id));
  const out = [];
  while (out.length < n && ids.length) out.push({ kind: 'relic', id: ids.splice(ri(0, ids.length - 1), 1)[0], r: 'l' });
  return out;
}

function giveCard(c, ignoreFull) {
  const before = stats().maxHp;
  if (c.kind === 'tech') {
    const have = run.techs.find(t => t.id === c.id);
    if (have) have.lv++;
    else if (run.techs.length < MAX_TECHS) run.techs.push({ id: c.id, lv: 1 });
    else if (!ignoreFull) return 'full';
  } else if (c.kind === 'pass') run.pass.push(c.id);
  else if (c.kind === 'relic') {
    run.relics.push(c.id);
    if (RELIC[c.id].onGet === 'senzu2') for (let i = 0; i < 2; i++) if (run.items.length < MAX_ITEMS) run.items.push('senzu');
  } else if (c.kind === 'item') { if (run.items.length < MAX_ITEMS) run.items.push(c.id); else addGold(25); }
  const after = stats().maxHp;
  if (after > before) run.hp += after - before;
  return 'ok';
}

function pickReward(i) {
  const c = run.reward.cards[i];
  if (giveCard(c) === 'full') return showReplace(c, () => finishReward());
  sfx('win'); finishReward();
}
function finishReward() { run.reward = null; nextFloor(); }

const shopMul = () => run.grav >= 3 ? 1.2 : 1;
function shopCards() {
  const f = run.floor, m = shopMul();
  return genCards(3).map(c => ({ k: 'card', card: c, price: Math.round(({ c: 40, r: 75, e: 130 }[c.r]) * (1 + f * .06) * m), sold: false }));
}
function shopItems() {
  const f = run.floor, m = shopMul(), ids = Object.keys(ITEMS), out = [];
  for (let i = 0; i < 3; i++) { const id = pick(ids); out.push({ k: 'item', id, price: Math.round(({ c: 28, r: 62 }[ITEMS[id].r]) * (1 + f * .04) * m), sold: false }); }
  return out;
}
function shopPerm() {
  const m = shopMul(), b = run.buys;
  return [{ k: 'heal', price: Math.round(45 * m) }, { k: 'train', price: Math.round((70 + 20 * (b.train || 0)) * m) },
          { k: 'armor', price: Math.round((80 + 25 * (b.armor || 0)) * m) }, { k: 'vit', price: Math.round((90 + 25 * (b.vit || 0)) * m) }];
}
function genShop() {
  const f = run.floor, m = shopMul(), special = [];
  const rel = genRelics(1);
  if (rel.length && Math.random() < .55) special.push({ k: 'relic', card: rel[0], price: Math.round(260 * (1 + f * .04) * m), sold: false });
  if (meta('unlock_form')) special.push({ k: 'form', card: { kind: 'tech', id: 'form', r: 'e' }, price: Math.round((110 + formLv() * 45) * m), sold: false });
  return { cards: shopCards(), items: shopItems(), special, perm: shopPerm(), rerolls: 0 };
}

/* ---------- Ereignisse ---------- */
const EVENTS = {
  karin: { t: 'Der Karin-Turm', i: '🐱', txt: 'Meister Karin bietet dir seine Hilfe an.',
           o: [['Senzu-Bohne nehmen', 'a'], ['Mit Karin trainieren (+2 Angriff, −10% LP)', 'b']] },
  wreck: { t: 'Raumschiff-Wrack', i: '🛸', txt: 'Eine abgestürzte Landekapsel liegt im Krater. Vielleicht ist noch etwas drin.',
           o: [['Plündern (Gold, aber Falle möglich)', 'a'], ['Weiterziehen', 'b']] },
  kaio:  { t: 'Kaios Planet', i: '🪐', txt: 'Hohe Schwerkraft! Training ist hier extrem effektiv – und anstrengend.',
           o: [['Schwerkrafttraining (+3 Angriff, −20% LP)', 'a'], ['Kurze Meditation (heilt 25% LP)', 'b']] },
  bulma: { t: 'Bulmas Labor', i: '🧪', txt: 'Bulma hat ein neues Gadget gebastelt. "Teste es mal!"',
           o: [['Gadget testen (50 Gold → zufällige Ausrüstung)', 'a'], ['Nur die Kekse essen (heilt 15% LP)', 'b']] },
  radar: { t: 'Dragonball-Spur', i: '📡', txt: 'Dein Radar piept! Ein Dragonball ist ganz in der Nähe.',
           o: [['Der Spur folgen (50% Dragonball, sonst −15% LP)', 'a'], ['Ignorieren', 'b']] },
  popo:  { t: 'Mr. Popo', i: '🧞', txt: 'Mr. Popo lädt dich zu einer Trainingsstunde im Palast ein.',
           o: [['Ki-Kapsel annehmen', 'a'], ['Hartes Training (+3 Angriff, −15% LP)', 'b']] },
  tourney: { t: 'Kampfturnier', i: '🏟️', txt: 'Ein Turnier ohne Regeln! Der Sieger kassiert das Preisgeld.',
           o: [['Mitmachen (60% Gold, sonst −20% LP)', 'a'], ['Zuschauen (heilt 10% LP)', 'b']] },
};
function eventPick(k) {
  const ev = run.event; if (ev.res) return;
  const s = stats(); let msg = '';
  switch (ev.id + k) {
    case 'karina': if (run.items.length < MAX_ITEMS) run.items.push('senzu'); else addGold(30); msg = '🫘 Du erhältst eine Senzu-Bohne!'; break;
    case 'karinb': run.bonusAtk += 2; run.hp = Math.max(1, run.hp - s.maxHp * .1); msg = '💪 +2 Angriff!'; break;
    case 'wrecka':
      if (Math.random() < .3) { run.hp = Math.max(1, run.hp - s.maxHp * .15); msg = '💣 Eine Falle! −15% LP.'; }
      else { const g = ri(45, 90) + run.floor * 3; addGold(g); msg = `🪙 Du findest ${g} Gold!`; }
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
    case 'popoa': if (run.items.length < MAX_ITEMS) run.items.push('kicap'); else addGold(30); msg = '🔋 Du erhältst eine Ki-Kapsel.'; break;
    case 'popob': run.bonusAtk += 3; run.hp = Math.max(1, run.hp - s.maxHp * .15); msg = '💪 +3 Angriff!'; break;
    case 'tourneya':
      if (Math.random() < .6) { const g = ri(70, 120) + run.floor * 5; addGold(g); msg = `🏆 Du gewinnst ${g} Gold!`; }
      else { run.hp = Math.max(1, run.hp - s.maxHp * .2); msg = '🥊 Knapp verloren! −20% LP.'; }
      break;
    case 'tourneyb': heal(s.maxHp * .1); msg = '🍿 Du schaust zu und erholst dich.'; break;
  }
  ev.res = msg; save(); go('event');
}

function findBall() {
  SAVE.balls = Math.min(7, SAVE.balls + 1); run.balls++; toast('🟠 Dragonball gefunden! (' + SAVE.balls + '/7)'); save();
}

/* ---------- Kampf ---------- */
function startBattle() {
  const n = run.node, e = makeEnemy(run.floor, n.type), S = stats();
  B = { e, S, ehp: e.hp, eMax: e.hp, pT: 0, eT: e.int * .5, ki: S.maxKi * .5, cd: {}, buff: { dodge: 0, pill: 0 }, form: null,
        intro: e.boss ? 1.9 : e.type === 'elite' ? 1.2 : .9, stun: 0, blind: 0, shield: 0, shieldT: 0, burn: null, combo: 0, charge: null, queue: [], timers: [],
        eCount: 0, over: false, nextCrit: false, enraged: 0, auto: SAVE.set.auto, fast: SAVE.set.fast, autoT: 0, time: 0 };
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

function later(sec, fn) { B.timers.push({ t: sec, fn }); }

function tick(dt) {
  if (!B || B.over) return;
  if (B.intro > 0) { B.intro -= dt; return; }
  const s = B.S, e = B.e;
  B.time += dt;
  if (B.time > 75 && !B.late) { B.late = true; vis.banner('⏰ Der Kampf zieht sich – der Gegner wird wütend!', '#ff9a3d', 1800); }
  if (B.form) {
    B.form.t -= dt;
    if (B.form.drain) run.hp = Math.max(1, run.hp - s.maxHp * B.form.drain * dt);
    if (B.form.kidrain) { B.ki -= B.form.kidrain * dt; if (B.ki <= 0) { B.ki = 0; B.form.t = 0; } }
    if (B.form.t <= 0) B.form = null;
  }
  const F = B.form || NOFORM;
  B.ki = Math.min(s.maxKi, B.ki + s.regen * (1 + F.regen) * dt);
  if (s.hpRegen) heal(s.hpRegen * dt);
  for (const k in B.cd) B.cd[k] = Math.max(0, B.cd[k] - dt);
  B.buff.dodge = Math.max(0, B.buff.dodge - dt); B.buff.pill = Math.max(0, B.buff.pill - dt);
  B.blind = Math.max(0, B.blind - dt);
  if (B.shieldT > 0) { B.shieldT -= dt; if (B.shieldT <= 0) B.shield = 0; }
  if (e.traits.regen) B.ehp = Math.min(B.eMax, B.ehp + B.eMax * .01 * dt);
  if (B.burn) {
    const d = B.burn.dps * dt; B.ehp = Math.max(0, B.ehp - d); B.burn.sum += d; B.burn.t -= dt;
    if (B.burn.sum >= B.burn.dps) { floatText(Math.round(B.burn.sum), 'e', 'burn'); B.burn.sum = 0; }
    if (B.burn.t <= 0) B.burn = null;
  }
  // zeitversetzte Effekte (Treffer von Strahlen/Kugeln)
  for (const T of B.timers) T.t -= dt;
  const due = B.timers.filter(T => T.t <= 0); B.timers = B.timers.filter(T => T.t > 0);
  due.forEach(T => { if (!B.over) T.fn(); });
  if (B.ehp <= 0) return winBattle();

  // Spieler-Standardangriff
  B.pT += dt * s.spd * (1 + F.spd);
  if (B.pT >= 1) {
    B.pT -= 1; let m = 1;
    if (B.combo > 0) { m = 2.2; B.combo--; }
    dealDamage(m, { basic: true });
  }
  if (B.ehp <= 0) return winBattle();

  // Gegner
  const ei = e.int * (e.traits.berserk ? 1 - (1 - B.ehp / B.eMax) * .4 : 1);
  if (B.stun > 0) { B.stun -= dt; B.charge = null; B.queue = []; }
  else {
    if (B.queue.length) { B.queue.forEach(q => q.t -= dt); while (B.queue.length && B.queue[0].t <= 0) enemyHit(B.queue.shift().m); }
    if (B.charge) {
      B.charge.t -= dt;
      if (B.charge.t <= 0) { const dodged = B.charge.dodged; B.charge = null; B.eT = 0; if (dodged) { floatText('Ausgewichen!', 'p', 'miss'); vis.dodge(); } else enemyHit(2.4, true); }
    } else if (!B.queue.length) {
      B.eT += dt;
      if (B.eT >= ei) {
        B.eT = 0; B.eCount++;
        if (e.chargeEvery && B.eCount % e.chargeEvery === 0) { B.charge = { t: 1.8, max: 1.8 }; sfx('tech'); vis.chargeStart(); }
        else if (e.traits.barrage && B.eCount % 3 === 0) B.queue = [{ t: 0, m: .7 }, { t: .3, m: .7 }, { t: .6, m: .7 }];
        else enemyHit(1);
      }
    }
  }
  // Boss-Phasen
  if (e.boss) {
    if (B.enraged < 1 && B.ehp < B.eMax * .5) { B.enraged = 1; e.atk *= 1.25; e.int *= .85; vis.banner('😡 ' + e.n + ' rastet aus!', '#ff5a3d', 1400); vis.shake(true); }
    if (B.enraged < 2 && B.ehp < B.eMax * .25) { B.enraged = 2; e.atk *= 1.15; e.chargeEvery = 2; vis.banner('💢 LETZTE KRAFT!', '#ff2a5a', 1400); vis.shake(true); }
  }
  if (B.auto) { B.autoT -= dt; if (B.autoT <= 0) { B.autoT = .25; autoPlay(); } }
  if (run.hp <= 0) playerDown();
}

function dealDamage(mult, o = {}) {
  const s = B.S;
  let atk = s.atk;
  if (run.char === 'gohan') atk *= 1 + (1 - run.hp / s.maxHp) * .7;
  const F = B.form || NOFORM;
  atk *= 1 + F.atk;
  if (B.buff.pill > 0) atk *= 1.6;
  if (s.lowHpAtk && run.hp < s.maxHp * .5) atk *= 1 + s.lowHpAtk;
  if (s.execute && B.ehp < B.eMax * .3) atk *= 1 + s.execute;
  let crit = Math.random() < s.crit + F.crit;
  if (B.nextCrit) { crit = true; B.nextCrit = false; }
  let d = atk * mult * (crit ? s.critDmg : 1);
  if (!o.pierce) d /= (1 + B.e.def * .06);
  d = Math.max(1, Math.round(d * rnd(.92, 1.08)));
  B.ehp = Math.max(0, B.ehp - d);
  if (s.ls) heal(d * s.ls);
  if (s.kiOnHit) B.ki = Math.min(s.maxKi, B.ki + s.kiOnHit);
  floatText(d, 'e', crit ? 'crit' : '');
  sfx(crit ? 'crit' : 'hit');
  if (o.basic) vis.playerHit(crit); else vis.hitEnemy(crit);
}

function enemyHit(mult, heavy) {
  const s = B.S, e = B.e;
  if (B.blind > 0) { floatText('Verfehlt!', 'p', 'miss'); return; }
  const F = B.form || NOFORM;
  if (B.buff.dodge > 0 || (F.dodge && Math.random() < F.dodge)) { floatText('Ausgewichen!', 'p', 'miss'); vis.dodge(); return; }
  let d = e.atk * mult * rnd(.9, 1.1) / (1 + s.def * .06) * s.taken * (1 + F.taken);
  if (B.time > 75) d *= 1 + (B.time - 75) / 25;
  d = Math.max(1, Math.round(d));
  const total = d;
  if (B.shield > 0) { const ab = Math.min(B.shield, d); B.shield -= ab; d -= ab; floatText('🛡️' + Math.round(ab), 'p', 'heal'); }
  if (d > 0) { run.hp -= d; floatText('-' + d, 'p', 'me'); }
  if (e.traits.drain) B.ehp = Math.min(B.eMax, B.ehp + total * .4);
  if (s.thorns) B.ehp = Math.max(1, B.ehp - s.thorns);
  if (s.kiOnHurt) B.ki = Math.min(s.maxKi, B.ki + s.kiOnHurt);
  sfx('hurt'); buzz(heavy ? 70 : 20);
  vis.enemyAttack(!!heavy, d > 0);
}

function useTech(i) {
  if (!B || B.over || B.intro > 0) return;
  const t = run.techs[i]; if (!t) return;
  const T = TECH[t.id], s = B.S;
  if ((B.cd[t.id] || 0) > 0 || B.ki < T.cost) return;
  B.ki -= T.cost; B.cd[t.id] = T.cd;
  const lvm = 1 + .3 * (t.lv - 1);
  sfx('tech');
  const delay = vis.tech(T, t) || 0;      // Dauer bis zum Einschlag (Optik)
  const hit = () => {
    if (T.mult) for (let h = 0; h < (T.hits || 1); h++) dealDamage(T.mult * lvm, { pierce: T.pierce });
    if (T.hakai) { const part = B.ehp * (B.e.boss ? T.hakai * .5 : T.hakai); B.ehp = Math.max(0, B.ehp - part); floatText(Math.round(part), 'e', 'crit'); dealDamage(1 * lvm); }
    if (T.stun) { B.stun = Math.max(B.stun, B.e.boss ? T.stun * .5 : T.stun); B.charge = null; B.eT = 0; }
    if (T.burn) B.burn = { t: T.burn, dps: s.atk * .9 * lvm, sum: 0 };
    if (B.ehp <= 0) winBattle();
  };
  if (T.dodge) { B.buff.dodge = T.dodge; B.nextCrit = true; }
  if (T.heal) { heal(s.maxHp * T.heal * lvm); floatText('+' + Math.round(s.maxHp * T.heal * lvm), 'p', 'heal'); sfx('heal'); }
  if (T.form) B.form = Object.assign({}, formAt(t.lv), { lv: t.lv, t: formDur(t.lv) });
  if (T.blind) B.blind = B.e.boss ? T.blind * .6 : T.blind;
  if (T.shield) { B.shield = s.maxHp * T.shield * lvm; B.shieldT = 8; }
  if (T.combo) B.combo = T.combo;
  if (T.kigain) B.ki = Math.min(s.maxKi, B.ki + T.kigain * lvm);
  if (T.mult || T.hakai || T.stun || T.burn) { if (delay > 0) later(delay, hit); else hit(); }
}

const DODGE_COST = 25;
function counterHint() {
  const names = { kiai: 'Kiai', taiyoken: 'Solar Flare', teleport: 'Instant Transmission' };
  return run.techs.map(t => names[t.id]).filter(Boolean).join(' / ');
}
function dodgeCharge() {
  if (!B || B.over || !B.charge || B.charge.dodged) return;
  if (B.ki < DODGE_COST) { toast('Zu wenig Ki zum Ausweichen!'); return; }
  B.ki -= DODGE_COST; B.charge.dodged = true; sfx('tech'); vis.dodge();
}

function useItem(i) {
  if (!B || B.over) return;
  const id = run.items[i]; if (!id) return;
  const s = B.S, e = B.e;
  const boom = (mult, col) => { vis.tech({ fx: 'sphere', col }, { lv: 1 }); later(.5, () => { dealDamage(mult, { pierce: true }); if (B.ehp <= 0) winBattle(); }); };
  if (id === 'senzu') { if (run.hp >= s.maxHp) return; heal(s.maxHp * .5); floatText('+' + Math.round(s.maxHp * .5), 'p', 'heal'); sfx('heal'); vis.healFx(); }
  else if (id === 'elixier') { if (run.hp >= s.maxHp) return; floatText('+' + Math.round(s.maxHp - run.hp), 'p', 'heal'); run.hp = s.maxHp; sfx('heal'); vis.healFx('#9fffd0'); }
  else if (id === 'kicap') { if (B.ki >= s.maxKi - 5) return; B.ki = s.maxKi; sfx('heal'); vis.healFx('#8fd8ff'); }
  else if (id === 'zeit') { B.cd = {}; B.ki = Math.min(s.maxKi, B.ki + 40); sfx('power'); vis.healFx('#ffe14a'); vis.banner('⏳ ZEITKAPSEL!', '#ffe14a', 800); }
  else if (id === 'granate') boom(4, '#ffb347');
  else if (id === 'bombe') boom(9, '#ff5a3d');
  else if (id === 'blitz') { B.blind = Math.max(B.blind, e.boss ? 3 : 5); vis.tech({ fx: 'flash', col: '#fff' }, { lv: 1 }); }
  else if (id === 'stun') { B.stun = Math.max(B.stun, e.boss ? 2 : 4); B.charge = null; B.eT = 0; vis.tech({ fx: 'ring', col: '#fff' }, { lv: 1 }); }
  else if (id === 'schild') { B.shield = s.maxHp * .4; B.shieldT = 10; vis.tech({ fx: 'shield', col: '#7fe0ff' }, { lv: 1 }); }
  else if (id === 'pille') { B.buff.pill = 15; vis.healFx('#ff6a3d'); vis.banner('💊 BERSERKER!', '#ff6a3d', 800); }
  run.items.splice(i, 1);
}

/* Kampf sofort zu Ende rechnen (Auto-Modus, ohne Animation) */
function skipBattle() {
  if (!B || B.over) return;
  const wasVis = VIS; VIS = false;
  B.intro = 0; B.auto = true; let t = 0;
  while (B && !B.over && t < 900) { tick(.1); t += .1; }
  if (B && !B.over) { run.hp = 0; playerDown(); }
  VIS = wasVis;
  if (wasVis) toast('⏭ Kampf berechnet');
}

function autoPlay() {
  const s = B.S, has = id => run.techs.findIndex(t => t.id === id);
  const ready = i => i >= 0 && (B.cd[run.techs[i].id] || 0) <= 0 && B.ki >= TECH[run.techs[i].id].cost;
  if (B.charge && !B.charge.dodged) {
    for (const id of ['kiai', 'taiyoken', 'teleport']) { const i = has(id); if (ready(i)) return useTech(i); }
    if (B.ki >= DODGE_COST) return dodgeCharge();
  }
  if (run.hp < s.maxHp * .45) { const i = has('heal'); if (ready(i)) return useTech(i); }
  if (run.hp < s.maxHp * .65 && B.shield <= 0) { const i = has('kishield'); if (ready(i)) return useTech(i); }
  if (SAVE.set.autoSenzu && run.hp < s.maxHp * .3) { const i = run.items.indexOf('senzu'); if (i >= 0) return useItem(i); }
  { const i = has('form'); if (i >= 0 && !B.form && ready(i) && (B.e.boss || B.e.type === 'elite' || B.eMax > B.S.atk * 18)) return useTech(i); }
  const ci = has('combo'); if (ci >= 0 && B.combo <= 0 && ready(ci)) return useTech(ci);
  const pi = has('powerup'); if (pi >= 0 && B.ki < s.maxKi * .3 && ready(pi)) return useTech(pi);
  const skip = ['kiai', 'taiyoken', 'teleport', 'heal', 'kishield', 'form', 'combo', 'powerup'];
  const order = run.techs.map((t, i) => i).filter(i => !skip.includes(run.techs[i].id))
    .sort((a, b) => TECH[run.techs[b].id].cost - TECH[run.techs[a].id].cost);
  for (const i of order) if (ready(i)) return useTech(i);
}

function winBattle() {
  if (B.over) return;
  B.over = true; sfx('win');
  const e = B.e, f = run.floor, S = B.S;
  run.kills++; if (e.boss) run.bosses++;
  const base = (8 + f * 4) * ({ battle: 1, elite: 1.8, boss: 3 }[e.type]);
  const gold = Math.round(base * (1 + S.goldPct) * rnd(.9, 1.15));
  addGold(gold);
  if (run.grav < 4) heal(S.maxHp * .04);
  if (S.killHeal) heal(S.maxHp * S.killHeal);
  const ballChance = ({ battle: .05, elite: .6, boss: 1 }[e.type]) + S.ballPct;
  let ball = false;
  if (SAVE.balls < 7 && Math.random() < ballChance) { findBall(); ball = true; }
  const n = 3 + meta('pick');
  let cards = e.type === 'boss' ? [...genRelics(2), ...genCards(n - 2, 'r')] : genCards(n);
  if (meta('unlock_form') && (e.type === 'boss' || (e.type === 'elite' && Math.random() < .4))) {
    cards = cards.filter(c => !(c.kind === 'tech' && c.id === 'form'));
    cards.splice(e.type === 'boss' ? 2 : 0, 0, { kind: 'tech', id: 'form', r: 'e' });
  }
  run.reward = { cards, gold, ball, boss: e.type === 'boss' };
  run.screen = 'reward'; save();
  vis.ko();
  setTimeout(() => { if (run && run.screen === 'reward') go('reward'); }, VIS ? 1000 : 0);
}

function playerDown() {
  if (B.over) return;
  if (meta('revive') && !run.revived) {
    run.revived = true; run.hp = B.S.maxHp * .4; toast('🐉 Shenlong belebt dich wieder!'); sfx('heal'); vis.healFx('#ffe14a'); return;
  }
  B.over = true; sfx('lose'); vis.koPlayer();
  setTimeout(() => endRun(false), VIS ? 1000 : 0);
}

function endRun(victory) {
  const won = victory || run.won;
  const cleared = (victory && !run.endless && !run.won) ? maxFloor() : run.floor - 1;
  let z = cleared * 6 + run.bosses * 25 + (won ? 120 : 0) + Math.floor(run.kills * 1.5);
  z = Math.round(z * (1 + meta('zgain') * .1) * sg().zmul * (1 + run.grav * .35));
  const prevBest = SAVE.best, winTxt = sg().win;
  SAVE.zenkai += z; SAVE.best = Math.max(SAVE.best, run.floor > maxFloor() ? run.floor - 1 : run.floor);
  const summary = { won, endless: run.endless, saga: run.saga, grav: run.grav, floor: Math.min(cleared + (won ? 0 : 1), 999), z, kills: run.kills, bosses: run.bosses, balls: run.balls, relics: run.relics.length,
                    winTxt, newBest: SAVE.best > prevBest, char: run.char };
  SAVE.run = null; run = null; B = null; save();
  go('end', summary);
}

/* ---------- Visuelle Effekte im Kampf ---------- */
const vis = {
  anim(sel, cls, ms) { if (!VIS) return; const e = $(sel); if (!e) return; e.classList.remove(cls); void e.offsetWidth; e.classList.add(cls); setTimeout(() => e && e.classList.remove(cls), ms); },
  pt(who, fx, fy) { return FX.pos($(who === 'e' ? '#enemySpr' : '#playerSpr'), fx, fy); },
  shake(strong) { if (!VIS || !SAVE.set.shake) return; this.anim('#arena', strong ? 'shk2' : 'shk', strong ? 420 : 200); },
  banner(txt, col, ms = 1100, sub = '') {
    if (!VIS) return; const b = $('#banner'); if (!b) return;
    b.innerHTML = `<b style="--bc:${col || '#ffe14a'}">${txt}</b>${sub ? '<small>' + sub + '</small>' : ''}`;
    b.classList.remove('on'); void b.offsetWidth; b.classList.add('on');
    clearTimeout(vis._bt); vis._bt = setTimeout(() => b.classList.remove('on'), ms);
  },
  playerHit(crit) {
    if (!VIS) return; this.anim('#playerSpr', 'lunge', 260);
    setTimeout(() => { if (!$('#enemySpr')) return; const p = this.pt('e', .5, .45); FX.burst(p.x, p.y, crit ? '#ffe14a' : '#ffffff', crit ? 18 : 9, crit ? 340 : 220, crit ? 6 : 4, .4, 300);
      if (crit) { FX.ring(p.x, p.y, '#ffe14a', 80, .3, 6); this.shake(false); } this.anim('#enemySpr', 'hit', 220); }, 90);
  },
  hitEnemy(crit) {
    if (!VIS) return; const p = this.pt('e', .5, .45);
    FX.burst(p.x, p.y, crit ? '#ffe14a' : '#ffffff', crit ? 16 : 8, 260, 4, .4, 300); this.anim('#enemySpr', 'hit', 220);
  },
  enemyAttack(heavy, dmg) {
    if (!VIS) return; this.anim('#enemySpr', 'lunge', 280);
    setTimeout(() => { if (!$('#playerSpr')) return; const p = this.pt('p', .5, .45);
      if (heavy) { FX.beam(this.pt('e', .15, .45), p, '#ff4a5e', { w: 24, dur: .6 }); FX.flash('#ff4a5e', .3, .3); }
      FX.burst(p.x, p.y, '#ff6a7a', heavy ? 22 : 10, heavy ? 360 : 240, 5, .4, 300);
      if (dmg) this.anim('#playerSpr', 'hit', 220); this.shake(heavy); }, 100);
  },
  chargeStart() { if (!VIS) return; this.anim('#enemySpr', 'pose-charge', 1800); },
  dodge() { if (!VIS) return; this.anim('#playerSpr', 'blink', 300); const p = this.pt('p', .5, .5); FX.burst(p.x, p.y, '#9fe9ff', 8, 160, 4, .3, 0); },
  healFx(col = '#3ddc84') { if (!VIS) return; const p = this.pt('p', .5, .5); FX.burst(p.x, p.y, col, 22, 200, 4, .8, -120); FX.ring(p.x, p.y, col, 90, .5, 6); },
  ko() {
    if (!VIS) return; const e = $('#enemySpr'); if (!e) return; e.classList.add('ko');
    const p = this.pt('e', .5, .5); FX.burst(p.x, p.y, '#ffe14a', 40, 480, 7, .9, 260); FX.ring(p.x, p.y, '#fff', 200, .6, 12); FX.flash('#fff', .55, .4); this.shake(true); sfx('boom');
  },
  koPlayer() { if (!VIS) return; const e = $('#playerSpr'); if (e) e.classList.add('ko'); const p = this.pt('p', .5, .5); FX.burst(p.x, p.y, '#ff5a5a', 30, 380, 6, .8, 260); },
  formUp(lv) {
    if (!VIS) return; const f = formAt(lv), col = f.aura, big = f.style === 'ssj3' || f.style === 'mui' || lv >= 9;
    this.banner('⚡ ' + formName(lv).toUpperCase() + '!', col, big ? 1900 : 1500, f.style === 'kk' ? 'Kraft um jeden Preis' : '');
    FX.flash(col, big ? .95 : .8, big ? .8 : .55);
    const p = this.pt('p', .5, .5);
    FX.ring(p.x, p.y, col, big ? 300 : 220, .7, 14);
    if (big) setTimeout(() => FX.ring(p.x, p.y, '#ffffff', 360, .8, 10), 200);
    FX.bolt(p.x, p.y, col, f.style === 'kk' ? 4 : big ? 14 : 8, 90);
    FX.burst(p.x, p.y, col, 40, 420, 6, .8, 0);
    this.anim('#playerSpr', 'pose-charge', 900); this.shake(true); sfx('power');
  },
  setForm(f) {
    const P = $('#playerSpr'), fig = $('#pFig'), au = $('#pAura'); if (!P || !fig) return;
    if (f) { fig.innerHTML = ART.fighter(CHARS[run.char].p, { form: f }); P.classList.add('formed'); P.dataset.fs = f.style; au.style.setProperty('--ac', f.aura); }
    else { fig.innerHTML = ART.fighter(CHARS[run.char].p); P.classList.remove('formed'); delete P.dataset.fs; au.style.setProperty('--ac', CHARS[run.char].ac); }
  },
  /* liefert die Verzögerung bis zum Einschlag zurück */
  tech(T, t) {
    if (!VIS) return 0;
    const P = $('#playerSpr'); if (!P) return 0;
    const a = this.pt('p', .92, .46), b = this.pt('e', .5, .44), col = T.col || '#fff';
    switch (T.fx) {
      case 'beam': this.anim('#playerSpr', 'pose-beam', 800); FX.beam(a, b, col, { w: T.mult > 5 ? 40 : 26, dur: .85, spiral: T.n === 'Makankosappo' });
        FX.flash(col, .18, .2); setTimeout(() => this.shake(true), 160); setTimeout(() => this.anim('#enemySpr', 'hit', 300), 160); return .17;
      case 'orbs': this.anim('#playerSpr', 'pose-beam', 500);
        [0, 120, 240].forEach(d => setTimeout(() => { if ($('#arena')) { FX.sphere(this.pt('p', .92, .46), this.pt('e', .5, .44), col, { r: 9, charge: .05, fly: .22 }); } }, d)); return .5;
      case 'ring': this.anim('#playerSpr', 'lunge', 260); { const p = this.pt('p', .6, .5); FX.ring(p.x, p.y, col, 120, .4, 10); setTimeout(() => { const q = this.pt('e', .5, .5); FX.ring(q.x, q.y, col, 150, .45, 12); FX.burst(q.x, q.y, col, 20, 320, 5, .5, 200); this.shake(true); this.anim('#enemySpr', 'hit', 300); }, 150); } return .15;
      case 'blink': this.anim('#playerSpr', 'blink', 700); { const p = this.pt('p', .5, .5); FX.burst(p.x, p.y, col, 18, 260, 5, .5, 0); FX.ring(p.x, p.y, col, 80, .35, 6); } return 0;
      case 'heal': this.healFx(col); return 0;
      case 'flash': FX.flash('#fff', .95, .8); { const p = this.pt('p', .5, .4); FX.ring(p.x, p.y, '#fff', 200, .6, 14); } this.banner('☀️ SOLAR FLARE!', '#fff6a8', 900); return 0;
      case 'shield': this.anim('#playerSpr', 'pose-charge', 500); { const p = this.pt('p', .5, .5); FX.ring(p.x, p.y, col, 90, .5, 8); FX.burst(p.x, p.y, col, 16, 160, 4, .6, 0); } return 0;
      case 'combo': this.anim('#playerSpr', 'lunge', 260); { const p = this.pt('p', .5, .5); FX.ring(p.x, p.y, col, 80, .35, 8); FX.burst(p.x, p.y, col, 14, 200, 4, .5, 0); } this.banner('👊 KOMBO!', '#ffb347', 700); return 0;
      case 'powerup': this.anim('#playerSpr', 'pose-charge', 800); { const p = this.pt('p', .5, .5); FX.converge(p.x, p.y, col, 30, 90); FX.ring(p.x, p.y, col, 110, .6, 8); sfx('power'); } return 0;
      case 'disc': this.anim('#playerSpr', 'pose-beam', 500); FX.disc(this.pt('p', .85, .3), b, col); return .32;
      case 'sphere': {
        const big = (T.mult || 0) >= 7 || T.hakai || T.n === 'Genkidama';
        this.anim('#playerSpr', big ? 'pose-up' : 'pose-beam', big ? 1500 : 800);
        const up = this.pt('p', .5, big ? -.2 : .2);
        FX.sphere(big ? up : a, b, col, { r: big ? 44 : 24, charge: big ? 1.0 : .45, fly: .35, big, dark: !!T.hakai });
        if (big) { this.banner(T.hakai ? '🟪 HAKAI!' : '🔵 GENKIDAMA!', col, 1300); }
        return big ? 1.4 : .85;
      }
      case 'form': this.formUp(t.lv); return 0;
    }
    return 0;
  },
};

function floatText(txt, who, cls) {
  if (!SAVE.set.nums || !VIS) return;
  const el = document.createElement('div');
  el.className = 'fl ' + (cls || ''); el.textContent = txt;
  const r = $(who === 'e' ? '#enemySpr' : '#playerSpr');
  if (r) {
    const b = r.getBoundingClientRect();
    el.style.left = (b.left + b.width / 2 + rnd(-26, 26)) + 'px'; el.style.top = (b.top + b.height * .15 + rnd(0, 20)) + 'px';
  } else { el.style.left = '50%'; el.style.top = '40%'; }
  $('#floats').appendChild(el); setTimeout(() => el.remove(), 950);
}

/* ---------- UI-Grundlagen ---------- */
const view = html => { $('#app').innerHTML = html; };
function toast(t) {
  const el = $('#toast'); el.textContent = t; el.classList.add('show');
  clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove('show'), 1900);
}
function modal(html) { const m = $('#modal'); m.innerHTML = '<div class="sheet">' + html + '</div>'; m.hidden = false; }
function closeModal() { $('#modal').hidden = true; }
const ballsRow = (n, size = 24) => `<span class="balls">${Array.from({ length: 7 }, (_, i) => ART.ball(i + 1, i < n, size)).join('')}</span>`;

function hud() {
  const s = stats();
  return `<div class="hud"><span class="chip">⛰️ ${run.floor}${run.endless ? '' : '/' + maxFloor()}</span><span class="chip">🪙 ${run.gold}</span>
    <span class="chip">${ART.ball(4, true, 16)} ${SAVE.balls}/7</span>${run.grav ? `<span class="chip" style="color:var(--red)">🌑${run.grav}</span>` : ''}<span class="sp"></span>
    <button class="chip" data-a="build" title="Build" aria-label="Build">🎒</button></div>
    <div class="bar hp" style="margin-bottom:8px"><i style="width:${clamp(run.hp / s.maxHp * 100, 0, 100)}%"></i><span>${Math.ceil(run.hp)} / ${s.maxHp} LP</span></div>`;
}
function pathBar() {
  let h = '<div class="path">';
  const max = run.endless ? run.floor + 1 : maxFloor();
  for (let f = 1; f <= max; f++) h += `<i class="${f < run.floor ? 'done' : f === run.floor ? 'cur' : ''} ${isBossFloor(f) ? 'boss' : ''}"></i>`;
  return h + '</div>';
}
function actBanner() {
  const a = actOf(run.floor), n = Math.floor((run.floor - 1) / 5) + 1;
  return `<div class="actban"><div class="bgl">${ART.bg(a.bg)}</div><div class="t"><small>AKT ${n} · ${sg().n}</small><b>${a.n}</b></div></div>`;
}
function cardHtml(c, extra = '', attrs = '', cls = '') {
  const I = cardInfo(c), lvTxt = c.kind === 'tech' ? ` · ${TECH[c.id].cost} Ki` : '';
  const have = c.kind === 'tech' ? run.techs.find(t => t.id === c.id) : null;
  const up = have ? (c.id === 'form' ? ' <span style="color:var(--grn)">▲ AUFSTIEG</span>' : ` <span style="color:var(--grn)">▲ Stufe ${have.lv + 1}</span>`) : '';
  const kind = { tech: 'TECHNIK', pass: 'PASSIV', item: 'ITEM', relic: 'RELIKT' }[c.kind];
  const cnt = c.kind === 'pass' ? run.pass.filter(x => x === c.id).length : 0;
  return `<button class="card ${c.r} ${cls}" ${attrs}><span class="ic">${I.i}</span><span><span class="tag">${c.r === 'l' ? '' : RAR[c.r] + ' · '}${kind}${lvTxt}</span>
    <b>${I.n}${up}${cnt ? ` <span class="mut small">(×${cnt})</span>` : ''}</b><span class="d">${I.d}</span></span>${extra}</button>`;
}
function traitChips(e) { return Object.keys(e.traits).map(t => `<span class="tc" title="${TRAITS[t].d}">${TRAITS[t].i} ${TRAITS[t].n}</span>`).join(''); }

/* ---------- Bildschirme ---------- */
const SCREENS = {
  menu() {
    const ch = CHARS[SAVE.sel], saga = curSaga(), g = clamp(SAVE.grav, 0, SAVE.gravMax);
    view(`<div class="menu-bg"><div class="rays"></div></div><div class="scroll center" style="position:relative">
      <div class="logo">ZENKAI<br>QUEST</div><div class="sub">Dragon-Ball-Roguelite</div>
      <div class="hero"><div class="aura-el" style="--ac:${ch.ac}"></div><div class="fig">${ART.fighter(ch.p)}</div></div>
      <div class="herotxt"><b>${ch.n}</b><div class="small mut">${ch.d}</div></div>
      <div class="panel" style="width:100%"><div class="stats">
        <div><b>${SAVE.best || '–'}</b><span>Beste Etage</span></div><div><b>${SAVE.wins}</b><span>Siege</span></div>
        <div><b>${SAVE.runs}</b><span>Runs</span></div><div><b>⭐${SAVE.zenkai}</b><span>Zenkai</span></div></div></div>
      <div class="sagas">${SAGA_KEYS.map(id => { const x = SAGAS[id], ok = sagaOpen(id);
        return `<button class="sg ${saga === id ? 'sel' : ''}" data-a="saga" data-id="${id}" ${ok ? '' : 'disabled'}><span class="si">${ok ? x.i : '🔒'}</span><b>${x.short}</b><small>${x.floors} Etagen</small></button>`; }).join('')}</div>
      <div class="small mut" style="margin-top:-4px">${SAGAS[saga].d}</div>
      <div class="gravrow"><button class="ib" data-a="gravDn" ${g <= 0 ? 'disabled' : ''}>−</button>
        <div class="gv"><b>🌑 Schwerkraft ${g}</b><small>${gravInfo(g)}</small></div>
        <button class="ib" data-a="gravUp" ${g >= SAVE.gravMax ? 'disabled' : ''}>+</button></div>
      ${SAVE.run ? '<button class="btn grn" data-a="resume">▶ Run fortsetzen (Etage ' + SAVE.run.floor + ')</button>' : ''}
      <button class="btn big-btn" data-a="start">${SAVE.run ? '⚔️ Neuer Run (verwirft den alten)' : '⚔️ RUN STARTEN'}</button>
      <div class="row"><button class="btn sec" data-a="metaScr">🏋️ Training</button><button class="btn sec" data-a="chars">🥋 Kämpfer</button></div>
      ${SAVE.balls >= 7 ? '<button class="btn red" data-a="wish">🐉 SHENLONG RUFEN! (7/7)</button>' : `<div class="panel small mut" style="width:100%">${ballsRow(SAVE.balls, 26)}<br>Dragonbälle (${SAVE.balls}/7) findest du in Elite-Kämpfen, bei Bossen und in Ereignissen. Sie bleiben nach dem Tod erhalten!</div>`}
      <div class="panel small mut" style="width:100%;text-align:left"><b style="color:var(--txt)">So geht's:</b><br>Der Kampf läuft automatisch. Setze <b>Techniken</b> (Ki) im richtigen Moment ein und baue zwischen den Kämpfen deinen <b>Build</b>. Bei <b>⚠️ Aufladung</b> tippst du die rote Warnung an, um auszuweichen (25 Ki) – oder unterbrichst mit Kiai. Mit <b>⏭ Ende</b> rechnest du einen Kampf sofort zu Ende. Gegner haben <b>Eigenschaften</b> – lies sie! Stirbst du, bekommst du ⭐ Zenkai und wirst dauerhaft stärker. Schaffst du eine Saga, wird die <b>Schwerkraft</b> erhöht.</div>
      <div class="row" style="width:100%"><button class="btn sec" data-a="settings">⚙️ Einstellungen</button><button class="btn sec" data-a="reset">🗑️ Reset</button></div>
    </div>`);
  },
  map() {
    view(`${hud()}${actBanner()}${pathBar()}<div class="scroll">
      <h2 class="center">Etage ${run.floor}${isBossFloor(run.floor) ? ' – BOSS' : ''}</h2>
      <p class="mut center small">Wähle deinen Weg</p>
      ${run.opts.map((n, i) => {
        const inf = n.type === 'boss' ? { i: '👑', n: 'Boss: ' + ENEMY[bossAt(run.floor)].n, d: 'Sammle all deine Kraft!' } : NODE_INFO[n.type];
        return `<button class="node ${n.type}" data-a="node" data-i="${i}"><span class="ic">${inf.i}</span><span><b>${inf.n}</b><span class="mut small">${inf.d}</span></span></button>`;
      }).join('')}
      <button class="btn sec" data-a="menu" style="margin-top:auto">⬅ Hauptmenü (Run bleibt gespeichert)</button>
    </div>`);
  },
  battle() { startBattle(); },
  'battle-ui'() {
    const e = B.e, ch = CHARS[run.char], act = actOf(run.floor);
    const tag = e.boss ? '<span class="tg boss">BOSS</span>' : e.type === 'elite' ? '<span class="tg elite">ELITE</span>' : '';
    view(`<div class="battle">
      <div class="ctrl"><button class="ib ${B.auto ? 'on' : ''}" id="autoB" data-a="auto" style="flex:1">🤖 Auto ${B.auto ? 'AN' : 'AUS'}</button><button class="ib ${B.fast ? 'on' : ''}" id="fastB" data-a="fast">⏩ x${B.fast ? 2 : 1}</button><button class="ib" data-a="skip" title="Kampf sofort zu Ende rechnen">⏭ Ende</button></div>
      <div class="arena" id="arena">
        <div class="bgl">${ART.bg(act.bg)}</div>
        <div class="spr enemy" id="enemySpr" style="--sz:${e.size}"><div class="aura-el"></div><div class="fig">${ART.fighter(e.p)}</div></div>
        <div class="spr player" id="playerSpr"><div class="aura-el" id="pAura" style="--ac:${ch.ac}"></div><div class="fig" id="pFig">${ART.fighter(ch.p)}</div><div class="bubble"></div></div>
        <canvas id="fxc"></canvas>
        <div class="eplate"><div class="en">${tag}<span>${e.n}</span><small>Etage ${run.floor}</small></div>
          <div class="bar hp e"><i id="eHp"></i><span id="eHpT"></span></div><div class="tcs">${traitChips(e)}</div></div>
        <button class="warn" id="warn" data-a="dodge" hidden><span id="warnT">⚠️ AUFLADUNG!</span><small id="warnS">Tippen = Ausweichen (25 Ki)</small><div class="bar"><i id="warnB"></i></div></button>
        <div class="banner" id="banner"></div>
      </div>
      <div class="fighter pl"><div class="nm">${ch.n} <span class="bufflist" id="buffs"></span></div>
        <div class="bar hp"><i id="pHp"></i><span id="pHpT"></span></div>
        <div class="bar ki"><i id="pKi"></i><span id="pKiT"></span></div></div>
      <div class="techs" id="techs"></div>
      <div class="items" id="items"></div>
    </div>`);
    B.uiBuilt = false;
    FX.attach($('#fxc'), $('#arena'));
    updateBattleUI();
    if (e.boss) { vis.banner('👑 BOSS: ' + e.n.toUpperCase(), '#ff5a3d', 1700, 'Etage ' + run.floor); sfx('boom'); vis.shake(true); }
    else if (e.type === 'elite') vis.banner('💀 ELITE: ' + e.n, '#b685ff', 1100);
  },
  reward() {
    const r = run.reward;
    view(`${hud()}<div class="scroll">
      <div class="center"><div class="big">${r.boss ? '🏆' : '✅'}</div><h2>${r.boss ? 'Boss besiegt!' : 'Sieg!'}</h2>
      <p class="mut">+${r.gold} 🪙 Gold${r.ball ? ' · <b style="color:var(--org2)">🟠 Dragonball gefunden!</b>' : ''}</p></div>
      <p class="center small mut">${r.boss ? 'Wähle ein Relikt oder eine Belohnung' : 'Wähle eine Belohnung'}</p>
      ${r.cards.map((c, i) => cardHtml(c, '', `data-a="reward" data-i="${i}"`)).join('')}
      <button class="btn sec" data-a="skipReward">Überspringen (+25 🪙)</button>
    </div>`);
  },
  shop() {
    const sh = run.shop, ok = it => run.gold >= it.price && !it.sold;
    const price = it => `<span class="price">${it.sold ? 'VERKAUFT' : it.price + ' 🪙'}</span>`;
    const cls = it => (ok(it) ? '' : 'off ') + (it.sold ? 'sold' : '');
    const sec = (t, arr, name) => arr.length ? `<h3 class="sec">${t}</h3>` + arr.map((it, i) => {
      const at = `data-a="buy" data-s="${name}" data-i="${i}"`;
      if (it.k === 'card' || it.k === 'relic' || it.k === 'form') return cardHtml(it.card, price(it), at, cls(it));
      if (it.k === 'item') return cardHtml({ kind: 'item', id: it.id, r: ITEMS[it.id].r }, price(it), at, cls(it));
      const info = { heal: ['🍖', 'Festmahl', 'Heilt sofort 40% LP'], train: ['🏋️', 'Privattraining', '+3 Angriff (nur im Run)'], armor: ['🦺', 'Panzerplatten', '+3 Rüstung (nur im Run)'], vit: ['💗', 'Vitamin-Kur', '+30 Max-LP (nur im Run)'] }[it.k];
      return `<button class="card c ${cls(it)}" ${at}><span class="ic">${info[0]}</span><span><b>${info[1]}</b><span class="d">${info[2]}</span></span>${price(it)}</button>`;
    }).join('') : '';
    const rr = 25 + 20 * sh.rerolls;
    view(`${hud()}<div class="scroll"><h2 class="center">🛒 Bulmas Shop</h2>
      ${sec('✨ Spezial', sh.special, 'special')}${sec('⚔️ Ausrüstung', sh.cards, 'cards')}${sec('🎒 Items', sh.items, 'items')}${sec('💪 Training & Verpflegung', sh.perm, 'perm')}
      <button class="btn sec" data-a="reroll" ${run.gold < rr ? 'disabled' : ''}>🔄 Sortiment erneuern (${rr} 🪙)</button>
      <button class="btn" data-a="leave" style="margin-top:2px">Weiter ➜</button></div>`);
  },
  rest() {
    const s = stats();
    view(`${hud()}<div class="scroll center"><div class="big">🏕️</div><h2>Rastplatz</h2><p class="mut">Ruhe dich aus oder trainiere.</p>
      <button class="btn grn" data-a="restHeal">💚 Ausruhen: +45% LP (${Math.round(s.maxHp * .45)})</button>
      <button class="btn" data-a="restTrain">💪 Trainieren: +2 Angriff dauerhaft</button>
      <button class="btn sec" data-a="restItem" ${run.items.length >= MAX_ITEMS ? 'disabled' : ''}>🔋 Ki-Kapsel basteln (Item)</button></div>`);
  },
  event() {
    const ev = run.event, E = EVENTS[ev.id];
    view(`${hud()}<div class="scroll center"><div class="big">${E.i}</div><h2>${E.t}</h2><p class="mut">${E.txt}</p>
      ${ev.res ? `<div class="panel" style="width:100%"><b>${ev.res}</b></div><button class="btn" data-a="leave">Weiter ➜</button>`
        : E.o.map(o => `<button class="btn sec" data-a="ev" data-k="${o[1]}">${o[0]}</button>`).join('')}</div>`);
  },
  final() {
    view(`<div class="scroll center"><div class="big">🏆</div><h1 class="logo" style="font-size:38px">SAGA GESCHAFFT!</h1>
      <p class="mut">${sg().win}</p>
      <div class="panel" style="width:100%"><b>${sg().n}</b> abgeschlossen auf Schwerkraft ${run.grav}.${run.grav === SAVE.gravMax - 1 && SAVE.gravMax <= GRAV_MAX ? `<br><span style="color:var(--org2)">🌑 Schwerkraft ${SAVE.gravMax} freigeschaltet!</span>` : ''}${Object.keys(SAGAS).some(id => SAGAS[id].req === run.saga) ? '<br><span style="color:var(--org2)">🔓 Neue Saga freigeschaltet!</span>' : ''}</div>
      <button class="btn big-btn" data-a="endless">♾️ ENDLOS WEITERKÄMPFEN</button>
      <p class="small mut">Die Gegner werden immer stärker. Jede weitere Etage gibt mehr Zenkai – aber stirbst du, endet der Run.</p>
      <button class="btn grn" data-a="finish">✔ Run abschließen & Zenkai kassieren</button></div>`);
  },
  end(sm) {
    view(`<div class="scroll center"><div class="big">${sm.won ? '🏆' : '💀'}</div>
      <h1 class="logo" style="font-size:40px">${sm.won ? 'SIEG!' : 'BESIEGT…'}</h1>
      <p class="mut">${sm.won ? (sm.endless ? 'Endlos-Run beendet. Stark!' : sm.winTxt) : 'Ein Saiyajin wird nach jeder Niederlage stärker.'}</p>
      <div class="panel" style="width:100%"><div class="stats" style="grid-template-columns:repeat(4,1fr)">
        <div><b>${sm.floor}</b><span>Etage</span></div><div><b>${sm.kills}</b><span>Siege</span></div><div><b>${sm.bosses}</b><span>Bosse</span></div><div><b>${sm.relics}</b><span>Relikte</span></div></div></div>
      <div class="panel" style="width:100%"><div style="font-size:30px;font-weight:900;color:var(--org2)" class="zk">+${sm.z} ⭐ Zenkai</div>
        <div class="small mut">Gesamt: ${SAVE.zenkai} ⭐${sm.newBest ? ' · 🎉 Neue Bestleistung!' : ''}${sm.balls ? ' · 🟠 +' + sm.balls + ' Dragonball' : ''}</div></div>
      ${SAVE.balls >= 7 ? '<button class="btn red" data-a="wish">🐉 SHENLONG RUFEN!</button>' : ''}
      <button class="btn" data-a="metaScr">🏋️ Zenkai ausgeben</button>
      <button class="btn grn" data-a="start">⚔️ Nochmal!</button>
      <button class="btn sec" data-a="menu">Hauptmenü</button></div>`);
  },
  meta() {
    view(`<div class="hud"><button class="chip" data-a="menu">⬅ Zurück</button><span class="sp"></span><span class="chip">⭐ ${SAVE.zenkai}</span></div>
      <div class="scroll"><h2 class="center">🏋️ Training bei Meister Kaio</h2><p class="center mut small">Dauerhafte Verbesserungen für alle Runs</p>
      ${META.map(m => {
        const l = meta(m.id), maxed = l >= m.max, c = m.cost(l);
        return `<div class="meta"><span class="ic">${m.i}</span><span class="tx"><b>${m.n} ${m.max > 1 ? `<span class="lvl">Stufe ${l}/${m.max}</span>` : (l ? '<span class="lvl">✔ FREIGESCHALTET</span>' : '')}</b><span class="small mut">${m.d}</span></span>
        <button class="btn ${maxed ? 'sec' : ''}" data-a="buyMeta" data-id="${m.id}" ${maxed || SAVE.zenkai < c || (m.needs && !meta(m.needs)) ? 'disabled' : ''}>${maxed ? 'MAX' : (m.needs && !meta(m.needs)) ? '🔒' : c + ' ⭐'}</button></div>`;
      }).join('')}</div>`);
  },
  chars() {
    view(`<div class="hud"><button class="chip" data-a="menu">⬅ Zurück</button><span class="sp"></span><span class="chip">⭐ ${SAVE.zenkai}</span></div>
      <div class="scroll"><h2 class="center">🥋 Kämpfer wählen</h2>
      ${Object.keys(CHARS).map(id => {
        const c = CHARS[id], own = SAVE.chars[id], sel = SAVE.sel === id;
        return `<div class="meta" style="${sel ? 'border-color:var(--org)' : ''}"><div class="mini" style="--ac:${c.ac}">${ART.fighter(c.p)}</div>
          <span class="tx"><b>${c.n}</b><span class="small mut">${c.d}</span><span class="small">❤️${c.hp} · 💪${c.atk} · 🛡️${c.def}</span></span>
          <button class="btn ${own ? 'sec' : ''}" data-a="${own ? 'selChar' : 'buyChar'}" data-id="${id}" ${sel || (!own && SAVE.zenkai < c.cost) ? 'disabled' : ''}>${sel ? '✔' : own ? 'Wählen' : c.cost + ' ⭐'}</button></div>`;
      }).join('')}</div>`);
  },
  settings() {
    const t = (k, label, d) => { const on = k === 'sound' ? SAVE.sound : SAVE.set[k];
      return `<button class="meta" data-a="set" data-k="${k}" style="width:100%;color:inherit;font:inherit;text-align:left"><span class="tx"><b>${label}</b><span class="small mut">${d}</span></span><span class="btn ${on ? 'grn' : 'sec'}" style="width:auto;min-height:40px;padding:8px 14px">${on ? 'AN' : 'AUS'}</span></button>`; };
    view(`<div class="hud"><button class="chip" data-a="menu">⬅ Zurück</button></div>
      <div class="scroll"><h2 class="center">⚙️ Einstellungen</h2>
      ${t('auto', '🤖 Auto-Kampf', 'Techniken werden automatisch eingesetzt (startet jeden Kampf an)')}
      ${t('autoSenzu', '🫘 Auto-Senzu', 'Auto-Modus isst bei unter 30% LP eine Senzu-Bohne')}
      ${t('fast', '⏩ Doppelte Geschwindigkeit', 'Kämpfe laufen mit x2')}
      ${t('sound', '🔊 Ton', 'Soundeffekte')}
      ${t('vib', '📳 Vibration', 'Bei Treffern (nur Android)')}
      ${t('shake', '💥 Bildschirm-Wackeln', 'Bei starken Treffern und Techniken')}
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
  if (!name.startsWith('battle')) { B = null; FX.detach(); }
  (SCREENS[name] || SCREENS.menu)(arg);
}

/* Live-Update des Kampf-UI */
function updateBattleUI() {
  if (!VIS || !B || !$('#eHp')) return;
  const s = B.S, e = B.e;
  $('#eHp').style.width = (B.ehp / B.eMax * 100) + '%'; $('#eHpT').textContent = Math.ceil(B.ehp) + ' / ' + B.eMax;
  $('#pHp').style.width = clamp(run.hp / s.maxHp * 100, 0, 100) + '%'; $('#pHpT').textContent = Math.max(0, Math.ceil(run.hp)) + ' / ' + s.maxHp + (B.shield > 0 ? '  🛡️' + Math.ceil(B.shield) : '');
  $('#pKi').style.width = (B.ki / s.maxKi * 100) + '%'; $('#pKiT').textContent = 'Ki ' + Math.floor(B.ki);
  const w = $('#warn'); w.hidden = !B.charge;
  if (B.charge) {
    $('#warnB').style.width = (B.charge.t / B.charge.max * 100) + '%';
    const d = B.charge.dodged;
    $('#warnT').textContent = d ? '✅ AUSGEWICHEN!' : '⚠️ AUFLADUNG! TIPPEN!';
    $('#warnS').textContent = d ? 'Der Schlag geht ins Leere' : 'Tippen = Ausweichen (' + DODGE_COST + ' Ki)' + (counterHint() ? ' · oder ' + counterHint() : '');
    w.classList.toggle('ok', !!d);
  }
  const bl = [];
  if (B.form) bl.push(FORMS[Math.min(B.form.lv, FORM_MAX)].ico + ' ' + formName(B.form.lv) + ' ' + Math.ceil(B.form.t) + 's');
  if (B.buff.pill > 0) bl.push('💊 ' + Math.ceil(B.buff.pill) + 's');
  if (B.buff.dodge > 0) bl.push('⚡ ' + B.buff.dodge.toFixed(1) + 's');
  if (B.combo > 0) bl.push('👊 ×' + B.combo);
  if (B.blind > 0) bl.push('🌞 blind');
  if (B.stun > 0) bl.push('💫 betäubt');
  if (B.burn) bl.push('🔥 brennt');
  $('#buffs').textContent = bl.join(' · ');
  const P = $('#playerSpr'), En = $('#enemySpr');
  P.classList.toggle('shielded', B.shield > 0);
  En.classList.toggle('charging', !!B.charge); En.classList.toggle('stunned', B.stun > 0); En.classList.toggle('blind', B.blind > 0);
  const fl = B.form ? B.form.lv : 0;
  if (fl !== (B.formShown || 0)) { B.formShown = fl; vis.setForm(B.form); }
  if (B.form) {
    const p = FX.pos(P, .5, .6), st = B.form.style, big = st === 'ssj3' || st === 'mui';
    FX.aura(p.x, p.y, B.form.aura, 38, 90, big ? 2 : 1);
    if (Math.random() < ({ kk: .03, ssj: .03, ssj2: .09, ssj3: .1, mui: .12 }[st] || .03)) FX.bolt(p.x, p.y, B.form.aura, 1, 55);
  }
  if (B.charge) { const p = FX.pos(En, .5, .5); FX.converge(p.x, p.y, '#ff4a5e', 1, 80); }
  // Techniken
  const tc = $('#techs');
  if (!B.uiBuilt) {
    tc.innerHTML = Array.from({ length: MAX_TECHS }, (_, i) => {
      const t = run.techs[i];
      if (!t) return '<button class="tb empty">–</button>';
      const T = TECH[t.id];
      return `<button class="tb" data-a="tech" data-i="${i}"><span class="ic">${tIcon(t)}</span><span><b>${tName(t)}</b><small>${T.cost} Ki</small></span><span class="cdo"></span></button>`;
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
    ${run.techs.map(t => `<div class="meta"><span class="ic">${tIcon(t)}</span><span class="tx"><b>${t.id === 'form' ? formName(t.lv) : TECH[t.id].n} <span class="lvl">${t.id === 'form' ? 'Form-Stufe ' + t.lv : 'Stufe ' + t.lv}</span></b><span class="small mut">${tDesc(t)}</span></span></div>`).join('')}
    ${run.relics.length ? '<b>Relikte</b>' + run.relics.map(id => `<div class="meta"><span class="ic">${RELIC[id].i}</span><span class="tx"><b>${RELIC[id].n}</b><span class="small mut">${RELIC[id].d}</span></span></div>`).join('') : ''}
    <b>Passive</b>
    ${run.pass.length ? Object.entries(run.pass.reduce((a, x) => (a[x] = (a[x] || 0) + 1, a), {})).map(([id, n]) => `<div class="meta"><span class="ic">${PASS[id].i}</span><span class="tx"><b>${PASS[id].n} ×${n}</b><span class="small mut">${PASS[id].d}</span></span></div>`).join('') : '<span class="mut small">Noch keine</span>'}
    <button class="btn sec" data-a="closeModal">Schließen</button>`);
}
function showReplace(card, done) {
  const I = cardInfo(card);
  window.__replaceDone = done; window.__replaceCard = card;
  modal(`<h3>Technik-Slots voll!</h3><p class="mut small">Welche Technik ersetzt du durch ${I.i} <b>${I.n}</b>?</p>
    ${run.techs.map((t, i) => `<button class="card c" data-a="replace" data-i="${i}"><span class="ic">${tIcon(t)}</span><span><b>${t.id === 'form' ? formName(t.lv) : TECH[t.id].n + ' (Stufe ' + t.lv + ')'}</b><span class="d">${tDesc(t)}</span></span></button>`).join('')}
    <button class="btn sec" data-a="closeModal">Abbrechen</button>`);
}

/* ---------- Eingabe ---------- */
const ACT = {
  start() { sfx('ui'); if (SAVE.run && !confirm('Den gespeicherten Run verwerfen und neu starten?')) return; newRun(); },
  resume() { run = SAVE.run; sfx('ui'); go(run.screen === 'reward' && !run.reward ? 'map' : run.screen); },
  saga(d) { SAVE.saga = d.id; SAVE.grav = clamp(SAVE.grav, 0, SAVE.gravMax); save(); sfx('ui'); go('menu'); },
  gravUp() { SAVE.grav = Math.min(SAVE.gravMax, SAVE.grav + 1); save(); sfx('ui'); go('menu'); },
  gravDn() { SAVE.grav = Math.max(0, SAVE.grav - 1); save(); sfx('ui'); go('menu'); },
  menu() { if (B) B = null; sfx('ui'); go('menu'); },
  metaScr() { go('meta'); }, chars() { go('chars'); }, wish() { go('wish'); },
  settings() { go('settings'); },
  set(d) { if (d.k === 'sound') SAVE.sound = !SAVE.sound; else SAVE.set[d.k] = !SAVE.set[d.k]; save(); sfx('ui'); go('settings'); },
  reset() { if (confirm('Wirklich ALLES zurücksetzen (Zenkai, Freischaltungen, Run)?')) { SAVE = defSave(); save(); go('menu'); } },
  node(d) { enterNode(+d.i); },
  tech(d) { useTech(+d.i); },
  skip() { skipBattle(); },
  dodge() { dodgeCharge(); },
  item(d) { useItem(+d.i); },
  auto() { B.auto = !B.auto; SAVE.set.auto = B.auto; save(); $('#autoB').textContent = '🤖 Auto ' + (B.auto ? 'AN' : 'AUS'); $('#autoB').classList.toggle('on', B.auto); },
  fast() { B.fast = !B.fast; SAVE.set.fast = B.fast; save(); $('#fastB').textContent = '⏩ x' + (B.fast ? 2 : 1); $('#fastB').classList.toggle('on', B.fast); },
  reward(d) { pickReward(+d.i); },
  skipReward() { addGold(25); finishReward(); },
  buy(d) {
    const it = run.shop[d.s] && run.shop[d.s][+d.i]; if (!it || it.sold || run.gold < it.price) return sfx('hurt');
    const s = stats();
    const done = () => {
      addGold(-it.price); sfx('win');
      if (['heal', 'train', 'armor', 'vit'].includes(it.k)) { run.buys[it.k] = (run.buys[it.k] || 0) + 1; run.shop.perm = shopPerm(); } else it.sold = true;
      save(); go('shop');
    };
    if (it.k === 'card' || it.k === 'relic' || it.k === 'form') { if (giveCard(it.card) === 'full') return showReplace(it.card, done); return done(); }
    if (it.k === 'item') { if (run.items.length >= MAX_ITEMS) return toast('Item-Slots voll'); run.items.push(it.id); return done(); }
    if (it.k === 'heal') heal(s.maxHp * .4);
    else if (it.k === 'train') run.bonusAtk += 3;
    else if (it.k === 'armor') run.bonusDef += 3;
    else if (it.k === 'vit') { const b = s.maxHp; run.bonusHp += 30; run.hp += stats().maxHp - b; }
    done();
  },
  reroll() {
    const c = 25 + 20 * run.shop.rerolls; if (run.gold < c) return;
    addGold(-c); run.shop.rerolls++; run.shop.cards = shopCards(); run.shop.items = shopItems(); sfx('ui'); save(); go('shop');
  },
  leave() { nextFloor(); },
  restHeal() { heal(stats().maxHp * .45); nextFloor(); },
  restTrain() { run.bonusAtk += 2; nextFloor(); },
  restItem() { if (run.items.length < MAX_ITEMS) { run.items.push('kicap'); nextFloor(); } },
  ev(d) { eventPick(d.k); },
  endless() { run.endless = true; run.opts = null; nextFloor(); },
  finish() { endRun(true); },
  buyMeta(d) {
    const m = META.find(x => x.id === d.id), l = meta(m.id), c = m.cost(l);
    if (l >= m.max || SAVE.zenkai < c || (m.needs && !meta(m.needs))) return;
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
document.addEventListener('visibilitychange', () => { lastT = performance.now(); });

/* ---------- Start ---------- */
go('menu');
