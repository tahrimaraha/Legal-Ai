import { useEffect, useState } from 'react';
import { Clock, Calendar, CheckCircle2, AlertCircle, Save } from 'lucide-react';
import { useLang } from '../../context/LanguageContext';
import { Button } from '../../components/ui/Button';
import { ApiError, getMyAvailability, saveMyAvailability } from '../../lib/api';

export default function LawyerAvailabilityPage() {
  const { lang } = useLang();
  const [vacationMode, setVacationMode] = useState(false);
  const [maxActiveConsultations, setMaxActiveConsultations] = useState(5);
  const [saved, setSaved] = useState(false);

  // Weekly availability grid
  const days = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'];
  const [selectedSlots, setSelectedSlots] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getMyAvailability()
      .then((a) => {
        setVacationMode(a.vacationMode);
        setMaxActiveConsultations(a.maxActiveConsultations);
        setSelectedSlots(Object.fromEntries(a.slots.map((slot) => [slot, true])));
      })
      .catch(() => setError(lang === 'bn' ? 'সময়সূচি লোড করা যায়নি' : 'Could not load your availability'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleSlot = (day: string, time: string) => {
    const key = `${day}-${time}`;
    setSelectedSlots((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const times = ['10:00', '11:30', '14:00', '16:00', '17:30', '19:00'];

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      await saveMyAvailability({
        vacationMode,
        maxActiveConsultations,
        slots: Object.keys(selectedSlots).filter((key) => selectedSlots[key]),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof ApiError ? (lang === 'bn' ? err.messageBn : err.message) : 'Could not save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 font-body max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">
            {lang === 'bn' ? 'সাপ্তাহিক সময়সূচি ও প্রাপ্যতা' : 'Weekly Availability & Consultation Slots'}
          </h1>
          <p className="mt-1 text-xs text-granite">
            {lang === 'bn'
              ? 'নাগরিকদের সাথে সাক্ষাতের নির্দিষ্ট সময় ও ভ্যাকেশন মোড কনফিগারেশন'
              : 'Set client appointment slots, maximum load, and vacation mode'}
          </p>
        </div>

        <Button size="sm" variant="primary" onClick={handleSave} loading={saving}>
          <Save className="mr-1.5 h-3.5 w-3.5" />
          <span>Save Availability</span>
        </Button>
      </div>

      {error && <div className="p-2.5 rounded bg-brick/10 border border-brick/30 text-xs text-brick font-medium">{error}</div>}

      {saved && (
        <div className="p-3 rounded bg-clay-tint border border-clay text-xs text-clay-deep font-semibold flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" />
          <span>Availability schedule updated!</span>
        </div>
      )}

      {/* Vacation mode toggle banner */}
      <div className="rounded border border-granite bg-white p-5 shadow-sm flex items-center justify-between">
        <div>
          <h3 className="font-display text-sm font-bold text-ink">Vacation / Away Mode</h3>
          <p className="text-xs text-granite mt-0.5">
            When enabled, citizens will see an away notice and cannot book new slots.
          </p>
        </div>
        <input
          type="checkbox"
          checked={vacationMode}
          onChange={(e) => setVacationMode(e.target.checked)}
          className="h-5 w-5 rounded border-granite text-clay focus:ring-clay cursor-pointer"
        />
      </div>

      {/* Weekly Grid */}
      <div className="rounded border border-granite bg-white p-6 shadow-sm space-y-4">
        <h3 className="font-mono text-label uppercase text-clay-deep font-semibold">
          Weekly Consultation Time Slots
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-granite-soft bg-bone text-ink">
                <th className="p-2.5 font-mono uppercase">Day</th>
                {times.map((t) => (
                  <th key={t} className="p-2.5 font-mono text-center">{t}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-granite-soft">
              {days.map((day) => (
                <tr key={day} className="hover:bg-bone/30">
                  <td className="p-2.5 font-semibold text-ink">{day}</td>
                  {times.map((time) => {
                    const active = selectedSlots[`${day}-${time}`] || false;
                    return (
                      <td key={time} className="p-2 text-center">
                        <button
                          type="button"
                          onClick={() => toggleSlot(day, time)}
                          className={`px-2.5 py-1 rounded text-[11px] font-mono transition ${
                            active
                              ? 'bg-clay-tint text-clay-deep font-bold border border-clay/40'
                              : 'bg-bone text-granite hover:bg-bone-deep'
                          }`}
                        >
                          {active ? 'Available' : '—'}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
