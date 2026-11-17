import { useEffect, type Dispatch, type SetStateAction } from 'react';
import { getThreadById } from './api';
import type { Thread } from '../mocks/types';

const POLL_MS = 5000;

/**
 * Keeps the open conversation live: fetching it marks the other side's messages as read on the
 * server (clearing badges), and polling picks up new messages while the chat is on screen.
 */
export function useThreadSync(
  threadId: string | undefined,
  setActiveThread: Dispatch<SetStateAction<Thread | null>>,
  setThreads: Dispatch<SetStateAction<Thread[]>>,
) {
  useEffect(() => {
    if (!threadId) return;
    let cancelled = false;
    const sync = async () => {
      const fresh = await getThreadById(threadId).catch(() => undefined);
      if (!fresh || cancelled) return;
      setActiveThread((cur) => {
        if (!cur || cur.id !== fresh.id) return cur;
        const same =
          cur.messages.length === fresh.messages.length &&
          cur.isLocked === fresh.isLocked &&
          cur.activeMeetingCode === fresh.activeMeetingCode;
        return same ? cur : fresh;
      });
      setThreads((list) => list.map((t) => (t.id === fresh.id ? { ...fresh, unreadCount: 0 } : t)));
    };
    void sync();
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') void sync();
    }, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [threadId, setActiveThread, setThreads]);
}
