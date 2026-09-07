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

// A single hand-clap impulse: a short burst of filtered noise. Real claps
// are broadband transients (not a tone), so this is noise shaped by a
// bandpass filter — the filter's center frequency and the clap's length are
// randomized per-call so hundreds of them layered together don't sound like
// one clap on a loop.
function clap(ctx: AudioContext, at: number, gainVal: number, pan: number) {
  const dur = 0.02 + Math.random() * 0.035; // 20-55ms — a real clap is short
  const bufferSize = Math.max(1, Math.floor(ctx.sampleRate * dur));
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }

  const source = ctx.createBufferSource();
  source.buffer = buffer;

  // Bandpass centered somewhere in the 1.2-4kHz "clap" range, with a bit of
  // per-clap variation so the crowd doesn't sound uniform.
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 1200 + Math.random() * 2800;
  filter.Q.value = 0.7 + Math.random() * 0.6;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(gainVal, at + 0.003); // near-instant attack, like a real clap
  gain.gain.exponentialRampToValueAtTime(0.0001, at + dur);

  let destination: AudioNode = ctx.destination;
  if (ctx.createStereoPanner) {
    const panner = ctx.createStereoPanner();
    panner.pan.value = pan;
    panner.connect(ctx.destination);
    destination = panner;
  }

  source.connect(filter);
  filter.connect(gain);
  gain.connect(destination);
  source.start(at);
  source.stop(at + dur + 0.02);
}

// A natural-sounding round of applause (~3 seconds): many individually
// randomized claps layered together, following a crowd-clapping density
// curve — a quick build as people start clapping, a busy sustained wash,
// then a gradual taper as it dies down. No two plays sound identical.
export const playCelebration = () => {
  if (typeof window === 'undefined') return;
  const AC = window.AudioContext || (window as any).webkitAudioContext;
  if (!AC) return;
  const ctx = new AC();
  const now = ctx.currentTime;

  const DURATION = 3.0;
  const PEAK_CLAPS_PER_SEC = 26;

  // Density envelope: ramps up over the first 0.35s, holds a busy plateau
  // until ~2.1s, then eases off to nothing by the end.
  const densityAt = (t: number): number => {
    if (t < 0.35) return (t / 0.35) * PEAK_CLAPS_PER_SEC;
    if (t < 2.1) return PEAK_CLAPS_PER_SEC;
    return PEAK_CLAPS_PER_SEC * Math.max(0, 1 - (t - 2.1) / (DURATION - 2.1));
  };

  // Sample clap start times via a simple thinned Poisson process against
  // the density curve above.
  let t = 0;
  while (t < DURATION) {
    const rate = Math.max(1, densityAt(t));
    t += -Math.log(1 - Math.random()) / rate;
    if (t >= DURATION) break;
    const envelopeGain = 0.16 + (densityAt(t) / PEAK_CLAPS_PER_SEC) * 0.14;
    const gainVal = envelopeGain * (0.6 + Math.random() * 0.6);
    const pan = Math.random() * 1.6 - 0.8;
    clap(ctx, now + t, gainVal, pan);
  }
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
