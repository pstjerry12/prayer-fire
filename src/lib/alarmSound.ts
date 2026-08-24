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

// ── Preload audio cache ──────────────────────────────────────────
// We preload all sounds on first user interaction so they play instantly.
const audioCache: Record<string, HTMLAudioElement> = {};
let preloaded = false;

/** Preload all alarm sounds into memory. Call once after first user tap. */
function preloadAll() {
  if (preloaded || typeof window === 'undefined') return;
  preloaded = true;
  for (const tone of ALARM_TONES) {
    try {
      const audio = new Audio(`/sounds/${tone.id}.wav`);
      audio.preload = 'auto';
      audio.volume = 1.0;
      // Kick off the download
      audio.load();
      audioCache[tone.id] = audio;
    } catch {
      // ignore
    }
  }
}

// ── Audio playback engine ────────────────────────────────────────
let currentAudio: HTMLAudioElement | null = null;
let loopTimer: ReturnType<typeof setTimeout> | null = null;
let isPlaying = false;

/** Stop any playing alarm. */
export function stopAlarm() {
  isPlaying = false;
  if (loopTimer) {
    clearTimeout(loopTimer);
    loopTimer = null;
  }
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio = null;
  }
  // Also stop any cached audio that might be playing
  for (const key of Object.keys(audioCache)) {
    try {
      audioCache[key].pause();
      audioCache[key].currentTime = 0;
    } catch {
      // ignore
    }
  }
}

// Backwards-compatible aliases.
export const stopAlarmSound = stopAlarm;

/**
 * Play a real alarm sound file, looping for a number of seconds.
 *
 * Strategy:
 * 1. If the sound is already cached and ready → play immediately
 * 2. If not cached → create new Audio, wait for 'canplay', then play
 * 3. If Audio fails entirely → fallback to Web Audio synthesis
 * 4. Preload all other sounds in the background for next time
 */
export function playAlarmTone(toneId: AlarmToneId, seconds = 13) {
  stopAlarm();
  isPlaying = true;

  if (typeof window === 'undefined') return;

  // Preload all sounds on first use
  preloadAll();

  const startTime = Date.now();
  const maxMs = seconds * 1000;

  // Try to get cached audio, or create a new one
  let audio: HTMLAudioElement;

  if (audioCache[toneId]) {
    // Use preloaded audio — it's already in memory
    audio = audioCache[toneId];
    audio.currentTime = 0;
    audio.volume = 1.0;
  } else {
    // Not cached yet — create and cache it
    audio = new Audio(`/sounds/${toneId}.wav`);
    audio.preload = 'auto';
    audio.volume = 1.0;
    audioCache[toneId] = audio;
  }

  currentAudio = audio;

  // Loop handler: when audio ends, restart it
  const onEnded = () => {
    if (!isPlaying) return;
    if (Date.now() - startTime > maxMs) {
      stopAlarm();
      return;
    }
    audio.currentTime = 0;
    audio.play().catch(() => {});
  };

  audio.addEventListener('ended', onEnded);

  // Try to play immediately
  const playPromise = audio.play();

  if (playPromise) {
    playPromise.catch(() => {
      // Autoplay was blocked — try resuming after a tiny delay
      // (sometimes the browser just needs a microtask)
      setTimeout(() => {
        if (!isPlaying) return;
        audio.play().catch(() => {
          // Still blocked — fallback to Web Audio synthesis
          if (isPlaying) fallbackSynth(toneId, seconds);
        });
      }, 50);
    });
  }

  // Safety: force stop after the requested time
  loopTimer = setTimeout(() => {
    audio.removeEventListener('ended', onEnded);
    stopAlarm();
  }, maxMs + 500);
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
