# Pixel War Chess

A retro pixel-art chess game where every capture becomes an animated fight, inspired by the
1988 classic. All art, animation and sound in this repo are original.

## Play

Open `index.html` in a browser (or serve the folder with any static web server).

- Two players on one screen, or one player against the computer (Squire / Knight / King strength)
- A fight scene for every capture, keyed by the attacking piece, plus specials:
  the King kisses the Queen before taking her, and a promoted pawn is knighted by its King
- Undo, battle on/off, sound on/off, move log, captured-piece tray

## Layout

| File | What it does |
| --- | --- |
| `js/chess.js` | Full rules: castling, en passant, promotion, check/mate, draws (perft-verified) |
| `js/ai.js` | Computer opponent (alpha-beta search) |
| `js/sprites.js` | Pixel-art sprites defined as text grids |
| `js/battles.js` | Arena and fight choreography |
| `js/audio.js` | Chiptune sound effects via Web Audio |
| `js/game.js` | Board, input, turn flow, menus |
