'use client';

let currentCtx: AudioContext | null = null;
let stopTimer: number | null = null;

/** Stop any currently-playing alarm. */
export function stopAlarmSound() {
  if (stopTimer) {
    clearTimeout(stopTimer);
    stopTimer = null;
  }
  if (currentCtx) {
    currentCtx.close().catch(() => {});
    currentCtx = null;
  }
}

/**
 * Play a repeating two-tone "phone alarm" ring for a fixed duration.
 * While the app is open, this gives an audible alarm; the system notification
 * (in PrayerAlarm) also triggers the phone's own notification tone.
 */
export function startAlarmSound() {
  if (typeof window === 'undefined') return;
  stopAlarmSound();

  const AC = window.AudioContext || (window as any).webkitAudioContext;
  if (!AC) return;
  const ctx = new AC();
  currentCtx = ctx;

  const beep = (freq: number, offset: number, duration: number) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.value = freq;
    osc.connect(gain);
    gain.connect(ctx.destination);

    const t = ctx.currentTime + offset;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.35, t + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);

    osc.start(t);
    osc.stop(t + duration + 0.05);
  };

  // Classic two-tone alarm: high-low-high-low, repeated like a phone ring.
  const pattern = [0, 0.25, 0.6, 0.85];
  const cycle = 1.6; // seconds per cycle
  const cycles = 8; // ~13 seconds of ringing

  for (let c = 0; c < cycles; c++) {
    const offset = c * cycle;
    for (let i = 0; i < pattern.length; i++) {
      const freq = i % 2 === 0 ? 880 : 660;
      beep(freq, offset + pattern[i], 0.18);
    }
  }

  stopTimer = window.setTimeout(() => stopAlarmSound(), cycles * cycle * 1000 + 500);
}
