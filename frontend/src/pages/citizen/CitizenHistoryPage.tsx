import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Trash2, MessageSquare, ArrowRight, Calendar } from 'lucide-react';
import { useLang } from '../../context/LanguageContext';
import { listConversations, deleteConversation } from '../../lib/api';
import { Button } from '../../components/ui/Button';
import { Skeleton, EmptyState } from '../../components/ui/EmptyState';
import type { Conversation } from '../../mocks/types';

export default function CitizenHistoryPage() {
  const { lang, num } = useLang();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    listConversations().then((data) => {
      setConversations(data);
      setLoading(false);
    });
  }, []);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirm(lang === 'bn' ? 'আপনি কি এই কথোপকথনটি মুছে ফেলতে চান?' : 'Delete this conversation?')) {
      await deleteConversation(id);
      setConversations((prev) => prev.filter((c) => c.id !== id));
    }
  };

  const filtered = conversations.filter(
    (c) =>
      c.titleBn.toLowerCase().includes(search.toLowerCase()) ||
      c.titleEn.toLowerCase().includes(search.toLowerCase()) ||
      c.messages.some(
        (m) =>
          m.bodyBn.toLowerCase().includes(search.toLowerCase()) ||
          m.bodyEn.toLowerCase().includes(search.toLowerCase()),
      ),
  );

  return (
    <div className="space-y-6 font-body">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink">
          {lang === 'bn' ? 'কথোপকথন ও প্রশ্ন ইতিহাস' : 'Chat History & Conversations'}
        </h1>
        <p className="mt-1 text-xs text-granite">
          {lang === 'bn'
            ? 'আপনার পূর্বে জিজ্ঞাসিত আইনি প্রশ্নের বিবরণ ও উদ্ধৃত ধারাসমূহ'
            : 'Access past legal consultations and cited statute recommendations'}
        </p>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-granite" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={lang === 'bn' ? 'ইতিহাসে অনুসন্ধান করুন...' : 'Search past conversations...'}
          className="w-full pl-9 pr-4 py-2 text-xs rounded border border-granite bg-white focus:border-clay focus:outline-none"
        />
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title={lang === 'bn' ? 'কোনো পূর্ববর্তী ইতিহাস পাওয়া যায়নি' : 'No Conversations Found'}
          description={lang === 'bn' ? 'আপনি নতুন কোনো আইনি প্রশ্ন জিজ্ঞাসা করতে পারেন।' : 'Start a new AI chat to explore cited laws.'}
          actionLabel={lang === 'bn' ? 'নতুন প্রশ্ন করুন' : 'Start New Chat'}
          onAction={() => window.location.assign('/app/chat')}
        />
      ) : (
        <div className="divide-y divide-granite border border-granite rounded bg-white shadow-sm overflow-hidden">
          {filtered.map((conv) => (
            <Link
              key={conv.id}
              to={`/app/chat/${conv.id}`}
              className="flex items-center justify-between p-4 hover:bg-bone/50 transition group"
            >
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] text-granite flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(conv.updatedAt).toLocaleDateString()}
                  </span>
                  <span className="font-mono text-[10px] bg-clay-tint text-clay-deep px-1.5 py-0.2 rounded">
                    {num(conv.messages.length)} {lang === 'bn' ? 'বার্তা' : 'messages'}
                  </span>
                </div>
                <h3 className="font-display text-sm font-bold text-ink truncate group-hover:text-clay-deep transition">
                  {lang === 'bn' ? conv.titleBn : conv.titleEn}
                </h3>
                <p className="text-xs text-ink-soft truncate">
                  {conv.messages[1]?.bodyBn || conv.messages[0]?.bodyBn}
                </p>
              </div>

              <div className="flex items-center gap-3 ml-4 shrink-0">
                <button
                  type="button"
                  onClick={(e) => handleDelete(conv.id, e)}
                  className="p-1.5 text-granite hover:text-brick transition rounded hover:bg-brick/10"
                  title={lang === 'bn' ? 'মুছে ফেলুন' : 'Delete conversation'}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                <ArrowRight className="h-4 w-4 text-granite group-hover:text-clay-deep group-hover:translate-x-0.5 transition" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
