import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../queryKeys';
import { riderDeliveryService } from '../services/riderDeliveryService';

export function useCarRunsToday(options?: { isOnline?: boolean; enabled?: boolean }) {
  const isOnline = Boolean(options?.isOnline);
  const enabled = options?.enabled ?? true;

  return useQuery({
    queryKey: queryKeys.deliveries.runsToday(),
    queryFn: riderDeliveryService.getRunsToday,
    enabled,
    staleTime: 1000 * 15,
    // Controlled background polling: every 15 seconds when online so newly assigned runs or dispatch updates arrive dynamically
    refetchInterval: isOnline ? 15000 : false,
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

export function useAcceptHandover() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ runId, scannedCodes }: { runId: number; scannedCodes: string[] }) =>
      riderDeliveryService.acceptHandover(runId, scannedCodes),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.deliveries.runsToday() });
    },
  });
}

export function useVerifyPackage(deliveryId: number | string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (scannedCode: string) =>
      riderDeliveryService.verifyPackage(deliveryId, scannedCode),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.deliveries.detail(deliveryId) });
    },
  });
}

export function useCompleteDelivery(deliveryId: number | string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (formData: FormData) =>
      riderDeliveryService.completeDelivery(deliveryId, formData),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.deliveries.runsToday() });
      qc.invalidateQueries({ queryKey: queryKeys.deliveries.detail(deliveryId) });
    },
  });
}

export function useReportIssue(deliveryId: number | string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (payload: { reason: string; notes?: string; photo?: any }) =>
      riderDeliveryService.reportIssue(deliveryId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.deliveries.runsToday() });
      qc.invalidateQueries({ queryKey: queryKeys.deliveries.detail(deliveryId) });
    },
  });
}

// =========================================================================
// BIKE TRACK: INSTANT ORDERS
// =========================================================================

export function useAvailableBikeOrders(options?: { isOnline?: boolean; enabled?: boolean }) {
  const isOnline = Boolean(options?.isOnline);
  const enabled = options?.enabled ?? true;

  return useQuery({
    queryKey: queryKeys.orders.available(),
    queryFn: riderDeliveryService.getAvailableBikeOrders,
    enabled,
    staleTime: 1000 * 10,
    // Controlled background polling: every 10 seconds when bike rider is online so new instant orders drop instantly
    refetchInterval: isOnline ? 10000 : false,
    refetchIntervalInBackground: false,
  });
}

export function useOrderDetail(id: number | string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.orders.detail(id),
    queryFn: () => riderDeliveryService.getOrderDetail(id),
    enabled: enabled && !!id,
    staleTime: 1000 * 10,
  });
}

export function useClaimBikeOrder() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (orderId: number) => riderDeliveryService.claimBikeOrder(orderId),
    onSuccess: (_, orderId) => {
      qc.invalidateQueries({ queryKey: queryKeys.orders.available() });
      qc.invalidateQueries({ queryKey: queryKeys.orders.detail(orderId) });
    },
  });
}

export function usePickupBikeOrder() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (orderId: number) => riderDeliveryService.pickupBikeOrder(orderId),
    onSuccess: (_, orderId) => {
      qc.invalidateQueries({ queryKey: queryKeys.orders.detail(orderId) });
    },
  });
}

export function useCompleteBikeOrder() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ orderId, formData }: { orderId: number; formData: FormData }) =>
      riderDeliveryService.completeBikeOrder(orderId, formData),
    onSuccess: (_, { orderId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.orders.available() });
      qc.invalidateQueries({ queryKey: queryKeys.orders.detail(orderId) });
    },
  });
}
