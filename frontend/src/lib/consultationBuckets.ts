import { isPastSlot, slotInstant } from './slots';
import type { ConsultationRequest } from '../mocks/types';

/** Shared grouping for the lawyer dashboard cards and the consultations page tabs. */
export type ConsultationBucket = 'all' | 'requests' | 'upcoming' | 'reschedule' | 'completed';

export function bucketOf(c: ConsultationRequest): Exclude<ConsultationBucket, 'all'> | 'other' {
  if (c.status === 'requested') return 'requests';
  if (c.status === 'completed') return 'completed';
  if (c.status === 'scheduled' || c.status === 'accepted') {
    // Accepted without a time, or scheduled for a time that has passed: the lawyer must set a new time.
    if (!c.scheduledSlot || isPastSlot(c.scheduledSlot)) return 'reschedule';
    return 'upcoming';
  }
  return 'other';
}

export function inBucket(list: ConsultationRequest[], bucket: ConsultationBucket): ConsultationRequest[] {
  const items = bucket === 'all' ? list : list.filter((c) => bucketOf(c) === bucket);
  if (bucket === 'upcoming') return [...items].sort((a, b) => slotInstant(a.scheduledSlot!) - slotInstant(b.scheduledSlot!));
  return items;
}
