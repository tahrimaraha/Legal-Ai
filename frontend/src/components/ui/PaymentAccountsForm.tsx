import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Wallet } from 'lucide-react';
import { useLang } from '../../context/LanguageContext';
import { ApiError } from '../../lib/api';
import type { PaymentAccounts } from '../../mocks/types';
import { Button } from './Button';

interface Props {
  title: string;
  description: string;
  load: () => Promise<PaymentAccounts>;
  save: (accounts: PaymentAccounts) => Promise<PaymentAccounts>;
}

const field =
  'w-full rounded border border-granite bg-white px-3 py-2 text-sm text-ink placeholder:text-granite focus:border-clay-deep focus:outline-none focus:ring-2 focus:ring-clay/20';

/** Where clients send money: bKash / Nagad / Rocket numbers and an optional bank account. */
export function PaymentAccountsForm({ title, description, load, save }: Props) {
  const { lang } = useLang();
  const bn = lang === 'bn';
  const [bkash, setBkash] = useState('');
  const [nagad, setNagad] = useState('');
  const [rocket, setRocket] = useState('');
  const [hasBank, setHasBank] = useState(false);
  const [bank, setBank] = useState({ bankName: '', accountName: '', accountNumber: '', branch: '', routingNumber: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    load()
      .then((a) => {
        setBkash(a.bkash ?? '');
        setNagad(a.nagad ?? '');
        setRocket(a.rocket ?? '');
        if (a.bank) {
          setHasBank(true);
          setBank({ branch: '', routingNumber: '', ...a.bank });
        }
      })
      .catch(() => setMsg({ ok: false, text: bn ? 'পেমেন্ট তথ্য লোড করা যায়নি।' : 'Could not load payment details.' }))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setMsg(null);
    try {
      const saved = await save({
        bkash: bkash.trim() || undefined,
        nagad: nagad.trim() || undefined,
        rocket: rocket.trim() || undefined,
        bank: hasBank ? bank : undefined,
      });
      setBkash(saved.bkash ?? '');
      setNagad(saved.nagad ?? '');
      setRocket(saved.rocket ?? '');
      setMsg({ ok: true, text: bn ? 'পেমেন্ট তথ্য সংরক্ষিত হয়েছে।' : 'Payment details saved.' });
    } catch (err) {
      setMsg({ ok: false, text: err instanceof ApiError ? (bn ? err.messageBn : err.message) : String(err) });
    } finally {
      setSaving(false);
    }
  };

  const wallet = (label: string, value: string, set: (v: string) => void, id: string) => (
    <label htmlFor={id} className="space-y-1 text-xs font-semibold text-ink">
      <span>{label}</span>
      <input id={id} inputMode="numeric" value={value} onChange={(e) => set(e.target.value.replace(/[^\d+\s-]/g, ''))}
        placeholder="01XXXXXXXXX" maxLength={16} className={`${field} font-mono`} />
    </label>
  );

  return (
    <form onSubmit={submit} className="space-y-4 rounded border border-granite bg-white p-5 shadow-sm">
      <div className="flex items-start gap-2">
        <Wallet className="mt-0.5 h-5 w-5 shrink-0 text-clay-deep" />
        <div>
          <h2 className="font-display text-lg font-bold text-ink">{title}</h2>
          <p className="mt-0.5 text-xs text-granite">{description}</p>
        </div>
      </div>
      {loading ? (
        <p className="text-sm text-granite">{bn ? 'লোড হচ্ছে…' : 'Loading…'}</p>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            {wallet('bKash', bkash, setBkash, 'acc-bkash')}
            {wallet('Nagad', nagad, setNagad, 'acc-nagad')}
            {wallet('Rocket', rocket, setRocket, 'acc-rocket')}
          </div>
          <label className="flex items-center gap-2 text-sm text-ink">
            <input type="checkbox" checked={hasBank} onChange={(e) => setHasBank(e.target.checked)} className="h-4 w-4 accent-[#8a5a3c]" />
            {bn ? 'ব্যাংক একাউন্টও যোগ করুন' : 'Also accept bank transfer'}
          </label>
          {hasBank && (
            <div className="grid gap-3 sm:grid-cols-2">
              {(
                [
                  ['bankName', bn ? 'ব্যাংকের নাম' : 'Bank name', 'Dutch-Bangla Bank'],
                  ['accountName', bn ? 'একাউন্টের নাম' : 'Account name', bn ? 'একাউন্টধারীর নাম' : 'Account holder name'],
                  ['accountNumber', bn ? 'একাউন্ট নম্বর' : 'Account number', '1234567890'],
                  ['branch', bn ? 'শাখা (ঐচ্ছিক)' : 'Branch (optional)', 'Agrabad'],
                  ['routingNumber', bn ? 'রাউটিং নম্বর (ঐচ্ছিক)' : 'Routing number (optional)', '090150000'],
                ] as [keyof typeof bank, string, string][]
              ).map(([k, label, ph]) => (
                <label key={k} className="space-y-1 text-xs font-semibold text-ink">
                  <span>{label}</span>
                  <input value={bank[k]} onChange={(e) => setBank({ ...bank, [k]: e.target.value })} placeholder={ph}
                    required={['bankName', 'accountName', 'accountNumber'].includes(k)} className={field} />
                </label>
              ))}
            </div>
          )}
          {msg && (
            <div role={msg.ok ? 'status' : 'alert'} className={`flex items-center gap-2 rounded border p-2.5 text-xs ${msg.ok ? 'border-[#b9d3a6] bg-[#eef5e8] text-[#3f6330]' : 'border-brick/30 bg-brick/10 text-brick'}`}>
              {msg.ok ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
              {msg.text}
            </div>
          )}
          <Button type="submit" variant="primary" size="sm" loading={saving}>
            {bn ? 'সংরক্ষণ করুন' : 'Save payment details'}
          </Button>
        </>
      )}
    </form>
  );
}
