import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, Clock, Landmark, TrendingUp, Users, Wallet } from 'lucide-react';
import { useLang } from '../../context/LanguageContext';
import { getFinanceOverview, type FinanceOverview } from '../../lib/api';
import { StatCard } from '../../components/ui/StatCard';
import { Skeleton } from '../../components/ui/EmptyState';
import { IncomingPaymentsTable } from './IncomingPaymentsTable';
import { LawyerPayoutsSection } from './LawyerPayoutsSection';

const WALLET_NAMES: Record<string, string> = { bkash: 'bKash', nagad: 'Nagad', rocket: 'Rocket' };

export default function AdminPaymentsDashboard() {
  const { lang, num } = useLang();
  const bn = lang === 'bn';
  const [data, setData] = useState<FinanceOverview | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    getFinanceOverview()
      .then((d) => {
        setData(d);
        setError('');
      })
      .catch(() => setError(bn ? 'আর্থিক তথ্য লোড করা যায়নি।' : 'Could not load finance data.'));
  }, [bn]);

  useEffect(() => {
    load();
  }, [load]);

  const s = data?.summary;

  return (
    <div className="space-y-6 font-body">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink">{bn ? 'পেমেন্ট ও আর্থিক ড্যাশবোর্ড' : 'Payments & Finance'}</h1>
        <p className="mt-1 text-xs text-granite">
          {bn
            ? 'নাগরিকের পেমেন্ট যাচাই, কোন আইনজীবী কোন কাজ করেছেন ও কত পাবেন, এবং আইনজীবীদের পরিশোধের রেকর্ড।'
            : 'Check citizen payments, see which lawyer did which job and what they are owed, and record lawyer payouts.'}
        </p>
      </div>

      {error && <p className="text-xs text-brick">{error}</p>}

      {/* Real totals */}
      {s ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label={bn ? 'নিশ্চিত নাগরিক পেমেন্ট' : 'Confirmed citizen payments'}
            value={`৳${num(s.citizenConfirmedBdt)}`}
            icon={Landmark}
            sub={
              s.citizenPendingCount > 0
                ? bn
                  ? `আরও ৳${num(s.citizenPendingBdt)} যাচাই বাকি (${num(s.citizenPendingCount)}টি)`
                  : `+৳${num(s.citizenPendingBdt)} awaiting check (${s.citizenPendingCount})`
                : bn ? 'যাচাইয়ের অপেক্ষায় কিছু নেই' : 'nothing awaiting check'
            }
          />
          <StatCard
            label={bn ? 'আইনজীবীদের পাওনা' : 'Owed to lawyers'}
            value={`৳${num(s.lawyerOwedBdt)}`}
            icon={AlertCircle}
            sub={bn ? 'এখনো পরিশোধ করা হয়নি' : 'not paid out yet'}
          />
          <StatCard
            label={bn ? 'আইনজীবীদের পরিশোধিত' : 'Paid to lawyers'}
            value={`৳${num(s.lawyerPaidBdt)}`}
            icon={Users}
            sub={bn ? `মোট অর্জিত ৳${num(s.lawyerEarnedBdt)}` : `of ৳${num(s.lawyerEarnedBdt)} earned`}
          />
          <StatCard
            label={bn ? 'প্ল্যাটফর্মের নিট' : 'Platform net'}
            value={`৳${num(s.platformNetBdt)}`}
            icon={TrendingUp}
            sub={bn ? 'নিশ্চিত পেমেন্ট − আইনজীবীদের অংশ' : 'confirmed payments − lawyer earnings'}
          />
        </div>
      ) : (
        !error && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28" />)}
          </div>
        )
      )}

      {s && (
        <p className="text-[11px] text-granite -mt-3">
          {bn
            ? `আইনজীবীর অংশ: যাচাই ফি-এর ${num(s.verificationSharePercent)}%, পরামর্শ ফি-এর ${num(s.consultationSharePercent)}%।`
            : `Lawyer share: ${s.verificationSharePercent}% of a verification fee, ${s.consultationSharePercent}% of a consultation fee.`}
        </p>
      )}

      {/* Citizen payments submitted with a wallet TrxID */}
      <IncomingPaymentsTable onChanged={load} />

      {/* Who did what, and what they're owed */}
      {data ? <LawyerPayoutsSection lawyers={data.lawyers} onPaid={load} /> : !error && <Skeleton className="h-40 w-full" />}

      {/* Payout history */}
      {data && (
        <div className="bg-white rounded border border-granite shadow-sm">
          <div className="p-5 border-b border-granite-soft">
            <h3 className="font-display text-lg font-bold text-ink">{bn ? 'আইনজীবীদের পরিশোধের ইতিহাস' : 'Lawyer Payout History'}</h3>
          </div>
          {data.payouts.length === 0 ? (
            <p className="p-5 text-xs text-granite flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              {bn ? 'এখনো কোনো আইনজীবীকে পরিশোধ করা হয়নি।' : 'No lawyer payouts recorded yet.'}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-bone text-granite uppercase font-mono text-[10px]">
                  <tr>
                    <th className="text-left p-3">{bn ? 'তারিখ' : 'Date'}</th>
                    <th className="text-left p-3">{bn ? 'আইনজীবী' : 'Lawyer'}</th>
                    <th className="text-left p-3">{bn ? 'পাঠানো হয়েছে' : 'Sent to'}</th>
                    <th className="text-left p-3">TrxID</th>
                    <th className="text-right p-3">{bn ? 'কাজ' : 'Jobs'}</th>
                    <th className="text-right p-3">{bn ? 'পরিমাণ' : 'Amount'}</th>
                    <th className="text-left p-3">{bn ? 'পরিশোধ করেছেন' : 'Paid by'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-granite-soft">
                  {data.payouts.map((p) => (
                    <tr key={p.id} className="hover:bg-bone/40">
                      <td className="p-3 font-mono text-granite whitespace-nowrap">{p.paidAt ? new Date(p.paidAt).toLocaleString() : '—'}</td>
                      <td className="p-3 text-ink">{p.lawyerName}</td>
                      <td className="p-3 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5">
                          <Wallet className="h-3.5 w-3.5 text-granite" />
                          {p.method ? WALLET_NAMES[p.method] : '—'} <span className="font-mono">{p.receiverNumber}</span>
                        </span>
                      </td>
                      <td className="p-3 font-mono font-bold text-ink select-all">{p.trxId}</td>
                      <td className="p-3 text-right">{num(p.itemCount)}</td>
                      <td className="p-3 text-right font-bold text-ink whitespace-nowrap">৳{num(p.amountBdt)}</td>
                      <td className="p-3 text-ink-soft">{p.paidByName}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
