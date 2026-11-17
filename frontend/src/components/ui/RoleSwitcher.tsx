import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Shield, User, Briefcase, UserCheck, ChevronUp, ChevronDown } from 'lucide-react';
import { useRole } from '../../context/RoleContext';
import { useLang } from '../../context/LanguageContext';
import type { UserRole } from '../../mocks/types';

export function RoleSwitcher() {
  const { role, setRole } = useRole();
  const { lang } = useLang();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Show only in dev/testing environments or reviewers
  const roles: { key: UserRole; labelEn: string; labelBn: string; icon: typeof User; defaultRoute: string }[] = [
    { key: 'citizen', labelEn: 'Citizen App', labelBn: 'নাগরিক সারফেস', icon: User, defaultRoute: '/app' },
    { key: 'lawyer', labelEn: 'Lawyer Portal', labelBn: 'আইনজীবী পোর্টাল', icon: Briefcase, defaultRoute: '/lawyer' },
    { key: 'admin', labelEn: 'Admin Console', labelBn: 'অ্যাডমিন কনসোল', icon: Shield, defaultRoute: '/admin' },
    { key: 'guest', labelEn: 'Public / Guest', labelBn: 'পাবলিক ভিজিটর', icon: UserCheck, defaultRoute: '/' },
  ];

  const handleSelectRole = (newRole: UserRole, targetRoute: string) => {
    setRole(newRole);
    setOpen(false);
    // If switching surface, navigate to default for that role if not currently on valid surface
    if (newRole === 'lawyer' && !location.pathname.startsWith('/lawyer')) {
      navigate('/lawyer');
    } else if (newRole === 'admin' && !location.pathname.startsWith('/admin')) {
      navigate('/admin');
    } else if (newRole === 'citizen' && !location.pathname.startsWith('/app')) {
      navigate('/app');
    } else if (newRole === 'guest' && (location.pathname.startsWith('/app') || location.pathname.startsWith('/lawyer') || location.pathname.startsWith('/admin'))) {
      navigate('/');
    }
  };

  return (
    <aside aria-label="Dev Role Switcher" className="fixed bottom-4 left-4 z-50 flex flex-col items-start font-body text-caption">
      {open && (
        <div className="mb-2 w-56 rounded border border-granite bg-white p-2 shadow-composer">
          <div className="border-b border-granite-soft pb-1.5 mb-1.5 px-2 flex items-center justify-between">
            <span className="font-mono text-label text-clay-deep uppercase">
              {lang === 'bn' ? 'ভূমিকা পরিবর্তন (Dev)' : 'Role Switcher (Dev)'}
            </span>
            <span className="font-mono text-[10px] text-granite">MOCK</span>
          </div>
          <div className="space-y-1">
            {roles.map((r) => {
              const Icon = r.icon;
              const isActive = role === r.key;
              return (
                <button
                  key={r.key}
                  onClick={() => handleSelectRole(r.key, r.defaultRoute)}
                  className={`flex w-full items-center justify-between rounded px-2.5 py-1.5 text-left transition-colors ${
                    isActive
                      ? 'bg-clay-tint text-clay-deep font-semibold'
                      : 'text-ink-soft hover:bg-bone-deep'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Icon className="h-3.5 w-3.5" />
                    <span>{lang === 'bn' ? r.labelBn : r.labelEn}</span>
                  </div>
                  {isActive && <span className="h-1.5 w-1.5 rounded-full bg-clay-deep" />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded border border-granite bg-white/95 px-3 py-1.5 shadow-sm backdrop-blur transition hover:border-clay hover:bg-white"
        aria-label="Toggle role switcher"
      >
        <span className="h-2 w-2 rounded-full bg-clay animate-pulse" />
        <span className="font-mono text-label text-ink uppercase tracking-wider">
          Role: <strong className="text-clay-deep">{role}</strong>
        </span>
        {open ? <ChevronDown className="h-3 w-3 text-granite" /> : <ChevronUp className="h-3 w-3 text-granite" />}
      </button>
    </aside>
  );
}
