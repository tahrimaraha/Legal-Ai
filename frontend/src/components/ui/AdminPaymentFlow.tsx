import { useEffect, useState } from 'react';
import { AlertCircle, Bell, Building2, CheckCircle2, Loader2, Smartphone } from 'lucide-react';
import { Button } from './Button';
import { CopyButton } from './PaymentProcess';
import { useLang } from '../../context/LanguageContext';
import { ApiError, getLawyerPaymentAccounts, remindLawyerPaymentDetails, type PayeeAccounts, type PayoutDetails } from '../../lib/api';
import type { BankAccount, PaymentMethod } from '../../mocks/types';

interface AdminPaymentFlowProps {
  paymentType: 'verification' | 'consultation';
  recordId: string;
  lawyerId?: string;
  recipient: string;
  amount: number;
  details: string;
  /** Saves the payout (method, account paid to, TrxID). Throw to show an error. */
  onPaymentComplete: (payout: PayoutDetails) => Promise<void>;
  onCancel: () => void;
}

const METHOD: Record<PaymentMethod, { name: string; color: string }> = {
  bkash: { name: 'bKash', color: 'bg-[#e2136e]' },
  nagad: { name: 'Nagad', color: 'bg-[#f6921e]' },
  rocket: { name: 'Rocket', color: 'bg-[#8c3494]' },
  bank: { name: 'Bank transfer', color: 'bg-[#2f5d8a]' },
};

