import { useState } from 'react';
import { useLang } from '../../context/LanguageContext';
import { useRole } from '../../context/RoleContext';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { CheckCircle2 } from 'lucide-react';
import { ChangePasswordForm } from '../../components/auth/ChangePasswordForm';
import { LawyerEarningsPanel } from '../../components/lawyer/LawyerEarningsPanel';

export default function LawyerSettingsPage() {
  const { lang } = useLang();
  const { user } = useRole();
  const [phone, setPhone] = useState(user?.phone || '+880 1819-334455');
  const [savedToast, setSavedToast] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 2000);
  };

  return (
    <div className="space-y-6 font-body max-w-xl">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink">
          {lang === 'bn' ? 'আইনজীবী অ্যাকাউন্ট সেটিংস' : 'Advocate Account Settings'}
        </h1>
        <p className="mt-1 text-xs text-granite">
          Manage your advocate portal credentials, banking details, and notifications.
        </p>
      </div>

      {savedToast && (
        <div className="p-3 rounded bg-clay-tint border border-clay text-xs text-clay-deep font-semibold flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" />
          <span>Settings updated successfully!</span>
        </div>
      )}

      <form onSubmit={handleSave} className="rounded border border-granite bg-white p-6 shadow-sm space-y-4">
        <Input
          type="text"
          label="Account Name"
          value={user?.name || 'Advocate'}
          disabled
          hint="Name is synchronized with Bar Council enrolment."
        />

        <Input
          type="email"
          label="Email Address"
          value={user?.email || 'advocate@example.com'}
          disabled
        />

        <Input
          type="tel"
          label="Direct Phone Number"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />

        <div className="pt-3 border-t border-granite-soft flex justify-end">
          <Button size="sm" variant="primary" type="submit">
            Save Changes
          </Button>
        </div>
      </form>

      <LawyerEarningsPanel />

      <div className="rounded border border-granite bg-white p-6 shadow-sm space-y-4">
        <h2 className="font-mono text-label uppercase text-clay-deep font-semibold">
          {lang === 'bn' ? 'পাসওয়ার্ড পরিবর্তন' : 'Change Password'}
        </h2>
        <ChangePasswordForm />
      </div>
    </div>
  );
}
