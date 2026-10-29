'use strict';
// Board, input, turn flow, menus and the move log.
const APP = { name: 'Checkmate & Chivalry', version: '0.2.0' };
const BX = 12, BY = 24, SQ = 40, PS = 2;
const SIDE = { w: 'White', b: 'Black' };
const LEVELS = [
  { name: 'Squire', depth: 1, noise: 110 },
  { name: 'Knight', depth: 2, noise: 20 },
  { name: 'King', depth: 3, noise: 0 },
];

const $ = id => document.getElementById(id);
const canvas = $('screen');
const ctx = canvas.getContext('2d');
canvas.width = CW;
canvas.height = CH;

const G = {
  state: Chess.initial(), keys: [], history: [], log: [], lastMove: null, captured: { w: [], b: [] },
  mode: 'pvp', human: 'w', level: 1, battles: true, busy: false, thinking: false, over: null,
  selected: -1, targets: [], scene: null, hidden: new Set(), floating: [], toast: null, gen: 0,
};

const prefs = (() => {
  try { return JSON.parse(localStorage.getItem('pwc-prefs') || '{}'); } catch (e) { return {}; }
})();
// The game in progress is saved after every move so closing the app never loses it.
function saveGame() {
  try {
    if (G.over) localStorage.removeItem('pwc-game');
    else localStorage.setItem('pwc-game', JSON.stringify({ snap: snapshot(), mode: G.mode, human: G.human, level: G.level, history: G.history.slice(-60) }));
  } catch (e) { /* storage unavailable */ }
}
function loadGame() {
  try { return JSON.parse(localStorage.getItem('pwc-game') || 'null'); } catch (e) { return null; }
}

function savePrefs() {
  try { localStorage.setItem('pwc-prefs', JSON.stringify({ battles: G.battles, sound: Sound.enabled })); } catch (e) { /* storage unavailable */ }
}
if (prefs.battles === false) G.battles = false;
if (prefs.sound === false) Sound.enabled = false;

// ---------- Geometry ----------
const flipped = () => G.mode === 'cpu' && G.human === 'b';
function sqRect(sq) {
  let r = sq >> 3, c = sq & 7;
  if (flipped()) { r = 7 - r; c = 7 - c; }
  return { x: BX + c * SQ, y: BY + r * SQ };
}
function sqFeet(sq) { const { x, y } = sqRect(sq); return { x: x + SQ / 2, y: y + SQ - 5 }; }
function pointToSq(px, py) {
  let c = Math.floor((px - BX) / SQ), r = Math.floor((py - BY) / SQ);
  if (c < 0 || c > 7 || r < 0 || r > 7) return -1;
  if (flipped()) { r = 7 - r; c = 7 - c; }
  return r * 8 + c;
}

// ---------- Drawing ----------
let boardCache = null, boardCacheKey = null;
function boardBG() {
  const key = flipped() + '|' + fontReady;
  if (boardCache && boardCacheKey === key) return boardCache;
  const c = document.createElement('canvas');
  c.width = CW; c.height = CH;
  const x = c.getContext('2d');
  x.fillStyle = '#120d1a'; x.fillRect(0, 0, CW, CH);
  x.fillStyle = '#2b1e16'; x.fillRect(BX - 7, BY - 7, SQ * 8 + 14, SQ * 8 + 14);
  x.fillStyle = '#5a4130'; x.fillRect(BX - 4, BY - 4, SQ * 8 + 8, SQ * 8 + 8);
  x.fillStyle = '#e3ab2f'; x.fillRect(BX - 2, BY - 2, SQ * 8 + 4, SQ * 8 + 4);
  for (let sq = 0; sq < 64; sq++) {
    const { x: sx, y: sy } = sqRect(sq);
    const light = ((sq >> 3) + (sq & 7)) % 2 === 0;
    x.fillStyle = light ? '#cdb88f' : '#77553c';
    x.fillRect(sx, sy, SQ, SQ);
    let seed = sq * 7919 + 13;
    x.fillStyle = light ? '#bda67c' : '#684a34';
    for (let k = 0; k < 6; k++) {
      seed = (seed * 9301 + 49297) % 233280;
      x.fillRect(sx + (seed % 19) * 2, sy + ((seed >> 5) % 19) * 2, 2, 2);
    }
    x.fillStyle = light ? '#dccaa2' : '#86634a';
    x.fillRect(sx, sy, SQ, 1);
    x.fillRect(sx, sy, 1, SQ);
  }
  // Coordinates inside the edge squares
  x.font = `8px ${PIXEL_FONT}`;
  x.textBaseline = 'top';
  x.fillStyle = 'rgba(29,20,40,0.55)';
  for (let i = 0; i < 8; i++) {
    const f = sqRect(flipped() ? 7 - i : 56 + i);
    x.fillText('abcdefgh'[flipped() ? 7 - i : i], f.x + SQ - 9, f.y + SQ - 9);
    const r = sqRect(flipped() ? 63 - i * 8 : i * 8);
    x.fillText(String(flipped() ? i + 1 : 8 - i), r.x + 2, r.y + 2);
  }
  boardCache = c; boardCacheKey = key;
  return c;
}

