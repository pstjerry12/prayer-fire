'use client';

import { useState } from 'react';
import { BookOpen, Copy, Check, Volume2, MicOff } from 'lucide-react';
import { cn } from '../utils/cn';
import { SCRIPTURE_CARDS } from '@/app/data/bibleVerses';
import { speakText, stopSpeech } from '@/lib/clientUtils';

const LANGS = [
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'pt', label: 'Português', flag: '🇧🇷' },
  { code: 'sw', label: 'Kiswahili', flag: '🇹🇿' },
];

export default function ScriptureVault() {
  const [lang, setLang] = useState('en');
  const [copied, setCopied] = useState<string | null>(null);
  const [speaking, setSpeaking] = useState<string | null>(null);

  const filtered = SCRIPTURE_CARDS.filter((c) => c.language === lang);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleSpeak = (id: string, text: string) => {
    if (speaking === id) {
      stopSpeech();
      setSpeaking(null);
    } else {
      speakText(text);
      setSpeaking(id);
      setTimeout(() => setSpeaking(null), 5000);
    }
  };

  return (
    <div className="bg-card rounded-2xl border border-edge shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-edge flex items-center gap-3">
        <div className="p-2 rounded-lg bg-acc-soft text-acc"><BookOpen className="w-5 h-5" /></div>
        <div>
          <h2 className="font-bold text-ink">Scripture Vault</h2>
          <p className="text-xs text-ink-muted">Key verses in five languages</p>
        </div>
      </div>
      <div className="p-4">
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          {LANGS.map((l) => (
            <button key={l.code} onClick={() => setLang(l.code)} className={cn('px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all', lang === l.code ? 'bg-emerald-600 text-white' : 'bg-card text-ink-muted border border-edge hover:bg-card-2')}>
              {l.flag} {l.label}
            </button>
          ))}
        </div>
        <div className="grid gap-3">
          {filtered.map((card) => (
            <div key={card.id} className="bg-card rounded-xl p-4 border border-edge">
              <p className="text-acc-strong text-xs font-semibold mb-2">{card.reference}</p>
              <p className="text-ink-soft text-sm leading-relaxed italic">"{card.text}"</p>
              <div className="flex gap-3 mt-3">
                <button onClick={() => handleCopy(card.id, `"${card.text}" — ${card.reference}`)} className="flex items-center gap-1 text-xs text-ink-muted hover:text-ink transition-colors">
                  {copied === card.id ? <Check className="w-3 h-3 text-acc" /> : <Copy className="w-3 h-3" />} {copied === card.id ? 'Copied' : 'Copy'}
                </button>
                <button onClick={() => handleSpeak(card.id, card.text)} className={cn('flex items-center gap-1 text-xs transition-colors', speaking === card.id ? 'text-acc' : 'text-ink-muted hover:text-ink')}>
                  {speaking === card.id ? <MicOff className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />} {speaking === card.id ? 'Stop' : 'Listen'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
