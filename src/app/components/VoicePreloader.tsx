'use client';

import { useEffect } from 'react';
import { preloadVoices } from '@/lib/readAloud';

/** Loads the read-aloud voices as soon as the app opens, so "Read Aloud" starts without a delay. */
export default function VoicePreloader() {
  useEffect(() => {
    preloadVoices();
  }, []);
  return null;
}
