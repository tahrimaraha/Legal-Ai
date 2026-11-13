import { useId, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { useReducedMotion } from '../../lib/motion';

export interface AccordionItem {
  q: string;
  a: string;
}

export function Accordion({ items }: { items: AccordionItem[] }) {
  const [open, setOpen] = useState<number | null>(0);
  const reduced = useReducedMotion();
  const uid = useId();

  return (
    <div className="border-t border-granite-soft">
      {items.map((item, i) => {
        const isOpen = open === i;
        return (
          <div key={`accordion-${i}`} className="border-b border-granite-soft">
            <h3>
              <button
                type="button"
                id={`${uid}-trigger-${i}`}
                aria-expanded={isOpen}
                aria-controls={`${uid}-panel-${i}`}
                onClick={() => setOpen(isOpen ? null : i)}
                className="flex w-full items-start justify-between gap-6 py-6 text-left transition-colors duration-200 hover:text-clay-deep"
              >
                <span className="font-display text-h3 text-ink">{item.q}</span>
                <motion.span
                  aria-hidden="true"
                  animate={{ rotate: isOpen ? 45 : 0 }}
                  transition={{ duration: reduced ? 0 : 0.24, ease: [0.16, 1, 0.3, 1] }}
                  className="mt-1 shrink-0 text-clay"
                >
                  <Plus className="h-5 w-5" />
                </motion.span>
              </button>
            </h3>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  id={`${uid}-panel-${i}`}
                  role="region"
                  aria-labelledby={`${uid}-trigger-${i}`}
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: reduced ? 0.12 : 0.3, ease: [0.16, 1, 0.3, 1] }}
                  className="overflow-hidden"
                >
                  <p className="max-w-prose pb-7 pr-10 text-body text-ink-soft/85">{item.a}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
