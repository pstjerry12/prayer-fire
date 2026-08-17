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
