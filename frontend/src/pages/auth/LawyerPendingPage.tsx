import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Clock, ArrowRight, Home, RotateCw, XCircle, LogOut } from 'lucide-react';
import { useLang } from '../../context/LanguageContext';
import { useRole } from '../../context/RoleContext';
import { getCurrentUser } from '../../lib/api';
import { Button } from '../../components/ui/Button';

/**
 * Where a lawyer lands until an admin approves their credentials. The lawyer
 * portal (and its API) stays closed until then; this page shows the live status.
 */
export default function LawyerPendingPage() {
  const { lang } = useLang();
  const bn = lang === 'bn';
  const { user, token, role, login, logout } = useRole();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(false);
  const [checkedOnce, setCheckedOnce] = useState(false);

  const status = user?.lawyerStatus ?? 'pending';

  // Already approved (e.g. approved while away) — straight into the portal.
  useEffect(() => {
    if (role === 'lawyer' && status === 'approved') navigate('/lawyer', { replace: true });
  }, [role, status, navigate]);

  const refreshStatus = async () => {
    if (!token) return;
    setChecking(true);
    try {
      const fresh = await getCurrentUser(token);
      login(fresh, token);
    } finally {
      setChecking(false);
      setCheckedOnce(true);
    }
  };

  const handleSignOut = () => {
    logout();
    navigate('/signin');
  };

  const rejected = status === 'rejected';
  const suspended = status === 'suspended';
  const Icon = rejected || suspended ? XCircle : Clock;

  return (
    <div className="text-center space-y-6 font-body py-4">
      <div className="flex justify-center text-clay-deep">
        <div className={`rounded-full p-4 border ${rejected || suspended ? 'bg-brick/10 border-brick/30' : 'bg-clay-tint border-clay/30'}`}>
          <Icon className={`h-10 w-10 ${rejected || suspended ? 'text-brick' : 'animate-pulse text-clay-deep'}`} />
        </div>
      </div>

      <div>
        <span className="font-mono text-[11px] uppercase tracking-wider text-clay-deep font-semibold">
          {rejected
            ? bn ? 'আবেদন অনুমোদিত হয়নি' : 'Application Not Approved'
            : suspended
              ? bn ? 'অ্যাকাউন্ট স্থগিত' : 'Account Suspended'
              : bn ? 'আবেদন গৃহীত হয়েছে' : 'Application Received'}
        </span>
        <h1 className="font-display text-2xl font-bold text-ink mt-1">
          {rejected
            ? bn ? 'সনদপত্র যাচাই করা যায়নি' : 'Verification Unsuccessful'
            : suspended
              ? bn ? 'আইনজীবী পোর্টাল বন্ধ' : 'Lawyer Portal Unavailable'
              : bn ? 'সনদপত্র যাচাই প্রক্রিয়াধীন' : 'Verification Under Review'}
        </h1>
        <p className="mt-3 text-xs text-ink-soft leading-relaxed max-w-sm mx-auto">
          {rejected
            ? bn
              ? 'দুঃখিত, আপনার দাখিলকৃত তথ্য যাচাই করা যায়নি। প্রশ্ন থাকলে আমাদের সাথে যোগাযোগ করুন।'
              : 'Sorry, we could not verify the credentials you submitted. Please contact us if you have questions.'
            : suspended
              ? bn
                ? 'আপনার আইনজীবী অ্যাকাউন্টটি বর্তমানে স্থগিত আছে। বিস্তারিত জানতে আমাদের সাথে যোগাযোগ করুন।'
                : 'Your lawyer account is currently suspended. Please contact us for details.'
              : bn
                ? 'ধন্যবাদ। আপনার দাখিলকৃত বাংলাদেশ বার কাউন্সিলের সনদ নম্বর ও তথ্যাদি আমাদের অ্যাডমিন টিম কর্তৃক যাচাই করা হচ্ছে। অনুমোদনের পর আপনি আইনজীবী পোর্টাল ব্যবহার করতে পারবেন। সাধারণত ২৪-৪৮ ঘণ্টার মধ্যে যাচাই সম্পন্ন হয়।'
                : 'Your Bar Council enrolment credentials are being verified by our admin team. You can use the lawyer workspace once approved — reviews typically take 24–48 hours.'}
        </p>
        {rejected && user?.lawyerRejectionReason && (
          <p className="mt-3 mx-auto max-w-sm rounded border border-brick/30 bg-brick/5 p-3 text-left text-xs text-ink">
            <span className="font-semibold">{bn ? 'কারণ: ' : 'Reason: '}</span>
            {user.lawyerRejectionReason}
          </p>
        )}
      </div>

      {!rejected && !suspended && (
        <div className="rounded border border-granite-soft bg-bone p-4 text-left text-xs space-y-2 max-w-sm mx-auto">
          <h3 className="font-mono text-label uppercase text-clay-deep font-semibold">
            {bn ? 'যাচাইকালে কী প্রক্রিয়া সম্পন্ন হয়?' : 'What We Verify:'}
          </h3>
          <ul className="space-y-1 text-ink-soft text-[11px]">
            <li>• {bn ? 'বাংলাদেশ বার কাউন্সিলের তালিকায় নিবন্ধন নিশ্চিতকরণ' : 'Bangladesh Bar Council roll confirmation'}</li>
            <li>• {bn ? 'জেলা আইনজীবী সমিতির সদস্যপদ ও অবস্থান' : 'District bar association membership & standing'}</li>
            <li>• {bn ? 'পেশাগত ফি-এর স্বচ্ছতা ও অনুশীলনের এখতিয়ার' : 'Professional fee transparency & practice jurisdiction'}</li>
          </ul>
        </div>
      )}

      {checkedOnce && !checking && status === 'pending' && (
        <p className="text-[11px] text-granite">{bn ? 'এখনো যাচাই চলছে।' : 'Still under review.'}</p>
      )}

      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
        {role === 'lawyer' ? (
          <>
            {!rejected && !suspended && (
              <Button size="sm" variant="secondary" onClick={refreshStatus} loading={checking}>
                <RotateCw className="mr-1 h-3.5 w-3.5" />
                <span>{bn ? 'অবস্থা দেখুন' : 'Check Status'}</span>
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={handleSignOut}>
              <LogOut className="mr-1 h-3.5 w-3.5" />
              <span>{bn ? 'সাইন আউট' : 'Sign Out'}</span>
            </Button>
          </>
        ) : (
          <Link to="/signin">
            <Button size="sm" variant="secondary">
              <span>{bn ? 'সাইন ইন করুন' : 'Sign In'}</span>
              <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Button>
          </Link>
        )}
        <Link to="/">
          <Button size="sm" variant="ghost">
            <Home className="mr-1 h-3.5 w-3.5" />
            <span>{bn ? 'মূল পাতা' : 'Home'}</span>
          </Button>
        </Link>
      </div>
    </div>
  );
}
