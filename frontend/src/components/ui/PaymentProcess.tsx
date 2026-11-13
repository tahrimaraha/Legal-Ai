import { useEffect, useState } from 'react';
import { Smartphone, CheckCircle2, ArrowRight, AlertCircle, Copy, Check } from 'lucide-react';
import { Button } from './Button';
import { useLang } from '../../context/LanguageContext';
import { ApiError, listPaymentMethods, type ManualPayment, type PaymentMethodOption, type WalletMethod } from '../../lib/api';

interface PaymentProcessProps {
  amount: number;
  /** Shown in the header, e.g. "Verification fee" / "Consultation fee". */
  titleEn: string;
  titleBn: string;
  /** Sub-label next to the amount, e.g. "Standard" or "Urgent". */
  tagEn?: string;
  tagBn?: string;
  /** Creates the paid-for request with the submitted payment. Throwing keeps the form open with the error. */
  onSubmit: (payment: ManualPayment) => Promise<void>;
  onCancel: () => void;
}

type Step = 'method' | 'details' | 'success';

const METHOD_STYLE: Record<WalletMethod, { color: string; logo: string }> = {
  bkash: { color: 'bg-pink-500', logo: '📱' },
  nagad: { color: 'bg-orange-500', logo: '💳' },
  rocket: { color: 'bg-purple-500', logo: '🚀' },
};

const PHONE_RE = /^01[3-9]\d{8}$/;
const TRX_RE = /^[A-Za-z0-9]{6,20}$/;

/** Bangla digits → ASCII, so numbers typed on a Bangla keyboard still validate. */
const toAscii = (v: string) => v.replace(/[০-৯]/g, (d) => String('০১২৩৪৫৬৭৮৯'.indexOf(d)));

/**
 * Manual wallet payment: the citizen sends money with bKash/Nagad/Rocket "Send Money"
 * to the platform's number, then submits their number and the TrxID for an admin to check.
 */
