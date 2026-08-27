'use client';

export type AlarmToneId = 'classic' | 'bells' | 'chime' | 'digital' | 'praise';

export interface AlarmTone {
  id: AlarmToneId;
  name: string;
  emoji: string;
  description: string;
}

export const ALARM_TONES: AlarmTone[] = [
  { id: 'classic', name: 'Classic Phone', emoji: '🔔', description: 'The classic two-tone phone ring' },
  { id: 'bells', name: 'Church Bells', emoji: '⛪', description: 'Deep, ringing church bells' },
  { id: 'chime', name: 'Soft Chime', emoji: '🕊️', description: 'A gentle, peaceful chime' },
  { id: 'digital', name: 'Digital Beep', emoji: '📟', description: 'Fast electronic beeps' },
  { id: 'praise', name: 'Morning Praise', emoji: '🎵', description: 'A short uplifting melody' },
];

export const DEFAULT_TONE: AlarmToneId = 'classic';

// ═══════════════════════════════════════════════════════════════════
// Web Audio API engine — the ONLY reliable way to play sound on
// mobile phones. HTMLAudioElement.play() is blocked on iOS Safari
// and many Android browsers. AudioContext works everywhere once
// unlocked by a user gesture.
// ═══════════════════════════════════════════════════════════════════

let ctx: AudioContext | null = null;
const bufferCache: Record<string, AudioBuffer> = {};
let activeSources: (AudioBufferSourceNode | OscillatorNode)[] = [];
let stopTimer: ReturnType<typeof setTimeout> | null = null;

/** Get or create the AudioContext. Must be called from a user gesture. */
function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AC =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  if (!ctx) ctx = new AC();
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

/** Fetch and decode a WAV file into an AudioBuffer. Caches the result. */
async function getBuffer(toneId: string): Promise<AudioBuffer | null> {
  if (bufferCache[toneId]) return bufferCache[toneId];

  const c = getCtx();
  if (!c) return null;

  try {
    const response = await fetch(`/sounds/${toneId}.wav`);
    if (!response.ok) return null;
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await c.decodeAudioData(arrayBuffer);
    bufferCache[toneId] = audioBuffer;
    return audioBuffer;
  } catch (err) {
    console.warn(`[AlarmSound] Failed to load ${toneId}.wav:`, err);
    return null;
  }
}

/** Stop all playing alarm sounds. */
export function stopAlarm() {
  if (stopTimer) {
    clearTimeout(stopTimer);
    stopTimer = null;
  }
  for (const source of activeSources) {
    try { source.stop(); } catch { /* already stopped */ }
    try { source.disconnect(); } catch { /* already disconnected */ }
  }
  activeSources = [];
}

// Backwards-compatible alias.
export const stopAlarmSound = stopAlarm;

/**
 * Play an alarm tone for a given number of seconds, looping the WAV file.
 *
 * Uses Web Audio API (AudioContext + decodeAudioData) which works on ALL
 * mobile browsers including iOS Safari and Android Chrome.
 * Falls back to Web Audio synthesis if the WAV file can't be loaded.
 */
/**
 * Play an alarm tone continuously until the user calls stopAlarm().
 *
 * If seconds is provided (for preview), it auto-stops after that time.
 * If seconds is 0 or undefined (real alarm), it rings FOREVER until
 * the user taps Stop / Dismiss.
 *
 * Uses Web Audio API (AudioContext + decodeAudioData) which works on ALL
 * mobile browsers including iOS Safari and Android Chrome.
 * Falls back to Web Audio synthesis if the WAV file can't be loaded.
 */
export async function playAlarmTone(toneId: AlarmToneId, seconds = 0) {
  stopAlarm();

  const c = getCtx();
  if (!c) return;

  // Try to load the real WAV file first
  const buffer = await getBuffer(toneId);

  if (buffer) {
    // ✅ Play the real WAV file via AudioBufferSourceNode
    playBufferLoop(c, buffer, seconds);
  } else {
    // ❌ WAV file failed — fallback to synthesized tone
    synthTone(c, toneId, seconds);
  }

  // Auto-stop after requested time (for previews only)
  if (seconds > 0) {
    stopTimer = setTimeout(() => stopAlarm(), seconds * 1000 + 500);
  }
  // If seconds === 0: alarm rings FOREVER until stopAlarm() is called
}

