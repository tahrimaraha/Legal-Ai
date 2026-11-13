import { useLang } from '../../context/LanguageContext';

export default function PrivacyPage() {
  const { lang } = useLang();

  return (
    <div className="py-12 sm:py-16">
      <div className="shell max-w-prose space-y-8 font-body text-ink-soft">
        <div>
          <span className="font-mono text-label uppercase tracking-wider text-clay-deep">
            {lang === 'bn' ? 'গোপনীয়তা নীতি' : 'Privacy Policy'}
          </span>
          <h1 className="font-display text-display font-bold text-ink mt-2">
            {lang === 'bn' ? 'ব্যক্তিগত তথ্যের সুরক্ষা নীতি' : 'Data Privacy & Protection'}
          </h1>
          <p className="mt-2 text-xs font-mono text-granite">Last updated: May 2025</p>
        </div>

        <section className="space-y-3">
          <h2 className="font-display text-lg font-bold text-ink">
            {lang === 'bn' ? '১. আমরা কী তথ্য সংগ্রহ করি' : '1. Information We Collect'}
          </h2>
          <p className="text-sm leading-relaxed">
            {lang === 'bn'
              ? 'আমরা শুধুমাত্র আপনার প্রদত্ত প্রশ্ন, ইমেইল ও ড্রাফটের প্রয়োজনীয় তথ্যাদি প্রক্রিয়া করি। আমরা অপ্রয়োজনীয় গোপনীয় তথ্য, যেমন বায়োমেট্রিক বা এনআইডি নম্বর নিজে থেকে সংগ্রহ করি না।'
              : 'We collect user-submitted legal queries, account emails, and draft inputs solely to facilitate RAG vector search, verification, and consultation scheduling.'}
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-lg font-bold text-ink">
            {lang === 'bn' ? '২. সংবেদনশীল তথ্যের সুরক্ষা' : '2. Sensitive Data Redaction'}
          </h2>
          <p className="text-sm leading-relaxed">
            {lang === 'bn'
              ? 'চ্যাট বা ডকুমেন্টে কোনো দলিল আপলোড করার আগে আমরা নাগরিকদের পরামর্শ দিই যাতে তারা জাতীয় পরিচয়পত্র নম্বর বা ব্যাংক হিসাব নম্বর মুছে দেন।'
              : 'We strongly urge all citizens to redact sensitive identity numbers and banking details before submitting questions or uploading case documents.'}
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-lg font-bold text-ink">
            {lang === 'bn' ? '৩. তথ্য মোছার অধিকার' : '3. Right to Deletion'}
          </h2>
          <p className="text-sm leading-relaxed">
            {lang === 'bn'
              ? 'আপনি যেকোনো সময় আপনার কথোপকথন ইতিহাস ও ড্রাফট মুছে ফেলতে পারেন এবং অ্যাকাউন্ট সেটিংসের বিপদজনক অঞ্চল (Danger Zone) থেকে অ্যাকাউন্ট ও সকল তথ্য সম্পূর্ণ ডিলিট করার অনুরোধ জানাতে পারেন।'
              : 'Citizens retain full sovereignty over their data. You can delete conversations, draft records, or purge your account permanently at any time.'}
          </p>
        </section>
      </div>
    </div>
  );
}
