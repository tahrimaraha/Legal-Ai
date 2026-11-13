import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import { useLang } from '../../context/LanguageContext';
import { mockConversations } from '../../mocks/conversations';
import type { Conversation } from '../../mocks/types';
import { LanguageToggle } from '../ui/LanguageToggle';
import { Logo } from '../ui/Logo';

interface Props {
  activeId: string | null;
  onSelect: (c: Conversation) => void;
  onNew: () => void;
}

export function Sidebar({ activeId, onSelect, onNew }: Props) {
  const { lang, t } = useLang();
  const [query, setQuery] = useState('');

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = mockConversations.filter((c) => (c.titleBn + c.titleEn).toLowerCase().includes(q));
    const today = list.filter((c) => c.updatedAt.startsWith('2026-08-17'));
    const earlier = list.filter((c) => !c.updatedAt.startsWith('2026-08-17'));
    return [
      { label: t.chat.today, items: today },
      { label: t.chat.earlier, items: earlier },
    ].filter((g) => g.items.length > 0);
  }, [query, t.chat.earlier, t.chat.today]);

  return (
    <aside className="flex h-full w-full flex-col border-r border-granite-soft bg-bone">
      <div className="border-b border-granite-soft px-5 py-4">
        <Logo showSub={false} />
      </div>

      <div className="px-5 py-4">
        <button
          type="button"
          onClick={onNew}
          className="flex w-full items-center gap-2.5 rounded-sm border border-granite-soft bg-paper px-4 py-2.5 text-[0.9375rem] font-semibold text-ink transition-colors hover:border-clay hover:text-clay-deep"
        >
          <Plus className="h-4 w-4 text-clay" aria-hidden="true" />
          {t.chat.newChat}
        </button>

        <div className="mt-4 flex items-center gap-2 border-b border-granite-soft pb-2">
          <Search className="h-3.5 w-3.5 text-granite" aria-hidden="true" />
          <label htmlFor="history-search" className="sr-only">
            {t.chat.searchHistory}
          </label>
          <input
            id="history-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.chat.searchHistory}
            className="w-full bg-transparent text-caption text-ink-soft placeholder:text-granite focus:outline-none"
          />
        </div>
      </div>

      <nav aria-label={t.chat.history} className="flex-1 overflow-y-auto px-3 pb-4">
        {groups.map((group) => (
          <div key={group.label} className="mb-5">
            <p className="label px-2 pb-2">{group.label}</p>
            <ul className="space-y-0.5">
              {group.items.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(c)}
                    aria-current={activeId === c.id ? 'true' : undefined}
                    className={`w-full truncate rounded-sm px-3 py-2.5 text-left text-caption transition-colors ${
                      activeId === c.id ? 'bg-clay-tint text-ink' : 'text-ink-soft/80 hover:bg-clay-tint/50'
                    }`}
                  >
                    {lang === 'bn' ? c.titleBn : c.titleEn}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className="space-y-4 border-t border-granite-soft px-5 py-5">
        <LanguageToggle />
        <div className="margin-rule pl-4">
          <p className="text-caption leading-relaxed text-clay-deep">{t.disclaimer.full}</p>
        </div>
        <Link to="/" className="link-underline inline-block text-caption text-granite hover:text-ink">
          {t.common.backHome}
        </Link>
      </div>
    </aside>
  );
}

