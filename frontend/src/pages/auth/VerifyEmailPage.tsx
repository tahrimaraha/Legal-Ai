import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, ArrowLeft, ArrowRight, CheckCircle2, Loader2, Mail, RotateCcw } from 'lucide-react';
import { useLang } from '../../context/LanguageContext';
import { ApiError, confirmEmailVerification, resendVerificationEmail } from '../../lib/api';
import { useCooldown } from '../../lib/useCooldown';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { ScalesDivider } from '../../components/ui/ScalesDivider';

type LinkState = 'checking' | 'verified' | 'already' | 'error';

function IconBadge({ tone, children }: { tone: 'ok' | 'info' | 'error'; children: React.ReactNode }) {
  const cls =
    tone === 'ok'
      ? 'bg-[#e7f0df] text-[#4f7a3a] border-[#b9d3a6]'
      : tone === 'error'
        ? 'bg-brick/10 text-brick border-brick/30'
        : 'bg-[#f3e2d2] text-[#6b3c22] border-[#dcc0a6]';
  return <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full border ${cls}`}>{children}</div>;
}

/**
 * Email verification.
 *  • /verify-email?uid=…&token=…  — the link from the email: verifies the account.
 *  • /verify-email (state.email)  — after sign-up / a blocked sign-in: "check your inbox" + resend.
 */
export default function VerifyEmailPage() {
  const { lang } = useLang();
  const bn = lang === 'bn';
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const uid = params.get('uid');
  const token = params.get('token');
  const stateEmail = (location.state as { email?: string } | null)?.email || '';

  const [linkState, setLinkState] = useState<LinkState>('checking');
  const [linkError, setLinkError] = useState('');
  const [verifiedEmail, setVerifiedEmail] = useState('');

  const [email, setEmail] = useState(stateEmail);
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const cooldown = useCooldown(stateEmail ? 60 : 0); // a link was just sent at sign-up
  const ran = useRef(false);

  useEffect(() => {
    if (!uid || !token || ran.current) return;
    ran.current = true; // links are single-use: don't double-submit (React strict mode)
    confirmEmailVerification(uid, token)
      .then((res) => {
        setVerifiedEmail(res.email || '');
        setEmail(res.email || '');
        setLinkState(res.status === 'already_verified' ? 'already' : 'verified');
      })
      .catch((err) => {
        setLinkError(
          err instanceof ApiError
            ? bn
              ? err.messageBn
              : err.message
            : bn
              ? 'যাচাই করা যায়নি। আবার চেষ্টা করুন।'
              : 'Could not verify. Please try again.',
        );
        setLinkState('error');
      });
  }, [uid, token, bn]);

  const resend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!email || sending || cooldown.active) return;
    setSending(true);
    setNotice(null);
    try {
      await resendVerificationEmail(email.trim());
      cooldown.start(60);
      setNotice({
        tone: 'ok',
        text: bn
          ? 'অ্যাকাউন্টটি যাচাই-অপেক্ষমাণ থাকলে নতুন লিংক পাঠানো হয়েছে। ইনবক্স ও স্প্যাম ফোল্ডার দেখুন।'
          : "If that account is waiting for verification, a new link is on its way. Check your inbox and spam folder.",
      });
    } catch (err) {
      if (err instanceof ApiError && typeof err.details.retryAfter === 'number') cooldown.start(err.details.retryAfter);
      setNotice({ tone: 'error', text: err instanceof ApiError ? (bn ? err.messageBn : err.message) : String(err) });
    } finally {
      setSending(false);
    }
  };

  const resendLabel = cooldown.active
    ? bn
      ? `আবার পাঠান (${cooldown.left} সে.)`
      : `Resend in ${cooldown.left}s`
    : bn
      ? 'যাচাই ইমেইল আবার পাঠান'
      : 'Resend verification email';

  const noticeBox = notice && (
    <div
      role={notice.tone === 'error' ? 'alert' : 'status'}
      className={`rounded-lg border p-3 text-sm ${
        notice.tone === 'ok' ? 'border-[#b9d3a6] bg-[#eef5e8] text-[#3f6330]' : 'border-brick/30 bg-brick/10 text-brick'
      }`}
    >
      {notice.text}
    </div>
  );

  const resendForm = (
    <form onSubmit={resend} className="space-y-3">
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
      <Button type="submit" size="lg" variant="primary" loading={sending} disabled={cooldown.active} className="w-full justify-center">
        <RotateCcw className="mr-1.5 h-4 w-4" />
        <span>{resendLabel}</span>
      </Button>
    </form>
  );

  const backToSignIn = (
    <div className="border-t border-[#e7d6c6] pt-5 text-center text-sm">
      <Link to="/signin" state={{ email }} className="inline-flex items-center gap-1 font-semibold text-clay-deep hover:underline">
        <ArrowLeft className="h-3.5 w-3.5" />
        <span>{bn ? 'সাইন ইন পাতায় ফিরুন' : 'Back to sign in'}</span>
      </Link>
    </div>
  );

  // ——— Opened the link from the email ———
  if (uid && token) {
    if (linkState === 'checking') {
      return (
        <div className="space-y-4 py-6 text-center font-body" aria-busy="true">
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-[#8a5a3c]" />
          <p className="text-sm text-ink-soft">{bn ? 'আপনার ইমেইল যাচাই করা হচ্ছে…' : 'Verifying your email…'}</p>
        </div>
      );
    }
    if (linkState === 'verified' || linkState === 'already') {
      return (
        <div className="space-y-6 text-center font-body">
          <IconBadge tone="ok">
            <CheckCircle2 className="h-7 w-7" />
          </IconBadge>
          <div>
            <h1 className="font-display text-2xl font-bold text-ink">
              {linkState === 'verified' ? (bn ? 'ইমেইল যাচাই সম্পন্ন' : 'Email verified') : bn ? 'ইতিমধ্যে যাচাইকৃত' : 'Already verified'}
            </h1>
            <p className="mt-2 text-sm text-[#8a6a55]">
              {linkState === 'verified'
                ? bn
                  ? 'আপনার অ্যাকাউন্ট চালু হয়েছে। এখন সাইন ইন করুন।'
                  : 'Your account is now active. Sign in to get started.'
                : bn
                  ? 'এই ইমেইলটি আগেই যাচাই করা হয়েছে। সাইন ইন করুন।'
                  : 'This email was already verified. You can sign in.'}
            </p>
          </div>
          <Button size="lg" variant="primary" className="w-full justify-center" onClick={() => navigate('/signin', { state: { email: verifiedEmail, verified: true } })}>
            <span>{bn ? 'সাইন ইন করুন' : 'Continue to sign in'}</span>
            <ArrowRight className="ml-1.5 h-4 w-4" />
          </Button>
        </div>
      );
    }
    return (
      <div className="space-y-6 font-body">
        <div className="text-center">
          <IconBadge tone="error">
            <AlertCircle className="h-7 w-7" />
          </IconBadge>
          <h1 className="mt-4 font-display text-2xl font-bold text-ink">{bn ? 'লিংকটি কাজ করেনি' : "This link didn't work"}</h1>
          <p className="mt-2 text-sm text-[#8a6a55]">{linkError}</p>
          <ScalesDivider className="mt-5" />
        </div>
        {noticeBox}
        {resendForm}
        {backToSignIn}
      </div>
    );
  }

  // ——— "Check your inbox" (after sign-up or a blocked sign-in) ———
  return (
    <div className="space-y-6 font-body">
      <div className="text-center">
        <IconBadge tone="info">
          <Mail className="h-7 w-7" />
        </IconBadge>
        <h1 className="mt-4 font-display text-2xl font-bold text-ink">{bn ? 'আপনার ইমেইল দেখুন' : 'Check your email'}</h1>
        {stateEmail ? (
          <p className="mt-2 text-sm text-[#8a6a55]">
            {bn ? 'আমরা একটি যাচাই লিংক পাঠিয়েছি ' : 'We sent a verification link to '}
            <strong className="break-all text-ink">{stateEmail}</strong>
            {bn ? ' ঠিকানায়। অ্যাকাউন্ট চালু করতে লিংকে ক্লিক করুন।' : '. Click it to activate your account.'}
          </p>
        ) : (
          <p className="mt-2 text-sm text-[#8a6a55]">
            {bn
              ? 'নতুন যাচাই লিংক পেতে আপনার নিবন্ধিত ইমেইল দিন।'
              : 'Enter the email you registered with and we’ll send a new verification link.'}
          </p>
        )}
        <ScalesDivider className="mt-5" />
      </div>

      {stateEmail && (
        <ul className="space-y-1.5 rounded-lg border border-[#e7d6c6] bg-[#fffdf9] p-4 text-sm text-ink-soft">
          <li>• {bn ? 'লিংকটি ২৪ ঘণ্টা পর্যন্ত একবার ব্যবহার করা যাবে।' : 'The link works once and expires in 24 hours.'}</li>
          <li>• {bn ? 'ইমেইল না পেলে স্প্যাম বা প্রমোশন ফোল্ডার দেখুন।' : "Can't find it? Check your spam or promotions folder."}</li>
        </ul>
      )}

      {noticeBox}

      {stateEmail ? (
        <div className="space-y-3">
          <Button size="lg" variant="primary" loading={sending} disabled={cooldown.active} onClick={() => void resend()} className="w-full justify-center">
            <RotateCcw className="mr-1.5 h-4 w-4" />
            <span>{resendLabel}</span>
          </Button>
          <p className="text-center text-xs text-granite">
            {bn ? 'ভুল ইমেইল দিয়েছেন? ' : 'Used the wrong email? '}
            <Link to="/signup" className="font-semibold text-clay-deep hover:underline">
              {bn ? 'আবার নিবন্ধন করুন' : 'Sign up again'}
            </Link>
          </p>
        </div>
      ) : (
        resendForm
      )}

      {backToSignIn}
    </div>
  );
}
