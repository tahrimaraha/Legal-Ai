import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Clock, ArrowRight, UserCheck } from 'lucide-react';
import { useLang } from '../../context/LanguageContext';
import { listVerifications } from '../../lib/api';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Skeleton, EmptyState } from '../../components/ui/EmptyState';
import type { VerificationRequest } from '../../mocks/types';

export default function CitizenVerificationsPage() {
  const { lang, num } = useLang();
  const [requests, setRequests] = useState<VerificationRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listVerifications('citizen').then((data) => {
      setRequests(data);
      setLoading(false);
    });
  }, []);

  return (
    <div className="space-y-6 font-body">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">
            {lang === 'bn' ? 'আইনজীবী যাচাই অনুরোধসমূহ' : 'Lawyer Verification Requests'}
          </h1>
          <p className="mt-1 text-xs text-granite">
            {lang === 'bn'
              ? 'আপনার প্রেরিত এআই উত্তরের ওপর আইনজীবীদের প্রদত্ত আনুষ্ঠানিক রায় ও পরামর্শ'
              : 'Track status and review verdicts on your AI answers by enrolled advocates'}
          </p>
        </div>
        <Link to="/app/chat">
          <button className="px-3 py-1.5 bg-clay text-white rounded text-xs font-semibold uppercase tracking-wider hover:bg-clay-deep transition">
            {lang === 'bn' ? 'নতুন প্রশ্ন যাচাই করান' : 'Submit from Chat'}
          </button>
        </Link>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : requests.length === 0 ? (
        <EmptyState
          title={lang === 'bn' ? 'কোনো যাচাই অনুরোধ নেই' : 'No Verification Requests'}
          description={
            lang === 'bn'
              ? 'চ্যাটে এআই উত্তর পাওয়ার পর "আইনজীবীকে দিয়ে যাচাই করান" বাটনে ক্লিক করে অনুরোধ পাঠাতে পারেন।'
              : 'Submit an AI answer from the chat screen to have an advocate audit the citations.'
          }
          actionLabel={lang === 'bn' ? 'চ্যাটে যান' : 'Go to Chat'}
          onAction={() => window.location.assign('/app/chat')}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {requests.map((req) => (
            <Link
              key={req.id}
              to={`/app/verifications/${req.id}`}
              className="rounded border border-granite bg-white p-5 shadow-sm hover:border-clay hover:-translate-y-0.5 transition flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] text-granite">
                    {new Date(req.createdAt).toLocaleDateString()}
                  </span>
                  <StatusBadge status={req.status} />
                </div>

                <div>
                  <span className="font-mono text-[10px] uppercase text-clay-deep font-semibold">
                    {lang === 'bn' ? 'আপনার প্রশ্ন:' : 'Question:'}
                  </span>
                  <p className="font-display text-sm font-bold text-ink line-clamp-2 mt-0.5">
                    {req.questionExcerptBn}
                  </p>
                </div>

                {req.verdict ? (
                  <div className="p-3 rounded bg-clay-tint/50 border border-clay/20 text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-clay-deep flex items-center gap-1">
                        <UserCheck className="h-3.5 w-3.5" />
                        {req.verdict.lawyerNameBn}
                      </span>
                      <StatusBadge status={req.verdict.verdict} size="sm" />
                    </div>
                    <p className="text-ink-soft line-clamp-2 text-[11px]">
                      {req.verdict.noteToCitizenBn}
                    </p>
                  </div>
                ) : (
                  <div className="p-3 rounded bg-bone text-xs text-granite flex items-center gap-2 border border-granite-soft">
                    <Clock className="h-4 w-4 text-clay-deep shrink-0 animate-pulse" />
                    <span>
                      {req.claimedByLawyerName
                        ? `${req.claimedByLawyerName} পর্যালোচনা করছেন...`
                        : lang === 'bn'
                        ? 'অ্যাডমিন কর্তৃক আইনজীবী নির্ধারণের অপেক্ষায়...'
                        : 'Awaiting admin to assign an advocate...'}
                    </span>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-granite-soft flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-[10px] text-granite uppercase">
                    {req.citations.length} Citations Attached
                  </span>
                  <span className="font-bold text-clay-deep">
                    ৳{req.feeBdt} {lang === 'bn' ? 'পরিশোধিত' : 'Paid'}
                  </span>
                </div>
                <span className="text-clay-deep font-semibold flex items-center gap-1">
                  {lang === 'bn' ? 'সম্পূর্ণ রায় দেখুন' : 'View Full Verdict'} <ArrowRight className="h-3 w-3" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
