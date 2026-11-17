import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check, Copy, Flag, ThumbsDown, ThumbsUp, ShieldCheck, FileText, Sparkles } from 'lucide-react';
import { useLang } from '../../context/LanguageContext';
import type { Citation, Message } from '../../mocks/types';
import { CitationChip } from '../ui/CitationChip';
import { Disclaimer } from '../ui/Disclaimer';

interface Props {
  message: Message;
  streaming: boolean;
  progress: number;
  activeCitation: string | null;
  onOpenCitation: (c: Citation) => void;
  onRate: (id: string, v: 'up' | 'down') => void;
  onFlag: (id: string) => void;
  onRequestVerification?: (message: Message) => void;
}

/** Slices the body at a word boundary so the stream never tears a word in half. */
function slice(body: string, progress: number) {
  if (progress >= 1) return body;
  const words = body.split(' ');
  return words.slice(0, Math.max(1, Math.floor(words.length * progress))).join(' ');
}

export function AssistantMessage({
  message,
  streaming,
  progress,
  activeCitation,
  onOpenCitation,
  onRate,
  onFlag,
  onRequestVerification,
}: Props) {
  const { lang, t } = useLang();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const full = lang === 'bn' ? message.bodyBn : message.bodyEn;
  const shown = streaming ? slice(full, progress) : full;
  const done = !streaming;

  const copy = async () => {
    await navigator.clipboard.writeText(full);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  const action = 'inline-flex items-center gap-1.5 rounded-sm px-2 py-1 text-caption transition-colors duration-200';

  return (
    <article className="margin-rule bg-paper py-6 pl-6 pr-1">
      {/* Reserving min-height keeps the thread from jumping as words arrive. */}
      <div className="prose-legal space-y-4 text-body text-ink-soft" style={{ minHeight: streaming ? '6rem' : undefined }}>
        {shown.split('\n\n').map((para, i) => (
          <p key={i} className="max-w-prose">
            {para}
            {streaming && i === shown.split('\n\n').length - 1 && (
              <span aria-hidden="true" className="ml-1 inline-block h-[1em] w-[2px] translate-y-[2px] animate-pulse bg-clay" />
            )}
          </p>
        ))}
      </div>

      {done && <ModelNote message={message} lang={lang} />}

      {done && message.citations.length > 0 && (
        <div className="mt-7 border-t border-granite-soft pt-5">
          <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <p className="label">{t.chat.citationsLabel}</p>
            <p className="text-caption text-granite">{t.chat.citationsHint}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {message.citations.map((c, i) => (
              <CitationChip key={c.id} citation={c} index={i} onOpen={onOpenCitation} active={activeCitation === c.id} />
            ))}
          </div>
        </div>
      )}

      {done && (
        <div className="mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-granite-soft pt-4">
          <div className="flex flex-wrap items-center gap-1.5">
            <button type="button" onClick={copy} className={`${action} text-clay-deep hover:bg-clay-tint`} aria-label={t.chat.copy}>
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copied ? t.chat.copied : t.chat.copy}</span>
            </button>

            {/* Verify with lawyer button */}
            {onRequestVerification && (
              <button
                type="button"
                onClick={() => onRequestVerification(message)}
                className={`${action} bg-clay-tint text-clay-deep font-semibold hover:bg-clay hover:text-white border border-clay/30`}
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>{lang === 'bn' ? 'আইনজীবীকে দিয়ে যাচাই করান' : 'Verify with Lawyer'}</span>
              </button>
            )}

            {/* Draft notice shortcut */}
            <button
              type="button"
              onClick={() => navigate('/app/documents/new')}
              className={`${action} text-ink-soft hover:bg-bone-deep`}
            >
              <FileText className="h-3.5 w-3.5" />
              <span>{lang === 'bn' ? 'খসড়া নোটিশ তৈরি' : 'Draft Document'}</span>
            </button>

            <button
              type="button"
              onClick={() => onRate(message.id, 'up')}
              aria-pressed={message.rating === 'up'}
              aria-label={t.chat.helpful}
              className={`${action} ${message.rating === 'up' ? 'bg-clay-tint text-ink' : 'text-granite hover:text-clay-deep'}`}
            >
              <ThumbsUp className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onRate(message.id, 'down')}
              aria-pressed={message.rating === 'down'}
              aria-label={t.chat.notHelpful}
              className={`${action} ${message.rating === 'down' ? 'bg-clay-tint text-ink' : 'text-granite hover:text-clay-deep'}`}
            >
              <ThumbsDown className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onFlag(message.id)}
              disabled={message.flagged}
              className={`${action} ${message.flagged ? 'text-brick' : 'text-granite hover:text-brick'}`}
            >
              <Flag className="h-3.5 w-3.5" />
              <span>{message.flagged ? t.chat.flagged : t.chat.flag}</span>
            </button>
          </div>
          <Disclaimer variant="note" />
        </div>
      )}
    </article>
  );
}

/** Shows the trained classifier's legal-area prediction — only when the backend confirmed it against the cited Acts. */
function ModelNote({ message, lang }: { message: Message; lang: 'bn' | 'en' }) {
  const top = message.domain?.[0];
  if (!top || !message.domainConfirmed || message.citations.length === 0) return null;
  const bn = lang === 'bn';
  const pct = `${Math.round(top.confidence * 100)}%`;
  return (
    <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-caption text-granite">
      <span className="inline-flex items-center gap-1.5 rounded-full border border-clay/30 bg-clay-tint px-2.5 py-1 font-semibold text-clay-deep">
        <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
        {bn ? 'আইনের ক্ষেত্র' : 'Legal area'}: {bn ? top.labelBn : top.labelEn}
        <span className="font-normal text-granite">· {bn ? pct.replace(/\d/g, (d) => '০১২৩৪৫৬৭৮৯'[+d]) : pct}</span>
      </span>
      {message.retrieval === 'hybrid' && (
        <span>{bn ? 'উৎস খোঁজা হয়েছে হাইব্রিড সার্চে (BM25 + E5)' : 'Sources found with hybrid search (BM25 + E5)'}</span>
      )}
      <Link to="/ai-model" className="font-semibold text-clay-deep hover:underline">
        {bn ? 'আমাদের এআই কীভাবে কাজ করে' : 'How our AI works'}
      </Link>
    </div>
  );
}
