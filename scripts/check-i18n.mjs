#!/usr/bin/env node
/**
 * `npm run check-i18n` — two jobs:
 *   1. Locale files: en/fr/es/pt must have exactly the same keys and the same {slots}.
 *   2. Hard-coded text: lists JSX text and placeholder/title/aria-label/alt strings that are still typed straight into a screen
 *      instead of coming from locales/*.json. It prints a report; it only fails (exit 1) with --strict.
 * Admin screens and the long legal / manual pages are skipped on purpose (see SKIP).
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const strict = process.argv.includes('--strict');

// ── 1. locale files ───────────────────────────────────────────────────────────
const LANGS = ['en', 'fr', 'es', 'pt'];
const loc = Object.fromEntries(LANGS.map((l) => [l, JSON.parse(readFileSync(join(ROOT, 'locales', `${l}.json`), 'utf8'))]));
const slots = (s) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',');
let problems = 0;
for (const l of LANGS.slice(1)) {
  for (const k of Object.keys(loc.en)) {
    if (!(k in loc[l])) { console.log(`missing  ${l}: ${k}`); problems++; }
    else if (slots(loc.en[k]) !== slots(loc[l][k])) { console.log(`slots    ${l}: ${k}`); problems++; }
    else if (!String(loc[l][k]).trim()) { console.log(`empty    ${l}: ${k}`); problems++; }
  }
  for (const k of Object.keys(loc[l])) if (!(k in loc.en)) { console.log(`extra    ${l}: ${k}`); problems++; }
}
console.log(`locales: ${Object.keys(loc.en).length} keys x ${LANGS.length} languages, ${problems} problem(s)\n`);

// ── 2. hard-coded text ────────────────────────────────────────────────────────
const SKIP = [
  /src\/app\/admin\//, /Admin[A-Z]\w*\.tsx$/, /src\/app\/manual\//, /src\/app\/(terms|privacy|community-guidelines|delete-account)\//,
  /LegalModal|PrivacyPolicy|LegalSections|layout\.tsx$|loading\.tsx$|global-error|not-found/,
];
function walk(dir, out = []) {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (p.endsWith('.tsx')) out.push(p);
  }
  return out;
}
const hits = [];
for (const file of walk(join(ROOT, 'src'))) {
  const rel = relative(ROOT, file);
  if (SKIP.some((r) => r.test(rel))) continue;
  const lines = readFileSync(file, 'utf8').split('\n');
  lines.forEach((line, i) => {
    const code = line.trim();
    if (code.startsWith('//') || code.startsWith('*') || code.startsWith('/*') || code.startsWith('import ')) return;
    let m;
    const attr = /\b(?:placeholder|title|aria-label|alt)="([^"{}]*[A-Za-z]{3,}[^"{}]*)"/g;
    while ((m = attr.exec(line))) hits.push([rel, i + 1, m[1]]);
    // text between tags:  >Some words<
    const text = />([^<>{}=]*[A-Za-z]{3,}[^<>{}=]*)</g;
    while ((m = text.exec(line))) {
      const t = m[1].trim();
      if (t && /[a-z]/.test(t) && !/^[\w./-]+$/.test(t) && !/[=()&|]/.test(t)) hits.push([rel, i + 1, t]);
    }
  });
}
const byFile = new Map();
for (const [f, l, t] of hits) (byFile.get(f) ?? byFile.set(f, []).get(f)).push([l, t]);
for (const [f, items] of [...byFile].sort((a, b) => b[1].length - a[1].length)) {
  console.log(`${String(items.length).padStart(3)}  ${f}`);
  if (process.argv.includes('--verbose')) for (const [l, t] of items) console.log(`       ${l}: ${t.slice(0, 90)}`);
}
console.log(`\nhard-coded text left: ${hits.length} in ${byFile.size} files (run with --verbose to see each one)`);

// ── 3. English sentences inside code (informational) ─────────────────────────
// Data lists (Bible verses, Wisdom teachings, legal text), admin screens and server replies are expected to stay English for now.
const DATA = [/src\/app\/data\//, /src\/app\/api\//, /src\/lib\/(bible|i18n)/, /\.test\./, /src\/lib\/(planConfig|videos|groupsDb|alerts|featuredAdmin|subscriptionRules|playBilling|premiumVoice|alarmContent|alarmSound|reminders|voiceConfig)\.ts$/];
const sentence = /(?<![\w.])(['"`])([A-Z][^'"`\n]{12,}?)\1/g;
const inCode = new Map();
const walkTs = (dir, out = []) => { for (const n of readdirSync(dir)) { const p = join(dir, n); if (statSync(p).isDirectory()) walkTs(p, out); else if (/\.tsx?$/.test(p)) out.push(p); } return out; };
for (const file of walkTs(join(ROOT, 'src'))) {
  const rel = relative(ROOT, file);
  if (SKIP.some((r) => r.test(rel)) || DATA.some((r) => r.test(rel))) continue;
  let n = 0;
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const code = line.trim();
    if (code.startsWith('//') || code.startsWith('*') || code.startsWith('import ')) continue;
    for (const m of line.matchAll(sentence)) if (m[2].includes(' ') && !/[{}]|https?:|\.(tsx?|png|jpg|css)/.test(m[2]) && !/className/.test(line.slice(Math.max(0, m.index - 30), m.index))) n++;
  }
  if (n) inCode.set(rel, n);
}
console.log(`\nEnglish sentences left inside code (outside the expected data/admin files): ${[...inCode.values()].reduce((a, b) => a + b, 0)} in ${inCode.size} files`);
for (const [f, n] of [...inCode].sort((a, b) => b[1] - a[1]).slice(0, 15)) console.log(`${String(n).padStart(3)}  ${f}`);
process.exit(problems || (strict && hits.length) ? 1 : 0);
