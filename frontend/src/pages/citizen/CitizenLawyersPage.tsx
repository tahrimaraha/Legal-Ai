import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Search, ArrowRight, UserCheck, Sparkles, X } from 'lucide-react';
import { useLang } from '../../context/LanguageContext';
import { listLawyers, getAiLawyerRecommendations } from '../../lib/api';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Rating } from '../../components/ui/Rating';
import { Button } from '../../components/ui/Button';
import { Skeleton, EmptyState } from '../../components/ui/EmptyState';
import type { LawyerProfile, LawyerRecommendation } from '../../mocks/types';

type SortKey = 'rating' | 'experience' | 'fee_low' | 'reviews';

export default function CitizenLawyersPage() {
  const { lang, num } = useLang();
  const [allLawyers, setAllLawyers] = useState<LawyerProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const [district, setDistrict] = useState('all');
  const [area, setArea] = useState('all');
  const [minRating, setMinRating] = useState('0');
  const [sortKey, setSortKey] = useState<SortKey>('rating');
  const [search, setSearch] = useState('');

  // AI Recommendation
  const [aiQuery, setAiQuery] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResults, setAiResults] = useState<LawyerRecommendation[] | null>(null);

  useEffect(() => {
    listLawyers().then((data) => {
      setAllLawyers(data);
      setLoading(false);
    });
  }, []);

  const districts = useMemo(
    () => Array.from(new Set(allLawyers.map((l) => l.district))).sort(),
    [allLawyers],
  );
  const practiceAreas = useMemo(
    () => Array.from(new Set(allLawyers.flatMap((l) => l.practiceAreas))).sort(),
    [allLawyers],
  );

  const filteredLawyers = useMemo(() => {
    const q = search.trim().toLowerCase();
    const minR = parseFloat(minRating);
    let list = allLawyers.filter((l) => {
      if (district !== 'all' && l.district !== district) return false;
      if (area !== 'all' && !l.practiceAreas.includes(area)) return false;
      if (l.rating < minR) return false;
      if (q) {
        const haystack = `${l.fullName} ${l.fullNameBn} ${l.practiceAreas.join(' ')} ${l.district}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });

    list = [...list].sort((a, b) => {
      switch (sortKey) {
        case 'experience':
          return b.experienceYears - a.experienceYears;
        case 'fee_low':
          return a.startingFeeBdt - b.startingFeeBdt;
        case 'reviews':
          return b.reviewCount - a.reviewCount;
        case 'rating':
        default:
          return b.rating - a.rating;
      }
    });
    return list;
  }, [allLawyers, district, area, minRating, search, sortKey]);

  const handleAiSearch = async () => {
    if (!aiQuery.trim()) return;
    setAiLoading(true);
    try {
      const results = await getAiLawyerRecommendations(aiQuery.trim());
      setAiResults(results);
    } finally {
      setAiLoading(false);
    }
  };

  const renderLawyerCard = (lawyer: LawyerProfile, reason?: string) => (
    <div
      key={lawyer.id}
      className="flex flex-col justify-between rounded border border-granite bg-white p-5 shadow-sm hover:border-clay transition"
    >
      <div>
        <div className="flex items-start gap-3.5 mb-3">
          <div className="h-12 w-12 rounded bg-clay-tint border border-clay flex items-center justify-center shrink-0">
            <UserCheck className="h-6 w-6 text-clay-deep" />
          </div>
          <div className="min-w-0 flex-1">
            <StatusBadge status={lawyer.verificationStatus} />
            <h3 className="font-display text-sm font-bold text-ink mt-1 truncate">
              {lang === 'bn' ? lawyer.fullNameBn : lawyer.fullName}
            </h3>
            <p className="text-[11px] text-granite truncate">{lawyer.district}</p>
          </div>
        </div>

        {reason ? (
          <p className="text-[11px] text-clay-deep bg-clay-tint/50 border border-clay/30 rounded px-2 py-1.5 leading-relaxed">
            <Sparkles className="h-3 w-3 inline mr-1 -mt-0.5" />
            {reason}
          </p>
        ) : (
          <p className="text-xs text-ink-soft line-clamp-2 leading-relaxed">
            {lang === 'bn' ? lawyer.bioBn : lawyer.bioEn}
          </p>
        )}

        <div className="mt-3 flex items-center justify-between text-xs font-mono border-t border-granite-soft pt-2">
          <span className="text-granite">Starting: ৳{num(lawyer.startingFeeBdt)}</span>
          {lawyer.rating > 0 && <Rating value={lawyer.rating} count={lawyer.reviewCount} />}
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-granite-soft">
        <Link to={`/app/lawyers/${lawyer.id}`}>
          <Button size="sm" variant="primary" className="w-full justify-center">
            <span>{lang === 'bn' ? 'পরামর্শের অনুরোধ' : 'Request Consultation'}</span>
            <ArrowRight className="ml-1 h-3.5 w-3.5" />
          </Button>
        </Link>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 font-body">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink">
          {lang === 'bn' ? 'আইনজীবী ডিরেক্টরি ও পরামর্শ বুকিং' : 'Find & Consult Advocates'}
        </h1>
        <p className="mt-1 text-xs text-granite">
          {lang === 'bn'
            ? 'সনদপ্রাপ্ত আইনজীবীদের প্রোফাইল দেখুন এবং সরাসরি পরামর্শের অনুরোধ জানান'
            : 'Explore verified Bar Council practitioners for direct consultation'}
        </p>
      </div>

      {/* AI Lawyer Finder */}
      <div className="rounded border border-clay bg-clay-tint/30 p-5 shadow-sm space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-clay-deep" />
          <h2 className="font-display text-base font-bold text-ink">
            {lang === 'bn' ? 'এআই আইনজীবী সহায়ক' : 'AI Lawyer Finder'}
          </h2>
        </div>
        <p className="text-xs text-ink-soft">
          {lang === 'bn'
            ? 'আপনার সমস্যাটি সংক্ষেপে লিখুন — আমরা সবচেয়ে উপযুক্ত আইনজীবী খুঁজে দেব।'
            : 'Describe your legal issue in a sentence and we’ll match you with the best-fit advocates.'}
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={aiQuery}
            onChange={(e) => setAiQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAiSearch()}
            placeholder={lang === 'bn' ? 'যেমন: বাড়িওয়ালা জোর করে উচ্ছেদ করছেন...' : 'e.g. My landlord is trying to evict me without notice...'}
            className="flex-1 rounded border border-granite bg-white px-3 py-2 text-xs text-ink focus:border-clay focus:outline-none"
          />
          <Button variant="primary" onClick={handleAiSearch} loading={aiLoading} disabled={!aiQuery.trim()}>
            <Sparkles className="mr-1.5 h-3.5 w-3.5" />
            <span>{lang === 'bn' ? 'সেরা আইনজীবী খুঁজুন' : 'Find Best Lawyers'}</span>
          </Button>
        </div>

        {aiResults && (
          <div className="pt-3 border-t border-clay/20 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px] uppercase text-clay-deep font-semibold">
                {lang === 'bn' ? 'প্রস্তাবিত আইনজীবী' : 'Recommended for You'}
              </span>
              <button
                type="button"
                onClick={() => { setAiResults(null); setAiQuery(''); }}
                className="text-granite hover:text-ink transition"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            {aiResults.length === 0 ? (
              <p className="text-xs text-granite">
                {lang === 'bn' ? 'কোনো মিল পাওয়া যায়নি।' : 'No matches found.'}
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {aiResults.map((rec) => renderLawyerCard(rec.lawyer, lang === 'bn' ? rec.reasonBn : rec.reasonEn))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Filter Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 bg-white p-4 rounded border border-granite shadow-sm">
        <div className="lg:col-span-2">
          <label className="block text-[10px] font-mono uppercase text-granite mb-1">
            {lang === 'bn' ? 'অনুসন্ধান' : 'Search'}
          </label>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-granite" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={lang === 'bn' ? 'নাম বা বিশেষায়িত ক্ষেত্র' : 'Name or specialty'}
              className="w-full rounded border border-granite-soft bg-white pl-8 pr-2 py-1.5 text-xs text-ink focus:border-clay focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-mono uppercase text-granite mb-1">
            {lang === 'bn' ? 'জেলা' : 'District'}
          </label>
          <select
            value={district}
            onChange={(e) => setDistrict(e.target.value)}
            className="w-full rounded border border-granite-soft bg-white p-1.5 text-xs text-ink focus:border-clay focus:outline-none"
          >
            <option value="all">{lang === 'bn' ? 'সকল জেলা' : 'All Districts'}</option>
            {districts.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-mono uppercase text-granite mb-1">
            {lang === 'bn' ? 'বিশেষায়িত ক্ষেত্র' : 'Specialty'}
          </label>
          <select
            value={area}
            onChange={(e) => setArea(e.target.value)}
            className="w-full rounded border border-granite-soft bg-white p-1.5 text-xs text-ink focus:border-clay focus:outline-none"
          >
            <option value="all">{lang === 'bn' ? 'সকল ক্ষেত্র' : 'All Specialties'}</option>
            {practiceAreas.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-mono uppercase text-granite mb-1">
            {lang === 'bn' ? 'ন্যূনতম রেটিং' : 'Min. Rating'}
          </label>
          <select
            value={minRating}
            onChange={(e) => setMinRating(e.target.value)}
            className="w-full rounded border border-granite-soft bg-white p-1.5 text-xs text-ink focus:border-clay focus:outline-none"
          >
            <option value="0">{lang === 'bn' ? 'যেকোনো' : 'Any'}</option>
            <option value="4">4.0+</option>
            <option value="4.5">4.5+</option>
          </select>
        </div>

        <div className="sm:col-span-2 lg:col-span-5 flex items-center justify-end gap-2">
          <label className="text-[10px] font-mono uppercase text-granite">
            {lang === 'bn' ? 'সাজান' : 'Sort by'}
          </label>
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="rounded border border-granite-soft bg-white p-1.5 text-xs text-ink focus:border-clay focus:outline-none"
          >
            <option value="rating">{lang === 'bn' ? 'সর্বোচ্চ রেটিং' : 'Highest Rated'}</option>
            <option value="experience">{lang === 'bn' ? 'সর্বাধিক অভিজ্ঞতা' : 'Most Experienced'}</option>
            <option value="reviews">{lang === 'bn' ? 'সর্বাধিক পর্যালোচনা' : 'Most Reviewed'}</option>
            <option value="fee_low">{lang === 'bn' ? 'সর্বনিম্ন ফি' : 'Lowest Fee'}</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
      ) : filteredLawyers.length === 0 ? (
        <EmptyState
          title={lang === 'bn' ? 'কোনো আইনজীবী পাওয়া যায়নি' : 'No Lawyers Found'}
          description={lang === 'bn' ? 'আপনার ফিল্টার পরিবর্তন করে আবার চেষ্টা করুন।' : 'Try adjusting your filters or search term.'}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredLawyers.map((lawyer) => renderLawyerCard(lawyer))}
        </div>
      )}
    </div>
  );
}
