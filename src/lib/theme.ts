import tokens from './tokens.js';

export const colors = {
  brand: tokens.brand,
  surface: tokens.surface,
  text: tokens.text,
  border: tokens.border,
  status: tokens.status,
} as const;

export const navTint = {
  active: colors.brand[500],
  inactive: colors.text.muted,
} as const;
