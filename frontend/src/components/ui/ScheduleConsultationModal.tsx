import { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';
import { DateTimeFields } from './SlotPicker';
import { acceptConsultation, ApiError } from '../../lib/api';
import { bdDate, formatSlot, isPastSlot, slotProblem } from '../../lib/slots';
import type { ConsultationRequest, ConsultationSlot } from '../../mocks/types';

/**
 * Lawyer confirms a time: one of the client's requested slots (if still in the future) or another
 * time they choose. Also used to reschedule an already-scheduled consultation.
 */
export function ScheduleConsultationModal({
  consultation,
  lang,
  onClose,
  onDone,
}: {
  consultation: ConsultationRequest | null;
  lang: 'en' | 'bn';
  onClose: () => void;
  onDone: (updated: ConsultationRequest) => void;
}) {
  const bn = lang === 'bn';
  const requested = consultation?.preferredSlots || [];
  const futureRequested = requested.filter((s) => !isPastSlot(s, 60 * 60 * 1000));
  const rescheduling = consultation?.status === 'scheduled';
  const [choice, setChoice] = useState<number | 'other'>(0);
  const [other, setOther] = useState<ConsultationSlot>({ date: bdDate(1), time: '10:00' });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!consultation) return;
    setChoice(!rescheduling && futureRequested.length > 0 ? 0 : 'other');
    setOther(consultation.scheduledSlot && !isPastSlot(consultation.scheduledSlot) ? consultation.scheduledSlot : { date: bdDate(1), time: '10:00' });
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [consultation?.id]);

  const slot = choice === 'other' ? other : futureRequested[choice];

  const save = async () => {
    const problem = slot ? slotProblem(slot) : { en: 'Choose a time.', bn: 'একটি সময় নির্বাচন করুন।' };
    if (problem) return setError(bn ? problem.bn : problem.en);
    setSaving(true);
    setError(null);
    try {
      onDone(await acceptConsultation(consultation!.id, slot));
    } catch (err) {
      setError(err instanceof ApiError ? (bn ? err.messageBn : err.message) : String(err));
    } finally {
      setSaving(false);
    }
  };

  const radio = (active: boolean) =>
    `flex w-full items-center gap-3 rounded border p-3 text-left text-xs transition ${
      active ? 'border-clay-deep bg-clay-tint' : 'border-granite-soft hover:border-clay'
    }`;

  return (
    <Modal
      open={!!consultation}
      onClose={onClose}
      title={rescheduling ? (bn ? 'সময় পরিবর্তন করুন' : 'Reschedule consultation') : bn ? 'গ্রহণ ও সময় নির্ধারণ' : 'Accept & schedule'}
    >
      {consultation && (
        <div className="space-y-4 font-body">
          <p className="text-xs text-ink-soft">
            {bn ? 'ক্লায়েন্ট: ' : 'Client: '}
            <strong>{consultation.citizenName}</strong> · {bn ? consultation.topicBn : consultation.topicEn}
          </p>
          {rescheduling && consultation.scheduledSlot && (
            <p className="text-xs text-granite">
              {bn ? 'বর্তমান সময়: ' : 'Currently: '}
              <span className={isPastSlot(consultation.scheduledSlot) ? 'line-through' : ''}>
                {formatSlot(consultation.scheduledSlot, lang)}
              </span>
            </p>
          )}

          <div className="space-y-2">
            {!rescheduling &&
              requested.map((s, i) => {
                const idx = futureRequested.indexOf(s);
                const past = idx === -1;
                return (
                  <button
                    key={`${s.date}-${s.time}`}
                    type="button"
                    disabled={past}
                    onClick={() => setChoice(idx)}
                    className={`${radio(choice === idx && !past)} disabled:cursor-not-allowed disabled:opacity-60`}
                  >
                    <span className={`h-3.5 w-3.5 rounded-full border-2 ${choice === idx && !past ? 'border-clay-deep bg-clay-deep' : 'border-granite'}`} />
                    <span className="flex-1">
                      <span className="block font-semibold text-ink">{bn ? 'ক্লায়েন্টের অনুরোধকৃত সময়' : "Client's requested time"}{requested.length > 1 ? ` ${i + 1}` : ''}</span>
                      <span className={past ? 'line-through text-granite' : 'text-ink-soft'}>{formatSlot(s, lang)}</span>
                    </span>
                    {past && <span className="text-[10px] font-semibold uppercase text-brick">{bn ? 'সময় পার হয়েছে' : 'Passed'}</span>}
                  </button>
                );
              })}
            <button type="button" onClick={() => setChoice('other')} className={radio(choice === 'other')}>
              <span className={`h-3.5 w-3.5 rounded-full border-2 ${choice === 'other' ? 'border-clay-deep bg-clay-deep' : 'border-granite'}`} />
              <span className="font-semibold text-ink">
                {rescheduling ? (bn ? 'নতুন সময়' : 'New time') : bn ? 'অন্য সময় প্রস্তাব করুন' : 'Choose a different time'}
              </span>
            </button>
            {choice === 'other' && <DateTimeFields value={other} onChange={setOther} lang={lang} />}
          </div>

          {!rescheduling && requested.length > 0 && futureRequested.length === 0 && (
            <p className="flex items-start gap-1.5 text-xs text-brick">
              <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              {bn ? 'ক্লায়েন্টের চাওয়া সময় পার হয়ে গেছে — একটি নতুন সময় নির্ধারণ করুন।' : "The client's requested time has passed — please set a new time."}
            </p>
          )}
          {error && <p className="text-xs font-medium text-brick">{error}</p>}

          <div className="flex justify-end gap-2 border-t border-granite-soft pt-3">
            <Button size="sm" variant="ghost" onClick={onClose}>
              {bn ? 'বাতিল' : 'Cancel'}
            </Button>
            <Button size="sm" variant="primary" onClick={save} loading={saving}>
              {slot && !slotProblem(slot)
                ? `${rescheduling ? (bn ? 'পরিবর্তন' : 'Reschedule') : bn ? 'নিশ্চিত' : 'Confirm'} · ${formatSlot(slot, lang)}`
                : bn ? 'নিশ্চিত করুন' : 'Confirm'}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