function drawPiece(p, x, y, oy = 0) {
  const spr = getSprite(p.toLowerCase(), Chess.color(p));
  const w = spr.width * PS, h = spr.height * PS;
  ctx.fillStyle = 'rgba(20,10,20,0.3)';
  ctx.fillRect(Math.round(x - 12), Math.round(y - 2), 24, 4);
  ctx.drawImage(spr, Math.round(x - w / 2), Math.round(y + oy - h), w, h);
}

function drawBoard(now) {
  ctx.drawImage(boardBG(), 0, 0);
  const s = G.state;
  const fill = (sq, color) => { const { x, y } = sqRect(sq); ctx.fillStyle = color; ctx.fillRect(x, y, SQ, SQ); };
  if (G.lastMove) { fill(G.lastMove.from, 'rgba(255,210,63,0.25)'); fill(G.lastMove.to, 'rgba(255,210,63,0.38)'); }
  if (!G.floating.length && Chess.inCheck(s, s.turn)) fill(Chess.kingSq(s, s.turn), `rgba(220,40,50,${0.35 + 0.2 * Math.sin(now / 150)})`);
  if (G.selected >= 0) fill(G.selected, 'rgba(110,190,255,0.45)');
  for (const m of G.targets) {
    const { x, y } = sqRect(m.to);
    if (m.captured) {
      ctx.fillStyle = 'rgba(201,53,63,0.85)';
      for (const [cx, cy] of [[0, 0], [SQ - 8, 0], [0, SQ - 8], [SQ - 8, SQ - 8]]) {
        ctx.fillRect(x + cx, y + cy + (cy ? 6 : 0), 8, 2);
        ctx.fillRect(x + cx + (cx ? 6 : 0), y + cy, 2, 8);
      }
    } else {
      ctx.fillStyle = 'rgba(29,20,40,0.45)';
      ctx.fillRect(x + 16, y + 16, 8, 8);
    }
  }
  const items = [];
  for (let sq = 0; sq < 64; sq++) {
    const p = s.board[sq];
    if (!p || G.hidden.has(sq)) continue;
    const { x, y } = sqFeet(sq);
    items.push({ p, x, y, oy: sq === G.selected ? -Math.round(Math.abs(Math.sin(now / 160)) * 3) : 0 });
  }
  for (const f of G.floating) items.push({ p: f.piece, x: f.x, y: f.y, oy: f.oy });
  items.sort((a, b) => a.y - b.y);
  for (const it of items) drawPiece(it.p, it.x, it.y, it.oy);
  if (G.toast) {
    const age = (now - G.toast.at) / 1000;
    if (age > 1.3) G.toast = null;
    else pixText(ctx, G.toast.text, CW / 2, BY + SQ * 4 - 8 - age * 10, { size: 16, color: '#ff5a5f', alpha: Math.min(1, (1.3 - age) / 0.3) });
  }
}

// ---------- Scenes and the frame loop ----------
function play(scene) { return new Promise(resolve => { scene.resolve = resolve; G.scene = scene; }); }

