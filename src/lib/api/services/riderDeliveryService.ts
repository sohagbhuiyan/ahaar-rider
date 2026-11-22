import { apiClient, multipartConfig } from '../client';
import type { ActiveJob, CarRun, CarRunStop, Job, Offer, RiderStats } from '../types';

type Coords = { lat?: number; lng?: number };

/** GET /rider/orders/{id} answers with a Job when you hold it, an Offer when it's open to you. */
export function isJob(value: Offer | Job | null | undefined): value is Job {
  return Boolean(value && (value as Job).kind === 'order');
}

export const riderDeliveryService = {
  // -------------------------------------------------------------------------
  // Shared
  // -------------------------------------------------------------------------
  getActiveJob: async (): Promise<ActiveJob> => {
    const { data } = await apiClient.get<{ data: ActiveJob }>('/rider/jobs/active');
    return data.data ?? null;
  },

  getStats: async (): Promise<RiderStats> => {
    const { data } = await apiClient.get<{ data: RiderStats }>('/rider/stats');
    return data.data;
  },

  // -------------------------------------------------------------------------
  // Car: subscription routes
  // -------------------------------------------------------------------------
  getRunsToday: async (): Promise<CarRun | null> => {
    const { data } = await apiClient.get<{ data: CarRun | null }>('/rider/runs/today');
    return data.data ?? null;
  },

  getDelivery: async (id: number | string): Promise<CarRunStop> => {
    const { data } = await apiClient.get<{ data: CarRunStop }>(`/rider/deliveries/${id}`);
    return data.data;
  },

  acceptHandover: async (
    runId: number,
    scannedCodes: string[],
  ): Promise<{
    all_matched: boolean;
    matched_count?: number;
    missing_count?: number;
    missing_codes?: string[];
    total_scanned?: number;
  }> => {
    const { data } = await apiClient.post(`/rider/runs/${runId}/accept-handover`, {
      scanned_codes: scannedCodes,
    });
    return data.data;
  },

  /** A wrong bag answers 422 with `data: { matched: false, scanned_code, belonging_stop }`. */
  verifyPackage: async (
    deliveryId: number | string,
    scannedCode: string,
  ): Promise<{ matched: boolean; delivery_id?: number; stop_sequence?: number }> => {
    const { data } = await apiClient.post(`/rider/deliveries/${deliveryId}/verify-package`, {
      scanned_code: scannedCode,
    });
    return data.data;
  },

  /** Multipart `{ pod_type, photo?, customer_signature?, lat?, lng? }`. */
  completeDelivery: async (
    deliveryId: number | string,
    formData: FormData,
  ): Promise<{ delivery_id: number; status: string; delivered_at?: string; pod_photo_url?: string }> => {
    const { data } = await apiClient.post(
      `/rider/deliveries/${deliveryId}/complete`,
      formData,
      multipartConfig,
    );
    return data.data;
  },

  /** Multipart `{ reason, notes?, photo? }`. */
  reportDeliveryIssue: async (
    deliveryId: number | string,
    formData: FormData,
  ): Promise<{ delivery_id: number; status: string }> => {
    const { data } = await apiClient.post(
      `/rider/deliveries/${deliveryId}/report-issue`,
      formData,
      multipartConfig,
    );
    return data.data;
  },

  // -------------------------------------------------------------------------
  // Bike: instant orders
  // -------------------------------------------------------------------------
  getOffers: async (): Promise<Offer[]> => {
    const { data } = await apiClient.get<{ data: Offer[] }>('/rider/offers');
    return data.data ?? [];
  },

  getOrder: async (id: number | string): Promise<Offer | Job> => {
    const { data } = await apiClient.get<{ data: Offer | Job }>(`/rider/orders/${id}`);
    return data.data;
  },

  accept: async (orderId: number): Promise<Job> => {
    const { data } = await apiClient.post<{ data: Job }>(`/rider/orders/${orderId}/accept`);
    return data.data;
  },

  decline: async (orderId: number, reason?: string): Promise<void> => {
    await apiClient.post(`/rider/orders/${orderId}/decline`, reason ? { reason } : {});
  },

  headingToPickup: async (orderId: number, coords: Coords = {}): Promise<Job> => {
    const { data } = await apiClient.post<{ data: Job }>(
      `/rider/orders/${orderId}/heading-to-pickup`,
      coords,
    );
    return data.data;
  },

  /** `code` is the 4-digit bag code from the kitchen; a mismatch is 422 `wrong_code`. */
  pickup: async (orderId: number, code: string, coords: Coords = {}): Promise<Job> => {
    const { data } = await apiClient.post<{ data: Job }>(`/rider/orders/${orderId}/pickup`, {
      code,
      ...coords,
    });
    return data.data;
  },

  onTheWay: async (orderId: number, coords: Coords = {}): Promise<Job> => {
    const { data } = await apiClient.post<{ data: Job }>(`/rider/orders/${orderId}/on-the-way`, coords);
    return data.data;
  },

  /** Multipart `{ pod_type, photo?, cash_collected?, lat?, lng? }`. */
  complete: async (orderId: number, formData: FormData): Promise<Job> => {
    const { data } = await apiClient.post<{ data: Job }>(
      `/rider/orders/${orderId}/complete`,
      formData,
      multipartConfig,
    );
    return data.data;
  },

  /** Multipart `{ reason, photo? }`; the job ends as `failed`. */
  reportIssue: async (orderId: number, formData: FormData): Promise<Job> => {
    const { data } = await apiClient.post<{ data: Job }>(
      `/rider/orders/${orderId}/report-issue`,
      formData,
      multipartConfig,
    );
    return data.data;
  },
};
