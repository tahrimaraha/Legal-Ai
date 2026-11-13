import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Bell, CheckCheck, ArrowRight, ShieldCheck, Calendar, BookOpen } from 'lucide-react';
import { useLang } from '../../context/LanguageContext';
import { listNotifications, markNotificationsAsRead } from '../../lib/api';
import { Button } from '../../components/ui/Button';
import { Skeleton, EmptyState } from '../../components/ui/EmptyState';
import type { AppNotification } from '../../mocks/types';

export default function CitizenNotificationsPage() {
  const { lang } = useLang();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listNotifications().then((data) => {
      setNotifications(data);
      setLoading(false);
    });
  }, []);

  const handleMarkAllRead = async () => {
    await markNotificationsAsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const getIcon = (type: AppNotification['type']) => {
    switch (type) {
      case 'verification_completed':
        return <ShieldCheck className="h-4 w-4 text-clay-deep" />;
      case 'consultation_scheduled':
        return <Calendar className="h-4 w-4 text-clay-deep" />;
      case 'statute_updated':
        return <BookOpen className="h-4 w-4 text-clay-deep" />;
      default:
        return <Bell className="h-4 w-4 text-granite" />;
    }
  };

  return (
    <div className="space-y-6 font-body max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">
            {lang === 'bn' ? 'বিজ্ঞপ্তিসমূহ' : 'Notifications'}
          </h1>
          <p className="mt-1 text-xs text-granite">
            {lang === 'bn' ? 'আইনজীবী যাচাই, পরামর্শ ও করপাস আপডেট' : 'Verifications, consultation milestones & corpus updates'}
          </p>
        </div>

        <Button size="sm" variant="ghost" onClick={handleMarkAllRead}>
          <CheckCheck className="mr-1.5 h-3.5 w-3.5" />
          <span>{lang === 'bn' ? 'সব পঠিত হিসেবে চিহ্নিত করুন' : 'Mark all as read'}</span>
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <EmptyState
          title={lang === 'bn' ? 'কোনো নতুন বিজ্ঞপ্তি নেই' : 'No Notifications'}
          description={lang === 'bn' ? 'যাচাই বা পরামর্শের আপডেট এলে এখানে প্রদর্শিত হবে।' : 'You’re all caught up.'}
        />
      ) : (
        <div className="divide-y divide-granite border border-granite rounded bg-white shadow-sm overflow-hidden">
          {notifications.map((notif) => (
            <Link
              key={notif.id}
              to={notif.link}
              className={`flex items-start gap-4 p-4 transition ${
                notif.isRead ? 'bg-white hover:bg-bone/40' : 'bg-clay-tint/40 hover:bg-clay-tint/60'
              }`}
            >
              <div className="rounded bg-bone p-2 border border-granite-soft shrink-0 mt-0.5">
                {getIcon(notif.type)}
              </div>

              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-xs font-bold text-ink">
                    {lang === 'bn' ? notif.titleBn : notif.titleEn}
                  </h3>
                  <span className="font-mono text-[10px] text-granite">
                    {new Date(notif.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-xs text-ink-soft leading-relaxed">
                  {lang === 'bn' ? notif.bodyBn : notif.bodyEn}
                </p>
              </div>

              <ArrowRight className="h-4 w-4 text-granite shrink-0 self-center" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
