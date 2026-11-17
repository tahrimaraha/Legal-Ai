import { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { listNotifications, listThreads, markNotificationRead, markNotificationsAsRead } from './api';
import type { AppNotification, Thread } from '../mocks/types';

const POLL_MS = 15000;

/**
 * Message threads + notifications for the top bar and sidebar badges. Refreshes on every page change,
 * when the tab regains focus, and every 15 s while the tab is visible.
 */
export function useInbox(enabled = true) {
  const location = useLocation();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    // Background polling must never surface error toasts.
    const [t, n] = await Promise.all([listThreads().catch(() => null), listNotifications().catch(() => null)]);
    if (t) {
      t.sort((a, b) => (b.lastMessageAt || '').localeCompare(a.lastMessageAt || ''));
      setThreads(t);
    }
    if (n) {
      n.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      setNotifications(n);
    }
  }, [enabled]);

  useEffect(() => {
    void refresh();
  }, [refresh, location.pathname]);

  useEffect(() => {
    if (!enabled) return;
    const tick = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    const id = setInterval(tick, POLL_MS);
    window.addEventListener('focus', tick);
    window.addEventListener('inbox:refresh', tick);
    document.addEventListener('visibilitychange', tick);
    return () => {
      clearInterval(id);
      window.removeEventListener('focus', tick);
      window.removeEventListener('inbox:refresh', tick);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [enabled, refresh]);

  const markRead = useCallback(async (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    await markNotificationRead(id).catch(() => {});
  }, []);

  const markAllRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    await markNotificationsAsRead().catch(() => {});
  }, []);

  return {
    threads,
    notifications,
    unreadThreads: threads.filter((t) => t.unreadCount > 0).length,
    unreadNotifications: notifications.filter((n) => !n.isRead).length,
    refresh,
    markRead,
    markAllRead,
  };
}

export type Inbox = ReturnType<typeof useInbox>;
