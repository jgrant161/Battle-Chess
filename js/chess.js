'use strict';
// Chess rules. Board is 64 squares, index = row * 8 + col, row 0 is rank 8.
// Pieces are FEN letters: uppercase white, lowercase black, '' empty.
const Chess = (() => {
  const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  const KNIGHT = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
  const KING = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
  const DIAG = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
  const ORTH = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  const ROOK_HOME = { 63: 'K', 56: 'Q', 7: 'k', 0: 'q' };

  const color = p => (p ? (p < 'a' ? 'w' : 'b') : null);
  const type = p => p.toLowerCase();
  const sqName = i => 'abcdefgh'[i & 7] + (8 - (i >> 3));
  const sqIndex = n => (8 - +n[1]) * 8 + (n.charCodeAt(0) - 97);

  function fromFEN(fen) {
    const [pos, turn, castle, ep, half, full] = fen.split(' ');
    const board = [];
    for (const ch of pos.replace(/\//g, '')) {
      if (/\d/.test(ch)) for (let i = 0; i < +ch; i++) board.push('');
      else board.push(ch);
    }
    return { board, turn, castle: castle === '-' ? '' : castle, ep: ep === '-' ? -1 : sqIndex(ep), half: +half || 0, full: +full || 1 };
  }
  const initial = () => fromFEN(START);
  const clone = s => ({ ...s, board: s.board.slice() });

  function isAttacked(s, sq, by) {
    const b = s.board, r = sq >> 3, c = sq & 7, w = by === 'w';
    const P = w ? 'P' : 'p', N = w ? 'N' : 'n', B = w ? 'B' : 'b', R = w ? 'R' : 'r', Q = w ? 'Q' : 'q', K = w ? 'K' : 'k';
    const pr = w ? r + 1 : r - 1;
    if (pr >= 0 && pr < 8) {
      if (c > 0 && b[pr * 8 + c - 1] === P) return true;
      if (c < 7 && b[pr * 8 + c + 1] === P) return true;
    }
    for (const [dr, dc] of KNIGHT) {
      const rr = r + dr, cc = c + dc;
      if (rr >= 0 && rr < 8 && cc >= 0 && cc < 8 && b[rr * 8 + cc] === N) return true;
    }
    for (const [dr, dc] of KING) {
      const rr = r + dr, cc = c + dc;
      if (rr >= 0 && rr < 8 && cc >= 0 && cc < 8 && b[rr * 8 + cc] === K) return true;
    }
    for (const [dirs, A] of [[ORTH, R], [DIAG, B]]) {
      for (const [dr, dc] of dirs) {
        let rr = r + dr, cc = c + dc;
        while (rr >= 0 && rr < 8 && cc >= 0 && cc < 8) {
          const p = b[rr * 8 + cc];
          if (p) { if (p === A || p === Q) return true; break; }
          rr += dr; cc += dc;
        }
      }
    }
    return false;
  }

  const kingSq = (s, col) => s.board.indexOf(col === 'w' ? 'K' : 'k');
  const inCheck = (s, col) => isAttacked(s, kingSq(s, col), col === 'w' ? 'b' : 'w');

  function pseudoMoves(s, capturesOnly = false) {
    const out = [], b = s.board, me = s.turn, them = me === 'w' ? 'b' : 'w';
    for (let sq = 0; sq < 64; sq++) {
      const p = b[sq];
      if (!p || color(p) !== me) continue;
      const t = type(p), r = sq >> 3, c = sq & 7;
      const add = (to, flag) => {
        const captured = b[to];
        if (t === 'p' && (to >> 3 === 0 || to >> 3 === 7)) {
          for (const promo of 'qnrb') out.push({ from: sq, to, piece: p, captured, promo, flag });
        } else out.push({ from: sq, to, piece: p, captured, flag });
      };
      if (t === 'p') {
        const dir = me === 'w' ? -1 : 1, startRow = me === 'w' ? 6 : 1, r1 = r + dir;
        if (r1 < 0 || r1 > 7) continue;
        if (!capturesOnly && !b[r1 * 8 + c]) {
          add(r1 * 8 + c);
          if (r === startRow && !b[(r1 + dir) * 8 + c]) add((r1 + dir) * 8 + c, 'double');
        }
        for (const dc of [-1, 1]) {
          const cc = c + dc;
          if (cc < 0 || cc > 7) continue;
          const to = r1 * 8 + cc;
          if (b[to] && color(b[to]) === them) add(to);
          else if (to === s.ep) out.push({ from: sq, to, piece: p, captured: me === 'w' ? 'p' : 'P', flag: 'ep' });
        }
      } else if (t === 'n' || t === 'k') {
        for (const [dr, dc] of t === 'n' ? KNIGHT : KING) {
          const rr = r + dr, cc = c + dc;
          if (rr < 0 || rr > 7 || cc < 0 || cc > 7) continue;
          const to = rr * 8 + cc, q = b[to];
          if (!q) { if (!capturesOnly) add(to); } else if (color(q) === them) add(to);
        }
        const home = me === 'w' ? 60 : 4;
        if (t === 'k' && !capturesOnly && sq === home && s.castle) {
          const R = me === 'w' ? 'R' : 'r';
          const kSide = me === 'w' ? 'K' : 'k', qSide = me === 'w' ? 'Q' : 'q';
          if (s.castle.includes(kSide) && !b[home + 1] && !b[home + 2] && b[home + 3] === R &&
              !isAttacked(s, home, them) && !isAttacked(s, home + 1, them) && !isAttacked(s, home + 2, them))
            out.push({ from: home, to: home + 2, piece: p, captured: '', flag: 'cK' });
          if (s.castle.includes(qSide) && !b[home - 1] && !b[home - 2] && !b[home - 3] && b[home - 4] === R &&
              !isAttacked(s, home, them) && !isAttacked(s, home - 1, them) && !isAttacked(s, home - 2, them))
            out.push({ from: home, to: home - 2, piece: p, captured: '', flag: 'cQ' });
        }
      } else {
        const dirs = t === 'b' ? DIAG : t === 'r' ? ORTH : DIAG.concat(ORTH);
        for (const [dr, dc] of dirs) {
          let rr = r + dr, cc = c + dc;
          while (rr >= 0 && rr < 8 && cc >= 0 && cc < 8) {
            const to = rr * 8 + cc, q = b[to];
            if (!q) { if (!capturesOnly) add(to); } else { if (color(q) === them) add(to); break; }
            rr += dr; cc += dc;
          }
        }
      }
    }
    return out;
  }

  function makeMove(s, m) {
    const b = s.board, undo = { castle: s.castle, ep: s.ep, half: s.half };
    const white = s.turn === 'w';
    b[m.to] = m.promo ? (white ? m.promo.toUpperCase() : m.promo) : m.piece;
    b[m.from] = '';
    if (m.flag === 'ep') b[m.to + (white ? 8 : -8)] = '';
    else if (m.flag === 'cK') { b[m.from + 1] = b[m.from + 3]; b[m.from + 3] = ''; }
    else if (m.flag === 'cQ') { b[m.from - 1] = b[m.from - 4]; b[m.from - 4] = ''; }
    let cr = s.castle;
    if (cr) {
      if (m.piece === 'K') cr = cr.replace(/[KQ]/g, '');
      else if (m.piece === 'k') cr = cr.replace(/[kq]/g, '');
      if (ROOK_HOME[m.from]) cr = cr.replace(ROOK_HOME[m.from], '');
      if (ROOK_HOME[m.to]) cr = cr.replace(ROOK_HOME[m.to], '');
    }
    s.castle = cr;
    s.ep = m.flag === 'double' ? (m.from + m.to) >> 1 : -1;
    s.half = type(m.piece) === 'p' || m.captured ? 0 : s.half + 1;
    if (!white) s.full++;
    s.turn = white ? 'b' : 'w';
    return undo;
  }

  function undoMove(s, m, undo) {
    s.turn = s.turn === 'w' ? 'b' : 'w';
    const white = s.turn === 'w', b = s.board;
    if (!white) s.full--;
    b[m.from] = m.piece;
    if (m.flag === 'ep') { b[m.to] = ''; b[m.to + (white ? 8 : -8)] = m.captured; }
    else b[m.to] = m.captured || '';
    if (m.flag === 'cK') { b[m.from + 3] = b[m.from + 1]; b[m.from + 1] = ''; }
    else if (m.flag === 'cQ') { b[m.from - 4] = b[m.from - 1]; b[m.from - 1] = ''; }
    s.castle = undo.castle; s.ep = undo.ep; s.half = undo.half;
  }

  function legalMoves(s) {
    const me = s.turn;
    return pseudoMoves(s).filter(m => {
      const u = makeMove(s, m);
      const ok = !inCheck(s, me);
      undoMove(s, m, u);
      return ok;
    });
  }

  function insufficient(s) {
    const rest = [];
    s.board.forEach((p, i) => { if (p && type(p) !== 'k') rest.push([type(p), i]); });
    if (rest.length === 0) return true;
    if (rest.length === 1 && 'bn'.includes(rest[0][0])) return true;
    // Only bishops left, all on the same square colour
    if (rest.every(([t]) => t === 'b')) {
      const shade = ([, i]) => ((i >> 3) + (i & 7)) % 2;
      return rest.every(x => shade(x) === shade(rest[0]));
    }
    return false;
  }

  const key = s => s.board.map(p => p || '.').join('') + s.turn + s.castle + s.ep;

  function status(s, keys) {
    if (!legalMoves(s).length) return inCheck(s, s.turn) ? 'checkmate' : 'stalemate';
    if (s.half >= 100) return 'fifty';
    if (insufficient(s)) return 'insufficient';
    const k = key(s);
    if (keys.filter(x => x === k).length >= 3) return 'repetition';
    return null;
  }

  // Standard algebraic notation for the move log
  function san(s, m) {
    const t = type(m.piece);
    let str;
    if (m.flag === 'cK') str = 'O-O';
    else if (m.flag === 'cQ') str = 'O-O-O';
    else if (t === 'p') {
      str = (m.captured ? 'abcdefgh'[m.from & 7] + 'x' : '') + sqName(m.to) + (m.promo ? '=' + m.promo.toUpperCase() : '');
    } else {
      str = t.toUpperCase();
      const rivals = legalMoves(s).filter(o => o.to === m.to && o.piece === m.piece && o.from !== m.from);
      if (rivals.length) {
        const sameFile = rivals.some(o => (o.from & 7) === (m.from & 7));
        const sameRank = rivals.some(o => o.from >> 3 === m.from >> 3);
        if (!sameFile) str += 'abcdefgh'[m.from & 7];
        else if (!sameRank) str += 8 - (m.from >> 3);
        else str += sqName(m.from);
      }
      str += (m.captured ? 'x' : '') + sqName(m.to);
    }
    const after = clone(s);
    makeMove(after, m);
    if (inCheck(after, after.turn)) str += legalMoves(after).length ? '+' : '#';
    return str;
  }

  return { initial, fromFEN, clone, color, type, sqName, isAttacked, kingSq, inCheck, pseudoMoves, legalMoves, makeMove, undoMove, status, key, san };
})();

if (typeof module !== 'undefined') module.exports = Chess;
