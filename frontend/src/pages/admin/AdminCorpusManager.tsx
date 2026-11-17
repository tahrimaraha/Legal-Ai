import { useState, useEffect } from 'react';
import { Database, Upload, RefreshCw, AlertTriangle, CheckCircle2, FileText, Trash2 } from 'lucide-react';
import { useLang } from '../../context/LanguageContext';
import { ApiError, listCorpus, rebuildIndex, uploadCorpusDocument } from '../../lib/api';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/EmptyState';
import type { CorpusDocument } from '../../mocks/types';

export default function AdminCorpusManager() {
  const { lang, num } = useLang();
  const [documents, setDocuments] = useState<CorpusDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [rebuilding, setRebuilding] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    listCorpus().then((data) => {
      setDocuments(data);
      setLoading(false);
    });
  }, []);

  const handleRebuild = async () => {
    setRebuilding(true);
    try {
      const res = await rebuildIndex();
      setToastMessage(res.message);
      setTimeout(() => setToastMessage(''), 4000);
    } catch (err) {
      setToastMessage(err instanceof ApiError ? (lang === 'bn' ? err.messageBn : err.message) : 'Rebuild failed');
      setTimeout(() => setToastMessage(''), 8000);
    } finally {
      setRebuilding(false);
    }
  };

  const handleSimulatedUpload = async () => {
    const fileName = prompt('Enter PDF file name to ingest into vector corpus:', 'Labour_Act_2006_Codified.pdf');
    if (!fileName) return;
    setUploading(true);
    try {
      const newDoc = await uploadCorpusDocument({
        name: fileName,
        statuteId: 'labour-act-2006',
        sizeMb: 3.4,
      });
      setDocuments((prev) => [newDoc, ...prev]);
      setToastMessage(`Document ${fileName} ingested into vector store.`);
      setTimeout(() => setToastMessage(''), 3000);
    } catch (err) {
      setToastMessage(err instanceof ApiError ? (lang === 'bn' ? err.messageBn : err.message) : 'Upload failed');
      setTimeout(() => setToastMessage(''), 8000);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6 font-body">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">
            {lang === 'bn' ? 'আইন সংকলন ও ভেক্টর করপাস ম্যানেজার' : 'Statute Corpus & Vector Index Manager'}
          </h1>
          <p className="mt-1 text-xs text-granite">
            {lang === 'bn'
              ? 'আইনের পিডিএফ নথি আপলোড, চাঙ্ক বিশ্লেষণ ও ভেক্টর ইনডেক্সিং পরিচালনা'
              : 'Manage ingested legal PDF documents, chunk embeddings, and search indices'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" onClick={handleSimulatedUpload} loading={uploading}>
            <Upload className="mr-1.5 h-3.5 w-3.5" />
            <span>Upload Statute PDF</span>
          </Button>

          <Button size="sm" variant="primary" onClick={handleRebuild} loading={rebuilding}>
            <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${rebuilding ? 'animate-spin' : ''}`} />
            <span>Rebuild Vector Index</span>
          </Button>
        </div>
      </div>

      {toastMessage && (
        <div className="p-3 rounded bg-clay-tint border border-clay text-xs text-clay-deep font-semibold flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Index Degradation Warning */}
      {rebuilding && (
        <div className="p-3.5 rounded bg-bone-deep border border-granite text-xs text-ink-soft flex items-center gap-2.5">
          <AlertTriangle className="h-4 w-4 text-clay-deep shrink-0 animate-pulse" />
          <span>
            Rebuilding FAISS / Vector embeddings across all statutory chunks. Query latencies may be slightly elevated during rebuild.
          </span>
        </div>
      )}

      {/* Ingested Documents Table */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : (
        <div className="border border-granite rounded bg-white shadow-sm overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-bone-deep border-b border-granite font-mono uppercase text-clay-deep">
              <tr>
                <th className="p-3">File Name</th>
                <th className="p-3">Statute Title</th>
                <th className="p-3 text-center">Chunks</th>
                <th className="p-3 text-center">Size</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Last Indexed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-granite-soft">
              {documents.map((doc) => {
                const isFailed = doc.status === 'failed';
                return (
                  <tr key={doc.id} className={`hover:bg-bone/40 transition ${isFailed ? 'bg-brick/5' : ''}`}>
                    <td className="p-3 font-semibold text-ink flex items-center gap-2">
                      <FileText className="h-4 w-4 text-clay-deep shrink-0" />
                      <span className="truncate">{doc.fileName}</span>
                    </td>
                    <td className="p-3 text-ink-soft">{doc.statuteTitleBn}</td>
                    <td className="p-3 font-mono text-center font-bold text-ink">{num(doc.chunks)}</td>
                    <td className="p-3 font-mono text-center text-granite">{doc.fileSizeMb} MB</td>
                    <td className="p-3">
                      <span
                        className={`inline-flex items-center gap-1 font-mono uppercase text-[10px] px-2 py-0.5 rounded font-bold ${
                          doc.status === 'indexed'
                            ? 'bg-clay-tint text-clay-deep'
                            : doc.status === 'processing'
                            ? 'bg-bone-deep text-ink animate-pulse'
                            : 'bg-brick/15 text-brick'
                        }`}
                      >
                        {doc.status}
                      </span>
                    </td>
                    <td className="p-3 text-right font-mono text-granite text-[11px]">
                      {new Date(doc.lastIndexed).toLocaleDateString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
