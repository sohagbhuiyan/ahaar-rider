import type { BadgeVariant } from '@/components/ui';
import type { ApprovalStatus, ItemStatus } from '@/lib/api/types';

/**
 * Where a rider belongs for their onboarding status. Used by the gateway,
 * sign-in and the status screen so they can never disagree (and loop).
 */
export function routeForStatus(status: ApprovalStatus | undefined | null) {
  if (status === 'approved') return '/(tabs)' as const;
  if (status === 'approved_for_documents') return '/document-upload' as const;
  return '/application-status' as const;
}

export const ITEM_STATUS_LABEL: Record<ItemStatus, string> = {
  not_submitted: 'Not submitted',
  submitted: 'Submitted',
  under_review: 'Under review',
  approved: 'Approved',
  rejected: 'Rejected',
  expired: 'Expired',
};

export const ITEM_STATUS_VARIANT: Record<ItemStatus, BadgeVariant> = {
  not_submitted: 'muted',
  submitted: 'brand',
  under_review: 'info',
  approved: 'success',
  rejected: 'danger',
  expired: 'warning',
};

/** An item the rider still has to (re)do. */
export function needsAction(status: ItemStatus): boolean {
  return status === 'not_submitted' || status === 'rejected' || status === 'expired';
}

/** YYYY-MM-DD that is a real calendar date strictly after today. */
export function validateExpiry(value: string): string | null {
  const v = value.trim();
  if (!v) return 'Expiry date is required';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return 'Use the format YYYY-MM-DD';
  const [y, m, d] = v.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) {
    return 'Enter a real date';
  }
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  if (date <= today) return 'This document has expired — it must be valid after today';
  return null;
}

export function formatDateTime(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}
