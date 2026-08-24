'use client';

import { useState } from 'react';

export const playChime = () => {
  if (typeof window === 'undefined') return;
  const AC = window.AudioContext || (window as any).webkitAudioContext;
  if (!AC) return;
  const ctx = new AC();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.frequency.value = 880;
  gain.gain.setValueAtTime(0.3, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.5);
};

// A single trumpet note — bright, brassy, with natural vibrato and a punchy
// attack, like a real brass fanfare.
function trumpetNote(
  ctx: AudioContext,
  freq: number,
  at: number,
  dur: number,
  gainVal: number,
  pan = 0
) {
  // Rich harmonic source (sawtooth) → gives the "brass" edge.
  const osc = ctx.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.value = freq;

  // Lowpass warms the harsh highs into a rounded trumpet body.
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 2400 + freq * 1.6;
  filter.Q.value = 1;

  // Subtle vibrato — an LFO wobbles the pitch slightly, like a player's lip.
  const lfo = ctx.createOscillator();
  lfo.type = 'sine';
  lfo.frequency.value = 5.2;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = freq * 0.008;
  lfo.connect(lfoGain);
  lfoGain.connect(osc.frequency);

  // Brass envelope: crisp attack, held body, clean release.
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(gainVal, at + 0.025);
  gain.gain.setValueAtTime(gainVal, at + dur * 0.65);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + dur);

  let destination: AudioNode = ctx.destination;
  if (pan !== 0 && ctx.createStereoPanner) {
    const panner = ctx.createStereoPanner();
    panner.pan.value = pan;
    panner.connect(ctx.destination);
    destination = panner;
  }

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(destination);

  osc.start(at);
  osc.stop(at + dur + 0.05);
  lfo.start(at);
  lfo.stop(at + dur + 0.05);
}

// A triumphant celebratory trumpet fanfare (~3.5 seconds):
//   — a bold ascending fanfare (C → E → G → high C)
//   — a quick reprise phrase
//   — a final held C-major chord to crown the moment.
export const playCelebration = () => {
  if (typeof window === 'undefined') return;
  const AC = window.AudioContext || (window as any).webkitAudioContext;
  if (!AC) return;
  const ctx = new AC();
  const now = ctx.currentTime;

  const C5 = 523.25;
  const E5 = 659.25;
  const G5 = 783.99;
  const C6 = 1046.5;

  // [freq, startOffset, duration, gain]
  const fanfare: [number, number, number, number][] = [
    // Opening "ta-da" fanfare
    [C5, 0.0, 0.22, 0.34],
    [C5, 0.22, 0.22, 0.34],
    [E5, 0.44, 0.22, 0.34],
    [G5, 0.66, 0.46, 0.36], // held
    // Reprise, climbing higher
    [E5, 1.16, 0.2, 0.32],
    [G5, 1.36, 0.2, 0.34],
    [C6, 1.56, 0.62, 0.4], // triumphant high C, held
    // Resolution descent
    [G5, 2.2, 0.2, 0.32],
    [E5, 2.4, 0.2, 0.3],
    [C5, 2.6, 0.55, 0.34], // land home
  ];

  fanfare.forEach(([f, t, d, g]) => trumpetNote(ctx, f, now + t, d, g));

  // Final celebratory C-major chord (C5, E5, G5, C6) held together.
  const chord = [C5, E5, G5, C6];
  chord.forEach((f, i) => trumpetNote(ctx, f, now + 3.15, 1.0, 0.26, i % 2 === 0 ? -0.2 : 0.2));
};

export const speakText = (text: string) => {
  if (typeof window === 'undefined') return;
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
  }
};

export const stopSpeech = () => {
  if (typeof window === 'undefined') return;
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
};

interface SpeechRecognitionType extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: any) => void) | null;
  onerror: ((event: any) => void) | null;
  onend: (() => void) | null;
}

export function getSpeechRecognition(): SpeechRecognitionType | null {
  if (typeof window === 'undefined') return null;
  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (!SpeechRecognition) return null;
  const recognition = new SpeechRecognition() as SpeechRecognitionType;
  recognition.lang = 'en-US';
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  return recognition;
}

export function useSpeechToText(onResult: (text: string) => void) {
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startListening = () => {
    const recognition = getSpeechRecognition();
    if (!recognition) {
      setError('Speech recognition is not supported in this browser.');
      return;
    }
    setError(null);
    setIsListening(true);
    recognition.onresult = (event: any) => {
      const transcript = event.results?.[0]?.[0]?.transcript || '';
      onResult(transcript);
    };
    recognition.onerror = (event: any) => {
      setError(event.error || 'Speech recognition error');
      setIsListening(false);
    };
    recognition.onend = () => {
      setIsListening(false);
    };
    recognition.start();
  };

  const stopListening = () => {
    const recognition = getSpeechRecognition();
    if (recognition) recognition.abort();
    setIsListening(false);
  };

  return { isListening, error, startListening, stopListening };
}
