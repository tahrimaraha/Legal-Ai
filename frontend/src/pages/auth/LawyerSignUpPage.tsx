import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowRight, ArrowLeft, CheckCircle2, Shield, User, Award, Briefcase, FileCheck, Upload, FileText, X, AlertCircle } from 'lucide-react';
import { useLang } from '../../context/LanguageContext';
import { ApiError, registerLawyer } from '../../lib/api';
import { Input, Textarea } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { ProgressRail } from '../../components/ui/ProgressRail';
import { PasswordChecklist } from '../../components/ui/PasswordChecklist';
import { passwordIsValid } from '../../lib/password';

export default function LawyerSignUpPage() {
  const { lang, num } = useLang();
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form State across 4 steps
  const [formData, setFormData] = useState({
    // Step 0: Identity
    fullName: '',
    email: '',
    phone: '',
    password: '',
    district: 'Dhaka',
    // Step 1: Bar Credentials
    barEnrolmentNo: '',
    enrolmentYear: 2018,
    courtName: 'High Court Division',
    licenseDocumentUrl: '',
    licenseDocumentName: '',
    // Step 2: Practice & Fees
    practiceAreas: ['Family Law', 'Tenancy Disputes'],
    startingFeeBdt: 700,
    bio: '',
  });
  const [fileError, setFileError] = useState('');

  const steps = [
    { id: 'identity', label: lang === 'bn' ? 'ব্যক্তিগত তথ্য' : 'Personal Identity' },
    { id: 'credentials', label: lang === 'bn' ? 'বার সনদপত্র' : 'Bar Credentials' },
    { id: 'practice', label: lang === 'bn' ? 'প্র্যাকটিস ও ফি' : 'Practice & Fees' },
    { id: 'review', label: lang === 'bn' ? 'চূড়ান্ত পর্যালোচনা' : 'Review & Submit' },
  ];

  const updateField = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setFileError('');
    if (file.size > 5 * 1024 * 1024) {
      setFileError(lang === 'bn' ? 'ফাইলের আকার ৫ এমবি-র বেশি হতে পারবে না।' : 'File size must be under 5MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      updateField('licenseDocumentUrl', reader.result as string);
      updateField('licenseDocumentName', file.name);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveFile = () => {
    updateField('licenseDocumentUrl', '');
    updateField('licenseDocumentName', '');
  };

  const handleNext = () => {
    setError('');
    if (step === 0) {
      if (!formData.fullName || !formData.email || !formData.phone || !formData.password) {
        setError(lang === 'bn' ? 'অনুগ্রহ করে সকল তথ্য পূরণ করুন' : 'Please fill all identity fields');
        return;
      }
      if (!passwordIsValid(formData.password, formData.email)) {
        setError(lang === 'bn' ? 'পাসওয়ার্ডটি নিচের সব শর্ত পূরণ করেনি' : 'Your password doesn’t meet all the requirements below');
        return;
      }
    } else if (step === 1) {
      if (!formData.barEnrolmentNo || !formData.enrolmentYear) {
        setError(lang === 'bn' ? 'বার কাউন্সিলের সনদ নম্বর ও বছর প্রদান করুন' : 'Enter Bar enrolment details');
        return;
      }
      if (!formData.licenseDocumentUrl) {
        setError(lang === 'bn' ? 'অনুগ্রহ করে আপনার বার আইডি কার্ডের একটি ডিজিটাল কপি আপলোড করুন' : 'Please upload a digital copy of your Bar ID card');
        return;
      }
    }
    setStep((s) => s + 1);
  };

  const handleBack = () => {
    setError('');
    setStep((s) => s - 1);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await registerLawyer(formData);
      // Verify the email first; after signing in, unapproved lawyers see the pending page.
      navigate('/verify-email', { state: { email: res.email } });
    } catch (err) {
      if (err instanceof ApiError) {
        setError(lang === 'bn' ? err.messageBn : err.message);
      } else {
        setError(lang === 'bn' ? 'নিবন্ধন সম্পন্ন করা যায়নি' : 'Lawyer registration failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const practiceAreaOptions = [
    'Constitutional Law',
    'Family Law',
    'Tenancy Disputes',
    'Cyber Security Law',
    'Consumer Rights',
    'Penal Code / Criminal Defense',
    'Succession & Inheritance',
    'Land Registration',
  ];

  const togglePracticeArea = (area: string) => {
    const current = formData.practiceAreas;
    if (current.includes(area)) {
      updateField('practiceAreas', current.filter((a) => a !== area));
    } else {
      updateField('practiceAreas', [...current, area]);
    }
  };

  return (
    <div className="space-y-6 font-body">
      <div>
        <span className="font-mono text-label uppercase text-clay-deep">
          {lang === 'bn' ? `ধাপ ${num(step + 1)} / ৪` : `Step ${step + 1} of 4`}
        </span>
        <h1 className="font-display text-2xl font-bold text-ink mt-1">
          {lang === 'bn' ? 'আইনজীবী হিসেবে নিবন্ধন' : 'Advocate Onboarding'}
        </h1>
      </div>

      {/* Step Rail Indicator */}
      <ProgressRail steps={steps} currentStep={step} />

      {error && (
        <div className="p-2.5 rounded bg-brick/10 border border-brick/30 text-xs text-brick font-medium">
          {error}
        </div>
      )}

      {/* Step 0: Identity */}
      {step === 0 && (
        <div className="space-y-3.5">
          <Input
            type="text"
            label={lang === 'bn' ? 'পূর্ণ নাম (বার সনদ অনুযায়ী)' : 'Full Legal Name (as per Bar Council)'}
            placeholder="Advocate Md. Rafiqul Islam"
            value={formData.fullName}
            onChange={(e) => updateField('fullName', e.target.value)}
            required
          />

          <Input
            type="email"
            label={lang === 'bn' ? 'ইমেইল ঠিকানা' : 'Email Address'}
            placeholder="advocate@example.com"
            value={formData.email}
            onChange={(e) => updateField('email', e.target.value)}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              type="tel"
              label={lang === 'bn' ? 'মোবাইল নম্বর' : 'Phone Number'}
              placeholder="+880 1..."
              value={formData.phone}
              onChange={(e) => updateField('phone', e.target.value)}
              required
            />

            <div className="space-y-1">
              <label className="block text-xs font-semibold uppercase text-ink-soft">
                {lang === 'bn' ? 'জেলা বার' : 'District Bar'}
              </label>
              <select
                value={formData.district}
                onChange={(e) => updateField('district', e.target.value)}
                className="w-full rounded border border-granite bg-white px-3 py-2 text-sm text-ink focus:border-clay focus:outline-none"
              >
                {['Dhaka', 'Chattogram', 'Sylhet', 'Rajshahi', 'Khulna', 'Barishal', 'Mymensingh'].map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          </div>

          <Input
            type="password"
            label={lang === 'bn' ? 'অ্যাকাউন্ট পাসওয়ার্ড' : 'Account Password'}
            placeholder="••••••••"
            value={formData.password}
            onChange={(e) => updateField('password', e.target.value)}
            autoComplete="new-password"
            required
          />
          <PasswordChecklist password={formData.password} email={formData.email} lang={lang} />
        </div>
      )}

      {/* Step 1: Bar Credentials */}
      {step === 1 && (
        <div className="space-y-3.5">
          <Input
            type="text"
            label={lang === 'bn' ? 'বাংলাদেশ বার কাউন্সিল সনদ নম্বর' : 'Bangladesh Bar Council Enrolment No'}
            placeholder="e.g. BC/DH/2018/10452"
            value={formData.barEnrolmentNo}
            onChange={(e) => updateField('barEnrolmentNo', e.target.value)}
            hint={
              lang === 'bn'
                ? 'আপনার বার কাউন্সিলের সনদ যাচাইয়ের জন্য সঠিক নম্বরটি প্রদান করুন।'
                : 'Exact registration format as appearing on your advocate identity card.'
            }
            required
          />

          <Input
            type="number"
            label={lang === 'bn' ? 'সনদ প্রাপ্তির সন (Enrolment Year)' : 'Enrolment Year'}
            value={formData.enrolmentYear}
            onChange={(e) => updateField('enrolmentYear', Number(e.target.value))}
            min={1970}
            max={new Date().getFullYear()}
            required
          />

          <div className="space-y-1">
            <label className="block text-xs font-semibold uppercase text-ink-soft">
              {lang === 'bn' ? 'প্র্যাকটিসকৃত আদালত' : 'Primary Court Admission'}
            </label>
            <select
              value={formData.courtName}
              onChange={(e) => updateField('courtName', e.target.value)}
              className="w-full rounded border border-granite bg-white px-3 py-2 text-sm text-ink focus:border-clay focus:outline-none"
            >
              <option value="Appellate Division">Appellate Division, Supreme Court</option>
              <option value="High Court Division">High Court Division, Supreme Court</option>
              <option value="District & Sessions Judge Court">District & Sessions Judge Court</option>
              <option value="Family Court">Family Court</option>
              <option value="Labour Court">Labour Court</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase text-ink-soft">
              {lang === 'bn' ? 'বার আইডি কার্ডের ডিজিটাল কপি' : 'Bar License / ID Card (Digital Copy)'}
            </label>

            {formData.licenseDocumentUrl ? (
              <div className="rounded border border-granite bg-bone/50 p-3 space-y-2">
                {formData.licenseDocumentUrl.startsWith('data:image') ? (
                  <img
                    src={formData.licenseDocumentUrl}
                    alt="License preview"
                    className="max-h-40 mx-auto rounded border border-granite-soft"
                  />
                ) : (
                  <div className="flex items-center justify-center gap-2 text-clay-deep py-4">
                    <FileText className="h-6 w-6" />
                    <span className="text-xs font-medium">{formData.licenseDocumentName}</span>
                  </div>
                )}
                <button
                  type="button"
                  onClick={handleRemoveFile}
                  className="mx-auto flex items-center gap-1 text-[11px] text-brick hover:underline"
                >
                  <X className="h-3 w-3" />
                  <span>{lang === 'bn' ? 'সরিয়ে আবার আপলোড করুন' : 'Remove & re-upload'}</span>
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center gap-1.5 rounded border border-dashed border-granite bg-bone/50 p-5 text-center cursor-pointer hover:border-clay hover:bg-clay-tint/20 transition">
                <Upload className="h-6 w-6 text-clay-deep" />
                <span className="text-xs font-medium text-ink-soft">
                  {lang === 'bn' ? 'ছবি বা পিডিএফ আপলোড করতে ক্লিক করুন' : 'Click to upload an image or PDF'}
                </span>
                <span className="text-[10px] text-granite">{lang === 'bn' ? 'সর্বোচ্চ ৫ এমবি' : 'Max 5MB'}</span>
                <input type="file" accept="image/*,.pdf" className="hidden" onChange={handleFileChange} />
              </label>
            )}

            {fileError && (
              <p className="flex items-center gap-1 text-[11px] text-brick">
                <AlertCircle className="h-3 w-3" />
                {fileError}
              </p>
            )}

            <p className="text-[11px] text-granite">
              {lang === 'bn'
                ? 'অ্যাডমিন টিম এই ডকুমেন্ট পর্যালোচনা করে আপনার অ্যাকাউন্ট অনুমোদন করবে।'
                : 'The admin team will review this document before approving your account.'}
            </p>
          </div>
        </div>
      )}

      {/* Step 2: Practice & Fees */}
      {step === 2 && (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-ink-soft mb-2">
              {lang === 'bn' ? 'বিশেষায়িত আইনি ক্ষেত্রসমূহ (Practice Areas)' : 'Select Practice Areas'}
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {practiceAreaOptions.map((area) => {
                const checked = formData.practiceAreas.includes(area);
                return (
                  <button
                    key={area}
                    type="button"
                    onClick={() => togglePracticeArea(area)}
                    className={`flex items-center gap-2 p-2.5 rounded text-left border text-xs transition ${
                      checked
                        ? 'bg-clay-tint border-clay text-clay-deep font-semibold'
                        : 'bg-white border-granite text-ink-soft hover:bg-bone'
                    }`}
                  >
                    <div
                      className={`h-4 w-4 rounded flex items-center justify-center border ${
                        checked ? 'bg-clay text-white border-clay' : 'border-granite'
                      }`}
                    >
                      {checked && <CheckCircle2 className="h-3 w-3" />}
                    </div>
                    <span>{area}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <Input
            type="number"
            label={lang === 'bn' ? 'প্রারম্ভিক পরামর্শ ফি (BDT)' : 'Starting Consultation Fee (BDT)'}
            value={formData.startingFeeBdt}
            onChange={(e) => updateField('startingFeeBdt', Number(e.target.value))}
            min={100}
            step={50}
            required
          />

          <Textarea
            label={lang === 'bn' ? 'পেশাদার পরিচিতি (Bio / Summary)' : 'Professional Bio'}
            placeholder="Brief overview of your practice, notable legal experience..."
            value={formData.bio}
            onChange={(e) => updateField('bio', e.target.value)}
            rows={3}
          />
        </div>
      )}

      {/* Step 3: Review & Submit */}
      {step === 3 && (
        <div className="space-y-4 text-xs font-body">
          <div className="rounded border border-granite bg-bone/50 p-4 space-y-3">
            <div className="flex justify-between border-b border-granite-soft pb-2">
              <span className="text-granite uppercase font-mono">Advocate Name</span>
              <span className="font-bold text-ink">{formData.fullName}</span>
            </div>
            <div className="flex justify-between border-b border-granite-soft pb-2">
              <span className="text-granite uppercase font-mono">Email / Phone</span>
              <span className="text-ink">{formData.email} · {formData.phone}</span>
            </div>
            <div className="flex justify-between border-b border-granite-soft pb-2">
              <span className="text-granite uppercase font-mono">Bar Enrolment</span>
              <span className="font-mono font-bold text-clay-deep">{formData.barEnrolmentNo} ({formData.enrolmentYear})</span>
            </div>
            <div className="flex justify-between border-b border-granite-soft pb-2">
              <span className="text-granite uppercase font-mono">License Document</span>
              <span className="font-medium text-ink flex items-center gap-1.5">
                {formData.licenseDocumentUrl ? (
                  <>
                    <FileCheck className="h-3.5 w-3.5 text-clay-deep" />
                    <span className="truncate max-w-[160px]">{formData.licenseDocumentName}</span>
                  </>
                ) : (
                  <span className="text-brick">Not uploaded</span>
                )}
              </span>
            </div>
            <div className="flex justify-between border-b border-granite-soft pb-2">
              <span className="text-granite uppercase font-mono">Starting Fee</span>
              <span className="font-mono font-bold text-ink">৳{num(formData.startingFeeBdt)} BDT</span>
            </div>
            <div>
              <span className="text-granite uppercase font-mono block mb-1">Practice Areas</span>
              <div className="flex flex-wrap gap-1">
                {formData.practiceAreas.map((a) => (
                  <span key={a} className="rounded bg-clay-tint px-1.5 py-0.5 text-[10px] text-clay-deep">
                    {a}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="p-3 rounded bg-bone-deep text-ink-soft text-[11px] border border-granite-soft">
            <p>
              {lang === 'bn'
                ? 'আবেদন দাখিলের পর আমাদের অ্যাডমিন টিম আপনার আপলোডকৃত আইডি কার্ড পর্যালোচনা করে বাংলাদেশ বার কাউন্সিলের রেকর্ড অনুযায়ী তথ্য যাচাই করবে এবং তারপর অ্যাকাউন্ট অনুমোদন করবে।'
                : 'Upon submission, our admin team will review your uploaded ID document, audit your credentials against Bangladesh Bar Council records, and then approve your account.'}
            </p>
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between pt-4 border-t border-granite-soft">
        {step > 0 ? (
          <Button size="sm" variant="ghost" onClick={handleBack}>
            <ArrowLeft className="mr-1 h-3.5 w-3.5" />
            <span>{lang === 'bn' ? 'পূর্ববর্তী' : 'Back'}</span>
          </Button>
        ) : (
          <div />
        )}

        {step < 3 ? (
          <Button size="sm" variant="primary" onClick={handleNext}>
            <span>{lang === 'bn' ? 'পরবর্তী ধাপ' : 'Next Step'}</span>
            <ArrowRight className="ml-1 h-3.5 w-3.5" />
          </Button>
        ) : (
          <Button size="lg" variant="primary" onClick={handleSubmit} loading={loading}>
            <span>{lang === 'bn' ? 'আবেদন দাখিল করুন' : 'Submit for Review'}</span>
            <CheckCircle2 className="ml-1.5 h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
