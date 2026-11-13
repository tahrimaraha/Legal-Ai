import { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, Eye, UserCheck, AlertTriangle } from 'lucide-react';
import { useLang } from '../../context/LanguageContext';
import { listAdminLawyers, approveLawyer, rejectLawyer } from '../../lib/api';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Drawer } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/EmptyState';
import type { LawyerProfile } from '../../mocks/types';
import { LicenseDocumentViewer } from './LicenseDocumentViewer';

export default function AdminLawyerApprovals() {
  const { lang, num } = useLang();
  const [lawyers, setLawyers] = useState<LawyerProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLawyer, setSelectedLawyer] = useState<LawyerProfile | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

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
        <div className="border border-granite rounded bg-white shadow-sm overflow-hidden">
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
              {lawyers.map((lawyer) => (
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
                <LicenseDocumentViewer
                  lawyerId={selectedLawyer.id}
                  fileName={selectedLawyer.licenseDocumentName}
                />
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
