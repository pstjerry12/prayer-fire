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
// for a ConvolverNode. This is the single biggest lever for making
// synthesized transients — like claps — stop sounding like isolated
// "clicks" and start sounding like they're happening in a real room: real
// applause is drenched in overlapping reflections that blend hundreds of
// claps into one wash of sound.
function createRoomImpulse(ctx: AudioContext, duration = 0.7, decay = 2.6): AudioBuffer {
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

// A single hand-clap impulse, built from two layers rather than one flat
// noise burst — real claps aren't a pure tone-less "click", they're a sharp
// broadband snap plus a softer, lower resonance from the cupped-hand
// cavity right underneath it:
//   • snap — very short, bright, wide bandpass (the "crack")
//   • body — slightly longer, low bandpass at low gain (the "thud")
// Both layers, and their exact frequencies/durations, are randomized per
// clap so hundreds of them layered together don't sound like one clap
// copy-pasted on a loop. A shared `reverbBus` gives every clap the same
// room tail so they blend together instead of sounding pasted-in dry.
function clap(ctx: AudioContext, at: number, gainVal: number, pan: number, reverbBus: AudioNode) {
  const dur = 0.018 + Math.random() * 0.03; // 18-48ms — a real clap is short
  const noiseBuffer = (() => {
    const bufferSize = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    return buffer;
  })();

  const mix = ctx.createGain(); // sums snap + body before panning/reverb send

  // Snap — the bright crack of palm meeting palm.
  const snapSource = ctx.createBufferSource();
  snapSource.buffer = noiseBuffer;
  const snapFilter = ctx.createBiquadFilter();
  snapFilter.type = 'bandpass';
  snapFilter.frequency.value = 1800 + Math.random() * 2600;
  snapFilter.Q.value = 0.6 + Math.random() * 0.5;
  const snapGain = ctx.createGain();
  snapGain.gain.setValueAtTime(0.0001, at);
  snapGain.gain.exponentialRampToValueAtTime(gainVal, at + 0.0015);
  snapGain.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  snapSource.connect(snapFilter);
  snapFilter.connect(snapGain);
  snapGain.connect(mix);
  snapSource.start(at);
  snapSource.stop(at + dur + 0.02);

  // Body — the softer low thud of the cupped-hand cavity, arriving with
  // the snap but lingering a touch longer underneath it.
  const bodyDur = dur * (1.6 + Math.random() * 0.6);
  const bodySource = ctx.createBufferSource();
  bodySource.buffer = noiseBuffer;
  const bodyFilter = ctx.createBiquadFilter();
  bodyFilter.type = 'bandpass';
  bodyFilter.frequency.value = 220 + Math.random() * 380;
  bodyFilter.Q.value = 1.1 + Math.random() * 0.5;
  const bodyGain = ctx.createGain();
  bodyGain.gain.setValueAtTime(0.0001, at);
  bodyGain.gain.exponentialRampToValueAtTime(gainVal * 0.32, at + 0.004);
  bodyGain.gain.exponentialRampToValueAtTime(0.0001, at + bodyDur);
  bodySource.connect(bodyFilter);
  bodyFilter.connect(bodyGain);
  bodyGain.connect(mix);
  bodySource.start(at);
  bodySource.stop(at + bodyDur + 0.02);

  if (ctx.createStereoPanner) {
    const panner = ctx.createStereoPanner();
    panner.pan.value = pan;
    mix.connect(panner);
    panner.connect(ctx.destination);
  } else {
    mix.connect(ctx.destination);
  }
  // Send the same signal into the shared room reverb so every clap blends
  // into a common ambience instead of sounding pasted in dry.
  mix.connect(reverbBus);
}

// A natural-sounding round of applause (~3 seconds): many individually
// randomized two-layer claps, all sharing one room reverb tail, layered
// together following a crowd-clapping density curve — a quick build as
// people start clapping, a busy sustained wash, then a gradual taper as it
// dies down. No two plays sound identical.
export const playCelebration = () => {
  if (typeof window === 'undefined') return;
  const AC = window.AudioContext || (window as any).webkitAudioContext;
  if (!AC) return;
  const ctx = new AC();
  const now = ctx.currentTime;

  // Shared room bus: every clap feeds into this one convolver, so the
  // reflections of hundreds of claps overlap and blend like a real room
  // instead of each clap carrying its own isolated dry click.
  const reverbBus = ctx.createGain();
  reverbBus.gain.value = 0.9;
  const convolver = ctx.createConvolver();
  convolver.buffer = createRoomImpulse(ctx);
  const reverbWet = ctx.createGain();
  reverbWet.gain.value = 0.5;
  reverbBus.connect(convolver);
  convolver.connect(reverbWet);
  reverbWet.connect(ctx.destination);

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
    clap(ctx, now + t, gainVal, pan, reverbBus);
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
