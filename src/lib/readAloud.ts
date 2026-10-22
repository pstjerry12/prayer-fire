'use client';

import { VOICE_CONFIG } from './voiceConfig';

/**
 * Read-aloud (text-to-speech) for verses, chapters and prayers.
 *
 * - Speaks one utterance per verse, so the reader can highlight and scroll to
 *   the verse being read and start immediately (no giant block of text).
 * - Inside the Android app it uses the native "SpeechEngine" plugin (Android's
 *   own TextToSpeech); the browser speech API is unreliable in a WebView.
 *   Older installs and plain browsers use speechSynthesis instead.
 * - Voice, rate and pitch come from voiceConfig.ts.
 * - Pause is a "soft pause": it stops speaking and remembers the verse, and
 *   Resume starts that verse again. That behaves the same on every phone
 *   (speechSynthesis.pause() is unreliable on Android Chrome).
 */

export type SpeechEndReason = 'done' | 'stopped' | 'unsupported' | 'error';
export type ReaderState = 'playing' | 'paused' | 'idle';

export interface SpeechItem {
  /** Anything the caller wants back, e.g. the verse number. */
  id: number | string;
  text: string;
}

export interface ReadOptions {
  /** Language code: en, es, fr, pt, sw. Defaults to the voice config language. */
  lang?: string;
  rate?: number;
  pitch?: number;
  /** A new item starts being spoken. */
  onItemStart?: (index: number, item: SpeechItem) => void;
  onStateChange?: (state: ReaderState) => void;
  /** Called once when reading finishes, is stopped, or can't run. */
  onEnd?: (reason: SpeechEndReason) => void;
}

export interface ReadController {
  pause(): void;
  resume(): void;
  stop(): void;
}

const LANG_TAGS: Record<string, string> = {
  en: 'en-US',
  es: 'es-ES',
  fr: 'fr-FR',
  pt: 'pt-BR',
  sw: 'sw-TZ',
};

interface SpeechEnginePluginApi {
  speakQueue(options: {
    items: string[];
    rate?: number;
    pitch?: number;
    lang?: string;
    voiceHints?: string[];
  }): Promise<{ stopped?: boolean }>;
  speak(options: { text: string; rate?: number; pitch?: number; lang?: string }): Promise<{ stopped?: boolean }>;
  stop(): Promise<void>;
  warmUp?(): Promise<void>;
  addListener(event: 'verseStart', cb: (data: { index: number }) => void): Promise<{ remove: () => Promise<void> }>;
}

let nativePlugin: Promise<SpeechEnginePluginApi | null> | null = null;
let nativeMissing = false; // this install has no SpeechEngine queue support (older build)
let session = 0; // bumps on every start/stop so stale callbacks are ignored
let active: { stop: () => void } | null = null;

function getNativePlugin(): Promise<SpeechEnginePluginApi | null> {
  if (!nativePlugin) {
    nativePlugin = (async () => {
      try {
        const { registerPlugin, Capacitor } = await import('@capacitor/core');
        if (Capacitor.getPlatform() !== 'android') return null;
        return registerPlugin<SpeechEnginePluginApi>('SpeechEngine');
      } catch {
        return null;
      }
    })();
  }
  return nativePlugin;
}

// ── Browser voices ──────────────────────────────────────────────────────

let voicesPromise: Promise<SpeechSynthesisVoice[]> | null = null;

function webSpeechAvailable(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';
}

function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  if (!webSpeechAvailable()) return Promise.resolve([]);
  if (voicesPromise) return voicesPromise;
  voicesPromise = new Promise((resolve) => {
    const synth = window.speechSynthesis;
    const ready = synth.getVoices();
    if (ready.length > 0) return resolve(ready);
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      synth.removeEventListener?.('voiceschanged', finish);
      resolve(synth.getVoices());
    };
    synth.addEventListener?.('voiceschanged', finish);
    setTimeout(finish, 1500); // some browsers never fire the event — carry on without
  });
  return voicesPromise;
}

