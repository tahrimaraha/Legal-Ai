import { useState, useEffect, useMemo } from 'react';
import { Upload, CheckCircle2, FileText, Search, X, SlidersHorizontal } from 'lucide-react';
import { useLang } from '../../context/LanguageContext';
import { ApiError, listCorpus, uploadCorpusDocument } from '../../lib/api';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/EmptyState';
import type { CorpusDocument } from '../../mocks/types';

type SortKey = 'newest' | 'oldest' | 'sections' | 'title';
const PAGE = 50;
const SOURCE_LABEL: Record<string, { en: string; bn: string }> = {
  'acts-json': { en: 'Acts dataset (JSON)', bn: 'আইন ডেটাসেট (JSON)' },
  'core-json': { en: 'Core Acts (structured)', bn: 'মূল আইন (কাঠামোবদ্ধ)' },
  csv: { en: 'Sections CSV', bn: 'ধারা CSV' },
};

/** Bengali digits -> ASCII so "2018" and "২০১৮" match the same titles and years. */
const normDigits = (s: string) => s.replace(/[০-৯]/g, (d) => String('০১২৩৪৫৬৭৮৯'.indexOf(d)));

const selectCls =
  'h-9 rounded border border-granite bg-white px-2.5 text-xs text-ink focus:border-clay-deep focus:outline-none focus:ring-2 focus:ring-clay/20';

