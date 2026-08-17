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
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
        <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600"><BookOpen className="w-5 h-5" /></div>
        <div>
          <h2 className="font-bold text-slate-900">Scripture Vault</h2>
          <p className="text-xs text-slate-500">Key verses in five languages</p>
        </div>
      </div>
      <div className="p-4">
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          {LANGS.map((l) => (
            <button key={l.code} onClick={() => setLang(l.code)} className={cn('px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all', lang === l.code ? 'bg-emerald-600 text-white' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50')}>
              {l.flag} {l.label}
            </button>
          ))}
        </div>
        <div className="grid gap-3">
          {filtered.map((card) => (
            <div key={card.id} className="bg-white rounded-xl p-4 border border-slate-200">
              <p className="text-emerald-700 text-xs font-semibold mb-2">{card.reference}</p>
              <p className="text-slate-700 text-sm leading-relaxed italic">"{card.text}"</p>
              <div className="flex gap-3 mt-3">
                <button onClick={() => handleCopy(card.id, `"${card.text}" — ${card.reference}`)} className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-900 transition-colors">
                  {copied === card.id ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />} {copied === card.id ? 'Copied' : 'Copy'}
                </button>
                <button onClick={() => handleSpeak(card.id, card.text)} className={cn('flex items-center gap-1 text-xs transition-colors', speaking === card.id ? 'text-emerald-600' : 'text-slate-500 hover:text-slate-900')}>
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
