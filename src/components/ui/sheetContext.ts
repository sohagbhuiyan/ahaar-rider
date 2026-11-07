import { createContext, useContext } from 'react';
import type { View } from 'react-native';

export interface SheetContextValue {
  onFieldFocus: (field: View) => void;
  onFieldBlur: (field: View) => void;
}

export const SheetContext = createContext<SheetContextValue | null>(null);

export function useSheet(): SheetContextValue | null {
  return useContext(SheetContext);
}
