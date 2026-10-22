/**
 * Read-aloud voice settings — the ONE place to change how Prayer Fire sounds.
 *
 * Goal: a calm, deep, steady male narrator reading Scripture
 * ("In the beginning God created the heaven and the earth.").
 *
 * Browsers and phones differ in which voices they have, so the engine tries the
 * lists below in order and uses the first one that exists; if none do, it keeps
 * the phone's default voice but still applies the slower rate and lower pitch.
 */
export const VOICE_CONFIG = {
  /** Speaking speed: 1 = normal, lower = slower and calmer. */
  rate: 0.9,
  /** Voice pitch: 1 = normal, lower = deeper. */
  pitch: 0.85,
  /** Language used when a verse doesn't specify one. */
  lang: 'en-US',

  /**
   * Browser voices (speechSynthesis), best first. A voice is chosen when its
   * name contains one of these (case-insensitive). Then any English voice whose
   * name contains "male" (but not "female") is accepted.
   */
  browserVoicePreference: ['Microsoft Guy', 'Microsoft Ryan', 'Google UK English Male', 'Daniel'] as string[],

  /**
   * Android voices (the app's native engine), best first. These are Google
   * text-to-speech voice ids; the ones listed are male English voices. Phones
   * that don't have them fall back to the default voice (with the lower pitch).
   * Change the voice on a phone under Settings → Languages → Text-to-speech.
   */
  androidVoicePreference: ['en-gb-x-rjs', 'en-us-x-iom', 'en-us-x-tpd', 'en-us-x-iol', 'en-gb-x-gbd', 'en-au-x-aud'] as string[],

  /**
   * Cloud voice (for example ElevenLabs) so every phone sounds the same.
   * Not built yet — kept here so it can be switched on later without touching
   * the reader. While `enabled` is false the app only uses the voices above.
   */
  cloud: {
    enabled: false,
    provider: 'elevenlabs' as 'elevenlabs',
    voiceId: '',
  },
};
