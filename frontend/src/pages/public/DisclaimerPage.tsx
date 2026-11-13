import { ShieldAlert } from 'lucide-react';
import { useLang } from '../../context/LanguageContext';

export default function DisclaimerPage() {
  const { lang } = useLang();

  return (
    <div className="py-12 sm:py-16">
      <div className="shell max-w-prose space-y-8 font-body text-ink-soft">
        <div>
          <span className="font-mono text-label uppercase tracking-wider text-clay-deep">
            {lang === 'bn' ? 'আইনি নোটিশ ও দায়মুক্তি' : 'Legal Disclaimer & Limitations'}
          </span>
          <h1 className="font-display text-display font-bold text-ink mt-2">
            {lang === 'bn' ? 'দায়মুক্তি বিবৃতি ও নীতিমালা' : 'Platform Disclaimer'}
          </h1>
        </div>

        {/* Big Alert Banner */}
        <div className="rounded border border-clay bg-clay-tint/40 p-6 space-y-3">
          <div className="flex items-center gap-2 text-clay-deep">
            <ShieldAlert className="h-6 w-6 shrink-0" />
            <h2 className="font-display text-lg font-bold text-ink">
              {lang === 'bn' ? 'এটি তথ্যগত সহায়তা, আইনি পরামর্শ নয়' : 'Legal Information, Not Legal Advice'}
            </h2>
          </div>
          <p className="text-sm leading-relaxed text-ink-soft">
            {lang === 'bn'
              ? 'আইনি সহায়ক প্ল্যাটফর্মে প্রদত্ত সকল তথ্য, চ্যাট উত্তর ও ড্রাফট শুধুমাত্র নাগরিক সচেতনতা ও তথ্যগত সহায়তার জন্য প্রস্তুতকৃত। এটি বাংলাদেশ বার কাউন্সিলের কোনো সনদপ্রাপ্ত আইনজীবীর আনুষ্ঠানিক আইনি মতামত (Legal Opinion) বা আইনি প্রতিনিধিত্ব প্রতিস্থাপন করে না।'
              : 'All answers, statute extracts, and draft templates provided by AI Legal Assistant for Citizens are strictly for educational and informational purposes. They do not constitute formal legal opinions, nor do they create an attorney-client relationship.'}
          </p>
        </div>

        <section className="space-y-4">
          <h3 className="font-display text-xl font-bold text-ink">
            {lang === 'bn' ? '১. কোনো আইনজীবী-মক্কেল সম্পর্ক স্থাপিত হয় না' : '1. No Attorney-Client Relationship'}
          </h3>
          <p className="text-sm leading-relaxed">
            {lang === 'bn'
              ? 'এআই প্ল্যাটফর্মের সাথে চ্যাট করা বা খসড়া দলিল তৈরির মাধ্যমে কোনো আইনজীবী-মক্কেল সম্পর্ক প্রতিষ্ঠিত হয় না। আপনি যখন কোনো তালিকাভুক্ত আইনজীবীর সাথে আলাদাভাবে ওকালতনামা সম্পাদন করবেন ও পরামর্শের চুক্তি করবেন, কেবল তখনই আনুষ্ঠানিক প্রতিনিধিত্ব শুরু হবে।'
              : 'Using this software does not establish an attorney-client privilege. Formal representation is solely initiated when you execute a direct engagement contract and vakalatnama with an enrolled advocate.'}
          </p>
        </section>

        <section className="space-y-4">
          <h3 className="font-display text-xl font-bold text-ink">
            {lang === 'bn' ? '২. আইনের পরিবর্তন ও আদালতের সিদ্ধান্ত' : '2. Legislative Amendments & Case Law'}
          </h3>
          <p className="text-sm leading-relaxed">
            {lang === 'bn'
              ? 'বাংলাদেশের আইন এবং উচ্চ আদালতের রায় প্রতিনিয়ত হালনাগাদ ও পরিবর্তিত হয়। আমরা সর্বোচ্চ সতর্কতার সাথে সংকলিত আইনসমূহ হালনাগাদ রাখার চেষ্টা করি, তবে সাম্প্রতিকতম কোনো আইনি সংশোধনী বা বিচারাধীন মামলায় ব্যবহারের পূর্বে একজন আইনজীবীর সাথে তথ্যসমূহ যাচাই করে নেওয়া নাগরিকের দায়িত্ব।'
              : 'Bangladeshi statutory law and judicial precedents evolve. While we strive to maintain our vector corpus with precision, users must verify recent amendments and notifications with an advocate before taking irreversible legal steps.'}
          </p>
        </section>

        <section className="space-y-4">
          <h3 className="font-display text-xl font-bold text-ink">
            {lang === 'bn' ? '৩. দায়বদ্ধতার সীমাবদ্ধতা' : '3. Limitation of Liability'}
          </h3>
          <p className="text-sm leading-relaxed">
            {lang === 'bn'
              ? 'এই প্ল্যাটফর্মের তথ্যের ভিত্তিতে গৃহীত কোনো সিদ্ধান্তের প্রত্যক্ষ বা পরোক্ষ ক্ষতির জন্য প্ল্যাটফর্ম কর্তৃপক্ষ বা ডেভেলপমেন্ট টিম কোনো অবস্থাতেই আইনত দায়ী থাকবে না।'
              : 'Under no circumstances shall the platform maintainers, contributors, or developers be held liable for any direct or indirect damages arising from the use or inability to use this information.'}
          </p>
        </section>
      </div>
    </div>
  );
}