function walkScene(fl, from, to, f0 = 0, f1 = 1) {
  const a = sqFeet(from), b = sqFeet(to);
  const squares = Math.hypot(b.x - a.x, b.y - a.y) / SQ * (f1 - f0);
  const dur = Math.max(0.22, squares * 0.17);
  const hop = fl.piece.toLowerCase() === 'n';
  let steps = 0;
  return {
    t: 0,
    update(dt) {
      this.t += dt;
      const k = Math.min(1, this.t / dur), f = f0 + (f1 - f0) * k;
      fl.x = a.x + (b.x - a.x) * f;
      fl.y = a.y + (b.y - a.y) * f;
      fl.oy = hop ? -Math.sin(k * Math.PI) * 26 : -Math.abs(Math.sin(this.t * 14)) * 3;
      const n = Math.floor(this.t / 0.22);
      if (!hop && n > steps && k < 1) { steps = n; Sound.play('step'); }
      if (k >= 1) { fl.oy = 0; this.finished = true; }
    },
  };
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (G.scene) {
    G.scene.update(dt);
    if (G.scene.finished) { const sc = G.scene; G.scene = null; sc.resolve(); }
  }
  ctx.imageSmoothingEnabled = false;
  if (G.scene && G.scene.arena) G.scene.draw(ctx);
  else drawBoard(now);
  requestAnimationFrame(frame);
}

// ---------- Turn flow ----------
const isHumanTurn = () => G.mode === 'pvp' || G.state.turn === G.human;

function snapshot() {
  return { state: Chess.clone(G.state), keys: G.keys.slice(), log: G.log.slice(), lastMove: G.lastMove, captured: { w: G.captured.w.slice(), b: G.captured.b.slice() } };
}
function restore(snap) {
  G.state = Chess.clone(snap.state); G.keys = snap.keys.slice(); G.log = snap.log.slice();
  G.lastMove = snap.lastMove; G.captured = { w: snap.captured.w.slice(), b: snap.captured.b.slice() };
}

async function doMove(m) {
  const gen = G.gen;
  G.busy = true; G.selected = -1; G.targets = [];
  updateHUD();
  const s = G.state, mover = s.turn;
  const san = Chess.san(s, m);
  G.history.push(snapshot());
  const fl = { piece: m.piece, x: 0, y: 0, oy: 0 };
  G.hidden = new Set([m.from]);
  G.floating = [fl];
  const capSq = m.flag === 'ep' ? m.to + (mover === 'w' ? 8 : -8) : m.to;

  if (m.captured && G.battles) {
    await play(walkScene(fl, m.from, m.to, 0, 0.55));
    await play(new Battle.Fight(Chess.type(m.piece), mover, Chess.type(m.captured), Chess.color(m.captured)));
    G.hidden.add(capSq);
    await play(walkScene(fl, m.from, m.to, 0.55, 1));
  } else {
    await play(walkScene(fl, m.from, m.to));
    if (m.captured) { G.hidden.add(capSq); Sound.play('hit'); }
  }
  if (m.flag === 'cK' || m.flag === 'cQ') {
    const rf = m.flag === 'cK' ? m.from + 3 : m.from - 4, rt = m.flag === 'cK' ? m.from + 1 : m.from - 1;
    const rook = { piece: s.board[rf], x: 0, y: 0, oy: 0 };
    G.hidden.add(rf);
    G.floating.push(rook);
    await play(walkScene(rook, rf, rt));
  }
  if (m.promo && G.battles) await play(new Battle.Ceremony(mover, m.promo));
  if (gen !== G.gen) return;

  Chess.makeMove(s, m);
  G.keys.push(Chess.key(s));
  G.log.push(san);
  G.lastMove = m;
  if (m.captured) G.captured[mover].push(m.captured);
  G.hidden = new Set();
  G.floating = [];
  Sound.play('place');
  afterMove();
}

function afterMove() {
  G.busy = false;
  const st = Chess.status(G.state, G.keys);
  G.over = st;
  saveGame();
  if (st) {
    updateHUD();
    showGameOver();
    return;
  }
  if (Chess.inCheck(G.state, G.state.turn)) {
    Sound.play('check');
    G.toast = { text: 'CHECK!', at: performance.now() };
  }
  updateHUD();
  maybeComputer();
}

function maybeComputer() {
  if (G.over || G.mode !== 'cpu' || G.state.turn === G.human || G.busy) return;
  const gen = G.gen;
  G.busy = true; G.thinking = true;
  updateHUD();
  setTimeout(() => {
    if (gen !== G.gen) return;
    const lv = LEVELS[G.level];
    const m = AI.choose(G.state, lv.depth, lv.noise);
    G.thinking = false; G.busy = false;
    if (m) doMove(m);
  }, 450);
}

