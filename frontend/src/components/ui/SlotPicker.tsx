import { useMemo } from 'react';
import { CalendarClock } from 'lucide-react';
import { Input } from './Input';
import { bdDate, formatSlotDay, formatSlotTime, MAX_AHEAD_DAYS } from '../../lib/slots';
import type { ConsultationSlot } from '../../mocks/types';

/** Pick one of a lawyer's open slots: a row of days, then that day's times. */
export function OpenSlotPicker({
  slots,
  value,
  onChange,
  lang,
}: {
  slots: ConsultationSlot[];
  value: ConsultationSlot | null;
  onChange: (slot: ConsultationSlot) => void;
  lang: 'en' | 'bn';
}) {
  const byDate = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const s of slots) map.set(s.date, [...(map.get(s.date) || []), s.time]);
    return [...map.entries()];
  }, [slots]);
  const activeDate = value?.date && byDate.some(([d]) => d === value.date) ? value.date : byDate[0]?.[0];
  const times = byDate.find(([d]) => d === activeDate)?.[1] || [];
  const bn = lang === 'bn';

  if (byDate.length === 0) {
    return (
      <p className="flex items-center gap-2 rounded border border-granite-soft bg-bone p-3 text-xs text-granite">
        <CalendarClock className="h-4 w-4 shrink-0" />
        {bn
          ? 'আগামী দুই সপ্তাহে এই আইনজীবীর কোনো খালি সময় নেই। পরে আবার দেখুন।'
          : 'This lawyer has no open times in the next two weeks. Please check back later.'}
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <span className="block text-xs font-semibold text-ink-soft">
        {bn ? 'তারিখ নির্বাচন করুন' : 'Choose a day'}{' '}
        <span className="font-normal text-granite">({bn ? 'বাংলাদেশ সময়' : 'Bangladesh time'})</span>
      </span>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {byDate.map(([date, list]) => {
          const { weekday, day } = formatSlotDay(date, lang);
          const active = date === activeDate;
          return (
            <button
              key={date}
              type="button"
              onClick={() => onChange({ date, time: list[0] })}
              className={`shrink-0 rounded border px-3 py-1.5 text-center transition ${
                active ? 'border-clay-deep bg-clay text-white' : 'border-granite-soft bg-white text-ink-soft hover:border-clay'
              }`}
            >
              <span className="block text-[10px] uppercase">{weekday}</span>
              <span className="block text-xs font-semibold">{day}</span>
            </button>
          );
        })}
      </div>
      <span className="block text-xs font-semibold text-ink-soft">{bn ? 'সময়' : 'Time'}</span>
      <div className="flex flex-wrap gap-2">
        {times.map((time) => {
          const active = value?.date === activeDate && value?.time === time;
          return (
            <button
              key={time}
              type="button"
              onClick={() => onChange({ date: activeDate!, time })}
              className={`rounded border px-3 py-1.5 text-xs font-semibold transition ${
                active ? 'border-clay-deep bg-clay text-white' : 'border-granite-soft bg-white text-ink-soft hover:border-clay'
              }`}
            >
              {formatSlotTime(time, lang)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Free date + time entry, limited to today … +90 days (Bangladesh time). */
export function DateTimeFields({
  value,
  onChange,
  lang,
}: {
  value: ConsultationSlot;
  onChange: (slot: ConsultationSlot) => void;
  lang: 'en' | 'bn';
}) {
  const bn = lang === 'bn';
  return (
    <div className="grid grid-cols-2 gap-3">
      <Input
        type="date"
        label={bn ? 'তারিখ' : 'Date'}
        value={value.date}
        min={bdDate(0)}
        max={bdDate(MAX_AHEAD_DAYS)}
        onChange={(e) => onChange({ ...value, date: e.target.value })}
        required
      />
      <Input
        type="time"
        label={bn ? 'সময় (বাংলাদেশ)' : 'Time (Bangladesh)'}
        value={value.time}
        step={900}
        onChange={(e) => onChange({ ...value, time: e.target.value })}
        required
      />
    </div>
  );
}
