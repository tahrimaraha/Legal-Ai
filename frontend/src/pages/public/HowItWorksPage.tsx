import { Bot, ShieldCheck, Mail, Briefcase, CheckCircle2, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLang } from '../../context/LanguageContext';
import { Button } from '../../components/ui/Button';

export default function HowItWorksPage() {
  const { lang } = useLang();

  const rungs = [
    {
      id: 'ai-answer',
      num: '01',
      titleBn: '১. তাৎক্ষণিক এআই উত্তর (বিনামূল্যে)',
      titleEn: '1. Instant AI Answer (Free)',
      costBn: 'সম্পূর্ণ বিনামূল্যে',
      costEn: 'Completely Free',
      speedBn: 'তাৎক্ষণিক (২-৩ সেকেন্ড)',
      speedEn: 'Instant (~3 seconds)',
      descBn:
        'আপনি বাংলা বা ইংরেজিতে আপনার দৈনন্দিন আইনি প্রশ্ন লিখবেন। সিস্টেমটি বাংলাদেশের সংশ্লিষ্ট আইন ও ধারার ভেক্টর করপাস থেকে নির্দিষ্ট অনুচ্ছেদ খুঁজে বের করে এবং সহজ ভাষায় আইন ও ধারার রেফারেন্স সহ উত্তর প্রস্তুত করে।',
      descEn:
        'Ask in plain Bengali or English. Our multilingual embedding pipeline searches through codified Bangladeshi statutes, extracts the precise section, and composes an answer grounded in the Act.',
      whatYouGetBn: ['আইন ও ধারার নামসহ সরাসরি উত্তর', 'সংশ্লিষ্ট আইনের মূল ধারা পাঠের সুযোগ', 'এক ক্লিকে আইনজীবীর কাছে যাচাইয়ের সুযোগ'],
      whatYouGetEn: ['Direct answer with Act & Section cited', 'Right-drawer statute text inspection', 'One-click escalation to lawyer review'],
      limitsBn: ['এটি তথ্যগত সহায়তা, আদালতে প্রয়োগযোগ্য বাধ্যতামূলক পরামর্শ নয়', 'আইনজীবীর প্রতিনিধিত্ব প্রতিস্থাপন করে না'],
      limitsEn: ['Legal information only, not binding advice', 'Cannot represent you in court proceedings'],
      ctaTextBn: 'প্রশ্ন জিজ্ঞাসা করুন',
      ctaTextEn: 'Ask a Question',
      ctaLink: '/app/chat',
      icon: Bot,
    },
    {
      id: 'verification',
      num: '02',
      titleBn: '২. আইনজীবী দ্বারা উত্তর যাচাই (Lawyer Verification)',
      titleEn: '2. Lawyer Verification',
      costBn: 'বিনামূল্যে / নামমাত্র শুভেচ্ছা ফি',
      costEn: 'Free / Nominal Honorarium',
      speedBn: '১২ থেকে ২৪ ঘণ্টা',
      speedEn: '12 to 24 hours',
      descBn:
        'এআই প্রদত্ত উত্তরের ওপর আপনি যদি সম্পূর্ণ নিশ্চিত হতে চান, তবে এক ক্লিকে উত্তরটি যাচাইয়ের জন্য পাঠাতে পারেন। বাংলাদেশ বার কাউন্সিলের সনদপ্রাপ্ত একজন তালিকাভুক্ত আইনজীবী মূল প্রশ্ন ও এআই উত্তরটি পর্যালোচনা করে মতামত ও সংশোধনী প্রদান করবেন।',
      descEn:
        'When you need assurance that the statute applies to your specific scenario, submit the answer for review. An enrolled advocate reviews the citation grounding and provides an official verdict.',
      whatYouGetBn: ['আইনজীবীর সত্যায়িত রায় (Accurate / Needs Correction)', 'আইনজীবী কর্তৃক সংশোধিত বা অতিরিক্ত ধারার ব্যাখ্যা', 'নাগরিকের জন্য স্পষ্ট ব্যক্তিগত নোট'],
      whatYouGetEn: ['Formal lawyer verdict badge', 'Corrected statutory explanation & notes', 'Plain language recommendation'],
      limitsBn: ['আইনজীবী আপনার পক্ষে ওকালতনামা স্বাক্ষর করছেন না'],
      limitsEn: ['Does not constitute signing a formal power of attorney'],
      ctaTextBn: 'যাচাই কিউ দেখুন',
      ctaTextEn: 'View Verification Queue',
      ctaLink: '/app/verifications',
      icon: ShieldCheck,
    },
    {
      id: 'messaging',
      num: '03',
      titleBn: '৩. আইনজীবীকে সরাসরি বার্তা (Direct Messaging)',
      titleEn: '3. Message a Lawyer',
      costBn: 'আইনজীবী কর্তৃক গ্রহণের পর উন্মুক্ত',
      costEn: 'Unlocks Upon Lawyer Acceptance',
      speedBn: 'সাধারণত কয়েক ঘণ্টার মধ্যে',
      speedEn: 'Usually within hours',
      descBn:
        'নির্দিষ্ট আইনজীবীর কাছে আপনার মামলার প্রাথমিক কাগজপত্র বা ঘটনার তথ্য পাঠিয়ে সরাসরি চ্যাট করতে পারেন। স্প্যাম ও অপব্যবহার রোধে আইনজীবী অনুরোধ গ্রহণ করলেই কেবল চ্যাট থ্রেড চালু হয়।',
      descEn:
        'Share context or relevant documents in a private thread. To protect both citizens and lawyers from spam, threads activate only after the advocate accepts the inquiry.',
      whatYouGetBn: ['নিরাপদ ব্যক্তিগত বার্তালাপ', 'কাগজপত্র ও নোটিশের কপি শেয়ারিং', 'পরামর্শের প্রস্তুতি ও ফি যাচাই'],
      whatYouGetEn: ['Confidential communication channel', 'Document & evidence attachment sharing', 'Fee & appointment alignment'],
      limitsBn: ['শুধুমাত্র প্রাথমিক আইনি যোগাযোগ ও সমন্বয়ের জন্য'],
      limitsEn: ['Intended for initial assessment and case coordination'],
      ctaTextBn: 'আইনজীবী তালিকা দেখুন',
      ctaTextEn: 'Browse Lawyers',
      ctaLink: '/lawyers',
      icon: Mail,
    },
    {
      id: 'hire',
      num: '04',
      titleBn: '৪. আইনজীবী নিয়োগ ও পরামর্শ (Consultation & Hire)',
      titleEn: '4. Hire & Legal Consultation',
      costBn: 'আইনজীবীর নির্ধারিত ফি অনুযায়ী (BDT)',
      costEn: 'Transparent BDT fees per mode',
      speedBn: 'আপনার সুবিধাজনক সময়ে নির্ধারিত',
      speedEn: 'Scheduled at your convenience',
      descBn:
        'চেম্বার সাক্ষাৎ, অডিও কল বা ভিডিও কনফারেন্সের মাধ্যমে পূর্ণাঙ্গ আইনি পরামর্শ গ্রহণ করুন। এছাড়াও লিগ্যাল নোটিশ ড্রাফট, আদালতে মামলা দায়ের বা সালিশি প্রক্রিয়ায় পূর্ণ প্রতিনিধিত্ব লাভ করুন।',
      descEn:
        'Schedule audio, video, or in-person chamber appointments for in-depth representation, legal notice drafting, and litigation management in trial and appellate courts.',
      whatYouGetBn: ['সুনির্দিষ্ট সময়সূচিতে একান্ত পরামর্শ', 'লিগ্যাল নোটিশ বা আবেদনপত্র সম্পাদন', 'আদালতে মোকদ্দমা পরিচালনা'],
      whatYouGetEn: ['Dedicated audio/video/chamber time', 'Drafted advocate notices & court petitions', 'Litigation representation'],
      limitsBn: ['কোর্ট ফি ও সরকারি খরচ আলাদা'],
      limitsEn: ['Government stamp duties & court fees separate'],
      ctaTextBn: 'পরামর্শ বুক করুন',
      ctaTextEn: 'Book a Consultation',
      ctaLink: '/lawyers',
      icon: Briefcase,
    },
  ];

  return (
    <div className="py-12 sm:py-16">
      <div className="shell">
        {/* Header */}
        <div className="max-w-3xl mb-16">
          <span className="font-mono text-label uppercase tracking-wider text-clay-deep">
            {lang === 'bn' ? 'কার্যপদ্ধতি ও সমাধান সিঁড়ি' : 'How It Works & The Escalation Ladder'}
          </span>
          <h1 className="font-display text-display font-bold text-ink mt-2">
            {lang === 'bn' ? 'আইনি সহায়তার চারটি স্পষ্ট ধাপ' : 'Four Deliberate Levels of Legal Assistance'}
          </h1>
          <p className="mt-4 font-body text-body text-ink-soft">
            {lang === 'bn'
              ? 'সাধারণ তথ্য খোঁজা থেকে শুরু করে সুপ্রিম কোর্ট ও জেলা জজ আদালতের আইনজীবীর আনুষ্ঠানিক প্রতিনিধিত্ব — আপনার প্রয়োজন অনুযায়ী সঠিক ধাপে সেবা নিন।'
              : 'From instant cited legal search to verified advocate representation. Transparent costs, grounded statutes, and no hidden surprises.'}
          </p>
        </div>

        {/* The 4 Detailed Rungs */}
        <div className="space-y-12">
          {rungs.map((r) => {
            const Icon = r.icon;
            return (
              <section
                key={r.id}
                id={r.id}
                className="scroll-mt-24 rounded border border-granite bg-white p-6 sm:p-10 shadow-sm"
              >
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-8">
                  {/* Left content */}
                  <div className="flex-1 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded bg-clay-tint text-clay-deep">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <span className="font-mono text-xs font-bold text-clay-deep uppercase">{r.num}</span>
                        <h2 className="font-display text-xl font-bold text-ink">
                          {lang === 'bn' ? r.titleBn : r.titleEn}
                        </h2>
                      </div>
                    </div>

                    <p className="text-body text-ink-soft leading-relaxed">
                      {lang === 'bn' ? r.descBn : r.descEn}
                    </p>

                    {/* Features & Deliverables */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-granite-soft">
                      <div>
                        <h3 className="font-mono text-label uppercase text-clay-deep font-semibold mb-2">
                          {lang === 'bn' ? 'আপনি যা পাবেন' : 'What You Get'}
                        </h3>
                        <ul className="space-y-1.5 text-xs text-ink-soft">
                          {(lang === 'bn' ? r.whatYouGetBn : r.whatYouGetEn).map((item, i) => (
                            <li key={i} className="flex items-center gap-2">
                              <CheckCircle2 className="h-3.5 w-3.5 text-clay-deep shrink-0" />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <h3 className="font-mono text-label uppercase text-granite font-semibold mb-2">
                          {lang === 'bn' ? 'সীমাবদ্ধতা ও সতর্কতা' : 'Limitations'}
                        </h3>
                        <ul className="space-y-1.5 text-xs text-granite">
                          {(lang === 'bn' ? r.limitsBn : r.limitsEn).map((item, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="text-granite mt-0.5">•</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Right Meta Card */}
                  <div className="w-full lg:w-72 rounded border border-granite-soft bg-bone/60 p-5 space-y-4 shrink-0">
                    <div>
                      <span className="font-mono text-[11px] uppercase text-granite">{lang === 'bn' ? 'খরচ / ফি' : 'Cost'}</span>
                      <p className="font-display text-base font-bold text-ink">{lang === 'bn' ? r.costBn : r.costEn}</p>
                    </div>

                    <div>
                      <span className="font-mono text-[11px] uppercase text-granite">{lang === 'bn' ? 'সময়' : 'Speed'}</span>
                      <p className="font-body text-sm font-medium text-ink-soft">{lang === 'bn' ? r.speedBn : r.speedEn}</p>
                    </div>

                    <div className="pt-2">
                      <Link to={r.ctaLink} className="block">
                        <Button size="sm" variant="primary" className="w-full justify-center">
                          <span>{lang === 'bn' ? r.ctaTextBn : r.ctaTextEn}</span>
                          <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
