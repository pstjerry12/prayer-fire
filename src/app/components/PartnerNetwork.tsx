'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Users, Crown, Lock, Check, MapPin, Flame, Heart, Globe2 } from 'lucide-react';
import { useApp } from '@/app/context';
import { playChime } from '@/lib/clientUtils';

export default function PartnerNetwork() {
  const { partnerRequests, setPartnerRequests, isPremium } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [request, setRequest] = useState('');

  const submitRequest = () => {
    if (!name || !request) return;
    setPartnerRequests([{ id: Date.now().toString(), name, location, request, prayers: 0, createdAt: new Date().toISOString() }, ...partnerRequests]);
    // Send to the back office for admin review.
    fetch('/api/partner-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, location, request }),
    }).catch(() => {});
    setName('');
    setLocation('');
    setRequest('');
    setShowForm(false);
    playChime();
  };

  const prayForRequest = (id: string) => {
    setPartnerRequests(partnerRequests.map((r) => (r.id === id ? { ...r, prayers: r.prayers + 1 } : r)));
    playChime();
  };

  return (
    <div className="bg-card rounded-2xl border border-edge shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-edge flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-acc-soft text-acc"><Users className="w-5 h-5" /></div>
          <div className="flex items-center gap-2">
            <h2 className="font-bold text-ink">Partner Network</h2>
            {isPremium ? (
              <span className="bg-acc-soft-2 text-acc-strong text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1"><Crown className="w-3 h-3" /> PREMIUM</span>
            ) : (
              <span className="bg-card-3 text-ink-muted text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1"><Lock className="w-3 h-3" /> PREMIUM</span>
            )}
          </div>
        </div>
        {isPremium && (
          <button onClick={() => setShowForm(!showForm)} className="px-3 py-1.5 bg-emerald-600 rounded-lg text-white text-xs font-semibold hover:bg-emerald-500">
            {showForm ? 'Cancel' : '+ Add Request'}
          </button>
        )}
      </div>

      {!isPremium && (
        <div className="p-4">
          <div className="bg-acc-soft/50 border border-acc-edge rounded-xl p-5 text-center space-y-3">
            <Crown className="w-12 h-12 text-acc mx-auto" />
            <h3 className="text-ink font-bold text-base">Prayer Fire Partner Required</h3>
            <p className="text-ink-muted text-xs leading-relaxed">Join our global intercessory community. Submit prayer requests, join prayer groups, and stand in the gap with believers worldwide.</p>
            <ul className="text-left text-ink-soft text-xs space-y-1.5 max-w-xs mx-auto">
              <li className="flex items-start gap-2"><Check className="w-3 h-3 text-acc mt-0.5 flex-shrink-0" /><span>Join approved prayer groups</span></li>
              <li className="flex items-start gap-2"><Check className="w-3 h-3 text-acc mt-0.5 flex-shrink-0" /><span>Submit & pray for partner requests</span></li>
              <li className="flex items-start gap-2"><Check className="w-3 h-3 text-acc mt-0.5 flex-shrink-0" /><span>Global prayer alerts & reminders</span></li>
              <li className="flex items-start gap-2"><Check className="w-3 h-3 text-acc mt-0.5 flex-shrink-0" /><span>Create & manage groups (admin role)</span></li>
            </ul>
            <Link href="/partner" className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-500 flex items-center justify-center gap-2">
              <Crown className="w-4 h-4" /> Upgrade to Prayer Fire Partner
            </Link>
            <p className="text-ink-muted text-[10px]">Starting at ₦1,000/month • 14-day free trial</p>
          </div>
        </div>
      )}

      <div className="p-4">
        {showForm && (
          <div className="bg-card-2 rounded-xl p-4 mb-4 border border-edge space-y-3">
            <input type="text" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-card border border-edge-strong rounded-lg px-4 py-2 text-sm text-ink placeholder-ink-faint" />
            <input type="text" placeholder="Location (city, country)" value={location} onChange={(e) => setLocation(e.target.value)} className="w-full bg-card border border-edge-strong rounded-lg px-4 py-2 text-sm text-ink placeholder-ink-faint" />
            <textarea placeholder="Share your prayer request..." value={request} onChange={(e) => setRequest(e.target.value)} className="w-full bg-card border border-edge-strong rounded-lg px-4 py-2 text-sm text-ink placeholder-ink-faint resize-none h-20" />
            <button onClick={submitRequest} className="w-full py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-500">Submit Request</button>
          </div>
        )}

        <p className="text-ink-muted text-xs mb-3 text-center">{partnerRequests.length} prayer requests from around the world</p>

        <div className="space-y-3 max-h-80 overflow-y-auto">
          {partnerRequests.length === 0 ? (
            <div className="text-center py-8">
              <Globe2 className="w-8 h-8 text-ink-ghost mx-auto mb-2" />
              <p className="text-ink-muted text-sm">No requests yet</p>
              <p className="text-ink-faint text-xs">Be the first to share!</p>
            </div>
          ) : (
            partnerRequests.map((req) => (
              <div key={req.id} className="bg-card rounded-xl p-4 border border-edge">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="text-ink font-semibold text-sm">{req.name}</h4>
                    <p className="text-ink-muted text-xs flex items-center gap-1"><MapPin className="w-3 h-3" /> {req.location || 'Unknown'}</p>
                  </div>
                  <div className="flex items-center gap-1 bg-danger-soft px-2 py-1 rounded-full border border-danger-edge">
                    <Flame className="w-3 h-3 text-danger" />
                    <span className="text-danger text-xs font-bold">{req.prayers}</span>
                  </div>
                </div>
                <p className="text-ink-soft text-sm">{req.request}</p>
                <button onClick={() => prayForRequest(req.id)} className="mt-3 flex items-center gap-2 text-danger text-xs font-semibold hover:text-danger"><Heart className="w-4 h-4" /> Pray for this request</button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