/** Picks the narrator voice from the config: preferred names first, then any "male" English voice. */
export function pickBrowserVoice(voices: SpeechSynthesisVoice[], langTag: string): SpeechSynthesisVoice | null {
  const lang = langTag.slice(0, 2).toLowerCase();
  const sameLang = voices.filter((v) => v.lang?.toLowerCase().startsWith(lang));
  const pool = sameLang.length > 0 ? sameLang : voices;

  for (const wanted of VOICE_CONFIG.browserVoicePreference) {
    const hit = pool.find((v) => v.name.toLowerCase().includes(wanted.toLowerCase()));
    if (hit) return hit;
  }
  const male = pool.find((v) => /\bmale\b/i.test(v.name) && !/female/i.test(v.name));
  return male ?? null;
}

/**
 * Call when the app opens: loads the browser's voices and wakes the Android
 * speech engine so the first "Read aloud" starts without a delay.
 */
export function preloadVoices(): void {
  if (typeof window === 'undefined') return;
  loadVoices().catch(() => {});
  getNativePlugin()
    .then((plugin) => plugin?.warmUp?.().catch(() => {}))
    .catch(() => {});
}

/** Splits a long verse into sentence-sized pieces for the browser speech API. */
export function splitForSpeech(text: string, maxLen = 220): string[] {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (!clean) return [];
  if (clean.length <= maxLen) return [clean];
  const sentences = clean.split(/(?<=[.!?;:])\s+/);
  const chunks: string[] = [];
  let current = '';
  const push = (piece: string) => {
    if (piece) chunks.push(piece);
  };
  for (const sentence of sentences) {
    if (sentence.length > maxLen) {
      push(current);
      current = '';
      let part = '';
      for (const word of sentence.split(' ')) {
        if ((part + ' ' + word).trim().length > maxLen) {
          push(part);
          part = word;
        } else {
          part = (part + ' ' + word).trim();
        }
      }
      current = part;
      continue;
    }
    if ((current + ' ' + sentence).trim().length > maxLen) {
      push(current);
      current = sentence;
    } else {
      current = (current + ' ' + sentence).trim();
    }
  }
  push(current);
  return chunks;
}

// ── The reader ──────────────────────────────────────────────────────────

/**
 * Reads the items in order. Starting a new read replaces any read in progress.
 * Never throws; the outcome is reported through opts.onEnd.
 */
