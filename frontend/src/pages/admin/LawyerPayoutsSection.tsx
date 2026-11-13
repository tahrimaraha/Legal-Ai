import { useMemo, useState } from 'react';
import { AlertTriangle, Check, CheckCircle2, ChevronDown, ChevronUp, Copy, Send, Wallet } from 'lucide-react';
import { useLang } from '../../context/LanguageContext';
import { ApiError, payLawyer, type EarningItem, type LawyerLedger } from '../../lib/api';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';

const WALLET_NAMES: Record<string, string> = { bkash: 'bKash', nagad: 'Nagad', rocket: 'Rocket' };
const WALLET_COLORS: Record<string, string> = { bkash: 'bg-pink-500', nagad: 'bg-orange-500', rocket: 'bg-purple-500' };
const TRX_RE = /^[A-Za-z0-9]{6,20}$/;

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      title="Copy"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          /* clipboard unavailable */
        }
      }}
      className="text-granite hover:text-clay-deep"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

/** Every lawyer's earnings — who did which job and how much they're owed — with a manual wallet payout. */
export function LawyerPayoutsSection({ lawyers, onPaid }: { lawyers: LawyerLedger[]; onPaid: () => void }) {
  const { lang } = useLang();
  const bn = lang === 'bn';

  if (lawyers.length === 0) {
    return (
      <div className="bg-white rounded border border-granite shadow-sm p-5">
        <h3 className="font-display text-lg font-bold text-ink">{bn ? 'আইনজীবীদের পারিশ্রমিক' : 'Lawyer Earnings & Payouts'}</h3>
        <p className="text-xs text-granite mt-2">
          {bn
            ? 'এখনো কোনো সম্পন্ন যাচাই বা পরামর্শ নেই। কোনো আইনজীবী কাজ শেষ করলে এখানে দেখা যাবে।'
            : 'No completed verifications or consultations yet. Lawyers appear here as soon as they finish a job.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div>
        <h3 className="font-display text-lg font-bold text-ink">{bn ? 'আইনজীবীদের পারিশ্রমিক' : 'Lawyer Earnings & Payouts'}</h3>
        <p className="text-xs text-granite mt-0.5">
          {bn
            ? 'কোন আইনজীবী কোন কাজ করেছেন ও কত পাবেন। তাঁর ওয়ালেটে "Send Money" করে TrxID লিখে পেমেন্ট রেকর্ড করুন।'
            : 'Which lawyer did which job and what they are owed. Send the money to their wallet with "Send Money", then record the TrxID.'}
        </p>
      </div>
      {lawyers.map((l) => (
        // Remount after a payout so the selection resets to what's still owed.
        <LawyerCard key={`${l.lawyerId}:${l.owedBdt}:${l.items.length}`} ledger={l} onPaid={onPaid} />
      ))}
    </div>
  );
}

function LawyerCard({ ledger, onPaid }: { ledger: LawyerLedger; onPaid: () => void }) {
  const { lang, num } = useLang();
  const bn = lang === 'bn';
  const unpaid = useMemo(() => ledger.items.filter((i) => !i.paid), [ledger.items]);
  const [open, setOpen] = useState(unpaid.length > 0);
  const [showPaid, setShowPaid] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(() => new Set(unpaid.map((i) => i.id)));
  const [payOpen, setPayOpen] = useState(false);

  const account = ledger.payoutAccount;
  const hasAccount = Boolean(account.method && account.number);
  const selectedItems = unpaid.filter((i) => selected.has(i.id));
  const selectedTotal = selectedItems.reduce((s, i) => s + i.lawyerShareBdt, 0);
  const shown = showPaid ? ledger.items : unpaid;

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="bg-white rounded border border-granite shadow-sm">
      <div className="p-4 flex flex-wrap items-center gap-4 justify-between">
        <div className="min-w-0">
          <p className="font-semibold text-ink">{ledger.lawyerName}</p>
          {hasAccount ? (
            <p className="mt-1 flex items-center gap-2 text-xs text-ink-soft">
              <span className={`inline-block h-2.5 w-2.5 rounded-full ${WALLET_COLORS[account.method!]}`} />
              <span>{WALLET_NAMES[account.method!]}</span>
              <span className="font-mono font-bold text-ink">{account.number}</span>
              <CopyButton value={account.number!} />
            </p>
          ) : (
            <p className="mt-1 flex items-center gap-1.5 text-xs text-brick">
              <AlertTriangle className="h-3.5 w-3.5" />
              {bn ? 'পেমেন্ট গ্রহণের ওয়ালেট যোগ করা হয়নি' : 'No payout wallet added yet'}
            </p>
          )}
        </div>
        <div className="flex items-center gap-5 text-right">
          <div>
            <p className="text-[10px] uppercase font-mono text-granite">{bn ? 'পাওনা' : 'Owed'}</p>
            <p className={`font-bold ${ledger.owedBdt > 0 ? 'text-brick' : 'text-ink'}`}>৳{num(ledger.owedBdt)}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase font-mono text-granite">{bn ? 'পরিশোধিত' : 'Paid'}</p>
            <p className="font-bold text-green-700">৳{num(ledger.paidBdt)}</p>
          </div>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="inline-flex items-center gap-1 text-xs text-clay-deep font-semibold"
          >
            {num(ledger.items.length)} {bn ? 'কাজ' : ledger.items.length === 1 ? 'job' : 'jobs'}
            {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-granite-soft">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-bone text-granite uppercase font-mono text-[10px]">
                <tr>
                  <th className="p-2.5 w-8" />
                  <th className="text-left p-2.5">{bn ? 'কাজ' : 'Job'}</th>
                  <th className="text-left p-2.5">{bn ? 'নাগরিক' : 'Citizen'}</th>
                  <th className="text-left p-2.5">{bn ? 'সম্পন্ন' : 'Completed'}</th>
                  <th className="text-left p-2.5">{bn ? 'নাগরিকের পেমেন্ট' : 'Citizen paid'}</th>
                  <th className="text-right p-2.5">{bn ? 'ফি' : 'Fee'}</th>
                  <th className="text-right p-2.5">{bn ? 'আইনজীবীর অংশ' : 'Lawyer share'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-granite-soft">
                {shown.map((i) => (
                  <ItemRow key={i.id} item={i} checked={selected.has(i.id)} onToggle={() => toggle(i.id)} />
                ))}
                {shown.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-3 text-granite">
                      {bn ? 'সব কাজের পারিশ্রমিক পরিশোধিত।' : 'Everything has been paid.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="p-3 flex flex-wrap items-center justify-between gap-3 border-t border-granite-soft">
            {ledger.items.length > unpaid.length ? (
              <button type="button" onClick={() => setShowPaid((v) => !v)} className="text-[11px] text-clay-deep hover:underline">
                {showPaid ? (bn ? 'পরিশোধিত কাজ লুকান' : 'Hide paid jobs') : bn ? 'পরিশোধিত কাজও দেখান' : 'Show paid jobs too'}
              </button>
            ) : (
              <span />
            )}
            {unpaid.length > 0 && (
              <Button size="sm" variant="primary" disabled={!hasAccount || selectedItems.length === 0} onClick={() => setPayOpen(true)}>
                <Wallet className="h-3.5 w-3.5 mr-1.5" />
                {bn ? `৳${num(selectedTotal)} পরিশোধ করুন` : `Pay ৳${num(selectedTotal)}`}
              </Button>
            )}
          </div>
        </div>
      )}

      <PayLawyerModal
        open={payOpen}
        onClose={() => setPayOpen(false)}
        ledger={ledger}
        items={selectedItems}
        total={selectedTotal}
        onPaid={() => {
          setPayOpen(false);
          onPaid();
        }}
      />
    </div>
  );
}

function ItemRow({ item, checked, onToggle }: { item: EarningItem; checked: boolean; onToggle: () => void }) {
  const { lang, num } = useLang();
  const bn = lang === 'bn';
  const citizenPay = {
    confirmed: { cls: 'text-green-700', en: 'Confirmed', bn: 'নিশ্চিত' },
    pending: { cls: 'text-clay-deep', en: 'Not checked yet', bn: 'যাচাই বাকি' },
    rejected: { cls: 'text-brick', en: 'Rejected', bn: 'বাতিল' },
    none: { cls: 'text-granite', en: 'No record', bn: 'রেকর্ড নেই' },
  }[item.citizenPaymentStatus];

  return (
    <tr className={item.paid ? 'opacity-60' : 'hover:bg-bone/40'}>
      <td className="p-2.5">
        {item.paid ? (
          <CheckCircle2 className="h-4 w-4 text-green-600" aria-label="Paid" />
        ) : (
          <input type="checkbox" checked={checked} onChange={onToggle} className="h-4 w-4 accent-clay" />
        )}
      </td>
      <td className="p-2.5 max-w-[22rem]">
        <span className={`mr-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold border ${item.type === 'verification' ? 'bg-clay-tint text-clay-deep border-clay/30' : 'bg-bone text-ink border-granite-soft'}`}>
          {item.type === 'verification' ? (bn ? 'যাচাই' : 'Verification') : bn ? 'পরামর্শ' : 'Consultation'}
        </span>
        <span className="text-ink line-clamp-1 inline">{item.title}</span>
      </td>
      <td className="p-2.5 text-ink-soft whitespace-nowrap">{item.citizenName}</td>
      <td className="p-2.5 font-mono text-granite whitespace-nowrap">
        {item.completedAt ? new Date(item.completedAt).toLocaleDateString() : '—'}
      </td>
      <td className={`p-2.5 whitespace-nowrap font-medium ${citizenPay.cls}`}>{bn ? citizenPay.bn : citizenPay.en}</td>
      <td className="p-2.5 text-right whitespace-nowrap text-ink-soft">৳{num(item.feeBdt)}</td>
      <td className="p-2.5 text-right whitespace-nowrap font-bold text-ink">৳{num(item.lawyerShareBdt)}</td>
    </tr>
  );
}

function PayLawyerModal({
  open, onClose, ledger, items, total, onPaid,
}: {
  open: boolean;
  onClose: () => void;
  ledger: LawyerLedger;
  items: EarningItem[];
  total: number;
  onPaid: () => void;
}) {
  const { lang, num } = useLang();
  const bn = lang === 'bn';
  const [trxId, setTrxId] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const method = ledger.payoutAccount.method;
  const number = ledger.payoutAccount.number;
  const unconfirmed = items.filter((i) => i.citizenPaymentStatus !== 'confirmed').length;

  const submit = async () => {
    setSubmitting(true);
    setError('');
    try {
      await payLawyer({ lawyerId: ledger.lawyerId, trxId, itemIds: items.map((i) => i.id), note: note.trim() || undefined });
      setTrxId('');
      setNote('');
      onPaid();
    } catch (err) {
      setError(err instanceof ApiError ? (bn ? err.messageBn : err.message) : bn ? 'রেকর্ড করা যায়নি।' : 'Could not record the payout.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={bn ? 'আইনজীবীকে পরিশোধ' : 'Pay Lawyer'}>
      {method && number && (
        <div className="space-y-4 font-body">
          <div className="rounded border border-granite-soft bg-bone p-4 text-center">
            <p className="text-xs text-granite">{ledger.lawyerName}</p>
            <p className="text-2xl font-bold text-ink mt-1">৳{num(total)}</p>
            <p className="text-[11px] text-granite mt-0.5">
              {num(items.length)} {bn ? 'টি কাজ' : items.length === 1 ? 'job' : 'jobs'}
            </p>
          </div>

          <ol className="rounded border border-granite-soft p-3 text-xs text-ink-soft space-y-1.5 list-decimal list-inside">
            <li>{bn ? `আপনার ${WALLET_NAMES[method]} অ্যাপ থেকে "Send Money" করুন` : `Open your ${WALLET_NAMES[method]} app and choose "Send Money"`}</li>
            <li>
              {bn ? 'এই নম্বরে ' : 'Send '}
              <span className="font-bold text-ink">৳{num(total)}</span>
              {bn ? ' পাঠান: ' : ' to: '}
              <span className="inline-flex items-center gap-1 font-mono font-bold text-ink">
                {number} <CopyButton value={number} />
              </span>
            </li>
            <li>{bn ? 'নিশ্চিতকরণ SMS-এর TrxID নিচে লিখুন' : 'Enter the TrxID from the confirmation SMS below'}</li>
          </ol>

          {unconfirmed > 0 && (
            <p className="flex items-start gap-1.5 text-[11px] text-clay-deep">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              {bn
                ? `${num(unconfirmed)}টি কাজের নাগরিক পেমেন্ট এখনো নিশ্চিত করা হয়নি।`
                : `${unconfirmed} of these jobs have a citizen payment that isn't confirmed yet.`}
            </p>
          )}

          <label className="block space-y-1">
            <span className="text-xs font-semibold text-ink">{bn ? 'ট্রানজেকশন আইডি (TrxID)' : 'Transaction ID (TrxID)'}</span>
            <input
              type="text"
              value={trxId}
              onChange={(e) => setTrxId(e.target.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 20))}
              placeholder="e.g. 9AB3CD4EF5"
              className="w-full p-3 border border-granite rounded text-center font-mono text-lg tracking-widest focus:border-clay focus:ring-1 focus:ring-clay outline-none"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-semibold text-ink">{bn ? 'নোট (ঐচ্ছিক)' : 'Note (optional)'}</span>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, 500))}
              className="w-full p-2.5 border border-granite rounded text-sm focus:border-clay focus:ring-1 focus:ring-clay outline-none"
            />
          </label>

          {error && <p className="text-xs text-brick">{error}</p>}

          <div className="flex justify-end gap-2 pt-2 border-t border-granite-soft">
            <Button size="sm" variant="ghost" onClick={onClose} disabled={submitting}>
              {bn ? 'বাতিল' : 'Cancel'}
            </Button>
            <Button size="sm" variant="primary" onClick={submit} loading={submitting} disabled={!TRX_RE.test(trxId)}>
              <Send className="h-3.5 w-3.5 mr-1.5" />
              {bn ? 'পেমেন্ট রেকর্ড করুন' : 'Record Payout'}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
