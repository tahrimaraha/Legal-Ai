import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, ArrowLeft, CheckCircle2, AlertCircle, RotateCw } from 'lucide-react';
import { useLang } from '../../context/LanguageContext';
import { ApiError, resetPassword, sendForgotPassword } from '../../lib/api';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';

const RESEND_COOLDOWN_SECONDS = 30;

/** Step 2 of password reset: the emailed code plus the new password. */
export default function ResetPasswordPage() {
  const { lang } = useLang();
  const bn = lang === 'bn';
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email') ?? '';

  const [code, setCode] = useState('');
  const [devCode, setDevCode] = useState<string | null>((location.state as { devCode?: string | null } | null)?.devCode ?? null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  // Without an email there is no code to check — start from step 1.
  if (!email) {
    return (
      <div className="space-y-4 font-body text-center">
        <h1 className="font-display text-xl font-bold text-ink">{bn ? 'প্রথমে রিসেট কোড নিন' : 'Request a Reset Code First'}</h1>
        <Link to="/forgot-password" className="inline-flex items-center gap-1.5 text-xs font-semibold text-clay-deep hover:underline">
          <span>{bn ? 'পাসওয়ার্ড পুনরুদ্ধার পাতায় যান' : 'Go to Reset Password'}</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    );
  }

  const showError = (err: unknown, en: string, bnText: string) =>
    setError(err instanceof ApiError ? (bn ? err.messageBn : err.message) : bn ? bnText : en);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setNotice('');
    if (password.length < 8) {
      setError(bn ? 'পাসওয়ার্ড কমপক্ষে ৮ অক্ষরের হতে হবে' : 'Password must be at least 8 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError(bn ? 'পাসওয়ার্ড দুটি মেলেনি' : 'Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await resetPassword(email, code.trim(), password);
      setSuccess(true);
      setTimeout(() => navigate(`/signin?${new URLSearchParams({ email })}`, { replace: true }), 1500);
    } catch (err) {
      showError(err, 'Could not reset the password.', 'পাসওয়ার্ড রিসেট করা যায়নি।');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError('');
    setNotice('');
    setResending(true);
    try {
      const res = await sendForgotPassword(email);
      setDevCode(res.devVerificationCode ?? null);
      setCode('');
      setCooldown(RESEND_COOLDOWN_SECONDS);
      setNotice(bn ? 'নতুন কোড পাঠানো হয়েছে। আগের কোডটি আর কাজ করবে না।' : 'A new code has been sent. Earlier codes no longer work.');
    } catch (err) {
      showError(err, 'Could not send a new code.', 'নতুন কোড পাঠানো যায়নি।');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="space-y-6 font-body">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink">{bn ? 'নতুন পাসওয়ার্ড নির্ধারণ' : 'Set New Password'}</h1>
        <p className="mt-1 text-xs text-granite">
          {bn
            ? `${email} ঠিকানায় পাঠানো ৬-সংখ্যার কোড এবং আপনার নতুন পাসওয়ার্ড দিন।`
            : `Enter the 6-digit code we sent to ${email} and choose a new password.`}
        </p>
      </div>

      {success ? (
        <div className="p-4 rounded bg-clay-tint border border-clay text-xs text-clay-deep font-semibold flex items-center justify-center gap-2">
          <CheckCircle2 className="h-4 w-4" />
          <span>{bn ? 'পাসওয়ার্ড পরিবর্তন হয়েছে! সাইন ইন পাতায় যাচ্ছে...' : 'Password changed! Taking you to sign in...'}</span>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {devCode && (
            <div className="p-2.5 rounded bg-bone-deep border border-granite-soft text-[11px] text-ink-soft">
              {bn ? 'ডেভ মোড — আপনার কোড: ' : 'Dev mode — your code: '}
              <button
                type="button"
                onClick={() => setCode(devCode)}
                className="font-mono font-bold text-ink tracking-widest underline decoration-dotted"
              >
                {devCode}
              </button>
            </div>
          )}
          <Input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            label={bn ? 'রিসেট কোড' : 'Reset Code'}
            placeholder="123456"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            maxLength={6}
            className="font-mono tracking-widest"
            required
          />
          <Input
            type="password"
            autoComplete="new-password"
            label={bn ? 'নতুন পাসওয়ার্ড' : 'New Password'}
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <Input
            type="password"
            autoComplete="new-password"
            label={bn ? 'পাসওয়ার্ড নিশ্চিত করুন' : 'Confirm New Password'}
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />

          {error && (
            <p className="flex items-center gap-1.5 text-xs text-brick">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              {error}
            </p>
          )}
          {notice && !error && <p className="text-xs text-clay-deep">{notice}</p>}

          <Button size="lg" variant="primary" type="submit" loading={loading} className="w-full justify-center">
            <span>{bn ? 'পাসওয়ার্ড হালনাগাদ করুন' : 'Update Password'}</span>
            <ArrowRight className="ml-1.5 h-4 w-4" />
          </Button>

          <div className="text-center">
            <button
              type="button"
              onClick={handleResend}
              disabled={resending || cooldown > 0}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-clay-deep hover:underline disabled:text-granite disabled:no-underline disabled:cursor-not-allowed"
            >
              <RotateCw className={`h-3.5 w-3.5 ${resending ? 'animate-spin' : ''}`} />
              {cooldown > 0
                ? bn ? `নতুন কোড পাঠান (${cooldown}s)` : `Resend code (${cooldown}s)`
                : bn ? 'নতুন কোড পাঠান' : 'Resend code'}
            </button>
          </div>
        </form>
      )}

      <div className="text-center text-xs text-ink-soft">
        <Link to="/signin" className="inline-flex items-center gap-1 text-clay-deep hover:underline">
          <ArrowLeft className="h-3 w-3" />
          <span>{bn ? 'লগইন পাতায় ফিরুন' : 'Back to sign in'}</span>
        </Link>
      </div>
    </div>
  );
}
