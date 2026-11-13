import { useState, useEffect } from 'react';
import { Bell, CheckCircle2, Calendar, ShieldCheck, FileText, AlertTriangle, Mail } from 'lucide-react';
import { useLang } from '../../context/LanguageContext';
import { listNotifications, markNotificationsAsRead } from '../../lib/api';
import { Button } from '../../components/ui/Button';
import { Skeleton, EmptyState } from '../../components/ui/EmptyState';
import type { AppNotification } from '../../mocks/types';

export default function LawyerNotificationsPage() {
  const { lang } = useLang();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listNotifications('lawyer').then((data) => {
      setNotifications(data);
      setLoading(false);
    });
  }, []);

  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, isRead: true } : n)
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(n => ({ ...n, isRead: true }))
    );
    void markNotificationsAsRead();
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'verification_requested':
        return <ShieldCheck className="h-5 w-5 text-clay-deep" />;
      case 'consultation_scheduled':
        return <Calendar className="h-5 w-5 text-blue-600" />;
      case 'new_message':
        return <Mail className="h-5 w-5 text-green-600" />;
      case 'document':
        return <FileText className="h-5 w-5 text-purple-600" />;
      case 'system':
        return <AlertTriangle className="h-5 w-5 text-orange-600" />;
      default:
        return <Bell className="h-5 w-5 text-granite" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'verification_requested':
        return 'bg-clay-tint border-clay/30';
      case 'consultation_scheduled':
        return 'bg-blue-50 border-blue-200';
      case 'new_message':
        return 'bg-green-50 border-green-200';
      case 'document':
        return 'bg-purple-50 border-purple-200';
      case 'system':
        return 'bg-orange-50 border-orange-200';
      default:
        return 'bg-granite-soft border-granite';
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-body">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">
            {lang === 'bn' ? 'বিজ্ঞপ্তি' : 'Notifications'}
          </h1>
          <p className="mt-1 text-xs text-granite">
            {lang === 'bn' 
              ? 'যাচাই, পরামর্শ এবং অন্যান্য গুরুত্বপূর্ণ আপডেট'
              : 'Verification requests, consultations, and other important updates'}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button size="sm" variant="secondary" onClick={markAllAsRead}>
            <CheckCircle2 className="mr-1.5 h-4 w-4" />
            {lang === 'bn' ? 'সব পড়া হয়েছে চিহ্নিত করুন' : 'Mark all as read'}
          </Button>
        )}
      </div>

      {/* Notifications List */}
      {notifications.length === 0 ? (
        <EmptyState
          title={lang === 'bn' ? 'কোনো বিজ্ঞপ্তি নেই' : 'No Notifications'}
          description={lang === 'bn' 
            ? 'আপনার কোনো নতুন বিজ্ঞপ্তি নেই। নতুন যাচাই বা পরামর্শের অনুরোধ এলে এখানে দেখা যাবে।'
            : 'You have no notifications yet. New verification requests and consultation bookings will appear here.'}
        />
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`relative p-5 rounded border transition hover:shadow-sm ${
                notification.isRead 
                  ? 'bg-white border-granite-soft' 
                  : `${getNotificationColor(notification.type)} font-medium`
              }`}
            >
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div className="shrink-0 mt-0.5">
                  {getNotificationIcon(notification.type)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <h3 className={`text-sm font-semibold leading-tight ${
                        notification.isRead ? 'text-ink' : 'text-ink'
                      }`}>
                        {lang === 'bn' ? notification.titleBn : notification.titleEn}
                      </h3>
                      <p className={`mt-1 text-xs leading-relaxed ${
                        notification.isRead ? 'text-ink-soft' : 'text-ink-soft'
                      }`}>
                        {lang === 'bn' ? notification.bodyBn : notification.bodyEn}
                      </p>
                    </div>
                    
                    <div className="text-right shrink-0">
                      <span className="text-[10px] text-granite font-mono">
                        {new Date(notification.createdAt).toLocaleDateString()}
                      </span>
                      {!notification.isRead && (
                        <button
                          onClick={() => markAsRead(notification.id)}
                          className="block mt-1 text-[10px] text-clay-deep hover:text-clay font-medium"
                        >
                          {lang === 'bn' ? 'পড়া হয়েছে' : 'Mark as read'}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Action buttons for specific notification types */}
                  {notification.type === 'verification_requested' && (
                    <div className="mt-3 pt-3 border-t border-granite-soft">
                      <Button 
                        size="sm" 
                        variant="primary" 
                        onClick={() => window.location.href = notification.link}
                      >
                        {lang === 'bn' ? 'যাচাই করুন' : 'Review Verification'}
                      </Button>
                    </div>
                  )}

                  {notification.type === 'consultation_scheduled' && (
                    <div className="mt-3 pt-3 border-t border-granite-soft">
                      <Button 
                        size="sm" 
                        variant="primary" 
                        onClick={() => window.location.href = notification.link}
                      >
                        {lang === 'bn' ? 'পরামর্শ দেখুন' : 'View Consultation'}
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* Unread indicator */}
              {!notification.isRead && (
                <div className="absolute top-4 right-4 h-2 w-2 rounded-full bg-clay-deep"></div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}