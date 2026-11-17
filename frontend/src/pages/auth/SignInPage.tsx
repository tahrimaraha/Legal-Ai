import { useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Lock, Mail, MailWarning, RotateCcw } from 'lucide-react';
import { useLang } from '../../context/LanguageContext';
import { useRole } from '../../context/RoleContext';
import { ApiError, loginUser, resendVerificationEmail } from '../../lib/api';
import { useCooldown } from '../../lib/useCooldown';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';

export default function SignInPage() {
  const { lang } = useLang();
  const { login } = useRole();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const arrived = (useLocation().state as { email?: string; verified?: boolean; passwordReset?: boolean } | null) ?? {};
  const [email, setEmail] = useState(arrived.email || '');
  // Set when the password was right but the email isn't verified yet.
  const [unverifiedEmail, setUnverifiedEmail] = useState('');
  const [resendNote, setResendNote] = useState('');
  const [resending, setResending] = useState(false);
  const cooldown = useCooldown();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const redirectPath = searchParams.get('redirect');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError(lang === 'bn' ? 'ইমেইল ও পাসওয়ার্ড প্রদান করুন' : 'Please enter email and password');
      return;
    }
    if (loading) return;
    setLoading(true);
    setError('');
    setUnverifiedEmail('');
    setResendNote('');
    try {
      const res = await loginUser(email.trim(), password);
      login(res.user, res.token);
      if (redirectPath) {
        navigate(redirectPath);
      } else if (res.user.role === 'lawyer') {
        navigate('/lawyer');
      } else if (res.user.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/app');
      }
    } catch (err) {
      if (err instanceof ApiError && err.code === 'EMAIL_NOT_VERIFIED') {
        setUnverifiedEmail(email.trim());
      } else if (err instanceof ApiError) {
        setError(lang === 'bn' ? err.messageBn : err.message);
      } else {
        setError(lang === 'bn' ? 'লগইন ব্যর্থ হয়েছে' : 'Login failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 font-body">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink">
          {lang === 'bn' ? 'অ্যাকাউন্টে প্রবেশ করুন' : 'Sign in to LEGAL AI'}
        </h1>
        <p className="mt-2 text-sm text-[#8a6a55]">
          {lang === 'bn'
            ? 'আপনার নাগরিক বা আইনজীবী অ্যাকাউন্টে সাইন ইন করুন'
            : 'Enter your credentials to continue to your dashboard'}
        </p>
      </div>

      {(arrived.verified || arrived.passwordReset) && !error && !unverifiedEmail && (
        <div role="status" className="flex items-start gap-2 rounded-lg border border-[#b9d3a6] bg-[#eef5e8] p-3 text-sm text-[#3f6330]">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            {arrived.passwordReset
              ? lang === 'bn' ? 'পাসওয়ার্ড পরিবর্তন হয়েছে। নতুন পাসওয়ার্ড দিয়ে সাইন ইন করুন।' : 'Password updated. Sign in with your new password.'
              : lang === 'bn' ? 'ইমেইল যাচাই সম্পন্ন। এখন সাইন ইন করুন।' : 'Email verified. You can sign in now.'}
          </span>
        </div>
      )}

      {error && <div role="alert" className="rounded-lg border border-brick/30 bg-brick/10 p-3 text-sm font-medium text-brick">{error}</div>}

      {unverifiedEmail && (
        <div role="alert" className="space-y-3 rounded-lg border border-[#e2b98f] bg-[#fbeedd] p-4 text-sm text-[#6b3c22]">
          <p className="flex items-start gap-2 font-semibold">
            <MailWarning className="mt-0.5 h-4 w-4 shrink-0" />
            {lang === 'bn' ? 'আগে আপনার ইমেইল যাচাই করুন' : 'Please verify your email first'}
          </p>
          <p>
            {lang === 'bn'
              ? `${unverifiedEmail} ঠিকানায় পাঠানো লিংকে ক্লিক করে অ্যাকাউন্ট চালু করুন।`
              : `Open the link we sent to ${unverifiedEmail} to activate your account.`}
          </p>
          {resendNote && <p className="text-[#3f6330]">{resendNote}</p>}
          <Button
            type="button"
            size="sm"
            variant="secondary"
            loading={resending}
            disabled={cooldown.active}
            onClick={async () => {
              setResending(true);
              try {
                await resendVerificationEmail(unverifiedEmail);
                cooldown.start(60);
                setResendNote(lang === 'bn' ? 'নতুন যাচাই লিংক পাঠানো হয়েছে।' : 'A new verification link is on its way.');
              } catch (err) {
                if (err instanceof ApiError && typeof err.details.retryAfter === 'number') cooldown.start(err.details.retryAfter);
                setResendNote(err instanceof ApiError ? (lang === 'bn' ? err.messageBn : err.message) : String(err));
              } finally {
                setResending(false);
              }
            }}
          >
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
            {cooldown.active
              ? lang === 'bn' ? `আবার পাঠান (${cooldown.left} সে.)` : `Resend in ${cooldown.left}s`
              : lang === 'bn' ? 'যাচাই ইমেইল আবার পাঠান' : 'Resend verification email'}
          </Button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          type="email"
          label={lang === 'bn' ? 'ইমেইল ঠিকানা' : 'Email Address'}
          placeholder="name@example.com"
          icon={Mail}
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <div className="space-y-1">
          <Input
            type="password"
            label={lang === 'bn' ? 'পাসওয়ার্ড' : 'Password'}
            placeholder="••••••••"
            icon={Lock}
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <div className="flex justify-end">
            <Link to="/forgot-password" state={{ email }} className="text-xs font-medium text-[#3a2112] hover:underline">
              {lang === 'bn' ? 'পাসওয়ার্ড ভুলে গেছেন?' : 'Forgot password?'}
            </Link>
          </div>
        </div>

        <Button size="lg" variant="primary" type="submit" loading={loading} className="w-full justify-center">
          <span>{lang === 'bn' ? 'সাইন ইন করুন' : 'Sign in'}</span>
          <ArrowRight className="ml-1.5 h-4 w-4" />
        </Button>
      </form>

      <div className="border-t border-[#e7d6c6] pt-5 text-center text-sm text-ink-soft">
        {lang === 'bn' ? 'নতুন ব্যবহারকারী? ' : 'Don’t have an account? '}
        <Link to="/signup" className="font-semibold text-clay-deep hover:underline">
          {lang === 'bn' ? 'নিবন্ধন করুন' : 'Sign up'}
        </Link>
      </div>
    </div>
  );
}