export function readItems(items: SpeechItem[], opts: ReadOptions = {}): ReadController {
  const noop: ReadController = { pause() {}, resume() {}, stop() {} };
  if (typeof window === 'undefined' || items.length === 0) {
    opts.onEnd?.('done');
    return noop;
  }

  stopActive();
  ++session;
  let startIndex = 0; // item to (re)start from after a pause
  let state: ReaderState = 'playing';
  let ended = false;
  let cancelRun: () => void = () => {};

  const setState = (next: ReaderState) => {
    if (state === next) return;
    state = next;
    opts.onStateChange?.(next);
  };
  const finish = (reason: SpeechEndReason) => {
    if (ended) return;
    ended = true;
    if (active === handle) active = null;
    setState('idle');
    opts.onEnd?.(reason);
  };

  const lang = opts.lang ?? 'en';
  const langTag = LANG_TAGS[lang] ?? VOICE_CONFIG.lang;
  const rate = opts.rate ?? VOICE_CONFIG.rate;
  const pitch = opts.pitch ?? VOICE_CONFIG.pitch;

  /** Speaks items[startIndex…]. Resolves with how it ended. */
  const run = async (): Promise<SpeechEndReason> => {
    const runSession = session;
    const remaining = items.slice(startIndex);
    const offset = startIndex;
    const notify = (i: number) => {
      if (runSession !== session) return;
      startIndex = offset + i;
      opts.onItemStart?.(offset + i, items[offset + i]);
    };

    // 1. Native Android engine
    if (!nativeMissing) {
      const plugin = await getNativePlugin();
      if (runSession !== session) return 'stopped';
      if (plugin) {
        let listener: { remove: () => Promise<void> } | null = null;
        try {
          listener = await plugin.addListener('verseStart', (d) => notify(d.index));
          if (runSession !== session) return 'stopped';
          const result = await plugin.speakQueue({
            items: remaining.map((it) => it.text),
            rate,
            pitch,
            lang,
            voiceHints: VOICE_CONFIG.androidVoicePreference,
          });
          return result?.stopped ? 'stopped' : 'done';
        } catch (err) {
          const message = String((err as { message?: string })?.message ?? err);
          if (!/not implemented|unimplemented/i.test(message)) return 'error';
          // Build 22 only has the single-text "speak": read everything as one piece
          // (no per-verse highlight). Anything older has no plugin at all.
          try {
            const result = await plugin.speak({
              text: remaining.map((it) => it.text).join(' '),
              rate,
              pitch,
              lang,
            });
            return result?.stopped ? 'stopped' : 'done';
          } catch (err2) {
            const message2 = String((err2 as { message?: string })?.message ?? err2);
            if (!/not implemented|unimplemented/i.test(message2)) return 'error';
            nativeMissing = true; // no usable native plugin: use the browser engine from now on
          }
        } finally {
          listener?.remove().catch(() => {});
        }
      }
    }

    // 2. Browser engine, one utterance per piece of a verse
    if (!webSpeechAvailable()) return 'unsupported';
    const synth = window.speechSynthesis;
    synth.cancel();
    const voices = await loadVoices();
    if (runSession !== session) return 'stopped';
    const voice = pickBrowserVoice(voices, langTag);

    const queue: { item: number; text: string; first: boolean }[] = [];
    remaining.forEach((it, i) => {
      splitForSpeech(it.text).forEach((piece, n) => queue.push({ item: i, text: piece, first: n === 0 }));
    });

    return new Promise<SpeechEndReason>((resolve) => {
      let index = 0;
      let settled = false;
      const settle = (reason: SpeechEndReason) => {
        if (settled) return;
        settled = true;
        resolve(reason);
      };
      cancelRun = () => settle('stopped');

      const next = () => {
        if (runSession !== session) return settle('stopped');
        if (index >= queue.length) return settle('done');
        const piece = queue[index++];
        const utterance = new SpeechSynthesisUtterance(piece.text);
        if (voice) utterance.voice = voice;
        utterance.lang = voice?.lang || langTag;
        utterance.rate = rate;
        utterance.pitch = pitch;
        if (piece.first) utterance.onstart = () => notify(piece.item);
        utterance.onend = next;
        utterance.onerror = (e) => {
          if (runSession !== session) return settle('stopped');
          if (e.error === 'interrupted' || e.error === 'canceled') return settle('stopped');
          settle('error');
        };
        synth.speak(utterance);
      };
      next();
    });
  };

  const halt = () => {
    session++; // makes every pending callback of the current run stale
    cancelRun();
    if (webSpeechAvailable()) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // ignore
      }
    }
    getNativePlugin()
      .then((plugin) => plugin?.stop().catch(() => {}))
      .catch(() => {});
  };

  const start = () => {
    const thisRun = session;
    run()
      .then((reason) => {
        if (thisRun !== session) return; // paused or replaced; whoever did that reports the state
        finish(reason);
      })
      .catch(() => {
        if (thisRun === session) finish('error');
      });
  };

  const handle = {
    pause() {
      if (state !== 'playing' || ended) return;
      halt();
      setState('paused');
    },
    resume() {
      if (state !== 'paused' || ended) return;
      session++; // fresh session id for the restarted run
      setState('playing');
      start();
    },
    stop() {
      if (ended) return;
      halt();
      finish('stopped');
    },
    // used when something else starts reading
    forceStop() {
      if (ended) return;
      ended = true;
      cancelRun();
      setState('idle');
      opts.onEnd?.('stopped');
    },
  };
  active = handle;
  opts.onStateChange?.('playing');
  start();
  return handle;
}

function stopActive() {
  const current = active as ({ forceStop?: () => void } & { stop: () => void }) | null;
  active = null;
  if (current) current.forceStop?.();
}

/** Reads a single piece of text. Returns a controller like readItems. */
export function speakText(text: string, opts: Omit<ReadOptions, 'onItemStart'> = {}): ReadController {
  return readItems([{ id: 0, text }], opts);
}

/** Stops whatever is being read aloud. */
export function stopSpeech(): void {
  if (typeof window === 'undefined') return;
  const current = active;
  if (current) {
    current.stop();
    return;
  }
  session++;
  if (webSpeechAvailable()) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      // ignore
    }
  }
  getNativePlugin()
    .then((plugin) => plugin?.stop().catch(() => {}))
    .catch(() => {});
}
