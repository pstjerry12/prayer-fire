'use client';

import { useState } from 'react';
import { BookHeart, ChevronDown, ChevronRight, Check, Award, Lightbulb } from 'lucide-react';
import { WISDOM_CHAPTERS, COLOR_CLASSES } from '@/app/data/wisdomData';
import { playChime } from '@/lib/clientUtils';

export default function WisdomSection() {
  const [selectedChapter, setSelectedChapter] = useState<number | null>(null);
  const [readingProgress, setReadingProgress] = useState<Record<number, boolean>>(() => {
    if (typeof window === 'undefined') return {};
    const stored = localStorage.getItem('upp_wisdom_read');
    return stored ? JSON.parse(stored) : {};
  });

  const markAsRead = (id: number) => {
    const newProgress = { ...readingProgress, [id]: true };
    setReadingProgress(newProgress);
    localStorage.setItem('upp_wisdom_read', JSON.stringify(newProgress));
    playChime();
  };

  const currentChapter = selectedChapter ? WISDOM_CHAPTERS.find((c) => c.id === selectedChapter) : null;
  const colors = COLOR_CLASSES[currentChapter?.color || 'emerald'];
  const readCount = Object.values(readingProgress).filter(Boolean).length;

  if (currentChapter) {
    return (
      <div className="bg-card rounded-2xl border border-edge shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-edge flex items-center gap-3">
          <button onClick={() => setSelectedChapter(null)} className="p-2 hover:bg-card-3 rounded-full"><ChevronDown className="w-5 h-5 text-ink-muted rotate-90" /></button>
          <div className="flex-1">
            <p className="text-xs text-acc-strong font-semibold">Chapter {currentChapter.id} of {WISDOM_CHAPTERS.length}</p>
            <h2 className="font-bold text-ink text-base">{currentChapter.title}</h2>
          </div>
          <span className="text-2xl">{currentChapter.icon}</span>
        </div>
        <div className="p-5 space-y-5">
          <div className="text-center"><p className="text-ink-muted text-sm font-medium italic">{currentChapter.subtitle}</p></div>
          {currentChapter.verses.map((verse, idx) => (
            <div key={idx} className="bg-acc-soft border-l-4 border-emerald-500 rounded-r-xl p-4">
              <p className="text-acc-strong text-xs font-bold uppercase tracking-wider mb-2">📖 Scripture</p>
              <p className="text-ink-soft text-sm leading-relaxed italic">"{verse}"</p>
            </div>
          ))}
          <div className="space-y-3">
            {currentChapter.paragraphs.map((para, idx) => <p key={idx} className="text-ink-soft text-sm leading-relaxed">{para}</p>)}
          </div>
          <div className={`bg-gradient-to-br ${colors.gradient} rounded-xl p-5 border ${colors.border}`}>
            <div className="flex items-start gap-3">
              <div className={`w-10 h-10 rounded-full ${colors.badge} flex items-center justify-center flex-shrink-0 text-acc-strong`}><Lightbulb className="w-5 h-5" /></div>
              <div className="flex-1">
                <p className="text-ink-muted text-xs font-bold uppercase tracking-wider mb-2">Key Takeaway</p>
                <p className="text-ink text-sm leading-relaxed font-medium italic">"{currentChapter.highlight}"</p>
              </div>
            </div>
          </div>
          <div className="space-y-2 pt-2">
            {!readingProgress[currentChapter.id] ? (
              <button onClick={() => markAsRead(currentChapter.id)} className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-500 transition-all flex items-center justify-center gap-2"><Check className="w-4 h-4" /> Mark as Read</button>
            ) : (
              <div className="w-full py-3 bg-acc-soft text-acc-strong rounded-xl font-bold border border-acc-edge flex items-center justify-center gap-2"><Check className="w-4 h-4" /> Completed ✓</div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => { if (currentChapter.id > 1) setSelectedChapter(currentChapter.id - 1); }} disabled={currentChapter.id === 1} className="py-2.5 bg-card text-ink-soft rounded-xl text-sm font-semibold border border-edge hover:bg-card-2 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-1">← Previous</button>
              <button onClick={() => { if (currentChapter.id < WISDOM_CHAPTERS.length) setSelectedChapter(currentChapter.id + 1); else setSelectedChapter(null); }} className="py-2.5 bg-card text-ink-soft rounded-xl text-sm font-semibold border border-edge hover:bg-card-2 flex items-center justify-center gap-1">{currentChapter.id < WISDOM_CHAPTERS.length ? 'Next →' : 'Done ✓'}</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-2xl border border-edge shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-edge">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-acc-soft flex items-center justify-center text-acc"><BookHeart className="w-5 h-5" /></div>
          <div className="flex-1">
            <h2 className="font-bold text-ink text-lg">Learn to Pray</h2>
            <p className="text-ink-muted text-xs italic">The Pray 3x guide — pray three times a day</p>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-3">
          <div className="flex-1 h-1.5 bg-card-3 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-600 transition-all duration-500" style={{ width: `${(readCount / WISDOM_CHAPTERS.length) * 100}%` }} />
          </div>
          <span className="text-acc-strong text-[10px] font-semibold">{readCount}/{WISDOM_CHAPTERS.length}</span>
        </div>
      </div>
      <div className="p-4 space-y-2">
        {WISDOM_CHAPTERS.map((chapter) => {
          const isRead = readingProgress[chapter.id];
          return (
            <button key={chapter.id} onClick={() => setSelectedChapter(chapter.id)} className="w-full bg-card border border-edge rounded-xl p-3 text-left hover:border-acc-edge hover:bg-acc-soft/30 transition-all group">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-acc-soft flex items-center justify-center text-xl flex-shrink-0">{chapter.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[10px] font-bold text-acc-strong uppercase tracking-wider">Chapter {chapter.id}</span>
                    {isRead && <span className="bg-acc-soft-2 text-acc-strong text-[9px] px-1.5 py-0.5 rounded-full font-bold">✓ READ</span>}
                  </div>
                  <h3 className="text-ink font-bold text-sm truncate">{chapter.title}</h3>
                  <p className="text-ink-muted text-[11px] italic truncate">{chapter.subtitle}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-ink-ghost group-hover:translate-x-1 group-hover:text-acc transition-transform" />
              </div>
            </button>
          );
        })}
        {readCount === WISDOM_CHAPTERS.length && (
          <div className="mt-4 bg-acc-soft border border-acc-edge rounded-xl p-4 text-center">
            <Award className="w-8 h-8 text-acc mx-auto mb-2" />
            <p className="text-acc-strong font-bold text-sm">All Chapters Completed!</p>
            <p className="text-acc/80 text-xs">You've finished all wisdom teachings. May they transform your prayer life.</p>
          </div>
        )}
      </div>
    </div>
  );
}
