/**
 * AHAAR Rider App design tokens — canonical source of truth for colour.
 * Derived from the Rider App UI/UX Design System Specification:
 * 
 * | Token      | Color     | Usage                                                |
 * |------------|-----------|------------------------------------------------------|
 * | Primary    | `#FF7A00` | Main brand actions, active navigation, key highlights|
 * | Secondary  | `#E04E0C` | Strong accents, selected emphasis, important actions |
 * | Text       | `#1F1F1F` | Main text and headings                               |
 * | Background | `#FFFFFF` | Main screen background                               |
 * | Surface    | `#FFF1E6` | Soft cards, grouped sections, subtle highlighted     |
 */

const brand = {
  50: '#FFF1E6',  // Soft surface / grouped section background
  100: '#FFE5D3', // Light warm tint
  200: '#FFCCA8', // Subtle border / pill highlight
  300: '#FFAF7D', // Accent highlight
  400: '#FF9452', // Warm accent
  500: '#FF7A00', // PRIMARY: Main brand actions, active navigation, key highlights
  600: '#F06500', // Hover/press state
  700: '#E04E0C', // SECONDARY: Strong accents, selected emphasis, prominent actions
  800: '#B83B07', // Deep warm amber
  900: '#7C2502', // Darkest brand accent
};

const surface = {
  DEFAULT: '#FFFFFF',   // Main screen background
  secondary: '#FFF1E6', // Soft cards, grouped sections, subtle highlighted areas
  muted: '#FBF8F5',     // Gentle warm neutral for full-screen scroll container
};

const text = {
  primary: '#1F1F1F',   // Main text and headings
  secondary: '#525252', // Sub-labels, body text, secondary descriptions
  muted: '#8C8C8C',     // Captions, placeholders, inactive icons
  inverse: '#FFFFFF',   // Text on dark/prominent colored backgrounds
};

const border = {
  DEFAULT: '#FFE2CC',   // Warm subtle border matching #FFF1E6
  strong: '#E5E7EB',    // Dividers and strong cards
};

const status = {
  success: '#059669',
  successSoft: '#ECFDF5',
  warning: '#D97706',
  warningSoft: '#FFFBEB',
  danger: '#DC2626',
  dangerSoft: '#FEF2F2',
  info: '#2563EB',
  infoSoft: '#EFF6FF',
};

module.exports = { brand, surface, text, border, status };
