'use client';

/**
 * Read-aloud (text-to-speech) for verses and chapters.
 *
 * Why this exists instead of calling window.speechSynthesis directly:
 *  - Inside the Android app's WebView the browser speech API often does
 *    nothing at all (no voices, or speak() silently ignored). The app now
 *    ships a native "SpeechEngine" plugin that uses Android's own
 *    TextToSpeech, which is what we use there.
 *  - Phones that haven't updated to the build with that plugin (and plain
 *    browsers) fall back to speechSynthesis — now with the text split into
 *    short pieces, because Chrome cuts a long utterance off after ~15 seconds
 *    (a whole Bible chapter used to just stop or never start).
 */

export type SpeechEndReason = 'done' | 'stopped' | 'unsupported' | 'error';

interface SpeechEnginePluginApi {
  speak(options: { text: string; rate?: number; pitch?: number; lang?: string }): Promise<{ stopped?: boolean }>;
  stop(): Promise<void>;
}

export interface SpeakOptions {
  /** Language code: en, es, fr, pt, sw. Defaults to English. */
  lang?: string;
  rate?: number;
  pitch?: number;
  /** Called once when speaking finishes, is stopped, or can't run. */
  onEnd?: (reason: SpeechEndReason) => void;
}

const LANG_TAGS: Record<string, string> = {
  en: 'en-US',
  es: 'es-ES',
  fr: 'fr-FR',
  pt: 'pt-BR',
  sw: 'sw-TZ',
};

let nativePlugin: Promise<SpeechEnginePluginApi | null> | null = null;
let nativeMissing = false; // this install has no SpeechEngine plugin (older build)
let session = 0; // bumps on every speak/stop so stale callbacks are ignored

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

/** Splits text into short, sentence-sized pieces for the browser speech API. */
export function splitForSpeech(text: string, maxLen = 200): string[] {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (!clean) return [];
  const sentences = clean.split(/(?<=[.!?;:])\s+/);
  const chunks: string[] = [];
  let current = '';

  const push = (piece: string) => {
    if (piece) chunks.push(piece);
  };

  for (const sentence of sentences) {
    if (sentence.length > maxLen) {
      // A very long sentence: break it on spaces.
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

function webSpeechAvailable(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';
}

function waitForVoices(): Promise<void> {
  return new Promise((resolve) => {
    const synth = window.speechSynthesis;
    if (synth.getVoices().length > 0) return resolve();
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      synth.removeEventListener?.('voiceschanged', finish);
      resolve();
    };
    synth.addEventListener?.('voiceschanged', finish);
    setTimeout(finish, 1200); // some browsers never fire the event — speak anyway
  });
}

async function speakWithBrowser(text: string, opts: SpeakOptions, mySession: number): Promise<SpeechEndReason> {
  if (!webSpeechAvailable()) return 'unsupported';
  const synth = window.speechSynthesis;
  const chunks = splitForSpeech(text);
  if (chunks.length === 0) return 'done';

  synth.cancel();
  await waitForVoices();
  if (mySession !== session) return 'stopped';

  const langTag = LANG_TAGS[opts.lang ?? 'en'] ?? 'en-US';

  return new Promise<SpeechEndReason>((resolve) => {
    let index = 0;
    let settled = false;
    const settle = (reason: SpeechEndReason) => {
      if (settled) return;
      settled = true;
      clearInterval(keepAlive);
      resolve(reason);
    };

    // Chrome can leave a long queue paused; nudging resume() keeps it moving.
    const keepAlive = setInterval(() => {
      if (mySession !== session) return settle('stopped');
      if (synth.speaking && synth.paused) synth.resume();
    }, 5000);

    const next = () => {
      if (mySession !== session) return settle('stopped');
      if (index >= chunks.length) return settle('done');
      const utterance = new SpeechSynthesisUtterance(chunks[index++]);
      utterance.lang = langTag;
      utterance.rate = opts.rate ?? 0.9;
      utterance.pitch = opts.pitch ?? 1;
      utterance.onend = next;
      utterance.onerror = (e) => {
        if (mySession !== session) return settle('stopped');
        // 'interrupted'/'canceled' = someone called stop; anything else = real failure.
        if (e.error === 'interrupted' || e.error === 'canceled') return settle('stopped');
        settle('error');
      };
      synth.speak(utterance);
    };
    next();
  });
}

/**
 * Reads text aloud, replacing anything already being read. Never throws —
 * the outcome is reported through opts.onEnd.
 */
export function speakText(text: string, opts: SpeakOptions = {}): void {
  if (typeof window === 'undefined') return;
  const mySession = ++session;
  let ended = false;
  // Always reported exactly once, so a card showing "Stop" can reset itself
  // even when a different verse started reading over it.
  const finish = (reason: SpeechEndReason) => {
    if (ended) return;
    ended = true;
    opts.onEnd?.(reason);
  };

  (async () => {
    if (!nativeMissing) {
      const plugin = await getNativePlugin();
      if (mySession !== session) return finish('stopped');
      if (plugin) {
        try {
          const result = await plugin.speak({
            text,
            rate: opts.rate ?? 0.9,
            pitch: opts.pitch ?? 1,
            lang: opts.lang ?? 'en',
          });
          finish(result?.stopped ? 'stopped' : 'done');
          return;
        } catch (err) {
          const message = String((err as { message?: string })?.message ?? err);
          if (/not implemented|unimplemented/i.test(message)) {
            // An older install without the plugin — use the browser engine from now on.
            nativeMissing = true;
          } else {
            finish('error');
            return;
          }
        }
      }
    }
    finish(await speakWithBrowser(text, opts, mySession));
  })().catch(() => finish('error'));
}

/** Stops whatever is being read aloud. */
export function stopSpeech(): void {
  if (typeof window === 'undefined') return;
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
