'use strict';
// Shared screen size (internal pixels; the canvas is scaled up with pixelated rendering).
const CW = 344, CH = 360;
// Bundled copy first so the packaged app works offline; Google Fonts as the web fallback.
const PIXEL_FONT = '"Press Start 2P Local", "Press Start 2P", monospace';

// Pixel art. Each letter is a palette slot; '.' is transparent.
// o outline, b body, l highlight, d shadow, a accent, m/n metal, s skin, e eyes,
// r trim, g glow, h wood/hair, c cape, W white, k black, f/F frog greens, y gold
const SPRITE_ROWS = {
  p: [
    '............g...',
    '...........omo..',
    '...........omo..',
    '............h...',
    '.....oooo...h...',
    '....onmmmo..h...',
    '...onmmmmmo.h...',
    '...oooooooo.h...',
    '....oseseo..h...',
    '....ossssooshs..',
    '...obbbbbbossso.',
    '..obllbbbbbooh..',
    '..oblbbaabbo.h..',
    '..obbbaaabbo.h..',
    '...obbbabbo..h..',
    '...oddddddo..h..',
    '....onnnno...h..',
    '....on..no...h..',
    '...onn..nno.....',
    '...ooo..ooo.....',
  ],
  n: [
    '.....rr......o..',
    '....rrrr....omo.',
    '....rr.r....omo.',
    '.....oooo...omo.',
    '....ommmmo..omo.',
    '...ommmmmmo.omo.',
    '...ommmmmmo.omo.',
    '...okkkkkko.omo.',
    '...ommmmmmo.omo.',
    '....ommmmo.oaaao',
    '...oobbbbboosso.',
    '..obbllbbbbbsso.',
    '..oblmmmmbbbo...',
    '..oblmaambbbo...',
    '..obbmmmmbbo....',
    '...obbbbbbo.....',
    '...oddddddo.....',
    '....onnnno......',
    '....omo.omo.....',
    '...ommo.ommo....',
    '...oooo.oooo....',
  ],
  b: [
    '......oo....ogo.',
    '.....obbo...ogo.',
    '....obaabo...h..',
    '....oblabo...h..',
    '....obaabo...h..',
    '....obbbbo...h..',
    '....oaaaao...h..',
    '....oseseo...h..',
    '....osssso..osho',
    '...ollWWlloossso',
    '..obllWWllbbo.h.',
    '..obllbaabbbo.h.',
    '..obllaaaabbo.h.',
    '..obllbaabbbo.h.',
    '..obllbaabbbo.h.',
    '..obllbbbbbbo.h.',
    '..obllbbbbbbo.h.',
    '.obllbbbbbbbbo..',
    '.oddddddddddddo.',
    '.oooooooooooooo.',
  ],
  r: [
    '.oooo.oooo.oooo.',
    '.obbo.obbo.obbo.',
    '.obbooobbooobbo.',
    '.obbbbbbbbbbbbo.',
    '.oddddddddddddo.',
    '..obbbbbbbbbbo..',
    '..oblbbbbbbbbo..',
    '..oblggbbggbbo..',
    '..oblbbbbbbbbo..',
    '..oblbokkkkobo..',
    '..oblbbbbbbbbo..',
    '..obldbbbdbbbo..',
    '..oblbbbbbbbbo..',
    '..oblbbdbbbdbo..',
    '..oblbbbbbbbbo..',
    '.oddddddddddddo.',
    '.obbbbbbbbbbbbo.',
    '.obbbbbbbbbbbbo.',
    '.oooooooooooooo.',
  ],
  q: [
    '....a.a.a.....y.',
    '....aaaaa....yyy',
    '....acaca.....y.',
    '...ohhhhho....h.',
    '..ohhsssshho..h.',
    '..ohsesesho...h.',
    '..ohssrssho...h.',
    '..ohhsssshho..h.',
    '..ohhobbohho.oso',
    '...obblbbbbboso.',
    '..obllbbbbbbo...',
    '...obbaabbbo....',
    '...obbbbbbbo....',
    '..obllbbbbbbo...',
    '..obllbbaabbo...',
    '.obllbbbbbbbbo..',
    '.obllbbbbbbbbo..',
    'obllbbbbbbbbbbo.',
    'obllbbbbbbbbbbo.',
    'oddddddddddddddo',
    'oooooooooooooooo',
  ],
  k: [
    '...a..a..a....o.',
    '...aa.aa.aa..oao',
    '...acaacaaca.oao',
    '...aaaaaaaaa..h.',
    '...osssssso...h.',
    '...osesseso...h.',
    '...osssssso...h.',
    '...oWWWWWWo...h.',
    '...oWWrrWWo..oso',
    '....oWWWWo..osso',
    '..occbbbbcco.oh.',
    '.occbllbbbcco.h.',
    '.ocbllbaabbco.h.',
    '.ocbllaaaabco.h.',
    '.ocbllbaabbco.h.',
    '.ocbllbbbbbco.h.',
    '.ocbllbbbbbco...',
    '.occbbbbbbbcco..',
    'occcbbbbbbbccco.',
    'oddddddddddddddo',
    'oooooooooooooooo',
  ],
  frog: [
    '..oo......oo..',
    '.oWko....okWo.',
    '.offfoooofffo.',
    'offffffffffffo',
    'ofkffffffffkfo',
    'offkkkkkkkkffo',
    'offffffffffffo',
    '.oFffffffffFo.',
    'oFFo.oooo.oFFo',
    'ooo........ooo',
  ],
};

