import { useState } from 'react';
import { User, Globe, Bell, Shield, AlertTriangle, Download, Trash2, CheckCircle2 } from 'lucide-react';
import { useLang } from '../../context/LanguageContext';
import { useRole } from '../../context/RoleContext';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { ChangePasswordForm } from '../../components/auth/ChangePasswordForm';

export default function CitizenSettingsPage() {
  const { lang, setLang } = useLang();
  const { user } = useRole();

  const [tab, setTab] = useState<'profile' | 'language' | 'notifications' | 'security' | 'danger'>('profile');
  const [name, setName] = useState(user?.name || 'Mayesha');
  const [phone, setPhone] = useState(user?.phone || '+880 1711-223344');
  const [district, setDistrict] = useState(user?.district || 'Dhaka');
  const [savedToast, setSavedToast] = useState(false);

  // Notification toggles
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [verifAlerts, setVerifAlerts] = useState(true);

  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 2000);
  };

  const tabs = [
    { id: 'profile', labelBn: 'প্রোফাইল', labelEn: 'Profile', icon: User },
    { id: 'language', labelBn: 'ভাষা ও মাধ্যম', labelEn: 'Language & Locale', icon: Globe },
    { id: 'notifications', labelBn: 'বিজ্ঞপ্তি পছন্দ', labelEn: 'Notifications', icon: Bell },
    { id: 'security', labelBn: 'নিরাপত্তা ও সেশন', labelEn: 'Security', icon: Shield },
    { id: 'danger', labelBn: 'বিপজ্জনক অঞ্চল', labelEn: 'Danger Zone', icon: AlertTriangle },
  ] as const;

  return (
    <div className="space-y-6 font-body max-w-4xl">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink">
          {lang === 'bn' ? 'অ্যাকাউন্ট সেটিংস' : 'Account Settings'}
        </h1>
        <p className="mt-1 text-xs text-granite">
          {lang === 'bn' ? 'ব্যক্তিগত তথ্য, ভাষা ও নিরাপত্তা কনফিগারেশন' : 'Manage your citizen profile preferences and data controls'}
        </p>
      </div>

      {savedToast && (
        <div className="p-3 rounded bg-clay-tint border border-clay text-xs text-clay-deep font-semibold flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" />
          <span>{lang === 'bn' ? 'সেটিংস সফলভাবে সংরক্ষিত হয়েছে!' : 'Settings updated successfully!'}</span>
        </div>
      )}

      {/* Tabs Row */}
      <div className="flex items-center gap-1 overflow-x-auto border-b border-granite pb-2">
        {tabs.map((t) => {
          const Icon = t.icon;
          const isActive = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-3 py-2 text-xs font-mono uppercase tracking-wider rounded transition shrink-0 ${
                isActive
                  ? t.id === 'danger'
                    ? 'bg-brick text-white font-bold'
                    : 'bg-clay text-white font-bold'
                  : 'text-ink-soft hover:bg-bone-deep'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{lang === 'bn' ? t.labelBn : t.labelEn}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: Profile */}
      {tab === 'profile' && (
        <form onSubmit={handleSave} className="rounded border border-granite bg-white p-6 shadow-sm space-y-4 max-w-xl">
          <Input
            type="text"
            label={lang === 'bn' ? 'পূর্ণ নাম' : 'Full Name'}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <Input
            type="email"
            label={lang === 'bn' ? 'ইমেইল ঠিকানা' : 'Email Address'}
            value={user?.email || 'citizen@example.com'}
            disabled
            hint="Email cannot be changed directly."
          />

          <Input
            type="tel"
            label={lang === 'bn' ? 'মোবাইল নম্বর' : 'Phone Number'}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />

          <div className="space-y-1">
            <label className="block text-xs font-semibold uppercase text-ink-soft">
              {lang === 'bn' ? 'জেলা' : 'District'}
            </label>
            <select
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              className="w-full rounded border border-granite bg-white px-3 py-2 text-sm text-ink focus:border-clay focus:outline-none"
            >
              {['Dhaka', 'Chattogram', 'Sylhet', 'Rajshahi', 'Khulna', 'Barishal'].map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          <div className="pt-3">
            <Button size="sm" variant="primary" type="submit">
              {lang === 'bn' ? 'পরিবর্তন সংরক্ষণ করুন' : 'Save Changes'}
            </Button>
          </div>
        </form>
      )}

      {/* Tab 2: Language */}
      {tab === 'language' && (
        <div className="rounded border border-granite bg-white p-6 shadow-sm space-y-6 max-w-xl">
          <div>
            <h3 className="font-mono text-label uppercase text-clay-deep font-semibold">
              {lang === 'bn' ? 'ইন্টারফেসের প্রধান ভাষা' : 'Primary Interface Language'}
            </h3>
            <p className="text-xs text-granite mt-1">
              {lang === 'bn' ? 'সম্পূর্ণ অ্যাপ্লিকেশনের ফন্ট ও লেআউট এই ভাষা অনুযায়ী পরিবর্তিত হবে।' : 'Controls the global UI language and Bengali font rendering engine.'}
            </p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setLang('bn')}
                className={`p-3 rounded border text-left text-xs transition ${
                  lang === 'bn' ? 'border-clay bg-clay-tint text-clay-deep font-bold' : 'border-granite bg-white text-ink-soft'
                }`}
              >
                বাংলা (Bengali)
              </button>
              <button
                type="button"
                onClick={() => setLang('en')}
                className={`p-3 rounded border text-left text-xs transition ${
                  lang === 'en' ? 'border-clay bg-clay-tint text-clay-deep font-bold' : 'border-granite bg-white text-ink-soft'
                }`}
              >
                English (Latin)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Notifications */}
      {tab === 'notifications' && (
        <div className="rounded border border-granite bg-white p-6 shadow-sm space-y-4 max-w-xl text-xs">
          <h3 className="font-mono text-label uppercase text-clay-deep font-semibold">
            {lang === 'bn' ? 'বিজ্ঞপ্তি চ্যানেলসমূহ' : 'Notification Channels'}
          </h3>

          <div className="space-y-3 pt-2">
            <label className="flex items-center justify-between p-3 rounded border border-granite-soft bg-bone cursor-pointer">
              <div>
                <span className="font-bold text-ink">Email Notifications</span>
                <p className="text-[11px] text-granite">Receive emails when an advocate reviews your answer or accepts consultation.</p>
              </div>
              <input
                type="checkbox"
                checked={emailNotifs}
                onChange={(e) => setEmailNotifs(e.target.checked)}
                className="h-4 w-4 rounded border-granite text-clay"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded border border-granite-soft bg-bone cursor-pointer">
              <div>
                <span className="font-bold text-ink">Verification Alerts</span>
                <p className="text-[11px] text-granite">Instant in-app alerts when lawyer verification status updates.</p>
              </div>
              <input
                type="checkbox"
                checked={verifAlerts}
                onChange={(e) => setVerifAlerts(e.target.checked)}
                className="h-4 w-4 rounded border-granite text-clay"
              />
            </label>
          </div>
        </div>
      )}

      {/* Tab 4: Security */}
      {tab === 'security' && (
        <div className="rounded border border-granite bg-white p-6 shadow-sm space-y-4 max-w-xl">
          <h3 className="font-mono text-label uppercase text-clay-deep font-semibold">
            {lang === 'bn' ? 'পাসওয়ার্ড পরিবর্তন' : 'Change Password'}
          </h3>

          <ChangePasswordForm />
        </div>
      )}

      {/* Tab 5: Danger Zone */}
      {tab === 'danger' && (
        <div className="rounded border border-brick/40 bg-brick/5 p-6 shadow-sm space-y-6 max-w-xl">
          <div>
            <h3 className="font-display text-base font-bold text-brick flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              <span>{lang === 'bn' ? 'বিপজ্জনক অঞ্চল (Danger Zone)' : 'Data Sovereignty & Danger Zone'}</span>
            </h3>
            <p className="text-xs text-ink-soft mt-1">
              {lang === 'bn'
                ? 'আপনার তথ্যাদি রপ্তানি করুন অথবা অ্যাকাউন্ট ও সকল কথোপকথন ইতিহাস স্থায়ীভাবে মুছে ফেলুন।'
                : 'Export all your saved records or permanently delete your account.'}
            </p>
          </div>

          <div className="p-4 rounded bg-white border border-granite-soft flex items-center justify-between text-xs">
            <div>
              <span className="font-bold text-ink">Export My Data (GDPR / Privacy)</span>
              <p className="text-[11px] text-granite">Download JSON archive of all chats, drafts, and verifications.</p>
            </div>
            <Button size="sm" variant="secondary" onClick={() => alert('Data archive export generated.')}>
              <Download className="mr-1 h-3.5 w-3.5" />
              <span>Export</span>
            </Button>
          </div>

          <div className="p-4 rounded bg-white border border-brick/30 flex items-center justify-between text-xs">
            <div>
              <span className="font-bold text-brick">Delete Account & Purge Data</span>
              <p className="text-[11px] text-granite">This action is irreversible and deletes all conversations immediately.</p>
            </div>
            <Button size="sm" variant="ghost" onClick={() => setDeleteModalOpen(true)} className="text-brick hover:bg-brick/10">
              <Trash2 className="mr-1 h-3.5 w-3.5" />
              <span>Delete</span>
            </Button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Confirm Account Deletion"
      >
        <div className="space-y-4 text-xs font-body">
          <p className="text-ink-soft">
            To confirm permanent deletion, please type <strong className="font-mono text-brick">DELETE</strong> below:
          </p>
          <Input
            type="text"
            placeholder="Type DELETE"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button size="sm" variant="ghost" onClick={() => setDeleteModalOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              variant="primary"
              disabled={confirmText !== 'DELETE'}
              className="bg-brick hover:bg-brick/90"
              onClick={() => {
                alert('Account deleted.');
                window.location.assign('/');
              }}
            >
              Permanently Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
