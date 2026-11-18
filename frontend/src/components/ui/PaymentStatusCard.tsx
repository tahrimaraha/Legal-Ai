import { useState } from 'react';
import { AlertCircle, CheckCircle2, Clock, Wallet, XCircle } from 'lucide-react';
import { useLang } from '../../context/LanguageContext';
import { ApiError, reviewPayment } from '../../lib/api';
import type { BankAccount, PaymentRecord } from '../../mocks/types';
import { Button } from './Button';

interface Props {
  payment: PaymentRecord | null | undefined;
  kind: 'consultation' | 'verification';
  recordId: string;
  /** The payee (lawyer for consultations, admin for verifications) gets Confirm / Not received buttons. */
  canReview?: boolean;
  /** Called with the updated record after a review. */
  onChange?: (payment: PaymentRecord) => void;
  /** Client-side: offered when the payment was rejected or never made. */
  onPayAgain?: () => void;
}

const fmtTo = (to: string | BankAccount) => (typeof to === 'string' ? to : `${to.bankName} · ${to.accountNumber}`);

/** Shows a manual payment (method, amount, sender, TrxID, status) and lets the payee confirm or reject it. */
export function PaymentStatusCard({ payment, kind, recordId, canReview, onChange, onPayAgain }: Props) {
  const { lang } = useLang();
  const bn = lang === 'bn';
  const [busy, setBusy] = useState<'confirm' | 'reject' | null>(null);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  if (!payment) {
    return (
      <div className="rounded border border-granite-soft bg-bone p-4 text-sm text-ink-soft">
        <p className="flex items-center gap-2 font-semibold text-ink">
          <Wallet className="h-4 w-4 text-clay-deep" />
          {bn ? 'পেমেন্ট' : 'Payment'}
        </p>
        <p className="mt-1">{bn ? 'এখনো কোনো পেমেন্ট জমা দেওয়া হয়নি।' : 'No payment has been submitted yet.'}</p>
        {onPayAgain && (
          <Button size="sm" variant="primary" className="mt-3" onClick={onPayAgain}>
            {bn ? 'এখন পেমেন্ট করুন' : 'Pay now'}
          </Button>
        )}
      </div>
    );
  }

  const review = async (action: 'confirm' | 'reject') => {
    setBusy(action);
    setError('');
    try {
      const rec = await reviewPayment(kind, recordId, action, note);
      if (rec.payment) onChange?.(rec.payment);
    } catch (err) {
      setError(err instanceof ApiError ? (bn ? err.messageBn : err.message) : String(err));
    } finally {
      setBusy(null);
    }
  };

  const status = {
    submitted: { icon: Clock, cls: 'bg-[#fff6e0] text-[#8a6100] border-[#ecd28a]', en: 'Waiting for confirmation', bn: 'নিশ্চিতকরণের অপেক্ষায়' },
    confirmed: { icon: CheckCircle2, cls: 'bg-[#eef5e8] text-[#3f6330] border-[#b9d3a6]', en: 'Confirmed', bn: 'নিশ্চিত হয়েছে' },
    rejected: { icon: XCircle, cls: 'bg-brick/10 text-brick border-brick/30', en: 'Not received', bn: 'পাওয়া যায়নি' },
  }[payment.status];
  const Icon = status.icon;

  return (
    <div className="space-y-3 rounded border border-granite bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 font-semibold text-ink">
          <Wallet className="h-4 w-4 text-clay-deep" />
          {bn ? 'পেমেন্ট' : 'Payment'}
        </p>
        <span className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-xs font-semibold ${status.cls}`}>
          <Icon className="h-3.5 w-3.5" />
          {bn ? status.bn : status.en}
        </span>
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
        <dt className="text-granite">{bn ? 'পরিমাণ' : 'Amount'}</dt>
        <dd className="font-semibold text-ink">৳{payment.amount}</dd>
        <dt className="text-granite">{bn ? 'পদ্ধতি' : 'Method'}</dt>
        <dd className="text-ink">{payment.methodLabel}</dd>
        <dt className="text-granite">{bn ? 'যে একাউন্টে' : 'Paid to'}</dt>
        <dd className="break-all font-mono text-ink">{fmtTo(payment.payTo)}</dd>
        <dt className="text-granite">{bn ? 'যে নম্বর থেকে' : 'Paid from'}</dt>
        <dd className="break-all font-mono text-ink">{payment.senderAccount}</dd>
        <dt className="text-granite">TrxID</dt>
        <dd className="break-all font-mono font-semibold text-ink">{payment.trxId}</dd>
      </dl>
      {payment.status === 'rejected' && payment.reviewNote && (
        <p className="rounded bg-brick/10 p-2 text-xs text-brick">{payment.reviewNote}</p>
      )}
      {error && (
        <p role="alert" className="flex items-center gap-1.5 text-xs text-brick">
          <AlertCircle className="h-3.5 w-3.5" />
          {error}
        </p>
      )}
      {canReview && payment.status === 'submitted' && (
        <div className="space-y-2 border-t border-granite-soft pt-3">
          <p className="text-xs text-granite">
            {bn
              ? `আপনার ${payment.methodLabel} একাউন্টে TrxID ${payment.trxId} এর লেনদেনটি আছে কিনা মিলিয়ে দেখুন।`
              : `Check that TrxID ${payment.trxId} arrived in your ${payment.methodLabel} account.`}
          </p>
          <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={300}
            placeholder={bn ? 'নোট (ঐচ্ছিক, যেমন: টাকা আসেনি)' : 'Note (optional, e.g. money not received)'}
            className="w-full rounded border border-granite px-3 py-2 text-sm focus:border-clay-deep focus:outline-none" />
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="primary" loading={busy === 'confirm'} disabled={!!busy} onClick={() => void review('confirm')}>
              <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
              {bn ? 'টাকা পেয়েছি' : 'Confirm received'}
            </Button>
            <Button size="sm" variant="secondary" loading={busy === 'reject'} disabled={!!busy} onClick={() => void review('reject')}>
              <XCircle className="mr-1 h-3.5 w-3.5" />
              {bn ? 'পাইনি' : 'Not received'}
            </Button>
          </div>
        </div>
      )}
      {onPayAgain && payment.status === 'rejected' && (
        <Button size="sm" variant="primary" onClick={onPayAgain}>
          {bn ? 'আবার পেমেন্টের তথ্য দিন' : 'Submit payment again'}
        </Button>
      )}
    </div>
  );
}
