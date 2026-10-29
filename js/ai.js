'use strict';
// Computer opponent: alpha-beta search with piece-square tables and a capture search.
const AI = (() => {
  const C = typeof Chess !== 'undefined' ? Chess : require('./chess.js');
  const VALUE = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };
  const MATE = 100000;
  // Tables are from White's point of view, index 0 = a8.
  const PST = {
    p: [0, 0, 0, 0, 0, 0, 0, 0, 50, 50, 50, 50, 50, 50, 50, 50, 10, 10, 20, 30, 30, 20, 10, 10, 5, 5, 10, 25, 25, 10, 5, 5,
      0, 0, 0, 20, 20, 0, 0, 0, 5, -5, -10, 0, 0, -10, -5, 5, 5, 10, 10, -20, -20, 10, 10, 5, 0, 0, 0, 0, 0, 0, 0, 0],
    n: [-50, -40, -30, -30, -30, -30, -40, -50, -40, -20, 0, 0, 0, 0, -20, -40, -30, 0, 10, 15, 15, 10, 0, -30, -30, 5, 15, 20, 20, 15, 5, -30,
      -30, 0, 15, 20, 20, 15, 0, -30, -30, 5, 10, 15, 15, 10, 5, -30, -40, -20, 0, 5, 5, 0, -20, -40, -50, -40, -30, -30, -30, -30, -40, -50],
    b: [-20, -10, -10, -10, -10, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 10, 10, 5, 0, -10, -10, 5, 5, 10, 10, 5, 5, -10,
      -10, 0, 10, 10, 10, 10, 0, -10, -10, 10, 10, 10, 10, 10, 10, -10, -10, 5, 0, 0, 0, 0, 5, -10, -20, -10, -10, -10, -10, -10, -10, -20],
    r: [0, 0, 0, 0, 0, 0, 0, 0, 5, 10, 10, 10, 10, 10, 10, 5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5,
      -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, 0, 0, 0, 5, 5, 0, 0, 0],
    q: [-20, -10, -10, -5, -5, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 5, 5, 5, 0, -10, -5, 0, 5, 5, 5, 5, 0, -5,
      0, 0, 5, 5, 5, 5, 0, -5, -10, 5, 5, 5, 5, 5, 0, -10, -10, 0, 5, 0, 0, 0, 0, -10, -20, -10, -10, -5, -5, -10, -10, -20],
    k: [-30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30,
      -20, -30, -30, -40, -40, -30, -30, -20, -10, -20, -20, -20, -20, -20, -20, -10, 20, 20, 0, 0, 0, 0, 20, 20, 20, 30, 10, 0, 0, 10, 30, 20],
    ke: [-50, -40, -30, -20, -20, -30, -40, -50, -30, -20, -10, 0, 0, -10, -20, -30, -30, -10, 20, 30, 30, 20, -10, -30, -30, -10, 30, 40, 40, 30, -10, -30,
      -30, -10, 30, 40, 40, 30, -10, -30, -30, -10, 20, 30, 30, 20, -10, -30, -30, -30, 0, 0, 0, 0, -30, -30, -50, -30, -30, -30, -30, -30, -30, -50],
  };

  function evaluate(s) {
    const b = s.board;
    let nonPawn = 0, queens = 0, score = 0;
    for (let i = 0; i < 64; i++) {
      const p = b[i];
      if (!p) continue;
      const t = p.toLowerCase();
      if (t === 'q') queens++;
      if (t !== 'p' && t !== 'k') nonPawn += VALUE[t];
    }
    const endgame = queens === 0 || nonPawn <= 1300;
    for (let i = 0; i < 64; i++) {
      const p = b[i];
      if (!p) continue;
      const t = p.toLowerCase(), white = p !== t;
      const idx = white ? i : (7 - (i >> 3)) * 8 + (i & 7);
      const table = t === 'k' ? (endgame ? PST.ke : PST.k) : PST[t];
      const v = VALUE[t] + table[idx];
      score += white ? v : -v;
    }
    return s.turn === 'w' ? score : -score;
  }

  const moveScore = m => (m.captured ? 10000 + 10 * VALUE[m.captured.toLowerCase()] - VALUE[m.piece.toLowerCase()] / 10 : 0) + (m.promo ? 8000 : 0);
  const order = moves => moves.sort((a, b) => moveScore(b) - moveScore(a));

  function quiesce(s, alpha, beta, depth) {
    const stand = evaluate(s);
    if (stand >= beta) return beta;
    if (stand > alpha) alpha = stand;
    if (depth <= 0) return alpha;
    const me = s.turn;
    for (const m of order(C.pseudoMoves(s, true))) {
      const u = C.makeMove(s, m);
      if (C.inCheck(s, me)) { C.undoMove(s, m, u); continue; }
      const sc = -quiesce(s, -beta, -alpha, depth - 1);
      C.undoMove(s, m, u);
      if (sc >= beta) return beta;
      if (sc > alpha) alpha = sc;
    }
    return alpha;
  }

  function negamax(s, depth, alpha, beta, ply) {
    if (depth === 0) return quiesce(s, alpha, beta, 4);
    const me = s.turn;
    let legal = 0;
    for (const m of order(C.pseudoMoves(s))) {
      const u = C.makeMove(s, m);
      if (C.inCheck(s, me)) { C.undoMove(s, m, u); continue; }
      legal++;
      const sc = -negamax(s, depth - 1, -beta, -alpha, ply + 1);
      C.undoMove(s, m, u);
      if (sc >= beta) return beta;
      if (sc > alpha) alpha = sc;
    }
    if (!legal) return C.inCheck(s, me) ? -MATE + ply : 0;
    return alpha;
  }

  // noise > 0 makes weaker levels pick imperfect moves now and then
  function choose(state, depth, noise = 0) {
    const s = C.clone(state);
    const moves = order(C.legalMoves(s));
    if (!moves.length) return null;
    let best = moves[0], bestScore = -Infinity;
    for (const m of moves) {
      const u = C.makeMove(s, m);
      const floor = noise ? -Infinity : bestScore;
      let sc = -negamax(s, depth - 1, -Infinity, -floor, 1);
      C.undoMove(s, m, u);
      if (noise) sc += (Math.random() * 2 - 1) * noise;
      if (sc > bestScore) { bestScore = sc; best = m; }
    }
    return best;
  }

  return { choose, evaluate };
})();

if (typeof module !== 'undefined') module.exports = AI;
