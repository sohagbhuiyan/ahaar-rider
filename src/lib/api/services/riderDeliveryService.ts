import { apiClient, multipartConfig } from '../client';
import type { ActiveJob, CarRun, CarRunStop, Job, LoadResult, Offer, QuickScan, RiderStats } from '../types';

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

  /** All of today's routes, by slot time (breakfast, lunch and dinner are separate routes). */
  getRuns: async (): Promise<CarRun[]> => {
    const { data } = await apiClient.get<{ data: CarRun[] }>('/rider/runs');
    return data.data ?? [];
  },

  /**
   * Loading scan: one box into the car. `duplicate` when it was already loaded.
   * Another route's box is 422 `wrong_run`; a draft route is 409 `run_not_ready`.
   */
  loadBox: async (runId: number, token: string): Promise<LoadResult> => {
    const { data } = await apiClient.post<{ data: LoadResult }>(`/rider/runs/${runId}/load`, { token });
    return data.data;
  },

  /** Leave the kitchen. 409 `load_incomplete` (with `data.progress`) until every box is in. */
  startRun: async (runId: number): Promise<CarRun> => {
    const { data } = await apiClient.post<{ data: CarRun }>(`/rider/runs/${runId}/start`);
    return data.data;
  },

  /** Quick Scan: the stop behind any box on your route. Dead label 410, unknown 404, other route 422 `wrong_run`. */
  scanBox: async (token: string): Promise<QuickScan> => {
    const { data } = await apiClient.get<{ data: QuickScan }>(`/rider/delivery/scan/${encodeURIComponent(token)}`);
    return data.data;
  },

  /**
   * Multipart `{ token, pod_type, photo?, customer_signature?, notes?, lat?, lng? }`:
   * `token` is the box QR scanned at the door. Another stop's box is 422 `wrong_package`.
   */
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

  /** One tap, no code: instant orders carry no bag code. */
  pickup: async (orderId: number, coords: Coords = {}): Promise<Job> => {
    const { data } = await apiClient.post<{ data: Job }>(`/rider/orders/${orderId}/pickup`, coords);
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
