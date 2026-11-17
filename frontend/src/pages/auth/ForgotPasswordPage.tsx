import { useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, KeyRound, Mail, RotateCcw } from 'lucide-react';
import { useLang } from '../../context/LanguageContext';
import { ApiError, requestPasswordReset, verifyPasswordResetCode } from '../../lib/api';
import { useCooldown } from '../../lib/useCooldown';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { ScalesDivider } from '../../components/ui/ScalesDivider';

/**
 * Forgot password: (1) email → a 6-digit code is emailed (5-minute expiry);
 * (2) enter the code → the server returns a short-lived, single-use reset pass → /reset-password.
 */
export default function ForgotPasswordPage() {
  const { lang } = useLang();
  const bn = lang === 'bn';
  const navigate = useNavigate();
  const location = useLocation();
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState((location.state as { email?: string } | null)?.email || '');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const cooldown = useCooldown();
  const codeRef = useRef<HTMLInputElement>(null);

  const message = (err: unknown) =>
    err instanceof ApiError ? (bn ? err.messageBn : err.message) : bn ? 'কিছু একটা সমস্যা হয়েছে।' : 'Something went wrong.';

  const sendCode = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!email.trim() || loading || cooldown.active) return;
    setLoading(true);
    setError('');
    setInfo('');
    try {
      await requestPasswordReset(email.trim());
      cooldown.start(60);
      setStep('code');
      setCode('');
      setInfo(
        bn
          ? 'এই ইমেইলে কোনো অ্যাকাউন্ট থাকলে ৬ সংখ্যার একটি কোড পাঠানো হয়েছে। কোডটি ৫ মিনিট কার্যকর।'
          : "If an account exists for this email, we've sent a 6-digit code. It's valid for 5 minutes.",
      );
      setTimeout(() => codeRef.current?.focus(), 50);
    } catch (err) {
      if (err instanceof ApiError && typeof err.details.retryAfter === 'number') {
        cooldown.start(err.details.retryAfter);
        if (step === 'email') setStep('code'); // a code was sent moments ago — let them enter it
      }
      setError(message(err));
    } finally {
      setLoading(false);
    }
  };

  const checkCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6 || loading) return;
    setLoading(true);
    setError('');
    try {
      const res = await verifyPasswordResetCode(email.trim(), code);
      navigate('/reset-password', {
        replace: true,
        state: { resetToken: res.resetToken, email: email.trim(), expiresAt: Date.now() + res.expiresInMinutes * 60_000 },
      });
    } catch (err) {
      setError(message(err));
      if (err instanceof ApiError && err.code === 'OTP_EXPIRED') setCode('');
    } finally {
      setLoading(false);
    }
  };

  const errorBox = error && (
    <div role="alert" className="rounded-lg border border-brick/30 bg-brick/10 p-3 text-sm font-medium text-brick">
      {error}
    </div>
  );

  return (
    <div className="space-y-6 font-body">
      <div className="text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-[#dcc0a6] bg-[#f3e2d2] text-[#6b3c22]">
          {step === 'email' ? <Mail className="h-7 w-7" /> : <KeyRound className="h-7 w-7" />}
        </div>
        <h1 className="mt-4 font-display text-2xl font-bold text-ink">
          {step === 'email' ? (bn ? 'পাসওয়ার্ড ভুলে গেছেন?' : 'Forgot your password?') : bn ? 'কোডটি লিখুন' : 'Enter your code'}
        </h1>
        <p className="mt-2 text-sm text-[#8a6a55]">
          {step === 'email' ? (
            bn ? 'আপনার নিবন্ধিত ইমেইল দিন। আমরা ৬ সংখ্যার একটি রিসেট কোড পাঠাব।' : "Enter your account email and we'll send you a 6-digit reset code."
          ) : (
            <>
              {bn ? 'কোড পাঠানো হয়েছে: ' : 'Code sent to '}
              <strong className="break-all text-ink">{email}</strong>
            </>
          )}
        </p>
        <ScalesDivider className="mt-5" />
      </div>

      {step === 'email' ? (
        <form onSubmit={sendCode} className="space-y-4" noValidate={false}>
          {errorBox}
          <Input
            type="email"
            label={bn ? 'ইমেইল ঠিকানা' : 'Email Address'}
            placeholder="name@example.com"
            icon={Mail}
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Button size="lg" variant="primary" type="submit" loading={loading} disabled={cooldown.active} className="w-full justify-center">
            <span>
              {cooldown.active ? (bn ? `অপেক্ষা করুন (${cooldown.left} সে.)` : `Wait ${cooldown.left}s`) : bn ? 'রিসেট কোড পাঠান' : 'Send reset code'}
            </span>
            {!cooldown.active && <ArrowRight className="ml-1.5 h-4 w-4" />}
          </Button>
        </form>
      ) : (
        <form onSubmit={checkCode} className="space-y-4">
          {info && !error && (
            <div role="status" className="rounded-lg border border-[#b9d3a6] bg-[#eef5e8] p-3 text-sm text-[#3f6330]">
              {info}
            </div>
          )}
          {errorBox}
          <div className="space-y-1">
            <label htmlFor="reset-code" className="block text-sm font-semibold text-[#3a2112]">
              {bn ? '৬ সংখ্যার কোড' : '6-digit code'}
            </label>
            <input
              ref={codeRef}
              id="reset-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="••••••"
              className="w-full rounded-[0.6rem] border border-[#dcc8b6] bg-[#fffdf9] px-4 py-3 text-center font-mono text-2xl tracking-[0.6em] text-ink placeholder:text-granite focus:border-[#8a5a3c] focus:outline-none focus:ring-[3px] focus:ring-[#8a5a3c]/15"
              required
            />
          </div>
          <Button size="lg" variant="primary" type="submit" loading={loading} disabled={code.length !== 6} className="w-full justify-center">
            <span>{bn ? 'কোড যাচাই করুন' : 'Verify code'}</span>
            <ArrowRight className="ml-1.5 h-4 w-4" />
          </Button>
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <button
              type="button"
              onClick={() => {
                setStep('email');
                setError('');
                setInfo('');
              }}
              className="text-clay-deep hover:underline"
            >
              {bn ? 'ইমেইল পরিবর্তন করুন' : 'Change email'}
            </button>
            <button
              type="button"
              onClick={() => void sendCode()}
              disabled={cooldown.active || loading}
              className="inline-flex items-center gap-1 font-semibold text-clay-deep hover:underline disabled:cursor-not-allowed disabled:text-granite disabled:no-underline"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              {cooldown.active ? (bn ? `নতুন কোড (${cooldown.left} সে.)` : `New code in ${cooldown.left}s`) : bn ? 'নতুন কোড পাঠান' : 'Send a new code'}
            </button>
          </div>
        </form>
      )}

      <div className="border-t border-[#e7d6c6] pt-5 text-center text-sm">
        <Link to="/signin" state={{ email }} className="inline-flex items-center gap-1 font-semibold text-clay-deep hover:underline">
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>{bn ? 'সাইন ইন পাতায় ফিরুন' : 'Back to sign in'}</span>
        </Link>
      </div>
    </div>
  );
}
