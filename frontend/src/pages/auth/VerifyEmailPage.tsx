import { useEffect, useState } from 'react';
import { useNavigate, useLocation, useSearchParams, Link } from 'react-router-dom';
import { Mail, CheckCircle2, ArrowRight, AlertCircle, RotateCw } from 'lucide-react';
import { useLang } from '../../context/LanguageContext';
import { useRole } from '../../context/RoleContext';
import { ApiError, confirmEmailVerification, resendVerificationCode } from '../../lib/api';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import type { User } from '../../mocks/types';

/** Optional extras passed via router state; the page works without them (e.g. after a refresh). */
interface VerifyEmailState {
  devCode?: string | null;
}

const RESEND_COOLDOWN_SECONDS = 30;

function homeFor(user: User): string {
  if (user.role === 'lawyer') return '/signup/lawyer/pending';
  if (user.role === 'admin') return '/admin';
  return '/app';
}

/**
 * Verification is keyed by email (in the URL), not by an in-memory token, so a
 * refresh, a return visit, or a redirect from the sign-in page all work.
 */
export default function VerifyEmailPage() {
  const { lang } = useLang();
  const { login } = useRole();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const state = location.state as VerifyEmailState | null;

  const email = searchParams.get('email') ?? '';
  const next = searchParams.get('next');

  const [code, setCode] = useState('');
  const [devCode, setDevCode] = useState<string | null>(state?.devCode ?? null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  if (!email) {
    return (
      <div className="space-y-4 font-body text-center">
        <h1 className="font-display text-xl font-bold text-ink">
          {lang === 'bn' ? 'কোনো অপেক্ষমাণ যাচাই পাওয়া যায়নি' : 'No Pending Verification Found'}
        </h1>
        <p className="text-xs text-granite">
          {lang === 'bn'
            ? 'সাইন ইন করুন — অ্যাকাউন্ট যাচাই না হয়ে থাকলে আমরা আপনাকে এখানে নিয়ে আসব।'
            : 'Sign in — if your account still needs verifying, we will bring you back here with a new code.'}
        </p>
        <Link to="/signin" className="inline-flex items-center gap-1.5 text-xs font-semibold text-clay-deep hover:underline">
          <span>{lang === 'bn' ? 'সাইন ইন পাতায় যান' : 'Go to Sign In'}</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    );
  }

  const showError = (err: unknown, fallbackEn: string, fallbackBn: string) => {
    if (err instanceof ApiError) {
      setError(lang === 'bn' ? err.messageBn : err.message);
    } else {
      setError(lang === 'bn' ? fallbackBn : fallbackEn);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setError('');
    setNotice('');
    setLoading(true);
    try {
      const res = await confirmEmailVerification(email, code.trim());
      login(res.user, res.token);
      setVerified(true);
      setTimeout(() => navigate(next || homeFor(res.user), { replace: true }), 1000);
    } catch (err) {
      if (err instanceof ApiError && err.code === 'ALREADY_VERIFIED') {
        navigate(`/signin?email=${encodeURIComponent(email)}`, { replace: true });
        return;
      }
      showError(err, 'Could not verify the code. Please try again.', 'কোডটি যাচাই করা যায়নি। আবার চেষ্টা করুন।');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError('');
    setNotice('');
    setResending(true);
    try {
      const res = await resendVerificationCode(email);
      setDevCode(res.devVerificationCode ?? null);
      setCode('');
      setCooldown(RESEND_COOLDOWN_SECONDS);
      setNotice(lang === 'bn' ? 'নতুন কোড পাঠানো হয়েছে। আগের কোডটি আর কাজ করবে না।' : 'A new code has been sent. Earlier codes no longer work.');
    } catch (err) {
      showError(err, 'Could not send a new code.', 'নতুন কোড পাঠানো যায়নি।');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="space-y-6 font-body text-center">
      <div className="flex justify-center text-clay-deep">
        <div className="rounded-full bg-clay-tint p-3 border border-clay/30">
          <Mail className="h-8 w-8 text-clay-deep" />
        </div>
      </div>

      <div>
        <h1 className="font-display text-2xl font-bold text-ink">
          {lang === 'bn' ? 'অ্যাকাউন্ট যাচাইকরণ' : 'Verify Your Account'}
        </h1>
        <p className="mt-1 text-xs text-granite">
          {lang === 'bn'
            ? `আমরা ${email} ঠিকানায় একটি ৬-সংখ্যার কোড পাঠিয়েছি`
            : `We've sent a 6-digit code to ${email}`}
        </p>
      </div>

      {verified ? (
        <div className="p-4 rounded bg-clay-tint border border-clay text-xs text-clay-deep font-semibold flex items-center justify-center gap-2">
          <CheckCircle2 className="h-4 w-4" />
          <span>{lang === 'bn' ? 'যাচাই সফল হয়েছে! রিডাইরেক্ট হচ্ছে...' : 'Verified! Redirecting...'}</span>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {devCode && (
            <div className="p-2.5 rounded bg-bone-deep border border-granite-soft text-[11px] text-ink-soft">
              {lang === 'bn' ? 'ডেভ মোড — আপনার কোড: ' : 'Dev mode — your code: '}
              <button
                type="button"
                onClick={() => setCode(devCode)}
                className="font-mono font-bold text-ink tracking-widest underline decoration-dotted"
                title={lang === 'bn' ? 'কোড বসাতে ক্লিক করুন' : 'Click to fill in'}
              >
                {devCode}
              </button>
            </div>
          )}

          <Input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="123456"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            className="text-center font-mono text-lg tracking-widest"
            maxLength={6}
            required
          />

          {error && (
            <p className="flex items-center justify-center gap-1.5 text-xs text-brick">
              <AlertCircle className="h-3.5 w-3.5" />
              {error}
            </p>
          )}
          {notice && !error && <p className="text-xs text-clay-deep">{notice}</p>}

          <Button size="lg" variant="primary" type="submit" loading={loading} className="w-full justify-center">
            <span>{lang === 'bn' ? 'যাচাই সম্পন্ন করুন' : 'Confirm Code'}</span>
            <ArrowRight className="ml-1.5 h-4 w-4" />
          </Button>

          <button
            type="button"
            onClick={handleResend}
            disabled={resending || cooldown > 0}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-clay-deep hover:underline disabled:text-granite disabled:no-underline disabled:cursor-not-allowed"
          >
            <RotateCw className={`h-3.5 w-3.5 ${resending ? 'animate-spin' : ''}`} />
            {cooldown > 0
              ? lang === 'bn'
                ? `নতুন কোড পাঠান (${cooldown}s)`
                : `Resend code (${cooldown}s)`
              : lang === 'bn'
                ? 'নতুন কোড পাঠান'
                : 'Resend code'}
          </button>
        </form>
      )}

      <div className="text-center text-xs text-ink-soft">
        <Link to="/signin" className="text-clay-deep hover:underline">
          {lang === 'bn' ? 'সাইন ইন পাতায় ফিরুন' : 'Back to sign in'}
        </Link>
      </div>
    </div>
  );
}
