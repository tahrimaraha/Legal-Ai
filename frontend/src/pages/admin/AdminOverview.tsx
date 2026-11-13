import { useState, useEffect } from 'react';
import { Users, ShieldCheck, Database, HelpCircle } from 'lucide-react';
import { useLang } from '../../context/LanguageContext';
import { getAdminStats } from '../../lib/api';
import { StatCard } from '../../components/ui/StatCard';
import { Skeleton } from '../../components/ui/EmptyState';
import type { AdminStats } from '../../mocks/types';

export default function AdminOverview() {
  const { lang, num } = useLang();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAdminStats().then((data) => {
      setStats(data);
      setLoading(false);
    });
  }, []);

  if (loading || !stats) {
    return <div className="space-y-6"><Skeleton className="h-10 w-48" /><Skeleton className="h-96 w-full" /></div>;
  }

  const maxWeekly = Math.max(...stats.weeklyQuestions.map((w) => w.count));

  return (
    <div className="space-y-8 font-body">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink">
          {lang === 'bn' ? 'সিস্টেম অ্যাডমিন ওভারভিউ' : 'System Administration & Metrics'}
        </h1>
        <p className="mt-1 text-xs text-granite">
          {lang === 'bn'
            ? 'প্ল্যাটফর্ম ব্যবহারকারী, প্রশ্ন ট্র্যাফিক, ভেক্টর করপাস স্থিতি ও যাচাই স্বাস্থ্য'
            : 'Platform analytics, query volume, vector index status and advocate queue audit'}
        </p>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Registered Citizens"
          value={num(stats.totalCitizens)}
          sub="Active legal search users"
          icon={Users}
        />
        <StatCard
          label="Verified Advocates"
          value={num(stats.totalLawyers)}
          sub={`${num(stats.pendingLawyers)} awaiting Bar audit`}
          trend={stats.pendingLawyers ? `+${num(stats.pendingLawyers)} Pending` : undefined}
          icon={ShieldCheck}
        />
        <StatCard
          label="Questions Asked (This Week)"
          value={num(stats.questionsAskedThisWeek)}
          sub={`${num(stats.questionsTotal)} all-time inquiries`}
          icon={HelpCircle}
        />
        <StatCard
          label="Corpus Embedding Health"
          value={`${stats.corpusHealthPct}%`}
          sub={`${num(stats.indexedStatutesCount)} Codified Acts live`}
          icon={Database}
        />
      </div>

      {/* Visual Chart Bars: Weekly Inquiries Volume & Category Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Weekly Traffic Chart (span-7) */}
        <div className="lg:col-span-7 rounded border border-granite bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-granite-soft pb-3">
            <h2 className="font-mono text-label uppercase text-clay-deep font-semibold">
              Weekly Question Query Volume
            </h2>
            <span className="font-mono text-xs text-granite">Past 7 Days</span>
          </div>

          <div className="h-56 flex items-end justify-between gap-3 pt-8 px-2">
            {stats.weeklyQuestions.map((d) => {
              const heightPct = Math.round((d.count / maxWeekly) * 100);
              return (
                <div key={d.day} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                  <span className="font-mono text-[10px] text-granite font-bold">{num(d.count)}</span>
                  <div
                    style={{ height: `${heightPct}%` }}
                    className="w-full max-w-[36px] bg-clay rounded-t hover:bg-clay-deep transition-all"
                  />
                  <span className="font-mono text-[11px] text-ink font-semibold">{d.day}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Category Breakdown (span-5) */}
        <div className="lg:col-span-5 rounded border border-granite bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-granite-soft pb-3">
            <h2 className="font-mono text-label uppercase text-clay-deep font-semibold">
              Statutory Topic Distribution
            </h2>
          </div>

          <div className="space-y-3 pt-1">
            {stats.categoryBreakdown.map((cat) => {
              const totalCategory = stats.categoryBreakdown.reduce((acc, c) => acc + c.count, 0);
              const pct = Math.round((cat.count / totalCategory) * 100);
              return (
                <div key={cat.category} className="space-y-1 text-xs">
                  <div className="flex justify-between font-medium">
                    <span className="text-ink">{lang === 'bn' ? cat.categoryBn : cat.category}</span>
                    <span className="font-mono text-granite">{num(cat.count)} ({pct}%)</span>
                  </div>
                  <div className="w-full bg-bone-deep rounded-full h-1.5 overflow-hidden">
                    <div style={{ width: `${pct}%` }} className="bg-clay-deep h-1.5 rounded-full" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
