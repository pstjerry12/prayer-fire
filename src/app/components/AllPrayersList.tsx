import { Heart } from 'lucide-react';
import { cn } from '../utils/cn';
import type { PrayerPoint, IntercessoryPrayer, IntercessoryCategory } from '@/app/types';

export default function AllPrayersList({
  prayers,
  intercessoryPrayers,
  categories,
}: {
  prayers: PrayerPoint[];
  intercessoryPrayers: IntercessoryPrayer[];
  categories: IntercessoryCategory[];
}) {
  const familyPrayers = categories.flatMap((cat) =>
    cat.subCategories.flatMap((sub) =>
      sub.entries.map((entry) => ({
        id: `family-${cat.id}-${sub.id}-${entry.id}`,
        category: cat.name,
        subCategory: sub.name,
        title: entry.name || 'Unnamed',
        details: entry.details,
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
    isAnswered: p.isAnswered,
    type: 'personal' as const,
  }));

  const intercessory = intercessoryPrayers.map((p) => ({
    id: `intercessory-${p.id}`,
    category: p.category,
    subCategory: 'Intercessory Prayer',
    title: p.title,
    details: p.details,
    isAnswered: p.isAnswered,
    type: 'intercessory' as const,
  }));

  const allPrayers = [...familyPrayers, ...personalPrayers, ...intercessory];

  if (allPrayers.length === 0) {
    return (
      <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-center">
        <Heart className="w-8 h-8 text-slate-300 mx-auto mb-2" />
        <p className="text-slate-500 text-sm">No saved prayers yet</p>
        <p className="text-slate-400 text-xs">Write your prayer points in the Prayer Workshop</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {allPrayers.map((prayer) => (
        <div
          key={prayer.id}
          className={cn(
            'rounded-xl p-3 border-l-4 transition-all',
            prayer.isAnswered
              ? 'bg-emerald-50 border-l-emerald-500 border border-emerald-200'
              : prayer.type === 'family'
                ? 'bg-emerald-50/40 border-l-emerald-500 border border-emerald-200'
                : prayer.type === 'personal'
                  ? 'bg-white border-l-slate-400 border border-slate-200'
                  : 'bg-red-50/40 border-l-red-500 border border-red-200'
          )}
        >
          <p className={cn(
            'text-[10px] font-semibold uppercase tracking-wider mb-1',
            prayer.type === 'family' && 'text-emerald-700',
            prayer.type === 'personal' && 'text-slate-500',
            prayer.type === 'intercessory' && 'text-red-600'
          )}>
            {prayer.type === 'family' && `👨‍👩‍👧‍👦 ${prayer.category} · ${prayer.subCategory}`}
            {prayer.type === 'personal' && `🙏 ${prayer.category} · ${prayer.subCategory}`}
            {prayer.type === 'intercessory' && `🤝 ${prayer.category} · ${prayer.subCategory}`}
          </p>
          <h4 className="text-slate-900 font-bold text-sm">{prayer.title}</h4>
          {prayer.details && <p className="text-slate-600 text-xs mt-1 italic">{prayer.details}</p>}
        </div>
      ))}
    </div>
  );
}
