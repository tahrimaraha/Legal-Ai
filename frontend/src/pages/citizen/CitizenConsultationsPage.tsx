import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, UserCheck } from 'lucide-react';
import { useLang } from '../../context/LanguageContext';
import { listConsultations } from '../../lib/api';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Skeleton, EmptyState } from '../../components/ui/EmptyState';
import type { ConsultationRequest } from '../../mocks/types';

export default function CitizenConsultationsPage() {
  const { lang, num } = useLang();
  const [consultations, setConsultations] = useState<ConsultationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusTab, setStatusTab] = useState<'all' | 'active' | 'completed'>('all');

  useEffect(() => {
    listConsultations().then((data) => {
      setConsultations(data);
      setLoading(false);
    });
  }, []);

  const filtered = consultations.filter((c) => {
    if (statusTab === 'active') return c.status === 'requested' || c.status === 'accepted' || c.status === 'scheduled';
    if (statusTab === 'completed') return c.status === 'completed' || c.status === 'declined' || c.status === 'cancelled';
    return true;
  });

  return (
    <div className="space-y-6 font-body">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">
            {lang === 'bn' ? 'আমার পরামর্শসমূহ (Consultations)' : 'My Consultations'}
          </h1>
          <p className="mt-1 text-xs text-granite">
            {lang === 'bn'
              ? 'আইনজীবীদের সাথে আপনার সকল অনুরোধকৃত ও নির্ধারিত পরামর্শের তালিকা'
              : 'Track upcoming scheduled sessions, notes, and shared case files'}
          </p>
        </div>
        <Link to="/app/lawyers">
          <button className="px-3 py-1.5 bg-clay text-white rounded text-xs font-semibold uppercase tracking-wider hover:bg-clay-deep transition">
            {lang === 'bn' ? 'নতুন পরামর্শ বুক করুন' : 'Book New Advocate'}
          </button>
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-granite-soft pb-2">
        {(['all', 'active', 'completed'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setStatusTab(tab)}
            className={`px-3 py-1 text-xs font-mono uppercase tracking-wider rounded transition ${
              statusTab === tab
                ? 'bg-clay text-white font-bold'
                : 'text-ink-soft hover:bg-bone-deep'
            }`}
          >
            {tab === 'all'
              ? lang === 'bn'
                ? 'সকল'
                : 'All'
              : tab === 'active'
              ? lang === 'bn'
                ? 'চলমান / নির্ধারিত'
                : 'Active / Scheduled'
              : lang === 'bn'
              ? 'সম্পন্ন'
              : 'Completed'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title={lang === 'bn' ? 'কোনো পরামর্শ রেকর্ড পাওয়া যায়নি' : 'No Consultations Found'}
          description={lang === 'bn' ? 'আইনজীবী ডিরেক্টরি থেকে যেকোনো বিশেষজ্ঞের সাথে পরামর্শ বুক করতে পারেন।' : 'Browse our verified lawyer directory to schedule a session.'}
          actionLabel={lang === 'bn' ? 'আইনজীবী তালিকা দেখুন' : 'Explore Advocates'}
          onAction={() => window.location.assign('/app/lawyers')}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((c) => (
            <Link
              key={c.id}
              to={`/app/consultations/${c.id}`}
              className="rounded border border-granite bg-white p-5 shadow-sm hover:border-clay hover:-translate-y-0.5 transition flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] text-granite">
                    {new Date(c.createdAt).toLocaleDateString()}
                  </span>
                  <StatusBadge status={c.status} />
                </div>

                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded bg-clay-tint border border-clay flex items-center justify-center shrink-0">
                    <UserCheck className="h-5 w-5 text-clay-deep" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-display text-sm font-bold text-ink truncate">
                      {lang === 'bn' ? c.topicBn : c.topicEn}
                    </h3>
                    <p className="text-xs text-clay-deep font-semibold truncate">
                      {lang === 'bn' ? c.lawyerNameBn : c.lawyerName}
                    </p>
                  </div>
                </div>

                <div className="rounded bg-bone p-2.5 text-xs text-ink-soft flex items-center justify-between font-mono">
                  <span className="uppercase">Mode: {c.mode}</span>
                  <span className="font-bold text-ink">৳{num(c.feeBdt)} BDT</span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-granite-soft flex items-center justify-between text-xs">
                <span className="font-mono text-[10px] text-granite">
                  {c.scheduledSlot ? `${c.scheduledSlot.date} at ${c.scheduledSlot.time}` : 'Awaiting Schedule'}
                </span>
                <span className="text-clay-deep font-semibold flex items-center gap-1">
                  {lang === 'bn' ? 'টাইমলাইন ও বিবরণ' : 'View Timeline'} <ArrowRight className="h-3 w-3" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
