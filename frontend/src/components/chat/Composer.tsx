import { useEffect, useRef, useState } from 'react';
import { ArrowUp, Paperclip, Square } from 'lucide-react';
import { useLang } from '../../context/LanguageContext';

interface Props {
  onSend: (text: string) => void;
  onStop: () => void;
  busy: boolean;
}

const LIMIT = 1000;

export function Composer({ onSend, onStop, busy }: Props) {
  const { lang, t, num } = useLang();
  const [value, setValue] = useState('');
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
  }, [value]);

  const submit = () => {
    if (!value.trim() || busy) return;
    onSend(value);
    setValue('');
  };

  return (
    <div className="border-t border-granite-soft bg-bone px-4 pb-5 pt-4 sm:px-8">
      <form
        className="mx-auto max-w-3xl rounded-md border border-granite-soft bg-paper shadow-composer transition-colors focus-within:border-clay"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <label htmlFor="composer" className="sr-only">
          {t.chat.placeholder}
        </label>
        <textarea
          id="composer"
          ref={ref}
          rows={1}
          value={value}
          maxLength={LIMIT}
          placeholder={t.chat.placeholder}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          className="w-full resize-none bg-transparent px-5 pb-2 pt-4 text-body text-ink-soft placeholder:text-granite focus:outline-none"
        />

        <div className="flex items-center justify-between gap-3 border-t border-granite-soft px-3 py-2">
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label={t.chat.attach}
              title={t.chat.attach}
              className="rounded-sm p-2 text-clay-deep transition-colors hover:bg-clay-tint"
            >
              <Paperclip className="h-4 w-4" />
            </button>
            <span className="font-mono text-[0.625rem] tracking-label text-granite">{lang === 'bn' ? 'বাংলা' : 'EN'}</span>
          </div>

          <div className="flex items-center gap-3">
            <span className="font-mono text-[0.625rem] tracking-label text-granite">
              {num(value.length)}/{num(LIMIT)}
            </span>
            {busy ? (
              <button
                type="button"
                onClick={onStop}
                aria-label={t.chat.stop}
                className="flex h-9 w-9 items-center justify-center rounded-sm border border-granite text-ink transition-colors hover:border-clay"
              >
                <Square className="h-3.5 w-3.5" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={!value.trim()}
                aria-label={t.chat.send}
                className="flex h-9 w-9 items-center justify-center rounded-sm bg-clay text-bone transition-colors hover:bg-clay-deep disabled:bg-granite-soft disabled:text-granite"
              >
                <ArrowUp className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </form>
      <p className="mx-auto mt-3 max-w-3xl text-center text-caption text-granite">{t.disclaimer.full}</p>
    </div>
  );
}
