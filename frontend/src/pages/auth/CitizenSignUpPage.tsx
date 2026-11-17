import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Lock, Mail, Phone, User } from 'lucide-react';
import { ScalesDivider } from '../../components/ui/ScalesDivider';
import { PasswordChecklist } from '../../components/ui/PasswordChecklist';
import { passwordIsValid } from '../../lib/password';
import { useLang } from '../../context/LanguageContext';
import { ApiError, registerCitizen } from '../../lib/api';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';

export default function CitizenSignUpPage() {
  const { lang } = useLang();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [district, setDistrict] = useState('Dhaka');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) {
      setError(lang === 'bn' ? 'সকল আবশ্যক তথ্য পূরণ করুন' : 'Please fill in all required fields');
      return;
    }
    if (!passwordIsValid(password, email)) {
      setError(lang === 'bn' ? 'পাসওয়ার্ডটি নিচের সব শর্ত পূরণ করেনি' : 'Your password doesn’t meet all the requirements below');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await registerCitizen({ name: name.trim(), email: email.trim(), phone, district, password });
      // The account works once the emailed link is opened.
      navigate('/verify-email', { state: { email: res.email } });
    } catch (err) {
      if (err instanceof ApiError) {
        setError(lang === 'bn' ? err.messageBn : err.message);
      } else {
        setError(lang === 'bn' ? 'নিবন্ধন সম্পন্ন করা যায়নি' : 'Registration failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const districts = ['Dhaka', 'Chattogram', 'Sylhet', 'Rajshahi', 'Khulna', 'Barishal', 'Mymensingh', 'Rangpur'];

  return (
    <div className="space-y-6 font-body">
      <div className="text-center">
        <h1 className="font-display text-2xl font-bold text-ink">
          {lang === 'bn' ? 'নাগরিক অ্যাকাউন্ট তৈরি' : 'Create Your Account'}
        </h1>
        <p className="mt-2 text-sm text-[#8a6a55]">
          {lang === 'bn'
            ? 'বিনামূল্যে আইনি প্রশ্ন ও নোটিশ ড্রাফট সেবা পেতে তথ্য প্রদান করুন'
            : 'Join Legal AI and get cited legal information, free'}
        </p>
        <ScalesDivider className="mt-5" />
      </div>

      {error && <div className="p-2.5 rounded bg-brick/10 border border-brick/30 text-xs text-brick font-medium">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-3.5">
        <Input
          type="text"
          label={lang === 'bn' ? 'আপনার পূর্ণ নাম' : 'Full Name'}
          placeholder={lang === 'bn' ? 'আপনার পূর্ণ নাম লিখুন' : 'Enter your full name'}
          icon={User}
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            type="tel"
            label={lang === 'bn' ? 'মোবাইল নম্বর (ঐচ্ছিক)' : 'Mobile (Optional)'}
            placeholder="+880 17..."
            icon={Phone}
            autoComplete="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />

          <div className="space-y-1">
            <label className="block text-xs font-semibold uppercase text-ink-soft" htmlFor="citizen-district">
              {lang === 'bn' ? 'জেলা' : 'District'}
            </label>
            <select
              id="citizen-district"
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              className="w-full rounded border border-granite bg-white px-3 py-2 text-sm text-ink focus:border-clay focus:outline-none"
            >
              {districts.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
        </div>

        <Input
          type="password"
          label={lang === 'bn' ? 'পাসওয়ার্ড তৈরি করুন' : 'Create Password'}
          placeholder={lang === 'bn' ? 'কমপক্ষে ৮ অক্ষর' : 'At least 8 characters'}
          icon={Lock}
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <PasswordChecklist password={password} email={email} lang={lang} />

        <Button size="lg" variant="primary" type="submit" loading={loading} className="w-full justify-center mt-2">
          <span>{lang === 'bn' ? 'নিবন্ধন সম্পন্ন করুন' : 'Create Account'}</span>
          <ArrowRight className="ml-1.5 h-4 w-4" />
        </Button>
      </form>

      <div className="border-t border-[#e7d6c6] pt-5 text-center text-sm text-ink-soft">
        {lang === 'bn' ? 'ইতিমধ্যে অ্যাকাউন্ট আছে? ' : 'Already have an account? '}
        <Link to="/signin" className="font-semibold text-clay-deep hover:underline">
          {lang === 'bn' ? 'সাইন ইন করুন' : 'Sign in'}
        </Link>
      </div>
    </div>
  );
}
