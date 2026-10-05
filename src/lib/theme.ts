export const colors = {
  brand: {
    50: "#fff7ed",
    100: "#ffedd5",
    200: "#fed7aa",
    300: "#fdba74",
    400: "#fb923c",
    500: "#f97316",
    600: "#ea580c",
    700: "#c2410c",
    800: "#9a3412",
    900: "#7c2d12",
  },
  surface: { DEFAULT: "#ffffff", muted: "#f9fafb" },
  border: { DEFAULT: "#e5e7eb" },
} as const;

export const navTint = {
  active: colors.brand[600],
  inactive: "#9ca3af",
} as const;
