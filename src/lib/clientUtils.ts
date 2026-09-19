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

// A short, synthetic room impulse response (exponentially-decaying noise)
// for a ConvolverNode — gives every tone a shared, soft reflection tail so
// they blend into one warm ambience instead of sounding pasted-in dry.
function createRoomImpulse(ctx: AudioContext, duration = 1.6, decay = 3.2): AudioBuffer {
  const length = Math.max(1, Math.floor(ctx.sampleRate * duration));
  const impulse = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let channel = 0; channel < 2; channel++) {
    const data = impulse.getChannelData(channel);
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
    }
  }
  return impulse;
}

// A single bell tone using FM (frequency-modulation) synthesis — the
// classic Chowning bell algorithm: a sine carrier whose pitch is modulated
// by a second sine at a non-integer ratio of the carrier, with the
// modulation index decaying faster than the overall volume. That mismatch
// is what makes it sound like real struck metal rather than an electronic
// "beep" — the timbre starts bright and clangy and mellows into a pure
// tone as it rings out, exactly like a real bell's decay.
function bellTone(
  ctx: AudioContext,
  at: number,
  freq: number,
  gainVal: number,
  pan: number,
  reverbBus: AudioNode,
  duration = 2.4
) {
  const modRatio = 1.4; // inharmonic — this is what makes it "bell" not "flute"
  const indexDecay = duration * 0.4;

  const carrier = ctx.createOscillator();
  carrier.type = 'sine';
  carrier.frequency.value = freq;

  const modulator = ctx.createOscillator();
  modulator.type = 'sine';
  modulator.frequency.value = freq * modRatio;

  const modGain = ctx.createGain(); // modulation index, expressed in Hz of deviation
  const peakIndex = freq * 2.6;
  modGain.gain.setValueAtTime(peakIndex, at);
  modGain.gain.exponentialRampToValueAtTime(Math.max(2, freq * 0.015), at + indexDecay);
  modulator.connect(modGain);
  modGain.connect(carrier.frequency);

  const ampEnv = ctx.createGain();
  ampEnv.gain.setValueAtTime(0.0001, at);
  ampEnv.gain.exponentialRampToValueAtTime(gainVal, at + 0.012);
  ampEnv.gain.exponentialRampToValueAtTime(0.0001, at + duration);
  carrier.connect(ampEnv);

  if (ctx.createStereoPanner) {
    const panner = ctx.createStereoPanner();
    panner.pan.value = pan;
    ampEnv.connect(panner);
    panner.connect(ctx.destination);
    panner.connect(reverbBus);
  } else {
    ampEnv.connect(ctx.destination);
    ampEnv.connect(reverbBus);
  }

  carrier.start(at);
  carrier.stop(at + duration + 0.1);
  modulator.start(at);
  modulator.stop(at + duration + 0.1);
}

// A warm, natural-sounding celebration peal: four ascending bell tones
// (a joyful major chord — C, E, G, high C) rung in quick succession and
// left to ring out together over a shared soft reverb tail. FM-synthesized
// bells read as genuinely "real" far more reliably than trying to
// synthesize something as texturally complex as a crowd of clapping
// hands — this is deliberately a different, simpler kind of celebratory
// sound rather than a third pass at tuning fake applause.
export const playCelebration = () => {
  if (typeof window === 'undefined') return;
  const AC = window.AudioContext || (window as any).webkitAudioContext;
  if (!AC) return;
  const ctx = new AC();
  const now = ctx.currentTime;

  const reverbBus = ctx.createGain();
  reverbBus.gain.value = 0.55;
  const convolver = ctx.createConvolver();
  convolver.buffer = createRoomImpulse(ctx);
  const reverbWet = ctx.createGain();
  reverbWet.gain.value = 0.4;
  reverbBus.connect(convolver);
  convolver.connect(reverbWet);
  reverbWet.connect(ctx.destination);

  const notes = [
    { freq: 523.25, pan: -0.5 }, // C5
    { freq: 659.25, pan: -0.15 }, // E5
    { freq: 783.99, pan: 0.15 }, // G5
    { freq: 1046.5, pan: 0.5 }, // C6
  ];

  notes.forEach((note, i) => {
    const at = now + i * 0.2;
    bellTone(ctx, at, note.freq, 0.26, note.pan, reverbBus, 2.6);
    // A soft octave-up shimmer layer makes each bell feel fuller/less thin.
    bellTone(ctx, at, note.freq * 2, 0.09, note.pan, reverbBus, 1.6);
  });
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
