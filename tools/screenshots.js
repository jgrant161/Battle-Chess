// Captures app store screenshots from the built game (run `npm run build` first).
// Usage: node tools/screenshots.js
const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const www = path.join(root, 'www');
const outDir = path.join(root, 'store', 'screenshots');

const DEVICES = [
  { name: 'iphone-6.9', width: 440, height: 956, scale: 3 },   // 1320 x 2868
  { name: 'ipad-13', width: 1032, height: 1376, scale: 2 },    // 2064 x 2752
  { name: 'android-phone', width: 360, height: 640, scale: 3 }, // 1080 x 1920
];

// A lively middle-game position for the board shot
const MIDGAME = 'r1bq1rk1/ppp2ppp/2n2n2/3pp3/1bPP4/2N1PN2/PP1B1PPP/R2QKB1R w KQ - 0 7';

const SHOTS = [
  { file: '1-board', caption: 'Retro chess, pixel by pixel', setup: `loadPosition(${JSON.stringify(MIDGAME)}, 'f3', 'e5')` },
  { file: '2-kiss', caption: 'The King kisses the Queen... then takes her', setup: "fight('k', 'q', 1.75)" },
  { file: '3-knight', caption: 'Every capture is a fight', setup: "fight('n', 'p', 2.15)" },
  { file: '4-frog', caption: 'Bishops turn rivals into frogs', setup: "fight('b', 'r', 2.0)" },
  { file: '5-squash', caption: 'Rooks leap. Pawns get squashed.', setup: "fight('r', 'p', 1.7)" },
  { file: '6-menu', caption: 'Play a friend or the computer', setup: 'showMenu()' },
];

const HELPERS = `
  window.loadPosition = (fen, from, to) => {
    G.state = Chess.fromFEN(fen);
    G.log = ['e4', 'e5', 'Nf3', 'Nc6', 'c4', 'Nf6', 'Nc3', 'Bb4', 'd4', 'd5', 'e3', 'O-O'];
    G.captured = { w: [], b: [] };
    document.getElementById('menu').hidden = true;
    const sq = n => (8 - +n[1]) * 8 + (n.charCodeAt(0) - 97);
    G.selected = sq(from);
    G.targets = Chess.legalMoves(G.state).filter(m => m.from === G.selected);
    updateHUD();
  };
  window.fight = (a, d, t) => {
    document.getElementById('menu').hidden = true;
    const f = new Battle.Fight(a, 'w', d, 'b');
    f.resolve = () => {};
    while (f.t < t) f.update(1 / 60);
    f.still = true;
    f.update = () => {};
    G.scene = f;
  };
  window.showMenu = () => {
    document.getElementById('menu').hidden = false;
    document.querySelector('[data-mode=cpu]').click();
  };
  window.caption = text => {
    const h = document.querySelector('header.top');
    h.innerHTML = '<div class="shot-caption">' + text + '</div>';
    const st = document.createElement('style');
    st.textContent = '.shot-caption{font-family:var(--font-display);color:var(--gold);text-shadow:3px 3px 0 var(--blood);font-size:clamp(16px,4.6vw,30px);line-height:1.5;text-align:center;width:100%;padding:12px 0 4px;text-wrap:balance}';
    document.head.appendChild(st);
  };
`;

const types = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.woff2': 'font/woff2', '.json': 'application/json', '.webmanifest': 'application/manifest+json' };
const server = http.createServer((req, res) => {
  const file = path.join(www, decodeURIComponent(req.url.split('?')[0]).replace(/\/$/, '/index.html'));
  if (!file.startsWith(www) || !fs.existsSync(file)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});

(async () => {
  await new Promise(r => server.listen(0, r));
  const url = `http://localhost:${server.address().port}/index.html`;
  const browser = await chromium.launch();
  for (const dev of DEVICES) {
    fs.mkdirSync(path.join(outDir, dev.name), { recursive: true });
    for (const shot of SHOTS) {
      const ctx = await browser.newContext({ viewport: { width: dev.width, height: dev.height }, deviceScaleFactor: dev.scale });
      const page = await ctx.newPage();
      await page.goto(url);
      await page.evaluate(() => localStorage.clear());
      await page.evaluate(() => document.fonts.ready);
      await page.evaluate(HELPERS);
      await page.evaluate(shot.setup);
      await page.evaluate(`caption(${JSON.stringify(shot.caption)})`);
      await page.waitForTimeout(400);
      const file = path.join(outDir, dev.name, `${shot.file}.png`);
      await page.screenshot({ path: file });
      console.log('wrote', path.relative(root, file));
      await ctx.close();
    }
  }
  await browser.close();
  server.close();
})();
