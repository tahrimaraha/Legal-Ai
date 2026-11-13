import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  MessageSquare,
  ShieldCheck,
  Mail,
  Briefcase,
  ArrowRight,
  Sparkles,
  History,
  Send,
  Calendar,
} from 'lucide-react';
import { useLang } from '../../context/LanguageContext';
import { useRole } from '../../context/RoleContext';
import { listConversations, listVerifications, listConsultations } from '../../lib/api';
import { Button } from '../../components/ui/Button';
import type { Conversation, VerificationRequest, ConsultationRequest } from '../../mocks/types';

export default function CitizenDashboard() {
  const { lang, num } = useLang();
  const { user } = useRole();
  const navigate = useNavigate();

  const [questionInput, setQuestionInput] = useState('');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [verifications, setVerifications] = useState<VerificationRequest[]>([]);
  const [consultations, setConsultations] = useState<ConsultationRequest[]>([]);

  useEffect(() => {
    listConversations().then(setConversations);
    listVerifications().then(setVerifications);
    listConsultations().then(setConsultations);
  }, []);

  const handleAsk = (e: React.FormEvent) => {
    e.preventDefault();
    if (!questionInput.trim()) return;
    navigate(`/app/chat?q=${encodeURIComponent(questionInput.trim())}`);
  };

  const starterQuestions = [
    {
      bn: 'আমার বাড়িওয়ালা নোটিশ ছাড়াই ভাড়া বাড়িয়েছে, আমি কী করতে পারি?',
      en: 'My landlord increased rent without notice, what can I do?',
    },
    {
      bn: 'অনলাইনে অনুমতি ছাড়া আমার ছবি প্রকাশ করে ব্ল্যাকমেইল করা হচ্ছে।',
      en: 'Someone is sharing my photos online without consent and blackmailing me.',
    },
    {
      bn: 'দোকানদার পণ্যের গায়ের মূল্যের (MRP) চেয়ে বেশি টাকা দাবি করছে।',
      en: 'A store is charging more than the printed MRP price.',
    },
  ];

  const pendingVerificationsCount = verifications.filter((v) => v.status === 'pending' || v.status === 'claimed').length;
  const activeConsultations = consultations.filter((c) => c.status === 'scheduled' || c.status === 'accepted');

  return (
    <div className="space-y-8 font-body">
      {/* Welcome header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-granite pb-6">
        <div>
          <span className="font-mono text-label uppercase text-clay-deep">
            {lang === 'bn' ? 'স্বাগতম' : 'Welcome back'}
          </span>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-ink mt-1">
            {user?.name || 'Citizen'}
          </h1>
          <p className="mt-1 text-xs text-granite">
            {lang === 'bn'
              ? 'আপনার অধিকার জানুন — প্রকৃত আইনের ধারার ভিত্তিতে নির্ভরযোগ্য পরামর্শ।'
              : 'Grounded legal information and direct advocate escalation.'}
          </p>
        </div>

        <Link to="/app/chat">
          <Button size="sm" variant="primary">
            <MessageSquare className="mr-1.5 h-3.5 w-3.5" />
            <span>{lang === 'bn' ? 'নতুন আইনি চ্যাট' : 'New Legal Chat'}</span>
          </Button>
        </Link>
      </div>

      {/* Active Consultations Alert Banner if any */}
      {activeConsultations.length > 0 && (
        <div className="rounded border border-clay bg-clay-tint/60 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="rounded bg-clay-deep text-white p-2 shrink-0">
              <Calendar className="h-4 w-4" />
            </div>
            <div>
              <span className="font-mono text-[10px] uppercase text-clay-deep font-semibold">
                {lang === 'bn' ? 'আসন্ন পরামর্শ' : 'Upcoming Consultation'}
              </span>
              <p className="text-xs font-bold text-ink">
                {lang === 'bn' ? activeConsultations[0].topicBn : activeConsultations[0].topicEn}
              </p>
              <p className="text-[11px] text-ink-soft">
                {activeConsultations[0].lawyerName} · {activeConsultations[0].scheduledSlot?.date} {activeConsultations[0].scheduledSlot?.time}
              </p>
            </div>
          </div>
          <Link to={`/app/consultations/${activeConsultations[0].id}`}>
            <Button size="sm" variant="secondary">
              <span>{lang === 'bn' ? 'বিবরণ দেখুন' : 'View Details'}</span>
              <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      )}

      {/* Primary Escalation Cards (Hierarchy by Prominence) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Card 1: Main AI Chat with embedded composer (Prominent span-7) */}
        <div className="lg:col-span-7 flex flex-col justify-between rounded border border-granite bg-white p-6 sm:p-8 shadow-sm">
          <div>
            <div className="flex items-center justify-between border-b border-granite-soft pb-3 mb-4">
              <span className="font-mono text-label uppercase text-clay-deep font-semibold flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5" />
                {lang === 'bn' ? 'ধাপ ১ · তাৎক্ষণিক এআই উত্তর' : 'Rung 1 · Instant AI Legal Search'}
              </span>
              <span className="font-mono text-[10px] uppercase bg-clay-tint text-clay-deep px-2 py-0.5 rounded">
                {lang === 'bn' ? 'বিনামূল্যে' : 'Free & Instant'}
              </span>
            </div>

            <h2 className="font-display text-xl font-bold text-ink">
              {lang === 'bn' ? 'আপনার আইনি সমস্যাটি লিখুন' : 'Ask Any Everyday Legal Question'}
            </h2>
            <p className="mt-2 text-xs text-ink-soft leading-relaxed">
              {lang === 'bn'
                ? 'সংবিধান, সাইবার নিরাপত্তা, পারিবারিক সহিংসতা, যৌতুক নিরোধ ও ভোক্তা অধিকার আইনের ভিত্তিতে ধারা উল্লেখসহ উত্তর পান।'
                : 'Answers retrieved from codified Bangladeshi statutes with Act and Section cited on every assertion.'}
            </p>
          </div>

          {/* Embedded composer */}
          <form onSubmit={handleAsk} className="mt-6 space-y-3">
            <div className="relative">
              <textarea
                value={questionInput}
                onChange={(e) => setQuestionInput(e.target.value)}
                placeholder={
                  lang === 'bn'
                    ? 'আপনার প্রশ্ন এখানে লিখুন... (যেমন: নোটিশ ছাড়া বাড়িওয়ালা উচ্ছেদ করতে পারে কি না?)'
                    : 'Type your legal question here in Bangla or English...'
                }
                rows={3}
                className="w-full rounded border border-granite bg-bone/30 p-3 text-sm text-ink placeholder:text-granite focus:border-clay focus:bg-white focus:outline-none"
              />
              <button
                type="submit"
                className="absolute right-2.5 bottom-2.5 rounded bg-clay p-2 text-white hover:bg-clay-deep transition"
                aria-label="Send question"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>

            {/* Topic quick chips */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              <span className="text-[11px] font-mono text-granite mr-1 self-center">
                {lang === 'bn' ? 'বিষয়:' : 'Topics:'}
              </span>
              {['বাড়িভাড়া আইন', 'সাইবার নিরাপত্তা', 'পারিবারিক সহিংসতা', 'ভোক্তা অধিকার'].map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => setQuestionInput(chip + ' সম্পর্কিত আমার অধিকার কী?')}
                  className="rounded bg-bone-deep px-2 py-0.5 text-[11px] text-ink-soft hover:bg-clay-tint transition border border-granite-soft"
                >
                  {chip}
                </button>
              ))}
            </div>
          </form>
        </div>

        {/* Right 3 Escalation Cards (Stacked span-5) */}
        <div className="lg:col-span-5 space-y-4 flex flex-col justify-between">
          {/* Card 2: Lawyer Verification */}
          <div className="rounded border border-granite bg-white p-5 shadow-sm hover:border-clay transition">
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-[11px] uppercase text-clay-deep font-semibold flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5" />
                {lang === 'bn' ? 'ধাপ ২ · আইনজীবী যাচাই' : 'Rung 2 · Lawyer Verification'}
              </span>
              {pendingVerificationsCount > 0 && (
                <span className="font-mono text-[10px] bg-clay-tint text-clay-deep px-2 py-0.5 rounded font-bold">
                  {num(pendingVerificationsCount)} {lang === 'bn' ? 'টি প্রক্রিয়াধীন' : 'pending'}
                </span>
              )}
            </div>
            <h3 className="font-display text-sm font-bold text-ink">
              {lang === 'bn' ? 'এআই উত্তর আইনজীবীকে দিয়ে যাচাই করান' : 'Verify AI Answers with an Advocate'}
            </h3>
            <p className="mt-1 text-xs text-ink-soft">
              {lang === 'bn'
                ? 'আইনের ধারা প্রয়োগের সঠিকতা নিশ্চিত করতে একজন সনদপ্রাপ্ত আইনজীবীর মতামত নিন।'
                : 'Have a verified advocate audit statute application and issue a formal verdict.'}
            </p>
            <div className="mt-3">
              <Link
                to="/app/verifications"
                className="inline-flex items-center gap-1 text-xs font-semibold text-clay-deep hover:underline"
              >
                <span>{lang === 'bn' ? 'যাচাই কিউ ও ফলাফল' : 'View Verifications'}</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>

          {/* Card 3: Messages */}
          <div className="rounded border border-granite bg-white p-5 shadow-sm hover:border-clay transition">
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-[11px] uppercase text-clay-deep font-semibold flex items-center gap-1">
                <Mail className="h-3.5 w-3.5" />
                {lang === 'bn' ? 'ধাপ ৩ · বার্তা বিনিময়' : 'Rung 3 · Message a Lawyer'}
              </span>
              <span className="font-mono text-[10px] text-granite uppercase">Gated Thread</span>
            </div>
            <h3 className="font-display text-sm font-bold text-ink">
              {lang === 'bn' ? 'আইনজীবীর সাথে সরাসরি যোগাযোগ' : 'Direct Confidential Messaging'}
            </h3>
            <p className="mt-1 text-xs text-ink-soft">
              {lang === 'bn'
                ? 'আইনজীবী অনুরোধ গ্রহণ করলে নিরাপদ থ্রেডে তথ্য ও দলিল শেয়ার করুন।'
                : 'Confidential client messaging unlocks upon advocate acceptance.'}
            </p>
            <div className="mt-3">
              <Link
                to="/app/messages"
                className="inline-flex items-center gap-1 text-xs font-semibold text-clay-deep hover:underline"
              >
                <span>{lang === 'bn' ? 'ইনবক্স দেখুন' : 'Open Messages'}</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>

          {/* Card 4: Hire a Lawyer */}
          <div className="rounded border border-granite bg-white p-5 shadow-sm hover:border-clay transition">
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-[11px] uppercase text-clay-deep font-semibold flex items-center gap-1">
                <Briefcase className="h-3.5 w-3.5" />
                {lang === 'bn' ? 'ধাপ ৪ · আইনজীবী নিয়োগ' : 'Rung 4 · Hire & Consult'}
              </span>
              <span className="font-mono text-[10px] uppercase bg-bone-deep text-ink-soft px-2 py-0.5 rounded">
                Transparent Fees
              </span>
            </div>
            <h3 className="font-display text-sm font-bold text-ink">
              {lang === 'bn' ? 'পরামর্শ ও ওকালতনামা চুক্তি' : 'Book Audio/Video/Chamber Consultation'}
            </h3>
            <p className="mt-1 text-xs text-ink-soft">
              {lang === 'bn'
                ? 'সুপ্রিম কোর্ট ও জেলা জজ আদালতের অভিজ্ঞ আইনজীবীর সাথে অ্যাপয়েন্টমেন্ট নিন।'
                : 'Schedule structured consultations for formal litigation and notices.'}
            </p>
            <div className="mt-3">
              <Link
                to="/app/lawyers"
                className="inline-flex items-center gap-1 text-xs font-semibold text-clay-deep hover:underline"
              >
                <span>{lang === 'bn' ? 'আইনজীবী ডিরেক্টরি দেখুন' : 'Explore Advocates'}</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Continue Where You Left Off (Recent Conversations) */}
      <div className="space-y-4 pt-4 border-t border-granite">
        <div className="flex items-center justify-between">
          <h2 className="font-mono text-label uppercase text-clay-deep font-semibold flex items-center gap-2">
            <History className="h-4 w-4" />
            <span>{lang === 'bn' ? 'পূর্বের কথোপকথনসমূহ' : 'Continue Where You Left Off'}</span>
          </h2>
          <Link to="/app/history" className="text-xs text-clay-deep hover:underline font-semibold">
            {lang === 'bn' ? 'সকল ইতিহাস দেখুন →' : 'View All History →'}
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {conversations.slice(0, 4).map((c) => (
            <Link
              key={c.id}
              to={`/app/chat/${c.id}`}
              className="rounded border border-granite bg-white p-4 hover:border-clay hover:bg-bone/40 transition flex flex-col justify-between"
            >
              <div>
                <span className="font-mono text-[10px] text-granite">
                  {new Date(c.updatedAt).toLocaleDateString()}
                </span>
                <h3 className="font-display text-sm font-bold text-ink mt-1 truncate">
                  {lang === 'bn' ? c.titleBn : c.titleEn}
                </h3>
                <p className="mt-1 text-xs text-ink-soft line-clamp-2">
                  {c.messages[1]?.bodyBn || c.messages[0]?.bodyBn}
                </p>
              </div>
              <div className="mt-3 pt-2 border-t border-granite-soft flex items-center justify-between text-xs">
                <span className="font-mono text-[11px] text-clay-deep font-semibold">
                  {num(c.messages.length)} {lang === 'bn' ? 'টি বার্তা' : 'messages'}
                </span>
                <span className="text-clay-deep font-semibold flex items-center gap-1">
                  {lang === 'bn' ? 'চ্যাটে যান' : 'Resume'} <ArrowRight className="h-3 w-3" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Suggested Questions Grid */}
      <div className="space-y-4 pt-4 border-t border-granite">
        <h2 className="font-mono text-label uppercase text-clay-deep font-semibold">
          {lang === 'bn' ? 'সাধারণ প্রশ্নসমূহ (Starter Questions)' : 'Common Inquiries Grounded in Law'}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {starterQuestions.map((sq, i) => (
            <button
              key={i}
              type="button"
              onClick={() => navigate(`/app/chat?q=${encodeURIComponent(lang === 'bn' ? sq.bn : sq.en)}`)}
              className="text-left rounded border border-granite bg-white p-4 hover:border-clay hover:bg-bone transition space-y-2 group"
            >
              <div className="flex items-center justify-between text-granite group-hover:text-clay-deep">
                <span className="font-mono text-[10px] uppercase">Example {i + 1}</span>
                <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
              </div>
              <p className="font-display text-xs font-semibold text-ink leading-snug">
                "{lang === 'bn' ? sq.bn : sq.en}"
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
