import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatMoney(amount: number | string, currency = 'SAR'): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return `${currency} ${isNaN(num) ? '0.00' : num.toFixed(2)}`;
}
