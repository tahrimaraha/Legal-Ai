import { useState, useEffect } from 'react';
import { ShieldAlert, CheckCircle2, XCircle, Eye, Award, FileText, Search, UserCheck, AlertTriangle } from 'lucide-react';
import { useLang } from '../../context/LanguageContext';
import { listAdminLawyers, approveLawyer, rejectLawyer } from '../../lib/api';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Drawer } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Skeleton, EmptyState } from '../../components/ui/EmptyState';
import type { LawyerProfile } from '../../mocks/types';

export default function AdminLawyerApprovals() {
  const { lang, num } = useLang();
  const [lawyers, setLawyers] = useState<LawyerProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLawyer, setSelectedLawyer] = useState<LawyerProfile | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | LawyerProfile['verificationStatus']>('all');

  const filters = [
    { key: 'all', labelEn: 'All', labelBn: 'সকল' },
    { key: 'verified', labelEn: 'Verified Lawyers', labelBn: 'যাচাইকৃত আইনজীবী' },
    { key: 'pending', labelEn: 'Pending Verification', labelBn: 'যাচাই অপেক্ষমাণ' },
    { key: 'rejected', labelEn: 'Rejected', labelBn: 'প্রত্যাখ্যাত' },
  ] as const;
  const countFor = (key: (typeof filters)[number]['key']) =>
    key === 'all' ? lawyers.length : lawyers.filter((l) => l.verificationStatus === key).length;
  const visibleLawyers = statusFilter === 'all' ? lawyers : lawyers.filter((l) => l.verificationStatus === statusFilter);

  useEffect(() => {
    listAdminLawyers().then((data) => {
      setLawyers(data);
      setLoading(false);
    });
  }, []);

  const handleApprove = async (id: string) => {
    setActionLoading(true);
    try {
      const updated = await approveLawyer(id);
      setLawyers((prev) => prev.map((l) => (l.id === id ? updated : l)));
      setSelectedLawyer(null);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (id: string) => {
    const reason = prompt('Reason for credential rejection:');
    if (reason) {
      setActionLoading(true);
      try {
        const updated = await rejectLawyer(id, reason);
        setLawyers((prev) => prev.map((l) => (l.id === id ? updated : l)));
        setSelectedLawyer(null);
      } finally {
        setActionLoading(false);
      }
    }
  };

  return (
    <div className="space-y-6 font-body">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink">
          {lang === 'bn' ? 'আইনজীবী সনদ যাচাই ও অনুমোদন' : 'Lawyer Credential Approvals'}
        </h1>
        <p className="mt-1 text-xs text-granite">
          {lang === 'bn'
            ? 'বাংলাদেশ বার কাউন্সিলের সনদ ও কোর্ট রোল অনুযায়ী আবেদনকারী আইনজীবীদের নিরীক্ষা'
            : 'Audit Bar Council enrolment numbers, court admissions, and verify advocate profiles'}
        </p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : (
        <>
        <div role="tablist" aria-label={lang === 'bn' ? 'অবস্থা অনুযায়ী ফিল্টার' : 'Filter by status'} className="flex flex-wrap gap-2">
          {filters.map((f) => {
            const active = statusFilter === f.key;
            return (
              <button
                key={f.key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setStatusFilter(f.key)}
                className={`flex items-center gap-2 rounded px-3 py-1.5 text-xs font-semibold transition border ${
                  active
                    ? 'bg-clay text-white border-clay'
                    : 'bg-white text-ink-soft border-granite-soft hover:bg-clay-tint'
                }`}
              >
                <span>{lang === 'bn' ? f.labelBn : f.labelEn}</span>
                <span
                  className={`font-mono text-[10px] rounded px-1.5 py-0.5 ${
                    active ? 'bg-white/20 text-white' : 'bg-bone-deep text-clay-deep'
                  }`}
                >
                  {num(countFor(f.key))}
                </span>
              </button>
            );
          })}
        </div>

        {visibleLawyers.length === 0 ? (
          <div className="rounded border border-granite bg-white p-8 text-center text-xs text-granite">
            {lang === 'bn' ? 'এই তালিকায় কোনো আইনজীবী নেই' : 'No lawyers in this list'}
          </div>
        ) : (
        <div className="border border-granite rounded bg-white shadow-sm overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-bone-deep border-b border-granite font-mono uppercase text-clay-deep">
              <tr>
                <th className="p-3">Advocate Name</th>
                <th className="p-3">Bar Enrolment No</th>
                <th className="p-3">District</th>
                <th className="p-3">Enrolment Year</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-granite-soft">
              {visibleLawyers.map((lawyer) => (
                <tr key={lawyer.id} className="hover:bg-bone/40 transition">
                  <td className="p-3 font-semibold text-ink flex items-center gap-2">
                    <div className="h-7 w-7 rounded bg-clay-tint border border-clay flex items-center justify-center">
                      <UserCheck className="h-4 w-4 text-clay-deep" />
                    </div>
                    <span>{lawyer.fullName}</span>
                  </td>
                  <td className="p-3 font-mono font-bold text-clay-deep">{lawyer.barEnrolmentNo}</td>
                  <td className="p-3 text-ink-soft">{lawyer.district}</td>
                  <td className="p-3 font-mono">{lawyer.enrolmentYear}</td>
                  <td className="p-3"><StatusBadge status={lawyer.verificationStatus} size="sm" /></td>
                  <td className="p-3 text-right">
                    <Button size="sm" variant="secondary" onClick={() => setSelectedLawyer(lawyer)}>
                      <Eye className="mr-1 h-3 w-3" />
                      <span>Audit</span>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}
        </>
      )}

      {/* Detail Audit Drawer */}
      <Drawer
        open={!!selectedLawyer}
        onClose={() => setSelectedLawyer(null)}
        title="Advocate Bar Credential Audit"
      >
        {selectedLawyer && (
          <div className="space-y-6 text-xs font-body">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded bg-clay-tint border-2 border-clay flex items-center justify-center">
                <UserCheck className="h-8 w-8 text-clay-deep" />
              </div>
              <div>
                <h3 className="font-display text-base font-bold text-ink">{selectedLawyer.fullName}</h3>
                <p className="text-granite font-medium">{selectedLawyer.title}</p>
                <StatusBadge status={selectedLawyer.verificationStatus} className="mt-1" />
              </div>
            </div>

            <div className="rounded border border-granite-soft bg-bone p-4 space-y-2">
              <span className="font-mono text-[10px] uppercase text-clay-deep font-semibold block">
                Bar Council Registration
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-granite block text-[10px]">Enrolment Number</span>
                  <span className="font-mono font-bold text-ink">{selectedLawyer.barEnrolmentNo}</span>
                </div>
                <div>
                  <span className="text-granite block text-[10px]">Year Admitted</span>
                  <span className="font-mono font-bold text-ink">{selectedLawyer.enrolmentYear}</span>
                </div>
                <div>
                  <span className="text-granite block text-[10px]">District Bar</span>
                  <span className="font-bold text-ink">{selectedLawyer.district}</span>
                </div>
                <div>
                  <span className="text-granite block text-[10px]">Starting Fee</span>
                  <span className="font-mono font-bold text-ink">৳{num(selectedLawyer.startingFeeBdt)}</span>
                </div>
              </div>
            </div>

            {/* Submitted License Document */}
            <div className="rounded border border-granite-soft bg-bone p-4 space-y-2">
              <span className="font-mono text-[10px] uppercase text-clay-deep font-semibold block">
                Submitted License / ID Document
              </span>
              {selectedLawyer.licenseDocumentUrl ? (
                selectedLawyer.licenseDocumentUrl.startsWith('data:image') ? (
                  <img
                    src={selectedLawyer.licenseDocumentUrl}
                    alt="Submitted license document"
                    className="w-full max-h-72 object-contain rounded border border-granite-soft bg-white"
                  />
                ) : (
                  <a
                    href={selectedLawyer.licenseDocumentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-clay-deep hover:underline text-xs font-medium"
                  >
                    <FileText className="h-4 w-4" />
                    <span>{selectedLawyer.licenseDocumentName || 'View document'}</span>
                  </a>
                )
              ) : (
                <p className="flex items-center gap-1.5 text-xs text-brick">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  <span>No document was submitted with this application.</span>
                </p>
              )}
            </div>

            {/* Practice Areas */}
            <div className="space-y-1.5">
              <span className="font-mono text-[10px] text-granite uppercase block">Practice Areas</span>
              <div className="flex flex-wrap gap-1">
                {selectedLawyer.practiceAreas.map((a) => (
                  <span key={a} className="rounded bg-clay-tint px-2 py-0.5 text-[11px] text-clay-deep">
                    {a}
                  </span>
                ))}
              </div>
            </div>

            {/* Bio */}
            <div className="space-y-1">
              <span className="font-mono text-[10px] text-granite uppercase block">Submitted Bio</span>
              <p className="text-xs text-ink-soft leading-relaxed bg-bone p-3 rounded border border-granite-soft">
                {selectedLawyer.bioEn}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="pt-4 border-t border-granite-soft flex flex-col gap-2">
              {selectedLawyer.verificationStatus !== 'verified' && (
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => handleApprove(selectedLawyer.id)}
                  loading={actionLoading}
                  className="w-full justify-center"
                >
                  <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                  <span>Approve & Verify Advocate</span>
                </Button>
              )}

              {selectedLawyer.verificationStatus !== 'rejected' && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleReject(selectedLawyer.id)}
                  loading={actionLoading}
                  className="w-full justify-center text-brick hover:bg-brick/10"
                >
                  <XCircle className="mr-1.5 h-3.5 w-3.5" />
                  <span>Reject Credentials</span>
                </Button>
              )}
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
