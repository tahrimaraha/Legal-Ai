import { useLang } from '../../context/LanguageContext';

export default function TermsPage() {
  const { lang } = useLang();

  return (
    <div className="py-12 sm:py-16">
      <div className="shell max-w-prose space-y-8 font-body text-ink-soft">
        <div>
          <span className="font-mono text-label uppercase tracking-wider text-clay-deep">
            {lang === 'bn' ? 'ব্যবহারের শর্তাবলী' : 'Terms of Service'}
          </span>
          <h1 className="font-display text-display font-bold text-ink mt-2">
            {lang === 'bn' ? 'ব্যবহারের নিয়ম ও নীতিমালা' : 'Terms of Use'}
          </h1>
          <p className="mt-2 text-xs font-mono text-granite">Last updated: May 2025</p>
        </div>

        <section className="space-y-3">
          <h2 className="font-display text-lg font-bold text-ink">
            {lang === 'bn' ? '১. সেবার গ্রহণযোগ্যতা' : '1. Acceptance of Terms'}
          </h2>
          <p className="text-sm leading-relaxed">
            {lang === 'bn'
              ? 'আইনি সহায়ক ওয়েবসাইট ও অ্যাপ্লিকেশন ব্যবহারের মাধ্যমে আপনি এই সকল শর্তাবলী মেনে নিতে সম্মত হচ্ছেন। আপনি যদি কোনো শর্তের সাথে অসম্মত হন, তবে প্ল্যাটফর্মটি ব্যবহার থেকে বিরত থাকুন।'
              : 'By accessing and utilizing AI Legal Assistant for Citizens, you acknowledge and agree to comply with all terms and conditions set forth herein.'}
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-lg font-bold text-ink">
            {lang === 'bn' ? '২. উপযুক্ত ব্যবহার' : '2. Permissible Use'}
          </h2>
          <p className="text-sm leading-relaxed">
            {lang === 'bn'
              ? 'এই প্ল্যাটফর্মটি শুধুমাত্র সৎ উদ্দেশ্যে আইনগত তথ্য আহরণ ও আইনি সহযোগিতার জন্য ব্যবহার করতে হবে। ভুয়া নোটিশ তৈরি, প্রতারণামূলক কার্যকলাপ বা কাউকে ব্ল্যাকমেইল বা হয়রানি করার উদ্দেশ্যে সিস্টেমের কোনো অংশ ব্যবহার করা সম্পূর্ণ নিষিদ্ধ।'
              : 'The service must be used solely for legitimate legal literacy and consultation purposes. Generating deceptive notices or fraudulent materials is strictly prohibited.'}
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-lg font-bold text-ink">
            {lang === 'bn' ? '৩. আইনজীবী যাচাই ও ফি' : '3. Lawyer Verifications & Fees'}
          </h2>
          <p className="text-sm leading-relaxed">
            {lang === 'bn'
              ? 'আইনজীবীদের সাথে ব্যক্তিগত পরামর্শের ফি আইনজীবীর প্রোফাইলে প্রদর্শিত হারে প্রযোজ্য। প্ল্যাটফর্ম শুধুমাত্র সংযোগ স্থাপনের মাধ্যম হিসেবে কাজ করে এবং আইনজীবীর স্বাধীন পেশাদার সিদ্ধান্তের দায় বহন করে না।'
              : 'Consultation fees are established independently by enrolled advocates. The platform operates as a communication medium and does not interfere with advocate professional judgment.'}
          </p>
        </section>
      </div>
    </div>
  );
}
