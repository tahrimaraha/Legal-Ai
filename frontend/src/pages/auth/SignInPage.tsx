import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useLang } from '../../context/LanguageContext';
import { useRole } from '../../context/RoleContext';
import { ApiError, loginUser } from '../../lib/api';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';

export default function SignInPage() {
  const { lang } = useLang();
  const { login } = useRole();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState(() => searchParams.get('email') ?? '');
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
    setLoading(true);
    setError('');
    try {
      const res = await loginUser(email, password);
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
        // Correct password, unverified account: the backend just issued a fresh code.
        const params = new URLSearchParams({ email: String(err.details.email ?? email) });
        if (redirectPath) params.set('next', redirectPath);
        navigate(`/verify-email?${params}`, {
          state: { devCode: (err.details.devVerificationCode as string | undefined) ?? null },
        });
        return;
      }
      if (err instanceof ApiError) {
        setError(lang === 'bn' ? err.messageBn : err.message);
      } else {
        setError(lang === 'bn' ? 'লগইন ব্যর্থ হয়েছে' : 'Login failed');
      }
    } finally {
      setLoading(false);
    }
  };

  // Quick Demo Logins
  const handleQuickLogin = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('demo-password-123');
  };

  return (
    <div className="space-y-6 font-body">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink">
          {lang === 'bn' ? 'অ্যাকাউন্টে প্রবেশ করুন' : 'Sign in to LEGAL AI'}
        </h1>
        <p className="mt-1 text-xs text-granite">
          {lang === 'bn'
            ? 'আপনার নাগরিক বা আইনজীবী অ্যাকাউন্টে সাইন ইন করুন'
            : 'Enter your credentials to continue to your dashboard'}
        </p>
      </div>

      {error && <div className="p-2.5 rounded bg-brick/10 border border-brick/30 text-xs text-brick font-medium">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          type="email"
          label={lang === 'bn' ? 'ইমেইল ঠিকানা' : 'Email Address'}
          placeholder="name@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <div className="space-y-1">
          <Input
            type="password"
            label={lang === 'bn' ? 'পাসওয়ার্ড' : 'Password'}
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <div className="flex justify-end">
            <Link to="/forgot-password" className="text-[11px] text-clay-deep hover:underline">
              {lang === 'bn' ? 'পাসওয়ার্ড ভুলে গেছেন?' : 'Forgot password?'}
            </Link>
          </div>
        </div>

        <Button size="lg" variant="primary" type="submit" loading={loading} className="w-full justify-center">
          <span>{lang === 'bn' ? 'সাইন ইন করুন' : 'Sign in'}</span>
          <ArrowRight className="ml-1.5 h-4 w-4" />
        </Button>
      </form>

      {/* Demo shortcuts */}
      <div className="pt-4 border-t border-granite-soft">
        <span className="font-mono text-[10px] text-granite uppercase block mb-2">
          {lang === 'bn' ? 'দ্রুত ডেমো লগইন (Quick Demo Accounts)' : 'Quick Demo Presets'}
        </span>
        <div className="flex flex-wrap gap-1.5 text-xs">
          <button
            type="button"
            onClick={() => handleQuickLogin('citizen@example.com')}
            className="px-2 py-1 rounded bg-bone text-ink text-[11px] font-mono border border-granite-soft hover:bg-clay-tint"
          >
            Citizen Demo
          </button>
          <button
            type="button"
            onClick={() => handleQuickLogin('advocate.rafiq@example.com')}
            className="px-2 py-1 rounded bg-bone text-ink text-[11px] font-mono border border-granite-soft hover:bg-clay-tint"
          >
            Lawyer Demo
          </button>
        </div>
      </div>

      <div className="text-center text-xs text-ink-soft">
        {lang === 'bn' ? 'নতুন ব্যবহারকারী? ' : 'Don’t have an account? '}
        <Link to="/signup" className="font-semibold text-clay-deep hover:underline">
          {lang === 'bn' ? 'নিবন্ধন করুন' : 'Sign up'}
        </Link>
      </div>
    </div>
  );
}
