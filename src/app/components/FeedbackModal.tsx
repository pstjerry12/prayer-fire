'use client';

import { useEffect, useState } from 'react';
import { X, MessageSquareHeart, Loader2, CheckCircle2, Send } from 'lucide-react';
import { cn } from '../utils/cn';
import { getStoredToken } from '@/lib/authClient';
import { getAppVersionInfo, getNativePlatform } from '@/lib/capacitorAlarm';
import type { AuthUser } from '@/app/types';

type Category = 'bug' | 'idea' | 'praise' | 'other';

const CATEGORIES: { id: Category; emoji: string; label: string; placeholder: string }[] = [
  { id: 'bug', emoji: '🐞', label: 'Problem', placeholder: 'What went wrong? What were you doing when it happened?' },
  { id: 'idea', emoji: '💡', label: 'Idea', placeholder: 'What would make Prayer Fire better for you?' },
  { id: 'praise', emoji: '🙏', label: 'Praise', placeholder: 'What do you love about the app?' },
  { id: 'other', emoji: '💬', label: 'Other', placeholder: 'Tell us anything…' },
];

const MAX_MESSAGE = 2000;

interface Props {
  isOpen: boolean;
  onClose: () => void;
  user: AuthUser | null;
}

export default function FeedbackModal({ isOpen, onClose, user }: Props) {
  const [category, setCategory] = useState<Category>('bug');
  const [message, setMessage] = useState('');
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  // Fresh form each time it opens, prefilled from the signed-in account
  useEffect(() => {
    if (!isOpen) return;
    setSent(false);
    setError('');
    setName(user?.name ?? '');
    setContact(user?.email || (user?.phone ? `${user.countryCode ?? ''} ${user.phone}`.trim() : ''));
  }, [isOpen, user]);

  if (!isOpen) return null;

  const current = CATEGORIES.find((c) => c.id === category)!;

  const handleSend = async () => {
    if (!message.trim()) {
      setError('Please write your feedback first.');
      return;
    }
    setSending(true);
    setError('');
    try {
      const info = await getAppVersionInfo();
      const token = getStoredToken();
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          category,
          message,
          name,
          contact,
          appVersion: info ? `${info.version} (${info.build})` : null,
          platform: getNativePlatform(),
          page: window.location.pathname,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || 'Could not send feedback. Please try again.');
      }
      setSent(true);
      setMessage('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send feedback. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm overflow-y-auto">
      <div className="min-h-full flex items-start justify-center p-4 py-10">
        <div className="bg-card rounded-3xl w-full max-w-md border border-edge shadow-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-edge flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquareHeart className="w-5 h-5 text-acc" />
              <h2 className="font-bold text-ink">Send Feedback</h2>
            </div>
            <button onClick={onClose} aria-label="Close" className="p-2 hover:bg-card-3 rounded-full text-ink-muted">
              <X className="w-5 h-5" />
            </button>
          </div>

          {sent ? (
            <div className="p-6 text-center space-y-3">
              <CheckCircle2 className="w-12 h-12 text-acc mx-auto" />
              <h3 className="font-serif-heading text-lg font-bold text-ink">Thank you!</h3>
              <p className="text-ink-muted text-sm leading-relaxed">
                Your feedback has reached the Prayer Fire team. We read every message and use it to improve the app.
              </p>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setSent(false)}
                  className="flex-1 py-3 bg-card-2 border border-edge text-ink-soft rounded-xl font-bold text-sm hover:bg-card-3"
                >
                  Send more
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-500"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            <div className="p-5 space-y-4">
              <p className="text-ink-muted text-sm leading-relaxed">
                Found a problem or have an idea? Tell us — every message helps make Prayer Fire better.
              </p>

              <div className="grid grid-cols-4 gap-1.5" role="radiogroup" aria-label="Feedback type">
                {CATEGORIES.map((c) => (
                  <button
                    key={c.id}
                    role="radio"
                    aria-checked={category === c.id}
                    onClick={() => setCategory(c.id)}
                    className={cn(
                      'flex flex-col items-center gap-1 py-2 rounded-lg border text-xs font-semibold transition-all',
                      category === c.id
                        ? 'bg-acc-soft text-acc-strong border-acc-edge'
                        : 'bg-card text-ink-muted border-edge hover:bg-card-2'
                    )}
                  >
                    <span className="text-lg leading-none" aria-hidden>{c.emoji}</span>
                    {c.label}
                  </button>
                ))}
              </div>

              <div>
                <label htmlFor="feedback-message" className="block text-xs font-semibold text-ink-muted mb-1.5">
                  Your feedback
                </label>
                <textarea
                  id="feedback-message"
                  value={message}
                  onChange={(e) => { setMessage(e.target.value.slice(0, MAX_MESSAGE)); setError(''); }}
                  placeholder={current.placeholder}
                  rows={5}
                  className="w-full bg-card border border-edge-strong rounded-lg px-3 py-2.5 text-sm text-ink placeholder-ink-faint focus:outline-none focus:ring-2 focus:ring-emerald-500/40 resize-y"
                />
                <p className="text-right text-ink-faint text-[0.625rem] mt-0.5">{message.length}/{MAX_MESSAGE}</p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label htmlFor="feedback-name" className="block text-xs font-semibold text-ink-muted mb-1.5">
                    Name <span className="font-normal text-ink-faint">(optional)</span>
                  </label>
                  <input
                    id="feedback-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-card border border-edge-strong rounded-lg px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                  />
                </div>
                <div>
                  <label htmlFor="feedback-contact" className="block text-xs font-semibold text-ink-muted mb-1.5">
                    Email / phone <span className="font-normal text-ink-faint">(optional)</span>
                  </label>
                  <input
                    id="feedback-contact"
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                    className="w-full bg-card border border-edge-strong rounded-lg px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                  />
                </div>
              </div>

              {error && (
                <div className="bg-danger-soft text-danger border border-danger-edge rounded-lg px-3 py-2.5 text-xs">
                  {error}
                </div>
              )}

              <button
                onClick={handleSend}
                disabled={sending}
                className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-500 disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {sending ? 'Sending…' : 'Send Feedback'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
