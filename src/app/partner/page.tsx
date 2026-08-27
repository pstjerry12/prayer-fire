'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, Crown, Check, Globe } from 'lucide-react';
import { cn } from '@/app/utils/cn';
import Navbar from '@/app/components/Navbar';
import Footer from '@/app/components/Footer';
import { PRICING_PLANS, CURRENCIES, getDefaultCurrency, formatPrice, type Currency } from '@/app/data/pricingPlans';
import { useApp } from '@/app/context';

export default function PartnerPage() {
  const { isPremium, upgrade } = useApp();
  const [currency, setCurrency] = useState<Currency>(getDefaultCurrency);
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('monthly');

  return (
    <>
      <Navbar />
      <main className="max-w-3xl md:max-w-4xl mx-auto px-4 py-6 pb-28 md:pb-10">
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-ink-muted hover:text-acc mb-4">
          <ChevronLeft className="w-4 h-4" /> Home
        </Link>

        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-full bg-acc-soft text-acc flex items-center justify-center mx-auto mb-3">
            <Crown className="w-6 h-6" />
          </div>
          <h1 className="font-serif-heading text-2xl font-bold text-ink">Prayer Fire Partner</h1>
          <p className="text-ink-muted text-sm mt-1">Join the global intercessory community</p>
        </div>

        {isPremium ? (
          <div className="bg-acc-soft border border-acc-edge rounded-2xl p-6 text-center">
            <div className="text-4xl mb-3">👑</div>
            <h2 className="text-acc-strong font-bold text-lg mb-1">You are a Prayer Fire Partner!</h2>
            <p className="text-ink-muted text-sm">Your premium features are now active. Enjoy the full intercessory community.</p>
            <Link href="/network" className="inline-block mt-4 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-500">Go to Partner Network →</Link>
          </div>
        ) : (
          <>
            {/* Currency + billing */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-ink-faint" />
                <select value={currency} onChange={(e) => setCurrency(e.target.value as Currency)} className="bg-card border border-edge-strong rounded-lg px-3 py-2 text-sm text-ink">
                  {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.flag} {c.label} ({c.symbol})</option>)}
                </select>
              </div>
              <div className="flex bg-card-3 rounded-lg p-1">
                <button onClick={() => setBilling('monthly')} className={cn('px-3 py-1.5 rounded-md text-xs font-semibold transition-all', billing === 'monthly' ? 'bg-emerald-600 text-white' : 'text-ink-muted')}>Monthly</button>
                <button onClick={() => setBilling('yearly')} className={cn('px-3 py-1.5 rounded-md text-xs font-semibold transition-all', billing === 'yearly' ? 'bg-emerald-600 text-white' : 'text-ink-muted')}>Yearly <span className="text-emerald-300">Save 30%</span></button>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {PRICING_PLANS.map((plan) => {
                const price = billing === 'monthly' ? plan.monthly : plan.yearly;
                return (
                  <div key={plan.id} className={cn('rounded-2xl border p-5 flex flex-col', plan.highlighted ? 'border-emerald-500 bg-acc-soft/50 shadow-lg shadow-emerald-500/10' : 'border-edge bg-card')}>
                    {plan.highlighted && (
                      <span className="self-start mb-3 inline-flex items-center gap-1 bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full"><Crown className="w-3 h-3" /> MOST POPULAR</span>
                    )}
                    <div className="text-2xl mb-1">{plan.icon}</div>
                    <h3 className="text-ink font-bold">{plan.name}</h3>
                    <p className="text-ink-muted text-xs mt-1 mb-3">{plan.tagline}</p>
                    <div className="mb-4">
                      {price === 0 ? (
                        <span className="text-3xl font-bold text-ink">Free</span>
                      ) : (
                        <>
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-3xl font-bold text-emerald-600">$0.00</span>
                            <span className="text-ink-muted text-xs">/ 7 days free</span>
                          </div>
                          <div className="text-ink-faint text-sm line-through mt-0.5">
                            {formatPrice(price, currency)}/{billing === 'monthly' ? 'mo' : 'yr'} after
                          </div>
                        </>
                      )}
                    </div>
                    <ul className="space-y-2 mb-5 flex-1">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-start gap-2 text-ink-muted text-xs"><Check className="w-3.5 h-3.5 text-acc mt-0.5 flex-shrink-0" /> {f}</li>
                      ))}
                    </ul>
                    {price === 0 ? (
                      <button onClick={() => window.location.href = '/'} className="w-full py-2.5 rounded-xl text-sm font-bold border border-edge-strong text-ink-soft hover:bg-card-2">Start Free</button>
                    ) : (
                      <button onClick={upgrade} className={cn('w-full py-2.5 rounded-xl text-sm font-bold transition-all', plan.highlighted ? 'bg-emerald-600 text-white hover:bg-emerald-500' : 'border border-edge-strong text-ink-soft hover:bg-card-2')}>{plan.cta}</button>
                    )}
                  </div>
                );
              })}
            </div>

            <p className="text-center text-ink-muted text-xs mt-5">🎁 7-day free trial · No charge today · Pay after your trial</p>
          </>
        )}
      </main>
      <Footer />
    </>
  );
}
