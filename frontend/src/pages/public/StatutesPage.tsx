import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, BookOpen, ArrowRight, Filter } from 'lucide-react';
import { useLang } from '../../context/LanguageContext';
import { listStatutes } from '../../lib/api';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Skeleton } from '../../components/ui/EmptyState';
import type { Statute, StatuteStatus } from '../../mocks/types';

export default function StatutesPage() {
  const { lang, num } = useLang();
  const [statutes, setStatutes] = useState<Statute[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatuteStatus | 'all'>('all');

  useEffect(() => {
    listStatutes().then((data) => {
      setStatutes(data);
      setLoading(false);
    });
  }, []);

  const filtered = statutes.filter((s) => {
    const matchesSearch =
      s.titleBn.toLowerCase().includes(search.toLowerCase()) ||
      s.titleEn.toLowerCase().includes(search.toLowerCase()) ||
      s.descriptionBn.toLowerCase().includes(search.toLowerCase()) ||
      s.descriptionEn.toLowerCase().includes(search.toLowerCase()) ||
      s.topics.some((t) => t.toLowerCase().includes(search.toLowerCase())) ||
      s.topicsBn.some((t) => t.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="py-12 sm:py-16">
      <div className="shell">
        {/* Header */}
        <div className="max-w-3xl mb-12">
          <span className="font-mono text-label uppercase tracking-wider text-clay-deep">
            {lang === 'bn' ? 'আইন সংকলন লাইব্রেরি' : 'Statute & Code Library'}
          </span>
          <h1 className="font-display text-display font-bold text-ink mt-2">
            {lang === 'bn' ? 'বাংলাদেশের প্রণীত আইন ও ধারা' : 'Codified Bangladeshi Statutes'}
          </h1>
          <p className="mt-3 text-body text-ink-soft">
            {lang === 'bn'
              ? 'আইনি সহায়কের ভেক্টর ডেটাবেসে সংরক্ষিত ও কার্যকর আইনসমূহের সূচি। প্রতিটি আইনের মূল ধারা, সহজ ব্যাখ্যা ও প্রয়োগক্ষেত্র পর্যালোচনা করুন।'
              : 'Browse our vectorized statute corpus. Inspect legal sections, plain-language glosses, and verify citations.'}
          </p>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col sm:flex-row items-center gap-4 mb-8 bg-white p-4 rounded border border-granite shadow-sm">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-granite" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={
                lang === 'bn'
                  ? 'আইনের নাম বা বিষয় খুঁজুন (যেমন: বাড়িভাড়া, সাইবার, যৌতুক)...'
                  : 'Search by statute title or keyword (e.g. rent, cyber, dowry)...'
              }
              className="w-full pl-9 pr-4 py-2 text-sm rounded border border-granite-soft focus:border-clay focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
            <Filter className="h-4 w-4 text-granite shrink-0 hidden sm:inline" />
            {(['all', 'live', 'indexing', 'planned'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`rounded px-3 py-1.5 font-mono text-xs uppercase tracking-wider transition shrink-0 ${
                  statusFilter === st
                    ? 'bg-clay text-white font-semibold'
                    : 'bg-bone-deep text-ink-soft hover:bg-clay-tint'
                }`}
              >
                {st === 'all'
                  ? lang === 'bn'
                    ? 'সকল'
                    : 'All'
                  : st === 'live'
                  ? lang === 'bn'
                    ? 'সক্রিয় (Live)'
                    : 'Live'
                  : st === 'indexing'
                  ? lang === 'bn'
                    ? 'ইনডেক্সিং'
                    : 'Indexing'
                  : lang === 'bn'
                  ? 'পরিকল্পিত'
                  : 'Planned'}
              </button>
            ))}
          </div>
        </div>

        {/* Grid of Statutes */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="p-6 rounded border border-granite bg-white space-y-3">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((statute) => {
              const isPlanned = statute.status !== 'live';
              return (
                <div
                  key={statute.id}
                  className={`flex flex-col justify-between rounded border bg-white p-6 shadow-sm transition ${
                    isPlanned
                      ? 'border-granite-soft opacity-85'
                      : 'border-granite hover:border-clay hover:-translate-y-0.5'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between border-b border-granite-soft pb-3 mb-3">
                      <span className="font-mono text-xs font-bold text-clay-deep">{statute.year}</span>
                      <StatusBadge status={statute.status} />
                    </div>

                    <h2 className="font-display text-base font-bold text-ink">
                      {lang === 'bn' ? statute.titleBn : statute.titleEn}
                    </h2>

                    <p className="mt-2 text-xs text-ink-soft leading-relaxed line-clamp-3">
                      {lang === 'bn' ? statute.descriptionBn : statute.descriptionEn}
                    </p>

                    {/* Topic Chips */}
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {(lang === 'bn' ? statute.topicsBn : statute.topics).map((topic, idx) => (
                        <span
                          key={idx}
                          className="rounded bg-bone-deep px-2 py-0.5 text-[10px] font-mono text-ink-soft border border-granite-soft"
                        >
                          {topic}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-granite-soft flex items-center justify-between">
                    <span className="font-mono text-xs text-granite">
                      {num(statute.sectionCount)} {lang === 'bn' ? 'ধারা' : 'Sections'}
                    </span>

                    {isPlanned ? (
                      <span className="font-mono text-[11px] text-granite">
                        {lang === 'bn' ? 'প্রক্রিয়াধীন' : 'Under preparation'}
                      </span>
                    ) : (
                      <Link
                        to={`/statutes/${statute.slug}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-clay-deep hover:text-ink transition"
                      >
                        <span>{lang === 'bn' ? 'ধারা ও বিবরণ' : 'Inspect Sections'}</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
