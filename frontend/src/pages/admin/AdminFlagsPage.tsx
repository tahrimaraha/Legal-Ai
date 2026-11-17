import { useState, useEffect } from 'react';
import { Flag, CheckCircle2, AlertTriangle, ShieldCheck, Trash2, ArrowRight } from 'lucide-react';
import { useLang } from '../../context/LanguageContext';
import { listAdminFlags, resolveFlag } from '../../lib/api';
import { Button } from '../../components/ui/Button';
import { Skeleton, EmptyState } from '../../components/ui/EmptyState';
import type { FlaggedAnswer } from '../../mocks/types';

export default function AdminFlagsPage() {
  const { lang } = useLang();
  const [flags, setFlags] = useState<FlaggedAnswer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listAdminFlags().then((data) => {
      setFlags(data);
      setLoading(false);
    });
  }, []);

  const handleResolve = async (id: string, action: 'dismiss' | 'escalate' | 'corpus_issue') => {
    await resolveFlag(id, action);
    setFlags((prev) => prev.filter((f) => f.id !== id));
  };

  return (
    <div className="space-y-6 font-body">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink">
          {lang === 'bn' ? 'রিপোর্টকৃত এআই উত্তর কিউ' : 'Flagged AI Answers Queue'}
        </h1>
        <p className="mt-1 text-xs text-granite">
          {lang === 'bn'
            ? 'নাগরিক ও আইনজীবীদের চিহ্নিত ভুল ধারা ও বিভ্রান্তিকর উত্তরের পর্যালোচনা'
            : 'Audit user-flagged statutory errors, halluncinations, or outdated section references'}
        </p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      ) : flags.length === 0 ? (
        <EmptyState title="No Flagged Answers" description="All user-reported answers have been reviewed and resolved." />
      ) : (
        <div className="space-y-4">
          {flags.map((flag) => (
            <div key={flag.id} className="rounded border border-granite bg-white p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-granite-soft pb-2">
                <span className="font-mono text-[10px] text-granite">Reported: {new Date(flag.reportedAt).toLocaleDateString()}</span>
                <span className="font-mono text-[10px] uppercase bg-brick/10 text-brick px-2 py-0.5 rounded font-bold">
                  {flag.status}
                </span>
              </div>

              <div>
                <span className="font-mono text-[10px] text-granite uppercase block">Citizen Question</span>
                <p className="font-bold text-xs text-ink">{flag.questionBn}</p>
              </div>

              <div>
                <span className="font-mono text-[10px] text-clay-deep uppercase block">Reported AI Answer</span>
                <p className="text-xs text-ink-soft bg-bone p-2.5 rounded border border-granite-soft">
                  {flag.answerBn}
                </p>
              </div>

              <div className="rounded bg-brick/5 p-2.5 border border-brick/20 text-xs text-brick">
                <strong>Citizen Reason:</strong> {flag.reason}
              </div>

              <div className="pt-2 border-t border-granite-soft flex items-center justify-end gap-2">
                <Button size="sm" variant="ghost" onClick={() => handleResolve(flag.id, 'dismiss')}>
                  Dismiss
                </Button>
                <Button size="sm" variant="secondary" onClick={() => handleResolve(flag.id, 'corpus_issue')}>
                  Open Corpus Issue
                </Button>
                <Button size="sm" variant="primary" onClick={() => handleResolve(flag.id, 'escalate')}>
                  Escalate to Senior Advocate
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
