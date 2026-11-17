import { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ShieldAlert,
  Database,
  Users,
  Flag,
  MessageSquareWarning,
  ShieldCheck,
  DollarSign,
  Menu,
  X,
  LogOut,
} from 'lucide-react';
import { useLang } from '../context/LanguageContext';
import { useRole } from '../context/RoleContext';
import { LanguageToggle } from '../components/ui/LanguageToggle';
import { LogoMark } from '../components/ui/Logo';

export function AdminLayout() {
  const { lang } = useLang();
  const { user, logout } = useRole();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems = [
    { to: '/admin', labelBn: 'ওভারভিউ', labelEn: 'Overview', icon: LayoutDashboard },
    { to: '/admin/lawyers', labelBn: 'আইনজীবী অনুমোদন', labelEn: 'Lawyer Approvals', icon: ShieldAlert },
    { to: '/admin/verifications', labelBn: 'যাচাই নির্ধারণ', labelEn: 'Verification Requests', icon: ShieldCheck },
    { to: '/admin/payments', labelBn: 'পেমেন্ট ও আর্থিক', labelEn: 'Payments & Finance', icon: DollarSign },
    { to: '/admin/corpus', labelBn: 'আইন করপাস ম্যানেজার', labelEn: 'Corpus Manager', icon: Database },
    { to: '/admin/users', labelBn: 'ইউজার তালিকা', labelEn: 'User Directory', icon: Users },
    { to: '/admin/flags', labelBn: 'রিপোর্টকৃত উত্তর', labelEn: 'Flagged Answers', icon: Flag },
    { to: '/admin/message-reports', labelBn: 'রিপোর্টকৃত বার্তা', labelEn: 'Reported Messages', icon: MessageSquareWarning },
  ];

  return (
    <div className="flex min-h-[100dvh] bg-[#ECE5DF] text-ink font-body selection:bg-clay-tint">
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-ink/40 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* Admin Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-60 flex-col border-r border-granite bg-ink text-white transition-transform duration-200 lg:static lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="header-wood flex h-14 items-center justify-between px-4">
          <Link to="/admin" className="flex items-center gap-2">
            <LogoMark className="h-8 w-8" />
            <div className="flex flex-col">
              <span className="font-mono text-xs font-bold tracking-widest uppercase">LEGAL AI</span>
              <span className="text-[9px] text-bone/60 font-mono">ADMINISTRATION</span>
            </div>
          </Link>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-bone/70 hover:text-bone">
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-2.5 py-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-2.5 rounded px-3 py-2 text-xs font-medium transition ${
                  isActive
                    ? 'bg-clay text-white font-semibold'
                    : 'text-granite-soft hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{lang === 'bn' ? item.labelBn : item.labelEn}</span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-white/10 p-3 bg-black/40">
          <div className="flex items-center justify-between">
            <div className="truncate">
              <p className="truncate text-xs font-semibold text-white">{user?.name || 'Administrator'}</p>
              <span className="font-mono text-[9px] text-clay uppercase">Super Admin</span>
            </div>
            <button
              onClick={() => {
                logout();
                navigate('/');
              }}
              title="Logout"
              className="text-granite hover:text-brick transition p-1"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main console area */}
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
              SYSTEM CONSOLE / VECTOR DATABASE & CORPUS HEALTH
            </span>
          </div>

          <div className="flex items-center gap-3">
            <LanguageToggle tone="invert" />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
