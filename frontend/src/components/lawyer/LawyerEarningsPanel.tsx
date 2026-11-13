import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Wallet } from 'lucide-react';
import { useLang } from '../../context/LanguageContext';
import { ApiError, getMyEarnings, saveMyPayoutAccount, type MyEarnings, type WalletMethod } from '../../lib/api';
import { Button } from '../ui/Button';
import { Skeleton } from '../ui/EmptyState';

const WALLETS: { id: WalletMethod; name: string; color: string }[] = [
  { id: 'bkash', name: 'bKash', color: 'bg-pink-500' },
  { id: 'nagad', name: 'Nagad', color: 'bg-orange-500' },
  { id: 'rocket', name: 'Rocket', color: 'bg-purple-500' },
];
const WALLET_NAMES: Record<string, string> = { bkash: 'bKash', nagad: 'Nagad', rocket: 'Rocket' };
const PHONE_RE = /^01[3-9]\d{8}$/;
const toAscii = (v: string) => v.replace(/[০-৯]/g, (d) => String('০১২৩৪৫৬৭৮৯'.indexOf(d)));

/** The lawyer's payout wallet (where the admin sends their earnings), earnings, and payouts received. */
export function LawyerEarningsPanel() {
  const { lang, num } = useLang();
  const bn = lang === 'bn';
  const [data, setData] = useState<MyEarnings | null>(null);
  const [loadError, setLoadError] = useState('');
  const [method, setMethod] = useState<WalletMethod>('bkash');
  const [number, setNumber] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getMyEarnings()
      .then((d) => {
        setData(d);
        if (d.payoutAccount.method) setMethod(d.payoutAccount.method);
        setNumber(d.payoutAccount.number ?? '');
      })
      .catch(() => setLoadError(bn ? 'আয়ের তথ্য লোড করা যায়নি।' : 'Could not load your earnings.'));
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setError('');
    try {
      const account = await saveMyPayoutAccount(method, number);
      setData((d) => (d ? { ...d, payoutAccount: account } : d));
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? (bn ? err.messageBn : err.message) : bn ? 'সংরক্ষণ করা যায়নি।' : 'Could not save.');
    } finally {
      setSaving(false);
    }
  };

  if (loadError) return <p className="text-xs text-brick">{loadError}</p>;
  if (!data) return <Skeleton className="h-48 w-full" />;

  const hasAccount = Boolean(data.payoutAccount.method && data.payoutAccount.number);

  return (
    <div className="space-y-6">
      {/* Payout wallet */}
      <form onSubmit={save} className="rounded border border-granite bg-white p-6 shadow-sm space-y-4">
        <div>
          <h2 className="font-mono text-label uppercase text-clay-deep font-semibold">{bn ? 'পেমেন্ট গ্রহণের ওয়ালেট' : 'Payout Wallet'}</h2>
          <p className="text-xs text-granite mt-1">
            {bn
              ? 'আপনার পারিশ্রমিক অ্যাডমিন এই নম্বরে "Send Money" করে পাঠাবেন।'
              : 'The admin sends your earnings to this number with "Send Money".'}
          </p>
        </div>
        {!hasAccount && (
          <p className="flex items-center gap-1.5 text-xs text-brick">
            <AlertCircle className="h-3.5 w-3.5" />
            {bn ? 'ওয়ালেট যোগ না করা পর্যন্ত আপনাকে পরিশোধ করা যাবে না।' : "You can't be paid until you add a wallet."}
          </p>
        )}
        <div className="grid grid-cols-3 gap-2">
          {WALLETS.map((w) => (
            <button
              key={w.id}
              type="button"
              onClick={() => { setMethod(w.id); setSaved(false); }}
              className={`p-2.5 rounded border-2 text-xs font-semibold flex items-center justify-center gap-2 transition ${
                method === w.id ? 'border-clay bg-clay-tint text-clay-deep' : 'border-granite-soft text-ink-soft hover:border-clay'
              }`}
            >
              <span className={`h-2.5 w-2.5 rounded-full ${w.color}`} />
              {w.name}
            </button>
          ))}
        </div>
        <label className="block space-y-1">
          <span className="text-xs font-semibold text-ink">{bn ? `আপনার ${WALLET_NAMES[method]} নম্বর` : `Your ${WALLET_NAMES[method]} number`}</span>
          <input
            type="tel"
            inputMode="numeric"
            value={number}
            onChange={(e) => { setNumber(toAscii(e.target.value).replace(/\D/g, '').slice(0, 11)); setSaved(false); }}
            placeholder="01XXXXXXXXX"
            className="w-full p-2.5 border border-granite rounded font-mono tracking-wide focus:border-clay focus:ring-1 focus:ring-clay outline-none"
          />
        </label>
        {error && <p className="text-xs text-brick">{error}</p>}
        {saved && (
          <p className="flex items-center gap-1.5 text-xs text-green-700">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {bn ? 'ওয়ালেট সংরক্ষিত হয়েছে।' : 'Wallet saved.'}
          </p>
        )}
        <Button size="sm" variant="primary" type="submit" loading={saving} disabled={!PHONE_RE.test(number)}>
          {bn ? 'ওয়ালেট সংরক্ষণ করুন' : 'Save Wallet'}
        </Button>
      </form>

      {/* Earnings */}
      <div className="rounded border border-granite bg-white p-6 shadow-sm space-y-4">
        <h2 className="font-mono text-label uppercase text-clay-deep font-semibold">{bn ? 'আমার আয়' : 'My Earnings'}</h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded border border-granite-soft bg-bone p-3">
            <p className="text-[10px] uppercase font-mono text-granite">{bn ? 'পাওনা' : 'Owed to you'}</p>
            <p className="text-xl font-bold text-ink">৳{num(data.owedBdt)}</p>
          </div>
          <div className="rounded border border-granite-soft bg-bone p-3">
            <p className="text-[10px] uppercase font-mono text-granite">{bn ? 'পেয়েছেন' : 'Paid to you'}</p>
            <p className="text-xl font-bold text-green-700">৳{num(data.paidBdt)}</p>
          </div>
        </div>

        {data.items.length === 0 ? (
          <p className="text-xs text-granite">
            {bn ? 'সম্পন্ন যাচাই ও পরামর্শের আয় এখানে দেখা যাবে।' : 'Earnings from completed verifications and consultations appear here.'}
          </p>
        ) : (
          <ul className="divide-y divide-granite-soft text-xs">
            {data.items.map((i) => (
              <li key={i.id} className="py-2 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-ink line-clamp-1">
                    <span className="font-semibold">{i.type === 'verification' ? (bn ? 'যাচাই' : 'Verification') : bn ? 'পরামর্শ' : 'Consultation'}</span>
                    {' · '}
                    {i.title}
                  </p>
                  <p className="text-granite text-[11px]">
                    {i.citizenName}
                    {i.completedAt ? ` · ${new Date(i.completedAt).toLocaleDateString()}` : ''}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold text-ink">৳{num(i.lawyerShareBdt)}</p>
                  <p className={`text-[10px] font-semibold ${i.paid ? 'text-green-700' : 'text-clay-deep'}`}>
                    {i.paid ? (bn ? 'পরিশোধিত' : 'Paid') : bn ? 'পাওনা' : 'Owed'}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}

        {data.payouts.length > 0 && (
          <div className="pt-2 border-t border-granite-soft space-y-2">
            <p className="text-[10px] uppercase font-mono text-granite">{bn ? 'প্রাপ্ত পেমেন্ট' : 'Payouts received'}</p>
            {data.payouts.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-3 text-xs">
                <span className="inline-flex items-center gap-1.5 text-ink-soft">
                  <Wallet className="h-3.5 w-3.5" />
                  {p.paidAt ? new Date(p.paidAt).toLocaleDateString() : ''} · {p.method ? WALLET_NAMES[p.method] : ''}{' '}
                  <span className="font-mono">{p.receiverNumber}</span> · TrxID <span className="font-mono font-semibold">{p.trxId}</span>
                </span>
                <span className="font-bold text-green-700 whitespace-nowrap">৳{num(p.amountBdt)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
