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

// A single "clap" — a quick burst of filtered noise.
function makeClap(ctx: AudioContext, at: number, volume: number, pan = 0) {
  const duration = 0.12;
  const bufferSize = Math.floor(ctx.sampleRate * duration);
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    // Sharp attack, fast exponential decay.
    const env = Math.pow(1 - i / bufferSize, 4);
    data[i] = (Math.random() * 2 - 1) * env;
  }

  const source = ctx.createBufferSource();
  source.buffer = buffer;

  const bandpass = ctx.createBiquadFilter();
  bandpass.type = 'bandpass';
  bandpass.frequency.value = 2000;
  bandpass.Q.value = 0.8;

  const gain = ctx.createGain();
  gain.gain.value = volume;

  source.connect(bandpass);
  bandpass.connect(gain);
  gain.connect(ctx.destination);

  if (pan !== 0 && ctx.createStereoPanner) {
    const panner = ctx.createStereoPanner();
    panner.pan.value = pan;
    gain.disconnect();
    gain.connect(panner);
    panner.connect(ctx.destination);
  }

  source.start(at);
  source.stop(at + duration + 0.02);
}

// A round of applause — many staggered claps, like a small crowd cheering.
export const playCelebration = () => {
  if (typeof window === 'undefined') return;
  const AC = window.AudioContext || (window as any).webkitAudioContext;
  if (!AC) return;
  const ctx = new AC();
  const now = ctx.currentTime;

  // A big opening clap, then a rolling wave of applause (~3.5 seconds).
  makeClap(ctx, now, 0.5);
  makeClap(ctx, now + 0.04, 0.35);

  const clapCount = 34;
  for (let i = 0; i < clapCount; i++) {
    // Random timing for a natural, human sound.
    const t = now + 0.2 + i * 0.09 + Math.random() * 0.05;
    // Vary the volume and spread claps left/right for a "crowd" feel.
    const volume = 0.12 + Math.random() * 0.3;
    const pan = (Math.random() * 2 - 1) * 0.7;
    makeClap(ctx, t, volume, pan);
  }

  // A final, stronger closing clap.
  makeClap(ctx, now + 3.4, 0.45);
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
