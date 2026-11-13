import { Scale } from 'lucide-react';
import { useLang } from '../../context/LanguageContext';

/**
 * Designed as part of the system rather than bolted on: a marginal note,
 * set against a hairline rule like an annotation in a printed statute.
 */
export function Disclaimer({ variant = 'bar' }: { variant?: 'bar' | 'note' | 'block' }) {
  const { t } = useLang();

  if (variant === 'note') {
    return (
      <p className="flex items-start gap-2 text-caption text-clay-deep">
        <Scale className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span>{t.disclaimer.answerNote}</span>
      </p>
    );
  }

  if (variant === 'block') {
    return (
      <div className="margin-rule pl-5">
        <p className="label mb-2">{t.footer.disclaimerTitle}</p>
        <p className="max-w-prose text-caption leading-relaxed text-granite">{t.disclaimer.full}</p>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center gap-2 border-b border-granite-soft bg-clay-tint px-4 py-2 text-center">
      <Scale className="h-3.5 w-3.5 shrink-0 text-clay-deep" aria-hidden="true" />
      <p className="text-caption text-ink-soft">
        <span className="font-semibold">{t.disclaimer.short}</span>{' '}
        <span className="hidden text-clay-deep sm:inline">{t.disclaimer.full}</span>
      </p>
    </div>
  );
}
