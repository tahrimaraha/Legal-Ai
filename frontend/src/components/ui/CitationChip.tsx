import { motion } from 'framer-motion';
import { BookOpen } from 'lucide-react';
import { useLang } from '../../context/LanguageContext';
import type { Citation } from '../../mocks/types';

interface Props {
  citation: Citation;
  index?: number;
  onOpen: (c: Citation) => void;
  active?: boolean;
}

/**
 * The trust claim, made visible. Reads as a reference in a printed judgment:
 * a mono index numeral, the Act name, the section.
 */
export function CitationChip({ citation, index = 0, onOpen, active = false }: Props) {
  const { lang, num } = useLang();
  const label = lang === 'bn' ? citation.labelBn : citation.labelEn;

  return (
    <motion.button
      type="button"
      onClick={() => onOpen(citation)}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
      aria-expanded={active}
      className={`group inline-flex max-w-full items-center gap-2 rounded-full border px-3 py-1.5 text-left text-caption transition-colors duration-200 ${
        active
          ? 'border-clay bg-clay-tint text-ink'
          : 'border-granite-soft bg-clay-tint/60 text-ink-soft hover:border-clay hover:bg-clay-tint'
      }`}
    >
      <span className="font-mono text-[0.625rem] tracking-label text-clay-deep">{num(String(index + 1).padStart(2, '0'))}</span>
      <span className="h-3 w-px bg-granite-soft" aria-hidden="true" />
      <span className="truncate font-medium">{label}</span>
      <BookOpen className="h-3.5 w-3.5 shrink-0 text-clay-deep transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true" />
    </motion.button>
  );
}
