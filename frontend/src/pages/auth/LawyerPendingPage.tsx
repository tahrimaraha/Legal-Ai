import { Link } from 'react-router-dom';
import { Clock, ShieldCheck, ArrowRight, Home } from 'lucide-react';
import { useLang } from '../../context/LanguageContext';
import { Button } from '../../components/ui/Button';

export default function LawyerPendingPage() {
  const { lang } = useLang();

  return (
    <div className="text-center space-y-6 font-body py-4">
      <div className="flex justify-center text-clay-deep">
        <div className="rounded-full bg-clay-tint p-4 border border-clay/30">
          <Clock className="h-10 w-10 animate-pulse text-clay-deep" />
        </div>
      </div>

      <div>
        <span className="font-mono text-[11px] uppercase tracking-wider text-clay-deep font-semibold">
          {lang === 'bn' ? 'আবেদন গৃহীত হয়েছে' : 'Application Received'}
        </span>
        <h1 className="font-display text-2xl font-bold text-ink mt-1">
          {lang === 'bn' ? 'সনদপত্র যাচাই প্রক্রিয়াধীন' : 'Verification Under Review'}
        </h1>
        <p className="mt-3 text-xs text-ink-soft leading-relaxed max-w-sm mx-auto">
          {lang === 'bn'
            ? 'ধন্যবাদ। আপনার দাখিলকৃত বাংলাদেশ বার কাউন্সিলের সনদ নম্বর ও তথ্যাদি আমাদের অ্যাডমিন টিম কর্তৃক যাচাই করা হচ্ছে। সাধারণত ২৪-৪৮ ঘণ্টার মধ্যে যাচাই সম্পন্ন হয়।'
            : 'Your Bar Council enrolment credentials have been submitted for administrative verification. Reviews are typically completed within 24–48 hours.'}
        </p>
      </div>

      <div className="rounded border border-granite-soft bg-bone p-4 text-left text-xs space-y-2 max-w-sm mx-auto">
        <h3 className="font-mono text-label uppercase text-clay-deep font-semibold">
          {lang === 'bn' ? 'যাচাইকালে কী প্রক্রিয়া সম্পন্ন হয়?' : 'What We Verify:'}
        </h3>
        <ul className="space-y-1 text-ink-soft text-[11px]">
          <li>• Bangladesh Bar Council roll confirmation</li>
          <li>• District bar association membership & standing</li>
          <li>• Professional fee transparency & practice jurisdiction</li>
        </ul>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
        <Link to="/lawyer">
          <Button size="sm" variant="secondary">
            <span>{lang === 'bn' ? 'আইনজীবী পোর্টালে যান' : 'Go to Lawyer Workspace'}</span>
            <ArrowRight className="ml-1 h-3.5 w-3.5" />
          </Button>
        </Link>
        <Link to="/">
          <Button size="sm" variant="ghost">
            <Home className="mr-1 h-3.5 w-3.5" />
            <span>{lang === 'bn' ? 'মূল পাতা' : 'Home'}</span>
          </Button>
        </Link>
      </div>
    </div>
  );
}
