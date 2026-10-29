// Rules and computer-opponent checks. Run with: npm test
const assert = require('assert');
const Chess = require('../js/chess.js');
const AI = require('../js/ai.js');

function perft(s, d) {
  if (!d) return 1;
  let n = 0;
  for (const m of Chess.legalMoves(s)) { const u = Chess.makeMove(s, m); n += perft(s, d - 1); Chess.undoMove(s, m, u); }
  return n;
}
// Standard move-generation counts (chessprogramming.org/Perft_Results)
assert.strictEqual(perft(Chess.initial(), 3), 8902, 'start position');
assert.strictEqual(perft(Chess.fromFEN('r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1'), 3), 97862, 'kiwipete: castling, en passant, promotion');
assert.strictEqual(perft(Chess.fromFEN('8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1'), 4), 43238, 'endgame position');

const mate = Chess.fromFEN('6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1');
assert.strictEqual(Chess.san(mate, AI.choose(mate, 2)), 'Ra8#', 'computer finds mate in one');
assert.strictEqual(Chess.status(Chess.fromFEN('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1'), []), 'stalemate');
assert.strictEqual(Chess.status(Chess.fromFEN('7k/8/6K1/8/8/8/8/2B5 b - - 0 1'), []), 'insufficient');
console.log('All rules tests passed');
