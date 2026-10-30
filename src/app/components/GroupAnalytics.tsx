'use client';

import { useCallback, useState } from 'react';
import { BarChart3, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { cn } from '../utils/cn';
import type { GroupAnalytics as Analytics } from '@/lib/groups';
import { fetchAnalytics } from '@/lib/groupsClient';

const METRICS = [
  { key: 'requests', label: 'Prayer requests' },
  { key: 'testimonies', label: 'Testimonies' },
  { key: 'praying', label: "I'm praying" },
  { key: 'members', label: 'New members' },
  { key: 'activity', label: 'All activity' },
] as const;
type MetricKey = (typeof METRICS)[number]['key'];

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const dayLabel = (day: string, withWeekday = false) =>
  new Date(`${day}T12:00:00`).toLocaleDateString([], withWeekday ? { weekday: 'short', day: 'numeric', month: 'short' } : { day: 'numeric', month: 'short' });

/** A plain bar chart: one bar per value. The whole chart has a text description for screen readers. */
function Bars({ data, label, short }: { data: { key: string; label: string; value: number }[]; label: string; short?: boolean }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div>
      <div role="img" aria-label={`${label}. ${data.map((d) => `${d.label}: ${d.value}`).join(', ')}. Total ${total}.`} className="flex items-end gap-[3px] h-24 border-b border-edge">
        {data.map((d) => (
          <div key={d.key} className="flex-1 h-full flex flex-col justify-end" title={`${d.label}: ${d.value}`}>
            {d.value > 0 && !short && data.length <= 7 && <span className="text-[0.5625rem] font-bold text-ink-muted text-center mb-0.5">{d.value}</span>}
            <div className={cn('rounded-t', d.value === 0 ? 'bg-edge' : 'bg-emerald-600')} style={{ height: d.value === 0 ? '2px' : `${Math.max(6, (d.value / max) * 100)}%` }} />
          </div>
        ))}
      </div>
      <div className="flex justify-between text-[0.5625rem] text-ink-faint mt-1">
        <span>{data[0]?.label}</span>
        <span>{data[data.length - 1]?.label}</span>
      </div>
    </div>
  );
}

function Tile({ title, value, note }: { title: string; value: number; note: string }) {
  return (
    <div className="bg-card-2 rounded-xl p-3">
      <p className="text-[0.625rem] font-bold uppercase tracking-wider text-ink-muted">{title}</p>
      <p className="text-2xl font-bold text-ink leading-tight">{value}</p>
      <p className="text-[0.6875rem] text-ink-faint">{note}</p>
    </div>
  );
}

/** The leader's dashboard for one group: counts, charts for the last 7 or 30 days, busiest days. Numbers only, no member details. */
export default function GroupAnalytics({ groupId }: { groupId: string }) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<Analytics | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [range, setRange] = useState<7 | 30>(7);
  const [metric, setMetric] = useState<MetricKey>('requests');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const r = await fetchAnalytics(groupId);
    if (r.ok) setData(r.data.analytics);
    else setError(r.error);
    setLoading(false);
  }, [groupId]);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next) load(); // fresh numbers every time it is opened
  };

  const days = data ? data.daily.slice(-range) : [];
  const win = range === 7 ? 'last7' : 'last30';
  const newMembers = data ? (range === 7 ? data.members.new7 : data.members.new30) : 0;
  const metricLabel = METRICS.find((m) => m.key === metric)!.label;
  const busiestWeekday = data ? [...data.weekday].sort((a, b) => b.activity - a.activity)[0] : null;
  const quiet = data ? data.daily.every((d) => d.activity === 0 && d.members === 0) : false;

  return (
    <div className="bg-card rounded-2xl border border-edge p-3">
      <button onClick={toggle} aria-expanded={open} className="w-full flex items-center justify-between text-[0.625rem] font-bold uppercase tracking-wider text-ink-muted">
        <span className="flex items-center gap-1"><BarChart3 className="w-3 h-3" /> Group analytics</span>
        {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>

      {open && (
        <div className="mt-3 space-y-3">
          {loading && !data && <p className="text-ink-muted text-sm flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Counting...</p>}
          {error && <p role="alert" className="text-danger text-xs">{error}</p>}

          {data && (
            <>
              <div className="grid grid-cols-2 gap-1.5" role="group" aria-label="Time range">
                {([7, 30] as const).map((r) => (
                  <button key={r} onClick={() => setRange(r)} aria-pressed={range === r}
                    className={cn('py-1.5 rounded-lg border-2 text-xs font-bold', range === r ? 'border-emerald-500 bg-acc-soft text-acc-strong' : 'border-edge bg-card-2 text-ink-muted')}>
                    Last {r} days
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Tile title="Members" value={data.members.total} note="in the group now" />
                <Tile title="New members" value={newMembers} note={`joined in the last ${range} days`} />
                <Tile title="Prayer requests" value={data.requests[win]} note={`${data.requests.total} in all`} />
                <Tile title="Testimonies" value={data.testimonies[win]} note={`${data.testimonies.total} in all`} />
                <Tile title="I'm praying" value={data.praying[win]} note={`${data.praying.total} in all`} />
              </div>

              {quiet ? (
                <p className="text-ink-faint text-xs text-center py-4">Nothing has happened in this group in the last 30 days yet. Share a prayer request to get started.</p>
              ) : (
                <>
                  <div>
                    <div className="flex flex-wrap gap-1.5 mb-2" role="group" aria-label="Chart">
                      {METRICS.map((m) => (
                        <button key={m.key} onClick={() => setMetric(m.key)} aria-pressed={metric === m.key}
                          className={cn('px-2.5 py-1 rounded-full text-[0.6875rem] font-bold border', metric === m.key ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-card-2 text-ink-muted border-edge')}>
                          {m.label}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs font-bold text-ink mb-1">{metricLabel} per day, last {range} days</p>
                    <Bars label={`${metricLabel} per day`} data={days.map((d) => ({ key: d.day, label: dayLabel(d.day, range === 7), value: d[metric] }))} />
                  </div>

                  <div>
                    <p className="text-xs font-bold text-ink mb-1">Most active days of the week <span className="font-normal text-ink-faint">(last 30 days)</span></p>
                    <Bars short label="Activity by day of the week" data={data.weekday.map((w) => ({ key: String(w.dow), label: WEEKDAYS[w.dow - 1], value: w.activity }))} />
                    {busiestWeekday && busiestWeekday.activity > 0 && (
                      <p className="text-[0.6875rem] text-ink-muted mt-1">Busiest weekday: <strong className="text-ink">{WEEKDAYS[busiestWeekday.dow - 1]}</strong></p>
                    )}
                  </div>

                  {data.topDays.length > 0 && (
                    <div>
                      <p className="text-xs font-bold text-ink mb-1">Busiest dates</p>
                      <ul className="space-y-1">
                        {data.topDays.map((d) => (
                          <li key={d.day} className="flex items-center justify-between bg-card-2 rounded-lg px-3 py-1.5 text-xs">
                            <span className="text-ink-soft">{dayLabel(d.day, true)}</span>
                            <span className="font-bold text-ink">{d.activity} {d.activity === 1 ? 'action' : 'actions'}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <p className="text-[0.625rem] text-ink-faint leading-relaxed">Activity counts posts, comments, &ldquo;I&apos;m praying&rdquo; taps and &ldquo;I prayed today&rdquo; check-ins. Hidden posts are not counted. These are totals only: no member details are shown here.</p>
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
