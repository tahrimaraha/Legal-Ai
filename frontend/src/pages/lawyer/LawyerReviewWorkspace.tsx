import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Bot,
  User,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  FileCheck,
} from 'lucide-react';
import { useLang } from '../../context/LanguageContext';
import { useRole } from '../../context/RoleContext';
import { getVerificationById, submitVerificationVerdict } from '../../lib/api';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input, Textarea } from '../../components/ui/Input';
import { Skeleton, ErrorState } from '../../components/ui/EmptyState';
import type { VerificationRequest, VerdictType } from '../../mocks/types';

export default function LawyerReviewWorkspace() {
  const { id } = useParams<{ id: string }>();
  const { lang, num } = useLang();
  const { user } = useRole();
  const navigate = useNavigate();

  const [request, setRequest] = useState<VerificationRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Expanded citations in middle column
  const [expandedCitations, setExpandedCitations] = useState<Record<string, boolean>>({});

  // Verdict Form States
  const [verdict, setVerdict] = useState<VerdictType>('accurate');
  const [correctedExplanation, setCorrectedExplanation] = useState(
    'এআই প্রদত্ত উত্তরটি আইনের কাঠামোর সাথে সঙ্গতিপূর্ণ। তবে প্রয়োগের ক্ষেত্রে নোটিশের নির্দিষ্ট সময়সীমা ও লিখিত রসিদ থাকা আবশ্যক।',
  );
  const [addedStatutes, setAddedStatutes] = useState<string[]>(['বাড়ী ভাড়া নিয়ন্ত্রণ আইন ১৯৯১ · ধারা ১৯']);
  const [newStatuteInput, setNewStatuteInput] = useState('');
  const [noteToCitizen, setNoteToCitizen] = useState(
    'বাড়িওয়ালা অন্যায় উচ্ছেদের হুমকি দিলে ৭ দিনের সময় দিয়ে আইনজীবীর মাধ্যমে একটি আইনি নোটিশ প্রেরণ করতে পারেন।',
  );
  const [minutesSpent, setMinutesSpent] = useState(15);

  // Confirm Modal
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);

  useEffect(() => {
    if (id) {
      getVerificationById(id).then((data) => {
        setRequest(data || null);
        if (data?.verdict) {
          setVerdict(data.verdict.verdict);
          setCorrectedExplanation(data.verdict.correctedExplanationBn);
          setNoteToCitizen(data.verdict.noteToCitizenBn);
          setAddedStatutes(data.verdict.addedStatuteCitations);
          setMinutesSpent(data.verdict.minutesSpent);
        }
        setLoading(false);
      });
    }
  }, [id]);

  if (loading) {
    return <div className="space-y-6"><Skeleton className="h-10 w-48" /><Skeleton className="h-96 w-full" /></div>;
  }

  if (!request) {
    return (
      <div className="py-8">
        <ErrorState title="Request Not Found" message="The requested verification task was not found." />
        <Link to="/lawyer/verifications" className="inline-flex items-center gap-1.5 text-xs text-clay-deep mt-4">
          <ArrowLeft className="h-4 w-4" />
          <span>Back to queue</span>
        </Link>
      </div>
    );
  }

  if (request.status !== 'completed' && request.claimedByLawyerId !== user?.id) {
    return (
      <div className="py-8">
        <ErrorState
          title={lang === 'bn' ? 'এই কেসটি আপনাকে বরাদ্দ করা হয়নি' : 'Not Assigned to You'}
          message={
            lang === 'bn'
              ? 'অ্যাডমিন টিম এই যাচাই অনুরোধটি অন্য একজন আইনজীবীকে বরাদ্দ করেছেন, অথবা এটি এখনো বরাদ্দ করা হয়নি।'
              : 'This verification request has been assigned to a different lawyer, or has not been assigned yet by the admin team.'
          }
        />
        <Link to="/lawyer/verifications" className="inline-flex items-center gap-1.5 text-xs text-clay-deep mt-4">
          <ArrowLeft className="h-4 w-4" />
          <span>Back to queue</span>
        </Link>
      </div>
    );
  }

  const toggleCitation = (citId: string) => {
    setExpandedCitations((prev) => ({ ...prev, [citId]: !prev[citId] }));
  };

  const handleAddStatute = () => {
    if (!newStatuteInput.trim()) return;
    setAddedStatutes((prev) => [...prev, newStatuteInput.trim()]);
    setNewStatuteInput('');
  };

  const handleRemoveStatute = (index: number) => {
    setAddedStatutes((prev) => prev.filter((_, i) => i !== index));
  };

  const handleFinalSubmit = async () => {
    setSubmitting(true);
    try {
      // The lawyer's name and enrolment number are added by the backend from their session.
      await submitVerificationVerdict(request.id, {
        verdict,
        correctedExplanationBn: correctedExplanation,
        correctedExplanationEn: correctedExplanation,
        addedStatuteCitations: addedStatutes,
        disputedStatuteCitations: [],
        noteToCitizenBn: noteToCitizen,
        noteToCitizenEn: noteToCitizen,
        minutesSpent,
      });
      setConfirmModalOpen(false);
      navigate('/lawyer/verifications');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 font-body">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-granite pb-3">
        <Link
          to="/lawyer/verifications"
          className="inline-flex items-center gap-1.5 text-xs font-mono uppercase text-clay-deep hover:text-ink transition"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>{lang === 'bn' ? 'যাচাই কিউতে ফিরুন' : 'Back to Queue'}</span>
        </Link>

        <div className="flex items-center gap-3">
          <span className="font-mono text-xs text-granite">Task ID: {request.id}</span>
          <StatusBadge status={request.status} />
        </div>
      </div>

      {/* 3-Column Desktop Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Column 1: Citizen Question & Context (span-3.5) */}
        <div className="lg:col-span-3 space-y-4">
          <div className="rounded border border-granite bg-white p-4 shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-clay-deep border-b border-granite-soft pb-2">
              <User className="h-4 w-4" />
              <h2 className="font-mono text-[11px] uppercase font-semibold text-ink">
                {lang === 'bn' ? 'নাগরিকের প্রশ্ন ও তথ্য' : '1. Citizen Inquiry & Context'}
              </h2>
            </div>

            <div>
              <span className="font-mono text-[10px] uppercase text-granite block">Citizen Name</span>
              <p className="font-bold text-xs text-ink">{request.citizenName}</p>
            </div>

            <div>
              <span className="font-mono text-[10px] uppercase text-granite block">Submitted Question</span>
              <p className="text-xs text-ink-soft leading-relaxed mt-1 p-2.5 rounded bg-bone border border-granite-soft">
                "{request.questionExcerptBn}"
              </p>
            </div>

            <div className="pt-2 border-t border-granite-soft space-y-1">
              <span className="font-mono text-[10px] uppercase text-granite block">Inquiry Metadata</span>
              <p className="text-[11px] text-ink-soft">• Submitted: {new Date(request.createdAt).toLocaleString()}</p>
              <p className="text-[11px] text-ink-soft">• Urgency: <strong className="uppercase font-mono">{request.urgency}</strong></p>
            </div>
          </div>
        </div>

        {/* Column 2: AI Answer with Inline Expandable Grounding (span-4.5) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="rounded border border-granite bg-white p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-clay-deep border-b border-granite-soft pb-2">
              <Bot className="h-4 w-4" />
              <h2 className="font-mono text-[11px] uppercase font-semibold text-ink">
                {lang === 'bn' ? 'এআই উত্তর ও সংগৃহীত ধারা' : '2. AI Answer & Retrieved Passages'}
              </h2>
            </div>

            {/* AI Generated Text */}
            <div className="p-3 bg-bone rounded border border-granite-soft text-xs text-ink-soft whitespace-pre-line leading-relaxed max-h-64 overflow-y-auto">
              {request.aiAnswerExcerptBn}
            </div>

            {/* Inline expandable grounding */}
            <div className="space-y-2 pt-2 border-t border-granite-soft">
              <span className="font-mono text-label uppercase text-clay-deep font-semibold block">
                {lang === 'bn' ? 'উদ্ধৃত ধারাসমূহ (ক্লিক করে পাঠ্য দেখুন)' : 'Grounding Statutes (Expand inline)'}
              </span>

              {request.citations.map((c) => {
                const isExpanded = expandedCitations[c.id] || false;
                return (
                  <div key={c.id} className="rounded border border-granite-soft bg-white text-xs overflow-hidden">
                    <button
                      type="button"
                      onClick={() => toggleCitation(c.id)}
                      className="w-full p-2.5 text-left bg-bone flex items-center justify-between font-mono hover:bg-clay-tint/40 transition"
                    >
                      <span className="font-bold text-clay-deep">{c.labelBn}</span>
                      {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    </button>

                    {isExpanded && (
                      <div className="p-3 text-[11px] text-ink-soft bg-[#FAF8F5] border-t border-granite-soft leading-relaxed">
                        <p className="mb-1 font-semibold text-ink">Original Statute Extract:</p>
                        <p className="italic">{c.textBn}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Column 3: Lawyer Verdict Panel (span-4) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="rounded border-2 border-clay bg-white p-5 shadow-composer space-y-4">
            <div className="flex items-center gap-2 text-clay-deep border-b border-granite-soft pb-2">
              <ShieldCheck className="h-4 w-4" />
              <h2 className="font-mono text-[11px] uppercase font-semibold text-ink">
                {lang === 'bn' ? 'আইনজীবীর সত্যায়ন প্যানেল' : '3. Lawyer Verdict Panel'}
              </h2>
            </div>

            {/* Verdict Selection Radios */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase text-ink-soft">
                {lang === 'bn' ? 'আপনার রায় (Verdict)' : 'Statutory Assessment'}
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { key: 'accurate', labelBn: 'নির্ভুল উত্তর', icon: CheckCircle2, color: 'text-clay-deep' },
                  { key: 'incomplete', labelBn: 'অসম্পূর্ণ', icon: AlertTriangle, color: 'text-ink' },
                  { key: 'needs_correction', labelBn: 'সংশোধন আবশ্যক', icon: AlertTriangle, color: 'text-ink' },
                  { key: 'incorrect', labelBn: 'ভুল ব্যাখ্যা', icon: XCircle, color: 'text-brick' },
                ].map((item) => {
                  const Icon = item.icon;
                  const selected = verdict === item.key;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setVerdict(item.key as VerdictType)}
                      className={`flex items-center gap-2 p-2 rounded border text-left text-xs transition ${
                        selected
                          ? 'border-clay bg-clay-tint text-clay-deep font-bold'
                          : 'border-granite bg-white text-ink-soft hover:bg-bone'
                      }`}
                    >
                      <Icon className={`h-3.5 w-3.5 shrink-0 ${item.color}`} />
                      <span className="truncate">{item.labelBn}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Rich Corrected Explanation */}
            <Textarea
              label={lang === 'bn' ? 'সংশোধিত / পরিমার্জিত ব্যাখ্যা' : 'Advocate Legal Analysis'}
              placeholder="Provide exact legal reasoning and statutory interpretation..."
              value={correctedExplanation}
              onChange={(e) => setCorrectedExplanation(e.target.value)}
              rows={4}
              required
            />

            {/* Add or Dispute Statutes */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase text-ink-soft">
                {lang === 'bn' ? 'আইন ও ধারা সংযোজন / রেফারেন্স' : 'Add/Dispute Statutory References'}
              </label>
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="e.g. Evidence Act 1872 · Section 3"
                  value={newStatuteInput}
                  onChange={(e) => setNewStatuteInput(e.target.value)}
                />
                <Button size="sm" variant="secondary" type="button" onClick={handleAddStatute}>
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>

              <div className="space-y-1">
                {addedStatutes.map((s, idx) => (
                  <div key={idx} className="flex items-center justify-between p-1.5 rounded bg-bone text-[11px] font-mono border border-granite-soft">
                    <span>{s}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveStatute(idx)}
                      className="text-granite hover:text-brick"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Note to Citizen */}
            <Textarea
              label={lang === 'bn' ? 'নাগরিকের জন্য পরামর্শ নোট' : 'Plain Note to Citizen'}
              placeholder="Actionable advice in plain language for the citizen..."
              value={noteToCitizen}
              onChange={(e) => setNoteToCitizen(e.target.value)}
              rows={2}
              required
            />

            {/* Minutes spent */}
            <div className="grid grid-cols-2 gap-3 items-center">
              <Input
                type="number"
                label={lang === 'bn' ? 'পর্যালোচনায় ব্যয়িত সময় (মিনিট)' : 'Minutes Spent'}
                value={minutesSpent}
                onChange={(e) => setMinutesSpent(Number(e.target.value))}
                min={5}
                max={120}
              />
              <div className="text-[11px] text-granite font-mono pt-4">
                Enrolment: BC/CTG/2011/3190
              </div>
            </div>

            {/* Submit Action Button with gavel beat */}
            <div className="pt-3 border-t border-granite-soft">
              <Button
                size="lg"
                variant="primary"
                onClick={() => setConfirmModalOpen(true)}
                className="w-full justify-center"
              >
                <FileCheck className="mr-1.5 h-4 w-4" />
                <span>{lang === 'bn' ? 'রায় চূড়ান্ত করুন ও প্রিভিউ' : 'Submit Verdict'}</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation & Citizen View Preview Modal */}
      <Modal
        open={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        title={lang === 'bn' ? 'রায় নিশ্চিতকরণ (Citizen View Preview)' : 'Confirm Verdict Submission'}
      >
        <div className="space-y-4 font-body text-xs">
          <p className="text-ink-soft">
            {lang === 'bn'
              ? 'রায় জমা দেওয়ার পর নাগরিক ঠিক এই ফরম্যাটে আপনার মূল্যায়ন দেখতে পাবেন:'
              : 'This is the exact verified card that will appear on the citizen’s screen:'}
          </p>

          {/* Simulated Citizen Verdict View */}
          <div className="rounded border-2 border-clay bg-clay-tint/40 p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-clay/30 pb-2">
              <span className="font-bold text-ink">{user?.name || 'Advocate'}</span>
              <StatusBadge status={verdict} size="sm" />
            </div>
            <p className="text-ink-soft whitespace-pre-line leading-relaxed text-xs">
              {correctedExplanation}
            </p>
            <div className="p-2.5 rounded bg-white text-[11px] text-ink-soft border border-granite-soft">
              <strong>Note to citizen:</strong> {noteToCitizen}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-granite-soft">
            <Button size="sm" variant="ghost" onClick={() => setConfirmModalOpen(false)}>
              Back to Edit
            </Button>
            <Button size="sm" variant="primary" onClick={handleFinalSubmit} loading={submitting}>
              <span>Confirm & Dispatch Verdict</span>
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
