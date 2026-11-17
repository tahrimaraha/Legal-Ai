import { Scale, Users, BookOpen, ShieldCheck, HeartHandshake } from 'lucide-react';
import { useLang } from '../../context/LanguageContext';

export default function AboutPage() {
  const { lang } = useLang();

  return (
    <div className="py-12 sm:py-16">
      <div className="shell max-w-prose space-y-10">
        <div>
          <span className="font-mono text-label uppercase tracking-wider text-clay-deep">
            {lang === 'bn' ? 'আমাদের লক্ষ্য ও উদ্যোগ' : 'Project Mission & Context'}
          </span>
          <h1 className="font-display text-display font-bold text-ink mt-2">
            {lang === 'bn' ? 'সকলের জন্য সহজ ও নির্ভরযোগ্য আইন' : 'Democratizing Legal Access for Citizens'}
          </h1>
        </div>

        {/* Story & Problem */}
        <section className="space-y-4 text-body text-ink-soft leading-relaxed">
          <p>
            {lang === 'bn'
              ? 'বাংলাদেশের আদালতসমূহে বর্তমানে প্রায় ৩৭ থেকে ৪৪ লাখ মামলার জট রয়েছে। গড়ে প্রতি ৯০,০০০ জন নাগরিকের বিপরীতে মাত্র একজন বিচারক দায়িত্ব পালন করছেন। জটিল আইনি ভাষা ও ব্যয়বহুল পরামর্শের কারণে অধিকাংশ সাধারণ মানুষ নিজের আইনি অধিকার সম্পর্কে সঠিক সময়ে সঠিক সিদ্ধান্ত নিতে পারেন না।'
              : 'Bangladesh’s judiciary carries a staggering backlog of roughly 3.7 to 4.4 million cases, with approximately one judge per 90,000 citizens. Codified colonial statutes and dense terminology create a barrier for ordinary citizens facing tenancy, family, cyber, and consumer disputes.'}
          </p>
          <p>
            {lang === 'bn'
              ? 'অধিকাংশ মানুষ ফেসবুকের অপ্রমাণিত পরামর্শের ওপর নির্ভর করেন অথবা ভয় ও অজ্ঞতায় প্রতারিত হন। "আইনি সহায়ক" এই শূন্যতা পূরণে তৈরি — যাতে প্রতিটি নাগরিক নিজের ভাষায় সহজ প্রশ্ন করে প্রকৃত আইন ও ধারার রেফারেন্সসহ নির্ভরযোগ্য তথ্য জানতে পারেন।'
              : 'People often rely on unverified social media advice or are deterred by high costs. "AI Legal Assistant for Citizens" bridges this gap by grounding every answer directly in codified Bangladeshi acts and providing an honest escalation path to licensed advocates.'}
          </p>
        </section>

        {/* Academic Project Note */}
        <div className="rounded border border-granite bg-bone-deep p-6 space-y-2">
          <span className="font-mono text-[11px] uppercase text-clay-deep font-semibold">
            {lang === 'bn' ? 'একাডেমিক প্রকল্প প্রসঙ্গ' : 'CUET CSE-356 Project Note'}
          </span>
          <h3 className="font-display text-base font-bold text-ink">
            CUET CSE-356 Software Engineering Capstone
          </h3>
          <p className="text-xs text-ink-soft leading-relaxed">
            {lang === 'bn'
              ? 'এই প্ল্যাটফর্মটি চট্টগ্রাম প্রকৌশল ও প্রযুক্তি বিশ্ববিদ্যালয় (CUET) এর কম্পিউটার সায়েন্স অ্যান্ড ইঞ্জিনিয়ারিং বিভাগের CSE-356 কোর্সের অংশ হিসেবে উদ্ভাবিত। এটি ভেক্টর সার্চ ও বৃহৎ ভাষা মডেলের মাধ্যমে ন্যায়বিচারে নাগরিক প্রবেশাধিকার নিশ্চিতকরণের একটি গবেষণাভিত্তিক প্রয়াস।'
              : 'Developed as part of the CSE-356 Software Engineering curriculum at Chittagong University of Engineering & Technology (CUET), applying retrieval-augmented generation (RAG) to the Bangladeshi legal corpus.'}
          </p>
        </div>

        {/* Values */}
        <div className="space-y-4">
          <h2 className="font-display text-xl font-bold text-ink">
            {lang === 'bn' ? 'আমাদের মূল নীতিসমূহ' : 'Our Guiding Principles'}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded border border-granite bg-white">
              <BookOpen className="h-5 w-5 text-clay-deep mb-2" />
              <h3 className="font-display text-sm font-bold text-ink">
                {lang === 'bn' ? 'প্রমাণভিত্তিক আইনি উদ্ধৃতি' : 'Verifiable Citations'}
              </h3>
              <p className="text-xs text-granite mt-1">
                {lang === 'bn' ? 'প্রতিটি দাবিতে আইন ও ধারার স্পষ্ট উল্লেখ।' : 'Every assertion must cite the exact Act & Section.'}
              </p>
            </div>

            <div className="p-4 rounded border border-granite bg-white">
              <ShieldCheck className="h-5 w-5 text-clay-deep mb-2" />
              <h3 className="font-display text-sm font-bold text-ink">
                {lang === 'bn' ? 'সততা ও সীমাবদ্ধতা' : 'Honesty on Limits'}
              </h3>
              <p className="text-xs text-granite mt-1">
                {lang === 'bn' ? 'এআই কখনো আইনজীবীর বিকল্প নয় — এটি স্পষ্ট বার্তা।' : 'AI gives information, never binding legal advice.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
