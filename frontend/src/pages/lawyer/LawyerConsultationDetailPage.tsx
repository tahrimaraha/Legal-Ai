import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Mail,
  FileText,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { useLang } from '../../context/LanguageContext';
import { getConsultationById, completeConsultation } from '../../lib/api';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Timeline } from '../../components/ui/Timeline';
import { Button } from '../../components/ui/Button';
import { Textarea } from '../../components/ui/Input';
import { Skeleton, ErrorState } from '../../components/ui/EmptyState';
import type { ConsultationRequest } from '../../mocks/types';
import { formatSlot, isPastSlot } from '../../lib/slots';
import { PaymentStatusCard } from '../../components/ui/PaymentStatusCard';

export default function LawyerConsultationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { lang, num } = useLang();
  const navigate = useNavigate();

  const [consultation, setConsultation] = useState<ConsultationRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [privateNotes, setPrivateNotes] = useState('');
  const [completing, setCompleting] = useState(false);

  useEffect(() => {
    if (id) {
      getConsultationById(id).then((data) => {
        setConsultation(data || null);
        if (data?.lawyerPrivateNotes) setPrivateNotes(data.lawyerPrivateNotes);
        setLoading(false);
      });
    }
  }, [id]);

  if (loading) {
    return <div className="space-y-6"><Skeleton className="h-8 w-48" /><Skeleton className="h-96 w-full" /></div>;
  }

  if (!consultation) {
    return (
      <div className="py-8">
        <ErrorState title="Consultation Not Found" message="The requested consultation record was not found." />
        <Link to="/lawyer/consultations" className="inline-flex items-center gap-1.5 text-xs text-clay-deep mt-4">
          <ArrowLeft className="h-4 w-4" />
          <span>Back to consultations</span>
        </Link>
      </div>
    );
  }

  const handleComplete = async () => {
    setCompleting(true);
    try {
      const updated = await completeConsultation(consultation.id, privateNotes);
      setConsultation(updated);
    } finally {
      setCompleting(false);
    }
  };

  return (
    <div className="space-y-6 font-body">
      <div className="flex items-center justify-between">
        <Link
          to="/lawyer/consultations"
          className="inline-flex items-center gap-1.5 text-xs font-mono uppercase text-clay-deep hover:text-ink transition"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Consultations</span>
        </Link>
        <StatusBadge status={consultation.status} size="md" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Client Details, Notes (span-7) */}
        <div className="lg:col-span-7 space-y-6">
          <PaymentStatusCard
            payment={consultation.payment}
            kind="consultation"
            recordId={consultation.id}
            canReview
            onChange={(payment) => setConsultation({ ...consultation, payment })}
          />
          <div className="rounded border border-granite bg-white p-6 shadow-sm space-y-4">
            <div>
              <span className="font-mono text-[10px] text-granite uppercase block">Client Inquiry</span>
              <h1 className="font-display text-xl font-bold text-ink mt-0.5">
                {consultation.topicBn}
              </h1>
            </div>

            <div className="p-3.5 rounded bg-bone border border-granite-soft text-xs text-ink-soft leading-relaxed whitespace-pre-line">
              {consultation.description}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs pt-2">
              <div>
                <span className="font-mono text-[10px] text-granite uppercase block">Client</span>
                <span className="font-bold text-ink">{consultation.citizenName}</span>
              </div>
              <div>
                <span className="font-mono text-[10px] text-granite uppercase block">Phone</span>
                <span className="font-bold text-ink">{consultation.citizenPhone || 'N/A'}</span>
              </div>
              <div>
                <span className="font-mono text-[10px] text-granite uppercase block">Confirmed Slot</span>
                <span className="font-bold text-clay-deep font-mono">
                  {consultation.scheduledSlot
                    ? formatSlot(consultation.scheduledSlot, lang) + (isPastSlot(consultation.scheduledSlot) && consultation.status === 'scheduled' ? (lang === 'bn' ? ' (সময় পার হয়েছে)' : ' (time passed)') : '')
                    : 'Unscheduled'}
                </span>
              </div>
            </div>
          </div>

          {/* Private Case Notes (Lawyer-only) */}
          <div className="rounded border border-granite bg-white p-6 shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-clay-deep">
              <Lock className="h-4 w-4" />
              <h2 className="font-mono text-label uppercase font-semibold">
                Advocate Private Case Notes (Confidential)
              </h2>
            </div>
            <Textarea
              placeholder="Record private litigation strategy, facts, evidence readiness..."
              value={privateNotes}
              onChange={(e) => setPrivateNotes(e.target.value)}
              rows={4}
            />

            {consultation.status !== 'completed' && (
              <div className="pt-2 flex justify-end">
                <Button size="sm" variant="primary" onClick={handleComplete} loading={completing}>
                  <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                  <span>Mark Consultation Completed</span>
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Timeline & Actions (span-5) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="rounded border border-granite bg-white p-5 shadow-sm space-y-4">
            <h3 className="font-mono text-label uppercase text-clay-deep font-semibold">
              Consultation Timeline
            </h3>
            <Timeline items={consultation.timeline} />
          </div>

          <Link to="/lawyer/messages" className="block">
            <Button size="sm" variant="secondary" className="w-full justify-center">
              <Mail className="mr-1.5 h-3.5 w-3.5" />
              <span>Message Client Directly</span>
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
