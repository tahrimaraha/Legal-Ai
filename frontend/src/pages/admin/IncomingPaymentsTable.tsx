import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import { useLang } from '../../context/LanguageContext';
import { ApiError, listAdminPayments, reviewAdminPayment, type AdminPayment } from '../../lib/api';
import { Button } from '../../components/ui/Button';

const METHOD_NAMES: Record<string, string> = { bkash: 'bKash', nagad: 'Nagad', rocket: 'Rocket' };

/**
 * Citizen payments submitted with a wallet TrxID. The admin checks each one
 * against the wallet's statement and marks it confirmed or rejected.
 */
export function IncomingPaymentsTable({ onChanged }: { onChanged?: () => void } = {}) {
  const { lang, num } = useLang();
  const bn = lang === 'bn';
  const [payments, setPayments] = useState<AdminPayment[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'pending' | 'all'>('pending');

  useEffect(() => {
    listAdminPayments()
      .then(setPayments)
      .catch(() => setError(bn ? 'পেমেন্ট লোড করা যায়নি।' : 'Could not load payments.'));
  }, []);

  const review = async (id: string, action: 'confirm' | 'reject') => {
    setBusyId(id);
    setError('');
    try {
      await reviewAdminPayment(id, action);
      setPayments((prev) =>
        prev?.map((p) => (p.id === id ? { ...p, status: action === 'confirm' ? 'confirmed' : 'rejected' } : p)) ?? prev,
      );
      onChanged?.();
    } catch (err) {
      setError(err instanceof ApiError ? (bn ? err.messageBn : err.message) : bn ? 'আপডেট করা যায়নি।' : 'Update failed.');
    } finally {
      setBusyId(null);
    }
  };

  const pendingCount = payments?.filter((p) => p.status === 'pending').length ?? 0;
  const shown = (payments ?? []).filter((p) => filter === 'all' || p.status === 'pending');

  const statusClass = {
    pending: 'bg-clay-tint text-clay-deep border-clay/30',
    confirmed: 'bg-green-50 text-green-700 border-green-300',
    rejected: 'bg-brick/10 text-brick border-brick/30',
  } as const;
  const statusLabel = {
    pending: bn ? 'যাচাই বাকি' : 'Pending',
    confirmed: bn ? 'নিশ্চিত' : 'Confirmed',
    rejected: bn ? 'বাতিল' : 'Rejected',
  } as const;

  return (
    <div className="bg-white rounded border border-granite shadow-sm">
      <div className="p-5 border-b border-granite-soft flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-lg font-bold text-ink">
            {bn ? 'নাগরিকের পেমেন্ট (TrxID যাচাই)' : 'Citizen Payments (TrxID check)'}
          </h3>
          <p className="text-xs text-granite mt-0.5">
            {bn
              ? 'ওয়ালেট স্টেটমেন্টের সাথে ট্রানজেকশন আইডি ও পরিমাণ মিলিয়ে নিশ্চিত করুন।'
              : 'Match each TrxID and amount against your wallet statement, then confirm or reject.'}
          </p>
        </div>
        <div className="flex gap-1 text-xs">
          {(['pending', 'all'] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`px-2.5 py-1 rounded border ${filter === f ? 'border-clay bg-clay-tint text-clay-deep font-semibold' : 'border-granite-soft text-ink-soft'}`}
            >
              {f === 'pending' ? `${bn ? 'বাকি' : 'Pending'} (${num(pendingCount)})` : bn ? 'সব' : 'All'}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="px-5 pt-3 text-xs text-brick">{error}</p>}

      {payments === null && !error ? (
        <p className="p-5 text-xs text-granite">{bn ? 'লোড হচ্ছে…' : 'Loading…'}</p>
      ) : shown.length === 0 ? (
        <p className="p-5 text-xs text-granite">
          {filter === 'pending' ? (bn ? 'যাচাইয়ের অপেক্ষায় কোনো পেমেন্ট নেই।' : 'No payments waiting for review.') : bn ? 'এখনো কোনো পেমেন্ট নেই।' : 'No payments yet.'}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-bone text-granite uppercase font-mono text-[10px]">
              <tr>
                <th className="text-left p-3">{bn ? 'তারিখ' : 'Date'}</th>
                <th className="text-left p-3">{bn ? 'নাগরিক' : 'Citizen'}</th>
                <th className="text-left p-3">{bn ? 'উদ্দেশ্য' : 'For'}</th>
                <th className="text-left p-3">{bn ? 'পদ্ধতি' : 'Method'}</th>
                <th className="text-left p-3">{bn ? 'প্রেরক নম্বর' : 'Sender No.'}</th>
                <th className="text-left p-3">TrxID</th>
                <th className="text-right p-3">{bn ? 'পরিমাণ' : 'Amount'}</th>
                <th className="text-left p-3">{bn ? 'অবস্থা' : 'Status'}</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-granite-soft">
              {shown.map((p) => (
                <tr key={p.id} className="hover:bg-bone/40">
                  <td className="p-3 font-mono text-granite whitespace-nowrap">{new Date(p.createdAt).toLocaleString()}</td>
                  <td className="p-3 text-ink">{p.payerName}</td>
                  <td className="p-3 text-ink-soft">
                    {p.purpose === 'verification' ? (bn ? 'যাচাই' : 'Verification') : p.purpose === 'consultation' ? (bn ? 'পরামর্শ' : 'Consultation') : bn ? 'ডকুমেন্ট' : 'Document'}
                  </td>
                  <td className="p-3 text-ink">{METHOD_NAMES[p.method] ?? p.method}</td>
                  <td className="p-3 font-mono">{p.payerNumber}</td>
                  <td className="p-3 font-mono font-bold text-ink select-all">{p.trxId}</td>
                  <td className="p-3 text-right font-bold text-ink whitespace-nowrap">৳{num(p.amountBdt)}</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded border text-[10px] font-bold ${statusClass[p.status]}`}>{statusLabel[p.status]}</span>
                  </td>
                  <td className="p-3">
                    {p.status === 'pending' && (
                      <div className="flex gap-1.5 justify-end">
                        <Button size="sm" variant="primary" loading={busyId === p.id} onClick={() => review(p.id, 'confirm')}>
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                          {bn ? 'নিশ্চিত' : 'Confirm'}
                        </Button>
                        <Button size="sm" variant="ghost" disabled={busyId === p.id} onClick={() => review(p.id, 'reject')}>
                          <XCircle className="h-3.5 w-3.5 mr-1" />
                          {bn ? 'বাতিল' : 'Reject'}
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
