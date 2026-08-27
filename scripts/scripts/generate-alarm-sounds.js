/**
 * Generates WAV audio files for each prayer alarm tone.
 * These sound like real phone alarms — not synthesized beeps.
 * Run: node scripts/generate-alarm-sounds.js
 */
const fs = require('fs');
const path = require('path');

const SAMPLE_RATE = 44100;
const DURATION = 5; // seconds per tone

function writeWav(filename, samples) {
  const numSamples = samples.length;
  const byteRate = SAMPLE_RATE * 2; // 16-bit mono
  const blockAlign = 2;
  const dataSize = numSamples * 2;
  const buf = Buffer.alloc(44 + dataSize);

  // RIFF header
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + dataSize, 4);
  buf.write('WAVE', 8);

  // fmt chunk
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16); // chunk size
  buf.writeUInt16LE(1, 20);  // PCM
  buf.writeUInt16LE(1, 22);  // mono
  buf.writeUInt32LE(SAMPLE_RATE, 24);
  buf.writeUInt32LE(byteRate, 28);
  buf.writeUInt16LE(blockAlign, 30);
  buf.writeUInt16LE(16, 32); // bits per sample

  // data chunk
  buf.write('data', 36);
  buf.writeUInt32LE(dataSize, 40);

  for (let i = 0; i < numSamples; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    buf.writeInt16LE(Math.round(s * 32767), 44 + i * 2);
  }

  fs.writeFileSync(filename, buf);
}

// ── Envelope helpers ────────────────────────────────────────────
function envelope(t, attack, decay, sustain, release, total) {
  if (t < attack) return t / attack;
  if (t < attack + decay) return 1 - (1 - sustain) * ((t - attack) / decay);
  if (t < total - release) return sustain;
  return sustain * ((total - t) / release);
}

// ── Classic Phone Ring ──────────────────────────────────────────
// Real phone ring: alternating 440Hz/480Hz, cadence pattern
function classicPhone() {
  const samples = new Float32Array(SAMPLE_RATE * DURATION);
  for (let i = 0; i < samples.length; i++) {
    const t = i / SAMPLE_RATE;
    // Ring cadence: 2s on, 4s off, repeating
    const cycle = t % 6;
    const isOn = cycle < 2;
    if (!isOn) { samples[i] = 0; continue; }
    // Alternating dual tone (real phone ring)
    const phase = Math.floor(cycle * 8); // switch 8 times per second
    const freq = phase % 2 === 0 ? 440 : 480;
    const val = 0.35 * Math.sin(2 * Math.PI * freq * t);
    // Add slight warble for realism
    const warble = 0.05 * Math.sin(2 * Math.PI * 6 * t);
    samples[i] = (val + warble) * envelope(cycle, 0.01, 0.1, 0.9, 0.05, 2);
  }
  return samples;
}

// ── Church Bells ────────────────────────────────────────────────
// Metallic bell: fundamental + inharmonic partials with decay
function churchBells() {
  const samples = new Float32Array(SAMPLE_RATE * DURATION);
  for (let i = 0; i < samples.length; i++) {
    const t = i / SAMPLE_RATE;
    // Bell strikes at t=0, t=1.5, t=3, t=4
    let val = 0;
    const strikes = [0, 1.5, 3, 4];
    for (const s of strikes) {
      if (t < s) continue;
      const dt = t - s;
      if (dt > 1.8) continue;
      const decay = Math.exp(-dt * 2.5);
      // Bell partials (inharmonic = metallic sound)
      val += decay * 0.30 * Math.sin(2 * Math.PI * 392 * dt);  // G4
      val += decay * 0.20 * Math.sin(2 * Math.PI * 786 * dt);  // ~G5
      val += decay * 0.12 * Math.sin(2 * Math.PI * 1180 * dt); // inharmonic
      val += decay * 0.08 * Math.sin(2 * Math.PI * 1575 * dt); // inharmonic
      val += decay * 0.05 * Math.sin(2 * Math.PI * 2360 * dt); // high partial
    }
    samples[i] = Math.max(-1, Math.min(1, val));
  }
  return samples;
}

