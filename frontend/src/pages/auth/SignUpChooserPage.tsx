import { Link } from 'react-router-dom';
import { User, Briefcase, ArrowRight } from 'lucide-react';
import { useLang } from '../../context/LanguageContext';
import { ScalesDivider } from '../../components/ui/ScalesDivider';

export default function SignUpChooserPage() {
  const { lang } = useLang();

  return (
    <div className="space-y-6 font-body">
      <div className="text-center">
        <h1 className="font-display text-2xl font-bold text-ink">
          {lang === 'bn' ? 'অ্যাকাউন্টের ধরন নির্বাচন করুন' : 'Choose Your Account Type'}
        </h1>
        <p className="mt-2 text-sm text-[#8a6a55]">
          {lang === 'bn'
            ? 'আপনি নাগরিক হিসেবে সাহায্য চান নাকি আইনজীবী হিসেবে যুক্ত হতে চান?'
            : 'Select how you want to use the legal AI platform'}
        </p>
        <ScalesDivider className="mt-5" />
      </div>

      <div className="space-y-4">
        {/* Citizen Card */}
        <Link
          to="/signup/citizen"
          className="flex items-start gap-4 rounded-xl border border-[#dcc8b6] bg-[#fffdf9] p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[#8a5a3c] hover:shadow-md group"
        >
          <div className="rounded-lg bg-[#f3e2d2] p-3 text-[#6b3c22] shrink-0">
            <User className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-base font-bold text-ink group-hover:text-clay-deep transition">
                {lang === 'bn' ? 'আমি একজন নাগরিক' : 'I am a Citizen'}
              </h2>
              <ArrowRight className="h-4 w-4 text-granite group-hover:text-clay-deep group-hover:translate-x-0.5 transition" />
            </div>
            <p className="mt-1 text-xs text-ink-soft leading-relaxed">
              {lang === 'bn'
                ? 'আইনি প্রশ্ন জিজ্ঞাসা, উত্তরের আইনজীবী যাচাই ও লিগ্যাল নোটিশ ড্রাফট করার জন্য।'
                : 'Ask legal questions, verify answers with advocates, and draft standard legal notices.'}
            </p>
          </div>
        </Link>

        {/* Lawyer Card */}
        <Link
          to="/signup/lawyer"
          className="flex items-start gap-4 rounded-xl border border-[#dcc8b6] bg-[#fffdf9] p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[#8a5a3c] hover:shadow-md group"
        >
          <div className="rounded-lg bg-[#6b3c22] text-[#fff7ef] p-3 shrink-0">
            <Briefcase className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-base font-bold text-ink group-hover:text-clay-deep transition">
                {lang === 'bn' ? 'আমি একজন আইনজীবী' : 'I am an Advocate / Lawyer'}
              </h2>
              <ArrowRight className="h-4 w-4 text-granite group-hover:text-clay-deep group-hover:translate-x-0.5 transition" />
            </div>
            <p className="mt-1 text-xs text-ink-soft leading-relaxed">
              {lang === 'bn'
                ? 'বার কাউন্সিলের সনদ যুক্ত করুন, এআই উত্তর যাচাই করুন এবং সরাসরি ক্লায়েন্টদের পরামর্শ দিন।'
                : 'Register with Bar Council enrolment, review AI answers, and offer verified consultations.'}
            </p>
          </div>
        </Link>
      </div>

      <div className="text-center text-xs text-ink-soft pt-2">
        {lang === 'bn' ? 'ইতিমধ্যে অ্যাকাউন্ট আছে? ' : 'Already have an account? '}
        <Link to="/signin" className="font-semibold text-clay-deep hover:underline">
          {lang === 'bn' ? 'সাইন ইন করুন' : 'Sign in'}
        </Link>
      </div>
    </div>
  );
}
