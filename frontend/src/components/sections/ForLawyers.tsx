import { ArrowRight, CheckCircle2, Shield, Users, Award } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLang } from '../../context/LanguageContext';
import { Button } from '../ui/Button';

export function ForLawyers() {
  const { lang } = useLang();

  const benefits = [
    {
      titleBn: 'আইনি এআই উত্তর যাচাই ও অবদান',
      titleEn: 'Review & Verify AI Answers',
      descBn: 'সাধারণ নাগরিকের আইনি প্রশ্নের এআই উত্তর যাচাই করে সুনাম ও রেফারাল অর্জন করুন।',
      descEn: 'Audit statute grounding and establish verified authority in your practice area.',
    },
    {
      titleBn: 'যাচাইকৃত ক্লায়েন্ট থেকে সরাসরি পরামর্শ অনুরোধ',
      titleEn: 'Receive Filtered Client Inquiries',
      descBn: 'আপনার জেলা ও বিশেষায়িত কোর্ট অনুযায়ী নাগরিকদের সাথে সরাসরি অডিও/ভিডিও ও চেম্বার পরামর্শ।',
      descEn: 'Connect with citizens actively seeking advocate representation in your jurisdiction.',
    },
    {
      titleBn: 'পেশাদার পাবলিক প্রোফাইল ও পরিচিতি',
      titleEn: 'Build Your Verified Public Profile',
      descBn: 'বাংলাদেশ বার কাউন্সিলের সনদ ও কোর্ট অভিজ্ঞতা প্রদর্শনকারী ডিজিটাল প্রোফাইল।',
      descEn: 'Showcase Bar Council credentials, court admissions, and client ratings transparently.',
    },
  ];

  return (
    <section className="section-pad bg-ink text-white">
      <div className="shell">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left copy */}
          <div className="lg:col-span-6 space-y-6">
            <span className="font-mono text-label uppercase text-clay tracking-wider">
              {lang === 'bn' ? 'আইনজীবীদের জন্য' : 'For Advocates & Legal Practitioners'}
            </span>

            <h2 className="font-display text-h2 font-bold text-white leading-tight">
              {lang === 'bn'
                ? 'আইনের মর্যাদা রক্ষা ও সাধারণ মানুষের আস্থার সারথী হোন'
                : 'Bridge the Access-to-Justice Gap in Bangladesh'}
            </h2>

            <p className="font-body text-body text-granite-soft">
              {lang === 'bn'
                ? 'অনলাইন বিভ্রান্তি রোধে আসল আইনের ধারা যাচাই করুন, সাধারণ নাগরিককে পেশাদার আইনি সহায়তা দিন এবং আপনার প্র্যাকটিসের পরিধি বিস্তার করুন।'
                : 'Join a curated network of Bar Council enrolled advocates reviewing citations, consulting clients, and shaping transparent legal access.'}
            </p>

            <div className="pt-2">
              <Link to="/signup/lawyer">
                <Button size="lg" variant="primary">
                  <span>{lang === 'bn' ? 'আইনজীবী হিসেবে যুক্ত হোন' : 'Join as an Advocate'}</span>
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>

          {/* Right Cards */}
          <div className="lg:col-span-6 space-y-4">
            {benefits.map((b, idx) => (
              <div
                key={idx}
                className="flex items-start gap-4 rounded border border-white/10 bg-white/5 p-5 backdrop-blur hover:border-clay transition"
              >
                <div className="rounded bg-clay/20 p-2 text-clay shrink-0">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-display text-sm font-semibold text-white">
                    {lang === 'bn' ? b.titleBn : b.titleEn}
                  </h3>
                  <p className="mt-1 text-xs text-granite leading-relaxed">
                    {lang === 'bn' ? b.descBn : b.descEn}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
