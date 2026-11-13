import { useEffect, useState } from 'react';
import { AlertTriangle, Download, ExternalLink, FileText } from 'lucide-react';
import { useLang } from '../../context/LanguageContext';
import { ApiError, fetchLawyerLicenseDocument } from '../../lib/api';
import { Skeleton } from '../../components/ui/EmptyState';

interface Props {
  lawyerId: string;
  fileName?: string;
}

/**
 * Shows a lawyer's submitted ID / bar licence to the admin. The file is fetched
 * with the admin's token (it is not publicly served) and shown from a local blob.
 */
export function LicenseDocumentViewer({ lawyerId, fileName }: Props) {
  const { lang } = useLang();
  const bn = lang === 'bn';
  const [doc, setDoc] = useState<{ url: string; type: string } | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;
    setDoc(null);
    setError('');
    fetchLawyerLicenseDocument(lawyerId)
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setDoc({ url: objectUrl, type: blob.type });
      })
      .catch((err) => {
        if (cancelled) return;
        setError(
          err instanceof ApiError
            ? bn ? err.messageBn : err.message
            : bn ? 'ডকুমেন্টটি লোড করা যায়নি।' : 'Could not load the document.',
        );
      });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [lawyerId]);

  if (error) {
    return (
      <p className="flex items-center gap-1.5 text-xs text-brick">
        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
        <span>{error}</span>
      </p>
    );
  }

  if (!doc) return <Skeleton className="h-48 w-full" />;

  const name = fileName || 'license';
  const isImage = doc.type.startsWith('image/');
  const isPdf = doc.type === 'application/pdf';

  return (
    <div className="space-y-2">
      {isImage && (
        <a href={doc.url} target="_blank" rel="noopener noreferrer" title={bn ? 'পূর্ণ আকারে দেখুন' : 'Open full size'}>
          <img
            src={doc.url}
            alt={bn ? 'জমা দেওয়া লাইসেন্স ডকুমেন্ট' : 'Submitted license document'}
            className="w-full max-h-80 object-contain rounded border border-granite-soft bg-white cursor-zoom-in"
          />
        </a>
      )}
      {isPdf && (
        <iframe
          src={doc.url}
          title={bn ? 'জমা দেওয়া লাইসেন্স ডকুমেন্ট' : 'Submitted license document'}
          className="w-full h-80 rounded border border-granite-soft bg-white"
        />
      )}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
        <span className="inline-flex items-center gap-1.5 text-ink-soft min-w-0">
          <FileText className="h-4 w-4 shrink-0" />
          <span className="truncate">{name}</span>
        </span>
        {(isImage || isPdf) && (
          <a
            href={doc.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-clay-deep hover:underline font-medium"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            {bn ? 'নতুন ট্যাবে খুলুন' : 'Open in new tab'}
          </a>
        )}
        <a href={doc.url} download={name} className="inline-flex items-center gap-1 text-clay-deep hover:underline font-medium">
          <Download className="h-3.5 w-3.5" />
          {bn ? 'ডাউনলোড' : 'Download'}
        </a>
      </div>
    </div>
  );
}
