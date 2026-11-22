import { create } from 'zustand';

/** What the background-location permission prompt resolved to this session. */
export type BackgroundLocationChoice = 'unknown' | 'granted' | 'denied';

export interface IncomingOffer {
  orderId: number;
  /** Dispatch picked this rider (`offer.assigned`) rather than a broadcast. */
  assigned: boolean;
}

interface DeliveryAppState {
  activeOrderCount: number;
  setActiveOrderCount: (count: number) => void;
  selectedDeliveryId: number | null;
  setSelectedDeliveryId: (id: number | null) => void;

  /** The incoming-order card on screen, from an `offer.new` / `offer.assigned` push. */
  incomingOffer: IncomingOffer | null;
  showIncomingOffer: (offer: IncomingOffer) => void;
  dismissIncomingOffer: () => void;

  backgroundLocation: BackgroundLocationChoice;
  setBackgroundLocation: (choice: BackgroundLocationChoice) => void;
  /** The explanation screen was shown this session; don't push it again. */
  backgroundPromptShown: boolean;
  markBackgroundPromptShown: () => void;

  reset: () => void;
}

const initialState = {
  activeOrderCount: 0,
  selectedDeliveryId: null,
  incomingOffer: null,
  backgroundLocation: 'unknown' as BackgroundLocationChoice,
  backgroundPromptShown: false,
};

export const useDeliveryStore = create<DeliveryAppState>((set) => ({
  ...initialState,
  setActiveOrderCount: (count: number) =>
    set((state) => (state.activeOrderCount === count ? state : { activeOrderCount: count })),
  setSelectedDeliveryId: (id: number | null) => set({ selectedDeliveryId: id }),

  showIncomingOffer: (offer) => set({ incomingOffer: offer }),
  dismissIncomingOffer: () => set({ incomingOffer: null }),

  setBackgroundLocation: (choice) => set({ backgroundLocation: choice }),
  markBackgroundPromptShown: () => set({ backgroundPromptShown: true }),

  reset: () => set(initialState),
}));

export function useActiveOrderCount(): number {
  return useDeliveryStore((state) => state.activeOrderCount);
}