/** Play an AudioBuffer in a loop. If seconds=0, loops forever until stopAlarm(). */
function playBufferLoop(c: AudioContext, buffer: AudioBuffer, seconds: number) {
  const startTime = c.currentTime;
  const duration = buffer.duration;
  const isEndless = seconds <= 0;

  // For endless: schedule 30 seconds of loops, then re-schedule more
  // For timed: schedule exactly enough loops
  const scheduleDuration = isEndless ? 30 : seconds;
  const maxTime = startTime + scheduleDuration;

  let offset = 0;
  while (startTime + offset < maxTime) {
    const source = c.createBufferSource();
    source.buffer = buffer;
    source.connect(c.destination);

    const when = startTime + offset;
    const remaining = maxTime - when;
    const clipDuration = Math.min(duration, remaining);

    source.start(when, 0, clipDuration);
    activeSources.push(source);
    offset += duration;
  }

  // If endless, keep re-scheduling every 30 seconds
  if (isEndless) {
    const keepAlive = () => {
      if (activeSources.length === 0) return; // stopped by user
      const now = c.currentTime;
      const nextEnd = now + 30;
      // Find where the last scheduled source ends
      let nextOffset = 0;
      // Schedule more loops from now+30 to now+60
      const startFrom = now + 29; // overlap slightly to avoid gap
      const endAt = now + 60;
      let pos = startFrom;
      while (pos < endAt) {
        const source = c.createBufferSource();
        source.buffer = buffer;
        source.connect(c.destination);
        const remaining = endAt - pos;
        const clipDur = Math.min(duration, remaining);
        source.start(pos, 0, clipDur);
        activeSources.push(source);
        pos += duration;
      }
      // Schedule next re-schedule
      stopTimer = setTimeout(keepAlive, 25000);
    };
    stopTimer = setTimeout(keepAlive, 25000);
  }
}

/**
 * Preload all alarm sounds into memory. Call this once after any user
 * interaction (e.g. first tap on the page). After this, all sounds
 * play instantly with zero delay.
 */
export async function preloadAlarmSounds() {
  const c = getCtx();
  if (!c) return;
  // Load all 5 WAV files in parallel
  const promises = ALARM_TONES.map((tone) => getBuffer(tone.id));
  await Promise.allSettled(promises);
}

/** Preview a tone for a couple of seconds (for the tune picker). */
export function previewAlarmTone(toneId: AlarmToneId) {
  playAlarmTone(toneId, 2.4);
}

// Backwards-compatible alias — rings endlessly.
export const startAlarmSound = () => playAlarmTone(DEFAULT_TONE);

export function getAlarmTone(id?: string | null): AlarmTone {
  if (id && ALARM_TONES.some((t) => t.id === id)) return ALARM_TONES.find((t) => t.id === id)!;
  return ALARM_TONES[0];
}

// ═══════════════════════════════════════════════════════════════════
// Fallback: Web Audio synthesis (only if WAV files can't load)
// ═══════════════════════════════════════════════════════════════════

type OscType = OscillatorType;

function sNote(
  c: AudioContext,
  freq: number,
  at: number,
  dur: number,
  opts: { type?: OscType; gain?: number; decay?: number } = {}
) {
  const type = opts.type ?? 'sine';
  const gainVal = opts.gain ?? 0.3;
  const decay = opts.decay ?? dur;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  osc.connect(g);
  g.connect(c.destination);
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(gainVal, at + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, at + decay);
  osc.start(at);
  osc.stop(at + decay + 0.05);
  activeSources.push(osc);
}

function sBell(c: AudioContext, freq: number, at: number, dur: number, gain: number) {
  sNote(c, freq, at, dur, { type: 'sine', gain });
  sNote(c, freq * 2.01, at, dur * 0.6, { type: 'sine', gain: gain * 0.4 });
  sNote(c, freq * 2.98, at, dur * 0.35, { type: 'sine', gain: gain * 0.25 });
}

function synthTone(c: AudioContext, toneId: AlarmToneId, seconds: number) {
  const now = c.currentTime;
  // If seconds=0 (endless), schedule 5 minutes of synth, re-schedule later
  const duration = seconds > 0 ? seconds : 300;
  const end = now + duration;

  if (toneId === 'classic') {
    const cycle = 1.6;
    const pattern = [0, 0.25, 0.6, 0.85];
    for (let s = now; s < end; s += cycle) {
      pattern.forEach((p, i) => {
        const at = s + p;
        if (at < end) sNote(c, i % 2 === 0 ? 880 : 660, at, 0.18, { type: 'square', gain: 0.28 });
      });
    }
  } else if (toneId === 'bells') {
    const cycle = 2.6;
    for (let s = now; s < end; s += cycle) {
      if (s < end) sBell(c, 392, s, 1.1, 0.5);
      if (s + 1.3 < end) sBell(c, 392, s + 1.3, 1.1, 0.5);
    }
  } else if (toneId === 'chime') {
    const cycle = 2.4;
    const notes = [523.25, 659.25, 783.99];
    for (let s = now; s < end; s += cycle) {
      notes.forEach((f, i) => {
        const at = s + i * 0.35;
        if (at < end) sBell(c, f, at, 0.9, 0.32);
      });
    }
  } else if (toneId === 'digital') {
    const cycle = 1.0;
    for (let s = now; s < end; s += cycle) {
      for (let i = 0; i < 4; i++) {
        const at = s + i * 0.22;
        if (at < end) sNote(c, 1046.5, at, 0.12, { type: 'square', gain: 0.22 });
      }
    }
  } else if (toneId === 'praise') {
    const melody = [392, 440, 523.25, 659.25, 523.25, 440];
    const step = 0.45;
    const cycle = melody.length * step;
    for (let s = now; s < end; s += cycle) {
      melody.forEach((f, i) => {
        const at = s + i * step;
        if (at < end) sNote(c, f, at, 0.4, { type: 'triangle', gain: 0.32 });
      });
    }
  }
}
