import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  MapPin,
  Award,
  Calendar,
  Clock,
  ShieldCheck,
  Building,
  GraduationCap,
  MessageSquare,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  UserCheck,
} from 'lucide-react';
import { useLang } from '../../context/LanguageContext';
import { useRole } from '../../context/RoleContext';
import { getLawyerById } from '../../lib/api';
import { StatusBadge, VerifiedBadge } from '../../components/ui/StatusBadge';
import { Rating } from '../../components/ui/Rating';
import { Button } from '../../components/ui/Button';
import { Skeleton, ErrorState } from '../../components/ui/EmptyState';
import type { LawyerProfile } from '../../mocks/types';

export default function LawyerProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { lang, num } = useLang();
  const { role } = useRole();
  const navigate = useNavigate();
  const [lawyer, setLawyer] = useState<LawyerProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      getLawyerById(id).then((data) => {
        setLawyer(data || null);
        setLoading(false);
      });
    }
  }, [id]);

  if (loading) {
    return (
      <div className="py-12 shell space-y-6">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!lawyer) {
    return (
      <div className="py-12 shell">
        <ErrorState title="Lawyer Not Found" message="The requested advocate profile could not be located." />
        <Link to="/lawyers" className="inline-flex items-center gap-1.5 text-xs text-clay-deep mt-4">
          <ArrowLeft className="h-4 w-4" />
          <span>Back to directory</span>
        </Link>
      </div>
    );
  }

  const handleRequestConsultation = () => {
    if (role === 'guest') {
      navigate('/signin?redirect=/app/lawyers/' + lawyer.id);
    } else {
      navigate('/app/lawyers/' + lawyer.id);
    }
  };

  return (
    <div className="py-12 sm:py-16">
      <div className="shell">
        <Link
          to="/lawyers"
          className="inline-flex items-center gap-1.5 text-xs font-mono uppercase text-clay-deep hover:text-ink transition mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>{lang === 'bn' ? 'সকল আইনজীবীর তালিকায় ফিরুন' : 'Back to Directory'}</span>
        </Link>

        {/* Profile Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Main profile content */}
          <div className="lg:col-span-8 space-y-8">
            {/* Header Card */}
            <div className="rounded border border-granite bg-white p-6 sm:p-8 shadow-sm">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                <div className="h-24 w-24 rounded bg-clay-tint border-2 border-clay flex items-center justify-center shadow-sm shrink-0">
                  <UserCheck className="h-12 w-12 text-clay-deep" />
                </div>
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <StatusBadge status={lawyer.verificationStatus} />
                    {lawyer.isAvailableToday && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase text-clay-deep bg-clay-tint px-2 py-0.5 rounded">
                        <span className="h-1.5 w-1.5 rounded-full bg-clay animate-pulse" />
                        {lang === 'bn' ? 'আজ পরামর্শে উপলব্ধ' : 'Available Today'}
                      </span>
                    )}
                  </div>

                  <h1 className="font-display text-2xl font-bold text-ink">
                    {lang === 'bn' ? lawyer.fullNameBn : lawyer.fullName}
                  </h1>

                  <p className="text-xs text-granite font-medium">
                    {lang === 'bn' ? lawyer.titleBn : lawyer.title}
                  </p>

                  <div className="pt-2 flex flex-wrap items-center gap-4 text-xs font-body text-ink-soft">
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 text-clay-deep" />
                      <span>{lang === 'bn' ? lawyer.districtBn : lawyer.district}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Award className="h-3.5 w-3.5 text-clay-deep" />
                      <span>
                        {num(lawyer.experienceYears)} {lang === 'bn' ? 'বছরের অভিজ্ঞতা' : 'years experience'}
                      </span>
                    </div>
                    {lawyer.rating > 0 && <Rating value={lawyer.rating} count={lawyer.reviewCount} />}
                  </div>
                </div>
              </div>

              {/* Bar Council info banner */}
              <div className="mt-6 pt-4 border-t border-granite-soft flex flex-wrap items-center justify-between gap-4 text-xs font-mono text-ink-soft bg-bone-deep/40 p-3 rounded">
                <div>
                  <span className="text-granite uppercase block text-[10px]">Bar Enrolment No</span>
                  <span className="font-semibold text-ink">{lawyer.barEnrolmentNo}</span>
                </div>
                <div>
                  <span className="text-granite uppercase block text-[10px]">Enrolment Year</span>
                  <span className="font-semibold text-ink">{num(lawyer.enrolmentYear)}</span>
                </div>
                <div>
                  <span className="text-granite uppercase block text-[10px]">Response Commitment</span>
                  <span className="font-semibold text-clay-deep">
                    {lang === 'bn' ? lawyer.responseTimeCommitmentBn : lawyer.responseTimeCommitment}
                  </span>
                </div>
              </div>
            </div>

            {/* About / Bio */}
            <div className="rounded border border-granite bg-white p-6 sm:p-8 shadow-sm space-y-4">
              <h2 className="font-mono text-label uppercase text-clay-deep font-semibold">
                {lang === 'bn' ? 'আইনজীবীর পরিচিতি ও কর্মক্ষেত্র' : 'About Advocate'}
              </h2>
              <p className="text-body text-ink-soft leading-relaxed">
                {lang === 'bn' ? lawyer.bioBn : lawyer.bioEn}
              </p>
            </div>

            {/* Practice Areas & Courts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="rounded border border-granite bg-white p-6 shadow-sm space-y-3">
                <div className="flex items-center gap-2 text-clay-deep">
                  <Award className="h-4 w-4" />
                  <h3 className="font-mono text-label uppercase font-semibold">
                    {lang === 'bn' ? 'বিশেষায়িত ক্ষেত্রসমূহ' : 'Practice Areas'}
                  </h3>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-2">
                  {(lang === 'bn' ? lawyer.practiceAreasBn : lawyer.practiceAreas).map((area, idx) => (
                    <span
                      key={idx}
                      className="rounded bg-bone-deep px-2.5 py-1 text-xs font-medium text-ink-soft border border-granite-soft"
                    >
                      {area}
                    </span>
                  ))}
                </div>
              </div>

              <div className="rounded border border-granite bg-white p-6 shadow-sm space-y-3">
                <div className="flex items-center gap-2 text-clay-deep">
                  <Building className="h-4 w-4" />
                  <h3 className="font-mono text-label uppercase font-semibold">
                    {lang === 'bn' ? 'আদালত ও চেম্বার' : 'Admitted Courts'}
                  </h3>
                </div>
                <ul className="space-y-1.5 text-xs text-ink-soft pt-2">
                  {(lang === 'bn' ? lawyer.courtsBn : lawyer.courts).map((court, idx) => (
                    <li key={idx} className="flex items-center gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-clay-deep shrink-0" />
                      <span>{court}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Education */}
            <div className="rounded border border-granite bg-white p-6 shadow-sm space-y-3">
              <div className="flex items-center gap-2 text-clay-deep">
                <GraduationCap className="h-4 w-4" />
                <h3 className="font-mono text-label uppercase font-semibold">
                  {lang === 'bn' ? 'শিক্ষাগত যোগ্যতা' : 'Education & Credentials'}
                </h3>
              </div>
              <div className="space-y-1 text-xs text-ink-soft">
                {(lang === 'bn' ? lawyer.educationBn : lawyer.education).map((edu, idx) => (
                  <p key={idx} className="font-medium">• {edu}</p>
                ))}
              </div>
            </div>
          </div>

          {/* Right Sticky Booking Panel */}
          <div className="lg:col-span-4 sticky top-20">
            <div className="rounded border border-granite bg-white p-6 shadow-composer space-y-6">
              <div className="border-b border-granite-soft pb-4">
                <span className="font-mono text-[11px] text-granite uppercase block">
                  {lang === 'bn' ? 'পরামর্শ ফি কাঠামো' : 'Consultation Fee Schedule'}
                </span>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="font-display text-2xl font-bold text-ink">
                    ৳{num(lawyer.startingFeeBdt)}
                  </span>
                  <span className="font-mono text-xs text-granite">BDT / session</span>
                </div>
              </div>

              {/* Consultation Modes Table */}
              <div className="space-y-2.5">
                <span className="font-mono text-[11px] uppercase text-clay-deep font-semibold block">
                  {lang === 'bn' ? 'পদ্ধতি ও সময়সীমা' : 'Modes & Duration'}
                </span>
                {lawyer.fees.map((fee) => (
                  <div
                    key={fee.mode}
                    className="flex items-center justify-between rounded border border-granite-soft bg-bone/40 p-2.5 text-xs"
                  >
                    <div>
                      <p className="font-semibold text-ink uppercase text-[11px]">
                        {fee.mode === 'chat'
                          ? 'টেক্সট চ্যাট / Text Chat'
                          : fee.mode === 'audio'
                          ? 'অডিও কল / Audio Call'
                          : fee.mode === 'video'
                          ? 'ভিডিও কনফারেন্স / Video'
                          : 'চেম্বার সাক্ষাৎ / In-Person'}
                      </p>
                      <span className="text-[10px] text-granite font-mono">
                        {num(fee.durationMinutes)} {lang === 'bn' ? 'মিনিট' : 'mins'}
                      </span>
                    </div>
                    <span className="font-mono font-bold text-clay-deep">
                      ৳{num(fee.feeBdt)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Sensitive Data Notice */}
              <div className="rounded bg-bone-deep p-3 text-[11px] text-ink-soft border border-granite-soft">
                <p>
                  {lang === 'bn'
                    ? 'পরামর্শের অনুরোধ পাঠানোর আগে গোপনীয় তথ্য ছাড়া প্রয়োজনীয় তথ্যাদি প্রস্তুত রাখুন।'
                    : 'Please redact sensitive personal IDs before uploading case documents to the advocate thread.'}
                </p>
              </div>

              {/* Action Button */}
              <Button
                size="lg"
                variant="primary"
                onClick={handleRequestConsultation}
                className="w-full justify-center"
              >
                <Calendar className="mr-2 h-4 w-4" />
                <span>{lang === 'bn' ? 'পরামর্শের অনুরোধ পাঠান' : 'Request Consultation'}</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
