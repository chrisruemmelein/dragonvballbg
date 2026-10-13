'use strict';
/* Kleine Canvas-Effekt-Engine: Strahlen, Kugeln, Partikel, Ringe, Blitze, Blitzlicht */
const FX = (() => {
  let cv = null, ctx = null, host = null, W = 0, H = 0, dpr = 1, raf = 0, last = 0, on = false;
  let parts = [], beams = [], rings = [], orbs = [], bolts = [], flashes = [], discs = [];
  const rnd = (a, b) => a + Math.random() * (b - a);

  function resize() {
    if (!host || !cv) return;
    const r = host.getBoundingClientRect();
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = r.width; H = r.height;
    cv.width = Math.max(1, W * dpr); cv.height = Math.max(1, H * dpr);
    cv.style.width = W + 'px'; cv.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function attach(canvas, hostEl) {
    detach();
    cv = canvas; host = hostEl; ctx = cv.getContext('2d');
    parts = []; beams = []; rings = []; orbs = []; bolts = []; flashes = []; discs = [];
    resize(); window.addEventListener('resize', resize);
    on = true; last = performance.now(); raf = requestAnimationFrame(loop);
  }
  function detach() { on = false; cancelAnimationFrame(raf); window.removeEventListener('resize', resize); cv = ctx = host = null; }

  /* Punkt eines Elements relativ zur Arena; fx/fy = Anteil der Elementbox */
  function pos(el, fx = .5, fy = .5) {
    if (!el || !host) return { x: W / 2, y: H / 2 };
    const r = el.getBoundingClientRect(), h = host.getBoundingClientRect();
    return { x: r.left - h.left + r.width * fx, y: r.top - h.top + r.height * fy };
  }

  function burst(x, y, col, n = 14, speed = 240, size = 4, life = .5, grav = 380) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = rnd(speed * .3, speed);
      parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - speed * .2, life: rnd(life * .6, life), max: life, size: rnd(size * .5, size), col, grav, glow: true });
    }
  }
  function ring(x, y, col, r = 90, dur = .45, w = 8) { rings.push({ x, y, col, r, t: 0, dur, w }); }
  function flash(col = '#fff', a = .7, dur = .35) { flashes.push({ col, a, t: 0, dur }); }
  function bolt(x, y, col, n = 4, len = 70) {
    for (let k = 0; k < n; k++) {
      const pts = []; let px = x + rnd(-24, 24), py = y + rnd(-50, 30);
      const ang = rnd(0, Math.PI * 2);
      for (let i = 0; i < 5; i++) { pts.push([px, py]); px += Math.cos(ang) * len / 5 + rnd(-10, 10); py += Math.sin(ang) * len / 5 + rnd(-10, 10); }
      bolts.push({ pts, col, t: 0, dur: rnd(.12, .28) });
    }
  }
  function beam(a, b, col, o = {}) {
    const w = o.w || 26, dur = o.dur || .75;
    beams.push({ a, b, col, w, dur, t: 0, spiral: !!o.spiral });
    burst(a.x, a.y, col, 8, 120, 5, .4, 0);
  }
  // Kugel: lädt bei (a) auf, fliegt dann zu (b) und explodiert
  function sphere(a, b, col, o = {}) {
    orbs.push({ a, b, col, r: o.r || 22, charge: o.charge || .35, fly: o.fly || .3, t: 0, boom: false, big: o.big, dark: o.dark });
  }
  function disc(a, b, col) { discs.push({ a, b, col, t: 0, dur: .32 }); }
  function aura(x, y, col, w = 50, h = 90, n = 2) {
    for (let i = 0; i < n; i++) parts.push({ x: x + rnd(-w, w), y: y + rnd(0, h * .5), vx: rnd(-14, 14), vy: rnd(-120, -60), life: rnd(.4, .8), max: .8, size: rnd(3, 7), col, grav: 0, glow: true });
  }
  function converge(x, y, col, n = 3, rad = 70) { // Aufladung
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, r = rad;
      parts.push({ x: x + Math.cos(a) * r, y: y + Math.sin(a) * r, vx: -Math.cos(a) * r * 2.2, vy: -Math.sin(a) * r * 2.2, life: .45, max: .45, size: rnd(2, 5), col, grav: 0, glow: true });
    }
  }

  function loop(t) {
    if (!on) return;
    const dt = Math.min(.05, (t - last) / 1000); last = t;
    draw(dt);
    raf = requestAnimationFrame(loop);
  }

  function draw(dt) {
    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';

    /* Strahlen */
    beams = beams.filter(b => (b.t += dt) < b.dur);
    for (const b of beams) {
      const k = b.t / b.dur;
      const head = Math.min(1, b.t / .16);
      const fade = k > .7 ? 1 - (k - .7) / .3 : 1;
      const hx = b.a.x + (b.b.x - b.a.x) * head, hy = b.a.y + (b.b.y - b.a.y) * head;
      const pulse = 1 + Math.sin(b.t * 40) * .1;
      const w = b.w * pulse * (k < .1 ? k / .1 : 1);
      ctx.globalAlpha = .28 * fade; ctx.strokeStyle = b.col; ctx.lineWidth = w * 1.9;
      ctx.beginPath(); ctx.moveTo(b.a.x, b.a.y); ctx.lineTo(hx, hy); ctx.stroke();
      ctx.globalAlpha = .75 * fade; ctx.lineWidth = w;
      ctx.beginPath(); ctx.moveTo(b.a.x, b.a.y); ctx.lineTo(hx, hy); ctx.stroke();
      ctx.globalAlpha = fade; ctx.strokeStyle = '#fff'; ctx.lineWidth = w * .42;
      ctx.beginPath(); ctx.moveTo(b.a.x, b.a.y); ctx.lineTo(hx, hy); ctx.stroke();
      if (b.spiral) {
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.globalAlpha = .8 * fade; ctx.beginPath();
        const dx = hx - b.a.x, dy = hy - b.a.y, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
        for (let i = 0; i <= 30; i++) { const u = i / 30, off = Math.sin(u * 22 - b.t * 30) * w * .7, x = b.a.x + dx * u + nx * off, y = b.a.y + dy * u + ny * off; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
        ctx.stroke();
      }
      // Quellkugel + Einschlag
      ctx.globalAlpha = .9 * fade; ctx.fillStyle = b.col; ctx.beginPath(); ctx.arc(b.a.x, b.a.y, w * .95, 0, 7); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(b.a.x, b.a.y, w * .5, 0, 7); ctx.fill();
      if (head >= 1) {
        ctx.globalAlpha = .8 * fade; ctx.fillStyle = b.col; ctx.beginPath(); ctx.arc(b.b.x, b.b.y, w * (1.1 + Math.sin(b.t * 50) * .2), 0, 7); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(b.b.x, b.b.y, w * .55, 0, 7); ctx.fill();
        if (Math.random() < .6) burst(b.b.x, b.b.y, b.col, 2, 260, 4, .35, 200);
      }
    }

    /* Kugeln */
    orbs = orbs.filter(o => (o.t += dt) < o.charge + o.fly + .35);
    for (const o of orbs) {
      let x = o.a.x, y = o.a.y, r = o.r, a = 1;
      if (o.t < o.charge) { const k = o.t / o.charge; r = o.r * (.3 + .7 * k); if (!o.big) converge(x, y, o.col, 1, r * 3); else converge(x, y, o.col, 3, r * 2.2); }
      else if (o.t < o.charge + o.fly) { const k = (o.t - o.charge) / o.fly, e = k * k; x = o.a.x + (o.b.x - o.a.x) * e; y = o.a.y + (o.b.y - o.a.y) * e; parts.push({ x, y, vx: rnd(-30, 30), vy: rnd(-30, 30), life: .3, max: .3, size: r * .5, col: o.col, grav: 0, glow: true }); }
      else { x = o.b.x; y = o.b.y; const k = (o.t - o.charge - o.fly) / .35; a = 1 - k; r = o.r * (1 + k * 3);
        if (!o.boom) { o.boom = true; burst(x, y, o.col, o.big ? 40 : 22, o.big ? 520 : 340, o.big ? 8 : 5, .7, 200); ring(x, y, o.col, o.big ? 220 : 130, .5, 12); flash(o.col, o.big ? .8 : .35, .4); } }
      ctx.globalAlpha = .35 * a; ctx.fillStyle = o.col; ctx.beginPath(); ctx.arc(x, y, r * 1.7, 0, 7); ctx.fill();
      ctx.globalAlpha = a; ctx.fillStyle = o.dark ? '#8a4bff' : o.col; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
      ctx.fillStyle = o.dark ? '#1a0a33' : '#fff'; ctx.beginPath(); ctx.arc(x, y, r * .55, 0, 7); ctx.fill();
    }

    /* Scheiben */
    discs = discs.filter(d => (d.t += dt) < d.dur);
    for (const d of discs) {
      const k = d.t / d.dur, x = d.a.x + (d.b.x - d.a.x) * k, y = d.a.y + (d.b.y - d.a.y) * k;
      ctx.globalAlpha = .9; ctx.fillStyle = d.col; ctx.beginPath(); ctx.ellipse(x, y, 30, 8, 0, 0, 7); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(x, y, 30, 8, 0, 0, 7); ctx.stroke();
      parts.push({ x, y, vx: -60, vy: rnd(-20, 20), life: .25, max: .25, size: 5, col: d.col, grav: 0, glow: true });
      if (d.t + dt >= d.dur) { burst(d.b.x, d.b.y, d.col, 18, 320, 5, .5, 200); ring(d.b.x, d.b.y, d.col, 110, .35, 8); }
    }

    /* Ringe */
    rings = rings.filter(r => (r.t += dt) < r.dur);
    for (const r of rings) {
      const k = r.t / r.dur;
      ctx.globalAlpha = (1 - k) * .9; ctx.strokeStyle = r.col; ctx.lineWidth = r.w * (1 - k * .6);
      ctx.beginPath(); ctx.arc(r.x, r.y, r.r * (.15 + k * .85), 0, 7); ctx.stroke();
    }

    /* Blitze */
    bolts = bolts.filter(b => (b.t += dt) < b.dur);
    for (const b of bolts) {
      ctx.globalAlpha = 1 - b.t / b.dur; ctx.strokeStyle = b.col; ctx.lineWidth = 3;
      ctx.beginPath(); b.pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.stroke();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.stroke();
    }

    /* Partikel */
    parts = parts.filter(p => (p.life -= dt) > 0);
    for (const p of parts) {
      p.vy += p.grav * dt; p.x += p.vx * dt; p.y += p.vy * dt;
      const k = p.life / p.max;
      ctx.globalAlpha = Math.min(1, k * 1.6); ctx.fillStyle = p.col;
      ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(.5, p.size * (.4 + k * .6)), 0, 7); ctx.fill();
    }
    if (parts.length > 600) parts.splice(0, parts.length - 600);

    /* Blitzlicht */
    ctx.globalCompositeOperation = 'source-over';
    flashes = flashes.filter(f => (f.t += dt) < f.dur);
    for (const f of flashes) { ctx.globalAlpha = f.a * (1 - f.t / f.dur); ctx.fillStyle = f.col; ctx.fillRect(0, 0, W, H); }
    ctx.globalAlpha = 1;
  }

  return { attach, detach, pos, burst, ring, flash, bolt, beam, sphere, disc, aura, converge, resize };
})();
