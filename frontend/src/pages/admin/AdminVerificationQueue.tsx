import { useState, useEffect } from 'react';
import { ShieldCheck, UserCheck, XCircle, ArrowRight } from 'lucide-react';
import { useLang } from '../../context/LanguageContext';
import { listVerifications, listLawyers, assignVerificationRequest, declineVerificationRequest } from '../../lib/api';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Button } from '../../components/ui/Button';
import { Skeleton, EmptyState } from '../../components/ui/EmptyState';
import type { VerificationRequest, LawyerProfile } from '../../mocks/types';

type Tab = 'pending' | 'claimed' | 'completed' | 'declined';

export default function AdminVerificationQueue() {
  const { lang, num } = useLang();
  const [requests, setRequests] = useState<VerificationRequest[]>([]);
  const [lawyers, setLawyers] = useState<LawyerProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('pending');
  const [selectedLawyer, setSelectedLawyer] = useState<Record<string, string>>({});
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([listVerifications('admin'), listLawyers({ verifiedOnly: true })]).then(([reqs, lws]) => {
      setRequests(reqs);
      setLawyers(lws);
      setLoading(false);
    });
  }, []);

  const filtered = requests.filter((r) => r.status === tab);
  const pendingCount = requests.filter((r) => r.status === 'pending').length;

  const handleAssign = async (req: VerificationRequest) => {
    const lawyerId = selectedLawyer[req.id];
    const lawyer = lawyers.find((l) => l.id === lawyerId);
    if (!lawyer) return;
    setActionLoading(req.id);
    try {
      const updated = await assignVerificationRequest(req.id, lawyer.userId, lawyer.fullName);
      setRequests((prev) => prev.map((r) => (r.id === req.id ? updated : r)));
    } finally {
      setActionLoading(null);
    }
  };

  const handleDecline = async (req: VerificationRequest) => {
    const reason = prompt('Reason for declining this verification request:');
    if (!reason) return;
    setActionLoading(req.id);
    try {
      const updated = await declineVerificationRequest(req.id, reason);
      setRequests((prev) => prev.map((r) => (r.id === req.id ? updated : r)));
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-6 font-body">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink">
          {lang === 'bn' ? 'যাচাই অনুরোধ ও আইনজীবী নির্ধারণ' : 'Verification Requests & Lawyer Assignment'}
        </h1>
        <p className="mt-1 text-xs text-granite">
          {lang === 'bn'
            ? 'নাগরিকদের পেইড যাচাই অনুরোধ পর্যালোচনা করে একজন যাচাইকৃত আইনজীবী নির্ধারণ করুন'
            : 'Every paid verification request lands here first — review it, then assign a verified advocate to handle it'}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-granite-soft pb-2">
        {(['pending', 'claimed', 'completed', 'declined'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-1 text-xs font-mono uppercase tracking-wider rounded transition flex items-center gap-1.5 ${
              tab === t ? 'bg-clay text-white font-bold' : 'text-ink-soft hover:bg-bone-deep'
            }`}
          >
            {t === 'pending' && (lang === 'bn' ? 'নির্ধারণের অপেক্ষায়' : 'Awaiting Assignment')}
            {t === 'claimed' && (lang === 'bn' ? 'নির্ধারিত' : 'Assigned')}
            {t === 'completed' && (lang === 'bn' ? 'সম্পন্ন' : 'Completed')}
            {t === 'declined' && (lang === 'bn' ? 'বাতিল' : 'Declined')}
            {t === 'pending' && pendingCount > 0 && (
              <span className="bg-brick text-white rounded-full px-1.5 text-[10px]">{pendingCount}</span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title={lang === 'bn' ? 'কোনো অনুরোধ নেই' : 'Nothing Here'}
          description={
            tab === 'pending'
              ? lang === 'bn'
                ? 'বর্তমানে নির্ধারণের জন্য অপেক্ষমাণ কোনো যাচাই অনুরোধ নেই।'
                : 'No verification requests are currently waiting for assignment.'
              : lang === 'bn'
              ? 'এই তালিকায় কিছু নেই।'
              : 'No requests in this category.'
          }
        />
      ) : (
        <div className="space-y-4">
          {filtered.map((req) => (
            <div key={req.id} className="rounded border border-granite bg-white p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-granite-soft pb-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] text-granite">
                    {new Date(req.createdAt).toLocaleString()}
                  </span>
                  <StatusBadge status={req.status} size="sm" />
                  {req.urgency === 'urgent' && (
                    <span className="font-mono text-[10px] uppercase bg-brick/10 text-brick px-1.5 py-0.5 rounded font-bold border border-brick/30">
                      Urgent
                    </span>
                  )}
                </div>
                <span className="font-mono text-xs font-bold text-clay-deep">৳{num(req.feeBdt)} paid</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <span className="font-mono text-[10px] text-granite uppercase block">Citizen</span>
                  <p className="text-xs font-semibold text-ink">{req.citizenName}</p>
                </div>
                <div>
                  <span className="font-mono text-[10px] text-granite uppercase block">
                    {req.status === 'pending' ? 'Awaiting' : req.status === 'declined' ? 'Declined' : 'Assigned Advocate'}
                  </span>
                  <p className="text-xs font-semibold text-ink flex items-center gap-1">
                    {req.claimedByLawyerName ? (
                      <>
                        <UserCheck className="h-3 w-3 text-clay-deep" />
                        {req.claimedByLawyerName}
                      </>
                    ) : (
                      <span className="text-granite italic">—</span>
                    )}
                  </p>
                </div>
              </div>

              <div>
                <span className="font-mono text-[10px] text-clay-deep uppercase block">Citizen's Question</span>
                <p className="text-xs text-ink-soft bg-bone p-2.5 rounded border border-granite-soft">
                  "{req.questionExcerptBn}"
                </p>
              </div>

              {req.status === 'declined' && req.declineReason && (
                <div className="rounded bg-brick/5 p-2.5 border border-brick/20 text-xs text-brick">
                  <strong>Decline reason:</strong> {req.declineReason}
                </div>
              )}

              {req.status === 'completed' && req.verdict && (
                <div className="rounded bg-clay-tint/40 p-2.5 border border-clay/30 text-xs">
                  <div className="flex items-center gap-2 mb-1">
                    <ShieldCheck className="h-3.5 w-3.5 text-clay-deep" />
                    <StatusBadge status={req.verdict.verdict} size="sm" />
                  </div>
                  <p className="text-ink-soft">{req.verdict.noteToCitizenBn}</p>
                </div>
              )}

              {req.status === 'pending' && (
                <div className="pt-2 border-t border-granite-soft flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <select
                    value={selectedLawyer[req.id] || ''}
                    onChange={(e) => setSelectedLawyer((prev) => ({ ...prev, [req.id]: e.target.value }))}
                    className="flex-1 rounded border border-granite-soft bg-white p-1.5 text-xs text-ink focus:border-clay focus:outline-none"
                  >
                    <option value="">{lang === 'bn' ? 'আইনজীবী নির্বাচন করুন...' : 'Select a verified advocate...'}</option>
                    {lawyers.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.fullName} — {l.practiceAreas[0]} ({l.district})
                      </option>
                    ))}
                  </select>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDecline(req)}
                      loading={actionLoading === req.id}
                      className="text-brick hover:bg-brick/10"
                    >
                      <XCircle className="mr-1 h-3.5 w-3.5" />
                      <span>{lang === 'bn' ? 'বাতিল' : 'Decline'}</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => handleAssign(req)}
                      loading={actionLoading === req.id}
                      disabled={!selectedLawyer[req.id]}
                    >
                      <span>{lang === 'bn' ? 'নির্ধারণ করুন' : 'Assign'}</span>
                      <ArrowRight className="ml-1 h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
