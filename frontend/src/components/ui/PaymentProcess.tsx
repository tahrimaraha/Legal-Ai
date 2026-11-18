import { useState } from 'react';
import { AlertCircle, ArrowLeft, Building2, Check, CheckCircle2, Copy, Loader2, Smartphone } from 'lucide-react';
import { Button } from './Button';
import { useLang } from '../../context/LanguageContext';
import { ApiError, type PayeeAccounts, type PaymentSubmission } from '../../lib/api';
import type { BankAccount, PaymentMethod } from '../../mocks/types';

interface PaymentProcessProps {
  amount: number;
  /** What is being paid for — shown in the header. */
  purpose: 'consultation' | 'verification';
  urgency?: 'normal' | 'urgent';
  /** Where the money goes: the lawyer (consultations) or the platform (verifications). null while loading. */
  payee: PayeeAccounts | null;
  /** Sends the request + payment to the server. `null` = the payee has no accounts set up yet. Throw to show an error. */
  onSubmit: (payment: PaymentSubmission | null) => Promise<void>;
  onCancel: () => void;
}

const METHOD: Record<PaymentMethod, { name: string; color: string; wallet: boolean }> = {
  bkash: { name: 'bKash', color: 'bg-[#e2136e]', wallet: true },
  nagad: { name: 'Nagad', color: 'bg-[#f6921e]', wallet: true },
  rocket: { name: 'Rocket', color: 'bg-[#8c3494]', wallet: true },
  bank: { name: 'Bank transfer', color: 'bg-[#2f5d8a]', wallet: false },
};

type Step = 'method' | 'pay' | 'done';

export function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1500);
        } catch {
          /* clipboard blocked — the number is still visible */
        }
      }}
      className="inline-flex shrink-0 items-center gap-1 rounded border border-granite px-2 py-1 text-xs font-semibold text-clay-deep hover:bg-clay-tint"
      aria-label={label}
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

