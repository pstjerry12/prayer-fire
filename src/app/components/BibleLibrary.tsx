'use client';

import { useMemo, useState } from 'react';
import { ScrollText, Search, Heart, Copy, Check, Volume2, MicOff, Share2 } from 'lucide-react';
import { cn } from '../utils/cn';
import { KJV_BIBLE_CATEGORIES, KJV_BIBLE_VERSES } from '@/app/data/bibleVerses';
import { speakText, stopSpeech } from '@/lib/clientUtils';

export default function BibleLibrary() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [favorites, setFavorites] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem('upp_bible_favorites');
    return stored ? JSON.parse(stored) : [];
  });
  const [copied, setCopied] = useState<string | null>(null);
  const [speaking, setSpeaking] = useState<string | null>(null);
  const [showFavorites, setShowFavorites] = useState(false);

  const filteredVerses = useMemo(() => {
    let verses = selectedCategory ? KJV_BIBLE_VERSES.filter((v) => v.category === selectedCategory) : KJV_BIBLE_VERSES;
    if (search) {
      verses = verses.filter((v) => v.reference.toLowerCase().includes(search.toLowerCase()) || v.text.toLowerCase().includes(search.toLowerCase()));
    }
    if (showFavorites) verses = verses.filter((v) => favorites.includes(v.id));
    return verses;
  }, [selectedCategory, search, favorites, showFavorites]);

  const toggleFavorite = (id: string) => {
    const newFavs = favorites.includes(id) ? favorites.filter((f) => f !== id) : [...favorites, id];
    setFavorites(newFavs);
    localStorage.setItem('upp_bible_favorites', JSON.stringify(newFavs));
  };

  const handleCopy = (verse: typeof KJV_BIBLE_VERSES[0]) => {
    navigator.clipboard.writeText(`"${verse.text}" — ${verse.reference}`);
    setCopied(verse.id);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleSpeak = (id: string, text: string) => {
    if (speaking === id) {
      stopSpeech();
      setSpeaking(null);
    } else {
      speakText(text);
      setSpeaking(id);
      setTimeout(() => setSpeaking(null), 10000);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
        <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600"><ScrollText className="w-5 h-5" /></div>
        <div>
          <h2 className="font-bold text-slate-900">KJV Bible Library</h2>
          <p className="text-xs text-slate-500">Search, favorite, and share verses</p>
        </div>
      </div>
      <div className="p-4">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" placeholder="Search verses..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full bg-white border border-slate-300 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500" />
        </div>

        {!selectedCategory && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
            {KJV_BIBLE_CATEGORIES.map((cat) => {
              const catVerses = KJV_BIBLE_VERSES.filter((v) => v.category === cat.id);
              return (
                <button key={cat.id} onClick={() => setSelectedCategory(cat.id)} className="bg-white rounded-xl p-3 text-left hover:bg-emerald-50/50 transition-all border border-slate-200 hover:border-emerald-300">
                  <span className="text-xl mb-1 block">{cat.icon}</span>
                  <span className="text-slate-900 text-sm font-semibold">{cat.name}</span>
                  <span className="text-slate-400 text-xs ml-1">({catVerses.length})</span>
                </button>
              );
            })}
          </div>
        )}

        <div className="flex gap-2 mb-4">
          {selectedCategory && (
            <button onClick={() => setSelectedCategory(null)} className="px-3 py-1.5 bg-slate-100 rounded-lg text-sm text-slate-600 hover:bg-slate-200">← Back</button>
          )}
          <button onClick={() => setShowFavorites(!showFavorites)} className={cn('px-3 py-1.5 rounded-lg text-sm font-semibold transition-all', showFavorites ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}>
            <Heart className={cn('w-4 h-4 inline mr-1', favorites.length > 0 && 'fill-red-500')} /> Favorites ({favorites.length})
          </button>
        </div>

        {selectedCategory || search || showFavorites ? (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {filteredVerses.length === 0 ? (
              <p className="text-center text-slate-500 py-8">No verses found</p>
            ) : (
              filteredVerses.map((verse) => (
                <div key={verse.id} className="bg-white rounded-xl p-4 border border-slate-200">
                  <div className="flex items-start justify-between mb-2">
                    <p className="text-emerald-700 text-xs font-semibold">{verse.reference}</p>
                    <button onClick={() => toggleFavorite(verse.id)} className={cn('transition-all', favorites.includes(verse.id) ? 'text-red-500' : 'text-slate-300 hover:text-red-500')}>
                      <Heart className={cn('w-4 h-4', favorites.includes(verse.id) && 'fill-red-500')} />
                    </button>
                  </div>
                  <p className="text-slate-700 text-sm leading-relaxed">"{verse.text}"</p>
                  <div className="flex gap-3 mt-3">
                    <button onClick={() => handleCopy(verse)} className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-900">
                      {copied === verse.id ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />} {copied === verse.id ? 'Copied' : 'Copy'}
                    </button>
                    <button onClick={() => handleSpeak(verse.id, `${verse.reference}. ${verse.text}`)} className={cn('flex items-center gap-1 text-xs', speaking === verse.id ? 'text-emerald-600' : 'text-slate-500 hover:text-slate-900')}>
                      {speaking === verse.id ? <MicOff className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />} {speaking === verse.id ? 'Stop' : 'Listen'}
                    </button>
                    <button onClick={() => navigator.share?.({ title: verse.reference, text: `"${verse.text}" — ${verse.reference}` })} className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-900"><Share2 className="w-3 h-3" /> Share</button>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <p className="text-center text-slate-500 text-sm py-4">Select a category above or search for verses</p>
        )}
      </div>
    </div>
  );
}
