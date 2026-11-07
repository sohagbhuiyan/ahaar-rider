import { apiClient } from '../client';
import type { BikeOrder, CarRun, CarRunStop } from '../types';

export const riderDeliveryService = {
  // Car Track
  getRunsToday: async (): Promise<CarRun | null> => {
    const { data } = await apiClient.get<{ data: CarRun | null }>('/rider/runs/today');
    return data.data;
  },

  getDelivery: async (id: number | string): Promise<CarRunStop> => {
    const { data } = await apiClient.get<{ data: CarRunStop }>(`/rider/deliveries/${id}`);
    return data.data;
  },

  acceptHandover: async (runId: number, scannedCodes: string[]): Promise<{
    all_matched: boolean;
    matched_count?: number;
    missing_count?: number;
    missing_codes?: string[];
  }> => {
    const { data } = await apiClient.post(`/rider/runs/${runId}/accept-handover`, {
      scanned_codes: scannedCodes,
    });
    return data.data;
  },

  verifyPackage: async (deliveryId: number | string, scannedCode: string): Promise<{
    matched: boolean;
    scanned_code?: string;
    expected_code?: string;
    customer_name?: string;
  }> => {
    const { data } = await apiClient.post(`/rider/deliveries/${deliveryId}/verify-package`, {
      scanned_code: scannedCode,
    });
    return data.data;
  },

  completeDelivery: async (deliveryId: number | string, formData: FormData): Promise<{
    delivery_id: number;
    status: string;
    delivered_at?: string;
    pod_photo_url?: string;
  }> => {
    const { data } = await apiClient.post(`/rider/deliveries/${deliveryId}/complete`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data.data;
  },

  reportIssue: async (deliveryId: number | string, payload: {
    reason: string;
    notes?: string;
    photo?: any;
  }): Promise<{ delivery_id: number; status: string }> => {
    const { data } = await apiClient.post(`/rider/deliveries/${deliveryId}/report-issue`, payload);
    return data.data;
  },

  // Bike Track
  getAvailableBikeOrders: async (): Promise<BikeOrder[]> => {
    const { data } = await apiClient.get<{ data: BikeOrder[] }>('/rider/orders/available');
    return data.data;
  },

  getOrderDetail: async (id: number | string): Promise<BikeOrder> => {
    const { data } = await apiClient.get<{ data: BikeOrder }>(`/rider/orders/${id}`);
    return data.data;
  },

  claimBikeOrder: async (orderId: number): Promise<{ order_id: number; status: string }> => {
    const { data } = await apiClient.post(`/rider/orders/${orderId}/claim`);
    return data.data;
  },

  pickupBikeOrder: async (orderId: number): Promise<{ order_id: number; status: string }> => {
    const { data } = await apiClient.post(`/rider/orders/${orderId}/pickup`);
    return data.data;
  },

  completeBikeOrder: async (orderId: number, formData: FormData): Promise<{ order_id: number; status: string }> => {
    const { data } = await apiClient.post(`/rider/orders/${orderId}/complete`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data.data;
  },
};
