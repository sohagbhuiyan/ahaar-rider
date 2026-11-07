import { create } from 'zustand';

interface DeliveryAppState {
  activeOrderCount: number;
  setActiveOrderCount: (count: number) => void;
  selectedDeliveryId: number | null;
  setSelectedDeliveryId: (id: number | null) => void;
}

export const useDeliveryStore = create<DeliveryAppState>((set) => ({
  activeOrderCount: 0,
  setActiveOrderCount: (count: number) => set({ activeOrderCount: count }),
  selectedDeliveryId: null,
  setSelectedDeliveryId: (id: number | null) => set({ selectedDeliveryId: id }),
}));

export function useActiveOrderCount(): number {
  return useDeliveryStore((state) => state.activeOrderCount);
}
