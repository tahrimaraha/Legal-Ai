import { useState } from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { useLang } from '../../context/LanguageContext';
import { ApiError, changePassword } from '../../lib/api';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';

/** Change password for the signed-in user (citizen, lawyer or admin). */
export function ChangePasswordForm() {
  const { lang } = useLang();
  const bn = lang === 'bn';
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setDone(false);
    if (next.length < 8) {
      setError(bn ? 'নতুন পাসওয়ার্ড কমপক্ষে ৮ অক্ষরের হতে হবে' : 'New password must be at least 8 characters');
      return;
    }
    if (next !== confirm) {
      setError(bn ? 'নতুন পাসওয়ার্ড দুটি মেলেনি' : 'New passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await changePassword(current, next);
      setDone(true);
      setCurrent('');
      setNext('');
      setConfirm('');
    } catch (err) {
      setError(
        err instanceof ApiError
          ? bn ? err.messageBn : err.message
          : bn ? 'পাসওয়ার্ড পরিবর্তন করা যায়নি।' : 'Could not change the password.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        type="password"
        autoComplete="current-password"
        label={bn ? 'বর্তমান পাসওয়ার্ড' : 'Current Password'}
        placeholder="••••••••"
        value={current}
        onChange={(e) => setCurrent(e.target.value)}
        required
      />
      <Input
        type="password"
        autoComplete="new-password"
        label={bn ? 'নতুন পাসওয়ার্ড' : 'New Password'}
        placeholder="••••••••"
        value={next}
        onChange={(e) => setNext(e.target.value)}
        required
      />
      <Input
        type="password"
        autoComplete="new-password"
        label={bn ? 'নতুন পাসওয়ার্ড নিশ্চিত করুন' : 'Confirm New Password'}
        placeholder="••••••••"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        required
      />

      {error && (
        <p className="flex items-center gap-1.5 text-xs text-brick">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          {error}
        </p>
      )}
      {done && (
        <p className="flex items-center gap-1.5 text-xs text-green-700">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
          {bn ? 'পাসওয়ার্ড পরিবর্তন হয়েছে। পরেরবার নতুন পাসওয়ার্ড দিয়ে সাইন ইন করুন।' : 'Password changed. Use the new password next time you sign in.'}
        </p>
      )}

      <div className="pt-1">
        <Button size="sm" variant="primary" type="submit" loading={loading}>
          {bn ? 'পাসওয়ার্ড হালনাগাদ করুন' : 'Update Password'}
        </Button>
      </div>
    </form>
  );
}
