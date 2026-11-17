import { useEffect, useState } from 'react';
import { AlertCircle, X } from 'lucide-react';
import { useLang } from '../../context/LanguageContext';
import { ApiError } from '../../lib/api';

/**
 * Shows backend errors that a page did not handle itself (e.g. "already reviewed",
 * "not assigned to you"), so a failed action never fails silently.
 */
export function ErrorToast() {
  const { lang } = useLang();
  const [error, setError] = useState<ApiError | null>(null);

  useEffect(() => {
    const onRejection = (event: PromiseRejectionEvent) => {
      if (event.reason instanceof ApiError) {
        event.preventDefault();
        setError(event.reason);
      }
    };
    window.addEventListener('unhandledrejection', onRejection);
    return () => window.removeEventListener('unhandledrejection', onRejection);
  }, []);

  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(() => setError(null), 6000);
    return () => clearTimeout(timer);
  }, [error]);

  if (!error) return null;
  return (
    <div
      role="alert"
      className="fixed bottom-16 left-1/2 z-[100] flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 items-start gap-2 rounded border border-brick/40 bg-white p-3 text-xs text-brick shadow-composer font-body"
    >
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <span className="flex-1">{lang === 'bn' ? error.messageBn : error.message}</span>
      <button type="button" onClick={() => setError(null)} aria-label="Dismiss" className="shrink-0 text-granite hover:text-ink">
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