function onBoardTap(sq) {
  if (G.busy || G.over || !isHumanTurn() || sq < 0) return;
  const s = G.state, p = s.board[sq];
  if (G.selected >= 0) {
    const options = G.targets.filter(m => m.to === sq);
    if (options.length > 1) {
      choosePromotion(s.turn).then(promo => { if (promo) doMove(options.find(m => m.promo === promo)); });
      return;
    }
    if (options.length) { doMove(options[0]); return; }
  }
  if (p && Chess.color(p) === s.turn && sq !== G.selected) {
    G.selected = sq;
    G.targets = Chess.legalMoves(s).filter(m => m.from === sq);
    Sound.play('select');
  } else {
    G.selected = -1; G.targets = [];
  }
}

canvas.addEventListener('pointerdown', e => {
  Sound.unlock();
  if (G.scene && G.scene.arena) { G.scene.skip(); return; }
  const r = canvas.getBoundingClientRect();
  onBoardTap(pointToSq((e.clientX - r.left) * CW / r.width, (e.clientY - r.top) * CH / r.height));
});

// ---------- Promotion picker ----------
function choosePromotion(color) {
  return new Promise(resolve => {
    const box = $('promo'), row = $('promoChoices');
    row.innerHTML = '';
    for (const t of 'qnrb') {
      const btn = document.createElement('button');
      btn.className = 'promo-btn';
      btn.innerHTML = `<img src="${spriteURL(t, color)}" alt=""><span>${{ q: 'Queen', n: 'Knight', r: 'Rook', b: 'Bishop' }[t]}</span>`;
      btn.onclick = () => { box.hidden = true; resolve(t); };
      row.appendChild(btn);
    }
    $('promoCancel').onclick = () => { box.hidden = true; resolve(null); };
    box.hidden = false;
    row.firstChild.focus();
  });
}

// ---------- HUD ----------
function statusText() {
  const s = G.state;
  if (G.over) return overText().title;
  if (G.thinking) return 'The computer is plotting...';
  let txt = G.mode === 'cpu' ? (s.turn === G.human ? 'Your move' : "Computer's move") : `${SIDE[s.turn]} to move`;
  if (Chess.inCheck(s, s.turn)) txt += ' - check!';
  return txt;
}

function updateHUD() {
  $('status').textContent = statusText();
  $('turnPip').dataset.side = G.state.turn;
  $('undo').disabled = G.busy || !G.history.length;
  $('newGame').disabled = G.busy;
  $('battles').setAttribute('aria-pressed', String(G.battles));
  $('battles').textContent = G.battles ? 'Battles on' : 'Battles off';
  $('sound').setAttribute('aria-pressed', String(Sound.enabled));
  $('sound').textContent = Sound.enabled ? 'Sound on' : 'Sound off';
  const labels = G.mode === 'cpu'
    ? { [G.human]: 'Your spoils', [G.human === 'w' ? 'b' : 'w']: "Computer's spoils" }
    : { w: "White's spoils", b: "Black's spoils" };
  for (const side of ['w', 'b']) {
    $('capLabel' + side).textContent = labels[side];
    $('cap' + side).innerHTML = G.captured[side].length
      ? G.captured[side].map(p => `<img src="${spriteURL(p.toLowerCase(), Chess.color(p))}" alt="${p}">`).join('')
      : '<span class="empty">Nothing yet</span>';
  }
  const ol = $('moves');
  ol.innerHTML = '';
  for (let i = 0; i < G.log.length; i += 2) {
    const li = document.createElement('li');
    li.innerHTML = `<span class="w">${G.log[i]}</span><span class="b">${G.log[i + 1] || ''}</span>`;
    ol.appendChild(li);
  }
  if (!G.log.length) ol.innerHTML = '<li class="empty">No moves yet. White goes first.</li>';
  ol.scrollTop = ol.scrollHeight;
}

function overText() {
  const winner = G.state.turn === 'w' ? 'b' : 'w';
  switch (G.over) {
    case 'checkmate':
      return { title: 'Checkmate!', sub: G.mode === 'cpu' ? (winner === G.human ? 'You win. The realm is yours.' : 'The computer wins this time.') : `${SIDE[winner]} wins the war.` };
    case 'stalemate': return { title: 'Stalemate', sub: 'No legal moves left. The battle ends in a draw.' };
    case 'fifty': return { title: 'Draw', sub: 'Fifty moves passed without a capture or pawn move.' };
    case 'insufficient': return { title: 'Draw', sub: 'Too few pieces remain to force checkmate.' };
    case 'repetition': return { title: 'Draw', sub: 'The same position came up three times.' };
    default: return { title: '', sub: '' };
  }
}

