import { Download, Copy, Share2, Check } from 'lucide-react';
import { useState } from 'react';
import { Button } from './Button';
import { useLang } from '../../context/LanguageContext';

interface DocumentPreviewProps {
  title: string;
  body: string;
  status?: string;
  onDownload?: () => void;
  onShare?: () => void;
}

export function DocumentPreview({ title, body, status, onDownload, onShare }: DocumentPreviewProps) {
  const { lang } = useLang();
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(body);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-full rounded border border-granite bg-white shadow-sm overflow-hidden font-body">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-granite-soft bg-bone px-4 py-3">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span className="h-2 w-2 shrink-0 rounded-full bg-clay" />
          <span className="min-w-0 truncate font-mono text-xs uppercase font-semibold text-ink" title={title}>
            {title}
          </span>
          {status && (
            <span className="shrink-0 whitespace-nowrap font-mono text-[10px] uppercase bg-clay-tint text-clay-deep px-1.5 py-0.5 rounded border border-clay/20">
              {status}
            </span>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-1.5 [&>button]:whitespace-nowrap">
          <Button size="sm" variant="ghost" onClick={handleCopy}>
            {copied ? <Check className="h-3.5 w-3.5 text-clay-deep mr-1" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
            <span>{copied ? (lang === 'bn' ? 'কপি হয়েছে' : 'Copied') : (lang === 'bn' ? 'কপি' : 'Copy')}</span>
          </Button>

          {onDownload && (
            <Button size="sm" variant="secondary" onClick={onDownload}>
              <Download className="h-3.5 w-3.5 mr-1" />
              <span>{lang === 'bn' ? 'ডাউনলোড' : 'Download'}</span>
            </Button>
          )}

          {onShare && (
            <Button size="sm" variant="primary" onClick={onShare}>
              <Share2 className="h-3.5 w-3.5 mr-1" />
              <span>{lang === 'bn' ? 'আইনজীবীকে পাঠান' : 'Share with Lawyer'}</span>
            </Button>
          )}
        </div>
      </div>

      {/* Document Sheet Typesetting */}
      <div className="flex-1 overflow-y-auto p-6 sm:p-8 bg-[#FAF8F5] text-ink-soft selection:bg-clay-tint">
        <article className="mx-auto max-w-prose bg-white p-8 sm:p-10 shadow-sm border border-granite-soft rounded-sm space-y-4">
          <div className="border-b border-granite-soft pb-3 text-center">
            <h4 className="font-display text-base font-bold text-ink tracking-tight uppercase">
              {title}
            </h4>
          </div>

          <div className="whitespace-pre-line font-body text-sm leading-relaxed text-ink-soft">
            {body || (
              <p className="text-granite italic text-center py-12">
                {lang === 'bn' ? 'ফর্ম পূরণ করলে এখানে লাইভ ড্রাফট প্রদর্শিত হবে...' : 'Fill in the form to watch the legal document generate in real time...'}
              </p>
            )}
          </div>
        </article>
      </div>
    </div>
  );
}
