import { Link } from 'react-router-dom';
import { Home, MessageSquare } from 'lucide-react';
import { useLang } from '../context/LanguageContext';
import { Button } from '../components/ui/Button';

export default function NotFound() {
  const { lang } = useLang();

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-6 text-center font-body">
      <div className="max-w-md space-y-6">
        {/* Tipped scale mark (not settling) */}
        <div className="flex justify-center text-clay-deep">
          <svg
            width="80"
            height="80"
            viewBox="0 0 100 100"
            className="stroke-clay fill-none -rotate-12 transform"
            strokeWidth="2.5"
            strokeLinecap="round"
          >
            <line x1="50" y1="20" x2="50" y2="80" className="stroke-ink" />
            <line x1="20" y1="35" x2="80" y2="25" className="stroke-clay-deep" strokeWidth="3" />
            {/* Left tipped pan */}
            <path d="M 12 60 Q 20 70 28 60 Z" fill="currentColor" fillOpacity="0.15" />
            <line x1="20" y1="35" x2="12" y2="60" strokeDasharray="2,2" />
            <line x1="20" y1="35" x2="28" y2="60" strokeDasharray="2,2" />
            {/* Right high pan */}
            <path d="M 72 50 Q 80 60 88 50 Z" fill="currentColor" fillOpacity="0.15" />
            <line x1="80" y1="25" x2="72" y2="50" strokeDasharray="2,2" />
            <line x1="80" y1="25" x2="88" y2="50" strokeDasharray="2,2" />
            {/* Base */}
            <path d="M 35 85 L 65 85" className="stroke-ink" strokeWidth="4" />
          </svg>
        </div>

        <div>
          <span className="font-mono text-sm font-bold text-clay-deep">404 ERROR</span>
          <h1 className="font-display text-2xl font-bold text-ink mt-1">
            {lang === 'bn' ? 'পৃষ্ঠাটি খুঁজে পাওয়া যায়নি' : 'Page Not Found'}
          </h1>
          <p className="mt-2 text-xs text-granite leading-relaxed">
            {lang === 'bn'
              ? 'আপনার কাঙ্ক্ষিত পৃষ্ঠাটির ঠিকানা সঠিক নয় অথবা সরানো হয়েছে। মূল পাতায় ফিরে যেতে পারেন অথবা নতুন প্রশ্ন করতে পারেন।'
              : 'The path you requested does not exist or has been relocated within the platform.'}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link to="/">
            <Button size="sm" variant="secondary" className="w-full sm:w-auto">
              <Home className="mr-1.5 h-3.5 w-3.5" />
              <span>{lang === 'bn' ? 'মূল পাতা' : 'Home Page'}</span>
            </Button>
          </Link>
          <Link to="/app/chat">
            <Button size="sm" variant="primary" className="w-full sm:w-auto">
              <MessageSquare className="mr-1.5 h-3.5 w-3.5" />
              <span>{lang === 'bn' ? 'আইনি প্রশ্ন করুন' : 'Ask AI Assistant'}</span>
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