export function PaymentProcess({ amount, titleEn, titleBn, tagEn, tagBn, onSubmit, onCancel }: PaymentProcessProps) {
  const { lang, num } = useLang();
  const bn = lang === 'bn';
  const [step, setStep] = useState<Step>('method');
  const [methods, setMethods] = useState<PaymentMethodOption[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [selected, setSelected] = useState<WalletMethod | null>(null);
  const [payerNumber, setPayerNumber] = useState('');
  const [trxId, setTrxId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    listPaymentMethods()
      .then((list) => {
        setMethods(list);
        if (list.length) setSelected(list[0].id);
      })
      .catch(() => setLoadError(true));
  }, []);

  const method = methods?.find((m) => m.id === selected);
  const phoneValid = PHONE_RE.test(payerNumber);
  const trxValid = TRX_RE.test(trxId);

  const copyNumber = async () => {
    if (!method) return;
    try {
      await navigator.clipboard.writeText(method.receiverNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable — the number is visible anyway */
    }
  };

  const handleSubmit = async () => {
    if (!selected || !phoneValid || !trxValid) return;
    setError('');
    setSubmitting(true);
    try {
      await onSubmit({ method: selected, payerNumber, trxId: trxId.toUpperCase() });
      setStep('success');
    } catch (err) {
      if (err instanceof ApiError) setError(bn ? err.messageBn : err.message);
      else setError(bn ? 'জমা দেওয়া যায়নি। আবার চেষ্টা করুন।' : 'Could not submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-clay text-white p-4 text-center">
        <h3 className="font-display text-lg font-bold">{bn ? titleBn : titleEn}</h3>
        <div className="mt-2 text-clay-tint">
          <span className="text-2xl font-bold">৳{num(amount)}</span>
          {(tagEn || tagBn) && <span className="ml-2 text-sm opacity-90">({bn ? tagBn : tagEn})</span>}
        </div>
      </div>

      {/* Step 1: choose wallet */}
      {step === 'method' && (
        <div className="p-6 space-y-4">
          <h4 className="font-semibold text-ink">{bn ? 'পেমেন্ট পদ্ধতি নির্বাচন করুন' : 'Select Payment Method'}</h4>

          {loadError && (
            <p className="flex items-center gap-1.5 text-xs text-brick">
              <AlertCircle className="h-3.5 w-3.5" />
              {bn ? 'পেমেন্ট পদ্ধতি লোড করা যায়নি।' : 'Could not load payment methods.'}
            </p>
          )}
          {methods === null && !loadError && (
            <div className="animate-spin mx-auto w-6 h-6 border-2 border-clay-tint border-t-clay rounded-full" />
          )}
          {methods?.length === 0 && (
            <p className="text-xs text-granite">
              {bn ? 'এই মুহূর্তে কোনো পেমেন্ট পদ্ধতি চালু নেই।' : 'No payment methods are available right now.'}
            </p>
          )}

          <div className="space-y-3">
            {methods?.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setSelected(m.id)}
                className={`w-full p-4 rounded-lg border-2 transition flex items-center gap-3 ${
                  selected === m.id ? 'border-clay bg-clay-tint text-clay-deep' : 'border-granite hover:border-clay hover:bg-bone'
                }`}
              >
                <div className={`w-10 h-10 rounded ${METHOD_STYLE[m.id].color} flex items-center justify-center text-white text-lg`}>
                  {METHOD_STYLE[m.id].logo}
                </div>
                <span className="font-medium">{m.name}</span>
                {selected === m.id && <CheckCircle2 className="h-5 w-5 text-clay-deep ml-auto" />}
              </button>
            ))}
          </div>

          <div className="pt-4 border-t border-granite-soft">
            <Button variant="primary" size="md" onClick={() => setStep('details')} disabled={!method} className="w-full">
              {bn ? 'পরবর্তী' : 'Continue'}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={onCancel} className="w-full mt-2">
              {bn ? 'বাতিল' : 'Cancel'}
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: send money, then enter number + TrxID */}
      {step === 'details' && method && (
        <div className="p-6 space-y-4">
          <div className="text-center space-y-1">
            <Smartphone className="h-10 w-10 text-clay-deep mx-auto" />
            <h4 className="font-semibold text-ink">{bn ? `${method.name} দিয়ে পেমেন্ট` : `Pay with ${method.name}`}</h4>
          </div>

          <ol className="rounded border border-granite-soft bg-bone p-3 text-xs text-ink-soft space-y-1.5 list-decimal list-inside">
            <li>
              {bn ? `আপনার ${method.name} অ্যাপ থেকে "Send Money" করুন` : `Open your ${method.name} app and choose "Send Money"`}
            </li>
            <li>
              {bn ? 'এই নম্বরে ' : 'Send '}
              <span className="font-bold text-ink">৳{num(amount)}</span>
              {bn ? ' পাঠান:' : ' to:'}{' '}
              <button
                type="button"
                onClick={copyNumber}
                className="inline-flex items-center gap-1 font-mono font-bold text-ink tracking-wide hover:text-clay-deep"
                title={bn ? 'কপি করুন' : 'Copy'}
              >
                {method.receiverNumber}
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            </li>
            <li>{bn ? 'নিশ্চিতকরণ SMS থেকে ট্রানজেকশন আইডি (TrxID) নিচে লিখুন' : 'Enter the Transaction ID (TrxID) from the confirmation SMS below'}</li>
          </ol>

          <label className="block space-y-1">
            <span className="text-xs font-semibold text-ink">
              {bn ? `আপনার ${method.name} নম্বর` : `Your ${method.name} number`}
            </span>
            <input
              type="tel"
              inputMode="numeric"
              value={payerNumber}
              onChange={(e) => setPayerNumber(toAscii(e.target.value).replace(/\D/g, '').slice(0, 11))}
              placeholder="01XXXXXXXXX"
              className="w-full p-3 border border-granite rounded text-center font-mono text-lg tracking-wide focus:border-clay focus:ring-1 focus:ring-clay outline-none"
            />
            {payerNumber.length === 11 && !phoneValid && (
              <span className="text-[11px] text-brick">{bn ? 'সঠিক মোবাইল নম্বর দিন' : 'Enter a valid mobile number'}</span>
            )}
          </label>

          <label className="block space-y-1">
            <span className="text-xs font-semibold text-ink">{bn ? 'ট্রানজেকশন আইডি (TrxID)' : 'Transaction ID (TrxID)'}</span>
            <input
              type="text"
              value={trxId}
              onChange={(e) => setTrxId(toAscii(e.target.value).replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 20))}
              placeholder={bn ? 'যেমন 9AB3CD4EF5' : 'e.g. 9AB3CD4EF5'}
              className="w-full p-3 border border-granite rounded text-center font-mono text-lg tracking-widest focus:border-clay focus:ring-1 focus:ring-clay outline-none"
            />
          </label>

          {error && (
            <p className="flex items-center gap-1.5 text-xs text-brick">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              {error}
            </p>
          )}

          <div className="pt-2 space-y-2">
            <Button
              variant="primary"
              size="md"
              onClick={handleSubmit}
              loading={submitting}
              disabled={!phoneValid || !trxValid}
              className="w-full"
            >
              {bn ? 'পেমেন্ট জমা দিন' : 'Submit Payment'}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setStep('method')} disabled={submitting} className="w-full">
              {bn ? 'পিছনে' : 'Back'}
            </Button>
          </div>
        </div>
      )}

      {step === 'success' && (
        <div className="p-8 text-center space-y-3">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="h-10 w-10 text-green-600" />
          </div>
          <h4 className="font-semibold text-ink">{bn ? 'পেমেন্ট জমা হয়েছে!' : 'Payment Submitted!'}</h4>
          <p className="text-sm text-granite">
            {bn
              ? 'আপনার অনুরোধ পাঠানো হয়েছে। আমরা ট্রানজেকশন আইডি যাচাই করে নেব।'
              : 'Your request has been sent. We will verify your transaction ID.'}
          </p>
        </div>
      )}
    </div>
  );
}