const COMMON_PAL = { W: '#ffffff', k: '#000000', f: '#5fbf4a', F: '#2f7a2a', y: '#ffd23f' };
const TEAM_PAL = {
  w: { o: '#1d1428', b: '#ece2c6', l: '#fffaf0', d: '#ab977a', a: '#e3ab2f', m: '#c6cede', n: '#7e869a',
       s: '#f1b88e', e: '#1d1428', r: '#c9353f', g: '#ffdf5e', h: '#7a5233', c: '#2f6fcf' },
  b: { o: '#0b0912', b: '#4d3f70', l: '#7d6cab', d: '#2a2142', a: '#d9434f', m: '#9097aa', n: '#565c70',
       s: '#c48a69', e: '#0b0912', r: '#e3ab2f', g: '#ff4b4b', h: '#3e2a1d', c: '#3e9d6e' },
};

const SPRITE_CACHE = new Map();

// variant: '' normal, 'flash' hit flash, 'char' burnt by lightning
function getSprite(type, color, variant = '') {
  const key = type + color + variant;
  let c = SPRITE_CACHE.get(key);
  if (c) return c;
  const rows = SPRITE_ROWS[type];
  const w = Math.max(...rows.map(r => r.length));
  c = document.createElement('canvas');
  c.width = w; c.height = rows.length;
  const x = c.getContext('2d');
  const pal = { ...COMMON_PAL, ...TEAM_PAL[color] };
  rows.forEach((row, j) => {
    for (let i = 0; i < row.length; i++) {
      const ch = row[i];
      let col = pal[ch];
      if (!col) continue;
      if (variant === 'flash') col = ch === 'o' ? '#1d1428' : '#ffffff';
      else if (variant === 'char') col = ch === 'o' ? '#000000' : (ch === 'l' || ch === 'g' ? '#7a2e14' : '#2b2328');
      x.fillStyle = col;
      x.fillRect(i, j, 1, 1);
    }
  });
  SPRITE_CACHE.set(key, c);
  return c;
}

const SPRITE_URLS = new Map();
function spriteURL(type, color) {
  const key = type + color;
  if (!SPRITE_URLS.has(key)) SPRITE_URLS.set(key, getSprite(type, color).toDataURL());
  return SPRITE_URLS.get(key);
}

function pixText(ctx, str, x, y, { size = 8, color = '#efe6d2', align = 'center', alpha = 1 } = {}) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = `${size}px ${PIXEL_FONT}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#0b0912';
  for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [1, 1]]) ctx.fillText(str, x + dx, y + dy);
  ctx.fillStyle = color;
  ctx.fillText(str, x, y);
  ctx.restore();
}
