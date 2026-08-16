'use client';

import { useState } from 'react';
import { X, Check, Crown, Globe } from 'lucide-react';
import { cn } from '../utils/cn';
import {
  PRICING_PLANS,
  CURRENCIES,
  getDefaultCurrency,
  formatPrice,
  type Currency,
} from '../data/pricingPlans';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSelectPlan: (planId: string) => void;
}

export default function PricingPage({ isOpen, onClose, onSelectPlan }: Props) {
  const [currency, setCurrency] = useState<Currency>(getDefaultCurrency);
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('monthly');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm overflow-y-auto">
      <div className="min-h-full flex items-start justify-center p-4 py-10">
        <div className="bg-white rounded-3xl w-full max-w-3xl border border-slate-200 shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="p-5 border-b border-slate-200 flex items-start justify-between sticky top-0 bg-white z-10">
            <div>
              <h2 className="font-serif-heading text-xl font-bold text-slate-900">
                Become a Prayer Fire Partner
              </h2>
              <p className="text-slate-500 text-sm mt-1">Join the global intercessory community</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-500">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-5 space-y-5">
            {/* Currency + billing */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-slate-400" />
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value as Currency)}
                  className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900"
                >
                  {CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.flag} {c.label} ({c.symbol})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex bg-slate-100 rounded-lg p-1">
                <button
                  onClick={() => setBilling('monthly')}
                  className={cn(
                    'px-3 py-1.5 rounded-md text-xs font-semibold transition-all',
                    billing === 'monthly' ? 'bg-emerald-600 text-white' : 'text-slate-500'
                  )}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setBilling('yearly')}
                  className={cn(
                    'px-3 py-1.5 rounded-md text-xs font-semibold transition-all',
                    billing === 'yearly' ? 'bg-emerald-600 text-white' : 'text-slate-500'
                  )}
                >
                  Yearly <span className="text-emerald-300">Save 30%</span>
                </button>
              </div>
            </div>

            {/* Plans */}
            <div className="grid gap-4 sm:grid-cols-3">
              {PRICING_PLANS.map((plan) => {
                const price = billing === 'monthly' ? plan.monthly : plan.yearly;
                return (
                  <div
                    key={plan.id}
                    className={cn(
                      'rounded-2xl border p-5 flex flex-col',
                      plan.highlighted
                        ? 'border-emerald-500 bg-emerald-50/50 shadow-lg shadow-emerald-500/10'
                        : 'border-slate-200 bg-white'
                    )}
                  >
                    {plan.highlighted && (
                      <span className="self-start mb-3 inline-flex items-center gap-1 bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                        <Crown className="w-3 h-3" /> MOST POPULAR
                      </span>
                    )}
                    <div className="text-2xl mb-1">{plan.icon}</div>
                    <h3 className="text-slate-900 font-bold">{plan.name}</h3>
                    <p className="text-slate-500 text-xs mt-1 mb-3">{plan.tagline}</p>
                    <div className="mb-4">
                      <span className="text-3xl font-bold text-slate-900">
                        {price === 0 ? 'Free' : formatPrice(price, currency)}
                      </span>
                      {price !== 0 && (
                        <span className="text-slate-500 text-xs ml-1">
                          /{billing === 'monthly' ? 'mo' : 'yr'}
                        </span>
                      )}
                    </div>
                    <ul className="space-y-2 mb-5 flex-1">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-start gap-2 text-slate-600 text-xs">
                          <Check className="w-3.5 h-3.5 text-emerald-600 mt-0.5 flex-shrink-0" /> {f}
                        </li>
                      ))}
                    </ul>
                    <button
                      onClick={() => onSelectPlan(plan.id)}
                      className={cn(
                        'w-full py-2.5 rounded-xl text-sm font-bold transition-all',
                        plan.highlighted
                          ? 'bg-emerald-600 text-white hover:bg-emerald-500'
                          : 'border border-slate-300 text-slate-700 hover:bg-slate-50'
                      )}
                    >
                      {plan.cta}
                    </button>
                  </div>
                );
              })}
            </div>

            <p className="text-center text-slate-500 text-xs">
              💳 Secure checkout via Paystack &amp; Stripe &middot; 14-day free trial &middot; Cancel anytime
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
