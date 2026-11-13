import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Calendar, ArrowLeft, MessageSquare, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
import { useLang } from '../../context/LanguageContext';
import { getStatuteBySlug } from '../../lib/api';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Skeleton, ErrorState } from '../../components/ui/EmptyState';
import { Button } from '../../components/ui/Button';
import type { Statute } from '../../mocks/types';

export default function StatuteDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { lang } = useLang();
  const [statute, setStatute] = useState<Statute | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (slug) {
      getStatuteBySlug(slug).then((data) => {
        setStatute(data || null);
        setLoading(false);
      });
    }
  }, [slug]);

  const toggleSection = (id: string) => {
    setExpandedSections((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  if (loading) {
    return (
      <div className="py-12 shell space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!statute) {
    return (
      <div className="py-12 shell">
        <ErrorState
          title="Statute Not Found"
          message="The requested statutory act could not be found in our indexed corpus."
        />
        <Link to="/statutes" className="inline-flex items-center gap-1.5 text-xs text-clay-deep mt-4">
          <ArrowLeft className="h-4 w-4" />
          <span>Back to statute library</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="py-12 sm:py-16">
      <div className="shell">
        {/* Back breadcrumb */}
        <Link
          to="/statutes"
          className="inline-flex items-center gap-1.5 text-xs font-mono uppercase text-clay-deep hover:text-ink transition mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>{lang === 'bn' ? 'সকল আইনে ফিরুন' : 'Back to Statutes'}</span>
        </Link>

        {/* Statute Header */}
        <div className="rounded border border-granite bg-white p-6 sm:p-8 shadow-sm mb-8">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-granite-soft pb-4 mb-4">
            <div className="flex items-center gap-3">
              <span className="font-mono text-sm font-bold text-clay-deep">{statute.year}</span>
              <StatusBadge status={statute.status} />
            </div>
            <div className="flex items-center gap-2 text-xs font-mono text-granite">
              <Calendar className="h-3.5 w-3.5" />
              <span>
                {lang === 'bn' ? 'সর্বশেষ পর্যালোচনা:' : 'Last Reviewed:'} {statute.lastReviewed}
              </span>
            </div>
          </div>

          <h1 className="font-display text-2xl sm:text-3xl font-bold text-ink">
            {lang === 'bn' ? statute.titleBn : statute.titleEn}
          </h1>

          <p className="mt-3 text-body text-ink-soft max-w-prose">
            {lang === 'bn' ? statute.descriptionBn : statute.descriptionEn}
          </p>

          {/* Amendment Notice if applicable */}
          {(statute.amendmentNoticeBn || statute.amendmentNoticeEn) && (
            <div className="mt-4 flex items-start gap-2.5 rounded bg-bone-deep p-3 text-xs border border-granite-soft">
              <AlertTriangle className="h-4 w-4 text-clay-deep shrink-0 mt-0.5" />
              <p className="text-ink-soft">
                {lang === 'bn' ? statute.amendmentNoticeBn : statute.amendmentNoticeEn}
              </p>
            </div>
          )}
        </div>

        {/* Two column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left sticky sections index */}
          <div className="lg:col-span-4">
            <div className="sticky top-20 rounded border border-granite bg-white p-5 shadow-sm space-y-4">
              <div className="border-b border-granite-soft pb-2">
                <h3 className="font-mono text-label uppercase text-clay-deep font-semibold">
                  {lang === 'bn' ? 'ধারা সূচি' : 'Sections Index'}
                </h3>
              </div>

              <nav className="space-y-1 max-h-[60vh] overflow-y-auto pr-1">
                {(statute.sections || []).map((sec) => (
                  <a
                    key={sec.id}
                    href={`#${sec.id}`}
                    className="block rounded p-2 text-xs text-ink-soft hover:bg-bone-deep transition"
                  >
                    <span className="font-mono font-semibold text-clay-deep">{sec.sectionNumber}</span>
                    <p className="truncate text-ink mt-0.5">{lang === 'bn' ? sec.titleBn : sec.titleEn}</p>
                  </a>
                ))}
                {(!statute.sections || statute.sections.length === 0) && (
                  <p className="text-xs text-granite py-4">
                    {lang === 'bn' ? 'বিস্তারিত ধারা ইনডেক্সিং চলছে।' : 'Sections indexing in progress.'}
                  </p>
                )}
              </nav>

              <div className="pt-2 border-t border-granite-soft">
                <Link to="/app/chat">
                  <Button size="sm" variant="secondary" className="w-full justify-center">
                    <MessageSquare className="mr-1.5 h-3.5 w-3.5" />
                    <span>{lang === 'bn' ? 'এই আইন নিয়ে প্রশ্ন করুন' : 'Ask Question on this Act'}</span>
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          {/* Right Section Content */}
          <div className="lg:col-span-8 space-y-6">
            {(statute.sections || []).map((sec) => {
              const isExpanded = expandedSections[sec.id] || false;
              return (
                <article
                  key={sec.id}
                  id={sec.id}
                  className="scroll-mt-24 rounded border border-granite bg-white p-6 shadow-sm space-y-4"
                >
                  <div className="flex items-center justify-between border-b border-granite-soft pb-3">
                    <div>
                      <span className="font-mono text-xs font-bold text-clay-deep">
                        {sec.sectionNumber}
                      </span>
                      <h2 className="font-display text-base font-bold text-ink mt-0.5">
                        {lang === 'bn' ? sec.titleBn : sec.titleEn}
                      </h2>
                    </div>
                  </div>

                  {/* Plain Language Interpretation */}
                  <div className="rounded bg-clay-tint/50 p-4 border border-clay/20">
                    <span className="font-mono text-[10px] uppercase text-clay-deep font-semibold block mb-1">
                      {lang === 'bn' ? 'সহজ ভাষায় অর্থ (Plain Language Meaning)' : 'Plain Language Interpretation'}
                    </span>
                    <p className="text-sm text-ink-soft leading-relaxed">
                      {lang === 'bn' ? sec.plainMeaningBn : sec.plainMeaningEn}
                    </p>
                  </div>

                  {/* Expandable Statutory Text */}
                  <div>
                    <button
                      onClick={() => toggleSection(sec.id)}
                      className="flex items-center justify-between w-full text-left py-2 text-xs font-mono text-granite hover:text-ink transition border-t border-granite-soft"
                    >
                      <span className="uppercase">
                        {lang === 'bn' ? 'আইনের মূল পাঠ্য (Original Statutory Text)' : 'Original Statutory Text'}
                      </span>
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>

                    {isExpanded && (
                      <div className="mt-2 p-3 bg-bone rounded text-xs font-body text-ink leading-relaxed whitespace-pre-line border border-granite-soft">
                        {lang === 'bn' ? sec.contentBn : sec.contentEn}
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