/** Admin pays a lawyer's share: shows the lawyer's own receiving accounts, then records the TrxID. */
export function AdminPaymentFlow({ paymentType, recordId, lawyerId, recipient, amount, details, onPaymentComplete, onCancel }: AdminPaymentFlowProps) {
  const { lang } = useLang();
  const bn = lang === 'bn';
  const [payee, setPayee] = useState<PayeeAccounts | null>(null);
  const [loadError, setLoadError] = useState('');
  const [method, setMethod] = useState<PaymentMethod | null>(null);
  const [trxId, setTrxId] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [reminded, setReminded] = useState<'idle' | 'sending' | 'sent'>('idle');

  useEffect(() => {
    if (!lawyerId) {
      setPayee({ payeeName: recipient, accounts: {}, methods: [] });
      return;
    }
    getLawyerPaymentAccounts(lawyerId)
      .then((p) => {
        setPayee(p);
        if (p.methods.length === 1) setMethod(p.methods[0]);
      })
      .catch(() => setLoadError(bn ? 'আইনজীবীর পেমেন্ট তথ্য লোড করা যায়নি।' : "Could not load the lawyer's payment details."));
  }, [lawyerId, recipient, bn]);

  const payTo = (m: PaymentMethod): string | BankAccount | undefined => payee?.accounts[m] as string | BankAccount | undefined;
  const payToText = (m: PaymentMethod) => {
    const v = payTo(m);
    return !v ? '' : typeof v === 'string' ? v : `${v.bankName} · ${v.accountName} · ${v.accountNumber}`;
  };

  const remind = async () => {
    setReminded('sending');
    try {
      await remindLawyerPaymentDetails(paymentType, recordId);
      setReminded('sent');
    } catch (err) {
      setReminded('idle');
      setError(err instanceof ApiError ? (bn ? err.messageBn : err.message) : String(err));
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!method || saving) return;
    if (trxId.trim().length < 4) {
      setError(bn ? 'লেনদেন আইডি (TrxID) লিখুন।' : 'Enter the transaction ID (TrxID) of your transfer.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onPaymentComplete({ method, payTo: payToText(method), trxId: trxId.trim(), note: note.trim() || undefined });
    } catch (err) {
      setError(err instanceof ApiError ? (bn ? err.messageBn : err.message) : String(err));
      setSaving(false);
    }
  };

  const summary = (
    <div className="rounded border border-granite-soft bg-bone p-3 text-sm">
      <div className="flex items-center justify-between gap-3">
        <span className="text-granite">{bn ? 'প্রাপক' : 'Pay to'}</span>
        <span className="font-semibold text-ink">{payee?.payeeName || recipient}</span>
      </div>
      <div className="mt-1 flex items-center justify-between gap-3">
        <span className="text-granite">{bn ? 'পরিমাণ' : 'Amount'}</span>
        <span className="font-display text-xl font-bold text-clay-deep">৳{amount}</span>
      </div>
      <p className="mt-1 truncate text-xs text-granite">{details}</p>
    </div>
  );

  if (loadError) {
    return (
      <div className="space-y-4">
        {summary}
        <p role="alert" className="flex items-center gap-2 text-sm text-brick"><AlertCircle className="h-4 w-4" />{loadError}</p>
        <Button variant="secondary" onClick={onCancel}>{bn ? 'বন্ধ করুন' : 'Close'}</Button>
      </div>
    );
  }

  if (!payee) {
    return (
      <p className="flex items-center gap-2 py-6 text-sm text-granite">
        <Loader2 className="h-4 w-4 animate-spin" />
        {bn ? 'আইনজীবীর পেমেন্ট তথ্য লোড হচ্ছে…' : "Loading the lawyer's payment details…"}
      </p>
    );
  }

  if (payee.methods.length === 0) {
    return (
      <div className="space-y-4">
        {summary}
        <div className="rounded border border-[#ecd28a] bg-[#fff6e0] p-3 text-sm text-[#8a6100]">
          <p className="flex items-center gap-2 font-semibold"><AlertCircle className="h-4 w-4" />{bn ? 'পেমেন্ট তথ্য নেই' : 'No payment details yet'}</p>
          <p className="mt-1 text-xs">
            {bn
              ? 'এই আইনজীবী এখনো বিকাশ / নগদ / রকেট / ব্যাংক একাউন্ট যোগ করেননি। তাঁকে মনে করিয়ে দিন — তিনি প্রোফাইল এডিটরে যোগ করার পর এখানে দেখা যাবে।'
              : "This lawyer hasn't added a bKash / Nagad / Rocket / bank account yet. Send a reminder — once they add one in their Profile Editor it will appear here."}
          </p>
        </div>
        {error && <p role="alert" className="text-xs text-brick">{error}</p>}
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" onClick={() => void remind()} loading={reminded === 'sending'} disabled={reminded !== 'idle' || !lawyerId}>
            {reminded === 'sent' ? <CheckCircle2 className="mr-1.5 h-4 w-4" /> : <Bell className="mr-1.5 h-4 w-4" />}
            {reminded === 'sent' ? (bn ? 'মনে করিয়ে দেওয়া হয়েছে' : 'Reminder sent') : bn ? 'আইনজীবীকে মনে করিয়ে দিন' : 'Remind lawyer'}
          </Button>
          <Button variant="secondary" onClick={onCancel}>{bn ? 'বন্ধ করুন' : 'Close'}</Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {summary}

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase text-granite">{bn ? '১. পদ্ধতি নির্বাচন করুন' : '1. Choose how to pay'}</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {payee.methods.map((m) => (
            <button key={m} type="button" onClick={() => setMethod(m)}
              className={`flex items-center gap-2 rounded border p-2 text-left text-sm font-semibold transition ${method === m ? 'border-clay-deep bg-clay-tint' : 'border-granite-soft hover:bg-bone'}`}>
              <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded text-white ${METHOD[m].color}`}>
                {m === 'bank' ? <Building2 className="h-4 w-4" /> : <Smartphone className="h-4 w-4" />}
              </span>
              <span className="truncate">{METHOD[m].name}</span>
            </button>
          ))}
        </div>
      </div>

      {method && (
        <>
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase text-granite">
              {bn ? `২. ৳${amount} পাঠান` : `2. Send ৳${amount}`}
            </p>
            {method === 'bank' ? (
              (() => {
                const b = payTo('bank') as BankAccount;
                const rows: [string, string][] = [
                  [bn ? 'ব্যাংক' : 'Bank', b.bankName],
                  [bn ? 'একাউন্টের নাম' : 'Account name', b.accountName],
                  [bn ? 'একাউন্ট নম্বর' : 'Account number', b.accountNumber],
                  ...(b.branch ? [[bn ? 'শাখা' : 'Branch', b.branch] as [string, string]] : []),
                  ...(b.routingNumber ? [[bn ? 'রাউটিং' : 'Routing', b.routingNumber] as [string, string]] : []),
                ];
                return (
                  <dl className="space-y-1.5 rounded border border-granite p-3 text-sm">
                    {rows.map(([k, v]) => (
                      <div key={k} className="flex items-center justify-between gap-2">
                        <dt className="text-granite">{k}</dt>
                        <dd className="flex min-w-0 items-center gap-2 font-mono text-ink"><span className="break-all">{v}</span>
                          {k !== (bn ? 'ব্যাংক' : 'Bank') && <CopyButton value={v} label={`Copy ${k}`} />}</dd>
                      </div>
                    ))}
                  </dl>
                );
              })()
            ) : (
              <div className="flex items-center justify-between gap-2 rounded border border-granite p-3">
                <div className="min-w-0">
                  <p className="text-xs text-granite">{METHOD[method].name} · {bn ? 'সেন্ড মানি' : 'Send Money'} · {payee.payeeName}</p>
                  <p className="min-w-0 break-all font-mono text-lg font-bold text-ink sm:text-xl">{payTo(method) as string}</p>
                </div>
                <CopyButton value={payTo(method) as string} label={`Copy ${METHOD[method].name} number`} />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase text-granite">{bn ? '৩. লেনদেন রেকর্ড করুন' : '3. Record the transfer'}</p>
            <input value={trxId} onChange={(e) => setTrxId(e.target.value.replace(/\s/g, '').toUpperCase())} maxLength={40}
              placeholder={bn ? 'লেনদেন আইডি (TrxID)' : 'Transaction ID (TrxID)'}
              className="w-full rounded border border-granite px-3 py-2 font-mono text-sm focus:border-clay-deep focus:outline-none" />
            <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={300}
              placeholder={bn ? 'নোট (ঐচ্ছিক)' : 'Note (optional)'}
              className="w-full rounded border border-granite px-3 py-2 text-sm focus:border-clay-deep focus:outline-none" />
          </div>
        </>
      )}

      {error && <p role="alert" className="flex items-center gap-1.5 text-xs text-brick"><AlertCircle className="h-3.5 w-3.5" />{error}</p>}

      <div className="flex flex-wrap justify-end gap-2 border-t border-granite-soft pt-3">
        <Button type="button" variant="secondary" onClick={onCancel}>{bn ? 'বাতিল' : 'Cancel'}</Button>
        <Button type="submit" variant="primary" loading={saving} disabled={!method}>
          <CheckCircle2 className="mr-1.5 h-4 w-4" />
          {bn ? 'পেমেন্ট পাঠানো হয়েছে' : "I've sent the money"}
        </Button>
      </div>
    </form>
  );
}
