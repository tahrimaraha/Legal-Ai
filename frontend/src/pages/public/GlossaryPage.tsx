import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, BookOpen, MessageSquare, ArrowRight } from 'lucide-react';
import { useLang } from '../../context/LanguageContext';
import { searchGlossary } from '../../lib/api';
import { Skeleton } from '../../components/ui/EmptyState';
import type { GlossaryTerm } from '../../mocks/types';

export default function GlossaryPage() {
  const { lang } = useLang();
  const [terms, setTerms] = useState<GlossaryTerm[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [selectedLetter, setSelectedLetter] = useState<string>('all');

  useEffect(() => {
    searchGlossary(query).then((data) => {
      setTerms(data);
      setLoading(false);
    });
  }, [query]);

  // Bengali Varnamala & Latin alphabet rails
  const bnLetters = ['সকল', 'অ', 'আ', 'ই', 'এ', 'ক', 'গ', 'চ', 'জ', 'ত', 'দ', 'ধ', 'ন', 'প', 'ফ', 'ব', 'ভ', 'ম', 'য', 'র', 'ল', 'শ', 'স', 'হ'];
  const enLetters = ['ALL', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'R', 'S', 'T', 'U', 'V', 'W'];

  const filteredTerms = terms.filter((term) => {
    if (selectedLetter === 'all' || selectedLetter === 'সকল' || selectedLetter === 'ALL') return true;
    if (lang === 'bn') {
      return term.termBn.startsWith(selectedLetter);
    }
    return term.termEn.toUpperCase().startsWith(selectedLetter);
  });

  return (
    <div className="py-12 sm:py-16">
      <div className="shell">
        {/* Header */}
        <div className="max-w-3xl mb-10">
          <span className="font-mono text-label uppercase tracking-wider text-clay-deep">
            {lang === 'bn' ? 'আইনি পরিভাষা কোষ' : 'Plain Language Legal Glossary'}
          </span>
          <h1 className="font-display text-display font-bold text-ink mt-2">
            {lang === 'bn' ? 'কঠিন আইনি শব্দের সহজ অর্থ' : 'Legal Terms Without the Jargon'}
          </h1>
          <p className="mt-3 text-body text-ink-soft">
            {lang === 'bn'
              ? 'আদালত ও মামলার জটিল পরিভাষাসমূহ সাধারণ নাগরিকের বোধগম্য ভাষায় ব্যাখ্যা এবং সংশ্লিষ্ট আইনের বিধান।'
              : 'Search everyday Bangladeshi legal terminology, police procedures, and court orders translated into clear language.'}
          </p>
        </div>

        {/* Search Input */}
        <div className="mb-6 max-w-xl">
          <div className="relative">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-granite" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={
                lang === 'bn'
                  ? 'শব্দ বা পরিভাষা খুঁজুন (যেমন: দেনমোহর, জিডি, এজাহার, ইনজাংশন)...'
                  : 'Search term or concept (e.g. dower, GD, FIR, injunction)...'
              }
              className="w-full pl-10 pr-4 py-2.5 rounded border border-granite bg-white text-sm focus:border-clay focus:outline-none shadow-sm"
            />
          </div>
        </div>

        {/* Alphabet filter rail */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-3 mb-8 border-b border-granite-soft">
          {(lang === 'bn' ? bnLetters : enLetters).map((letter) => {
            const isAll = letter === 'সকল' || letter === 'ALL';
            const isActive = isAll ? selectedLetter === 'all' : selectedLetter === letter;
            return (
              <button
                key={letter}
                onClick={() => setSelectedLetter(isAll ? 'all' : letter)}
                className={`flex h-8 min-w-[32px] items-center justify-center rounded px-2 font-mono text-xs uppercase transition ${
                  isActive
                    ? 'bg-clay text-white font-bold'
                    : 'bg-white text-ink-soft border border-granite-soft hover:bg-bone-deep'
                }`}
              >
                {letter}
              </button>
            );
          })}
        </div>

        {/* Glossary Terms Cards */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="p-6 rounded border border-granite bg-white space-y-3">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-16 w-full" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredTerms.map((term) => (
              <div
                key={term.id}
                className="flex flex-col justify-between rounded border border-granite bg-white p-6 shadow-sm hover:border-clay transition"
              >
                <div>
                  <div className="flex items-center justify-between border-b border-granite-soft pb-3 mb-3">
                    <h2 className="font-display text-base font-bold text-ink">
                      {lang === 'bn' ? term.termBn : term.termEn}
                    </h2>
                    <span className="font-mono text-[10px] uppercase bg-bone-deep text-clay-deep px-2 py-0.5 rounded border border-granite-soft">
                      {term.section}
                    </span>
                  </div>

                  {/* Plain Language meaning */}
                  <p className="text-sm text-ink-soft leading-relaxed">
                    {lang === 'bn' ? term.plainBn : term.plainEn}
                  </p>

                  {/* Example / Usage */}
                  {(term.exampleBn || term.exampleEn) && (
                    <div className="mt-3 rounded bg-bone p-3 text-xs text-ink-soft border border-granite-soft/80">
                      <span className="font-mono text-[10px] uppercase text-clay-deep font-semibold block mb-0.5">
                        {lang === 'bn' ? 'ব্যবহারিক উদাহরণ' : 'Practical Context'}
                      </span>
                      {lang === 'bn' ? term.exampleBn : term.exampleEn}
                    </div>
                  )}
                </div>

                <div className="mt-6 pt-3 border-t border-granite-soft flex items-center justify-between">
                  <span className="text-xs font-mono text-granite">
                    {lang === 'bn' ? term.sourceTitleBn : term.sourceTitleEn}
                  </span>
                  <Link
                    to="/app/chat"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-clay-deep hover:text-ink transition"
                  >
                    <span>{lang === 'bn' ? 'এই বিষয়ে প্রশ্ন করুন' : 'Ask about this'}</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
