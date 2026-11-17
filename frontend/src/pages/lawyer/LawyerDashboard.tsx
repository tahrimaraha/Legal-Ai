import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  Calendar,
  Mail,
  DollarSign,
  Clock,
  ArrowRight,
  UserCheck,
  AlertTriangle,
  Award,
} from 'lucide-react';
import { useLang } from '../../context/LanguageContext';
import { useRole } from '../../context/RoleContext';
import { listVerifications, listConsultations, getLawyerById, listThreads } from '../../lib/api';
import { StatCard } from '../../components/ui/StatCard';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Button } from '../../components/ui/Button';
import type { VerificationRequest, ConsultationRequest, LawyerProfile } from '../../mocks/types';
import { formatSlot } from '../../lib/slots';
import { inBucket } from '../../lib/consultationBuckets';

export default function LawyerDashboard() {
  const { lang, num } = useLang();
  const { user } = useRole();

  const [verifications, setVerifications] = useState<VerificationRequest[]>([]);
  const [consultations, setConsultations] = useState<ConsultationRequest[]>([]);
  const [profile, setProfile] = useState<LawyerProfile | null>(null);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [activeThreads, setActiveThreads] = useState(0);
  const [firstUnreadThread, setFirstUnreadThread] = useState<string | null>(null);

  useEffect(() => {
    listVerifications('lawyer').then(setVerifications);
    listConsultations().then(setConsultations);
    listThreads().then((threads) => {
      setUnreadMessages(threads.reduce((sum, t) => sum + t.unreadCount, 0));
      setActiveThreads(threads.filter((t) => !t.isLocked).length);
      setFirstUnreadThread(threads.find((t) => t.unreadCount > 0)?.id ?? null);
    });
    if (user) {
      getLawyerById(user.id).then((me) => {
        if (me) setProfile(me);
      });
    }
  }, [user]);

  const isPending = user?.isVerified === false;

  // Earnings this calendar month: completed consultations (full fee) + completed verifications (lawyer share).
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();
  const completedThisMonth = (iso?: string) => !!iso && new Date(iso).getTime() >= monthStart;
  const monthConsultations = consultations.filter(
    (c) => c.status === 'completed' && completedThisMonth(c.timeline.find((t) => t.status === 'completed')?.timestamp),
  );
  const monthVerifications = verifications.filter((v) => v.status === 'completed' && completedThisMonth(v.verdict?.createdAt));
  const monthEarnings =
    monthConsultations.reduce((sum, c) => sum + c.feeBdt, 0) +
    monthVerifications.reduce((sum, v) => sum + (v.urgency === 'urgent' ? 150 : 100), 0);
  const monthSessions = monthConsultations.length + monthVerifications.length;

  if (isPending) {
    return (
      <div className="space-y-6 max-w-2xl mx-auto py-8 text-center font-body">
        <div className="rounded-full bg-bone-deep p-4 mx-auto w-16 h-16 flex items-center justify-center text-clay-deep border border-granite">
          <Clock className="h-8 w-8 animate-pulse text-clay-deep" />
        </div>
        <h1 className="font-display text-2xl font-bold text-ink">
          {lang === 'bn' ? 'আপনার বার কাউন্সিল সনদপত্র যাচাইাধীন রয়েছে' : 'Enrollment Verification Under Review'}
        </h1>
        <p className="text-xs text-ink-soft leading-relaxed">
          {lang === 'bn'
            ? 'বাংলাদেশ বার কাউন্সিলের রোল অনুযায়ী আপনার তথ্য নিরীক্ষা করা হচ্ছে। অনুমোদন সম্পন্ন হলে আপনি যাচাই কিউ ও ক্লায়েন্ট অনুরোধ পরিচালনা করতে পারবেন।'
            : 'Your advocate profile is in holding status pending Bar Council roll verification by system administrators.'}
        </p>
        <div className="p-4 rounded border border-granite bg-white text-left text-xs space-y-2">
          <span className="font-mono text-[10px] text-clay-deep uppercase font-semibold block">Application Details</span>
          <p><strong>Name:</strong> {user?.name}</p>
          <p><strong>Status:</strong> Verification Pending (Audit in progress)</p>
        </div>
      </div>
    );
  }

  // Lawyers only see requests an admin assigned to them; "open" = assigned and awaiting their verdict.
  const openQueue = verifications.filter((v) => v.status === 'claimed');
  const newRequests = inBucket(consultations, 'requests');
  const allUpcoming = inBucket(consultations, 'upcoming');
  const needsTime = inBucket(consultations, 'reschedule');
  const upcomingConsultations = allUpcoming.slice(0, 5);
  const pendingTotal = newRequests.length + allUpcoming.length + needsTime.length;
  const consultationsLink =
    newRequests.length > 0 ? 'requests' : needsTime.length > 0 ? 'reschedule' : allUpcoming.length > 0 ? 'upcoming' : null;

  return (
    <div className="space-y-8 font-body">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-granite pb-4">
        <div>
          <span className="font-mono text-label uppercase text-clay-deep">
            {lang === 'bn' ? 'আইনজীবী ড্যাশবোর্ড' : 'Advocate Workspace'}
          </span>
          <h1 className="font-display text-2xl font-bold text-ink mt-0.5">
            {user?.name || 'Advocate'}
          </h1>
        </div>

        <Link to="/lawyer/verifications">
          <Button size="sm" variant="primary">
            <ShieldCheck className="mr-1.5 h-3.5 w-3.5" />
            <span>{lang === 'bn' ? 'যাচাই কিউ খুলুন' : 'Open Verification Queue'}</span>
          </Button>
        </Link>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label={lang === 'bn' ? 'উন্মুক্ত যাচাই কিউ' : 'Open Verifications'}
          value={num(openQueue.length)}
          sub={lang === 'bn' ? 'আপনাকে দেওয়া, মতামতের অপেক্ষায়' : 'Assigned to you, awaiting verdict'}
          icon={ShieldCheck}
          to="/lawyer/verifications?status=in_progress"
        />
        <StatCard
          label={lang === 'bn' ? 'পরামর্শ অনুরোধ' : 'Pending Consultations'}
          value={num(pendingTotal)}
          sub={
            lang === 'bn'
              ? `${num(newRequests.length)} নতুন · ${num(allUpcoming.length)} আসন্ন${needsTime.length ? ` · ${num(needsTime.length)} সময় দিন` : ''}`
              : `${newRequests.length} new · ${allUpcoming.length} upcoming${needsTime.length ? ` · ${needsTime.length} need a time` : ''}`
          }
          icon={Calendar}
          to={consultationsLink ? `/lawyer/consultations?status=${consultationsLink}` : '/lawyer/consultations'}
        />
        <StatCard
          label={lang === 'bn' ? 'ক্লায়েন্ট মেসেজ' : 'Unread Messages'}
          value={num(unreadMessages)}
          sub={lang === 'bn' ? `${num(activeThreads)}টি সক্রিয় থ্রেড` : `${activeThreads} active client threads`}
          icon={Mail}
          to={firstUnreadThread ? `/lawyer/messages/${firstUnreadThread}` : '/lawyer/messages'}
        />
        <StatCard
          label={lang === 'bn' ? 'চলতি মাসের আয়' : 'Monthly Honorarium'}
          value={`৳${num(monthEarnings)}`}
          sub={lang === 'bn' ? `এই মাসে ${num(monthSessions)}টি সম্পন্ন কাজ` : `${monthSessions} completed this month`}
          icon={DollarSign}
          to="/lawyer/consultations?status=completed"
        />
      </div>

      {/* Verification Queue Preview & Today Schedule */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Queue Preview (span-7) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-mono text-label uppercase text-clay-deep font-semibold flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4" />
              <span>{lang === 'bn' ? 'যাচাই কিউ প্রিভিউ' : 'Verification Queue Preview'}</span>
            </h2>
            <Link to="/lawyer/verifications" className="text-xs text-clay-deep hover:underline font-semibold">
              {lang === 'bn' ? 'সম্পূর্ণ কিউ দেখুন →' : 'View All →'}
            </Link>
          </div>

          <div className="divide-y divide-granite border border-granite rounded bg-white shadow-sm overflow-hidden">
            {openQueue.slice(0, 3).map((req) => (
              <div key={req.id} className="p-4 space-y-2 hover:bg-bone/40 transition">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] text-granite">
                    {new Date(req.createdAt).toLocaleDateString()}
                  </span>
                  <StatusBadge status={req.status} size="sm" />
                </div>
                <p className="font-display text-xs font-bold text-ink line-clamp-2">
                  "{req.questionExcerptBn}"
                </p>
                <div className="pt-2 flex items-center justify-between">
                  <span className="font-mono text-[10px] text-clay-deep">
                    {req.citations.length} statutes attached
                  </span>
                  <Link to={`/lawyer/verifications/${req.id}`}>
                    <Button size="sm" variant="secondary">
                      <span>{lang === 'bn' ? 'রিভিউ করুন' : 'Claim & Review'}</span>
                      <ArrowRight className="ml-1 h-3 w-3" />
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Schedule & Profile completeness (span-5) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Today's Schedule */}
          <div className="rounded border border-granite bg-white p-5 shadow-sm space-y-4">
            <h3 className="font-mono text-label uppercase text-clay-deep font-semibold flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              <span>{lang === 'bn' ? 'আসন্ন পরামর্শ' : 'Upcoming Consultations'}</span>
            </h3>

            {upcomingConsultations.length > 0 ? (
              <div className="space-y-3">
                {upcomingConsultations.map((c) => (
                  <div key={c.id} className="p-3 rounded bg-bone border border-granite-soft text-xs space-y-1">
                    <div className="flex justify-between font-mono font-bold text-clay-deep text-[11px]">
                      <span>{c.mode.toUpperCase()}</span>
                      <span>{formatSlot(c.scheduledSlot!, lang)}</span>
                    </div>
                    <p className="font-bold text-ink truncate">{c.topicBn}</p>
                    <p className="text-[11px] text-granite">Client: {c.citizenName}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-granite py-4 text-center">
                {lang === 'bn' ? 'আজ কোনো নির্ধারিত সেশন নেই।' : 'No sessions booked for today.'}
              </p>
            )}
          </div>

          {/* Profile Completeness Card */}
          <div className="rounded border border-granite bg-white p-5 shadow-sm space-y-3">
            <span className="font-mono text-label uppercase text-clay-deep font-semibold block">
              {lang === 'bn' ? 'প্রোফাইল পূর্ণতা' : 'Profile Completeness'}
            </span>
            <div className="w-full bg-bone-deep rounded-full h-2">
              <div className="bg-clay h-2 rounded-full w-[90%]" />
            </div>
            <p className="text-[11px] text-ink-soft">
              {lang === 'bn'
                ? 'আপনার প্রোফাইল ৯০% সম্পন্ন। চেম্বারের ঠিকানা ও সময়সূচি হালনাগাদ করুন।'
                : 'Profile is 90% complete. Keep your weekly consultation availability updated.'}
            </p>
            <Link to="/lawyer/profile" className="inline-block text-xs font-semibold text-clay-deep hover:underline">
              {lang === 'bn' ? 'প্রোফাইল এডিট করুন →' : 'Edit Profile →'}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
