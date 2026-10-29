// Renders the app icon, splash screens and store banner from the game's sprites.
// Usage: node tools/make-art.js   (needs Playwright; run from the repo root)
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const sprites = fs.readFileSync(path.join(root, 'js/sprites.js'), 'utf8');
const font = fs.readFileSync(path.join(root, 'assets/fonts/press-start-2p.woff2')).toString('base64');

const page = `<!doctype html><style>@font-face{font-family:"Press Start 2P Local";src:url(data:font/woff2;base64,${font})}</style>
<script>${sprites}</script>
<script>
function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.imageSmoothingEnabled = false; return [c, x]; }
function sprite(x, type, color, cx, feetY, s, flip) {
  const sp = getSprite(type, color), w = sp.width * s, h = sp.height * s;
  x.save(); x.translate(cx, feetY); if (flip) x.scale(-1, 1); x.drawImage(sp, -w / 2, -h, w, h); x.restore();
}
function backdrop(x, w, h, floorY, tile) {
  x.fillStyle = '#2a2036'; x.fillRect(0, 0, w, h);
  x.fillStyle = '#1c1526';
  for (let y = 0; y < floorY; y += tile) { x.fillRect(0, y, w, Math.max(1, tile / 12)); for (let bx = (y / tile) % 2 ? tile : 0; bx < w; bx += tile * 2) x.fillRect(bx, y, Math.max(1, tile / 12), tile); }
  for (let r = 0, y = floorY; y < h; r++) { const th = tile * (0.7 + r * 0.3); for (let c = 0, xx = -(r % 2) * tile; xx < w; c++, xx += tile * 2) { x.fillStyle = (c + r) % 2 ? '#cdb88f' : '#77553c'; x.fillRect(xx, y, tile * 2, th); } y += th; }
  x.fillStyle = '#e3ab2f'; x.fillRect(0, floorY - tile / 4, w, tile / 4);
}
// Icon: a knight and a queen facing off, drawn on a 64px grid and scaled up.
function icon(size, pad) {
  const [c, x] = canvas(size, size), u = size / 64;
  backdrop(x, size, size, 44 * u, 4 * u);
  const inner = 1 - pad * 2;
  x.save(); x.translate(size * pad, size * pad); x.scale(inner, inner);
  sprite(x, 'n', 'w', 18 * u, 56 * u, 2 * u, false);
  sprite(x, 'q', 'b', 47 * u, 56 * u, 2 * u, true);
  x.restore();
  return c.toDataURL();
}
function iconLayer(size, which) {
  const [c, x] = canvas(size, size), u = size / 64;
  if (which === 'bg') backdrop(x, size, size, 44 * u, 4 * u);
  else { x.translate(size * 0.17, size * 0.17); x.scale(0.66, 0.66); sprite(x, 'n', 'w', 18 * u, 56 * u, 2 * u, false); sprite(x, 'q', 'b', 47 * u, 56 * u, 2 * u, true); }
  return c.toDataURL();
}
function title(x, text, cx, y, size, color) {
  x.font = size + 'px "Press Start 2P Local"'; x.textAlign = 'center'; x.textBaseline = 'top';
  x.fillStyle = '#c9353f'; x.fillText(text, cx + size / 6, y + size / 6);
  x.fillStyle = color; x.fillText(text, cx, y);
}
function splash(size) {
  const [c, x] = canvas(size, size), u = size / 128;
  x.fillStyle = '#120d1a'; x.fillRect(0, 0, size, size);
  sprite(x, 'k', 'w', 48 * u, 84 * u, 2 * u, false);
  sprite(x, 'q', 'b', 80 * u, 84 * u, 2 * u, true);
  x.fillStyle = '#e3ab2f'; x.fillRect(36 * u, 84 * u, 56 * u, u);
  title(x, 'CHECKMATE', size / 2, 90 * u, 5 * u, '#e3ab2f');
  title(x, '& CHIVALRY', size / 2, 97 * u, 5 * u, '#e3ab2f');
  return c.toDataURL();
}
function banner() {
  const [c, x] = canvas(1024, 500);
  backdrop(x, 1024, 500, 360, 20);
  title(x, 'CHECKMATE', 512, 60, 56, '#e3ab2f');
  title(x, '& CHIVALRY', 512, 130, 56, '#e3ab2f');
  x.font = '18px "Press Start 2P Local"'; x.fillStyle = '#efe6d2'; x.textAlign = 'center'; x.fillText('EVERY CAPTURE IS A FIGHT', 512, 214);
  const cast = [['p', 'w', 110], ['n', 'w', 230], ['b', 'w', 350], ['k', 'w', 455], ['q', 'b', 570], ['r', 'b', 680], ['n', 'b', 800], ['p', 'b', 915]];
  for (const [t, col, cx] of cast) sprite(x, t, col, cx, 470, 5, col === 'b');
  return c.toDataURL();
}
</script>`;

(async () => {
  const browser = await chromium.launch();
  const p = await browser.newPage();
  await p.setContent(page);
  await p.evaluate(() => document.fonts.load('10px "Press Start 2P Local"'));
  const save = async (file, expr) => {
    const url = await p.evaluate(expr);
    fs.writeFileSync(path.join(root, file), Buffer.from(url.split(',')[1], 'base64'));
    console.log('wrote', file);
  };
  await save('resources/icon-only.png', 'icon(1024, 0)');
  await save('resources/icon-foreground.png', "iconLayer(1024, 'fg')");
  await save('resources/icon-background.png', "iconLayer(1024, 'bg')");
  await save('resources/splash.png', 'splash(2732)');
  await save('resources/splash-dark.png', 'splash(2732)');
  await save('store/feature-graphic-1024x500.png', 'banner()');
  for (const s of [180, 192, 512]) await save(`assets/icons/icon-${s}.png`, `icon(${s}, 0)`);
  await save('assets/icons/icon-maskable-512.png', 'icon(512, 0.1)');
  await browser.close();
})();