function showGameOver() {
  const { title, sub } = overText();
  $('overTitle').textContent = title;
  $('overSub').textContent = sub;
  $('over').hidden = false;
  const humanLost = G.over === 'checkmate' && G.mode === 'cpu' && G.state.turn === G.human;
  Sound.play(G.over === 'checkmate' && !humanLost ? 'fanfare' : 'sad');
}

// ---------- Menu ----------
const menuChoice = { mode: 'pvp', side: 'w', level: 1 };
function syncMenu() {
  document.querySelectorAll('#menu [data-mode]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.mode === menuChoice.mode)));
  document.querySelectorAll('#menu [data-side]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.side === menuChoice.side)));
  document.querySelectorAll('#menu [data-level]').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.level === menuChoice.level)));
  $('cpuOpts').hidden = menuChoice.mode !== 'cpu';
}
document.querySelectorAll('#menu [data-mode]').forEach(b => b.onclick = () => { menuChoice.mode = b.dataset.mode; syncMenu(); });
document.querySelectorAll('#menu [data-side]').forEach(b => b.onclick = () => { menuChoice.side = b.dataset.side; syncMenu(); });
document.querySelectorAll('#menu [data-level]').forEach(b => b.onclick = () => { menuChoice.level = +b.dataset.level; syncMenu(); });

function newGame() {
  G.gen++;
  Object.assign(G, {
    state: Chess.initial(), keys: [], history: [], log: [], lastMove: null, captured: { w: [], b: [] },
    mode: menuChoice.mode, human: menuChoice.side, level: menuChoice.level,
    busy: false, thinking: false, over: null, selected: -1, targets: [], scene: null, hidden: new Set(), floating: [], toast: null,
  });
  G.keys.push(Chess.key(G.state));
  $('menu').hidden = true;
  $('over').hidden = true;
  saveGame();
  updateHUD();
  maybeComputer();
}

$('start').onclick = () => { Sound.unlock(); Sound.play('fanfare'); newGame(); };
$('newGame').onclick = () => { $('over').hidden = true; menuChoice.mode = G.mode; menuChoice.side = G.human; menuChoice.level = G.level; syncMenu(); $('menu').hidden = false; };
$('menuClose').onclick = () => { $('menu').hidden = true; };
$('overAgain').onclick = () => $('newGame').onclick();
$('overLook').onclick = () => { $('over').hidden = true; };
$('undo').onclick = () => {
  if (G.busy || !G.history.length) return;
  let snap = G.history.pop();
  if (G.mode === 'cpu') while (snap.state.turn !== G.human && G.history.length) snap = G.history.pop();
  restore(snap);
  G.over = null; G.selected = -1; G.targets = [];
  $('over').hidden = true;
  saveGame();
  updateHUD();
  maybeComputer();
};
$('aboutBtn').onclick = () => { $('aboutVersion').textContent = `Version ${APP.version}`; $('about').hidden = false; $('aboutClose').focus(); };
$('aboutClose').onclick = () => { $('about').hidden = true; };
$('battles').onclick = () => { G.battles = !G.battles; savePrefs(); updateHUD(); };
$('sound').onclick = () => { Sound.enabled = !Sound.enabled; Sound.unlock(); savePrefs(); updateHUD(); };

// ---------- Boot ----------
let fontReady = false;
if (document.fonts) {
  Promise.allSettled([document.fonts.load('8px "Press Start 2P Local"'), document.fonts.load('8px "Press Start 2P"')]).then(() => { fontReady = true; });
}

function start(data) {
  if (!data || !data.snap) {
    const saved = loadGame();
    if (saved && saved.snap && saved.snap.log.length) data = saved;
  }
  if (data && data.snap) {
    restore(data.snap);
    Object.assign(G, { mode: data.mode, human: data.human, level: data.level, history: data.history || [] });
    $('menu').hidden = true;
  } else {
    G.keys.push(Chess.key(G.state));
  }
  syncMenu();
  updateHUD();
  requestAnimationFrame(frame);
  maybeComputer();
}

window.claude?.hot?.snapshot?.(() => ({ snap: snapshot(), mode: G.mode, human: G.human, level: G.level, history: G.history }));
if (window.claude?.hot?.ready) window.claude.hot.ready(start);
else start(window.claude?.hot?.data ?? {});
