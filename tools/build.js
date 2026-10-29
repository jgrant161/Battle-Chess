// Builds the app bundle in www/ for Capacitor (iOS/Android) and web hosting.
// The source index.html is a page body (that is how the artifact preview serves it),
// so here it is wrapped in a full document with app-specific head tags.
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const out = path.join(root, 'www');
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out);

const body = fs.readFileSync(path.join(root, 'index.html'), 'utf8')
  // Offline app: the bundled fonts are enough, skip the Google Fonts request
  .replace(/<link rel="preconnect"[^>]*>\n?/g, '')
  .replace(/<link rel="stylesheet" href="https:\/\/fonts\.googleapis\.com[^>]*>\n?/, '');

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">
<meta name="format-detection" content="telephone=no">
<style>:root { padding-top: env(safe-area-inset-top, 0px); padding-bottom: env(safe-area-inset-bottom, 0px); } body { -webkit-user-select: none; user-select: none; -webkit-tap-highlight-color: transparent; }</style>
${body}
</html>
`;
fs.writeFileSync(path.join(out, 'index.html'), html);

for (const item of ['js', 'assets', 'manifest.webmanifest', 'privacy.html', 'support.html']) {
  fs.cpSync(path.join(root, item), path.join(out, item), { recursive: true });
}
console.log('Built www/');
