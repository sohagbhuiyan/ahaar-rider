import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** The default and official currency for AHAAR Saudi Arabia delivery operations. */
export const CURRENCY_CODE = 'SAR';

/**
 * Format money for display in the Rider App.
 * Always Saudi Riyal (SAR). If a caller or backend payload passes 'EUR' or undefined,
 * it is safely normalized to 'SAR'.
 */
export function formatMoney(
  amount: number | string | null | undefined,
  currency: string = CURRENCY_CODE
): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : (amount ?? 0);
  const safe = Number.isFinite(num) ? num : 0;
  const resolved = (!currency || currency === 'EUR' || currency.trim() === '') ? CURRENCY_CODE : currency;
  return `${resolved} ${safe.toFixed(2)}`;
}
