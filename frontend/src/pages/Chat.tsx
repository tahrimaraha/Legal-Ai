import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { PanelLeft, X } from 'lucide-react';
import { AssistantMessage } from '../components/chat/AssistantMessage';
import { CitationDrawer } from '../components/chat/CitationDrawer';
import { Composer } from '../components/chat/Composer';
import { Sidebar } from '../components/chat/Sidebar';
import { BalanceScale } from '../components/ui/BalanceScale';
import { Disclaimer } from '../components/ui/Disclaimer';
import { useLang } from '../context/LanguageContext';
import { LogoMark } from '../components/ui/Logo';
import { EASE_SETTLE } from '../lib/motion';
import { useChat } from '../lib/useChat';
import type { Citation, Conversation } from '../mocks/types';

export default function Chat() {
  const { lang, t } = useLang();
  const chat = useChat();
  const [activeConversation, setActiveConversation] = useState<string | null>(null);
  const [drawer, setDrawer] = useState<Citation | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView?.({ block: 'end', behavior: 'smooth' });
  }, [chat.messages.length, chat.pending]);

  const openConversation = useCallback(
    (c: Conversation) => {
      setActiveConversation(c.id);
      chat.reset(c.messages);
      setDrawer(null);
      setSidebarOpen(false);
    },
    [chat],
  );

  const startNew = useCallback(() => {
    setActiveConversation(null);
    chat.reset([]);
    setDrawer(null);
    setSidebarOpen(false);
  }, [chat]);

  const askAboutSection = (c: Citation) => {
    setDrawer(null);
    void chat.send(lang === 'bn' ? `${c.labelBn} — এই ধারাটি সহজ ভাষায় ব্যাখ্যা করুন।` : `${c.labelEn} — explain this section in plain language.`);
  };

  const empty = chat.messages.length === 0 && !chat.pending;

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-bone">
      {/* Sidebar: permanent on desktop, a sheet below lg. */}
      <div className="hidden w-[300px] shrink-0 lg:block">
        <Sidebar activeId={activeConversation} onSelect={openConversation} onNew={startNew} />
      </div>

      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-40 bg-ink/25 lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              aria-hidden="true"
            />
            <motion.div
              className="fixed inset-y-0 left-0 z-50 w-[300px] lg:hidden"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ duration: 0.24, ease: EASE_SETTLE }}
            >
              <Sidebar activeId={activeConversation} onSelect={openConversation} onNew={startNew} />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div className="flex min-w-0 flex-1 flex-col">
        <Disclaimer />

        <div className="flex items-center gap-3 border-b border-granite-soft bg-bone px-4 py-3 lg:hidden">
          <button
            type="button"
            onClick={() => setSidebarOpen((v) => !v)}
            aria-label={t.chat.history}
            aria-expanded={sidebarOpen}
            className="rounded-sm border border-granite-soft p-2 text-ink"
          >
            {sidebarOpen ? <X className="h-4 w-4" /> : <PanelLeft className="h-4 w-4" />}
          </button>
          <span className="inline-flex items-center gap-2"><LogoMark className="h-7 w-7" /><span className="font-display text-[1rem] tracking-[0.08em] text-ink">LEGAL AI</span></span>
        </div>

        <main className="flex-1 overflow-y-auto" id="main">
          <div className="mx-auto max-w-3xl px-4 py-8 sm:px-8">
            {empty ? (
              <div className="pt-6">
                <div className="mx-auto mb-10 w-32 opacity-80">
                  <BalanceScale className="h-auto w-full" weight={1.6} />
                </div>
                <h1 className="text-center font-display text-[clamp(1.75rem,1.3rem+2vw,2.5rem)] text-ink">{t.chat.emptyTitle}</h1>
                <p className="mx-auto mt-4 max-w-prose text-center text-body text-ink-soft/80">{t.chat.emptySub}</p>
                <ul className="mt-10 grid gap-px border border-granite-soft bg-granite-soft sm:grid-cols-2">
                  {t.chat.suggestions.map((s) => (
                    <li key={s}>
                      <button
                        type="button"
                        onClick={() => void chat.send(s)}
                        className="h-full w-full bg-paper p-5 text-left text-caption leading-relaxed text-ink-soft transition-colors hover:bg-clay-tint/60 hover:text-ink"
                      >
                        {s}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="space-y-8">
                {chat.messages.map((m) =>
                  m.role === 'user' ? (
                    <div key={m.id} className="flex justify-end">
                      <p className="max-w-[85%] rounded-sm bg-clay-tint px-5 py-3.5 text-body text-ink">
                        {lang === 'bn' ? m.bodyBn : m.bodyEn}
                      </p>
                    </div>
                  ) : (
                    <AssistantMessage
                      key={m.id}
                      message={m}
                      streaming={chat.streamingId === m.id}
                      progress={chat.streamingId === m.id ? chat.progress : 1}
                      activeCitation={drawer?.id ?? null}
                      onOpenCitation={setDrawer}
                      onRate={chat.rate}
                      onFlag={chat.flag}
                    />
                  ),
                )}

                {chat.pending && (
                  <p className="margin-rule flex items-center gap-3 py-6 pl-6 text-caption text-clay-deep">
                    <span aria-hidden="true" className="h-1.5 w-1.5 animate-pulse rounded-full bg-clay" />
                    {t.chat.thinking}
                  </p>
                )}
                <div ref={endRef} />
              </div>
            )}
          </div>
        </main>

        <Composer onSend={(text) => void chat.send(text)} onStop={chat.stop} busy={chat.pending || chat.streamingId !== null} />
      </div>

      <CitationDrawer citation={drawer} onClose={() => setDrawer(null)} onAsk={askAboutSection} />
    </div>
  );
}
