#!/usr/bin/env node
// Generates privacy-<key>.html and app-support-<key>.html for a free-with-ads Deluxe/bucket app (iOS + Android),
// cloned from the Golden Sling pages (the approved ads wording: AdMob, UMP consent, ATT, ad ID, Remove ads).
//   node tools/make-deluxe-store-pages.mjs --key crossworddeluxe --name "Quillgrid Crosswords" --bundle com.equalinformation.crossworddeluxe.app \
//        --blurb "a crossword studio with a daily puzzle, themed packs and lessons" [--short "the free crossword studio"] [--force]
// key = releaseOpsApp from platform/standalone/<slug>.json. Then commit + push this repo (rebase first). No dependencies.
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const root = process.env.SITE_ROOT || path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const a = process.argv.slice(2); const arg = (k, d) => { const i = a.indexOf('--' + k); return i < 0 ? d : a[i + 1]; };
const key = arg('key'), name = arg('name'), bundle = arg('bundle'), blurb = arg('blurb'); const short = arg('short', blurb);
if (!key || !name || !bundle || !blurb) { console.error('need --key --name --bundle --blurb'); process.exit(2); }
const esc = (t) => t.replace(/&/g, '&amp;');
const N = esc(name), one = esc(name.split(':')[0].split(' ')[0]);
const subs = (s, pairs) => { for (const [from, to] of pairs) { if (!s.includes(from) && !(from instanceof RegExp)) throw new Error('template changed, missing: ' + String(from).slice(0, 60)); s = s.split(from).join(to); } return s; };
const rx = (s, re, to) => { if (!re.test(s)) throw new Error('template changed, no match: ' + re); return s.replace(re, to); };
function out(file, text) { const p = path.join(root, file); if (fs.existsSync(p) && !a.includes('--force')) { console.log('exists, kept:', file); return; } fs.writeFileSync(p, text); console.log('wrote', file); }

let p = fs.readFileSync(path.join(root, 'privacy-goldensling.html'), 'utf8');
p = subs(p, [['Golden Sling is provided', N + ' is provided'], ['Golden Sling', N], ['privacy-goldensling.html', `privacy-${key}.html`], ['com.equalinformation.goldensling.app', bundle]]);
p = rx(p, /It is a single-game app for iOS and Android: [^<]*?\. It is free to play/, `It is a single-game app for iOS and Android: ${blurb}. It is free to play`);
p = p.replace(/ It is part of the Arcforge World Heritage Games collection\./, '');
p = rx(p, /(<li>Game progress:[^]*?<\/li>\n)(\s*<li>Your Daily Hunt[^]*?<\/li>\n)(\s*<li>Your settings[^]*?<\/li>\n)/, (m, x, y, z) => `            <li>Your progress, statistics and streaks</li>\n            <li>Your settings and choices, such as sound, appearance and text size</li>\n`);
p = rx(p, /<li>Apply your settings and the slingshots[^]*?<\/li>\n\s*<li>Work out your Daily Hunt streak<\/li>/, '<li>Apply your settings and show your progress</li>');
p = p.replace(', including the Daily Hunt, which is chosen from the date on your device', ', and any daily puzzle is chosen from the date on your device');
p = p.replace('The Daily Hunt and the end-of-run screen have a Share button. When you tap it,', 'Where the app offers a Share button, when you tap it,');
out(`privacy-${key}.html`, p);

let s = fs.readFileSync(path.join(root, 'app-support-goldensling.html'), 'utf8');
s = subs(s, [['Golden Sling is part of Arcforge', 'Golden Sling is part of Arcforge']]);
s = rx(s, /<p>Golden Sling is an iOS and Android[^]*?(This version is free to play)/, `<p>${N} is an iOS and Android app: ${blurb}. $1`);
s = rx(s, /Get help with Golden Sling[^<]*</, `Get help with ${N}, ${esc(short)}.<`);
s = s.replace(/\n    <h3([^>]*)>Is /, '\n    <h3$1>Is ');
s = rx(s, /(<h3[^>]*>)How do I play\?<\/h3>\s*<p>[^]*?<\/p>\n\n\s*/, '');
s = rx(s, /\n\s*<h3[^>]*>What is the Daily Hunt\?<\/h3>\s*<p>[^]*?<\/p>\n/, '\n');
s = rx(s, /\n\s*<h3[^>]*>How do I unlock new slingshots and stones\?<\/h3>\s*<p>[^]*?<\/p>\n/, '\n');
s = rx(s, /\n\s*<h3[^>]*>What else is in the Arcforge collection\?<\/h3>\s*<p>[^]*?<\/p>\n/, '\n');
s = rx(s, /<h3([^>]*)>Does the game work without internet\?<\/h3>\s*<p>[^<]*<\/p>/, '<h3$1>Does the game work without internet?</h3>\n    <p>Yes. The game itself plays fully offline; only ads and purchase checks need a connection.</p>');
s = rx(s, /(<h3[^>]*>)What is Auto Play \(Watch &amp; Learn\)\?<\/h3>\s*<p>[^]*?<\/p>/, '$1How do I restore my purchase?</h3>\n    <p>Open the About page and tap Restore purchase. You need to be signed in to the same Apple ID (iPhone and iPad) or Google account (Android) that bought Remove ads.</p>');
s = subs(s, [['Golden Sling', N], ['privacy-goldensling.html', `privacy-${key}.html`]]);
out(`app-support-${key}.html`, s);
