'use client';

import { useState, useEffect } from 'react';
import { Loader2, Heart } from 'lucide-react';
import CollapsibleToggle from './CollapsibleToggle';
import { useI18n } from '@/app/i18n';

interface TestimonyRow {
  id: string;
  testimony: string;
  name: string | null;
  location: string | null;
  isAnonymous: boolean;
  createdAt: string;
}

function bylineFor(t: TestimonyRow): string {
  const who = t.isAnonymous || !t.name ? 'Anonymous' : t.name;
  return t.location ? `${who}, ${t.location}` : who;
}

export default function TestimonyCard() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [testimonials, setTestimonials] = useState<TestimonyRow[]>([]);
  const [loading, setLoading] = useState(false);

  const [text, setText] = useState('');
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!open || testimonials.length > 0) return;
    setLoading(true);
    fetch('/api/testimonials')
      .then((r) => r.json())
      .then((data) => setTestimonials(data.testimonials || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open, testimonials.length]);

  const handleSubmit = async () => {
    const trimmed = text.trim();
    if (!trimmed) {
      setSubmitError(t('ui.pleaseShareAFewWords'));
      return;
    }
    setSubmitError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/testimonials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testimony: trimmed,
          name: isAnonymous ? undefined : name.trim() || undefined,
          location: location.trim() || undefined,
          isAnonymous,
        }),
      });
      if (!res.ok) throw new Error(t('ui.requestFailed'));
      setSubmitted(true);
      setText('');
      setName('');
      setLocation('');
      setIsAnonymous(false);
    } catch {
      setSubmitError(t('ui.couldNotSubmitYourTestimony'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-card rounded-2xl border border-edge shadow-sm overflow-hidden">
      <div className="p-4">
        <h3 className="font-serif-heading text-base font-bold text-ink">{t('testimonyCard.testimonyPage')}</h3>
        <p className="text-ink-muted text-xs mt-0.5 mb-4">{t('testimonyCard.listenToHowThisApp')}</p>

        <CollapsibleToggle label={t('testimonyCard.whatOthersHaveShared')} open={open} onToggle={() => setOpen((v) => !v)}>
          <div className="border-t border-edge pt-4 mt-4">
            {loading && (
              <div className="flex justify-center py-6">
                <Loader2 className="w-5 h-5 text-ink-faint animate-spin" />
              </div>
            )}

            {!loading && testimonials.length === 0 && (
              <p className="text-ink-muted text-sm text-center py-4">{t('testimonyCard.noTestimoniesYetBeThe')}</p>
            )}

            <div className="space-y-3 mb-4">
              {testimonials.map((t) => (
                <div key={t.id} className="bg-card-2 rounded-xl p-4 border border-edge">
                  <p className="text-ink-soft text-sm leading-relaxed italic">&ldquo;{t.testimony}&rdquo;</p>
                  <p className="text-ink-faint text-xs font-semibold mt-2">— {bylineFor(t)}</p>
                </div>
              ))}
            </div>

            {/* Nested toggle: Share What God Has Done */}
            <CollapsibleToggle
              label={t('testimonyCard.shareWhatGodHasDone')}
              open={shareOpen}
              onToggle={() => { setShareOpen((v) => !v); setSubmitted(false); }}
              maxHeightPx={700}
            >
              <div className="border-t border-edge pt-4 mt-4">
                {submitted ? (
                  <div className="bg-acc-soft text-acc-strong rounded-xl px-4 py-4 text-sm text-center">{t('testimonyCard.thankYouForSharingYour')}</div>
                ) : (
                  <>
                    <p className="text-ink-muted text-xs leading-relaxed mb-4">{t('testimonyCard.tellUsHowThisApp')}</p>

                    <label className="block text-xs font-semibold text-ink-muted mb-1.5">{t('testimonyCard.yourTestimony')}</label>
                    <textarea
                      value={text}
                      onChange={(e) => { setText(e.target.value); setSubmitError(''); }}
                      placeholder={t('testimonyCard.sinceIStartedTheMidnight')}
                      rows={4}
                      className="w-full bg-card border border-edge-strong rounded-lg px-3 py-2.5 text-sm text-ink placeholder-ink-faint mb-3 focus:outline-none focus:ring-2 focus:ring-acc/40 focus:border-acc resize-none"
                    />

                    {!isAnonymous && (
                      <>
                        <label className="block text-xs font-semibold text-ink-muted mb-1.5">{t('testimonyCard.nameOptional')}</label>
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder={t('partnerNetwork.yourName')}
                          className="w-full bg-card border border-edge-strong rounded-lg px-3 py-2.5 text-sm text-ink placeholder-ink-faint mb-3 focus:outline-none focus:ring-2 focus:ring-acc/40 focus:border-acc"
                        />
                      </>
                    )}

                    <label className="block text-xs font-semibold text-ink-muted mb-1.5">{t('testimonyCard.locationOptional')}</label>
                    <input
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder={t('testimonyCard.cityCountry')}
                      className="w-full bg-card border border-edge-strong rounded-lg px-3 py-2.5 text-sm text-ink placeholder-ink-faint mb-3 focus:outline-none focus:ring-2 focus:ring-acc/40 focus:border-acc"
                    />

                    <label className="flex items-center gap-2 mb-4 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isAnonymous}
                        onChange={(e) => setIsAnonymous(e.target.checked)}
                        className="w-4 h-4 accent-acc"
                      />
                      <span className="text-sm text-ink-soft">{t('testimonyCard.postAnonymously')}</span>
                    </label>

                    {submitError && (
                      <div className="bg-danger-soft text-danger border border-danger-edge rounded-lg px-3 py-2.5 text-xs mb-3">
                        {submitError}
                      </div>
                    )}

                    <button
                      onClick={handleSubmit}
                      disabled={submitting}
                      className="w-full py-3.5 rounded-xl font-bold text-sm text-on-acc bg-acc hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all"
                    >
                      {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Heart className="w-4 h-4" />}
                      {submitting ? 'Submitting…' : t('ui.submitTestimony')}
                    </button>
                  </>
                )}
              </div>
            </CollapsibleToggle>
          </div>
        </CollapsibleToggle>
      </div>
    </div>
  );
}
