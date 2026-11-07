/**
 * AHAAR Rider App design tokens — canonical source of truth for colour.
 * Ported verbatim from ahaar-app/src/lib/tokens.js for 100% brand parity.
 */

const brand = {
  50: '#fff0f7', // --ahaar-primary-soft
  100: '#ffdcec',
  200: '#ffbcd9',
  300: '#ff94c1',
  400: '#ff6aab', // --ahaar-primary-light
  500: '#ff2b85', // --ahaar-primary   ← anchor
  600: '#e60d6c',
  700: '#d4006b', // --ahaar-primary-dark
  800: '#a80055',
  900: '#7a003e',
};

const surface = {
  DEFAULT: '#ffffff',
  secondary: '#fff0f7',
  muted: '#f9f9f9',
};

const text = {
  primary: '#1a1a2e',
  secondary: '#4b5563',
  muted: '#9ca3af',
  inverse: '#ffffff',
};

const border = {
  DEFAULT: '#f0e0ea',
  strong: '#e5e7eb',
};

const status = {
  success: '#059669',
  successSoft: '#ecfdf5',
  warning: '#d97706',
  warningSoft: '#fffbeb',
  danger: '#ef4444',
  dangerSoft: '#fef2f2',
  info: '#2563eb',
  infoSoft: '#eff6ff',
};

module.exports = { brand, surface, text, border, status };
