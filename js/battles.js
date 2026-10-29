'use strict';
// Capture fights and the promotion ceremony, played out in a castle arena.
const Battle = (() => {
  const FLOOR = 290;
  const NAMES = { p: 'Pawn', n: 'Knight', b: 'Bishop', r: 'Rook', q: 'Queen', k: 'King' };
  const SIDES = { w: 'White', b: 'Black' };
  const clamp01 = k => (k < 0 ? 0 : k > 1 ? 1 : k);
  const rnd = (a, b) => a + Math.random() * (b - a);

  const HEART = ['.##.##.', '#######', '#######', '.#####.', '..###..', '...#...'];
  const SPARK = ['..#..', '..#..', '##.##', '..#..', '..#..'];
  const STAR = ['..#..', '.###.', '#####', '.###.', '.#.#.'];

  function drawPattern(ctx, pat, x, y, color, s = 2) {
    ctx.fillStyle = color;
    const w = pat[0].length, h = pat.length;
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      if (pat[j][i] === '#') ctx.fillRect(Math.round(x + (i - w / 2) * s), Math.round(y + (j - h / 2) * s), s, s);
    }
  }

  class Actor {
    constructor(type, color, x, flip) {
      Object.assign(this, { type, color, x, flip, y: FLOOR, scale: 4, rot: 0, alpha: 1, sx: 1, sy: 1, ox: 0, oy: 0, variant: '', hidden: false, split: 0, skin: null });
    }
    sprite() { return getSprite(this.skin || this.type, this.color, this.variant); }
    headY() { return this.y + this.oy - this.sprite().height * this.scale * this.sy; }
    draw(ctx) {
      if (this.hidden || this.alpha <= 0) return;
      const spr = this.sprite(), s = this.scale, w = spr.width * s, h = spr.height * s;
      const X = this.x + this.ox, Y = this.y + this.oy;
      ctx.save();
      ctx.globalAlpha = clamp01(this.alpha);
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(Math.round(X - w * 0.35), this.y - 2, Math.round(w * 0.7), 5);
      const cut = Math.floor(spr.height * 0.45);
      const k = this.split;
      const parts = k > 0
        ? [[0, cut, 34 * k, (spr.height - cut) * s * k * k - 14 * Math.sin(Math.PI * k)], [cut, spr.height, 0, 0]]
        : [[0, spr.height, 0, 0]];
      for (const [r0, r1, dx, dy] of parts) {
        ctx.save();
        ctx.translate(Math.round(X + dx), Math.round(Y + dy));
        ctx.rotate(this.rot);
        ctx.scale((this.flip ? -1 : 1) * this.sx, this.sy);
        ctx.drawImage(spr, 0, r0, spr.width, r1 - r0, -w / 2, -h + r0 * s, w, (r1 - r0) * s);
        ctx.restore();
      }
      ctx.restore();
    }
  }

  let bgCache = null;
  function drawArena(ctx, t) {
    if (!bgCache) {
      const c = document.createElement('canvas');
      c.width = CW; c.height = CH;
      const x = c.getContext('2d');
      const wallBottom = FLOOR - 40;
      x.fillStyle = '#2a2036';
      x.fillRect(0, 0, CW, wallBottom);
      let seed = 7;
      const rand = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
      for (let row = 0; row * 12 < wallBottom; row++) {
        const y = row * 12, off = row % 2 ? 12 : 0;
        for (let bx = off - 24; bx < CW; bx += 24) {
          if (rand() < 0.18) { x.fillStyle = '#33283f'; x.fillRect(bx + 1, y + 1, 23, 11); }
          x.fillStyle = '#1c1526';
          x.fillRect(bx, y, 1, 12);
        }
        x.fillStyle = '#1c1526';
        x.fillRect(0, y, CW, 1);
      }
      // Arched window with night sky
      x.fillStyle = '#15101c';
      x.fillRect(140, 48, 64, 104);
      x.beginPath(); x.arc(172, 80, 32, Math.PI, 0); x.fill();
      x.fillStyle = '#101838';
      x.fillRect(144, 80, 56, 68);
      x.beginPath(); x.arc(172, 80, 28, Math.PI, 0); x.fill();
      x.fillStyle = '#c9d4ff';
      for (let i = 0; i < 14; i++) x.fillRect(146 + Math.floor(rand() * 52), 58 + Math.floor(rand() * 86), 1, 1);
      x.fillStyle = '#f4eccc';
      x.beginPath(); x.arc(186, 82, 8, 0, Math.PI * 2); x.fill();
      x.fillStyle = '#101838';
      x.beginPath(); x.arc(182, 79, 7, 0, Math.PI * 2); x.fill();
      x.fillStyle = '#15101c';
      x.fillRect(171, 52, 3, 98);
      x.fillRect(144, 112, 56, 3);
      // Banners for each army
      for (const [bx, cloth, trim] of [[86, '#ece2c6', '#e3ab2f'], [258, '#4d3f70', '#d9434f']]) {
        x.fillStyle = '#15101c'; x.fillRect(bx - 16, 26, 32, 3);
        x.fillStyle = cloth;
        x.beginPath(); x.moveTo(bx - 13, 29); x.lineTo(bx + 13, 29); x.lineTo(bx + 13, 104); x.lineTo(bx, 94); x.lineTo(bx - 13, 104); x.closePath(); x.fill();
        x.fillStyle = trim;
        x.fillRect(bx - 13, 29, 26, 3);
        drawPattern(x, ['#.#.#', '#####', '#####'], bx, 56, trim, 3);
      }
      // Floor: rows of flagstones getting bigger toward the viewer
      x.fillStyle = '#15101c';
      x.fillRect(0, wallBottom, CW, 4);
      let y = wallBottom + 4, i = 0;
      while (y < CH) {
        const h = 6 + i * 3, w = 26 + i * 8;
        for (let tx = -w + ((i * w) / 2) % w; tx < CW; tx += w) {
          x.fillStyle = (Math.floor((tx + 1000) / w) + i) % 2 ? '#4a3b30' : '#3c3027';
          x.fillRect(tx, y, w, h);
          x.fillStyle = '#2b221c';
          x.fillRect(tx, y, 1, h);
        }
        x.fillStyle = '#2b221c';
        x.fillRect(0, y, CW, 1);
        y += h; i++;
      }
      bgCache = c;
    }
    ctx.drawImage(bgCache, 0, 0);
    // Torches
    for (const tx of [30, 314]) {
      ctx.fillStyle = 'rgba(255,150,60,0.07)';
      ctx.beginPath(); ctx.arc(tx, 140, 34 + Math.sin(t * 9 + tx) * 2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#5b5560'; ctx.fillRect(tx - 3, 148, 6, 14);
      ctx.fillStyle = '#3a3440'; ctx.fillRect(tx - 5, 146, 10, 3);
      const f = Math.sin(t * 17 + tx) * 2;
      ctx.fillStyle = '#e8562a'; ctx.fillRect(tx - 4, 134 + f, 8, 12 - f);
      ctx.fillStyle = '#ffb02e'; ctx.fillRect(tx - 2, 137 + f, 4, 9 - f);
      ctx.fillStyle = '#fff1a8'; ctx.fillRect(tx - 1, 141, 2, 5);
    }
  }

  class Scene {
    constructor(title, dur) {
      Object.assign(this, { arena: true, title, dur, t: 0, parts: [], fx: [], texts: [], fired: new Set(), shake: 0, dark: 0, flash: 0, actors: [] });
    }
    at(time, key, fn) { if (this.t >= time && !this.fired.has(key)) { this.fired.add(key); fn(); } }
    say(text, x, y, color = '#efe6d2', life = 1.3) { this.texts.push({ text, x, y, color, life, t: 0 }); }
    walk(actor, t0, t1, x0, x1, sound = 'step') {
      const t = this.t, k = clamp01((t - t0) / (t1 - t0));
      actor.x = x0 + (x1 - x0) * k;
      actor.oy = k > 0 && k < 1 ? -Math.abs(Math.sin((t - t0) * 9)) * 5 : 0;
      for (let i = 0; t0 + i * 0.35 < t1; i++) this.at(t0 + i * 0.35, 'step' + actor.x0key + i, () => {
        Sound.play(sound);
        if (sound === 'heavy') this.shake = 3;
      });
    }
    sparks(x, y, n, color = '#ffe680') {
      for (let i = 0; i < n; i++) this.parts.push({ kind: 'px', x, y, vx: rnd(-130, 130), vy: rnd(-170, -20), g: 420, life: rnd(0.3, 0.6), t: 0, color, size: 2 });
    }
    dust(x, y, n, color = '#8a7a6a') {
      for (let i = 0; i < n; i++) this.parts.push({ kind: 'smoke', x: x + rnd(-10, 10), y, vx: rnd(-70, 70), vy: rnd(-35, -5), g: 0, life: rnd(0.5, 0.9), t: 0, color, size: rnd(4, 8) });
    }
    smoke(x, y, n, color = '#d8cfe2') {
      for (let i = 0; i < n; i++) this.parts.push({ kind: 'smoke', x: x + rnd(-14, 14), y: y + rnd(-20, 20), vx: rnd(-90, 90), vy: rnd(-90, 10), g: 0, life: rnd(0.5, 1), t: 0, color, size: rnd(6, 13) });
    }
    hearts(x, y, n) {
      for (let i = 0; i < n; i++) this.parts.push({ kind: 'heart', x: x + rnd(-10, 10), y: y + rnd(-6, 6), vx: rnd(-35, 35), vy: rnd(-80, -30), g: -10, life: rnd(1.1, 1.7), t: 0, color: Math.random() < 0.5 ? '#ff5d8f' : '#ff9bbb' });
    }
    twinkle(x, y, n, color = '#fff3a0') {
      for (let i = 0; i < n; i++) this.parts.push({ kind: 'spark', x: x + rnd(-16, 16), y: y + rnd(-16, 16), vx: rnd(-20, 20), vy: rnd(-40, 0), g: 0, life: rnd(0.4, 0.8), t: 0, color });
    }
    explode(actor) {
      const spr = actor.sprite(), s = actor.scale;
      const data = spr.getContext('2d').getImageData(0, 0, spr.width, spr.height).data;
      for (let j = 0; j < spr.height; j++) for (let i = 0; i < spr.width; i++) {
        const k = (j * spr.width + i) * 4;
        if (data[k + 3] < 10) continue;
        const lx = (i - spr.width / 2 + 0.5) * s * (actor.flip ? -1 : 1);
        this.parts.push({
          kind: 'px', x: actor.x + actor.ox + lx, y: actor.y + actor.oy - (spr.height - j) * s,
          vx: lx * 3 + rnd(-40, 40), vy: rnd(-220, -40), g: 520, life: rnd(1.0, 1.6), t: 0,
          color: `rgb(${data[k]},${data[k + 1]},${data[k + 2]})`, size: s, floor: true,
        });
      }
      actor.hidden = true;
    }
    bolt(x1, y1) {
      const pts = [[x1 + rnd(-30, 30), 0]];
      for (let i = 1; i < 9; i++) pts.push([x1 + rnd(-14, 14), (y1 * i) / 9]);
      pts.push([x1, y1]);
      this.fx.push({ kind: 'bolt', pts, t: 0, life: 0.2 });
    }
    update(dt) {
      this.t += dt;
      this.run(this.t, dt);
      for (const p of this.parts) {
        p.t += dt; p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt;
        if (p.floor && p.y > FLOOR) { p.y = FLOOR; p.vy *= -0.3; p.vx *= 0.6; }
      }
      this.parts = this.parts.filter(p => p.t < p.life);
      for (const f of this.fx) {
        f.t += dt;
        if (f.kind === 'orb' && f.t < f.life) {
          const k = f.t / f.life;
          this.parts.push({ kind: 'px', x: f.x0 + (f.x1 - f.x0) * k, y: f.y0 + (f.y1 - f.y0) * k - Math.sin(k * Math.PI) * 30, vx: rnd(-20, 20), vy: rnd(-20, 20), g: 0, life: 0.3, t: 0, color: Math.random() < 0.5 ? '#9ff3ff' : '#ffffff', size: 2 });
        }
      }
      this.fx = this.fx.filter(f => f.t < f.life);
      for (const tx of this.texts) tx.t += dt;
      this.texts = this.texts.filter(tx => tx.t < tx.life);
      this.shake = Math.max(0, this.shake - dt * 30);
      this.flash = Math.max(0, this.flash - dt * 4);
      if (this.t >= this.dur) this.finished = true;
    }
    skip() { this.t = Math.max(this.t, this.dur - 0.3); }
    draw(ctx) {
      ctx.save();
      if (this.shake > 0) ctx.translate(Math.round(rnd(-this.shake, this.shake)), Math.round(rnd(-this.shake, this.shake)));
      drawArena(ctx, this.t);
      if (this.dark > 0) { ctx.fillStyle = `rgba(8,4,24,${this.dark})`; ctx.fillRect(-10, -10, CW + 20, CH + 20); }
      for (const a of this.actors) a.draw(ctx);
      for (const f of this.fx) {
        if (f.kind === 'slash') {
          const k = f.t / f.life;
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 6 * (1 - k) + 1;
          ctx.beginPath(); ctx.arc(f.x, f.y, 36, -2.4 + k * 0.4, -2.4 + 2.6 * Math.min(1, k * 2)); ctx.stroke();
        } else if (f.kind === 'bolt') {
          for (const [col, lw] of [['#fff1a0', 6], ['#ffffff', 2]]) {
            ctx.strokeStyle = col; ctx.lineWidth = lw;
            ctx.beginPath(); f.pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke();
          }
        } else if (f.kind === 'orb') {
          const k = f.t / f.life;
          const x = f.x0 + (f.x1 - f.x0) * k, y = f.y0 + (f.y1 - f.y0) * k - Math.sin(k * Math.PI) * 30;
          ctx.fillStyle = '#5fe0ff'; ctx.fillRect(x - 6, y - 6, 12, 12);
          ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 3, y - 3, 6, 6);
        } else if (f.kind === 'dizzy') {
          for (let i = 0; i < 3; i++) {
            const ang = f.t * 7 + i * 2.09;
            drawPattern(ctx, STAR, f.actor.x + Math.cos(ang) * 20, f.actor.headY() - 6 + Math.sin(ang) * 5, '#ffd23f');
          }
        }
      }
      for (const p of this.parts) {
        const fade = clamp01((p.life - p.t) / (p.life * 0.35));
        ctx.globalAlpha = fade;
        if (p.kind === 'px') { ctx.fillStyle = p.color; ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size); }
        else if (p.kind === 'smoke') { const s = p.size * (1 + p.t); ctx.fillStyle = p.color; ctx.fillRect(Math.round(p.x - s / 2), Math.round(p.y - s / 2), s, s); }
        else if (p.kind === 'heart') drawPattern(ctx, HEART, p.x, p.y, p.color);
        else if (p.kind === 'spark') drawPattern(ctx, SPARK, p.x, p.y, p.color);
        ctx.globalAlpha = 1;
      }
      for (const tx of this.texts) {
        const half = tx.text.length * 4 + 6;
        const x = Math.min(CW - half, Math.max(half, tx.x));
        pixText(ctx, tx.text, x, tx.y - tx.t * 6, { color: tx.color, alpha: clamp01((tx.life - tx.t) / 0.3) });
      }
      ctx.restore();
      ctx.fillStyle = '#120d1a';
      ctx.fillRect(0, 0, CW, 22);
      ctx.fillStyle = '#e3ab2f';
      ctx.fillRect(0, 22, CW, 2);
      pixText(ctx, this.title, CW / 2, 7, { color: '#e3ab2f' });
      if (!this.still && Math.floor(this.t * 2) % 2 === 0) pixText(ctx, 'TAP TO SKIP', CW / 2, CH - 14, { color: '#9a8cab' });
      if (this.flash > 0) { ctx.fillStyle = `rgba(255,255,255,${this.flash})`; ctx.fillRect(0, 0, CW, CH); }
      const fade = Math.max(clamp01(1 - this.t / 0.25), clamp01((this.t - (this.dur - 0.3)) / 0.3));
      if (fade > 0) { ctx.fillStyle = `rgba(12,8,18,${fade})`; ctx.fillRect(0, 0, CW, CH); }
    }
  }

  // ---- Fight choreography, keyed by attacker type ----
  const SCRIPTS = {
    // Pawn: three spear jabs, the defender topples backwards.
    p: { dur: 3.0, run(b, t) {
      const { a, d } = b;
      b.walk(a, 0.15, 0.95, -50, 168);
      const jabs = [1.05, 1.3, 1.55];
      a.ox = jabs.some(j => t >= j - 0.07 && t < j + 0.05) ? 16 : 0;
      jabs.forEach((j, i) => {
        b.at(j, 'jab' + i, () => { Sound.play('hit'); b.sparks(d.x - 22, d.y - 46, 8); d.variant = 'flash'; d.x += 5; });
        b.at(j + 0.08, 'jabf' + i, () => { d.variant = ''; });
      });
      if (t > 1.8) {
        b.at(1.8, 'fall', () => Sound.play('fall'));
        d.rot = (clamp01((t - 1.8) / 0.45) ** 2) * Math.PI / 2;
        b.at(2.25, 'dust', () => { Sound.play('hit'); b.dust(d.x + 40, FLOOR, 12); });
      }
      if (t > 2.4) d.alpha = 1 - clamp01((t - 2.4) / 0.4);
    } },
    // Knight: two sword slashes, then the defender slides apart.
    n: { dur: 3.2, run(b, t) {
      const { a, d } = b;
      b.walk(a, 0.15, 0.9, -50, 176);
      a.rot = (t >= 0.95 && t < 1.1) || (t >= 1.3 && t < 1.45) ? -0.22 : (t >= 1.1 && t < 1.3) || (t >= 1.45 && t < 1.65) ? 0.25 : 0;
      [1.1, 1.45].forEach((tt, i) => {
        b.at(tt, 'slash' + i, () => { Sound.play('slash'); b.fx.push({ kind: 'slash', x: d.x - 6, y: d.y - 44, t: 0, life: 0.2 }); d.variant = 'flash'; b.sparks(d.x - 10, d.y - 40, 6, '#ffffff'); });
        b.at(tt + 0.08, 'slashf' + i, () => { d.variant = ''; });
      });
      if (t > 1.75) {
        b.at(1.75, 'split', () => { Sound.play('fall'); b.sparks(d.x, d.y - 46, 10, '#ffffff'); b.say('SHING!', d.x, d.y - 110, '#ffffff', 1); });
        d.split = Math.max(0.001, clamp01((t - 1.75) / 0.6));
        b.at(2.35, 'thud', () => { Sound.play('hit'); b.dust(d.x + 34, FLOOR, 8); });
      }
      if (t > 2.5) d.alpha = 1 - clamp01((t - 2.5) / 0.4);
    } },
    // Bishop: a magic bolt turns the defender into a frog, which hops away.
    b: { dur: 3.3, run(b, t) {
      const { a, d } = b;
      b.walk(a, 0.15, 0.75, -50, 96);
      if (t > 0.85 && t < 1.25) {
        a.oy = -3;
        b.at(0.85, 'charge', () => Sound.play('magic'));
        if (Math.random() < 0.5) b.twinkle(a.x + 22, a.y - 76, 1, '#9ff3ff');
      } else if (t >= 1.25) a.oy = 0;
      b.at(1.2, 'orb', () => { Sound.play('zap'); b.fx.push({ kind: 'orb', x0: a.x + 22, y0: a.y - 76, x1: d.x, y1: d.y - 40, t: 0, life: 0.4 }); });
      b.at(1.6, 'poof', () => { Sound.play('poof'); b.smoke(d.x, d.y - 36, 22); d.skin = 'frog'; b.flash = 0.4; });
      b.at(1.85, 'croak', () => { Sound.play('croak'); b.say('RIBBIT!', d.x, d.y - 80, '#8fe07a', 1.1); });
      if (t > 2.1) {
        const k = t - 2.1;
        d.x = 250 + k * 80;
        d.oy = -Math.abs(Math.sin(k * Math.PI * 2.5)) * 18;
      }
      if (t > 2.7) d.alpha = 1 - clamp01((t - 2.7) / 0.4);
    } },
    // Rook: lumbers over, leaps, and flattens the defender.
    r: { dur: 3.2, run(b, t) {
      const { a, d } = b;
      b.walk(a, 0.15, 0.9, -50, 118, 'heavy');
      a.sy = t > 1.0 && t < 1.15 ? 0.85 : 1;
      if (t >= 1.15 && t < 1.6) {
        const k = (t - 1.15) / 0.45;
        a.x = 118 + (d.x - 118) * k;
        a.oy = -Math.sin(k * Math.PI) * 110;
      }
      b.at(1.6, 'land', () => {
        a.x = d.x; a.oy = 0;
        Sound.play('stomp'); b.shake = 10; d.sy = 0.12;
        b.dust(d.x - 30, FLOOR, 10); b.dust(d.x + 30, FLOOR, 10);
        b.say('SQUASH!', d.x, 60, '#ffd23f', 1.2);
      });
      if (t >= 1.6 && t < 2.0) a.sy = 1 - 0.1 * Math.sin(((t - 1.6) / 0.4) * Math.PI);
      if (t >= 2.0 && t < 2.4) {
        const k = (t - 2.0) / 0.4;
        a.x = d.x + (172 - d.x) * k;
        a.oy = -Math.sin(k * Math.PI) * 40;
        a.sy = 1;
      }
      if (t >= 2.4) { a.x = 172; a.oy = 0; }
      if (t > 2.5) d.alpha = 1 - clamp01((t - 2.5) / 0.5);
    } },
    // Queen: darkens the sky and calls down lightning; the defender crumbles.
    q: { dur: 3.3, run(b, t) {
      const { a, d } = b;
      b.walk(a, 0.15, 0.75, -50, 92);
      a.oy = t > 0.85 && t < 1.8 ? -3 : a.oy;
      b.dark = t < 0.85 ? 0 : t < 2.3 ? 0.55 * clamp01((t - 0.85) / 0.25) : 0.55 * (1 - clamp01((t - 2.3) / 0.4));
      b.at(0.85, 'raise', () => { Sound.play('magic'); b.twinkle(a.x + 24, a.y - 80, 6); });
      [1.15, 1.4, 1.65].forEach((tt, i) => {
        b.at(tt, 'bolt' + i, () => { Sound.play('thunder'); b.bolt(d.x + rnd(-6, 6), d.y - 40); b.flash = 0.6; b.shake = 5; d.variant = 'flash'; b.sparks(d.x, d.y - 40, 10, '#fff1a0'); });
        b.at(tt + 0.07, 'boltf' + i, () => { d.variant = i === 2 ? 'char' : ''; });
      });
      if (t > 1.75 && t < 2.15 && Math.random() < 0.4) b.dust(d.x, d.y - 60, 1, '#4a4450');
      b.at(2.15, 'crumble', () => { Sound.play('poof'); b.explode(d); });
    } },
    // King: a royal bonk on the head, the defender sees stars and vanishes.
    k: { dur: 3.0, run(b, t) {
      const { a, d } = b;
      b.walk(a, 0.15, 1.0, -50, 172);
      a.rot = t >= 1.1 && t < 1.3 ? -0.35 : t >= 1.3 && t < 1.45 ? 0.25 : 0;
      b.at(1.3, 'bonk', () => { Sound.play('bonk'); b.say('BONK!', d.x, d.y - 120, '#ffd23f', 1); d.variant = 'flash'; b.fx.push({ kind: 'dizzy', actor: d, t: 0, life: 0.9 }); });
      b.at(1.38, 'bonkf', () => { d.variant = ''; });
      if (t > 1.45 && t < 2.2) d.rot = Math.sin((t - 1.45) * 10) * 0.15;
      b.at(2.2, 'poof', () => { Sound.play('poof'); b.smoke(d.x, d.y - 40, 26); d.hidden = true; });
    } },
    // King takes Queen: a kiss first, then duty.
    kq: { dur: 4.8, run(b, t) {
      const { a, d } = b;
      b.walk(a, 0.15, 1.0, -50, 182);
      b.at(1.15, 'darling', () => { Sound.play('love'); b.say('My darling...', a.x, a.headY() - 22, '#ff9bbb', 1.3); });
      const kiss = t >= 1.5 && t < 1.8;
      a.ox = kiss ? 10 : 0;
      a.rot = kiss ? 0.15 : t >= 3.2 && t < 3.4 ? -0.35 : t >= 3.4 && t < 3.55 ? 0.25 : 0;
      b.at(1.6, 'kiss', () => { Sound.play('kiss'); b.hearts((a.x + d.x) / 2, a.y - 70, 10); });
      b.at(1.95, 'blush', () => { b.hearts(d.x, d.headY(), 4); b.say('Oh, my king!', d.x, d.headY() - 22, '#ff9bbb', 1.2); });
      if (t > 2.0 && t < 2.6) d.oy = -Math.abs(Math.sin((t - 2.0) * 12)) * 4;
      b.at(2.75, 'duty', () => b.say('...but this is war.', a.x, a.headY() - 22, '#efe6d2', 1.3));
      b.at(3.4, 'bonk', () => { Sound.play('bonk'); d.variant = 'flash'; b.fx.push({ kind: 'dizzy', actor: d, t: 0, life: 0.7 }); });
      b.at(3.48, 'bonkf', () => { d.variant = ''; });
      if (t > 3.6) {
        b.at(3.6, 'faint', () => Sound.play('fall'));
        d.rot = (clamp01((t - 3.6) / 0.4) ** 2) * Math.PI / 2;
      }
      b.at(4.1, 'poof', () => { Sound.play('poof'); b.smoke(d.x + 30, FLOOR - 16, 18); b.hearts(d.x + 30, FLOOR - 30, 6); d.hidden = true; });
    } },
  };

  // ---- Special matchups, keyed attacker + defender ----
  Object.assign(SCRIPTS, {
    // Pawn takes Queen: she laughs, then gets toppled by the little guy.
    pq: { dur: 3.7, run(b, t) {
      const { a, d } = b;
      b.walk(a, 0.15, 0.95, -50, 168);
      b.at(1.0, 'laugh', () => { Sound.play('magic'); b.say('A mere pawn?', d.x, d.headY() - 22, '#efe6d2', 1.1); });
      if (t > 1.0 && t < 1.6) d.oy = -Math.abs(Math.sin((t - 1.0) * 16)) * 3;
      const jabs = [1.75, 2.05];
      a.ox = jabs.some(j => t >= j - 0.07 && t < j + 0.05) ? 16 : 0;
      jabs.forEach((j, i) => {
        b.at(j, 'jab' + i, () => { Sound.play('hit'); b.sparks(d.x - 22, d.y - 46, 8); d.variant = 'flash'; });
        b.at(j + 0.08, 'jabf' + i, () => { d.variant = ''; });
      });
      b.at(1.8, 'ow', () => b.say('OW!', d.x + 20, d.headY() - 16, '#ff5a5f', 0.6));
      if (t > 2.2) {
        b.at(2.2, 'fall', () => Sound.play('fall'));
        d.rot = (clamp01((t - 2.2) / 0.45) ** 2) * Math.PI / 2;
        b.at(2.65, 'dust', () => { Sound.play('stomp'); b.shake = 6; b.dust(d.x + 40, FLOOR, 14); });
      }
      b.at(2.8, 'cheer', () => { Sound.play('fanfare'); b.say('Long live the pawn!', a.x, a.headY() - 22, '#ffd23f', 1.2); });
      if (t > 2.8 && t < 3.5) a.oy = -Math.abs(Math.sin((t - 2.8) * 9)) * 10;
      if (t > 3.0) d.alpha = 1 - clamp01((t - 3.0) / 0.4);
    } },
    // Knight vs Knight: a sword duel with three clashes before the final cut.
    nn: { dur: 3.6, run(b, t) {
      const { a, d } = b;
      b.walk(a, 0.15, 0.8, -50, 146);
      if (t < 2.0) b.walk(d, 0.15, 0.8, 250, 204);
      const clashes = [1.0, 1.3, 1.6];
      const swing = clashes.find(c => t >= c - 0.1 && t < c + 0.08);
      a.rot = swing !== undefined ? (t < swing ? -0.25 : 0.25) : 0;
      d.rot = swing !== undefined ? (t < swing ? 0.25 : -0.25) : 0;
      clashes.forEach((c, i) => b.at(c, 'clash' + i, () => { Sound.play('slash'); Sound.play('select'); b.sparks(175, FLOOR - 52, 12, '#ffffff'); b.shake = 2; }));
      b.at(1.95, 'final', () => { Sound.play('slash'); b.fx.push({ kind: 'slash', x: d.x - 6, y: d.y - 44, t: 0, life: 0.2 }); d.variant = 'flash'; b.say('TOUCHE!', d.x, d.y - 110, '#ffffff', 1); });
      b.at(2.03, 'finalf', () => { d.variant = ''; d.rot = 0; });
      if (t > 2.1) {
        d.rot = 0;
        d.split = Math.max(0.001, clamp01((t - 2.1) / 0.6));
        b.at(2.7, 'thud', () => { Sound.play('hit'); b.dust(d.x + 34, FLOOR, 8); });
      }
      if (t > 2.9) d.alpha = 1 - clamp01((t - 2.9) / 0.4);
    } },
    // Bishop vs Bishop: spells collide mid-air, then the second spell lands.
    bb: { dur: 3.8, run(b, t) {
      const { a, d } = b;
      b.walk(a, 0.15, 0.75, -50, 96);
      if (t > 0.85 && t < 1.2) { a.oy = -3; d.oy = -3; }
      b.at(0.85, 'charge', () => { Sound.play('magic'); b.twinkle(a.x + 22, a.y - 76, 4, '#9ff3ff'); b.twinkle(d.x - 22, d.y - 76, 4, '#ffb0f0'); });
      b.at(1.1, 'orbs', () => {
        Sound.play('zap');
        b.fx.push({ kind: 'orb', x0: a.x + 22, y0: a.y - 76, x1: 172, y1: FLOOR - 70, t: 0, life: 0.35 });
        b.fx.push({ kind: 'orb', x0: d.x - 22, y0: d.y - 76, x1: 172, y1: FLOOR - 70, t: 0, life: 0.35 });
      });
      b.at(1.45, 'boom', () => { Sound.play('poof'); b.flash = 0.6; b.shake = 4; b.twinkle(172, FLOOR - 70, 12); b.sparks(172, FLOOR - 70, 14, '#9ff3ff'); });
      b.at(1.75, 'again', () => { Sound.play('zap'); b.fx.push({ kind: 'orb', x0: a.x + 22, y0: a.y - 76, x1: d.x, y1: d.y - 40, t: 0, life: 0.4 }); });
      b.at(2.15, 'poof', () => { Sound.play('poof'); b.smoke(d.x, d.y - 36, 22); d.skin = 'frog'; d.oy = 0; });
      b.at(2.4, 'croak', () => { Sound.play('croak'); b.say('RIBBIT!', d.x, d.y - 80, '#8fe07a', 1.1); });
      if (t > 2.6) { const k = t - 2.6; d.x = 250 + k * 80; d.oy = -Math.abs(Math.sin(k * Math.PI * 2.5)) * 18; }
      if (t > 3.2) d.alpha = 1 - clamp01((t - 3.2) / 0.4);
    } },
    // Rook vs Rook: two towers headbutt until one cracks apart.
    rr: { dur: 3.4, run(b, t) {
      const { a, d } = b;
      b.walk(a, 0.15, 0.9, -50, 150, 'heavy');
      const butt = (t0, key) => {
        if (t >= t0 && t < t0 + 0.2) a.x = 150 - 30 * ((t - t0) / 0.2);
        else if (t >= t0 + 0.2 && t < t0 + 0.32) a.x = 120 + (d.x - 56 - 120) * ((t - t0 - 0.2) / 0.12);
        else if (t >= t0 + 0.32 && t < t0 + 0.5) a.x = d.x - 56;
        b.at(t0 + 0.32, key, () => { Sound.play('stomp'); b.shake = 8; b.sparks(d.x - 30, d.y - 50, 12, '#c6bfae'); d.variant = 'flash'; d.x += 8; b.say('CLONK!', d.x, 60, '#ffd23f', 0.8); });
        b.at(t0 + 0.4, key + 'f', () => { d.variant = ''; });
      };
      butt(1.0, 'b1');
      butt(1.55, 'b2');
      b.at(2.15, 'crumble', () => { Sound.play('stomp'); b.shake = 10; b.explode(d); });
    } },
    // Queen vs Queen: the defender's lightning misses, the attacker's does not.
    qq: { dur: 3.6, run(b, t) {
      const { a, d } = b;
      b.walk(a, 0.15, 0.75, -50, 92);
      b.dark = t < 0.85 ? 0 : t < 2.6 ? 0.55 * clamp01((t - 0.85) / 0.25) : 0.55 * (1 - clamp01((t - 2.6) / 0.4));
      b.at(0.9, 'dare', () => { Sound.play('magic'); b.say('How dare you!', d.x, d.headY() - 22, '#ffb0c8', 1.1); });
      b.at(1.3, 'miss', () => { Sound.play('thunder'); b.bolt(140, FLOOR); b.flash = 0.5; b.dust(140, FLOOR, 10); b.say('MISSED!', 140, FLOOR - 120, '#efe6d2', 0.8); });
      [1.75, 1.95].forEach((tt, i) => {
        b.at(tt, 'bolt' + i, () => { Sound.play('thunder'); b.bolt(d.x + rnd(-6, 6), d.y - 40); b.flash = 0.6; b.shake = 5; d.variant = 'flash'; });
        b.at(tt + 0.07, 'boltf' + i, () => { d.variant = i === 1 ? 'char' : ''; });
      });
      b.at(2.4, 'crumble', () => { Sound.play('poof'); b.explode(d); });
    } },
  });

  class Fight extends Scene {
    constructor(att, attColor, def, defColor) {
      super(`${SIDES[attColor]} ${NAMES[att]} takes ${NAMES[def]}`.toUpperCase(), 0);
      this.a = new Actor(att, attColor, -50, false);
      this.d = new Actor(def, defColor, 250, true);
      this.a.x0key = 'a';
      this.d.x0key = 'd';
      this.actors = [this.d, this.a];
      this.script = SCRIPTS[att + def] || SCRIPTS[att];
      this.dur = this.script.dur;
    }
    run(t) {
      if (!this.d.rot && !this.d.split && this.d.sy === 1 && !this.d.skin && t < 0.85) this.d.oy = Math.round(Math.sin(t * 5));
      this.script.run(this, t);
    }
  }

  const DUBBING = { n: 'Arise, Sir Knight!', q: 'Rise, my Queen!', r: 'Rise, Tower Guard!', b: 'Rise, Your Grace!' };

  // A pawn reaching the far side is knighted (or crowned) by its own king.
  class Ceremony extends Scene {
    constructor(color, promo) {
      super(`${SIDES[color]} pawn is promoted`.toUpperCase(), 3.9);
      this.promo = promo;
      this.a = new Actor('k', color, -50, false);
      this.d = new Actor('p', color, 236, true);
      this.a.x0key = 'k';
      this.actors = [this.d, this.a];
    }
    run(t) {
      const { a, d } = this;
      this.walk(a, 0.15, 1.0, -50, 160);
      this.at(1.1, 'kneel', () => { this.say('Kneel, brave pawn.', a.x, a.headY() - 22, '#efe6d2', 1.2); });
      if (t > 1.3 && t < 2.5) d.sy = 0.85;
      a.rot = (t >= 1.55 && t < 1.7) || (t >= 1.9 && t < 2.05) ? 0.3 : 0;
      [1.6, 1.95].forEach((tt, i) => this.at(tt, 'tap' + i, () => { Sound.play('select'); this.twinkle(d.x, d.headY(), 4); }));
      this.at(2.4, 'dub', () => {
        Sound.play('fanfare');
        this.flash = 0.8;
        d.type = this.promo; d.sy = 1;
        this.twinkle(d.x, d.y - 40, 14);
        this.sparks(d.x, d.y - 40, 16);
        this.say(DUBBING[this.promo], CW / 2, 50, '#ffd23f', 1.5);
      });
      if (t > 2.6 && t < 3.4) d.oy = -Math.abs(Math.sin((t - 2.6) * 8)) * 8;
    }
  }

  return { Fight, Ceremony };
})();
