import assert from 'node:assert/strict';
import {
  addEntry, answered, editText, journalStats, parseJournal, removeEntry, serializeJournal, setAnswered, testimonyText,
  waitedLabel, waiting, MAX_ENTRIES, MAX_TEXT,
} from '../src/lib/prayerJournal.ts';
import { wrapLines, fitFontSize } from '../src/lib/cardLayout.ts';

// ── journal ──
const t0 = new Date('2026-01-01T10:00:00Z');
let j = addEntry([], '  Heal my mother  ', t0);
assert.equal(j.length, 1);
assert.equal(j[0].text, 'Heal my mother');
assert.equal(addEntry(j, '   '), j, 'empty text ignored');
j = addEntry(j, 'A job', new Date('2026-01-05T10:00:00Z'));
assert.equal(j[0].text, 'A job', 'newest on top');
assert.equal(new Set(j.map((e) => e.id)).size, 2);
assert.deepEqual(journalStats(j), { total: 2, answered: 0, waiting: 2 });

// answering
const id = j[1].id;
j = setAnswered(j, id, true, ' She is healed ', new Date('2026-03-15T10:00:00Z'));
assert.equal(answered(j).length, 1);
assert.equal(waiting(j).length, 1);
assert.equal(answered(j)[0].answerNote, 'She is healed');
assert.equal(waitedLabel(answered(j)[0]), '2 months');
assert.match(testimonyText(answered(j)[0]), /I prayed: Heal my mother\n\nGod answered: She is healed\n\nIt took 2 months/);
assert.doesNotMatch(testimonyText(answered(j)[0]), /@|name/i);
// answered without a note
const n = setAnswered(addEntry([], 'Peace', t0), addEntry([], 'x')[0].id, true);
assert.equal(n[0].answeredAt, undefined, 'unknown id changes nothing');
// back to waiting clears the answer
j = setAnswered(j, id, false);
assert.equal(answered(j).length, 0);
assert.equal(j.find((e) => e.id === id)!.answerNote, undefined);
// edit + remove
j = editText(j, id, 'Heal my mother fully');
assert.equal(j.find((e) => e.id === id)!.text, 'Heal my mother fully');
assert.equal(editText(j, id, ' '), j);
j = removeEntry(j, id);
assert.equal(j.length, 1);

// waited labels
const mk = (days: number) => ({ id: 'a', text: 't', createdAt: '2026-01-01T00:00:00Z', answeredAt: new Date(Date.parse('2026-01-01T00:00:00Z') + days * 86400000).toISOString() });
assert.equal(waitedLabel(mk(0)), 'the same day');
assert.equal(waitedLabel(mk(1)), '1 day');
assert.equal(waitedLabel(mk(5)), '5 days');
assert.equal(waitedLabel(mk(30)), '4 weeks');
assert.equal(waitedLabel(mk(180)), '6 months');
assert.match(testimonyText(mk(0)), /God answered this prayer!/);
assert.doesNotMatch(testimonyText(mk(0)), /It took/);

// storage round trip and damaged data
assert.deepEqual(parseJournal(serializeJournal(j)), j);
assert.deepEqual(parseJournal(null), []);
assert.deepEqual(parseJournal('not json'), []);
assert.deepEqual(parseJournal('{"a":1}'), []);
assert.deepEqual(parseJournal(JSON.stringify([{ text: 'x' }, null, 5, { id: 'q', text: 'ok', createdAt: 'nope' }])), []);
const ok = parseJournal(JSON.stringify([{ id: 'q', text: 'ok', createdAt: '2026-01-01T00:00:00Z', answeredAt: 'garbage' }]));
assert.equal(ok.length, 1);
assert.equal(ok[0].answeredAt, undefined);
assert.equal(parseJournal(JSON.stringify([{ id: 'q', text: 'x'.repeat(5000), createdAt: '2026-01-01T00:00:00Z' }]))[0].text.length, MAX_TEXT);
let many: ReturnType<typeof addEntry> = [];
for (let i = 0; i < MAX_ENTRIES + 20; i++) many = addEntry(many, `p${i}`, new Date(t0.getTime() + i));
assert.equal(many.length, MAX_ENTRIES);

// ── picture layout ──
const m = (t: string) => t.length * 10; // 10px per character
assert.deepEqual(wrapLines(m, 'one two three four', 100), ['one two', 'three four']);
assert.deepEqual(wrapLines(m, '', 100), []);
assert.deepEqual(wrapLines(m, 'abcdefghijklmnopqrstuvwxyz', 100), ['abcdefghij', 'klmnopqrst', 'uvwxyz']);
assert.ok(wrapLines(m, 'word '.repeat(50), 120).every((l) => m(l) <= 120));
const fit = fitFontSize((s) => (t) => t.length * s * 0.5, 'For God so loved the world that he gave his only begotten Son', 800, 500);
assert.ok(fit.size >= 30 && fit.lines.length * fit.size * 1.32 <= 500);
const long = fitFontSize((s) => (t) => t.length * s * 0.5, 'word '.repeat(400), 800, 500);
assert.equal(long.size, 30);
assert.ok(long.lines[long.lines.length - 1].endsWith('…'), 'very long text is cut with an ellipsis');
assert.ok(long.lines.length * 30 * 1.32 <= 500);

console.log('journal + card layout: all checks passed');
