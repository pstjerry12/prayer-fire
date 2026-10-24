'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, Flame, Headphones, type LucideIcon } from 'lucide-react';
import { cn } from '../utils/cn';
import { useSignInRequired } from './SignInGate';
import { useApp } from '../context';

const WELCOME_SEEN_KEY = 'pfm_welcome_seen';
// Set once a person has finished their first daily devotional, so it marks someone who has used the app before.
const USED_BEFORE_KEY = 'upp_daily_devotion_shown';

const SLIDES: { icon: LucideIcon; title: string; text: string }[] = [
  {
    icon: Flame,
    title: 'Pray 3x a day',
    text: 'Set prayer alarms that ring on time, write your prayer points, and pray with believers around the world.',
  },
  {
    icon: BookOpen,
    title: 'The full Holy Bible',
    text: 'Full Holy Bible, offline, with Audio. Read it in KJV, ASV or WEB, highlight verses and keep sermon notes.',
  },
  {
    icon: Headphones,
    title: 'Listen anytime',
    text: 'Tap the big green Listen button in the Bible to hear any chapter read aloud. Pause or stop whenever you like.',
  },
];

/** Three welcome slides for someone opening Prayer Fire for the first time, shown right after they sign in. */
export default function WelcomeSlides() {
  const router = useRouter();
  const { user } = useApp();
  const signInRequired = useSignInRequired();
  // null until the phone's saved data has been read (never during the server render).
  const [eligible, setEligible] = useState<boolean | null>(null);
  const [open, setOpen] = useState(true);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    try {
      // Decided once, on first load: a person who has used the app before never gets the slides.
      // The saved data is only readable on the client, after mount.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setEligible(localStorage.getItem(WELCOME_SEEN_KEY) !== '1' && !localStorage.getItem(USED_BEFORE_KEY));
    } catch {
      setEligible(false);
    }
  }, []);

  if (!eligible || !open || signInRequired || !user) return null;

  const last = index === SLIDES.length - 1;
  const slide = SLIDES[index];
  const Icon = slide.icon;

  function finish(openBible: boolean) {
    try {
      localStorage.setItem(WELCOME_SEEN_KEY, '1');
    } catch {
      // ignore
    }
    setOpen(false);
    if (openBible) router.push('/bible');
  }

  return (
    <div className="fixed inset-0 z-[90] bg-black/55 backdrop-blur-sm overflow-y-auto" role="dialog" aria-modal="true" aria-label="Welcome to Prayer Fire">
      <div className="min-h-full flex items-center justify-center p-4">
        <div className="w-full max-w-sm rounded-3xl bg-card border border-edge shadow-2xl overflow-hidden">
          <div className="flex justify-end px-4 pt-3">
            <button onClick={() => finish(false)} className="text-xs font-bold text-ink-muted hover:text-ink px-2 py-1">
              Skip
            </button>
          </div>
          <div className="px-6 pb-6 text-center">
            <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-acc-soft text-acc">
              <Icon className="w-10 h-10" />
            </div>
            <h2 className="mt-4 font-serif-heading text-2xl font-bold text-ink">{slide.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft min-h-[4.5rem]">{slide.text}</p>

            <div className="mt-4 flex justify-center gap-1.5" aria-hidden>
              {SLIDES.map((_, i) => (
                <span key={i} className={cn('h-2 rounded-full transition-all', i === index ? 'w-6 bg-acc' : 'w-2 bg-edge-strong')} />
              ))}
            </div>

            {last ? (
              <div className="mt-5 space-y-2">
                <button onClick={() => finish(true)} className="w-full h-12 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-500 active:scale-95">
                  Open the Bible
                </button>
                <button onClick={() => finish(false)} className="w-full h-10 text-sm font-bold text-acc-strong hover:underline">
                  Get started
                </button>
              </div>
            ) : (
              <button onClick={() => setIndex(index + 1)} className="mt-5 w-full h-12 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-500 active:scale-95">
                Next
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
