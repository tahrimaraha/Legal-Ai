import { useState, useEffect } from 'react';
import { Award, MapPin, CheckCircle2, Save, Sparkles, Building, UserCheck } from 'lucide-react';
import { useLang } from '../../context/LanguageContext';
import { useRole } from '../../context/RoleContext';
import { getLawyerById, updateLawyerProfile } from '../../lib/api';
import { StatusBadge, VerifiedBadge } from '../../components/ui/StatusBadge';
import { Rating } from '../../components/ui/Rating';
import { Input, Textarea } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/EmptyState';
import type { LawyerProfile } from '../../mocks/types';
import { PaymentAccountsForm } from '../../components/ui/PaymentAccountsForm';
import { getMyPaymentAccounts, saveMyPaymentAccounts } from '../../lib/api';

export default function LawyerProfileEditor() {
  const { lang, num } = useLang();
  const { user } = useRole();

  const [profile, setProfile] = useState<LawyerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedToast, setSavedToast] = useState(false);

  useEffect(() => {
    if (!user) return;
    getLawyerById(user.id).then((res) => {
      if (res) setProfile(res);
      setLoading(false);
    });
  }, [user]);

  if (loading || !profile) {
    return <div className="space-y-6"><Skeleton className="h-10 w-48" /><Skeleton className="h-96 w-full" /></div>;
  }

  const updateField = (field: keyof LawyerProfile, value: any) => {
    setProfile((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateLawyerProfile(profile);
      setSavedToast(true);
      setTimeout(() => setSavedToast(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 font-body">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink">
          {lang === 'bn' ? 'পাবলিক প্রোফাইল এডিটর' : 'Public Profile Editor & Live Preview'}
        </h1>
        <p className="mt-1 text-xs text-granite">
          {lang === 'bn'
            ? 'বামপাশে তথ্য সম্পাদনা করুন; ডানপাশে নাগরিকরা ঠিক যেভাবে প্রোফাইল দেখবে তার লাইভ প্রিভিউ প্রদর্শিত হচ্ছে'
            : 'Edit credentials on the left while previewing your public advocate card in real time on the right'}
        </p>
      </div>

      {savedToast && (
        <div className="p-3 rounded bg-clay-tint border border-clay text-xs text-clay-deep font-semibold flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" />
          <span>Profile updated successfully!</span>
        </div>
      )}

      {/* Two Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Form (span-7) */}
        <form onSubmit={handleSave} className="lg:col-span-7 rounded border border-granite bg-white p-6 shadow-sm space-y-4">
          <Input
            type="text"
            label="Full Advocate Name"
            value={profile.fullName}
            onChange={(e) => updateField('fullName', e.target.value)}
            required
          />

          <Input
            type="text"
            label="Professional Title & Court Standing"
            value={profile.title}
            onChange={(e) => updateField('title', e.target.value)}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              type="text"
              label="Bar Enrolment No (Read-only)"
              value={profile.barEnrolmentNo}
              disabled
              hint="Verified against Bar Council roll."
            />
            <Input
              type="number"
              label="Enrolment Year (Read-only)"
              value={profile.enrolmentYear}
              disabled
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-xs font-semibold uppercase text-ink-soft">District Bar</label>
              <select
                value={profile.district}
                onChange={(e) => updateField('district', e.target.value)}
                className="w-full rounded border border-granite bg-white px-3 py-2 text-sm text-ink focus:border-clay focus:outline-none"
              >
                {['Dhaka', 'Chattogram', 'Sylhet', 'Rajshahi', 'Khulna', 'Barishal'].map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <Input
              type="number"
              label="Starting Consultation Fee (BDT)"
              value={profile.startingFeeBdt}
              onChange={(e) => updateField('startingFeeBdt', Number(e.target.value))}
              min={200}
              step={50}
              required
            />
          </div>

          <Input
            type="text"
            label="Response Time Commitment"
            value={profile.responseTimeCommitment}
            onChange={(e) => updateField('responseTimeCommitment', e.target.value)}
            placeholder="e.g. Usually responds in 2 hours"
          />

          <Textarea
            label="Professional Bio / About"
            value={profile.bioEn}
            onChange={(e) => updateField('bioEn', e.target.value)}
            rows={4}
            required
          />

          <div className="pt-3 border-t border-granite-soft flex justify-end">
            <Button size="lg" variant="primary" type="submit" loading={saving}>
              <Save className="mr-1.5 h-4 w-4" />
              <span>Save & Publish Profile</span>
            </Button>
          </div>
        </form>

        {/* Right Live Preview Card (span-5) */}
        <div className="lg:col-span-5 sticky top-20 space-y-3">
          <span className="font-mono text-label uppercase text-clay-deep font-semibold block">
            Live Public Card Preview
          </span>

          <div className="rounded border-2 border-clay bg-white p-6 shadow-composer space-y-4">
            <div className="flex items-start gap-4">
              <div className="h-16 w-16 rounded bg-clay-tint border border-clay flex items-center justify-center shrink-0">
                <UserCheck className="h-8 w-8 text-clay-deep" />
              </div>
              <div className="min-w-0 flex-1">
                <StatusBadge status={profile.verificationStatus} size="sm" />
                <h3 className="font-display text-base font-bold text-ink mt-1 truncate">
                  {profile.fullName}
                </h3>
                <p className="text-xs text-granite truncate">{profile.title}</p>
                <div className="flex items-center gap-2 pt-1 text-[11px] text-ink-soft">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-clay-deep" />
                    {profile.district}
                  </span>
                  <span>•</span>
                  <span>{profile.barEnrolmentNo}</span>
                </div>
              </div>
            </div>

            <p className="text-xs text-ink-soft line-clamp-3 leading-relaxed border-t border-granite-soft pt-3">
              {profile.bioEn}
            </p>

            <div className="p-3 bg-bone rounded border border-granite-soft flex items-center justify-between text-xs font-mono">
              <span className="text-granite">Starting Fee</span>
              <span className="font-bold text-ink">৳{num(profile.startingFeeBdt)} BDT</span>
            </div>

            <div className="text-[11px] text-clay-deep font-mono text-center">
              {profile.responseTimeCommitment}
            </div>
          </div>
        </div>
      </div>
      <PaymentAccountsForm
        title={lang === 'bn' ? 'পরামর্শ ফি গ্রহণের একাউন্ট' : 'Where clients pay your consultation fee'}
        description={
          lang === 'bn'
            ? 'নাগরিক পরামর্শ বুক করার সময় এই নম্বর/একাউন্ট দেখবেন এবং এখানে টাকা পাঠিয়ে লেনদেন আইডি দেবেন। আপনি পরামর্শের পাতায় পেমেন্ট নিশ্চিত করবেন।'
            : 'Clients see these when booking you, send the fee here and enter the transaction ID. You confirm each payment on the consultation page.'
        }
        load={getMyPaymentAccounts}
        save={saveMyPaymentAccounts}
      />
    </div>
  );
}
