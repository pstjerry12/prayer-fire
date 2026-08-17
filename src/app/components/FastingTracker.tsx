'use client';

import { useState } from 'react';
import { Utensils, Coffee, CloudSun, BookOpen, Flame, Check, Award } from 'lucide-react';
import { cn } from '../utils/cn';
import type { FastingPlan } from '@/app/types';

export default function FastingTracker() {
  const [plan, setPlan] = useState<FastingPlan | null>(() => {
    if (typeof window === 'undefined') return null;
    const stored = localStorage.getItem('upp_fasting_plan');
    return stored ? JSON.parse(stored) : null;
  });

  const startFast = (days: number) => {
    const newPlan: FastingPlan = { id: Date.now().toString(), days, startDate: new Date().toISOString(), completedDays: 0, checkedDays: [] };
    setPlan(newPlan);
    localStorage.setItem('upp_fasting_plan', JSON.stringify(newPlan));
  };

  const toggleDay = (day: number) => {
    if (!plan) return;
    const newChecked = plan.checkedDays.includes(day.toString()) ? plan.checkedDays.filter((d) => d !== day.toString()) : [...plan.checkedDays, day.toString()];
    const newPlan = { ...plan, checkedDays: newChecked, completedDays: newChecked.length };
    setPlan(newPlan);
    localStorage.setItem('upp_fasting_plan', JSON.stringify(newPlan));
  };

  const resetPlan = () => {
    setPlan(null);
    localStorage.removeItem('upp_fasting_plan');
  };

  const plans = [
    { days: 3, title: '3 Days', subtitle: 'Starter Fast', icon: <Coffee className="w-5 h-5" /> },
    { days: 7, title: '7 Days', subtitle: 'Week Fast', icon: <CloudSun className="w-5 h-5" /> },
    { days: 21, title: '21 Days', subtitle: 'Daniel Fast', icon: <BookOpen className="w-5 h-5" /> },
    { days: 40, title: '40 Days', subtitle: 'Full Fast', icon: <Flame className="w-5 h-5" /> },
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
        <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600"><Utensils className="w-5 h-5" /></div>
        <div>
          <h2 className="font-bold text-slate-900">Fasting Tracker</h2>
          <p className="text-xs text-slate-500">Discipline your body, feed your spirit</p>
        </div>
      </div>
      <div className="p-4">
        {!plan ? (
          <>
            <p className="text-slate-500 text-sm mb-4 text-center">Choose your fasting plan</p>
            <div className="grid grid-cols-2 gap-3">
              {plans.map((p) => (
                <button key={p.days} onClick={() => startFast(p.days)} className="p-4 rounded-xl text-left border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/40 transition-all">
                  <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2">{p.icon}</div>
                  <h3 className="font-bold text-sm text-slate-900">{p.title}</h3>
                  <p className="text-slate-500 text-xs">{p.subtitle}</p>
                </button>
              ))}
            </div>
          </>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-slate-900 font-bold">{plan.days}-Day Fast</h3>
                <p className="text-slate-500 text-xs">Started: {new Date(plan.startDate).toLocaleDateString()}</p>
              </div>
              <div className="text-right">
                <p className="text-emerald-600 font-bold text-2xl">{plan.completedDays}/{plan.days}</p>
                <p className="text-slate-500 text-xs">days completed</p>
              </div>
            </div>
            <div className="h-2 bg-slate-100 rounded-full mb-4 overflow-hidden">
              <div className="h-full bg-emerald-600 transition-all duration-500" style={{ width: `${(plan.completedDays / plan.days) * 100}%` }} />
            </div>
            <div className="grid grid-cols-5 gap-2 mb-4">
              {Array.from({ length: plan.days }, (_, i) => i + 1).map((day) => (
                <button key={day} onClick={() => toggleDay(day)} className={cn('aspect-square rounded-lg flex items-center justify-center font-bold text-sm transition-all', plan.checkedDays.includes(day.toString()) ? 'bg-emerald-600 text-white' : 'bg-slate-50 text-slate-500 border border-slate-200 hover:border-emerald-300')}>
                  {plan.checkedDays.includes(day.toString()) ? <Check className="w-4 h-4" /> : day}
                </button>
              ))}
            </div>
            {plan.completedDays === plan.days && (
              <div className="bg-emerald-50 rounded-xl p-4 text-center border border-emerald-200 mb-4">
                <Award className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                <p className="text-emerald-700 font-bold">Fast Completed!</p>
                <p className="text-emerald-600/80 text-sm">Well done! God honors your dedication.</p>
              </div>
            )}
            <button onClick={resetPlan} className="w-full py-2 bg-slate-100 rounded-xl text-slate-600 text-sm font-semibold hover:bg-slate-200">Start New Fast</button>
          </div>
        )}
      </div>
    </div>
  );
}
