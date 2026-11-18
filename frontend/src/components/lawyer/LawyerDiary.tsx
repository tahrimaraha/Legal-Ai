import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle, BookOpen, Briefcase, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, Circle, Gavel,
  ListChecks, MapPin, Plus, Trash2, User as UserIcon, Users,
} from 'lucide-react';
import { useLang } from '../../context/LanguageContext';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import {
  ApiError, createDiaryEntry, deleteDiaryEntry, getMyDiary, updateDiaryEntry,
  type DiaryData, type DiaryEntry, type DiaryEntryInput, type DiaryKind, type DiarySession,
} from '../../lib/api';
import { bdDate } from '../../lib/slots';

// ——— date helpers (all dates are Bangladesh calendar days, "YYYY-MM-DD") ———
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const WEEKDAYS_BN = ['রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহঃ', 'শুক্র', 'শনি'];
const parts = (iso: string) => iso.split('-').map(Number);
const addDays = (iso: string, n: number) => {
  const [y, m, d] = parts(iso);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
};
const dow = (iso: string) => {
  const [y, m, d] = parts(iso);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
};
/** Bangladesh weeks start on Saturday. */
const weekStart = (iso: string) => addDays(iso, -((dow(iso) + 1) % 7));
const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + (m || 0);
};
const toHHMM = (min: number) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
const fmtTime = (hhmm: string) => {
  const m = toMin(hhmm);
  const h = Math.floor(m / 60);
  return `${((h + 11) % 12) + 1}:${String(m % 60).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
};
const nowBdMinutes = () => {
  const d = new Date(Date.now() + 6 * 3600 * 1000);
  return d.getUTCHours() * 60 + d.getUTCMinutes();
};

const KIND: Record<DiaryKind | 'consultation', { en: string; bn: string; icon: typeof Gavel; cls: string }> = {
  court: { en: 'Court', bn: 'আদালত', icon: Gavel, cls: 'border-[#b4544a] bg-[#f8e9e6] text-[#7c2d25]' },
  client_meeting: { en: 'Meeting', bn: 'মিটিং', icon: Users, cls: 'border-[#3d6a99] bg-[#e8f0f8] text-[#23466b]' },
  task: { en: 'Task', bn: 'কাজ', icon: ListChecks, cls: 'border-[#b78a1f] bg-[#fbf3dc] text-[#6e5210]' },
  personal: { en: 'Personal', bn: 'ব্যক্তিগত', icon: UserIcon, cls: 'border-[#5b8a4a] bg-[#edf5e8] text-[#33572a]' },
  other: { en: 'Other', bn: 'অন্যান্য', icon: BookOpen, cls: 'border-granite bg-bone text-ink' },
  consultation: { en: 'Consultation', bn: 'পরামর্শ', icon: Briefcase, cls: 'border-clay-deep bg-clay-tint text-clay-deep' },
};

interface Item {
  key: string;
  start: number;
  end: number;
  kind: DiaryKind | 'consultation';
  title: string;
  sub: string;
  entry?: DiaryEntry;
  session?: DiarySession;
}

interface DayModel {
  items: Item[];
  windows: { start: number; end: number; booked: boolean; blocked: boolean }[];
  openMin: number;
  usedMin: number;
  freeSlots: number;
}

function buildDay(data: DiaryData | null, date: string, bn: boolean): DayModel {
  if (!data) return { items: [], windows: [], openMin: 0, usedMin: 0, freeSlots: 0 };
  const weekday = WEEKDAYS[dow(date)];
  const rawWindows = data.hours.filter((h) => h.weekday === weekday).map((h) => ({ start: toMin(h.start), end: toMin(h.end) }));
  const entries = data.entries.filter((e) => e.date === date);
  const sessions = data.consultations.filter((s) => s.date === date);

  const items: Item[] = [
    ...entries.map((e) => ({
      key: `e-${e.id}`, start: toMin(e.start), end: Math.max(toMin(e.end), toMin(e.start) + 15), kind: e.kind, title: e.title,
      sub: e.blocksBooking ? (bn ? 'ব্যস্ত' : 'Busy') : (bn ? 'বুকিং খোলা' : 'Bookable'), entry: e,
    })),
    ...sessions.map((s) => {
      const start = toMin(s.time);
      const w = rawWindows.find((x) => x.start === start);
      const status = s.status === 'requested' ? (bn ? 'অনুরোধ' : 'Requested') : s.status === 'completed' ? (bn ? 'সম্পন্ন' : 'Completed') : (bn ? 'নিশ্চিত' : 'Confirmed');
      return {
        key: `c-${s.id}`, start, end: w ? w.end : start + 60, kind: 'consultation' as const,
        title: s.citizenName, sub: `${s.topic} · ${status}`, session: s,
      };
    }),
  ].sort((a, b) => a.start - b.start || a.end - b.end);

  const blocking = entries.filter((e) => e.blocksBooking).map((e) => ({ start: toMin(e.start), end: toMin(e.end) }));
  const isPastDay = date < bdDate();
  const nowMin = date === bdDate() ? nowBdMinutes() : -1;
  const windows = rawWindows.map((w) => {
    const booked = sessions.some((s) => toMin(s.time) === w.start && s.status !== 'requested');
    const blocked = blocking.some((b) => b.start < w.end && w.start < b.end);
    return { ...w, booked, blocked };
  });
  const openMin = windows.reduce((t, w) => t + (w.end - w.start), 0);
  const usedMin = windows.reduce((t, w) => t + (w.booked || w.blocked ? w.end - w.start : 0), 0);
  const freeSlots = isPastDay || data.vacationMode ? 0 : windows.filter((w) => !w.booked && !w.blocked && w.start > nowMin + 60).length;
  return { items, windows, openMin, usedMin, freeSlots };
}

/** Side-by-side columns for overlapping items. */
function lanes(items: Item[]): { item: Item; lane: number; of: number }[] {
  const ends: number[] = [];
  const placed = items.map((item) => {
    let lane = ends.findIndex((e) => e <= item.start);
    if (lane === -1) lane = ends.push(0) - 1;
    ends[lane] = item.end;
    return { item, lane };
  });
  return placed.map((p) => ({ ...p, of: Math.max(1, ends.length) }));
}

const EMPTY: DiaryEntryInput = { date: '', start: '09:00', end: '10:00', title: '', kind: 'court', location: '', notes: '', blocksBooking: true, done: false };
const PX_PER_HOUR = 56;

export function LawyerDiary() {
  const { lang } = useLang();
  const bn = lang === 'bn';
  const [date, setDate] = useState(bdDate());
  const [data, setData] = useState<DiaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [form, setForm] = useState<(DiaryEntryInput & { id?: string }) | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const week = weekStart(date);
  const load = useCallback(() => {
    setLoading(true);
    return getMyDiary(week, 7)
      .then((d) => { setData(d); setError(''); })
      .catch(() => setError(bn ? 'ডায়েরি লোড করা যায়নি।' : 'Could not load your diary.'))
      .finally(() => setLoading(false));
  }, [week, bn]);
  useEffect(() => { void load(); }, [load]);

  const day = useMemo(() => buildDay(data, date, bn), [data, date, bn]);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(week, i));

  // Timeline range: at least 8 AM – 9 PM, stretched to fit anything earlier / later
  const allStarts = [...day.items.map((i) => i.start), ...day.windows.map((w) => w.start)];
  const allEnds = [...day.items.map((i) => i.end), ...day.windows.map((w) => w.end)];
  const from = Math.min(8 * 60, ...allStarts.map((m) => Math.floor(m / 60) * 60));
  const to = Math.max(21 * 60, ...allEnds.map((m) => Math.ceil(m / 60) * 60));
  const y = (min: number) => ((min - from) / 60) * PX_PER_HOUR;
  const isToday = date === bdDate();
  const nowMin = nowBdMinutes();

  const openNew = (start?: number) => {
    const s = start ?? Math.max(from, Math.ceil(((isToday ? nowMin : 9 * 60) + 1) / 30) * 30);
    setFormError('');
    setForm({ ...EMPTY, date, start: toHHMM(Math.min(s, 22 * 60)), end: toHHMM(Math.min(s + 60, 23 * 60 + 59)) });
  };
  const openEdit = (e: DiaryEntry) => {
    setFormError('');
    setForm({ ...EMPTY, ...e });
  };

  const save = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!form || saving) return;
    if (form.end <= form.start) {
      setFormError(bn ? 'শেষের সময় শুরুর সময়ের পরে হতে হবে।' : 'The end time must be after the start time.');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      const { id, ...body } = form;
      const res = id ? await updateDiaryEntry(id, body) : await createDiaryEntry(body);
      setForm(null);
      setNotice(res.conflicts.length
        ? (bn
          ? `সতর্কতা: এই সময়ে আগে থেকেই পরামর্শ বুক করা আছে (${res.conflicts.map((c) => `${fmtTime(c.time)} ${c.citizenName}`).join(', ')})। প্রয়োজনে সময় পরিবর্তন করুন।`
          : `Heads up: you already have a consultation in this time (${res.conflicts.map((c) => `${fmtTime(c.time)} with ${c.citizenName}`).join(', ')}). Reschedule it if needed.`)
        : '');
      if (form.date !== date) setDate(form.date);
      await load();
    } catch (err) {
      setFormError(err instanceof ApiError ? (bn ? err.messageBn : err.message) : String(err));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!form?.id || !confirm(bn ? 'এই এন্ট্রি মুছে ফেলবেন?' : 'Delete this entry?')) return;
    setSaving(true);
    try {
      await deleteDiaryEntry(form.id);
      setForm(null);
      await load();
    } catch (err) {
      setFormError(err instanceof ApiError ? (bn ? err.messageBn : err.message) : String(err));
    } finally {
      setSaving(false);
    }
  };

  const toggleDone = async (e: DiaryEntry) => {
    const next = { ...e, done: !e.done };
    setData((d) => d && { ...d, entries: d.entries.map((x) => (x.id === e.id ? next : x)) });
    try {
      const { id, ...body } = next;
      await updateDiaryEntry(id, body);
    } catch {
      setData((d) => d && { ...d, entries: d.entries.map((x) => (x.id === e.id ? e : x)) });
    }
  };

  const pct = day.openMin ? Math.round((day.usedMin / day.openMin) * 100) : 0;
  const dayLabel = (iso: string) => {
    const [, m, d] = parts(iso);
    return new Date(Date.UTC(2026, m - 1, d)).toLocaleDateString(bn ? 'bn-BD' : 'en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
  };
  const fullLabel = new Date(Date.UTC(parts(date)[0], parts(date)[1] - 1, parts(date)[2]))
    .toLocaleDateString(bn ? 'bn-BD' : 'en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
  const field = 'w-full rounded border border-granite bg-white px-3 py-2 text-sm text-ink focus:border-clay-deep focus:outline-none';

  return (
    <div className="space-y-4">
      {/* Date navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setDate(addDays(date, -1))} aria-label={bn ? 'আগের দিন' : 'Previous day'}
            className="rounded border border-granite bg-white p-2 text-ink hover:bg-bone"><ChevronLeft className="h-4 w-4" /></button>
          <input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)}
            className="rounded border border-granite bg-white px-3 py-1.5 text-sm text-ink" />
          <button type="button" onClick={() => setDate(addDays(date, 1))} aria-label={bn ? 'পরের দিন' : 'Next day'}
            className="rounded border border-granite bg-white p-2 text-ink hover:bg-bone"><ChevronRight className="h-4 w-4" /></button>
          {!isToday && (
            <Button size="sm" variant="secondary" onClick={() => setDate(bdDate())}>{bn ? 'আজ' : 'Today'}</Button>
          )}
        </div>
        <Button size="sm" variant="primary" onClick={() => openNew()}>
          <Plus className="mr-1 h-4 w-4" />{bn ? 'ডায়েরিতে যোগ করুন' : 'Add to diary'}
        </Button>
      </div>

      {/* Week strip */}
      <div className="grid grid-cols-7 gap-1.5">
        {weekDays.map((d) => {
          const m = buildDay(data, d, bn);
          const p = m.openMin ? Math.round((m.usedMin / m.openMin) * 100) : 0;
          const active = d === date;
          return (
            <button key={d} type="button" onClick={() => setDate(d)}
              className={`min-w-0 rounded border p-1.5 text-center transition sm:p-2 ${active ? 'border-clay-deep bg-clay-tint' : 'border-granite-soft bg-white hover:bg-bone'}`}>
              <div className={`text-[10px] font-semibold uppercase sm:text-xs ${d === bdDate() ? 'text-clay-deep' : 'text-granite'}`}>
                {bn ? WEEKDAYS_BN[dow(d)] : WEEKDAYS[dow(d)].slice(0, 3)}
              </div>
              <div className="text-sm font-bold text-ink sm:hidden">{bn ? Number(parts(d)[2]).toLocaleString('bn-BD') : parts(d)[2]}</div>
              <div className="hidden truncate text-sm font-bold text-ink sm:block">{dayLabel(d)}</div>
              <div className="mt-1 h-1 overflow-hidden rounded bg-bone-deep" title={`${p}%`}>
                <div className="h-full bg-clay-deep" style={{ width: `${p}%` }} />
              </div>
              <div className="mt-1 text-[10px] text-granite">{m.items.length || '–'}</div>
            </button>
          );
        })}
      </div>

      {error && <p role="alert" className="rounded border border-brick/30 bg-brick/10 p-2.5 text-xs text-brick">{error}</p>}
      {notice && (
        <p role="status" className="flex items-start gap-2 rounded border border-[#ecd28a] bg-[#fff6e0] p-2.5 text-xs text-[#8a6100]">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{notice}
        </p>
      )}
      {data?.vacationMode && (
        <p className="rounded border border-[#ecd28a] bg-[#fff6e0] p-2.5 text-xs text-[#8a6100]">
          {bn ? 'ভ্যাকেশন মোড চালু — ক্লায়েন্টরা এখন বুক করতে পারবেন না।' : 'Vacation mode is on — clients cannot book right now.'}
        </p>
      )}

      {/* Day summary */}
      <div className="rounded border border-granite bg-white p-4 shadow-sm">
        <h2 className="font-display text-lg font-bold text-ink">{fullLabel}</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <Stat label={bn ? 'পরামর্শ' : 'Consultations'} value={day.items.filter((i) => i.kind === 'consultation').length} />
          <Stat label={bn ? 'ডায়েরি এন্ট্রি' : 'Diary items'}
            value={`${day.items.filter((i) => i.entry?.done).length}/${day.items.filter((i) => i.entry).length}`} hint={bn ? 'সম্পন্ন' : 'done'} />
          <Stat label={bn ? 'খালি স্লট' : 'Open slots'} value={day.freeSlots} hint={bn ? 'ক্লায়েন্টরা বুক করতে পারবেন' : 'clients can book'} />
          <div>
            <p className="text-xs text-granite">{bn ? 'ব্যস্ততা' : 'Occupancy'}</p>
            <p className="font-display text-xl font-bold text-ink">{day.openMin ? `${pct}%` : '–'}</p>
            <div className="mt-1 h-1.5 overflow-hidden rounded bg-bone-deep"><div className="h-full bg-clay-deep" style={{ width: `${pct}%` }} /></div>
            <p className="mt-0.5 text-[10px] text-granite">{bn ? 'সাপ্তাহিক সময়ের মধ্যে' : 'of your weekly hours'}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        {/* Timeline */}
        <div className="rounded border border-granite bg-white p-3 shadow-sm lg:col-span-3">
          <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-granite">
            <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm border border-[#9cc08b] bg-[#eef6e9]" />{bn ? 'বুকিংয়ের জন্য খোলা' : 'Open for booking'}</span>
            <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-[repeating-linear-gradient(45deg,#e5ddd5,#e5ddd5_3px,transparent_3px,transparent_6px)]" />{bn ? 'বন্ধ (ব্যস্ত/বুকড)' : 'Closed (busy / booked)'}</span>
            <span>{bn ? 'খালি জায়গায় ট্যাপ করে এন্ট্রি যোগ করুন' : 'Tap an empty spot to add an entry'}</span>
          </div>
          <div className="relative select-none" style={{ height: y(to) }}
            onClick={(e) => {
              if (e.target !== e.currentTarget) return;
              const rect = e.currentTarget.getBoundingClientRect();
              openNew(Math.floor((from + ((e.clientY - rect.top) / PX_PER_HOUR) * 60) / 30) * 30);
            }}>
            {Array.from({ length: (to - from) / 60 + 1 }, (_, i) => from + i * 60).map((m) => (
              <div key={m} className="pointer-events-none absolute left-0 right-0 border-t border-granite-soft" style={{ top: y(m) }}>
                <span className="absolute -top-2 left-0 bg-white pr-1 font-mono text-[10px] text-granite">{fmtTime(toHHMM(m)).replace(':00', '')}</span>
              </div>
            ))}
            {day.windows.map((w) => (
              <div key={w.start} className={`pointer-events-none absolute left-12 right-0 rounded-sm border ${w.booked || w.blocked
                ? 'border-[#d8cfc6] bg-[repeating-linear-gradient(45deg,#efe8e1,#efe8e1_4px,transparent_4px,transparent_8px)]'
                : 'border-[#9cc08b] bg-[#eef6e9]'}`} style={{ top: y(w.start), height: y(w.end) - y(w.start) }} />
            ))}
            {isToday && nowMin >= from && nowMin <= to && (
              <div className="pointer-events-none absolute left-10 right-0 z-20 border-t-2 border-brick" style={{ top: y(nowMin) }}>
                <span className="absolute -left-1 -top-1 h-2 w-2 rounded-full bg-brick" />
              </div>
            )}
            {lanes(day.items).map(({ item, lane, of }) => {
              const k = KIND[item.kind];
              const Icon = k.icon;
              const h = Math.max(y(item.end) - y(item.start), 22);
              const style = { top: y(item.start) + 1, height: h - 2, left: `calc(3.25rem + (100% - 3.25rem) * ${lane / of})`, width: `calc((100% - 3.25rem) / ${of} - 4px)` };
              const body = (
                <div className={`h-full overflow-hidden rounded border-l-4 px-2 py-1 text-left text-xs shadow-sm ${k.cls} ${item.entry?.done ? 'opacity-60' : ''}`}>
                  <p className={`flex items-center gap-1 truncate font-semibold ${item.entry?.done ? 'line-through' : ''}`}>
                    <Icon className="h-3 w-3 shrink-0" />{item.title}
                  </p>
                  {h > 34 && <p className="truncate text-[10px] opacity-80">{fmtTime(toHHMM(item.start))} – {fmtTime(toHHMM(item.end))} · {[item.entry?.location, item.sub].filter(Boolean).join(' · ')}</p>}
                </div>
              );
              return item.session ? (
                <Link key={item.key} to={`/lawyer/consultations/${item.session.id}`} className="absolute z-10" style={style}>{body}</Link>
              ) : (
                <button key={item.key} type="button" onClick={() => item.entry && openEdit(item.entry)} className="absolute z-10" style={style}>{body}</button>
              );
            })}
          </div>
        </div>

        {/* Agenda / to-do list */}
        <div className="space-y-2 rounded border border-granite bg-white p-4 shadow-sm lg:col-span-2">
          <h3 className="flex items-center gap-2 font-mono text-label font-semibold uppercase text-clay-deep">
            <CalendarDays className="h-4 w-4" />{bn ? 'দিনের তালিকা' : "Day's agenda"}
          </h3>
          {loading && !data ? (
            <p className="text-sm text-granite">{bn ? 'লোড হচ্ছে…' : 'Loading…'}</p>
          ) : day.items.length === 0 ? (
            <div className="py-6 text-center text-sm text-granite">
              <p>{bn ? 'এই দিনে কিছু নেই।' : 'Nothing planned for this day.'}</p>
              <button type="button" onClick={() => openNew()} className="mt-2 text-xs font-semibold text-clay-deep hover:underline">
                {bn ? '+ এন্ট্রি যোগ করুন' : '+ Add an entry'}
              </button>
            </div>
          ) : (
            <ul className="divide-y divide-granite-soft">
              {day.items.map((item) => {
                const k = KIND[item.kind];
                return (
                  <li key={item.key} className="flex items-start gap-2 py-2.5">
                    {item.entry ? (
                      <button type="button" onClick={() => void toggleDone(item.entry!)} aria-label={item.entry.done ? 'Mark not done' : 'Mark done'}
                        className="mt-0.5 shrink-0 text-clay-deep">
                        {item.entry.done ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5 text-granite" />}
                      </button>
                    ) : (
                      <Briefcase className="mt-0.5 h-5 w-5 shrink-0 text-clay-deep" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-[11px] text-granite">{fmtTime(toHHMM(item.start))} – {fmtTime(toHHMM(item.end))}</p>
                      {item.session ? (
                        <Link to={`/lawyer/consultations/${item.session.id}`} className="block truncate text-sm font-semibold text-ink hover:underline">{item.title}</Link>
                      ) : (
                        <button type="button" onClick={() => openEdit(item.entry!)} className={`block max-w-full truncate text-left text-sm font-semibold text-ink hover:underline ${item.entry?.done ? 'line-through opacity-60' : ''}`}>
                          {item.title}
                        </button>
                      )}
                      <p className="truncate text-xs text-granite">
                        <span className={`mr-1 rounded border px-1 py-px text-[10px] font-semibold ${k.cls}`}>{bn ? k.bn : k.en}</span>
                        {item.sub}
                      </p>
                      {item.entry?.location && <p className="flex items-center gap-1 truncate text-[11px] text-granite"><MapPin className="h-3 w-3" />{item.entry.location}</p>}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* Add / edit entry */}
      <Modal open={!!form} onClose={() => !saving && setForm(null)} title={form?.id ? (bn ? 'এন্ট্রি সম্পাদনা' : 'Edit diary entry') : (bn ? 'ডায়েরিতে যোগ করুন' : 'Add to diary')}>
        {form && (
          <form onSubmit={save} className="space-y-3">
            <label className="block space-y-1 text-xs font-semibold text-ink">
              <span>{bn ? 'শিরোনাম' : 'Title'}</span>
              <input required maxLength={120} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder={bn ? 'যেমন: জেলা জজ আদালতে শুনানি' : 'e.g. Hearing at District Judge Court'} className={field} autoFocus />
            </label>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {(['court', 'client_meeting', 'task', 'personal', 'other'] as DiaryKind[]).map((kd) => {
                const k = KIND[kd];
                const Icon = k.icon;
                return (
                  <button key={kd} type="button"
                    onClick={() => setForm({ ...form, kind: kd, blocksBooking: kd === 'task' ? false : form.kind === 'task' ? true : form.blocksBooking })}
                    className={`flex items-center gap-1.5 rounded border px-2 py-1.5 text-xs font-semibold ${form.kind === kd ? k.cls : 'border-granite-soft text-ink-soft hover:bg-bone'}`}>
                    <Icon className="h-3.5 w-3.5" />{bn ? k.bn : k.en}
                  </button>
                );
              })}
            </div>
            <div className="grid grid-cols-3 gap-3">
              <label className="space-y-1 text-xs font-semibold text-ink"><span>{bn ? 'তারিখ' : 'Date'}</span>
                <input type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className={field} /></label>
              <label className="space-y-1 text-xs font-semibold text-ink"><span>{bn ? 'শুরু' : 'Start'}</span>
                <input type="time" required value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} className={field} /></label>
              <label className="space-y-1 text-xs font-semibold text-ink"><span>{bn ? 'শেষ' : 'End'}</span>
                <input type="time" required value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })} className={field} /></label>
            </div>
            <label className="block space-y-1 text-xs font-semibold text-ink">
              <span>{bn ? 'স্থান (ঐচ্ছিক)' : 'Location (optional)'}</span>
              <input maxLength={160} value={form.location ?? ''} onChange={(e) => setForm({ ...form, location: e.target.value })}
                placeholder={bn ? 'যেমন: চট্টগ্রাম জজ কোর্ট, কক্ষ ৩' : 'e.g. Chattogram Judge Court, Room 3'} className={field} />
            </label>
            <label className="block space-y-1 text-xs font-semibold text-ink">
              <span>{bn ? 'নোট (ঐচ্ছিক)' : 'Notes (optional)'}</span>
              <textarea rows={3} maxLength={2000} value={form.notes ?? ''} onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder={bn ? 'মামলা নম্বর, যা নিয়ে যেতে হবে…' : 'Case number, documents to bring…'} className={field} />
            </label>
            <label className="flex items-start gap-2 rounded border border-granite-soft bg-bone/40 p-2.5 text-sm text-ink">
              <input type="checkbox" checked={form.blocksBooking} onChange={(e) => setForm({ ...form, blocksBooking: e.target.checked })} className="mt-0.5 h-4 w-4 accent-[#8a5a3c]" />
              <span>
                <span className="font-semibold">{bn ? 'এই সময়ে আমি ব্যস্ত' : "I'm busy during this time"}</span>
                <span className="block text-xs text-granite">
                  {bn ? 'ক্লায়েন্টরা এই সময়ে পরামর্শ বুক করতে পারবেন না — আপনার খালি স্লট নিজে থেকেই আপডেট হবে।' : 'Clients can’t book a consultation that overlaps it — your open slots update automatically.'}
                </span>
              </span>
            </label>
            {form.id && (
              <label className="flex items-center gap-2 text-sm text-ink">
                <input type="checkbox" checked={form.done} onChange={(e) => setForm({ ...form, done: e.target.checked })} className="h-4 w-4 accent-[#8a5a3c]" />
                {bn ? 'সম্পন্ন হয়েছে' : 'Done'}
              </label>
            )}
            {formError && <p role="alert" className="text-xs text-brick">{formError}</p>}
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-granite-soft pt-3">
              {form.id ? (
                <Button type="button" variant="ghost" onClick={() => void remove()} disabled={saving} className="text-brick">
                  <Trash2 className="mr-1 h-4 w-4" />{bn ? 'মুছুন' : 'Delete'}
                </Button>
              ) : <span />}
              <div className="flex gap-2">
                <Button type="button" variant="secondary" onClick={() => setForm(null)} disabled={saving}>{bn ? 'বাতিল' : 'Cancel'}</Button>
                <Button type="submit" variant="primary" loading={saving}>{bn ? 'সংরক্ষণ' : 'Save'}</Button>
              </div>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: number | string; hint?: string }) {
  return (
    <div>
      <p className="text-xs text-granite">{label}</p>
      <p className="font-display text-xl font-bold text-ink">{value}</p>
      {hint && <p className="text-[10px] text-granite">{hint}</p>}
    </div>
  );
}
