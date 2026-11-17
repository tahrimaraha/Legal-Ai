import { useState } from 'react';
import { useLang } from '../../context/LanguageContext';
import { useRole } from '../../context/RoleContext';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { CheckCircle2 } from 'lucide-react';
import { ApiError, updateMyAccount } from '../../lib/api';

export default function LawyerSettingsPage() {
  const { lang } = useLang();
  const { user, token, login } = useRole();
  const [phone, setPhone] = useState(user?.phone || '');
  const [savedToast, setSavedToast] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const updated = await updateMyAccount({ phone });
      if (token) login(updated, token);
      setSavedToast(true);
      setTimeout(() => setSavedToast(false), 2000);
    } catch (err) {
      setError(err instanceof ApiError ? (lang === 'bn' ? err.messageBn : err.message) : 'Could not save');
    } finally {
      setSaving(false);
    }
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

      {error && <div className="p-2.5 rounded bg-brick/10 border border-brick/30 text-xs text-brick font-medium">{error}</div>}

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
          value={user?.name || ''}
          disabled
          hint="Name is synchronized with Bar Council enrolment."
        />

        <Input
          type="email"
          label="Email Address"
          value={user?.email || ''}
          disabled
        />

        <Input
          type="tel"
          label="Direct Phone Number"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />

        <div className="pt-3 border-t border-granite-soft flex justify-end">
          <Button size="sm" variant="primary" type="submit" loading={saving}>
            Save Changes
          </Button>
        </div>
      </form>
    </div>
  );
}
