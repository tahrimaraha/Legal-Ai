import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useLang } from '../../context/LanguageContext';
import { useRole } from '../../context/RoleContext';
import { listVerifications } from '../../lib/api';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Button } from '../../components/ui/Button';
import { Skeleton, EmptyState } from '../../components/ui/EmptyState';
import type { VerificationRequest } from '../../mocks/types';

export default function LawyerVerificationQueue() {
  const { lang } = useLang();
  const { user } = useRole();

  const [requests, setRequests] = useState<VerificationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'in_progress' | 'completed'>('all');

  useEffect(() => {
    if (!user) return;
    listVerifications('lawyer', user.id).then((data) => {
      setRequests(data);
      setLoading(false);
    });
  }, [user]);

  const filtered = requests.filter((r) => {
    if (statusFilter === 'in_progress') return r.status === 'claimed';
    if (statusFilter === 'completed') return r.status === 'completed';
    return true;
  });

  return (
    <div className="space-y-6 font-body">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">
            {lang === 'bn' ? 'আইনি এআই উত্তর যাচাই কিউ' : 'Verification Review Queue'}
          </h1>
          <p className="mt-1 text-xs text-granite">
            {lang === 'bn'
              ? 'অ্যাডমিন কর্তৃক আপনার জন্য নির্ধারিত যাচাই অনুরোধসমূহ পর্যালোচনা করুন'
              : 'Cases the admin team has assigned specifically to you for review'}
          </p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-2 border-b border-granite-soft pb-2">
        {(['all', 'in_progress', 'completed'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setStatusFilter(tab)}
            className={`px-3 py-1 text-xs font-mono uppercase tracking-wider rounded transition ${
              statusFilter === tab
                ? 'bg-clay text-white font-bold'
                : 'text-ink-soft hover:bg-bone-deep'
            }`}
          >
            {tab === 'all'
              ? lang === 'bn'
                ? 'সকল অনুরোধ'
                : 'All Requests'
              : tab === 'in_progress'
              ? lang === 'bn'
                ? 'চলমান'
                : 'In Progress'
              : lang === 'bn'
              ? 'সম্পন্ন'
              : 'Completed'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title={lang === 'bn' ? 'কোনো যাচাই অনুরোধ বরাদ্দ করা হয়নি' : 'Nothing Assigned Yet'}
          description={
            lang === 'bn'
              ? 'অ্যাডমিন টিম যাচাই অনুরোধ পর্যালোচনা করে আপনাকে নির্ধারণ করলে তা এখানে দেখা যাবে।'
              : 'The admin team assigns verification requests to lawyers — anything assigned to you will appear here.'
          }
        />
      ) : (
        <div className="divide-y divide-granite border border-granite rounded bg-white shadow-sm overflow-hidden">
          {filtered.map((req) => (
            <div
              key={req.id}
              className="p-5 hover:bg-bone/40 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] text-granite">
                    {new Date(req.createdAt).toLocaleDateString()}
                  </span>
                  <StatusBadge status={req.status} size="sm" />
                  {req.urgency === 'urgent' && (
                    <span className="font-mono text-[10px] uppercase bg-brick/10 text-brick px-1.5 py-0.2 rounded font-bold border border-brick/30">
                      Priority Urgent
                    </span>
                  )}
                </div>

                <h3 className="font-display text-sm font-bold text-ink">
                  "{req.questionExcerptBn}"
                </h3>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {req.citations.map((c) => (
                    <span
                      key={c.id}
                      className="rounded bg-clay-tint px-2 py-0.5 text-[10px] font-mono text-clay-deep border border-clay/30"
                    >
                      {c.labelBn}
                    </span>
                  ))}
                </div>
              </div>

              <div className="shrink-0 flex items-center gap-3">
                {/* Earnings info */}
                <div className="text-right space-y-0.5">
                  <div className="text-[10px] text-granite font-mono uppercase">
                    {lang === 'bn' ? 'আয়' : 'Earnings'}
                  </div>
                  <div className="font-bold text-sm text-clay-deep">
                    ৳{req.urgency === 'urgent' ? '150' : '100'}
                  </div>
                </div>
                
                <Link to={`/lawyer/verifications/${req.id}`}>
                  <Button size="sm" variant={req.status === 'completed' ? 'secondary' : 'primary'}>
                    <span>
                      {req.status === 'completed'
                        ? lang === 'bn'
                          ? 'রায় দেখুন'
                          : 'View Verdict'
                        : lang === 'bn'
                        ? 'রিভিউ ওয়ার্কস্পেস'
                        : 'Review Workspace'}
                    </span>
                    <ArrowRight className="ml-1 h-3.5 w-3.5" />
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