/** Manual payment: shows the payee's bKash / Nagad / Rocket / bank account, then collects the sender number + TrxID. */
export function PaymentProcess({ amount, purpose, urgency, payee, onSubmit, onCancel }: PaymentProcessProps) {
  const { lang } = useLang();
  const bn = lang === 'bn';
  const methods = payee?.methods ?? [];
  const [step, setStep] = useState<Step>('method');
  const [method, setMethod] = useState<PaymentMethod | null>(null);
  const [sender, setSender] = useState('');
  const [trxId, setTrxId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const chosen = method ?? methods[0] ?? null;
  const wallet = chosen ? METHOD[chosen].wallet : true;
  const payTo = chosen && payee ? payee.accounts[chosen] : undefined;
  const senderOk = wallet ? /^01[3-9]\d{8}\d?$/.test(sender.replace(/\D/g, '').replace(/^88/, '')) : sender.trim().length >= 3;
  const trxOk = /^[A-Za-z0-9-]{6,30}$/.test(trxId.trim());
  const taka = (n: number) => (bn ? `৳${String(n).replace(/\d/g, (d) => '০১২৩৪৫৬৭৮৯'[+d])}` : `৳${n}`);

  const submit = async (payment: PaymentSubmission | null) => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await onSubmit(payment);
      setStep('done');
    } catch (err) {
      setError(err instanceof ApiError ? (bn ? err.messageBn : err.message) : bn ? 'জমা দেওয়া যায়নি। আবার চেষ্টা করুন।' : 'Could not submit. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const header = (
    <div className="bg-clay p-4 text-center text-white">
      <h3 className="font-display text-lg font-bold">
        {purpose === 'consultation' ? (bn ? 'পরামর্শ ফি' : 'Consultation Fee') : bn ? 'যাচাই ফি' : 'Verification Fee'}
      </h3>
      <div className="mt-1 text-clay-tint">
        <span className="text-2xl font-bold">{taka(amount)}</span>
        {urgency && (
          <span className="ml-2 text-sm opacity-90">
            ({urgency === 'urgent' ? (bn ? 'জরুরি' : 'Urgent') : bn ? 'সাধারণ' : 'Standard'})
          </span>
        )}
      </div>
      {payee && (
        <p className="mt-1 text-xs text-clay-tint/90">
          {bn ? 'প্রাপক: ' : 'Paid to: '}
          <strong className="text-white">{payee.payeeName}</strong>
        </p>
      )}
    </div>
  );

  const errorBox = error && (
    <div role="alert" className="flex items-start gap-2 rounded border border-brick/30 bg-brick/10 p-3 text-sm text-brick">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{error}</span>
    </div>
  );

  return (
    <div className="mx-auto max-w-md overflow-hidden rounded-lg bg-white shadow-lg">
      {header}

      {!payee && (
        <div className="flex items-center justify-center gap-2 p-8 text-sm text-granite">
          <Loader2 className="h-4 w-4 animate-spin" />
          {bn ? 'পেমেন্ট তথ্য লোড হচ্ছে…' : 'Loading payment details…'}
        </div>
      )}

      {/* Payee has not added any account yet */}
      {payee && methods.length === 0 && step !== 'done' && (
        <div className="space-y-4 p-6">
          <div className="rounded border border-granite-soft bg-bone p-4 text-sm text-ink-soft">
            {purpose === 'consultation'
              ? bn
                ? 'এই আইনজীবী এখনো পেমেন্টের নম্বর যোগ করেননি। এখন অনুরোধ পাঠান — আইনজীবী গ্রহণ করার পর বার্তায় পেমেন্টের তথ্য জানিয়ে দেবেন।'
                : 'This lawyer has not added payment details yet. Send the request now — the lawyer will share how to pay after accepting it.'
              : bn
                ? 'প্ল্যাটফর্মের পেমেন্ট নম্বর এখনো যোগ করা হয়নি। অনুরোধটি পাঠান — অ্যাডমিন পেমেন্টের বিষয়ে যোগাযোগ করবেন।'
                : 'Platform payment details are not set up yet. Send the request — an admin will contact you about payment.'}
          </div>
          {errorBox}
          <Button variant="primary" size="md" className="w-full" loading={busy} onClick={() => void submit(null)}>
            {purpose === 'consultation' ? (bn ? 'অনুরোধ পাঠান' : 'Send request') : bn ? 'অনুরোধ পাঠান' : 'Send request'}
          </Button>
          <Button variant="ghost" size="sm" className="w-full" onClick={onCancel}>
            {bn ? 'বাতিল' : 'Cancel'}
          </Button>
        </div>
      )}

      {/* Step 1: choose how to pay */}
      {payee && methods.length > 0 && step === 'method' && (
        <div className="space-y-4 p-6">
          <h4 className="font-semibold text-ink">{bn ? 'কীভাবে পেমেন্ট করবেন?' : 'How will you pay?'}</h4>
          <div className="space-y-2">
            {methods.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMethod(m)}
                className={`flex w-full items-center gap-3 rounded-lg border-2 p-3 text-left transition ${
                  chosen === m ? 'border-clay bg-clay-tint text-clay-deep' : 'border-granite hover:border-clay hover:bg-bone'
                }`}
              >
                <span className={`flex h-9 w-9 items-center justify-center rounded text-white ${METHOD[m].color}`}>
                  {METHOD[m].wallet ? <Smartphone className="h-4 w-4" /> : <Building2 className="h-4 w-4" />}
                </span>
                <span className="font-medium">{m === 'bank' && bn ? 'ব্যাংক ট্রান্সফার' : METHOD[m].name}</span>
                {chosen === m && <CheckCircle2 className="ml-auto h-5 w-5 text-clay-deep" />}
              </button>
            ))}
          </div>
          <div className="space-y-2 border-t border-granite-soft pt-4">
            <Button variant="primary" size="md" className="w-full" onClick={() => setStep('pay')}>
              {bn ? 'পরবর্তী' : 'Continue'}
            </Button>
            <Button variant="ghost" size="sm" className="w-full" onClick={onCancel}>
              {bn ? 'বাতিল' : 'Cancel'}
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: pay, then enter the sender + TrxID */}
      {payee && chosen && step === 'pay' && (
        <form
          className="space-y-4 p-6"
          onSubmit={(e) => {
            e.preventDefault();
            if (senderOk && trxOk) void submit({ method: chosen, senderAccount: sender.trim(), trxId: trxId.trim().toUpperCase() });
          }}
        >
          <div className="space-y-2 rounded-lg border border-clay/40 bg-clay-tint/40 p-4">
            <p className="text-sm font-semibold text-ink">
              {wallet
                ? bn
                  ? `১. ${METHOD[chosen].name} অ্যাপে "Send Money" করে ${taka(amount)} পাঠান এই নম্বরে:`
                  : `1. In your ${METHOD[chosen].name} app, use "Send Money" to send ${taka(amount)} to:`
                : bn
                  ? `১. এই ব্যাংক একাউন্টে ${taka(amount)} ট্রান্সফার করুন:`
                  : `1. Transfer ${taka(amount)} to this bank account:`}
            </p>
            {wallet && typeof payTo === 'string' && (
              <div className="flex items-center justify-between gap-2 rounded border border-granite bg-white px-3 py-2">
                <span className="min-w-0 font-mono text-lg font-bold tracking-wide text-ink sm:text-xl sm:tracking-wider">{payTo}</span>
                <CopyButton value={payTo} label={bn ? 'নম্বর কপি করুন' : 'Copy number'} />
              </div>
            )}
            {!wallet && payTo && typeof payTo === 'object' && (
              <dl className="space-y-1.5 rounded border border-granite bg-white p-3 text-sm">
                {(
                  [
                    [bn ? 'ব্যাংক' : 'Bank', (payTo as BankAccount).bankName],
                    [bn ? 'একাউন্টের নাম' : 'Account name', (payTo as BankAccount).accountName],
                    [bn ? 'একাউন্ট নম্বর' : 'Account number', (payTo as BankAccount).accountNumber],
                    [bn ? 'শাখা' : 'Branch', (payTo as BankAccount).branch],
                    [bn ? 'রাউটিং নম্বর' : 'Routing number', (payTo as BankAccount).routingNumber],
                  ] as [string, string | undefined][]
                )
                  .filter(([, v]) => v)
                  .map(([k, v]) => (
                    <div key={k} className="flex items-center justify-between gap-2">
                      <dt className="text-granite">{k}</dt>
                      <dd className="flex items-center gap-2 text-right font-semibold text-ink">
                        <span className="break-all">{v}</span>
                        {k.includes('number') || k.includes('নম্বর') ? <CopyButton value={v!} label={k} /> : null}
                      </dd>
                    </div>
                  ))}
              </dl>
            )}
            <p className="text-xs text-ink-soft">
              {bn ? 'প্রাপক: ' : 'Receiver: '}
              <strong>{payee.payeeName}</strong>
              {wallet && (bn ? ' · Cash Out বা Payment নয়, Send Money ব্যবহার করুন।' : ' · Use Send Money, not Cash Out or Payment.')}
            </p>
          </div>

          <p className="text-sm font-semibold text-ink">{bn ? '২. পেমেন্টের পর নিচের তথ্য দিন:' : '2. After paying, enter:'}</p>
          <div>
            <label htmlFor="pay-sender" className="mb-1 block text-sm font-medium text-ink">
              {wallet ? (bn ? 'যে নম্বর থেকে পাঠিয়েছেন' : 'Number you paid from') : bn ? 'আপনার একাউন্টের নাম/নম্বর' : 'Your account name / number'}
            </label>
            <input
              id="pay-sender"
              inputMode={wallet ? 'numeric' : 'text'}
              value={sender}
              onChange={(e) => setSender(wallet ? e.target.value.replace(/[^\d+]/g, '') : e.target.value)}
              placeholder={wallet ? '01XXXXXXXXX' : bn ? 'যেমন: রহিম, 1234…' : 'e.g. Rahim, 1234…'}
              maxLength={wallet ? 14 : 60}
              className="w-full rounded border border-granite p-3 text-center font-mono text-lg tracking-wide outline-none focus:border-clay focus:ring-1 focus:ring-clay"
              required
            />
          </div>
          <div>
            <label htmlFor="pay-trx" className="mb-1 block text-sm font-medium text-ink">
              {wallet ? (bn ? 'লেনদেন আইডি (TrxID)' : 'Transaction ID (TrxID)') : bn ? 'লেনদেন / রেফারেন্স নম্বর' : 'Transaction / reference number'}
            </label>
            <input
              id="pay-trx"
              value={trxId}
              onChange={(e) => setTrxId(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ''))}
              placeholder="8N7A6XXXXX"
              maxLength={30}
              className="w-full rounded border border-granite p-3 text-center font-mono text-lg tracking-wide outline-none focus:border-clay focus:ring-1 focus:ring-clay"
              required
            />
            <p className="mt-1 text-xs text-granite">
              {wallet
                ? bn
                  ? `${METHOD[chosen].name} থেকে আসা SMS বা অ্যাপের লেনদেন ইতিহাসে পাবেন।`
                  : `Find it in the ${METHOD[chosen].name} SMS or the app's transaction history.`
                : bn
                  ? 'ব্যাংকের রসিদ বা অ্যাপে পাবেন।'
                  : 'Shown on your bank receipt or app.'}
            </p>
          </div>
          {errorBox}
          <div className="space-y-2 pt-2">
            <Button type="submit" variant="primary" size="md" className="w-full" loading={busy} disabled={!senderOk || !trxOk}>
              {bn ? 'পেমেন্টের তথ্য জমা দিন' : 'Submit payment details'}
            </Button>
            <Button type="button" variant="ghost" size="sm" className="w-full" onClick={() => setStep('method')}>
              <ArrowLeft className="mr-1 h-3.5 w-3.5" />
              {bn ? 'পিছনে' : 'Back'}
            </Button>
          </div>
        </form>
      )}

      {/* Done */}
      {step === 'done' && (
        <div className="space-y-3 p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
            <CheckCircle2 className="h-9 w-9 text-green-600" />
          </div>
          <h4 className="font-semibold text-ink">{bn ? 'জমা হয়েছে' : 'Submitted'}</h4>
          <p className="text-sm text-granite">
            {methods.length === 0
              ? bn
                ? 'আপনার অনুরোধ পাঠানো হয়েছে।'
                : 'Your request has been sent.'
              : purpose === 'consultation'
                ? bn
                  ? 'আইনজীবী লেনদেনটি মিলিয়ে দেখে নিশ্চিত করবেন। ফলাফল নোটিফিকেশনে জানানো হবে।'
                  : 'The lawyer will check the transaction and confirm it. You will get a notification.'
                : bn
                  ? 'অ্যাডমিন লেনদেনটি মিলিয়ে দেখে নিশ্চিত করবেন। ফলাফল নোটিফিকেশনে জানানো হবে।'
                  : 'An admin will check the transaction and confirm it. You will get a notification.'}
          </p>
        </div>
      )}
    </div>
  );
}
