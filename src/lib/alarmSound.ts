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

// ── Audio playback engine ────────────────────────────────────────
// Uses real WAV audio files from /sounds/ — no more fake beeps!
// Falls back to Web Audio synthesis only if files fail to load.

let currentAudio: HTMLAudioElement | null = null;
let loopTimer: ReturnType<typeof setTimeout> | null = null;

/** Stop any playing alarm. */
export function stopAlarm() {
  if (loopTimer) {
    clearTimeout(loopTimer);
    loopTimer = null;
  }
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio = null;
  }
}

// Backwards-compatible aliases.
export const stopAlarmSound = stopAlarm;

/**
 * Play a real alarm sound file, looping for a number of seconds.
 * The WAV files in /sounds/ are high-quality phone-style alarms.
 */
export function playAlarmTone(toneId: AlarmToneId, seconds = 13) {
  stopAlarm();

  if (typeof window === 'undefined') return;

  const audio = new Audio(`/sounds/${toneId}.wav`);
  audio.volume = 1.0;
  currentAudio = audio;

  const startTime = Date.now();

  const playLoop = () => {
    // Check if time's up
    if (Date.now() - startTime > seconds * 1000) {
      stopAlarm();
      return;
    }

    audio.play().catch(() => {
      // Autoplay blocked — fallback to Web Audio synthesis
      fallbackSynth(toneId, seconds);
    });
  };

  // When audio ends, loop it
  audio.addEventListener('ended', () => {
    if (Date.now() - startTime > seconds * 1000) {
      stopAlarm();
      return;
    }
    audio.currentTime = 0;
    audio.play().catch(() => {});
  });

  playLoop();

  // Safety: force stop after the requested time
  loopTimer = setTimeout(() => stopAlarm(), seconds * 1000 + 1000);
}

/** Preview a tone for a couple of seconds (for the tune picker). */
export function previewAlarmTone(toneId: AlarmToneId) {
  playAlarmTone(toneId, 2.4);
}

// Backwards-compatible alias.
export const startAlarmSound = () => playAlarmTone(DEFAULT_TONE, 13);

export function getAlarmTone(id?: string | null): AlarmTone {
  if (id && ALARM_TONES.some((t) => t.id === id)) return ALARM_TONES.find((t) => t.id === id)!;
  return ALARM_TONES[0];
}

// ── Fallback: Web Audio synthesis (only if WAV files fail) ───────
let ctx: AudioContext | null = null;

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

type OscType = OscillatorType;

function note(
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
}

function bell(c: AudioContext, freq: number, at: number, dur: number, gain: number) {
  note(c, freq, at, dur, { type: 'sine', gain });
  note(c, freq * 2.01, at, dur * 0.6, { type: 'sine', gain: gain * 0.4 });
  note(c, freq * 2.98, at, dur * 0.35, { type: 'sine', gain: gain * 0.25 });
}

function fallbackClassic(c: AudioContext, total: number) {
  const cycle = 1.6;
  const pattern = [0, 0.25, 0.6, 0.85];
  for (let s = 0; s < total; s += cycle) {
    pattern.forEach((p, i) => {
      const at = s + p;
      if (at < total) note(c, i % 2 === 0 ? 880 : 660, at, 0.18, { type: 'square', gain: 0.28 });
    });
  }
}

function fallbackBells(c: AudioContext, total: number) {
  const cycle = 2.6;
  for (let s = 0; s < total; s += cycle) {
    if (s < total) bell(c, 392, s, 1.1, 0.5);
    if (s + 1.3 < total) bell(c, 392, s + 1.3, 1.1, 0.5);
  }
}

function fallbackChime(c: AudioContext, total: number) {
  const cycle = 2.4;
  const notes = [523.25, 659.25, 783.99];
  for (let s = 0; s < total; s += cycle) {
    notes.forEach((f, i) => {
      const at = s + i * 0.35;
      if (at < total) bell(c, f, at, 0.9, 0.32);
    });
  }
}

function fallbackDigital(c: AudioContext, total: number) {
  const cycle = 1.0;
  for (let s = 0; s < total; s += cycle) {
    for (let i = 0; i < 4; i++) {
      const at = s + i * 0.22;
      if (at < total) note(c, 1046.5, at, 0.12, { type: 'square', gain: 0.22 });
    }
  }
}

function fallbackPraise(c: AudioContext, total: number) {
  const melody = [392, 440, 523.25, 659.25, 523.25, 440];
  const step = 0.45;
  const cycle = melody.length * step;
  for (let s = 0; s < total; s += cycle) {
    melody.forEach((f, i) => {
      const at = s + i * step;
      if (at < total) note(c, f, at, 0.4, { type: 'triangle', gain: 0.32 });
    });
  }
}

const FALLBACKS: Record<AlarmToneId, (c: AudioContext, total: number) => void> = {
  classic: fallbackClassic,
  bells: fallbackBells,
  chime: fallbackChime,
  digital: fallbackDigital,
  praise: fallbackPraise,
};

function fallbackSynth(toneId: AlarmToneId, seconds: number) {
  stopAlarm();
  const c = getCtx();
  if (!c) return;
  (FALLBACKS[toneId] ?? fallbackClassic)(c, seconds);
  loopTimer = setTimeout(() => stopAlarm(), seconds * 1000 + 500);
}
