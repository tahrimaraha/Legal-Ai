import { useState } from 'react';
import { AlertCircle, X } from 'lucide-react';
import { useLang } from '../../context/LanguageContext';

export function DisclaimerStrip() {
  const { lang } = useLang();
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div
      role="region"
      aria-label="Legal Disclaimer"
      className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-between border-t border-granite bg-bone-deep/95 px-4 py-2 backdrop-blur font-body text-xs text-ink-soft sm:px-8"
    >
      <div className="flex items-center gap-2 max-w-4xl mx-auto text-center justify-center">
        <AlertCircle className="h-4 w-4 shrink-0 text-clay-deep" />
        <p className="leading-snug">
          {lang === 'bn' ? (
            <>
              <strong className="font-semibold text-ink">আইনি সতর্কতা:</strong> এটি তথ্যগত সহায়তা, আইনি পরামর্শ নয়। গুরুত্বপূর্ণ ও জটিল বিষয়ে যোগ্য তালিকাভুক্ত আইনজীবীর পরামর্শ নিন।
            </>
          ) : (
            <>
              <strong className="font-semibold text-ink">Legal Notice:</strong> This platform provides legal information, not legal advice. For binding counsel, consult a qualified lawyer.
            </>
          )}
        </p>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="text-granite hover:text-ink transition p-1"
        aria-label="Dismiss disclaimer banner"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
