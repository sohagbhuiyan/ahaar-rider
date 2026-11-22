import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useIsFocused } from 'expo-router';

import { useAuthStore } from '../../auth/authStore';
import { errorReason } from '../client';
import { queryKeys } from '../queryKeys';
import { riderDeliveryService } from '../services/riderDeliveryService';
import type { ActiveJob, Job, Offer } from '../types';

const ACTIVE_JOB_POLL_MS = 20_000;
const OFFERS_POLL_MS = 10_000;
const FINAL_STATUSES: string[] = ['delivered', 'failed', 'cancelled'];

function useSignedIn(): boolean {
  const token = useAuthStore((s) => s.token);
  const approved = useAuthStore((s) => s.profile?.approval_status === 'approved');
  return Boolean(token) && approved;
}

type QC = ReturnType<typeof useQueryClient>;

// ===========================================================================
// SHARED
// ===========================================================================

/** What the rider holds right now. Restored on app start; pushes invalidate it. */
export function useActiveJob(options: { poll?: boolean } = {}) {
  const signedIn = useSignedIn();
  return useQuery({
    queryKey: queryKeys.activeJob,
    queryFn: riderDeliveryService.getActiveJob,
    enabled: signedIn,
    staleTime: 1000 * 10,
    refetchInterval: options.poll ? ACTIVE_JOB_POLL_MS : false,
  });
}

export function useRiderStats(enabled = true) {
  const signedIn = useSignedIn();
  return useQuery({
    queryKey: queryKeys.rider.stats(),
    queryFn: riderDeliveryService.getStats,
    enabled: signedIn && enabled,
    staleTime: 1000 * 30,
  });
}

/** Everything a changed bike job touches. */
function invalidateWork(qc: QC) {
  qc.invalidateQueries({ queryKey: queryKeys.activeJob });
  qc.invalidateQueries({ queryKey: queryKeys.offers.all });
  qc.invalidateQueries({ queryKey: queryKeys.rider.stats() });
  qc.invalidateQueries({ queryKey: queryKeys.rider.me() });
}

// ===========================================================================
// CAR TRACK: SUBSCRIPTION ROUTES
// ===========================================================================

export function useCarRunsToday(options?: { isOnline?: boolean; enabled?: boolean }) {
  const isOnline = Boolean(options?.isOnline);
  const enabled = options?.enabled ?? true;

  return useQuery({
    queryKey: queryKeys.deliveries.runsToday(),
    queryFn: riderDeliveryService.getRunsToday,
    enabled,
    staleTime: 1000 * 15,
    // `run.assigned` pushes refetch immediately; this catches missed pushes.
    refetchInterval: isOnline ? 30_000 : false,
    refetchIntervalInBackground: false,
  });
}

export function useDeliveryDetail(id: number | string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.deliveries.detail(id),
    queryFn: () => riderDeliveryService.getDelivery(id),
    enabled: enabled && !!id,
    staleTime: 1000 * 10,
  });
}

function invalidateRun(qc: QC, deliveryId?: number | string) {
  qc.invalidateQueries({ queryKey: queryKeys.deliveries.runsToday() });
  qc.invalidateQueries({ queryKey: queryKeys.activeJob });
  qc.invalidateQueries({ queryKey: queryKeys.rider.stats() });
  if (deliveryId !== undefined) {
    qc.invalidateQueries({ queryKey: queryKeys.deliveries.detail(deliveryId) });
  }
}

export function useAcceptHandover() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ runId, scannedCodes }: { runId: number; scannedCodes: string[] }) =>
      riderDeliveryService.acceptHandover(runId, scannedCodes),
    onSuccess: () => invalidateRun(qc),
  });
}

export function useVerifyPackage(deliveryId: number | string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (scannedCode: string) => riderDeliveryService.verifyPackage(deliveryId, scannedCode),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.deliveries.detail(deliveryId) });
    },
  });
}

export function useCompleteDelivery(deliveryId: number | string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (formData: FormData) => riderDeliveryService.completeDelivery(deliveryId, formData),
    onSuccess: () => invalidateRun(qc, deliveryId),
  });
}

export function useReportDeliveryIssue(deliveryId: number | string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (formData: FormData) => riderDeliveryService.reportDeliveryIssue(deliveryId, formData),
    onSuccess: () => invalidateRun(qc, deliveryId),
  });
}

// ===========================================================================
// BIKE TRACK: INSTANT ORDERS
// ===========================================================================

