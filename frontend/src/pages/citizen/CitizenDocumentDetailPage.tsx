import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar } from 'lucide-react';
import { useLang } from '../../context/LanguageContext';
import { getDocumentById } from '../../lib/api';
import { DocumentPreview } from '../../components/ui/DocumentPreview';
import { Skeleton, ErrorState } from '../../components/ui/EmptyState';
import type { DraftDocument } from '../../mocks/types';

export default function CitizenDocumentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { lang } = useLang();
  const navigate = useNavigate();
  const [doc, setDoc] = useState<DraftDocument | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      getDocumentById(id).then((data) => {
        setDoc(data || null);
        setLoading(false);
      });
    }
  }, [id]);

  if (loading) {
    return <div className="space-y-6"><Skeleton className="h-8 w-48" /><Skeleton className="h-96 w-full" /></div>;
  }

  if (!doc) {
    return (
      <div className="py-8">
        <ErrorState title="Document Not Found" message="The requested draft document does not exist." />
        <Link to="/app/documents" className="inline-flex items-center gap-1.5 text-xs text-clay-deep mt-4">
          <ArrowLeft className="h-4 w-4" />
          <span>Back to documents</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-body">
      <div className="flex items-center justify-between">
        <Link
          to="/app/documents"
          className="inline-flex items-center gap-1.5 text-xs font-mono uppercase text-clay-deep hover:text-ink transition"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>{lang === 'bn' ? 'সকল দলিলে ফিরুন' : 'Back to Documents'}</span>
        </Link>
        <span className="font-mono text-xs text-granite flex items-center gap-1">
          <Calendar className="h-3.5 w-3.5" />
          {new Date(doc.updatedAt).toLocaleDateString()}
        </span>
      </div>

      <div className="h-[680px]">
        <DocumentPreview
          title={doc.title}
          body={lang === 'bn' ? doc.generatedTextBn : doc.generatedTextEn}
          status={doc.status}
          onDownload={() => {
            const element = document.createElement('a');
            const file = new Blob([lang === 'bn' ? doc.generatedTextBn : doc.generatedTextEn], {
              type: 'text/plain;charset=utf-8',
            });
            element.href = URL.createObjectURL(file);
            element.download = `${doc.title}.txt`;
            document.body.appendChild(element);
            element.click();
          }}
          onShare={() => navigate('/app/lawyers')}
        />
      </div>
    </div>
  );
}
