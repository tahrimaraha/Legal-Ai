import { useCallback, useEffect, useRef, useState } from 'react';
import { askQuestion, sendFeedback } from './api';
import type { Message } from '../mocks/types';

/**
 * Chat state with a simulated stream. `progress` is a 0–1 fraction of the
 * answer that has arrived, so either language can be sliced from the same value.
 * `conversationId` is set once the backend creates the conversation, so
 * follow-up questions land in the same thread.
 */
export function useChat(initial: Message[] = []) {
  const [messages, setMessages] = useState<Message[]>(initial);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [pending, setPending] = useState(false);
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const [progress, setProgress] = useState(1);
  const raf = useRef<number>();

  useEffect(() => () => cancelAnimationFrame(raf.current ?? 0), []);

  const stop = useCallback(() => {
    cancelAnimationFrame(raf.current ?? 0);
    setProgress(1);
    setStreamingId(null);
  }, []);

  const stream = useCallback((id: string, words: number) => {
    const perWord = 16;
    const duration = Math.min(words * perWord, 3200);
    const start = performance.now();
    setStreamingId(id);
    setProgress(0);
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      setProgress(p);
      if (p < 1) raf.current = requestAnimationFrame(tick);
      else setStreamingId(null);
    };
    raf.current = requestAnimationFrame(tick);
  }, []);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || pending) return;

      const userMessage: Message = {
        id: crypto.randomUUID(),
        role: 'user',
        bodyBn: trimmed,
        bodyEn: trimmed,
        citations: [],
        createdAt: new Date().toISOString(),
      };
      setMessages((m) => [...m, userMessage]);
      setPending(true);

      try {
        const res = await askQuestion(trimmed, conversationId);
        setConversationId(res.conversationId);
        setMessages((m) => [...m, res.message]);
        stream(res.message.id, res.message.bodyEn.split(/\s+/).length);
      } catch {
        setMessages((m) => [
          ...m,
          {
            id: crypto.randomUUID(),
            role: 'assistant',
            bodyBn: 'দুঃখিত, উত্তর আনা যায়নি। সংযোগ পরীক্ষা করে আবার চেষ্টা করুন।',
            bodyEn: 'Sorry, the answer could not be fetched. Check your connection and try again.',
            citations: [],
            createdAt: new Date().toISOString(),
          },
        ]);
      } finally {
        setPending(false);
      }
    },
    [pending, stream, conversationId],
  );

  const rate = useCallback(async (id: string, value: 'up' | 'down') => {
    setMessages((m) => m.map((msg) => (msg.id === id ? { ...msg, rating: msg.rating === value ? undefined : value } : msg)));
    await sendFeedback(id, value);
  }, []);

  const flag = useCallback(async (id: string) => {
    setMessages((m) => m.map((msg) => (msg.id === id ? { ...msg, flagged: true } : msg)));
    await sendFeedback(id, 'flag');
  }, []);

  const reset = useCallback((next: Message[] = [], nextConversationId?: string) => {
    setMessages(next);
    setConversationId(nextConversationId);
    setPending(false);
    setStreamingId(null);
    setProgress(1);
  }, []);

  return { messages, conversationId, pending, streamingId, progress, send, rate, flag, reset, stop };
}