/** Open offers. Polls ~10 s only while online and the calling screen is focused. */
export function useOffers(options?: { isOnline?: boolean; enabled?: boolean }) {
  const isFocused = useIsFocused();
  const signedIn = useSignedIn();
  const isOnline = Boolean(options?.isOnline);

  return useQuery({
    queryKey: queryKeys.offers.list(),
    queryFn: riderDeliveryService.getOffers,
    enabled: signedIn && (options?.enabled ?? true),
    staleTime: 1000 * 5,
    refetchInterval: isOnline && isFocused ? OFFERS_POLL_MS : false,
    refetchIntervalInBackground: false,
  });
}

/** GET /rider/orders/{id}: an Offer, or a Job when this rider holds it. */
export function useOrder(id: number | string | null | undefined, options: { poll?: boolean } = {}) {
  return useQuery({
    queryKey: queryKeys.orders.detail(id ?? ''),
    queryFn: () => riderDeliveryService.getOrder(id as number | string),
    enabled: Boolean(id),
    staleTime: 1000 * 5,
    // Stop once the order is final (delivered, failed, cancelled).
    refetchInterval: (query) =>
      options.poll && !FINAL_STATUSES.includes(query.state.data?.delivery_status ?? '') ? 15_000 : false,
    // 409 already_taken / 403 not_yours won't change on retry.
    retry: (count, error) => !errorReason(error) && count < 2,
  });
}

/** Drop an offer that is gone (taken, declined, cancelled) from the cached list. */
export function removeOfferFromCache(qc: QC, orderId: number) {
  qc.setQueryData<Offer[]>(queryKeys.offers.list(), (list) =>
    list ? list.filter((o) => o.order_id !== orderId) : list,
  );
}

/** Put a fresh Job wherever it's shown. */
function storeJob(qc: QC, job: Job) {
  qc.setQueryData(queryKeys.orders.detail(job.order_id), job);
  qc.setQueryData<ActiveJob>(queryKeys.activeJob, job.next_actions.length > 0 ? job : null);
}

export function useAcceptOffer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (orderId: number) => riderDeliveryService.accept(orderId),
    onSuccess: (job, orderId) => {
      removeOfferFromCache(qc, orderId);
      storeJob(qc, job);
      invalidateWork(qc);
    },
    onError: (error, orderId) => {
      const reason = errorReason(error);
      if (reason === 'already_taken' || reason === 'not_dispatchable') {
        removeOfferFromCache(qc, orderId);
        qc.invalidateQueries({ queryKey: queryKeys.offers.all });
      }
    },
  });
}

export function useDeclineOffer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, reason }: { orderId: number; reason?: string }) =>
      riderDeliveryService.decline(orderId, reason),
    onSettled: (_data, _error, { orderId }) => {
      removeOfferFromCache(qc, orderId);
      qc.removeQueries({ queryKey: queryKeys.orders.detail(orderId) });
      qc.invalidateQueries({ queryKey: queryKeys.offers.all });
    },
  });
}

type Coords = { lat?: number; lng?: number };

export type JobStep =
  | { action: 'heading_to_pickup'; coords?: Coords }
  | { action: 'pickup'; code: string; coords?: Coords }
  | { action: 'on_the_way'; coords?: Coords }
  | { action: 'complete'; formData: FormData }
  | { action: 'report_issue'; formData: FormData };

function runStep(orderId: number, step: JobStep): Promise<Job> {
  if (step.action === 'heading_to_pickup') return riderDeliveryService.headingToPickup(orderId, step.coords);
  if (step.action === 'pickup') return riderDeliveryService.pickup(orderId, step.code, step.coords);
  if (step.action === 'on_the_way') return riderDeliveryService.onTheWay(orderId, step.coords);
  if (step.action === 'complete') return riderDeliveryService.complete(orderId, step.formData);
  return riderDeliveryService.reportIssue(orderId, step.formData);
}

/** One mutation for every step; the screen renders buttons from `next_actions`. */
export function useJobStep(orderId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (step: JobStep) => runStep(orderId, step),
    onSuccess: (job) => {
      storeJob(qc, job);
      invalidateWork(qc);
    },
    onError: (error) => {
      // Someone else moved it (admin unassign, cancel): show the truth.
      const reason = errorReason(error);
      if (reason === 'invalid_transition' || reason === 'not_yours' || reason === 'already_taken') {
        qc.invalidateQueries({ queryKey: queryKeys.orders.detail(orderId) });
        qc.invalidateQueries({ queryKey: queryKeys.activeJob });
      }
    },
  });
}
