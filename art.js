'use strict';
/* Selbstgezeichnete Grafik: Kämpfer (SVG, parametrisch), Dragonbälle, Hintergründe */
const ART = (() => {
  const OUT = '#14121c';

  function shade(hex, a) { // a: -1..1
    const n = parseInt(hex.slice(1), 16);
    let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    const f = v => Math.round(a >= 0 ? v + (255 - v) * a : v * (1 + a));
    return '#' + [f(r), f(g), f(b)].map(v => v.toString(16).padStart(2, '0')).join('');
  }
  const stroke = (w = 2.6) => `stroke="${OUT}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;

  /* ---- Haare (Pfade im 140x226-Koordinatensystem, Kopf: cx70 cy46) ---- */
  const HAIR = {
    goku:   'M47,42 C42,32 44,24 49,20 L40,4 L58,14 L58,-8 L70,12 L82,-10 L84,14 L100,2 L92,22 C97,28 98,36 93,42 C88,30 52,30 47,42Z',
    gokuS2: 'M47,42 C38,30 40,20 46,16 L28,-10 L52,6 L46,-28 L64,2 L70,-32 L78,2 L98,-28 L90,8 L112,-10 L94,18 C101,28 102,36 93,42 C88,30 52,30 47,42Z',
    gokuS:  'M47,42 C40,30 42,22 48,18 L34,-4 L56,10 L54,-20 L70,8 L86,-22 L86,10 L106,-4 L93,20 C99,28 100,36 93,42 C88,30 52,30 47,42Z',
    vegeta: 'M47,42 C43,30 47,22 52,17 L54,-12 L64,9 L70,-20 L76,9 L86,-12 L88,17 C93,22 97,30 93,42 L85,31 L70,35 L55,31Z',
    gohan:  'M47,42 C43,32 45,24 50,20 L44,6 L60,14 L62,-2 L72,12 L84,0 L86,16 L98,8 L92,24 C97,30 97,36 93,42 C88,32 54,30 47,42Z M54,34 C52,44 56,50 58,50 L62,36Z',
    trunks: 'M46,46 C38,24 54,12 72,12 C92,12 104,24 94,48 L92,34 L82,24 L68,26 L56,30 L52,50Z',
    raditz: 'M47,42 C43,32 45,24 50,20 L42,4 L58,14 L60,-6 L72,12 L84,-6 L84,14 L100,4 L92,22 C97,30 97,36 93,42 C88,30 52,30 47,42Z',
    raditzBack: 'M44,34 L26,110 L38,134 L50,96 L56,150 L68,100 L80,152 L88,98 L102,134 L112,108 L96,34Z',
    long:   'M46,44 C40,22 56,14 72,14 C90,14 102,24 94,46 L90,34 L74,26 L56,32Z',
    longBack: 'M42,40 C36,70 40,92 50,100 L60,70 L80,70 L90,100 C100,92 104,70 98,40Z',
    recoome:'M48,36 C46,24 50,16 56,14 L56,-6 L70,6 L84,-6 L84,14 C90,16 94,24 92,36 C86,28 54,28 48,36Z',
  };

  function ball(stars, lit = true, size = 28) {
    const P = { 1: [[0, 0]], 2: [[-.34, .0], [.34, 0]], 3: [[0, -.3], [-.32, .22], [.32, .22]], 4: [[-.3, -.3], [.3, -.3], [-.3, .3], [.3, .3]],
      5: [[-.3, -.3], [.3, -.3], [0, 0], [-.3, .3], [.3, .3]], 6: [[-.3, -.36], [.3, -.36], [-.3, 0], [.3, 0], [-.3, .36], [.3, .36]],
      7: [[0, -.45], [-.34, -.2], [.34, -.2], [-.34, .2], [.34, .2], [0, .0], [0, .45]] };
    const id = 'bg' + stars + (lit ? 'l' : 'd') + Math.floor(Math.random() * 1e5);
    const star = (cx, cy, r) => { let p = ''; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * .42 : r; p += (i ? 'L' : 'M') + (cx + Math.cos(a) * rr).toFixed(1) + ',' + (cy + Math.sin(a) * rr).toFixed(1); } return p + 'Z'; };
    const c1 = lit ? '#ffcf5a' : '#3a3f63', c2 = lit ? '#ff8a00' : '#232846', c3 = lit ? '#d95a00' : '#161a33';
    return `<svg class="dball${lit ? ' lit' : ''}" width="${size}" height="${size}" viewBox="-50 -50 100 100" aria-hidden="true"><defs><radialGradient id="${id}" cx="35%" cy="30%" r="80%"><stop offset="0" stop-color="${c1}"/><stop offset=".55" stop-color="${c2}"/><stop offset="1" stop-color="${c3}"/></radialGradient></defs>
      <circle r="46" fill="url(#${id})" stroke="${OUT}" stroke-width="4"/><ellipse cx="-15" cy="-22" rx="14" ry="8" fill="#fff" opacity="${lit ? .55 : .12}" transform="rotate(-30 -15 -22)"/>
      ${(P[stars] || []).map(p => `<path d="${star(p[0] * 60, p[1] * 60, 11)}" fill="${lit ? '#d3201a' : '#555b85'}" stroke="${lit ? '#7a0d0a' : '#2a2e52'}" stroke-width="1.5"/>`).join('')}</svg>`;
  }

  function fighter(p, o = {}) {
    const F = o.form || (o.ssj ? { hair: '#ffe14a', eye: '#27e0c4', style: 'ssj' } : null);
    const ssj = !!(F && F.hair);
    const hc = ssj ? F.hair : p.hc;
    const eye = (F && F.eye) || (p.eye || '#15131c');
    const st3 = !!(F && F.style === 'ssj3');
    const ex = p.ex || [];
    const has = k => ex.includes(k);
    const skin = p.skin, build = p.build || 'normal';
    const [sx, sy] = { normal: [1, 1], big: [1.22, 1.04], small: [.84, .8], slim: [.9, 1.03] }[build];
    const sk2 = shade(skin, -.18);
    const top = p.top, bot = p.bot, inner = p.inner || p.top, belt = p.belt || '#222', boots = p.boots || '#222', wrist = p.wrist || skin;
    const glove = wrist === '#f4f4f4' ? '#f4f4f4' : skin;
    const S = stroke();
    let back = '', front = '';

    /* hinter dem Körper */
    if (has('cape')) back += `<path d="M44,72 L96,72 L116,160 L24,160 Z" fill="${p.cape || '#f4f4f4'}" ${S}/><path d="M50,80 L90,80 L102,150 L38,150Z" fill="${shade(p.cape || '#f4f4f4', -.1)}"/>`;
    if (has('wings')) back += `<path d="M44,80 L6,40 L16,100 L10,140 L50,110Z M96,80 L134,40 L124,100 L130,140 L90,110Z" fill="#2a3a22" ${S}/>`;
    if (has('tail')) back += `<path d="M84,120 C112,126 122,150 112,172" fill="none" stroke="${OUT}" stroke-width="10" stroke-linecap="round"/><path d="M84,120 C112,126 122,150 112,172" fill="none" stroke="#9a6a30" stroke-width="6" stroke-linecap="round"/>`;
    if (has('sword')) back += `<path d="M98,66 L52,138" stroke="${OUT}" stroke-width="10" stroke-linecap="round"/><path d="M98,66 L52,138" stroke="#7a4a20" stroke-width="6" stroke-linecap="round"/>`;
    if (p.hair === 'raditz') back += `<path d="${HAIR.raditzBack}" fill="${hc}" ${S}/>`;
    if (p.hair === 'long') back += `<path d="${HAIR.longBack}" fill="${hc}" ${S}/>`;
    if (st3 && p.hair !== 'bald' && p.hair !== 'none') back += `<path d="M40,34 L20,150 L30,200 L48,126 L58,204 L70,134 L82,204 L92,126 L110,200 L120,150 L100,34Z" fill="${hc}" ${S}/>`;

    /* Beine + Schuhe */
    const leg = x => `<path d="M${x},116 L${x + 16},116 L${x + 15},176 L${x - 1},176Z" fill="${bot}" ${S}/>
      <path d="M${x - 3},168 L${x + 18},168 L${x + 20},190 L${x - 5},190Z" fill="${boots}" ${S}/>`;
    let legs = leg(50) + leg(74);
    if (has('buuhead')) legs = `<path d="M50,116 L90,116 L96,150 L44,150Z" fill="${bot}" ${S}/>` + leg(50).replace(/fill="[^"]+"/, `fill="${bot}"`) + leg(74).replace(/fill="[^"]+"/, `fill="${bot}"`);

    /* Torso */
    let torso = `<path d="M43,72 Q70,62 97,72 L91,126 L49,126Z" fill="${has('saiarmor') ? inner : top}" ${S}/>`;
    if (!has('saiarmor') && inner !== top) torso += `<path d="M58,66 L70,96 L82,66Z" fill="${inner}" ${S}/>`;
    if (has('saiarmor')) torso += `<path d="M45,72 Q70,64 95,72 L90,106 L50,106Z" fill="${p.armor || '#e9e9ee'}" ${S}/><path d="M50,106 L90,106 L88,122 L52,122Z" fill="${inner}" ${S}/>
      <path d="M38,66 L56,64 L54,86 L40,84Z M102,66 L84,64 L86,86 L100,84Z" fill="${p.pad || '#e0a800'}" ${S}/>`;
    if (has('fzparts')) torso += `<path d="M46,74 Q70,66 94,74 L90,98 L50,98Z" fill="#7a3db8" ${S}/><path d="M40,66 L56,64 L54,82 L42,80Z M100,66 L84,64 L86,82 L98,80Z" fill="#7a3db8" ${S}/>`;
    if (has('spikes')) torso += `<path d="M38,66 L44,50 L52,66Z M102,66 L96,50 L88,66Z" fill="#ffe08a" ${S}/>`;
    const beltEl = has('buuhead') ? `<rect x="46" y="118" width="48" height="9" rx="3" fill="${belt}" ${S}/>` : `<rect x="48" y="118" width="44" height="10" rx="3" fill="${belt}" ${S}/><path d="M64,128 L60,142 L70,130 L80,142 L76,128Z" fill="${belt}" ${S}/>`;
    if (has('spots')) torso += `<circle cx="58" cy="90" r="3" fill="#000" opacity=".28"/><circle cx="82" cy="100" r="3.5" fill="#000" opacity=".28"/><circle cx="66" cy="112" r="2.5" fill="#000" opacity=".28"/>`;
    if (has('clown')) torso += `<path d="M62,70 L78,70 L70,84Z" fill="#d83b3b" ${S}/>`;

    /* Arme (Drehpunkt = Schulter, wird per CSS animiert) */
    const sleeve = has('cape') || has('sword') || p.sleeve;
    const arm = (x, cls) => `<g class="arm ${cls}" style="transform-origin:${x}px 76px">
      <path d="M${x},76 L${x},110" stroke="${OUT}" stroke-width="17" stroke-linecap="round" fill="none"/>
      <path d="M${x},76 L${x},110" stroke="${skin}" stroke-width="12.6" stroke-linecap="round" fill="none"/>
      ${sleeve ? `<path d="M${x},74 L${x},90" stroke="${top}" stroke-width="13.6" stroke-linecap="butt" fill="none"/>` : ''}
      <path d="M${x},96 L${x},103" stroke="${wrist}" stroke-width="13.8" stroke-linecap="butt" fill="none"/>
      <circle cx="${x}" cy="111" r="7.4" fill="${glove}" ${S}/></g>`;
    const arms = arm(40, 'arm-b') + arm(100, 'arm-f');

    /* Kopf */
    let head = `<rect x="63" y="60" width="14" height="12" fill="${sk2}"/>`;
    head += `<circle cx="51" cy="48" r="5" fill="${skin}" ${S}/><circle cx="89" cy="48" r="5" fill="${skin}" ${S}/>`;
    head += `<ellipse cx="70" cy="46" rx="19.5" ry="21.5" fill="${skin}" ${S}/>`;
    const brow = ssj ? '#c9a400' : (p.hair === 'bald' || p.hair === 'none' ? shade(skin, -.45) : shade(p.hc, -.1));
    if (!st3) head += `<path d="M54,41 L66,45 M86,41 L74,45" stroke="${brow}" stroke-width="3.4" stroke-linecap="round"/>`;
    else head += `<path d="M52,40 Q60,36 67,41 M88,40 Q80,36 73,41" fill="none" stroke="${shade(skin,-.35)}" stroke-width="2.4" stroke-linecap="round"/>`;
    head += `<ellipse cx="62" cy="49" rx="3.4" ry="4.6" fill="${eye}"/><ellipse cx="78" cy="49" rx="3.4" ry="4.6" fill="${eye}"/><circle cx="63.2" cy="47.4" r="1.2" fill="#fff"/><circle cx="79.2" cy="47.4" r="1.2" fill="#fff"/>`;
    head += `<path d="M70,50 L69,56 L72,56" fill="none" stroke="${sk2}" stroke-width="1.6" stroke-linecap="round"/><path d="M62,62 Q70,66 78,62" fill="none" stroke="${OUT}" stroke-width="2.2" stroke-linecap="round" class="mouth"/>`;
    if (has('saiba')) head += `<ellipse cx="62" cy="49" rx="5" ry="6" fill="#fff"/><ellipse cx="78" cy="49" rx="5" ry="6" fill="#fff"/><circle cx="62" cy="50" r="2.6" fill="#d11"/><circle cx="78" cy="50" r="2.6" fill="#d11"/><path d="M58,62 L62,67 L66,62 L70,67 L74,62 L78,67 L82,62" fill="#fff" stroke="${OUT}" stroke-width="1.6"/>`;
    if (has('eyes4')) head += `<ellipse cx="62" cy="36" rx="2.4" ry="3.2" fill="#d11"/><ellipse cx="78" cy="36" rx="2.4" ry="3.2" fill="#d11"/>`;
    if (has('dots')) head += [[66, 30], [74, 30], [62, 34], [78, 34], [67, 36], [73, 36]].map(d => `<circle cx="${d[0]}" cy="${d[1]}" r="1.7" fill="#7a3a1a"/>`).join('');
    if (has('mustache')) head += `<path d="M58,58 Q64,55 70,58 Q76,55 82,58 Q76,63 70,60 Q64,63 58,58Z" fill="${p.hc === '#000' ? '#222' : (p.hc || '#222')}" ${stroke(1.4)}/>`;
    if (has('spots')) head += `<circle cx="56" cy="40" r="2.2" fill="#000" opacity=".3"/><circle cx="84" cy="54" r="2.4" fill="#000" opacity=".3"/>`;
    if (has('glasses')) head += `<circle cx="62" cy="49" r="6.5" fill="none" stroke="${OUT}" stroke-width="2"/><circle cx="78" cy="49" r="6.5" fill="none" stroke="${OUT}" stroke-width="2"/><path d="M68,49 L72,49" stroke="${OUT}" stroke-width="2"/>`;
    if (has('visor')) head += `<rect x="52" y="42" width="36" height="12" rx="5" fill="#d11" ${S}/><rect x="56" y="45" width="12" height="3" fill="#ff9a9a"/>`;
    if (has('scouter')) head += `<path d="M52,48 L48,40" stroke="${OUT}" stroke-width="2.5"/><rect x="54" y="41" width="16" height="11" rx="3" fill="#39e07a" opacity=".78" ${stroke(2)}/>`;
    if (has('clown')) head += `<circle cx="70" cy="54" r="4.2" fill="#d83b3b" ${stroke(1.6)}/>`;

    /* Haare & Kopfschmuck (vor dem Gesicht) */
    let hair = '';
    const hp = p.hair;
    const hairPath = hp === 'goku' ? (ssj ? (F.style === 'ssj2' ? HAIR.gokuS2 : HAIR.gokuS) : HAIR.goku) : HAIR[hp];
    if (hairPath && hp !== 'bald' && hp !== 'none') {
      const path = (hp === 'raditz' || hp === 'long') ? HAIR[hp] : hairPath;
      hair += `<path d="${path}" fill="${hc}" ${S}/><path d="M58,22 Q70,14 84,22" fill="none" stroke="#fff" stroke-opacity="${ssj ? .55 : .22}" stroke-width="3" stroke-linecap="round"/>`;
    }
    if (has('turban')) hair += `<path d="M49,36 Q70,12 91,36 L91,40 L49,40Z" fill="#f4f4f4" ${S}/><path d="M58,30 Q70,22 82,30" fill="none" stroke="#c9c9d6" stroke-width="2"/>`;
    if (has('antennae')) hair += `<path d="M62,28 Q58,16 54,10 M78,28 Q82,16 86,10" fill="none" stroke="${OUT}" stroke-width="6" stroke-linecap="round"/><path d="M62,28 Q58,16 54,10 M78,28 Q82,16 86,10" fill="none" stroke="${skin}" stroke-width="3" stroke-linecap="round"/>`;
    if (has('horns')) hair += `<path d="M52,32 C40,22 42,6 54,0 L58,24Z M88,32 C100,22 98,6 86,0 L82,24Z" fill="${p.horn || '#f4f0ff'}" ${S}/>`;
    if (has('fzparts')) hair += `<path d="M50,36 Q70,14 90,36 L90,40 L50,40Z" fill="#7a3db8" ${S}/>`;
    if (has('helmet')) hair += `<path d="M48,38 C48,14 92,14 92,38 L48,38Z" fill="${shade(top, -.25)}" ${S}/><rect x="48" y="34" width="44" height="6" fill="${shade(top, -.5)}" ${stroke(1.6)}/><path d="M64,22 L76,22 L70,30Z" fill="#d83b3b"/>`;
    if (has('hat')) hair += `<path d="M50,32 Q70,8 90,32Z" fill="#f4f4f4" ${S}/><rect x="46" y="30" width="48" height="6" rx="3" fill="#d8d8e4" ${S}/>`;
    if (has('cellhead')) hair += `<path d="M50,32 L46,6 L60,22 L70,-4 L80,22 L94,6 L90,32Z" fill="${shade(skin, -.3)}" ${S}/><path d="M56,60 L84,60" stroke="${OUT}" stroke-width="1.5" opacity=".5"/>`;
    if (has('buuhead')) hair += `<path d="M70,26 C58,-6 104,-12 96,22" fill="none" stroke="${OUT}" stroke-width="12" stroke-linecap="round"/><path d="M70,26 C58,-6 104,-12 96,22" fill="none" stroke="${skin}" stroke-width="8" stroke-linecap="round"/>`;
    if (has('scarf')) front += `<path d="M54,66 Q70,76 86,66 L88,76 Q70,86 52,76Z" fill="${belt === '#222' ? '#d83b3b' : belt}" ${S}/>`;
    if (has('cape') && !has('turban') && p.hair !== 'none') front += `<path d="M42,70 L52,66 L52,82 L42,84Z M98,70 L88,66 L88,82 L98,84Z" fill="${top}" ${S}/>`;
    if (has('turban') || (has('cape') && p.hair === 'none')) front += `<path d="M38,68 L56,66 L54,86 L40,84Z M102,68 L84,66 L86,86 L100,84Z" fill="#f4f4f4" ${S}/>`;

    return `<svg class="fsvg${F ? ' is-form' : ''}" viewBox="0 -26 140 226" aria-hidden="true">
      <g transform="translate(70 190) scale(${sx} ${sy}) translate(-70 -190)"><g class="bob">
      ${back}${legs}${torso}${beltEl}${arms}${front}${head}${hair}</g></g></svg>`;
  }

  /* ---------- Hintergründe ---------- */
  const BG = {
    earth:     { sky: ['#ffb36b', '#ff7a4d', '#7a2a5a'], sun: [.72, .26, 46, '#fff1c2'], far: '#6b2e4a', mid: '#4a2040', ground: ['#7a4a2a', '#4a2a18'], deco: 'mesa' },
    namek:     { sky: ['#b8ffd6', '#7fe3b0', '#2f9a7a'], sun: [.25, .22, 36, '#e6fff2'], far: '#2f8f78', mid: '#1f6f66', ground: ['#3ec8a0', '#1c7a6a'], deco: 'trees' },
    space:     { sky: ['#0b0720', '#2a1060', '#5a1f7a'], sun: [.7, .3, 70, '#7a4aff'], far: '#1c1040', mid: '#2a1858', ground: ['#4a4a6a', '#22223a'], deco: 'pillars', stars: true },
    wasteland: { sky: ['#ffe4a0', '#ffc070', '#c9824a'], sun: [.3, .24, 40, '#fff6d0'], far: '#b0703a', mid: '#8a5430', ground: ['#a8743c', '#6a4222'], deco: 'mesa' },
    city:      { sky: ['#3a3f6a', '#8a6a8a', '#e09a7a'], sun: [.75, .3, 38, '#ffd9a0'], far: '#2a2c4a', mid: '#1c1e38', ground: ['#4a4a58', '#26262f'], deco: 'bldg' },
    chamber:   { sky: ['#ffffff', '#f2f6ff', '#d8e4ff'], sun: null, far: '#e4ecff', mid: '#cfdcff', ground: ['#f4f7ff', '#b8c6f0'], deco: 'none' },
    arena:     { sky: ['#6ec8ff', '#9ad8ff', '#d8f0ff'], sun: [.7, .2, 36, '#fffbe0'], far: '#7aa8c8', mid: '#5a88a8', ground: ['#c8c8d0', '#8a8a98'], deco: 'tiles' },
    lookout:   { sky: ['#2f8fff', '#7ac4ff', '#e8f6ff'], sun: [.25, .2, 34, '#fffbe0'], far: '#ffffff', mid: '#dfeeff', ground: ['#f0f0f8', '#b0b8d0'], deco: 'clouds' },
    buuhouse:  { sky: ['#ffb0d8', '#ff8ac0', '#c05aa0'], sun: [.7, .25, 40, '#fff0f8'], far: '#c25a98', mid: '#a04880', ground: ['#e87ab8', '#a04880'], deco: 'domes' },
    otherworld:{ sky: ['#3a1a6a', '#8a3a9a', '#ffd06a'], sun: [.5, .3, 60, '#fff0a0'], far: '#5a2a7a', mid: '#3a1a5a', ground: ['#f0d890', '#9a7a4a'], deco: 'clouds', stars: true },
    ruins:     { sky: ['#4a0f1f', '#a02a2a', '#ff8a4a'], sun: [.3, .3, 50, '#ffcf8a'], far: '#4a1a22', mid: '#2e0e18', ground: ['#5a3a3a', '#2a1a1a'], deco: 'mesa' },
  };

  function bg(name) {
    const c = BG[name] || BG.earth;
    let s = `<div class="bg-sky" style="background:linear-gradient(180deg,${c.sky[0]},${c.sky[1]} 55%,${c.sky[2]})"></div>`;
    if (c.stars) {
      let st = ''; for (let i = 0; i < 40; i++) { const x = (i * 53) % 100, y = (i * 31) % 55, r = 1 + (i % 3) * .7; st += `<i style="left:${x}%;top:${y}%;width:${r}px;height:${r}px;animation-delay:${(i % 7) * .4}s"></i>`; }
      s += `<div class="bg-stars">${st}</div>`;
    }
    if (c.sun) s += `<div class="bg-sun" style="left:${c.sun[0] * 100}%;top:${c.sun[1] * 100}%;width:${c.sun[2] * 2}px;height:${c.sun[2] * 2}px;margin:-${c.sun[2]}px 0 0 -${c.sun[2]}px;background:radial-gradient(circle,${c.sun[3]} 0,${c.sun[3]} 38%,transparent 70%)"></div>`;
    if (c.deco === 'clouds') s += `<div class="bg-clouds"><i></i><i></i><i></i></div>`;
    const far = { mesa: '0,60 10,40 18,40 24,60 36,30 46,30 52,60 66,36 76,36 84,60 100,44 100,100 0,100', trees: '0,70 8,40 12,70 22,30 26,70 40,44 46,70 60,24 64,70 80,38 86,70 100,50 100,100 0,100',
      pillars: '0,70 6,30 14,30 18,70 30,20 40,20 44,70 58,36 68,36 72,70 86,24 94,24 100,60 100,100 0,100', bldg: '0,60 6,36 16,36 18,56 24,24 34,24 36,60 46,40 56,40 58,62 68,28 78,28 80,58 90,44 100,56 100,100 0,100',
      none: '0,80 100,80 100,100 0,100', tiles: '0,70 20,60 40,66 60,56 80,64 100,58 100,100 0,100', clouds: '0,74 8,64 16,70 26,58 36,68 48,60 60,70 72,58 84,68 100,62 100,100 0,100',
      domes: '0,70 6,52 14,46 22,52 26,70 40,60 48,44 58,40 66,48 70,70 84,58 92,46 100,56 100,100 0,100' }[c.deco] || '0,70 100,70 100,100 0,100';
    s += `<svg class="bg-far" viewBox="0 0 100 100" preserveAspectRatio="none"><polygon points="${far}" fill="${c.far}"/></svg>`;
    s += `<svg class="bg-mid" viewBox="0 0 100 100" preserveAspectRatio="none"><polygon points="0,84 14,74 30,82 48,72 66,82 84,74 100,82 100,100 0,100" fill="${c.mid}"/></svg>`;
    s += `<div class="bg-ground" style="background:linear-gradient(180deg,${c.ground[0]},${c.ground[1]})"></div>`;
    return s;
  }

  return { fighter, ball, bg, shade };
})();
