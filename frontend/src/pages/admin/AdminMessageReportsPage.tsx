import { useState, useEffect } from 'react';
import { Flag, ShieldAlert } from 'lucide-react';
import { useLang } from '../../context/LanguageContext';
import { listMessageReports, resolveMessageReport } from '../../lib/api';
import { Button } from '../../components/ui/Button';
import { Skeleton, EmptyState } from '../../components/ui/EmptyState';
import type { MessageReport } from '../../mocks/types';

const REASON_LABELS: Record<string, string> = {
  harassment: 'Harassment or abusive language',
  inappropriate: 'Inappropriate content',
  spam: 'Spam or scam',
  threats: 'Threats or intimidation',
  other: 'Other',
};

export default function AdminMessageReportsPage() {
  const { lang } = useLang();
  const [reports, setReports] = useState<MessageReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listMessageReports().then((data) => {
      setReports(data);
      setLoading(false);
    });
  }, []);

  const handleResolve = async (id: string, action: 'dismiss' | 'warn' | 'escalate') => {
    await resolveMessageReport(id, action);
    setReports((prev) => prev.filter((r) => r.id !== id));
  };

  return (
    <div className="space-y-6 font-body">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink">
          {lang === 'bn' ? 'রিপোর্টকৃত বার্তা কিউ' : 'Reported Messages Queue'}
        </h1>
        <p className="mt-1 text-xs text-granite">
          {lang === 'bn'
            ? 'নাগরিক ও আইনজীবীদের মধ্যে আপত্তিকর কথোপকথন পর্যালোচনা'
            : 'Review conversations flagged by citizens or lawyers as offensive, threatening, or abusive'}
        </p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      ) : reports.length === 0 ? (
        <EmptyState title="No Reported Messages" description="All reported conversations have been reviewed and resolved." />
      ) : (
        <div className="space-y-4">
          {reports.map((report) => (
            <div key={report.id} className="rounded border border-granite bg-white p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-granite-soft pb-2">
                <span className="font-mono text-[10px] text-granite">
                  Reported: {new Date(report.createdAt).toLocaleString()}
                </span>
                <span className="font-mono text-[10px] uppercase bg-brick/10 text-brick px-2 py-0.5 rounded font-bold">
                  {report.status}
                </span>
              </div>

              <div className="flex items-center gap-2 text-xs text-ink-soft">
                <ShieldAlert className="h-3.5 w-3.5 text-clay-deep shrink-0" />
                <span>
                  <strong className="text-ink">{report.reportedByName}</strong> ({report.reportedByRole}) reported{' '}
                  <strong className="text-ink">{report.reportedAgainstName}</strong>
                </span>
              </div>

              <div>
                <span className="font-mono text-[10px] text-clay-deep uppercase block">Reported Message</span>
                <p className="text-xs text-ink-soft bg-bone p-2.5 rounded border border-granite-soft italic">
                  "{report.messageSnapshot}"
                </p>
              </div>

              <div className="rounded bg-brick/5 p-2.5 border border-brick/20 text-xs text-brick">
                <strong>Reason:</strong> {REASON_LABELS[report.reasonCategory] || report.reasonCategory}
                {report.reasonDetails && <p className="mt-1 text-ink-soft normal-case font-normal text-brick/80">{report.reasonDetails}</p>}
              </div>

              <div className="pt-2 border-t border-granite-soft flex items-center justify-end gap-2">
                <Button size="sm" variant="ghost" onClick={() => handleResolve(report.id, 'dismiss')}>
                  Dismiss
                </Button>
                <Button size="sm" variant="secondary" onClick={() => handleResolve(report.id, 'warn')}>
                  Warn User
                </Button>
                <Button size="sm" variant="danger" onClick={() => handleResolve(report.id, 'escalate')}>
                  <Flag className="mr-1.5 h-3.5 w-3.5" />
                  <span>Escalate</span>
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
