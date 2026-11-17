import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError, askQuestion, sendFeedback } from './api';
import type { Message } from '../mocks/types';

/**
 * Chat state with a simulated stream. `progress` is a 0–1 fraction of the
 * answer that has arrived, so either language can be sliced from the same value.
 */
export function useChat(initial: Message[] = []) {
  const [messages, setMessages] = useState<Message[]>(initial);
  // The saved conversation these messages belong to; set after the first answer is saved.
  const [conversationId, setConversationId] = useState<string | undefined>(undefined);
  const [pending, setPending] = useState(false);
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const [progress, setProgress] = useState(1);
  // Set when the last question couldn't be answered; cleared on the next send / retry / reset.
  const [error, setError] = useState<{ questionId: string; text: string; en: string; bn: string } | null>(null);
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
      setError(null);

      let answer: Message;
      try {
        const res = await askQuestion(trimmed, conversationId, messages);
        answer = res.message;
        setConversationId(res.conversationId);
      } catch (err) {
        // Show the reason under the unanswered question, with a retry (see `retry`).
        setError({
          questionId: userMessage.id,
          text: trimmed,
          en: err instanceof ApiError ? err.message : 'Could not get an answer. Please check your connection and try again.',
          bn: err instanceof ApiError ? err.messageBn : 'উত্তর পাওয়া যায়নি। সংযোগ দেখে আবার চেষ্টা করুন।',
        });
        setPending(false);
        return;
      }
      setPending(false);
      setMessages((m) => [...m, answer]);
      stream(answer.id, answer.bodyEn.split(/\s+/).length);
    },
    [pending, stream, messages, conversationId],
  );
  const sendRef = useRef(send);
  sendRef.current = send;

  const rate = useCallback(async (id: string, value: 'up' | 'down') => {
    setMessages((m) => m.map((msg) => (msg.id === id ? { ...msg, rating: msg.rating === value ? undefined : value } : msg)));
    await sendFeedback(id, value);
  }, []);

  const flag = useCallback(async (id: string) => {
    setMessages((m) => m.map((msg) => (msg.id === id ? { ...msg, flagged: true } : msg)));
    await sendFeedback(id, 'flag');
  }, []);

  /** Ask the failed question again (drops the unanswered copy first). */
  const retry = useCallback(() => {
    if (!error || pending) return;
    const { questionId, text } = error;
    setMessages((m) => m.filter((msg) => msg.id !== questionId));
    setError(null);
    // send() reads `messages` from its closure; let the removal land first.
    setTimeout(() => void sendRef.current(text), 0);
  }, [error, pending]);

  const reset = useCallback((next: Message[] = [], nextConversationId?: string) => {
    setError(null);
    setMessages(next);
    setConversationId(nextConversationId);
    setPending(false);
    setStreamingId(null);
    setProgress(1);
  }, []);

  return { messages, conversationId, pending, streamingId, progress, send, rate, flag, reset, stop, error, retry };
}