// ── Soft Chime ─────────────────────────────────────────────────
// Gentle ascending 3-note chime (like a meditation timer)
function softChime() {
  const samples = new Float32Array(SAMPLE_RATE * DURATION);
  for (let i = 0; i < samples.length; i++) {
    const t = i / SAMPLE_RATE;
    let val = 0;
    // Three gentle notes, staggered
    const notes = [
      { start: 0, freq: 523.25 },    // C5
      { start: 0.8, freq: 659.25 },   // E5
      { start: 1.6, freq: 783.99 },   // G5
      { start: 2.8, freq: 523.25 },   // C5 (repeat)
      { start: 3.6, freq: 659.25 },   // E5
      { start: 4.4, freq: 783.99 },   // G5
    ];
    for (const n of notes) {
      if (t < n.start) continue;
      const dt = t - n.start;
      if (dt > 1.2) continue;
      const decay = Math.exp(-dt * 3);
      // Bell-like tone with soft partials
      val += decay * 0.25 * Math.sin(2 * Math.PI * n.freq * dt);
      val += decay * 0.10 * Math.sin(2 * Math.PI * n.freq * 2.01 * dt);
      val += decay * 0.04 * Math.sin(2 * Math.PI * n.freq * 3.01 * dt);
    }
    samples[i] = Math.max(-1, Math.min(1, val));
  }
  return samples;
}

// ── Digital Beep ────────────────────────────────────────────────
// Like a real digital alarm clock: sharp beeps with gaps
function digitalBeep() {
  const samples = new Float32Array(SAMPLE_RATE * DURATION);
  for (let i = 0; i < samples.length; i++) {
    const t = i / SAMPLE_RATE;
    // Pattern: 3 short beeps, pause, repeat
    const cycle = t % 1.5;
    const isBeep = (cycle < 0.12) || (cycle > 0.2 && cycle < 0.32) || (cycle > 0.4 && cycle < 0.52);
    if (!isBeep) { samples[i] = 0; continue; }
    // Sharp digital square-ish tone at 1000Hz
    const phase = (1000 * t) % 1;
    const val = phase < 0.5 ? 0.3 : -0.3;
    // Add second harmonic for richness
    const val2 = 0.1 * Math.sin(2 * Math.PI * 2000 * t);
    samples[i] = val + val2;
  }
  return samples;
}

// ── Morning Praise ──────────────────────────────────────────────
// Uplifting melody like a sunrise alarm
function morningPraise() {
  const samples = new Float32Array(SAMPLE_RATE * DURATION);
  // A simple uplifting melody: C E G C(up) G E C
  const melody = [
    { freq: 523.25, start: 0, dur: 0.5 },    // C5
    { freq: 659.25, start: 0.5, dur: 0.5 },   // E5
    { freq: 783.99, start: 1.0, dur: 0.5 },   // G5
    { freq: 1046.5, start: 1.5, dur: 0.7 },   // C6
    { freq: 783.99, start: 2.3, dur: 0.5 },   // G5
    { freq: 659.25, start: 2.8, dur: 0.5 },   // E5
    { freq: 523.25, start: 3.3, dur: 0.7 },   // C5
    // Repeat
    { freq: 523.25, start: 4.2, dur: 0.5 },   // C5
    { freq: 659.25, start: 4.7, dur: 0.5 },   // E5
  ];
  for (let i = 0; i < samples.length; i++) {
    const t = i / SAMPLE_RATE;
    let val = 0;
    for (const n of melody) {
      if (t < n.start) continue;
      const dt = t - n.start;
      if (dt > n.dur + 0.3) continue;
      const env = envelope(dt, 0.02, 0.1, 0.6, 0.3, n.dur + 0.3);
      // Warm tone (triangle + slight sine)
      val += env * 0.20 * Math.sin(2 * Math.PI * n.freq * t);
      val += env * 0.08 * Math.sin(2 * Math.PI * n.freq * 2.01 * t);
      val += env * 0.03 * Math.sin(2 * Math.PI * n.freq * 3.01 * t);
    }
    samples[i] = Math.max(-1, Math.min(1, val));
  }
  return samples;
}

// ── Generate all ────────────────────────────────────────────────
const outDir = path.join(__dirname, '..', 'public', 'sounds');
fs.mkdirSync(outDir, { recursive: true });

const tones = [
  { name: 'classic', fn: classicPhone },
  { name: 'bells', fn: churchBells },
  { name: 'chime', fn: softChime },
  { name: 'digital', fn: digitalBeep },
  { name: 'praise', fn: morningPraise },
];

for (const tone of tones) {
  const filename = path.join(outDir, `${tone.name}.wav`);
  writeWav(filename, tone.fn());
  const size = fs.statSync(filename).size;
  console.log(`✅ ${tone.name}.wav (${(size / 1024).toFixed(0)} KB)`);
}

console.log('\nDone! All alarm sounds generated.');
