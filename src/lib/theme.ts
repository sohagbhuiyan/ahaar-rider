export const colors = {
  brand: {
    50: "#eaf3ed",
    100: "#d7e8dc",
    200: "#b3d3bf",
    300: "#83b697",
    400: "#55936d",
    500: "#347650",
    600: "#24613f",
    700: "#1c4e33",
    800: "#173f2b",
    900: "#123323",
  },
  surface: { DEFAULT: "#ffffff", muted: "#f4f6f1" },
  border: { DEFAULT: "#e1e6de" },
} as const;

export const navTint = {
  active: colors.brand[600],
  inactive: "#89918a",
} as const;
