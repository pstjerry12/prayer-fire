'use client';

import { useState, type ReactElement } from 'react';
import {
  Sparkles, Heart, Users, Shield, Cross, Globe, ChevronDown, ChevronUp,
  Search, Lock, Plus, Trash2, MicOff, Mic, StickyNote, Save, Check, Eye,
} from 'lucide-react';
import { cn } from '../utils/cn';
import type { PrayerPoint, IntercessoryPrayer, IntercessoryCategory, PrayerEntry } from '@/app/types';
import { useApp } from '@/app/context';
import { playChime, useSpeechToText } from '@/lib/clientUtils';

const CATEGORY_ICONS: Record<string, ReactElement> = {
  'Family': <Users className="w-4 h-4" />,
  'Personal Needs': <Sparkles className="w-4 h-4" />,
  'Divine Protection': <Shield className="w-4 h-4" />,
  'Divine Healing': <Heart className="w-4 h-4" />,
  'Divine Intervention': <Sparkles className="w-4 h-4" />,
  'Church & Ministry': <Cross className="w-4 h-4" />,
  'Nation & Leaders': <Globe className="w-4 h-4" />,
};

function SpeechToTextButton({
  isListening, onStart, onStop, error,
}: { isListening: boolean; onStart: () => void; onStop: () => void; error: string | null }) {
  const supported = typeof window !== 'undefined' && !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
  if (!supported) return null;
  return (
    <>
      <button
        type="button"
        onClick={() => (isListening ? onStop() : onStart())}
        title={isListening ? 'Stop listening' : 'Speak instead of typing'}
        className={cn(
          'absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full transition-colors',
          isListening ? 'bg-danger-soft-2 text-danger animate-pulse' : 'text-ink-faint hover:text-acc hover:bg-card-3'
        )}
      >
        {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
      </button>
      {error && (
        <div className="absolute right-0 top-full mt-1 text-[10px] text-danger bg-danger-soft px-2 py-1 rounded border border-danger-edge z-10">{error}</div>
      )}
    </>
  );
}

function FamilyPrayerSession() {
  const { categories, setCategories } = useApp();
  const [expandedCat, setExpandedCat] = useState<string | null>(null);
  const [expandedSub, setExpandedSub] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDetails, setEditDetails] = useState('');
  const editNameSpeech = useSpeechToText((text) => setEditName((prev) => (prev ? prev + ' ' + text : text)));
  const editDetailsSpeech = useSpeechToText((text) => setEditDetails((prev) => (prev ? prev + ' ' + text : text)));

  const addEntry = (catId: string, subId: string) => {
    const newEntry: PrayerEntry = { id: Date.now().toString(), name: '', details: '', isAnswered: false };
    setCategories(categories.map((cat) => (cat.id === catId ? {
      ...cat,
      subCategories: cat.subCategories.map((sub) => (sub.id === subId ? { ...sub, entries: [...sub.entries, newEntry] } : sub)),
    } : cat)));
    setEditingId(newEntry.id);
    setEditName('');
    setEditDetails('');
    playChime();
  };

  const removeEntry = (catId: string, subId: string, entryId: string) => {
    setCategories(categories.map((cat) => (cat.id === catId ? {
      ...cat,
      subCategories: cat.subCategories.map((sub) => (sub.id === subId ? { ...sub, entries: sub.entries.filter((e) => e.id !== entryId) } : sub)),
    } : cat)));
  };

  const startEdit = (entry: PrayerEntry) => {
    setEditingId(entry.id);
    setEditName(entry.name);
    setEditDetails(entry.details);
  };

  const saveEdit = (catId: string, subId: string, entryId: string) => {
    setCategories(categories.map((cat) => (cat.id === catId ? {
      ...cat,
      subCategories: cat.subCategories.map((sub) => (sub.id === subId ? {
        ...sub,
        entries: sub.entries.map((e) => (e.id === entryId ? { ...e, name: editName, details: editDetails } : e)),
      } : sub)),
    } : cat)));
    setEditingId(null);
    setEditName('');
    setEditDetails('');
  };

  const toggleAnswered = (catId: string, subId: string, entryId: string) => {
    setCategories(categories.map((cat) => (cat.id === catId ? {
      ...cat,
      subCategories: cat.subCategories.map((sub) => (sub.id === subId ? {
        ...sub,
        entries: sub.entries.map((e) => (e.id === entryId ? { ...e, isAnswered: !e.isAnswered } : e)),
      } : sub)),
    } : cat)));
  };

  return (
    <div className="space-y-2">
      {categories.map((cat) => (
        <div key={cat.id} className="bg-card-2 rounded-lg overflow-hidden border border-edge">
          <button
            onClick={() => setExpandedCat(expandedCat === cat.id ? null : cat.id)}
            className="w-full p-3 flex items-center justify-between hover:bg-card-3"
          >
            <div className="flex items-center gap-2">
              {CATEGORY_ICONS[cat.name] || <Sparkles className="w-4 h-4 text-acc" />}
              <span className="text-ink text-sm font-medium">{cat.name}</span>
              <span className="text-ink-faint text-[10px]">({cat.subCategories.reduce((acc, s) => acc + s.entries.length, 0)})</span>
            </div>
            {expandedCat === cat.id ? <ChevronUp className="w-4 h-4 text-ink-faint" /> : <ChevronDown className="w-4 h-4 text-ink-faint" />}
          </button>
          {expandedCat === cat.id && (
            <div className="p-3 pt-0 space-y-2">
              {cat.subCategories.map((sub) => (
                <div key={sub.id} className="bg-card rounded-lg overflow-hidden border border-edge">
                  <button
                    onClick={() => setExpandedSub(expandedSub === sub.id ? null : sub.id)}
                    className="w-full p-2 flex items-center justify-between hover:bg-card-2"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-acc-strong text-xs font-semibold">{sub.name}</span>
                      {sub.entries.length > 0 && (
                        <span className="bg-acc-soft-2 text-acc-strong text-[10px] px-1.5 py-0.5 rounded">
                          {sub.entries.filter((e) => e.isAnswered).length}/{sub.entries.length}
                        </span>
                      )}
                    </div>
                    {expandedSub === sub.id ? <ChevronUp className="w-3 h-3 text-ink-faint" /> : <ChevronDown className="w-3 h-3 text-ink-faint" />}
                  </button>
                  {expandedSub === sub.id && (
                    <div className="p-2 pt-0 space-y-2">
                      {sub.entries.map((entry) => (
                        <div
                          key={entry.id}
                          className={cn(
                            'rounded-xl p-4 border-l-4 transition-all',
                            entry.isAnswered
                              ? 'bg-acc-soft border-l-emerald-500 border border-acc-edge'
                              : 'bg-card border-l-emerald-500 border border-edge'
                          )}
                        >
                          {editingId === entry.id ? (
                            <div className="space-y-2">
                              <p className="text-acc-strong text-[10px] font-semibold flex items-center gap-1">
                                <Plus className="w-3 h-3" /> NEW ENTRY — [{sub.name}] · {cat.name}
                              </p>
                              <div className="relative">
                                <input
                                  type="text"
                                  placeholder="Name (e.g. Princess, Prince)"
                                  value={editName}
                                  onChange={(e) => setEditName(e.target.value)}
                                  autoFocus
                                  className="w-full bg-card border border-edge-strong rounded-lg px-3 pr-10 py-2 text-sm text-ink placeholder-ink-faint focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                                />
                                <SpeechToTextButton isListening={editNameSpeech.isListening} onStart={editNameSpeech.startListening} onStop={editNameSpeech.stopListening} error={editNameSpeech.error} />
                              </div>
                              <div className="relative">
                                <textarea
                                  placeholder="Prayer details (e.g. God bless my son)"
                                  value={editDetails}
                                  onChange={(e) => setEditDetails(e.target.value)}
                                  className="w-full bg-card border border-edge-strong rounded-lg px-3 pr-10 py-2 text-sm text-ink placeholder-ink-faint resize-none h-16 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                                />
                                <SpeechToTextButton isListening={editDetailsSpeech.isListening} onStart={editDetailsSpeech.startListening} onStop={editDetailsSpeech.stopListening} error={editDetailsSpeech.error} />
                              </div>
                              <div className="flex gap-2">
                                <button onClick={() => saveEdit(cat.id, sub.id, entry.id)} className="flex-1 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-500 flex items-center justify-center gap-1.5">
                                  <Save className="w-4 h-4" /> Save
                                </button>
                                <button onClick={() => setEditingId(null)} className="px-4 py-2.5 bg-card-3 text-ink-muted rounded-lg text-sm font-medium hover:bg-card-3">Cancel</button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="mb-2">
                                <h4 className="text-ink font-bold text-base">[{sub.name}] {entry.name || 'Unnamed'}</h4>
                                <p className="text-acc-strong text-xs">{cat.name}</p>
                              </div>
                              {entry.details && (
                                <p className="text-ink-soft text-sm leading-relaxed border-l-2 border-acc-edge pl-3 italic my-2">{entry.details}</p>
                              )}
                              <div className="flex items-center justify-between gap-2 mt-3">
                                <button
                                  onClick={() => toggleAnswered(cat.id, sub.id, entry.id)}
                                  className={cn(
                                    'flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                                    entry.isAnswered ? 'bg-acc-soft-2 text-acc-strong' : 'bg-acc-soft text-acc hover:bg-acc-soft-2'
                                  )}
                                >
                                  <Check className="w-3 h-3" /> {entry.isAnswered ? 'Answered ✓' : 'Mark Answered'}
                                </button>
                                <div className="flex gap-1">
                                  <button onClick={() => startEdit(entry)} className="text-acc text-xs font-semibold hover:text-emerald-500 p-1">Edit</button>
                                  <button onClick={() => removeEntry(cat.id, sub.id, entry.id)} className="text-danger text-xs hover:text-danger p-1"><Trash2 className="w-3 h-3" /></button>
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      ))}
                      <button
                        onClick={() => addEntry(cat.id, sub.id)}
                        className="w-full py-2 rounded-lg border border-dashed border-acc-edge text-acc text-sm font-semibold hover:bg-acc-soft flex items-center justify-center gap-1"
                      >
                        <Plus className="w-4 h-4" /> Add {sub.name}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function SpecialPrayerForm() {
  const { prayers, setPrayers } = useApp();
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [category, setCategory] = useState('Special');
  const [urgency, setUrgency] = useState<'low' | 'medium' | 'high'>('medium');
  const [scripture, setScripture] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const titleSpeech = useSpeechToText((text) => setTitle((prev) => (prev ? prev + ' ' + text : text)));
  const notesSpeech = useSpeechToText((text) => setNotes((prev) => (prev ? prev + ' ' + text : text)));

  const handleSubmit = () => {
    if (!title.trim()) return;
    setPrayers([...prayers, {
      id: Date.now().toString(), createdAt: new Date().toISOString(),
      title, notes, category, urgency, scripture, isPrivate, isAnswered: false,
    }]);
    setTitle('');
    setNotes('');
    setScripture('');
    setIsExpanded(false);
  };

  return (
    <div className="space-y-3">
      <button onClick={() => setIsExpanded(!isExpanded)} className="w-full text-left">
        <div className="relative">
          <input
            type="text"
            placeholder="What's on your heart?"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-card border border-edge-strong rounded-xl px-4 pr-10 py-3 text-sm text-ink placeholder-ink-faint focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
          />
          <SpeechToTextButton isListening={titleSpeech.isListening} onStart={titleSpeech.startListening} onStop={titleSpeech.stopListening} error={titleSpeech.error} />
        </div>
      </button>
      {isExpanded && (
        <div className="space-y-3">
          <div className="relative">
            <textarea
              placeholder="Additional notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-card border border-edge-strong rounded-xl px-4 pr-10 py-2 text-sm text-ink placeholder-ink-faint resize-none h-20"
            />
            <SpeechToTextButton isListening={notesSpeech.isListening} onStart={notesSpeech.startListening} onStop={notesSpeech.stopListening} error={notesSpeech.error} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="bg-card border border-edge-strong rounded-lg px-3 py-2 text-sm text-ink">
              <option>Special</option><option>Family</option><option>Health</option><option>Work</option><option>Spiritual</option>
            </select>
            <select value={urgency} onChange={(e) => setUrgency(e.target.value as any)} className="bg-card border border-edge-strong rounded-lg px-3 py-2 text-sm text-ink">
              <option value="low">Low Urgency</option><option value="medium">Medium</option><option value="high">High Priority</option>
            </select>
          </div>
          <input
            type="text"
            placeholder="Scripture anchor (optional)"
            value={scripture}
            onChange={(e) => setScripture(e.target.value)}
            className="w-full bg-card border border-edge-strong rounded-lg px-4 py-2 text-sm text-ink placeholder-ink-faint"
          />
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-ink-muted text-sm cursor-pointer">
              <input type="checkbox" checked={isPrivate} onChange={(e) => setIsPrivate(e.target.checked)} className="rounded accent-emerald-600" />
              Private Prayer
            </label>
            <button onClick={handleSubmit} className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-500">Save Prayer</button>
          </div>
          {title.trim() && (
            <div className="pt-3 border-t border-edge">
              <p className="text-ink-muted text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 mb-2"><Eye className="w-3 h-3" /> Preview:</p>
              <div className={cn('rounded-xl p-4 border-l-4', urgency === 'high' ? 'bg-card border-l-red-500 border border-edge' : 'bg-card border-l-emerald-500 border border-edge')}>
                <h4 className="text-ink font-bold text-base">[{category}] {title}</h4>
                <p className="text-ink-muted text-xs flex items-center gap-1">{urgency === 'high' && '🔥 High Priority · '}Special Prayer{isPrivate && <Lock className="w-3 h-3" />}</p>
                {notes.trim() && <p className="text-ink-soft text-sm leading-relaxed border-l-2 border-acc-edge pl-3 italic my-2">{notes}</p>}
                {scripture.trim() && <p className="text-acc-strong text-xs mt-2 italic">📖 {scripture}</p>}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function IntercessoryForm() {
  const { intercessoryPrayers, setIntercessoryPrayers } = useApp();
  const [title, setTitle] = useState('');
  const [details, setDetails] = useState('');
  const [category, setCategory] = useState('Individual by Name & Challenge');

  const categories = [
    'Individual by Name & Challenge', 'Family Member — By Name', 'Church Family / Fellow Believer',
    'Business / Career', 'Government Officials', 'Missionaries / Evangelists', 'Youth & Children',
    'The Sick & Suffering', 'The Lost & Searching', 'Persecuted Church',
  ];

  const handleSubmit = () => {
    if (!title.trim()) return;
    setIntercessoryPrayers([...intercessoryPrayers, {
      id: Date.now().toString(), createdAt: new Date().toISOString(),
      title, details, category, isAnswered: false,
    }]);
    setTitle('');
    setDetails('');
  };

  return (
    <div className="space-y-3">
      <div className="bg-danger-soft/50 rounded-xl p-3 border border-danger-edge">
        <p className="text-danger-strong text-[10px] font-bold uppercase tracking-wider mb-2 flex items-center gap-1">
          <span className="w-4 h-4 rounded-full bg-red-600 text-white text-[9px] flex items-center justify-center">1</span> Who are you praying for?
        </p>
        <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full bg-card rounded-lg px-3 py-2 text-sm text-ink border border-edge-strong focus:outline-none focus:ring-2 focus:ring-red-500/40">
          {categories.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
        </select>
      </div>
      <div className="bg-danger-soft/50 rounded-xl p-3 border border-danger-edge">
        <p className="text-danger-strong text-[10px] font-bold uppercase tracking-wider mb-2 flex items-center gap-1">
          <span className="w-4 h-4 rounded-full bg-red-600 text-white text-[9px] flex items-center justify-center">2</span> Name or Title
        </p>
        <input type="text" placeholder="e.g. Sister Mary, Pastor John" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full bg-card rounded-lg px-3 py-2 text-sm text-ink placeholder-ink-faint border border-edge-strong focus:outline-none focus:ring-2 focus:ring-red-500/40" />
      </div>
      <div className="bg-danger-soft/50 rounded-xl p-3 border border-danger-edge">
        <p className="text-danger-strong text-[10px] font-bold uppercase tracking-wider mb-2 flex items-center gap-1">
          <span className="w-4 h-4 rounded-full bg-red-600 text-white text-[9px] flex items-center justify-center">3</span> What are you praying for?
        </p>
        <textarea placeholder="e.g. healing, salvation, breakthrough..." value={details} onChange={(e) => setDetails(e.target.value)} rows={3} className="w-full bg-card rounded-lg px-3 py-2 text-sm text-ink placeholder-ink-faint border border-edge-strong resize-none focus:outline-none focus:ring-2 focus:ring-red-500/40" />
      </div>
      <button onClick={handleSubmit} disabled={!title.trim()} className="w-full py-3 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
        <Heart className="w-4 h-4" /> Add to Intercessory Prayer List
      </button>
      <p className="text-danger/70 text-[10px] text-center italic">"Praying for others is standing in the gap for them"</p>
    </div>
  );
}

function PrayerList({ filter, search }: { filter: 'active' | 'answered'; search: string }) {
  const { prayers, setPrayers } = useApp();
  const filtered = prayers.filter((p) => {
    const matchesFilter = filter === 'answered' ? p.isAnswered : !p.isAnswered;
    const matchesSearch = p.title.toLowerCase().includes(search.toLowerCase()) || p.notes.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const toggleAnswered = (id: string) => {
    setPrayers(prayers.map((p) => (p.id === id ? { ...p, isAnswered: !p.isAnswered, answeredAt: p.isAnswered ? undefined : new Date().toISOString() } : p)));
  };
  const deletePrayer = (id: string) => setPrayers(prayers.filter((p) => p.id !== id));

  if (filtered.length === 0) {
    return (
      <div className="text-center py-8">
        <Heart className="w-8 h-8 text-ink-ghost mx-auto mb-2" />
        <p className="text-ink-muted text-sm">No prayers found</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {filtered.map((prayer) => (
        <div key={prayer.id} className={cn('rounded-xl p-4 border-l-4 transition-all', prayer.isAnswered ? 'bg-acc-soft border-l-emerald-500 border border-acc-edge' : prayer.urgency === 'high' ? 'bg-card border-l-red-500 border border-edge' : 'bg-card border-l-emerald-500 border border-edge')}>
          <div className="mb-2">
            <h4 className="text-ink font-bold text-base">[{prayer.category}] {prayer.title}</h4>
            <p className="text-ink-muted text-xs flex items-center gap-1">{prayer.urgency === 'high' && '🔥 High Priority · '}Special Prayer{prayer.isPrivate && <Lock className="w-3 h-3" />}</p>
          </div>
          {prayer.notes && <p className="text-ink-soft text-sm leading-relaxed border-l-2 border-acc-edge pl-3 italic my-2">{prayer.notes}</p>}
          {prayer.scripture && <p className="text-acc-strong text-xs mt-2 italic">📖 {prayer.scripture}</p>}
          <div className="flex items-center justify-between gap-2 mt-3">
            <button onClick={() => toggleAnswered(prayer.id)} className={cn('flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all', prayer.isAnswered ? 'bg-acc-soft-2 text-acc-strong' : 'bg-acc-soft text-acc hover:bg-acc-soft-2')}>
              <Check className="w-3 h-3" /> {prayer.isAnswered ? 'Answered ✓' : 'Mark Answered'}
            </button>
            <button onClick={() => deletePrayer(prayer.id)} className="text-danger text-xs font-semibold hover:text-danger flex items-center gap-1 px-2 py-1.5"><Trash2 className="w-3 h-3" /> Remove</button>
          </div>
        </div>
      ))}
    </div>
  );
}

function IntercessoryPrayerList({ search }: { search: string }) {
  const { intercessoryPrayers, setIntercessoryPrayers } = useApp();
  const filtered = intercessoryPrayers.filter((p) => p.title.toLowerCase().includes(search.toLowerCase()) || p.details.toLowerCase().includes(search.toLowerCase()));
  const toggleAnswered = (id: string) => setIntercessoryPrayers(intercessoryPrayers.map((p) => (p.id === id ? { ...p, isAnswered: !p.isAnswered } : p)));
  const deletePrayer = (id: string) => setIntercessoryPrayers(intercessoryPrayers.filter((p) => p.id !== id));

  if (filtered.length === 0) {
    return (
      <div className="text-center py-8">
        <Users className="w-8 h-8 text-ink-ghost mx-auto mb-2" />
        <p className="text-ink-muted text-sm">No intercessory prayers yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {filtered.map((prayer) => (
        <div key={prayer.id} className={cn('rounded-xl p-4 border-l-4 transition-all', prayer.isAnswered ? 'bg-acc-soft border-l-emerald-500 border border-acc-edge' : 'bg-danger-soft/50 border-l-red-500 border border-danger-edge')}>
          <div className="mb-2">
            <h4 className="text-ink font-bold text-base">[{prayer.category}] {prayer.title}</h4>
            <p className="text-danger text-xs">Intercessory Prayer</p>
          </div>
          {prayer.details && <p className="text-ink-soft text-sm leading-relaxed border-l-2 border-danger-edge pl-3 italic my-2">{prayer.details}</p>}
          <div className="flex items-center justify-between gap-2 mt-3">
            <button onClick={() => toggleAnswered(prayer.id)} className={cn('flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all', prayer.isAnswered ? 'bg-acc-soft-2 text-acc-strong' : 'bg-acc-soft text-acc hover:bg-acc-soft-2')}>
              <Check className="w-3 h-3" /> {prayer.isAnswered ? 'Answered ✓' : 'Mark Answered'}
            </button>
            <button onClick={() => deletePrayer(prayer.id)} className="text-danger text-xs font-semibold hover:text-danger flex items-center gap-1 px-2 py-1.5"><Trash2 className="w-3 h-3" /> Remove</button>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function PrayerWorkshop() {
  const { prayers, intercessoryPrayers } = useApp();
  const [activeSession, setActiveSession] = useState<'family' | 'special' | 'intercessory' | null>('family');
  const [filter, setFilter] = useState<'active' | 'answered'>('active');
  const [search, setSearch] = useState('');
  const [listTab, setListTab] = useState<'personal' | 'intercessory'>('personal');

  return (
    <div className="space-y-3">
      <p className="text-ink-muted text-sm font-semibold text-center">
        ✍️ Write your prayer point — tap a session below:
      </p>

      {/* Session 1: Family */}
      <div className={cn('rounded-2xl border overflow-hidden', activeSession === 'family' ? 'bg-acc-soft border-acc-edge' : 'bg-card border-edge')}>
        <button onClick={() => setActiveSession(activeSession === 'family' ? null : 'family')} className="w-full px-4 py-3 flex items-center gap-3 text-left">
          <div className="w-8 h-8 rounded-lg bg-acc-soft-2 text-acc-strong flex items-center justify-center flex-shrink-0"><Heart className="w-4 h-4" /></div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm text-acc-strong">Session 1: My Family Prayers</p>
            <p className="text-[10px] text-ink-muted">Cover your loved ones in prayer</p>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-acc-soft-2 text-acc-strong">MY FAMILY</span>
          {activeSession === 'family' ? <ChevronUp className="w-4 h-4 text-ink-faint flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-ink-faint flex-shrink-0" />}
        </button>
        {activeSession === 'family' && <div className="px-3 pb-3"><FamilyPrayerSession /></div>}
      </div>

      {/* Session 2: Special */}
      <div className={cn('rounded-2xl border overflow-hidden', activeSession === 'special' ? 'bg-card-2 border-edge-strong' : 'bg-card border-edge')}>
        <button onClick={() => setActiveSession(activeSession === 'special' ? null : 'special')} className="w-full px-4 py-3 flex items-center gap-3 text-left">
          <div className="w-8 h-8 rounded-lg bg-card-3 text-ink-muted flex items-center justify-center flex-shrink-0"><StickyNote className="w-4 h-4" /></div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm text-ink">Session 2: Special Prayer</p>
            <p className="text-[10px] text-ink-muted">Special prayer points for your own journey</p>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-card-3 text-ink-muted">FOR YOU</span>
          {activeSession === 'special' ? <ChevronUp className="w-4 h-4 text-ink-faint flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-ink-faint flex-shrink-0" />}
        </button>
        {activeSession === 'special' && <div className="px-3 pb-3"><SpecialPrayerForm /></div>}
      </div>

      {/* Session 3: Intercessory */}
      <div className={cn('rounded-2xl border overflow-hidden', activeSession === 'intercessory' ? 'bg-danger-soft border-danger-edge' : 'bg-card border-edge')}>
        <button onClick={() => setActiveSession(activeSession === 'intercessory' ? null : 'intercessory')} className="w-full px-4 py-3 flex items-center gap-3 text-left">
          <div className="w-8 h-8 rounded-lg bg-danger-soft-2 text-danger flex items-center justify-center flex-shrink-0"><Users className="w-4 h-4" /></div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm text-danger-strong">Session 3: Intercessory Prayer</p>
            <p className="text-[10px] text-ink-muted">Standing in the gap for others</p>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-danger-soft-2 text-danger-strong">FOR OTHERS</span>
          {activeSession === 'intercessory' ? <ChevronUp className="w-4 h-4 text-ink-faint flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-ink-faint flex-shrink-0" />}
        </button>
        {activeSession === 'intercessory' && <div className="px-3 pb-3"><IntercessoryForm /></div>}
      </div>

      <div className="flex items-center justify-center gap-2 text-ink-faint text-xs bg-card-2 rounded-lg p-2 border border-edge">
        <Lock className="w-3 h-3" /> Private prayers are protected with your PIN
      </div>

      {/* Saved prayers */}
      <div className="pt-2">
        <div className="flex items-center gap-2 mb-3">
          <div className="h-px flex-1 bg-card-3" />
          <h3 className="text-ink-muted text-xs uppercase tracking-wider font-semibold">My Saved Prayers</h3>
          <div className="h-px flex-1 bg-card-3" />
        </div>
        <div className="grid grid-cols-2 gap-2 mb-3">
          <button onClick={() => setListTab('personal')} className={cn('py-2 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2', listTab === 'personal' ? 'bg-acc-soft text-acc-strong border border-acc-edge' : 'bg-card text-ink-muted border border-edge')}>
            <Heart className="w-4 h-4" /> Personal ({prayers.length})
          </button>
          <button onClick={() => setListTab('intercessory')} className={cn('py-2 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2', listTab === 'intercessory' ? 'bg-danger-soft text-danger-strong border border-danger-edge' : 'bg-card text-ink-muted border border-edge')}>
            <Users className="w-4 h-4" /> Intercessory ({intercessoryPrayers.length})
          </button>
        </div>

        {listTab === 'personal' ? (
          <>
            <div className="flex gap-2 mb-3">
              <button onClick={() => setFilter('active')} className={cn('flex-1 py-2 rounded-lg text-sm font-semibold transition-all', filter === 'active' ? 'bg-acc-soft text-acc-strong border border-acc-edge' : 'bg-card text-ink-muted border border-edge')}>Active ({prayers.filter((p) => !p.isAnswered).length})</button>
              <button onClick={() => setFilter('answered')} className={cn('flex-1 py-2 rounded-lg text-sm font-semibold transition-all', filter === 'answered' ? 'bg-acc-soft text-acc-strong border border-acc-edge' : 'bg-card text-ink-muted border border-edge')}>Answered ({prayers.filter((p) => p.isAnswered).length})</button>
            </div>
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-faint" />
              <input type="text" placeholder="Search special prayers..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full bg-card border border-edge-strong rounded-xl pl-10 pr-4 py-2 text-sm text-ink placeholder-ink-faint focus:outline-none focus:ring-2 focus:ring-emerald-500/40" />
            </div>
            <PrayerList filter={filter} search={search} />
          </>
        ) : (
          <>
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-faint" />
              <input type="text" placeholder="Search intercessory prayers..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full bg-card border border-edge-strong rounded-xl pl-10 pr-4 py-2 text-sm text-ink placeholder-ink-faint focus:outline-none focus:ring-2 focus:ring-red-500/40" />
            </div>
            <IntercessoryPrayerList search={search} />
          </>
        )}
      </div>
    </div>
  );
}
