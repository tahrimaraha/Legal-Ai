import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Bot,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  MessageSquare,
  Briefcase,
} from 'lucide-react';
import { useLang } from '../../context/LanguageContext';
import { getVerificationById } from '../../lib/api';
import { StatusBadge, VerifiedBadge } from '../../components/ui/StatusBadge';
import { Button } from '../../components/ui/Button';
import { Skeleton, ErrorState } from '../../components/ui/EmptyState';
import type { VerificationRequest } from '../../mocks/types';

export default function CitizenVerificationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { lang, num } = useLang();
  const navigate = useNavigate();
  const [request, setRequest] = useState<VerificationRequest | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      getVerificationById(id).then((data) => {
        setRequest(data || null);
        setLoading(false);
      });
    }
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-96 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="py-8">
        <ErrorState title="Request Not Found" message="The verification record was not found." />
        <Link to="/app/verifications" className="inline-flex items-center gap-1.5 text-xs text-clay-deep mt-4">
          <ArrowLeft className="h-4 w-4" />
          <span>Back to verifications</span>
        </Link>
      </div>
    );
  }

  const { verdict } = request;

  return (
    <div className="space-y-6 font-body">
      {/* Back button & top bar */}
      <div className="flex items-center justify-between">
        <Link
          to="/app/verifications"
          className="inline-flex items-center gap-1.5 text-xs font-mono uppercase text-clay-deep hover:text-ink transition"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>{lang === 'bn' ? 'যাচাই তালিকায় ফিরুন' : 'Back to Verifications'}</span>
        </Link>
        <StatusBadge status={request.status} />
      </div>

      {/* Split view Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Original Question & AI Answer with Citations (span-6) */}
        <div className="lg:col-span-6 space-y-6">
          {/* Question Card */}
          <div className="rounded border border-granite bg-white p-5 shadow-sm space-y-2">
            <span className="font-mono text-label uppercase text-clay-deep font-semibold">
              {lang === 'bn' ? 'নাগরিকের প্রশ্ন' : 'Your Original Question'}
            </span>
            <p className="text-sm font-semibold text-ink leading-relaxed">
              {request.questionExcerptBn}
            </p>
          </div>

          {/* AI Answer Card */}
          <div className="rounded border border-granite bg-white p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-clay-deep border-b border-granite-soft pb-3">
              <Bot className="h-4 w-4" />
              <h3 className="font-mono text-label uppercase font-semibold text-ink">
                {lang === 'bn' ? 'মূল এআই উত্তর ও উদ্ধৃতি' : 'Original AI Answer & Citations'}
              </h3>
            </div>

            <div className="text-xs text-ink-soft whitespace-pre-line leading-relaxed">
              {request.aiAnswerExcerptBn}
            </div>

            {/* Citations list */}
            <div className="pt-4 border-t border-granite-soft space-y-2">
              <span className="font-mono text-[10px] text-granite uppercase block">
                {lang === 'bn' ? 'সংযুক্ত আইনের ধারা' : 'Retrieved Citations'}
              </span>
              <div className="space-y-2">
                {request.citations.map((c) => (
                  <div
                    key={c.id}
                    className="p-2.5 rounded bg-bone text-xs text-ink-soft border border-granite-soft"
                  >
                    <p className="font-mono font-bold text-clay-deep">{c.labelBn}</p>
                    <p className="mt-1 text-[11px] text-ink line-clamp-2">{c.textBn}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Lawyer Verdict & Corrected Explanation (span-6) */}
        <div className="lg:col-span-6 space-y-6">
          {verdict ? (
            <div className="rounded border-2 border-clay bg-white p-6 shadow-composer space-y-6">
              {/* Lawyer Identity & Verdict Header */}
              <div className="flex items-start justify-between border-b border-granite-soft pb-4">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded bg-clay-tint border border-clay flex items-center justify-center">
                    <ShieldCheck className="h-6 w-6 text-clay-deep" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-display text-base font-bold text-ink">
                        {lang === 'bn' ? 'সনদপ্রাপ্ত আইনজীবী' : 'Certified Advocate'}
                      </h3>
                      <VerifiedBadge />
                    </div>
                    <p className="font-mono text-[11px] text-granite">{verdict.lawyerEnrolmentNo}</p>
                  </div>
                </div>

                <StatusBadge status={verdict.verdict} size="md" />
              </div>

              {/* Corrected / Validated Explanation */}
              <div className="space-y-2">
                <span className="font-mono text-label uppercase text-clay-deep font-semibold block">
                  {lang === 'bn' ? 'আইনজীবীর সত্যায়িত আইনি বিশ্লেষণ' : 'Advocate Statutory Analysis'}
                </span>
                <div className="p-4 rounded bg-clay-tint/40 border border-clay/30 text-xs text-ink-soft leading-relaxed whitespace-pre-line">
                  {lang === 'bn' ? verdict.correctedExplanationBn : verdict.correctedExplanationEn}
                </div>
              </div>

              {/* Added or Disputed Statutes */}
              {verdict.addedStatuteCitations.length > 0 && (
                <div className="space-y-1.5">
                  <span className="font-mono text-[10px] text-granite uppercase block">
                    {lang === 'bn' ? 'আইনজীবী কর্তৃক অতিরিক্ত উদ্ধৃত ধারা' : 'Additional Cited Statutes'}
                  </span>
                  <div className="space-y-1">
                    {verdict.addedStatuteCitations.map((stat, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs text-ink font-mono bg-bone p-2 rounded">
                        <CheckCircle2 className="h-3.5 w-3.5 text-clay-deep" />
                        <span>{stat}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Note to Citizen */}
              <div className="rounded bg-bone p-4 border border-granite-soft space-y-1">
                <span className="font-mono text-[10px] uppercase text-clay-deep font-semibold block">
                  {lang === 'bn' ? 'নাগরিকের জন্য বিশেষ পরামর্শ' : 'Note to Citizen'}
                </span>
                <p className="text-xs text-ink-soft leading-relaxed">
                  {lang === 'bn' ? verdict.noteToCitizenBn : verdict.noteToCitizenEn}
                </p>
              </div>

              {/* Action Escalations */}
              <div className="pt-4 border-t border-granite-soft flex flex-col sm:flex-row gap-3">
                <Link to={`/app/lawyers/${verdict.lawyerId}`} className="flex-1">
                  <Button size="sm" variant="primary" className="w-full justify-center">
                    <Briefcase className="mr-1.5 h-3.5 w-3.5" />
                    <span>{lang === 'bn' ? 'এই আইনজীবীর পরামর্শ বুক করুন' : 'Book Consultation'}</span>
                  </Button>
                </Link>
                <Link to="/app/chat" className="flex-1">
                  <Button size="sm" variant="secondary" className="w-full justify-center">
                    <MessageSquare className="mr-1.5 h-3.5 w-3.5" />
                    <span>{lang === 'bn' ? 'আরও প্রশ্ন করুন' : 'Ask Follow-up'}</span>
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            /* Pending status state card */
            <div className="rounded border border-granite bg-white p-8 text-center space-y-4 shadow-sm">
              <Clock className="h-10 w-10 mx-auto text-clay-deep animate-pulse" />
              <h3 className="font-display text-lg font-bold text-ink">
                {lang === 'bn' ? 'আইনজীবী পর্যালোচনা প্রক্রিয়াধীন' : 'Verification Under Review'}
              </h3>
              <p className="text-xs text-ink-soft max-w-sm mx-auto leading-relaxed">
                {lang === 'bn'
                  ? 'আপনার প্রশ্নটি যাচাই কিউতে রয়েছে। একজন সনদপ্রাপ্ত আইনজীবী এটি গ্রহণ করলে আপনি নোটিফিকেশন পাবেন।'
                  : 'Your request has been routed to our advocate queue. You will receive an immediate notification upon completion.'}
              </p>
              <div className="p-3 bg-bone-deep rounded text-xs font-mono text-clay-deep">
                Expected Completion: ~24 hours
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
