import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, ArrowLeft, AlertCircle } from 'lucide-react';
import { useLang } from '../../context/LanguageContext';
import { ApiError, sendForgotPassword } from '../../lib/api';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';

/** Step 1 of password reset: request a 6-digit code by email. */
export default function ForgotPasswordPage() {
  const { lang } = useLang();
  const bn = lang === 'bn';
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState(() => searchParams.get('email') ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await sendForgotPassword(email.trim());
      navigate(`/reset-password?${new URLSearchParams({ email: email.trim() })}`, {
        state: { devCode: res.devVerificationCode ?? null },
      });
    } catch (err) {
      setError(err instanceof ApiError ? (bn ? err.messageBn : err.message) : bn ? 'কোড পাঠানো যায়নি।' : 'Could not send the code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 font-body">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink">{bn ? 'পাসওয়ার্ড পুনরুদ্ধার' : 'Reset Password'}</h1>
        <p className="mt-1 text-xs text-granite">
          {bn
            ? 'আপনার নিবন্ধিত ইমেইল দিন — আমরা একটি ৬-সংখ্যার রিসেট কোড পাঠাব।'
            : "Enter your account email and we'll send you a 6-digit reset code."}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          type="email"
          label={bn ? 'ইমেইল ঠিকানা' : 'Email Address'}
          placeholder="name@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        {error && (
          <p className="flex items-center gap-1.5 text-xs text-brick">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            {error}
          </p>
        )}
        <Button size="lg" variant="primary" type="submit" loading={loading} className="w-full justify-center">
          <span>{bn ? 'রিসেট কোড পাঠান' : 'Send Reset Code'}</span>
          <ArrowRight className="ml-1.5 h-4 w-4" />
        </Button>
      </form>

      <div className="text-center text-xs text-ink-soft">
        <Link to="/signin" className="inline-flex items-center gap-1 text-clay-deep hover:underline">
          <ArrowLeft className="h-3 w-3" />
          <span>{bn ? 'লগইন পাতায় ফিরুন' : 'Back to sign in'}</span>
        </Link>
      </div>
    </div>
  );
}
