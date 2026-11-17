import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, MessageCircle, CheckCheck, Lock } from 'lucide-react';
import { useLang } from '../../context/LanguageContext';
import type { Inbox } from '../../lib/useInbox';
import type { AppNotification, Thread } from '../../mocks/types';

/** "now", "5m", "4h", "2d", then a date. */
function useAgo() {
  const { lang, num } = useLang();
  return (iso?: string) => {
    if (!iso) return '';
    const t = new Date(iso).getTime();
    if (Number.isNaN(t)) return '';
    const s = Math.max(0, (Date.now() - t) / 1000);
    const bn = lang === 'bn';
    if (s < 60) return bn ? 'এখন' : 'now';
    if (s < 3600) return num(Math.floor(s / 60)) + (bn ? ' মি' : 'm');
    if (s < 86400) return num(Math.floor(s / 3600)) + (bn ? ' ঘ' : 'h');
    if (s < 7 * 86400) return num(Math.floor(s / 86400)) + (bn ? ' দি' : 'd');
    return new Date(t).toLocaleDateString(bn ? 'bn-BD' : 'en-GB', { day: 'numeric', month: 'short' });
  };
}

function Badge({ count }: { count: number }) {
  const { num } = useLang();
  if (count <= 0) return null;
  return (
    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[10px] font-bold leading-[18px] text-center ring-2 ring-[#3a2213]">
      {count > 9 ? `${num(9)}+` : num(count)}
    </span>
  );
}

function Initials({ name, src }: { name: string; src?: string }) {
  if (src && !src.endsWith('/logo.svg')) {
    return <img src={src} alt="" className="h-11 w-11 rounded-full object-cover border border-granite-soft shrink-0" />;
  }
  const letters = name
    .replace(/^(Advocate|Barrister|Adv\.?)\s+/i, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');
  return (
    <span className="h-11 w-11 rounded-full bg-clay-tint border border-clay text-clay-deep font-bold text-sm flex items-center justify-center shrink-0">
      {letters || '?'}
    </span>
  );
}

function Dropdown({ title, action, children, footer }: { title: string; action?: ReactNode; children: ReactNode; footer: ReactNode }) {
  return (
    <div className="absolute right-0 top-full mt-2 w-[22rem] max-w-[calc(100vw-1.5rem)] rounded-lg border border-granite bg-white shadow-xl z-50 overflow-hidden font-body">
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <h3 className="font-display text-lg font-bold text-ink">{title}</h3>
        {action}
      </div>
      <div className="max-h-[60vh] overflow-y-auto">{children}</div>
      <div className="border-t border-granite-soft">{footer}</div>
    </div>
  );
}

interface HeaderInboxProps {
  inbox: Inbox;
  /** Route prefix of the workspace: "/app" (citizen) or "/lawyer". */
  base: '/app' | '/lawyer';
}

export function HeaderInbox({ inbox, base }: HeaderInboxProps) {
  const { lang } = useLang();
  const bn = lang === 'bn';
  const ago = useAgo();
  const navigate = useNavigate();
  const [open, setOpen] = useState<'messages' | 'notifications' | null>(null);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const rootRef = useRef<HTMLDivElement>(null);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(null);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(null);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const toggle = (which: 'messages' | 'notifications') => {
    setOpen((cur) => (cur === which ? null : which));
    void inbox.refresh();
  };

  const isLawyer = base === '/lawyer';
  const otherName = (t: Thread) => (isLawyer ? t.citizenName : bn ? t.lawyerNameBn || t.lawyerName : t.lawyerName);

  const openThread = (t: Thread) => {
    setOpen(null);
    navigate(`${base}/messages/${t.id}`);
  };

  const openNotification = (n: AppNotification) => {
    setOpen(null);
    if (!n.isRead) void inbox.markRead(n.id);
    if (n.link) navigate(n.link);
  };

  const threads = filter === 'unread' ? inbox.threads.filter((t) => t.unreadCount > 0) : inbox.threads;
  const iconBtn = (active: boolean) =>
    `relative rounded-full p-2 transition ${active ? 'bg-bone/25 text-white' : 'text-bone hover:bg-bone/10'}`;

  return (
    <div ref={rootRef} className="relative flex items-center gap-1.5">
      {/* Messages */}
      <button
        type="button"
        onClick={() => toggle('messages')}
        className={iconBtn(open === 'messages')}
        aria-label={bn ? 'বার্তা' : 'Messages'}
        aria-expanded={open === 'messages'}
        title={bn ? 'বার্তা' : 'Messages'}
      >
        <MessageCircle className="h-[18px] w-[18px]" />
        <Badge count={inbox.unreadThreads} />
      </button>

      {/* Notifications */}
      <button
        type="button"
        onClick={() => toggle('notifications')}
        className={iconBtn(open === 'notifications')}
        aria-label={bn ? 'বিজ্ঞপ্তি' : 'Notifications'}
        aria-expanded={open === 'notifications'}
        title={bn ? 'বিজ্ঞপ্তি' : 'Notifications'}
      >
        <Bell className="h-[18px] w-[18px]" />
        <Badge count={inbox.unreadNotifications} />
      </button>

      {open === 'messages' && (
        <Dropdown
          title={bn ? 'বার্তা' : 'Chats'}
          footer={
            <Link
              to={`${base}/messages`}
              onClick={() => setOpen(null)}
              className="block py-2.5 text-center text-sm font-semibold text-clay-deep hover:bg-bone"
            >
              {bn ? 'সব বার্তা দেখুন' : 'See all in Messages'}
            </Link>
          }
        >
          <div className="flex gap-2 px-4 pb-2">
            {(['all', 'unread'] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                  filter === f ? 'bg-clay-tint text-clay-deep' : 'text-granite hover:bg-bone'
                }`}
              >
                {f === 'all' ? (bn ? 'সব' : 'All') : bn ? 'অপঠিত' : 'Unread'}
              </button>
            ))}
          </div>
          {threads.length === 0 ? (
            <p className="px-4 py-8 text-center text-xs text-granite">
              {filter === 'unread'
                ? bn ? 'কোনো অপঠিত বার্তা নেই' : 'No unread messages'
                : isLawyer
                  ? bn ? 'এখনও কোনো ক্লায়েন্টের বার্তা নেই' : 'No client conversations yet'
                  : bn ? 'আইনজীবী আপনার অনুরোধ গ্রহণ করলে কথোপকথন এখানে দেখা যাবে' : 'Conversations appear here once a lawyer accepts your request'}
            </p>
          ) : (
            <ul className="pb-1">
              {threads.map((t) => {
                const unread = t.unreadCount > 0;
                const last = t.messages?.[t.messages.length - 1];
                const fromMe = last && last.senderRole === (isLawyer ? 'lawyer' : 'citizen');
                const preview = t.lastMessage
                  ? `${fromMe ? (bn ? 'আপনি: ' : 'You: ') : ''}${t.lastMessage}`
                  : bn ? t.contextTitleBn || t.contextTitleEn : t.contextTitleEn;
                return (
                  <li key={t.id}>
                    <button
                      type="button"
                      onClick={() => openThread(t)}
                      className="w-full flex items-center gap-3 px-3 py-2 mx-1 rounded-md text-left hover:bg-bone transition"
                      style={{ width: 'calc(100% - 0.5rem)' }}
                    >
                      <Initials name={otherName(t)} src={isLawyer ? undefined : t.lawyerAvatar} />
                      <div className="min-w-0 flex-1">
                        <p className={`truncate text-sm ${unread ? 'font-bold text-ink' : 'font-medium text-ink-soft'}`}>
                          {otherName(t)}
                        </p>
                        <p className={`flex items-center gap-1 text-xs ${unread ? 'font-semibold text-ink' : 'text-granite'}`}>
                          {t.isLocked && <Lock className="h-3 w-3 shrink-0" />}
                          <span className="truncate">{preview}</span>
                          <span className="shrink-0">· {ago(t.lastMessageAt)}</span>
                        </p>
                      </div>
                      {unread && <span className="h-2.5 w-2.5 rounded-full bg-blue-600 shrink-0" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </Dropdown>
      )}

      {open === 'notifications' && (
        <Dropdown
          title={bn ? 'বিজ্ঞপ্তি' : 'Notifications'}
          action={
            inbox.unreadNotifications > 0 && (
              <button
                type="button"
                onClick={() => void inbox.markAllRead()}
                className="flex items-center gap-1 text-xs font-semibold text-clay-deep hover:underline"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                {bn ? 'সব পঠিত' : 'Mark all read'}
              </button>
            )
          }
          footer={
            <Link
              to={`${base}/notifications`}
              onClick={() => setOpen(null)}
              className="block py-2.5 text-center text-sm font-semibold text-clay-deep hover:bg-bone"
            >
              {bn ? 'সব বিজ্ঞপ্তি দেখুন' : 'See all notifications'}
            </Link>
          }
        >
          {inbox.notifications.length === 0 ? (
            <p className="px-4 py-8 text-center text-xs text-granite">{bn ? 'কোনো বিজ্ঞপ্তি নেই' : 'No notifications yet'}</p>
          ) : (
            <ul className="pb-1">
              {inbox.notifications.slice(0, 15).map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => openNotification(n)}
                    className="w-full flex items-start gap-3 px-3 py-2.5 mx-1 rounded-md text-left hover:bg-bone transition"
                    style={{ width: 'calc(100% - 0.5rem)' }}
                  >
                    <span
                      className={`mt-0.5 h-9 w-9 rounded-full flex items-center justify-center shrink-0 ${
                        n.type === 'new_message' ? 'bg-blue-50 text-blue-700' : 'bg-clay-tint text-clay-deep'
                      }`}
                    >
                      {n.type === 'new_message' ? <MessageCircle className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm leading-snug ${n.isRead ? 'text-ink-soft' : 'font-semibold text-ink'}`}>
                        {bn ? n.titleBn || n.titleEn : n.titleEn}
                      </p>
                      <p className="text-xs text-granite line-clamp-2">{bn ? n.bodyBn || n.bodyEn : n.bodyEn}</p>
                      <p className={`mt-0.5 text-[11px] ${n.isRead ? 'text-granite' : 'font-semibold text-blue-700'}`}>
                        {ago(n.createdAt)}
                      </p>
                    </div>
                    {!n.isRead && <span className="mt-2 h-2.5 w-2.5 rounded-full bg-blue-600 shrink-0" />}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Dropdown>
      )}
    </div>
  );
}
