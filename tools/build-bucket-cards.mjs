#!/usr/bin/env node
// Regenerates the World Heritage Games "...of the World" bucket cards in the home page Collections list
// (data/whg-buckets.json -> the block between <!-- BUCKETS:BEGIN --> and <!-- BUCKETS:END --> in index.html).
//
//   node tools/build-bucket-cards.mjs                 write index.html when out of date (uses the cached link map)
//   node tools/build-bucket-cards.mjs --check         exit 1 if index.html is out of date
//   node tools/build-bucket-cards.mjs --refresh-links HEAD-check every detail/game URL on the World Heritage Games site,
//                                                      store the result in data/whg-buckets.links.json, then regenerate.
// A link is only emitted when its URL is known to return 200 (so cards never point at a 404). Until a bucket's own page
// is live on the WHG site, its buttons point at the live apps index; run --refresh-links after that site is published.
// Statuses: "live" (needs package), "in-review" or "soon" (Google Play only; the buckets are not on the App Store). No dependencies (Node 18+).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = process.env.SITE_ROOT || path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE = 'https://equalinformation.com/world-heritage-games-site/';
const check = process.argv.includes('--check');
const refresh = process.argv.includes('--refresh-links');
const dataFile = path.join(root, 'data/whg-buckets.json');
const linkFile = path.join(root, 'data/whg-buckets.links.json');
const htmlFile = path.join(root, 'index.html');
const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const buckets = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
let links = fs.existsSync(linkFile) ? JSON.parse(fs.readFileSync(linkFile, 'utf8')) : {};

if (refresh) {
  const urls = [...new Set(buckets.flatMap((b) => [BASE + b.appsPath, ...b.games.filter((g) => g.pagePath).map((g) => BASE + g.pagePath)]))];
  const next = {};
  let i = 0;
  await Promise.all(Array.from({ length: 12 }, async () => {
    while (i < urls.length) {
      const u = urls[i++];
      try { next[u] = (await fetch(u, { method: 'HEAD', redirect: 'follow' })).status === 200; } catch { next[u] = false; }
    }
  }));
  links = Object.fromEntries(Object.keys(next).sort().map((u) => [u, next[u]]));
  fs.writeFileSync(linkFile, JSON.stringify(links, null, 1) + '\n');
  console.log(`links: ${Object.values(links).filter(Boolean).length}/${urls.length} live`);
}
const live = (u) => links[u] === true;
const hubIndex = BASE + 'apps/';

