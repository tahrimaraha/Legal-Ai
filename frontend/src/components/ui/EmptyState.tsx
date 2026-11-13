import type { ReactNode } from 'react';
import { AlertCircle, Scale, RefreshCw } from 'lucide-react';
import { Button } from './Button';
import { useLang } from '../../context/LanguageContext';

interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: ReactNode;
}

export function EmptyState({ title, description, actionLabel, onAction, icon }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center border border-dashed border-granite rounded bg-bone/50 my-4">
      <div className="mb-3 text-clay-deep">
        {icon || <Scale className="h-8 w-8 opacity-60" />}
      </div>
      <h4 className="font-display text-base font-semibold text-ink">{title}</h4>
      <p className="mt-1 max-w-sm text-caption text-granite leading-relaxed">{description}</p>
      {actionLabel && onAction && (
        <div className="mt-4">
          <Button size="sm" variant="secondary" onClick={onAction}>
            {actionLabel}
          </Button>
        </div>
      )}
    </div>
  );
}

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ title, message, onRetry }: ErrorStateProps) {
  const { lang } = useLang();
  return (
    <div className="flex flex-col items-center justify-center p-6 text-center border border-brick/30 bg-brick/5 rounded my-4">
      <AlertCircle className="h-6 w-6 text-brick mb-2" />
      <h4 className="font-display text-sm font-semibold text-brick">
        {title || (lang === 'bn' ? 'একটি ত্রুটি ঘটেছে' : 'An error occurred')}
      </h4>
      <p className="mt-1 text-xs text-ink-soft max-w-md">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-3 inline-flex items-center gap-1.5 rounded border border-brick/40 px-3 py-1 text-xs font-medium text-brick hover:bg-brick/10 transition"
        >
          <RefreshCw className="h-3 w-3" />
          <span>{lang === 'bn' ? 'পুনরায় চেষ্টা করুন' : 'Try again'}</span>
        </button>
      )}
    </div>
  );
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-granite-soft/60 ${className}`} />;
}
