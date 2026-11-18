import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Calendar, Clock, ArrowRight, UserCheck, CheckCircle2, XCircle } from 'lucide-react';
import { useLang } from '../../context/LanguageContext';
import { listConsultations, declineConsultation, completeConsultation, ApiError } from '../../lib/api';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Button } from '../../components/ui/Button';
import { Skeleton, EmptyState } from '../../components/ui/EmptyState';
import type { ConsultationRequest } from '../../mocks/types';
import { ScheduleConsultationModal } from '../../components/ui/ScheduleConsultationModal';
import { formatSlot, isPastSlot } from '../../lib/slots';
import { inBucket, type ConsultationBucket } from '../../lib/consultationBuckets';

export default function LawyerConsultationsPage() {
  const { lang, num } = useLang();
  const [consultations, setConsultations] = useState<ConsultationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [scheduling, setScheduling] = useState<ConsultationRequest | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const TABS: { key: ConsultationBucket; en: string; bn: string }[] = [
    { key: 'all', en: 'All', bn: 'সকল' },
    { key: 'requests', en: 'New Requests', bn: 'নতুন অনুরোধ' },
    { key: 'upcoming', en: 'Upcoming', bn: 'আসন্ন' },
    { key: 'reschedule', en: 'Needs a Time', bn: 'সময় নির্ধারণ প্রয়োজন' },
    { key: 'completed', en: 'Completed', bn: 'সম্পন্ন' },
  ];
  const tabParam = searchParams.get('status') as ConsultationBucket | null;
  const tab: ConsultationBucket = TABS.some((t) => t.key === tabParam) ? tabParam! : 'all';
  const visible = inBucket(consultations, tab);

  useEffect(() => {
    listConsultations().then((data) => {
      setConsultations(data);
      setLoading(false);
    });
  }, []);

  const handleScheduled = (updated: ConsultationRequest) => {
    setConsultations((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    setScheduling(null);
  };

  const [completing, setCompleting] = useState<string | null>(null);
  const handleComplete = async (c: ConsultationRequest) => {
    const ok = confirm(lang === 'bn'
      ? `${c.citizenName} এর সাথে পরামর্শটি সম্পন্ন হিসেবে চিহ্নিত করবেন?`
      : `Mark the consultation with ${c.citizenName} as completed?`);
    if (!ok) return;
    setCompleting(c.id);
    try {
      const updated = await completeConsultation(c.id);
      setConsultations((prev) => prev.map((x) => (x.id === c.id ? updated : x)));
    } catch (err) {
      alert(err instanceof ApiError ? (lang === 'bn' ? err.messageBn : err.message) : String(err));
    } finally {
      setCompleting(null);
    }
  };

  const handleDecline = async (id: string) => {
    const reason = prompt('Reason for declining (will be recorded):');
    if (reason) {
      const updated = await declineConsultation(id, reason);
      setConsultations((prev) => prev.map((c) => (c.id === id ? updated : c)));
    }
  };

  return (
    <div className="space-y-6 font-body">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink">
          {lang === 'bn' ? 'ক্লায়েন্ট পরামর্শ ব্যবস্থাপনা' : 'Client Consultations & Requests'}
        </h1>
        <p className="mt-1 text-xs text-granite">
          {lang === 'bn'
            ? 'নাগরিকদের প্রেরিত পরামর্শ অনুরোধ গ্রহণ, শিডিউল নির্ধারণ ও সম্পন্নকরণ'
            : 'Accept incoming consultation bookings, manage session slots, and record private case notes'}
        </p>
      </div>

      {!loading && (
        <div role="tablist" className="flex flex-wrap gap-2">
          {TABS.map((t) => {
            const active = tab === t.key;
            const count = inBucket(consultations, t.key).length;
            return (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setSearchParams(t.key === 'all' ? {} : { status: t.key }, { replace: true })}
                className={`flex items-center gap-2 rounded border px-3 py-1.5 text-xs font-semibold transition ${
                  active ? 'border-clay bg-clay text-white' : 'border-granite-soft bg-white text-ink-soft hover:bg-clay-tint'
                }`}
              >
                <span>{lang === 'bn' ? t.bn : t.en}</span>
                <span className={`rounded px-1.5 py-0.5 font-mono text-[10px] ${
                  active ? 'bg-white/20 text-white' : t.key === 'reschedule' && count > 0 ? 'bg-red-600 text-white' : 'bg-bone-deep text-clay-deep'
                }`}>
                  {num(count)}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <EmptyState
          title={consultations.length === 0 ? 'No Consultations' : lang === 'bn' ? 'এই তালিকায় কিছু নেই' : 'Nothing here'}
          description={consultations.length === 0 ? 'No active client consultation bookings found.' : lang === 'bn' ? 'এই বিভাগে কোনো পরামর্শ নেই।' : 'No consultations in this group.'}
        />
      ) : (
        <div className="divide-y divide-granite border border-granite rounded bg-white shadow-sm overflow-hidden">
          {visible.map((c) => {
            const isRequested = c.status === 'requested';
            return (
              <div key={c.id} className="p-5 hover:bg-bone/40 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1.5 min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] text-granite">
                      {new Date(c.createdAt).toLocaleDateString()}
                    </span>
                    <StatusBadge status={c.status} size="sm" />
                    <span className="font-mono text-[10px] uppercase bg-bone-deep px-1.5 py-0.2 rounded font-bold">
                      {c.mode}
                    </span>
                  </div>

                  <h3 className="font-display text-sm font-bold text-ink">
                    {lang === 'bn' ? c.topicBn : c.topicEn}
                  </h3>

                  <p className="text-xs text-ink-soft line-clamp-1">
                    Client: <strong>{c.citizenName}</strong> ({c.citizenPhone || 'No phone'}) · Fee: ৳{num(c.feeBdt)} BDT
                  </p>
                  {(() => {
                    const slot = c.scheduledSlot || c.preferredSlots?.[0];
                    if (!slot) return null;
                    const past = isPastSlot(slot) && ['requested', 'accepted', 'scheduled'].includes(c.status);
                    return (
                      <p className={`flex items-center gap-1.5 text-xs ${past ? 'text-brick' : 'text-ink-soft'}`}>
                        <Clock className="h-3.5 w-3.5 shrink-0" />
                        <span>
                          {c.scheduledSlot ? (lang === 'bn' ? 'নির্ধারিত: ' : 'Scheduled: ') : lang === 'bn' ? 'অনুরোধকৃত: ' : 'Requested: '}
                          <strong>{formatSlot(slot, lang)}</strong>
                          {past && (lang === 'bn' ? ' — সময় পার হয়েছে, নতুন সময় দিন' : ' — this time has passed, please reschedule')}
                        </span>
                      </p>
                    );
                  })()}
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  {isRequested ? (
                    <>
                      <Button size="sm" variant="primary" onClick={() => setScheduling(c)}>
                        <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                        <span>Accept & Schedule</span>
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDecline(c.id)} className="text-brick">
                        Decline
                      </Button>
                    </>
                  ) : (
                    <>
                    {(c.status === 'scheduled' || c.status === 'accepted') && (
                      <Button size="sm" variant="ghost" onClick={() => setScheduling(c.status === 'accepted' ? { ...c, status: 'scheduled' } : c)}>
                        <Calendar className="mr-1 h-3.5 w-3.5" />
                        <span>{c.status === 'accepted' ? (lang === 'bn' ? 'সময় দিন' : 'Set time') : lang === 'bn' ? 'সময় পরিবর্তন' : 'Reschedule'}</span>
                      </Button>
                    )}
                    {(c.status === 'scheduled' || c.status === 'accepted') && (
                      <Button size="sm" variant="primary" loading={completing === c.id} disabled={!!completing} onClick={() => void handleComplete(c)}>
                        <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                        <span>{lang === 'bn' ? 'সম্পন্ন' : 'Mark completed'}</span>
                      </Button>
                    )}
                    <Link to={`/lawyer/consultations/${c.id}`}>
                      <Button size="sm" variant="secondary">
                        <span>Manage Session</span>
                        <ArrowRight className="ml-1 h-3.5 w-3.5" />
                      </Button>
                    </Link>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
      <ScheduleConsultationModal
        consultation={scheduling}
        lang={lang}
        onClose={() => setScheduling(null)}
        onDone={handleScheduled}
      />
    </div>
  );
}
