import { useSyncExternalStore } from "react";

type RiderDemoState = {
  isOnline: boolean;
};

let state: RiderDemoState = { isOnline: true };
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return state;
}

export function setRiderOnline(isOnline: boolean) {
  if (state.isOnline === isOnline) return;
  state = { isOnline };
  listeners.forEach((listener) => listener());
}

export function useRiderDemo() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function useActiveOrderCount(): number {
  return 1;
}