export default function AdminCorpusManager() {
  const { lang, num } = useLang();
  const bn = lang === 'bn';
  const [documents, setDocuments] = useState<CorpusDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // filters
  const [query, setQuery] = useState('');
  const [language, setLanguage] = useState<'all' | 'bn' | 'en'>('all');
  const [status, setStatus] = useState<'all' | 'in_force' | 'repealed'>('all');
  const [source, setSource] = useState('all');
  const [yearFrom, setYearFrom] = useState('');
  const [yearTo, setYearTo] = useState('');
  const [sort, setSort] = useState<SortKey>('newest');
  const [shown, setShown] = useState(PAGE);

  useEffect(() => {
    listCorpus()
      .then(setDocuments)
      .catch(() => setToastMessage(bn ? 'আইনের তালিকা লোড করা যায়নি।' : 'Could not load the corpus.'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sources = useMemo(() => Array.from(new Set(documents.map((d) => d.source).filter(Boolean))) as string[], [documents]);
  const years = useMemo(() => documents.map((d) => d.year).filter((y): y is number => typeof y === 'number'), [documents]);
  const minYear = years.length ? Math.min(...years) : 0;
  const maxYear = years.length ? Math.max(...years) : 0;

  const filtered = useMemo(() => {
    const q = normDigits(query.trim().toLowerCase());
    const yf = parseInt(yearFrom, 10);
    const yt = parseInt(yearTo, 10);
    const out = documents.filter((d) => {
      if (q && !normDigits(`${d.statuteTitleEn} ${d.statuteTitleBn} ${d.actNo ?? ''} ${d.year ?? ''}`.toLowerCase()).includes(q)) return false;
      if (language !== 'all' && d.lang !== language) return false;
      if (status === 'in_force' && d.repealed) return false;
      if (status === 'repealed' && !d.repealed) return false;
      if (source !== 'all' && d.source !== source) return false;
      if (!Number.isNaN(yf) && (d.year ?? -Infinity) < yf) return false;
      if (!Number.isNaN(yt) && (d.year ?? Infinity) > yt) return false;
      return true;
    });
    const title = (d: CorpusDocument) => (bn ? d.statuteTitleBn : d.statuteTitleEn) || '';
    out.sort((a, b) => {
      if (sort === 'oldest') return (a.year ?? 9999) - (b.year ?? 9999);
      if (sort === 'sections') return b.chunks - a.chunks;
      if (sort === 'title') return title(a).localeCompare(title(b), bn ? 'bn' : 'en');
      return (b.year ?? 0) - (a.year ?? 0);
    });
    return out;
  }, [documents, query, language, status, source, yearFrom, yearTo, sort, bn]);

  useEffect(() => setShown(PAGE), [query, language, status, source, yearFrom, yearTo, sort]);

  const active = query || language !== 'all' || status !== 'all' || source !== 'all' || yearFrom || yearTo;
  const resetFilters = () => {
    setQuery('');
    setLanguage('all');
    setStatus('all');
    setSource('all');
    setYearFrom('');
    setYearTo('');
    setSort('newest');
  };
  const totalSections = filtered.reduce((s, d) => s + d.chunks, 0);

  const handleSimulatedUpload = async () => {
    const fileName = prompt('Enter PDF file name to ingest into vector corpus:', 'Labour_Act_2006_Codified.pdf');
    if (!fileName) return;
    setUploading(true);
    try {
      const newDoc = await uploadCorpusDocument({
        name: fileName,
        statuteId: 'labour-act-2006',
        sizeMb: 3.4,
      });
      setDocuments((prev) => [newDoc, ...prev]);
      setToastMessage(`Document ${fileName} ingested into vector store.`);
      setTimeout(() => setToastMessage(''), 3000);
    } catch (err) {
      setToastMessage(err instanceof ApiError ? (bn ? err.messageBn : err.message) : 'Upload failed');
      setTimeout(() => setToastMessage(''), 8000);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6 font-body">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">
            {bn ? 'আইন সংকলন ও ভেক্টর করপাস ম্যানেজার' : 'Statute Corpus & Vector Index Manager'}
          </h1>
          <p className="mt-1 text-xs text-granite">
            {bn
              ? `${num(documents.length)}টি আইন · ${num(documents.reduce((s, d) => s + d.chunks, 0))}টি ধারা — এআই সহায়ক এগুলো থেকে উত্তর খোঁজে`
              : `${documents.length.toLocaleString()} Acts · ${documents.reduce((s, d) => s + d.chunks, 0).toLocaleString()} sections the AI assistant searches`}
          </p>
        </div>

        <Button size="sm" variant="secondary" onClick={handleSimulatedUpload} loading={uploading}>
          <Upload className="mr-1.5 h-3.5 w-3.5" />
          <span>Upload Statute PDF</span>
        </Button>
      </div>

      {toastMessage && (
        <div className="p-3 rounded bg-clay-tint border border-clay text-xs text-clay-deep font-semibold flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Filters */}
      <div className="space-y-3 rounded border border-granite bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2 text-xs font-semibold text-ink">
          <SlidersHorizontal className="h-4 w-4 text-clay-deep" />
          {bn ? 'ফিল্টার' : 'Filters'}
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-granite" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={bn ? 'আইনের নাম (বাংলা বা ইংরেজি), আইন নম্বর বা সাল দিয়ে খুঁজুন' : 'Search by Act title (Bengali or English), Act number or year'}
            aria-label={bn ? 'আইন খুঁজুন' : 'Search Acts'}
            className="h-10 w-full rounded border border-granite bg-white pl-9 pr-3 text-sm text-ink placeholder:text-granite focus:border-clay-deep focus:outline-none focus:ring-2 focus:ring-clay/20"
          />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          <label className="space-y-1 text-[11px] text-granite">
            <span>{bn ? 'ভাষা' : 'Language'}</span>
            <select value={language} onChange={(e) => setLanguage(e.target.value as typeof language)} className={`${selectCls} w-full`}>
              <option value="all">{bn ? 'সব ভাষা' : 'All languages'}</option>
              <option value="bn">বাংলা</option>
              <option value="en">English</option>
            </select>
          </label>
          <label className="space-y-1 text-[11px] text-granite">
            <span>{bn ? 'অবস্থা' : 'Status'}</span>
            <select value={status} onChange={(e) => setStatus(e.target.value as typeof status)} className={`${selectCls} w-full`}>
              <option value="all">{bn ? 'সব' : 'All'}</option>
              <option value="in_force">{bn ? 'বলবৎ' : 'In force'}</option>
              <option value="repealed">{bn ? 'রহিত' : 'Repealed'}</option>
            </select>
          </label>
          <label className="space-y-1 text-[11px] text-granite">
            <span>{bn ? 'উৎস' : 'Source'}</span>
            <select value={source} onChange={(e) => setSource(e.target.value)} className={`${selectCls} w-full`}>
              <option value="all">{bn ? 'সব উৎস' : 'All sources'}</option>
              {sources.map((s) => (
                <option key={s} value={s}>{SOURCE_LABEL[s] ? (bn ? SOURCE_LABEL[s].bn : SOURCE_LABEL[s].en) : s}</option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-[11px] text-granite">
            <span>{bn ? 'সাল থেকে' : 'Year from'}</span>
            <input type="number" inputMode="numeric" min={minYear} max={maxYear} value={yearFrom} placeholder={String(minYear || '')}
              onChange={(e) => setYearFrom(e.target.value)} className={`${selectCls} w-full`} />
          </label>
          <label className="space-y-1 text-[11px] text-granite">
            <span>{bn ? 'সাল পর্যন্ত' : 'Year to'}</span>
            <input type="number" inputMode="numeric" min={minYear} max={maxYear} value={yearTo} placeholder={String(maxYear || '')}
              onChange={(e) => setYearTo(e.target.value)} className={`${selectCls} w-full`} />
          </label>
          <label className="space-y-1 text-[11px] text-granite">
            <span>{bn ? 'সাজান' : 'Sort by'}</span>
            <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className={`${selectCls} w-full`}>
              <option value="newest">{bn ? 'নতুন আগে' : 'Newest first'}</option>
              <option value="oldest">{bn ? 'পুরনো আগে' : 'Oldest first'}</option>
              <option value="sections">{bn ? 'বেশি ধারা আগে' : 'Most sections'}</option>
              <option value="title">{bn ? 'নাম (ক–হ / A–Z)' : 'Title (A–Z)'}</option>
            </select>
          </label>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-granite-soft pt-3 text-xs text-granite">
          <span aria-live="polite">
            {loading
              ? bn ? 'লোড হচ্ছে…' : 'Loading…'
              : bn
              ? `${num(documents.length)}টির মধ্যে ${num(filtered.length)}টি আইন দেখানো হচ্ছে · ${num(totalSections)}টি ধারা`
              : `Showing ${filtered.length.toLocaleString()} of ${documents.length.toLocaleString()} Acts · ${totalSections.toLocaleString()} sections`}
          </span>
          {active && (
            <button type="button" onClick={resetFilters} className="inline-flex items-center gap-1 font-semibold text-clay-deep hover:underline">
              <X className="h-3.5 w-3.5" />
              {bn ? 'ফিল্টার মুছুন' : 'Clear filters'}
            </button>
          )}
        </div>
      </div>

      {/* Acts table */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded border border-granite bg-white p-10 text-center text-sm text-granite">
          {documents.length === 0
            ? bn ? 'আইনের ডেটাবেস এখনও তৈরি হয়নি।' : 'The legal corpus has not been built yet.'
            : bn ? 'এই ফিল্টারে কোনো আইন পাওয়া যায়নি।' : 'No Acts match these filters.'}
          {active && (
            <button type="button" onClick={resetFilters} className="ml-2 font-semibold text-clay-deep hover:underline">
              {bn ? 'ফিল্টার মুছুন' : 'Clear filters'}
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="border border-granite rounded bg-white shadow-sm overflow-x-auto">
            <table className="w-full min-w-[760px] text-xs text-left border-collapse">
              <thead className="bg-bone-deep border-b border-granite font-mono uppercase text-clay-deep">
                <tr>
                  <th className="p-3">{bn ? 'আইনের নাম' : 'Statute title'}</th>
                  <th className="p-3 text-center">{bn ? 'সাল' : 'Year'}</th>
                  <th className="p-3 text-center">{bn ? 'ভাষা' : 'Lang'}</th>
                  <th className="p-3 text-center">{bn ? 'ধারা' : 'Sections'}</th>
                  <th className="p-3">{bn ? 'উৎস' : 'Source'}</th>
                  <th className="p-3">{bn ? 'অবস্থা' : 'Status'}</th>
                  <th className="p-3 text-right">{bn ? 'সর্বশেষ ইনডেক্স' : 'Last indexed'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-granite-soft">
                {filtered.slice(0, shown).map((doc) => {
                  const primary = bn ? doc.statuteTitleBn : doc.statuteTitleEn;
                  const secondary = bn ? doc.statuteTitleEn : doc.statuteTitleBn;
                  return (
                    <tr key={doc.id} className="hover:bg-bone/40 transition">
                      <td className="p-3">
                        <div className="flex items-start gap-2">
                          <FileText className="mt-0.5 h-4 w-4 text-clay-deep shrink-0" />
                          <div className="min-w-0">
                            <p className="font-semibold text-ink">{primary}</p>
                            {secondary && secondary !== primary && <p className="mt-0.5 text-[11px] text-granite">{secondary}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="p-3 text-center font-mono text-ink-soft">{doc.year ? num(doc.year) : '—'}</td>
                      <td className="p-3 text-center">
                        <span className="rounded bg-bone-deep px-1.5 py-0.5 font-mono text-[10px] uppercase text-ink-soft">{doc.lang || '—'}</span>
                      </td>
                      <td className="p-3 text-center font-mono font-bold text-ink">{num(doc.chunks)}</td>
                      <td className="p-3 text-[11px] text-granite">
                        {doc.source && SOURCE_LABEL[doc.source] ? (bn ? SOURCE_LABEL[doc.source].bn : SOURCE_LABEL[doc.source].en) : doc.source || '—'}
                      </td>
                      <td className="p-3">
                        <span
                          className={`inline-flex items-center font-mono uppercase text-[10px] px-2 py-0.5 rounded font-bold ${
                            doc.repealed ? 'bg-brick/15 text-brick' : 'bg-clay-tint text-clay-deep'
                          }`}
                        >
                          {doc.repealed ? (bn ? 'রহিত' : 'Repealed') : bn ? 'বলবৎ · ইনডেক্সড' : 'In force · indexed'}
                        </span>
                      </td>
                      <td className="p-3 text-right font-mono text-granite text-[11px]">
                        {doc.lastIndexed ? new Date(doc.lastIndexed).toLocaleDateString() : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {filtered.length > shown && (
            <div className="text-center">
              <Button size="sm" variant="secondary" onClick={() => setShown((n) => n + PAGE)}>
                {bn
                  ? `আরও দেখুন (${num(Math.min(PAGE, filtered.length - shown))}টি)`
                  : `Show ${Math.min(PAGE, filtered.length - shown)} more`}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