const statusWord = (s) => (s === 'live' ? 'Live on' : s === 'in-review' ? 'In review on' : 'Coming soon on');
const PLAY = 'https://play.google.com/store/apps/details?id=';
function card(b) {
  const detail = BASE + b.appsPath;
  const detailLive = live(detail);
  const own = (kind) => { const f = `${kind}-whg-${b.bucket}.html`; return fs.existsSync(path.join(root, f)) ? f : null; };
  const privacy = own('privacy'), support = own('app-support');
  const short = (n) => n.replace(/\s*\([^)]*\)\s*$/, '');
  const items = b.games.map((g) => {
    const url = g.pagePath ? BASE + g.pagePath : null;
    const img = g.icon ? `<img src="assets/games/${esc(g.icon)}" alt="" width="56" height="56" loading="lazy">` : `<span class="whg-noicon" aria-hidden="true">${esc([...short(g.name)][0].toUpperCase())}</span>`;
    return url && live(url)
      ? `<li><a href="${url}#play" target="_blank" rel="noopener" title="Play the ${esc(g.name)} preview">${img}<span>${esc(short(g.name))}</span></a></li>`
      : `<li><span class="whg-item">${img}<span title="${esc(g.name)}">${esc(short(g.name))}</span></span></li>`;
  }).join('');
  const play = detailLive
    ? `<a class="store-btn" href="${detail}" target="_blank" rel="noopener">Play free previews &#8599;</a>`
    : `<a class="store-btn" href="${hubIndex}" target="_blank" rel="noopener">Explore World Heritage Games &#8599;</a>`;
  const names = b.games.map((g) => g.name).join(' ');  // full names (with the parenthetical) stay searchable
  const n = b.games.length;
  return `    <article class="whg-hero" id="bucket-${esc(b.short)}" data-search="${esc(`${b.name} ${names} google play android game world heritage`)}">
        <div class="whg-copy">
            <div class="whg-brand"><img src="assets/games/whg-emblem.png" alt="" width="52" height="52"><span><b>WORLD HERITAGE GAMES</b><i>An atlas of play</i></span></div>
            <h3 class="whg-title"><img class="whg-appicon" src="assets/games/whg-${esc(b.short)}-icon.png" alt="" width="72" height="72"><span class="whg-t3d">${esc(b.name)}</span></h3>
            <div class="whg-sub">${esc(b.sub)}</div>
            <div class="whg-meta">Free to play with ads &middot; Works offline &middot; Android</div>
            <div class="af-actions whg-actions">
                ${b.status === 'live' ? `<a class="store-btn primary" href="${PLAY}${esc(b.package)}" target="_blank" rel="noopener">Get it on Google Play &#8599;</a>` : `<span class="store-btn review" aria-label="Google Play: ${b.status === 'in-review' ? 'in review' : 'coming soon'}"><small>${statusWord(b.status)}</small>Google Play</span>`}
                ${play}
            </div>
            <p class="whg-text">${esc(b.text)}</p>
            <ul class="whg-instr" aria-label="The ${n} games">${items}</ul>
            <div class="af-status">
                <span><b>Android</b> v${esc(b.version)} &middot; ${statusWord(b.status)} Google Play</span>
            </div>
            <div class="af-links">
                <a href="${privacy || BASE + 'privacy/'}" target="_blank" rel="noopener">Privacy</a>
                <a href="${support || BASE + 'support/'}" target="_blank" rel="noopener">Support</a>
                <a href="${detailLive ? detail : hubIndex}" target="_blank" rel="noopener">All ${n} games</a>
                <a href="${BASE}" target="_blank" rel="noopener">World Heritage Games</a>
            </div>
        </div>
        <div class="whg-art" aria-hidden="true">
            <img class="p1" src="assets/games/whg-${esc(b.short)}-menu.jpg" alt="" width="360" height="640" loading="lazy">
            <img class="p2" src="assets/games/whg-${esc(b.short)}-home.jpg" alt="" width="360" height="640" loading="lazy">
            <img class="p3" src="assets/games/whg-${esc(b.short)}-play.jpg" alt="" width="360" height="640" loading="lazy">
        </div>
        <ul class="whg-gallery" aria-label="Inside the app">${[1, 2, 3, 4].map((k) => `<li><img src="assets/games/whg-${esc(b.short)}-shot${k}.jpg" alt="" width="360" height="640" loading="lazy"></li>`).join('')}</ul>
    </article>`;
}

const block = `<!-- BUCKETS:BEGIN (generated by tools/build-bucket-cards.mjs from data/whg-buckets.json; do not hand-edit) -->\n${buckets.map(card).join('\n')}\n    <!-- BUCKETS:END -->`;
let html = fs.readFileSync(htmlFile, 'utf8');
const re = /<!-- BUCKETS:BEGIN[^>]*-->[\s\S]*?<!-- BUCKETS:END -->/;
if (!re.test(html)) { console.error('markers BUCKETS:BEGIN/END not found in index.html'); process.exit(1); }
const out = html.replace(re, () => block);
if (check) { if (out !== html) { console.error('OUT OF DATE: node tools/build-bucket-cards.mjs'); process.exit(1); } console.log(`OK: ${buckets.length} bucket cards in sync`); process.exit(0); }
if (out !== html) fs.writeFileSync(htmlFile, out);
console.log(`${out !== html ? 'updated' : 'already up to date'}: ${buckets.length} bucket cards (${Object.values(links).filter(Boolean).length} live links known)`);
