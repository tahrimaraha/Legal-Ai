import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, ArrowRight, Calendar } from 'lucide-react';
import { useLang } from '../../context/LanguageContext';
import { listDocuments, listDraftTemplates } from '../../lib/api';
import { Button } from '../../components/ui/Button';
import { Skeleton, EmptyState } from '../../components/ui/EmptyState';
import type { DraftDocument, DraftTemplate } from '../../mocks/types';

export default function CitizenDocumentsPage() {
  const { lang } = useLang();
  const [documents, setDocuments] = useState<DraftDocument[]>([]);
  const [templates, setTemplates] = useState<DraftTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([listDocuments(), listDraftTemplates()]).then(([docs, tmpls]) => {
      setDocuments(docs);
      setTemplates(tmpls);
      setLoading(false);
    });
  }, []);

  return (
    <div className="space-y-8 font-body">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">
            {lang === 'bn' ? 'খসড়া আইনি দলিল ও নোটিশ' : 'Legal Documents & Draft Notices'}
          </h1>
          <p className="mt-1 text-xs text-granite">
            {lang === 'bn'
              ? 'ধাপে ধাপে প্রশ্নের উত্তরে তৈরি কৃত নোটিশ ও অভিযোগপত্রসমূহ'
              : 'Structured legal notices and citizen petitions created with the drafting wizard'}
          </p>
        </div>

        <Link to="/app/documents/new">
          <Button size="sm" variant="primary">
            <Plus className="mr-1.5 h-4 w-4" />
            <span>{lang === 'bn' ? 'নতুন দলিল তৈরি করুন' : 'New Document Wizard'}</span>
          </Button>
        </Link>
      </div>

      {/* Available Templates Strip */}
      <div className="space-y-3">
        <span className="font-mono text-label uppercase text-clay-deep font-semibold">
          {lang === 'bn' ? 'উপলব্ধ ফরম্যাট ও টেমপ্লেট' : 'Available Draft Templates'}
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {templates.map((tmpl) => (
            <Link
              key={tmpl.id}
              to={`/app/documents/new?template=${tmpl.slug}`}
              className="p-4 rounded border border-granite bg-white hover:border-clay hover:bg-bone transition flex flex-col justify-between"
            >
              <div>
                <span className="font-mono text-[10px] uppercase bg-bone-deep text-clay-deep px-1.5 py-0.5 rounded border border-granite-soft">
                  {lang === 'bn' ? tmpl.categoryBn : tmpl.categoryEn}
                </span>
                <h3 className="font-display text-sm font-bold text-ink mt-2">
                  {lang === 'bn' ? tmpl.titleBn : tmpl.titleEn}
                </h3>
                <p className="mt-1 text-[11px] text-granite line-clamp-2">
                  {lang === 'bn' ? tmpl.descriptionBn : tmpl.descriptionEn}
                </p>
              </div>
              <div className="mt-4 pt-2 border-t border-granite-soft flex items-center justify-between text-xs text-clay-deep font-semibold">
                <span>{lang === 'bn' ? 'খসড়া শুরু করুন' : 'Start Draft'}</span>
                <ArrowRight className="h-3 w-3" />
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Existing Drafts List */}
      <div className="space-y-4 pt-4 border-t border-granite">
        <h2 className="font-mono text-label uppercase text-clay-deep font-semibold">
          {lang === 'bn' ? 'আমার প্রস্তুতকৃত খসড়া দলিলসমূহ' : 'My Saved Drafts'}
        </h2>

        {loading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : documents.length === 0 ? (
          <EmptyState
            title={lang === 'bn' ? 'কোনো খসড়া দলিল নেই' : 'No Saved Documents'}
            description={lang === 'bn' ? 'উপরের টেমপ্লেট থেকে নতুন নোটিশ খসড়া করতে পারেন।' : 'Select a template above to generate a typeset legal notice.'}
            actionLabel={lang === 'bn' ? 'উইজার্ড চালু করুন' : 'Launch Wizard'}
            onAction={() => window.location.assign('/app/documents/new')}
          />
        ) : (
          <div className="divide-y divide-granite border border-granite rounded bg-white shadow-sm overflow-hidden">
            {documents.map((doc) => (
              <Link
                key={doc.id}
                to={`/app/documents/${doc.id}`}
                className="flex items-center justify-between p-4 hover:bg-bone transition group"
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] uppercase bg-clay-tint text-clay-deep px-1.5 py-0.2 rounded font-bold">
                      {doc.status}
                    </span>
                    <span className="font-mono text-[10px] text-granite flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(doc.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                  <h3 className="font-display text-sm font-bold text-ink truncate group-hover:text-clay-deep transition">
                    {doc.title}
                  </h3>
                  <p className="text-xs text-granite truncate">{doc.templateTitleBn}</p>
                </div>

                <div className="flex items-center gap-3 ml-4 shrink-0">
                  <span className="text-xs font-semibold text-clay-deep flex items-center gap-1">
                    {lang === 'bn' ? 'প্রিভিউ দেখুন' : 'Preview'} <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
