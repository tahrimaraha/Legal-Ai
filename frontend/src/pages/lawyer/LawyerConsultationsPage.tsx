import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { useLang } from '../../context/LanguageContext';
import { listConsultations, acceptConsultation, declineConsultation } from '../../lib/api';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Button } from '../../components/ui/Button';
import { Skeleton, EmptyState } from '../../components/ui/EmptyState';
import type { ConsultationRequest } from '../../mocks/types';

export default function LawyerConsultationsPage() {
  const { lang, num } = useLang();
  const [consultations, setConsultations] = useState<ConsultationRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listConsultations().then((data) => {
      setConsultations(data);
      setLoading(false);
    });
  }, []);

  const handleAccept = async (id: string) => {
    // Confirm the citizen's first proposed slot.
    const slot = consultations.find((c) => c.id === id)?.preferredSlots[0];
    const updated = await acceptConsultation(id, slot);
    setConsultations((prev) => prev.map((c) => (c.id === id ? updated : c)));
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

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : consultations.length === 0 ? (
        <EmptyState title="No Consultations" description="No active client consultation bookings found." />
      ) : (
        <div className="divide-y divide-granite border border-granite rounded bg-white shadow-sm overflow-hidden">
          {consultations.map((c) => {
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
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  {isRequested ? (
                    <>
                      <Button size="sm" variant="primary" onClick={() => handleAccept(c.id)}>
                        <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                        <span>Accept & Schedule</span>
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDecline(c.id)} className="text-brick">
                        Decline
                      </Button>
                    </>
                  ) : (
                    <Link to={`/lawyer/consultations/${c.id}`}>
                      <Button size="sm" variant="secondary">
                        <span>Manage Session</span>
                        <ArrowRight className="ml-1 h-3.5 w-3.5" />
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
