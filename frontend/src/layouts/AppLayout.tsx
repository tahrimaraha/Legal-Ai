import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  MessageSquare,
  ShieldCheck,
  Users,
  Calendar,
  Mail,
  FileText,
  Bell,
  Settings,
  Plus,
  History,
  Menu,
  X,
  LogOut,
  LayoutDashboard,
  Video,
} from 'lucide-react';
import { useLang } from '../context/LanguageContext';
import { useRole } from '../context/RoleContext';
import { LanguageToggle } from '../components/ui/LanguageToggle';
import { DisclaimerStrip } from '../components/ui/DisclaimerStrip';
import { listConversations } from '../lib/api';
import type { Conversation } from '../mocks/types';
import { useInbox } from '../lib/useInbox';
import { HeaderInbox } from '../components/ui/HeaderInbox';
import { LogoMark } from '../components/ui/Logo';

export function AppLayout() {
  const { lang } = useLang();
  const { user, logout } = useRole();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [recentConversations, setRecentConversations] = useState<Conversation[]>([]);
  const inbox = useInbox(!!user);

  useEffect(() => {
    listConversations().then((res) => setRecentConversations(res.slice(0, 4)));
  }, [location.pathname]);

  const badgeFor = (to: string) =>
    to === '/app/notifications' ? inbox.unreadNotifications : to === '/app/messages' ? inbox.unreadThreads : 0;

  const navItems = [
    { to: '/app', labelBn: 'ড্যাশবোর্ড', labelEn: 'Dashboard', icon: LayoutDashboard },
    { to: '/app/chat', labelBn: 'এআই চ্যাট', labelEn: 'AI Chat', icon: MessageSquare },
    { to: '/app/verifications', labelBn: 'আইনজীবী যাচাই', labelEn: 'Verifications', icon: ShieldCheck },
    { to: '/app/lawyers', labelBn: 'আইনজীবী খুঁজুন', labelEn: 'Find Lawyers', icon: Users },
    { to: '/app/consultations', labelBn: 'পরামর্শসমূহ', labelEn: 'Consultations', icon: Calendar },
    { to: '/app/messages', labelBn: 'বার্তা', labelEn: 'Messages', icon: Mail },
    { to: '/app/meeting/join', labelBn: 'ভিডিও মিটিং', labelEn: 'Video Meeting', icon: Video },
    { to: '/app/documents', labelBn: 'খসড়া দলিল', labelEn: 'Draft Documents', icon: FileText },
    { to: '/app/history', labelBn: 'কথোপকথন ইতিহাস', labelEn: 'Chat History', icon: History },
    { to: '/app/notifications', labelBn: 'বিজ্ঞপ্তি', labelEn: 'Notifications', icon: Bell },
    { to: '/app/settings', labelBn: 'সেটিংস', labelEn: 'Settings', icon: Settings },
  ];

  return (
    <div className="flex min-h-[100dvh] bg-bone text-ink-soft font-body selection:bg-clay-tint pb-10">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-ink/40 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* Collapsible Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-granite bg-white transition-transform duration-200 lg:static lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand header */}
        <div className="header-wood flex h-16 items-center justify-between px-5">
          <Link to="/" className="flex items-center gap-2">
            <LogoMark className="h-9 w-9" />
            <div className="flex flex-col">
              <span className="font-display text-sm font-bold tracking-tight text-bone">LEGAL AI</span>
              <span className="text-[10px] text-clay-tint font-medium -mt-1">
                {lang === 'bn' ? 'আইনি সহায়ক' : 'Citizen App'}
              </span>
            </div>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden rounded p-1 text-bone/70 hover:text-bone"
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* New chat CTA */}
        <div className="p-3">
          <button
            onClick={() => {
              navigate('/app/chat');
              setSidebarOpen(false);
            }}
            className="flex w-full items-center justify-center gap-2 rounded bg-clay px-3 py-2 text-xs font-semibold uppercase tracking-wider text-white transition hover:bg-clay-deep"
          >
            <Plus className="h-4 w-4" />
            <span>{lang === 'bn' ? 'নতুন প্রশ্ন করুন' : 'New Question'}</span>
          </button>
        </div>

        {/* Primary Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.to || (item.to !== '/app' && location.pathname.startsWith(item.to));
            const badge = badgeFor(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 rounded px-3 py-2 text-xs font-medium transition ${
                  isActive
                    ? 'bg-clay-tint text-clay-deep font-semibold border-l-2 border-clay-deep'
                    : 'text-ink-soft hover:bg-bone-deep'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="flex-1">{lang === 'bn' ? item.labelBn : item.labelEn}</span>
                {badge > 0 && (
                  <span className="min-w-[18px] rounded-full bg-red-600 px-1.5 text-center text-[10px] font-bold leading-[18px] text-white">
                    {badge > 9 ? '9+' : badge}
                  </span>
                )}
              </Link>
            );
          })}

          {/* Recent Conversations divider */}
          {recentConversations.length > 0 && (
            <div className="pt-4 mt-4 border-t border-granite-soft">
              <span className="px-3 font-mono text-[10px] uppercase text-granite tracking-wider">
                {lang === 'bn' ? 'সাম্প্রতিক প্রশ্ন' : 'Recent Chats'}
              </span>
              <div className="mt-2 space-y-1">
                {recentConversations.map((c) => (
                  <Link
                    key={c.id}
                    to={`/app/chat/${c.id}`}
                    onClick={() => setSidebarOpen(false)}
                    className="block truncate rounded px-3 py-1.5 text-xs text-ink-soft hover:bg-bone-deep"
                  >
                    {lang === 'bn' ? c.titleBn : c.titleEn}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </nav>

        {/* User footer */}
        <div className="border-t border-granite-soft p-3 bg-bone/50">
          <div className="flex items-center justify-between px-2">
            <Link
              to="/app/settings"
              onClick={() => setSidebarOpen(false)}
              title={lang === 'bn' ? 'আমার প্রোফাইল' : 'My profile'}
              className="group flex min-w-0 flex-1 items-center gap-2 rounded p-1 -m-1 hover:bg-clay-tint transition"
            >
              <img
                src={user?.avatarUrl || '/logo.svg'}
                alt="Avatar"
                className="h-6 w-6 shrink-0 rounded-full object-cover border border-granite"
              />
              <span className="truncate text-xs font-semibold text-ink group-hover:text-clay-deep group-hover:underline">{user?.name || 'Citizen'}</span>
            </Link>
            <button
              onClick={() => {
                logout();
                navigate('/');
              }}
              title={lang === 'bn' ? 'লগআউট' : 'Sign out'}
              className="text-granite hover:text-brick transition p-1"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="header-wood sticky top-0 z-30 flex h-14 items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden rounded p-1.5 text-bone/80 hover:bg-bone/10"
              aria-label="Open navigation menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <span className="font-mono text-label text-clay-tint uppercase tracking-wider hidden sm:inline">
              LEGAL AI / CITIZEN PORTAL
            </span>
          </div>

          <div className="flex items-center gap-3">
            <LanguageToggle tone="invert" />
            <HeaderInbox inbox={inbox} base="/app" />
          </div>
        </header>

        {/* Page Container */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>

      <DisclaimerStrip />
    </div>
  );
}
