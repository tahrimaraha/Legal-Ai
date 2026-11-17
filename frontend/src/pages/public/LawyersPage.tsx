import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, ArrowRight, Award, UserCheck } from 'lucide-react';
import { useLang } from '../../context/LanguageContext';
import { listLawyers } from '../../lib/api';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Rating } from '../../components/ui/Rating';
import { Button } from '../../components/ui/Button';
import { Skeleton, EmptyState } from '../../components/ui/EmptyState';
import type { LawyerProfile } from '../../mocks/types';

export default function LawyersPage() {
  const { lang, num } = useLang();
  const [lawyers, setLawyers] = useState<LawyerProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedDistrict, setSelectedDistrict] = useState('all');
  const [selectedArea, setSelectedArea] = useState('all');

  useEffect(() => {
    listLawyers({
      district: selectedDistrict === 'all' ? undefined : selectedDistrict,
      area: selectedArea === 'all' ? undefined : selectedArea,
    }).then((data) => {
      setLawyers(data);
      setLoading(false);
    });
  }, [selectedDistrict, selectedArea]);

  const districts = ['all', 'Dhaka', 'Chattogram', 'Sylhet', 'Rajshahi', 'Khulna'];
  const practiceAreas = [
    'all',
    'Constitutional Law',
    'Family Law',
    'Tenancy Disputes',
    'Cyber Security',
    'Consumer Rights',
  ];

  return (
    <div className="py-12 sm:py-16">
      <div className="shell space-y-10">
        <div>
          <span className="font-mono text-label uppercase tracking-wider text-clay-deep">
            {lang === 'bn' ? 'আইনজীবী ডিরেক্টরি' : 'Advocate Directory'}
          </span>
          <h1 className="font-display text-display font-bold text-ink mt-2">
            {lang === 'bn' ? 'সনদপ্রাপ্ত আইনজীবী ও পরামর্শকবৃন্দ' : 'Verified Enrolled Advocates'}
          </h1>
          <p className="mt-3 text-body text-ink-soft max-w-2xl">
            {lang === 'bn'
              ? 'বাংলাদেশ বার কাউন্সিলের সনদপ্রাপ্ত এবং হাইকোর্ট ও জেলা জজ আদালতের প্র্যাকটিসরত আইনজীবীদের সাথে পরামর্শ করুন।'
              : 'Browse verified practitioners across Bangladesh for consultation, document validation, and representation.'}
          </p>
        </div>

        {/* Filter Controls */}
        <div className="rounded border border-granite bg-white p-4 sm:p-6 shadow-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono uppercase text-granite mb-1.5 font-semibold">
                {lang === 'bn' ? 'জেলা অনুযায়ী ফিল্টার' : 'Filter by District'}
              </label>
              <select
                value={selectedDistrict}
                onChange={(e) => setSelectedDistrict(e.target.value)}
                className="w-full rounded border border-granite bg-white px-3 py-2 text-sm text-ink focus:border-clay focus:outline-none"
              >
                {districts.map((d) => (
                  <option key={d} value={d}>
                    {d === 'all' ? (lang === 'bn' ? 'সকল জেলা' : 'All Districts') : d}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-mono uppercase text-granite mb-1.5 font-semibold">
                {lang === 'bn' ? 'আইন ক্ষেত্র' : 'Practice Area'}
              </label>
              <select
                value={selectedArea}
                onChange={(e) => setSelectedArea(e.target.value)}
                className="w-full rounded border border-granite bg-white px-3 py-2 text-sm text-ink focus:border-clay focus:outline-none"
              >
                {practiceAreas.map((a) => (
                  <option key={a} value={a}>
                    {a === 'all' ? (lang === 'bn' ? 'সকল ক্ষেত্র' : 'All Practice Areas') : a}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Lawyers Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-64 w-full" />
            ))}
          </div>
        ) : lawyers.length === 0 ? (
          <EmptyState
            title={lang === 'bn' ? 'কোনো আইনজীবী পাওয়া যায়নি' : 'No Advocates Found'}
            description={
              lang === 'bn'
                ? 'আপনার নির্বাচিত ফিল্টারে কোনো আইনজীবী নেই। ফিল্টার পরিবর্তন করে চেষ্টা করুন।'
                : 'Try adjusting your district or practice area filter.'
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {lawyers.map((lawyer) => (
              <div
                key={lawyer.id}
                className="flex flex-col justify-between rounded border border-granite bg-white p-6 shadow-sm hover:border-clay hover:-translate-y-0.5 transition"
              >
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="h-16 w-16 rounded bg-clay-tint border-2 border-clay flex items-center justify-center shrink-0">
                      <UserCheck className="h-8 w-8 text-clay-deep" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <StatusBadge status={lawyer.verificationStatus} size="sm" />
                      <h3 className="font-display text-base font-bold text-ink mt-1 truncate">
                        {lang === 'bn' ? lawyer.fullNameBn : lawyer.fullName}
                      </h3>
                      <p className="text-xs text-granite truncate">{lawyer.title}</p>
                    </div>
                  </div>

                  <p className="text-xs text-ink-soft line-clamp-3 leading-relaxed">
                    {lang === 'bn' ? lawyer.bioBn : lawyer.bioEn}
                  </p>

                  <div className="flex flex-wrap gap-1">
                    {lawyer.practiceAreas.slice(0, 3).map((a) => (
                      <span key={a} className="rounded bg-bone-deep px-2 py-0.5 text-[10px] font-mono text-clay-deep">
                        {a}
                      </span>
                    ))}
                  </div>

                  <div className="pt-3 border-t border-granite-soft flex items-center justify-between text-xs font-mono">
                    <span className="text-granite">Starting: ৳{num(lawyer.startingFeeBdt)}</span>
                    {lawyer.rating > 0 && <Rating value={lawyer.rating} count={lawyer.reviewCount} />}
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-granite-soft">
                  <Link to={`/lawyers/${lawyer.id}`}>
                    <Button size="sm" variant="secondary" className="w-full justify-center">
                      <span>{lang === 'bn' ? 'প্রোফাইল ও পরামর্শ' : 'View Profile'}</span>
                      <ArrowRight className="ml-1 h-3.5 w-3.5" />
                    </Button>
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
