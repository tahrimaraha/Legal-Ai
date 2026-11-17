/** Consultation slot helpers. Slots are Bangladesh time (UTC+6, no DST): date "YYYY-MM-DD", time "HH:MM". */
import type { ConsultationSlot } from '../mocks/types';

const BD_OFFSET_MS = 6 * 60 * 60 * 1000;
export const MIN_LEAD_MS = 60 * 60 * 1000; // must be at least 1 hour ahead (same rule as the server)
export const MAX_AHEAD_DAYS = 90;

/** The slot as an absolute instant. */
export function slotInstant(slot: ConsultationSlot): number {
  const [y, m, d] = slot.date.split('-').map(Number);
  const [hh, mm] = slot.time.split(':').map(Number);
  return Date.UTC(y, (m || 1) - 1, d || 1, hh || 0, mm || 0) - BD_OFFSET_MS;
}

export function isPastSlot(slot: ConsultationSlot, leadMs = 0): boolean {
  const t = slotInstant(slot);
  return Number.isNaN(t) || t < Date.now() + leadMs;
}

/** Today's date in Bangladesh, plus `addDays`, as YYYY-MM-DD (for <input type="date" min/max>). */
export function bdDate(addDays = 0): string {
  return new Date(Date.now() + BD_OFFSET_MS + addDays * 86400000).toISOString().slice(0, 10);
}

/** Returns an error message (en, bn) if the slot can't be booked, else null. */
export function slotProblem(slot: ConsultationSlot): { en: string; bn: string } | null {
  if (!slot.date || !slot.time) return { en: 'Choose a date and time.', bn: 'তারিখ ও সময় নির্বাচন করুন।' };
  if (isPastSlot(slot, MIN_LEAD_MS))
    return {
      en: 'That time has passed or is too soon — choose a time at least 1 hour from now.',
      bn: 'সময়টি পার হয়ে গেছে বা খুব কাছাকাছি — অন্তত ১ ঘণ্টা পরের সময় নির্বাচন করুন।',
    };
  if (slotInstant(slot) > Date.now() + MAX_AHEAD_DAYS * 86400000)
    return { en: `Choose a time within the next ${MAX_AHEAD_DAYS} days.`, bn: `আগামী ${MAX_AHEAD_DAYS} দিনের মধ্যে সময় নির্বাচন করুন।` };
  return null;
}

/** "Wed, 19 Nov · 4:00 PM" (shown in Bangladesh time regardless of the viewer's clock). */
export function formatSlot(slot: ConsultationSlot, lang: 'en' | 'bn' = 'en'): string {
  const t = slotInstant(slot);
  if (Number.isNaN(t)) return `${slot.date} ${slot.time}`;
  const locale = lang === 'bn' ? 'bn-BD' : 'en-GB';
  const d = new Date(t);
  const day = d.toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Asia/Dhaka' });
  const time = d.toLocaleTimeString(lang === 'bn' ? 'bn-BD' : 'en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Dhaka' });
  return `${day} · ${time}`;
}

export function formatSlotDay(date: string, lang: 'en' | 'bn' = 'en'): { weekday: string; day: string } {
  const d = new Date(slotInstant({ date, time: '12:00' }));
  const locale = lang === 'bn' ? 'bn-BD' : 'en-GB';
  return {
    weekday: d.toLocaleDateString(locale, { weekday: 'short', timeZone: 'Asia/Dhaka' }),
    day: d.toLocaleDateString(locale, { day: 'numeric', month: 'short', timeZone: 'Asia/Dhaka' }),
  };
}

export function formatSlotTime(time: string, lang: 'en' | 'bn' = 'en'): string {
  const d = new Date(slotInstant({ date: '2026-01-01', time }));
  return d.toLocaleTimeString(lang === 'bn' ? 'bn-BD' : 'en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Dhaka' });
}
