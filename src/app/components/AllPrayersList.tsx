'use client';

import { useState } from 'react';
import { Heart, ChevronRight } from 'lucide-react';
import { cn } from '../utils/cn';
import type { PrayerPoint, IntercessoryPrayer, IntercessoryCategory } from '@/app/types';
import PrayerReader, { type ReaderItem } from './PrayerReader';

export default function AllPrayersList({
  prayers,
  intercessoryPrayers,
  categories,
}: {
  prayers: PrayerPoint[];
  intercessoryPrayers: IntercessoryPrayer[];
  categories: IntercessoryCategory[];
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const familyPrayers = categories.flatMap((cat) =>
    cat.subCategories.flatMap((sub) =>
      sub.entries.map((entry) => ({
        id: `family-${cat.id}-${sub.id}-${entry.id}`,
        category: cat.name,
        subCategory: sub.name,
        title: entry.name || 'Unnamed',
        details: entry.details,
        scripture: undefined,
        isAnswered: entry.isAnswered,
        type: 'family' as const,
      }))
    )
  );

  const personalPrayers = prayers.map((p) => ({
    id: `personal-${p.id}`,
    category: p.category,
    subCategory: 'Special Prayer',
    title: p.title,
    details: p.notes,
    scripture: p.scripture,
    isAnswered: p.isAnswered,
    type: 'personal' as const,
  }));

  const intercessory = intercessoryPrayers.map((p) => ({
    id: `intercessory-${p.id}`,
    category: p.category,
    subCategory: 'Intercessory Prayer',
    title: p.title,
    details: p.details,
    scripture: undefined,
    isAnswered: p.isAnswered,
    type: 'intercessory' as const,
  }));

  const allPrayers = [...familyPrayers, ...personalPrayers, ...intercessory];

  if (allPrayers.length === 0) {
    return (
      <div className="bg-card-2 rounded-xl p-4 border border-edge text-center">
        <Heart className="w-8 h-8 text-ink-ghost mx-auto mb-2" />
        <p className="text-ink-muted text-sm">No saved prayers yet</p>
        <p className="text-ink-faint text-xs">Write your prayer points in the Prayer Workshop</p>
      </div>
    );
  }

  const readerItems: ReaderItem[] = allPrayers.map((p) => ({
    id: p.id,
    title: p.title,
    category: p.category,
    subCategory: p.subCategory,
    details: p.details,
    scripture: p.scripture,
  }));

  return (
    <>
      <div className="space-y-2">
        {allPrayers.map((prayer, idx) => (
          <button
            key={prayer.id}
            onClick={() => setOpenIndex(idx)}
            className={cn(
              'w-full text-left rounded-xl p-3 border-l-4 transition-all hover:brightness-95 active:scale-[0.99] flex items-center gap-2',
              prayer.isAnswered
                ? 'bg-acc-soft border-l-emerald-500 border border-acc-edge'
                : prayer.type === 'family'
                  ? 'bg-acc-soft/40 border-l-emerald-500 border border-acc-edge'
                  : prayer.type === 'personal'
                    ? 'bg-card border-l-edge-strong border border-edge'
                    : 'bg-danger-soft/40 border-l-red-500 border border-danger-edge'
            )}
          >
            <div className="flex-1 min-w-0">
              <p className={cn(
                'text-[10px] font-semibold uppercase tracking-wider mb-1',
                prayer.type === 'family' && 'text-acc-strong',
                prayer.type === 'personal' && 'text-ink-muted',
                prayer.type === 'intercessory' && 'text-danger'
              )}>
                {prayer.type === 'family' && `👨‍👩‍👧‍👦 ${prayer.category} · ${prayer.subCategory}`}
                {prayer.type === 'personal' && `🙏 ${prayer.category} · ${prayer.subCategory}`}
                {prayer.type === 'intercessory' && `🤝 ${prayer.category} · ${prayer.subCategory}`}
              </p>
              <h4 className="text-ink font-bold text-sm truncate">{prayer.title}</h4>
            </div>
            <ChevronRight className="w-4 h-4 text-ink-faint flex-shrink-0" />
          </button>
        ))}
      </div>

      {openIndex !== null && (
        <PrayerReader
          items={readerItems}
          initialIndex={openIndex}
          onClose={() => setOpenIndex(null)}
        />
      )}
    </>
  );
}
