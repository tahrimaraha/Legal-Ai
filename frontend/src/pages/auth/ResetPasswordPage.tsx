import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowRight, CheckCircle2, Lock } from 'lucide-react';
import { useLang } from '../../context/LanguageContext';
import { ApiError, resetPassword } from '../../lib/api';
import { passwordIsValid } from '../../lib/password';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { PasswordChecklist } from '../../components/ui/PasswordChecklist';
import { ScalesDivider } from '../../components/ui/ScalesDivider';

interface ResetState {
  resetToken?: string;
  email?: string;
  expiresAt?: number;
}

/** Set a new password using the single-use pass issued after the emailed code was verified. */
export default function ResetPasswordPage() {
  const { lang } = useLang();
  const bn = lang === 'bn';
  const navigate = useNavigate();
  // The pass lives only in this page's memory (router state) — never in storage or the URL.
  const state = (useLocation().state as ResetState | null) ?? {};
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [expired, setExpired] = useState(false);

  const mismatch = confirmPassword.length > 0 && confirmPassword !== password;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError('');
    if (!passwordIsValid(password, state.email)) {
      setError(bn ? 'পাসওয়ার্ডটি নিচের সব শর্ত পূরণ করেনি' : 'Your password doesn’t meet all the requirements below');
      return;
    }
    if (password !== confirmPassword) {
      setError(bn ? 'পাসওয়ার্ড দুটি মেলেনি' : 'The two passwords do not match');
      return;
    }
    if (state.expiresAt && Date.now() > state.expiresAt) {
      setExpired(true);
      return;
    }
    setLoading(true);
    try {
      await resetPassword(state.resetToken!, password);
      setDone(true);
    } catch (err) {
      if (err instanceof ApiError && err.code === 'RESET_SESSION_EXPIRED') setExpired(true);
      else setError(err instanceof ApiError ? (bn ? err.messageBn : err.message) : bn ? 'আবার চেষ্টা করুন।' : 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!state.resetToken || expired) {
    return (
      <div className="space-y-6 text-center font-body">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-brick/30 bg-brick/10 text-brick">
          <AlertCircle className="h-7 w-7" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">
            {expired ? (bn ? 'রিসেট সেশনের মেয়াদ শেষ' : 'Reset session expired') : bn ? 'আগে কোড যাচাই করুন' : 'Verify your code first'}
          </h1>
          <p className="mt-2 text-sm text-[#8a6a55]">
            {bn
              ? 'নিরাপত্তার জন্য পাসওয়ার্ড বদলাতে ইমেইলে পাঠানো কোড যাচাই করতে হয়। আবার শুরু করুন।'
              : 'For your security, a new password can only be set right after verifying the code we email you. Please start again.'}
          </p>
        </div>
        <Button size="lg" variant="primary" className="w-full justify-center" onClick={() => navigate('/forgot-password', { state: { email: state.email } })}>
          <span>{bn ? 'নতুন কোড নিন' : 'Get a new code'}</span>
          <ArrowRight className="ml-1.5 h-4 w-4" />
        </Button>
      </div>
    );
  }

  if (done) {
    return (
      <div className="space-y-6 text-center font-body">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-[#b9d3a6] bg-[#e7f0df] text-[#4f7a3a]">
          <CheckCircle2 className="h-7 w-7" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">{bn ? 'পাসওয়ার্ড পরিবর্তন হয়েছে' : 'Password updated'}</h1>
          <p className="mt-2 text-sm text-[#8a6a55]">
            {bn
              ? 'নতুন পাসওয়ার্ড দিয়ে সাইন ইন করুন। নিরাপত্তার জন্য অন্য সব ডিভাইস থেকে সাইন আউট করা হয়েছে।'
              : 'Sign in with your new password. For your security, you’ve been signed out on all other devices.'}
          </p>
        </div>
        <Button size="lg" variant="primary" className="w-full justify-center" onClick={() => navigate('/signin', { replace: true, state: { email: state.email, passwordReset: true } })}>
          <span>{bn ? 'সাইন ইন করুন' : 'Back to sign in'}</span>
          <ArrowRight className="ml-1.5 h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-body">
      <div className="text-center">
        <h1 className="font-display text-2xl font-bold text-ink">{bn ? 'নতুন পাসওয়ার্ড দিন' : 'Set a new password'}</h1>
        <p className="mt-2 text-sm text-[#8a6a55]">
          {bn ? 'অ্যাকাউন্ট: ' : 'For '}
          <strong className="break-all text-ink">{state.email}</strong>
        </p>
        <ScalesDivider className="mt-5" />
      </div>

      {error && (
        <div role="alert" className="rounded-lg border border-brick/30 bg-brick/10 p-3 text-sm font-medium text-brick">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1">
          <Input
            type="password"
            label={bn ? 'নতুন পাসওয়ার্ড' : 'New Password'}
            placeholder={bn ? 'কমপক্ষে ৮ অক্ষর' : 'At least 8 characters'}
            icon={Lock}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <PasswordChecklist password={password} email={state.email} lang={lang} />
        </div>
        <Input
          type="password"
          label={bn ? 'পাসওয়ার্ড নিশ্চিত করুন' : 'Confirm New Password'}
          placeholder={bn ? 'পাসওয়ার্ডটি আবার লিখুন' : 'Type it again'}
          icon={Lock}
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          error={mismatch ? (bn ? 'পাসওয়ার্ড মিলছে না' : 'Passwords do not match') : undefined}
          required
        />
        <Button size="lg" variant="primary" type="submit" loading={loading} className="w-full justify-center">
          <span>{bn ? 'পাসওয়ার্ড হালনাগাদ করুন' : 'Update password'}</span>
          <ArrowRight className="ml-1.5 h-4 w-4" />
        </Button>
      </form>

      <div className="border-t border-[#e7d6c6] pt-5 text-center text-sm">
        <Link to="/signin" className="font-semibold text-clay-deep hover:underline">
          {bn ? 'বাতিল করে সাইন ইন পাতায় ফিরুন' : 'Cancel and go back to sign in'}
        </Link>
      </div>
    </div>
  );
}
