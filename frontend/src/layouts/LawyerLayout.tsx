import { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ShieldCheck,
  Calendar,
  Mail,
  UserCheck,
  Clock,
  Settings,
  Bell,
  Menu,
  X,
  LogOut,
  AlertTriangle,
  Video,
} from 'lucide-react';
import { useLang } from '../context/LanguageContext';
import { useRole } from '../context/RoleContext';
import { LanguageToggle } from '../components/ui/LanguageToggle';
import { LogoMark } from '../components/ui/Logo';
import { useInbox } from '../lib/useInbox';
import { HeaderInbox } from '../components/ui/HeaderInbox';

export function LawyerLayout() {
  const { lang } = useLang();
  const { user, logout } = useRole();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isPending = user?.isVerified === false;
  const inbox = useInbox(!!user && !isPending);
  const badgeFor = (to: string) =>
    to === '/lawyer/notifications' ? inbox.unreadNotifications : to === '/lawyer/messages' ? inbox.unreadThreads : 0;

  const navItems = [
    { to: '/lawyer', labelBn: 'ড্যাশবোর্ড', labelEn: 'Dashboard', icon: LayoutDashboard },
    { to: '/lawyer/verifications', labelBn: 'যাচাই কিউ (Queue)', labelEn: 'Verification Queue', icon: ShieldCheck },
    { to: '/lawyer/consultations', labelBn: 'পরামর্শ অনুরোধ', labelEn: 'Consultations', icon: Calendar },
    { to: '/lawyer/messages', labelBn: 'ক্লায়েন্ট মেসেজ', labelEn: 'Client Messages', icon: Mail },
    { to: '/lawyer/meeting', labelBn: 'ভিডিও মিটিং', labelEn: 'Video Meetings', icon: Video },
    { to: '/lawyer/profile', labelBn: 'প্রোফাইল এডিটর', labelEn: 'Profile Editor', icon: UserCheck },
    { to: '/lawyer/availability', labelBn: 'ডায়েরি ও সময়সূচি', labelEn: 'Diary & Availability', icon: Clock },
    { to: '/lawyer/notifications', labelBn: 'বিজ্ঞপ্তি', labelEn: 'Notifications', icon: Bell },
    { to: '/lawyer/settings', labelBn: 'অ্যাকাউন্ট সেটিংস', labelEn: 'Settings', icon: Settings },
  ];

  return (
    <div className="flex min-h-[100dvh] bg-[#F2EDE8] text-ink-soft font-body selection:bg-clay-tint">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* Dense Sidebar for Lawyers */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-60 flex-col border-r border-granite bg-white transition-transform duration-200 lg:static lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand header */}
        <div className="header-wood flex h-14 items-center justify-between px-4 text-bone">
          <Link to="/lawyer" className="flex items-center gap-2">
            <LogoMark className="h-8 w-8" />
            <div className="flex flex-col">
              <span className="font-mono text-xs font-bold tracking-wider uppercase">LEGAL AI</span>
              <span className="text-[9px] text-bone/60 font-mono">
                {lang === 'bn' ? 'আইনজীবী পোর্টাল' : 'Lawyer Workspace'}
              </span>
            </div>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-bone/70 hover:text-bone"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Pending verification alert banner */}
        {isPending && (
          <div className="bg-bone-deep p-3 border-b border-granite text-xs">
            <div className="flex items-start gap-1.5 text-ink">
              <AlertTriangle className="h-3.5 w-3.5 text-clay-deep shrink-0 mt-0.5" />
              <p className="text-[11px] leading-tight">
                {lang === 'bn' ? 'সনদপত্র যাচাইধীন রয়েছে' : 'Enrollment under review'}
              </p>
            </div>
          </div>
        )}

        {/* Lawyer navigation */}
        <nav className="flex-1 overflow-y-auto px-2.5 py-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.to || (item.to !== '/lawyer' && location.pathname.startsWith(item.to));
            const badge = badgeFor(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-2.5 rounded px-2.5 py-2 text-xs font-medium transition ${
                  isActive
                    ? 'bg-clay-tint text-clay-deep font-semibold border-l-2 border-clay-deep'
                    : 'text-ink-soft hover:bg-bone-deep'
                }`}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <span className="flex-1">{lang === 'bn' ? item.labelBn : item.labelEn}</span>
                {badge > 0 && (
                  <span className="min-w-[18px] rounded-full bg-red-600 px-1.5 text-center text-[10px] font-bold leading-[18px] text-white">
                    {badge > 9 ? '9+' : badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Lawyer footer */}
        <div className="border-t border-granite-soft p-3 bg-bone">
          <div className="flex items-center justify-between">
            <Link
              to="/lawyer/profile"
              onClick={() => setSidebarOpen(false)}
              title={lang === 'bn' ? 'আমার প্রোফাইল' : 'My profile'}
              className="group flex min-w-0 flex-1 items-center gap-2 rounded p-1 -m-1 hover:bg-clay-tint transition"
            >
              <img
                src={user?.avatarUrl || '/logo.svg'}
                alt="Lawyer Avatar"
                className="h-7 w-7 shrink-0 rounded object-cover border border-granite"
              />
              <div className="truncate">
                <p className="truncate text-xs font-semibold text-ink group-hover:text-clay-deep group-hover:underline">{user?.name || 'Advocate'}</p>
                <span className="font-mono text-[10px] text-clay-deep uppercase">Bar Verified</span>
              </div>
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

      {/* Main Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="header-wood sticky top-0 z-30 flex h-14 items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden rounded p-1.5 text-bone/80 hover:bg-bone/10"
            >
              <Menu className="h-5 w-5" />
            </button>
            <span className="font-mono text-label text-clay-tint uppercase tracking-wider hidden sm:inline">
              LAWYER CONSOLE / BANGLADESH BAR COUNCIL
            </span>
          </div>

          <div className="flex items-center gap-3">
            <LanguageToggle tone="invert" />
            {!isPending && <HeaderInbox inbox={inbox} base="/lawyer" />}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
