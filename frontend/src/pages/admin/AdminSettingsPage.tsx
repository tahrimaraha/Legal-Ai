import { useLang } from '../../context/LanguageContext';
import { useRole } from '../../context/RoleContext';
import { Input } from '../../components/ui/Input';
import { ChangePasswordForm } from '../../components/auth/ChangePasswordForm';

export default function AdminSettingsPage() {
  const { lang } = useLang();
  const bn = lang === 'bn';
  const { user } = useRole();

  return (
    <div className="space-y-6 font-body max-w-xl">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink">{bn ? 'অ্যাকাউন্ট সেটিংস' : 'Account Settings'}</h1>
        <p className="mt-1 text-xs text-granite">{bn ? 'আপনার অ্যাডমিন অ্যাকাউন্টের তথ্য ও পাসওয়ার্ড।' : 'Your admin account details and password.'}</p>
      </div>

      <div className="rounded border border-granite bg-white p-6 shadow-sm space-y-4">
        <Input type="text" label={bn ? 'নাম' : 'Name'} value={user?.name ?? ''} disabled />
        <Input type="email" label={bn ? 'ইমেইল' : 'Email Address'} value={user?.email ?? ''} disabled />
      </div>

      <div className="rounded border border-granite bg-white p-6 shadow-sm space-y-4">
        <h2 className="font-mono text-label uppercase text-clay-deep font-semibold">{bn ? 'পাসওয়ার্ড পরিবর্তন' : 'Change Password'}</h2>
        <ChangePasswordForm />
      </div>
    </div>
  );
}
