// The only source of theme colors. Layout emits these as shadcn CSS variables;
// Tailwind utilities and contrast checks consume the same values.
export const THEMES = {
  light: {
    background: "#F7F8F5",
    foreground: "#17212B",
    card: "#FFFFFF",
    "card-foreground": "#17212B",
    popover: "#FFFFFF",
    "popover-foreground": "#17212B",
    primary: "#087B69",
    "primary-foreground": "#FFFFFF",
    "primary-hover": "#066858",
    secondary: "#5365C9",
    "secondary-foreground": "#FFFFFF",
    "secondary-hover": "#4355B7",
    muted: "#EEF1EC",
    "muted-foreground": "#53616C",
    accent: "#EEF1EC",
    "accent-foreground": "#17212B",
    border: "#D2DAD2",
    input: "#6F7D75",
    ring: "#087B69",
    destructive: "#B42338",
    "destructive-foreground": "#FFFFFF",
    warm: "#9A561B",
    "warm-decorative": "#F4B875",
    "surface-hover": "#EEF1EC",
    "disabled-background": "#E4E8E2",
    "disabled-foreground": "#53616C",
    "selection-background": "#087B69",
    "selection-foreground": "#FFFFFF",
  },
  dark: {
    background: "#0B1020",
    foreground: "#F5F7FC",
    card: "#121A2C",
    "card-foreground": "#F5F7FC",
    popover: "#172239",
    "popover-foreground": "#F5F7FC",
    primary: "#56D9BA",
    "primary-foreground": "#0B1020",
    "primary-hover": "#75E6CC",
    secondary: "#A4A8FF",
    "secondary-foreground": "#0B1020",
    "secondary-hover": "#BDC0FF",
    muted: "#182338",
    "muted-foreground": "#A9B6CA",
    accent: "#1D3040",
    "accent-foreground": "#F5F7FC",
    border: "#2D3B52",
    input: "#7588A4",
    ring: "#56D9BA",
    destructive: "#FF8C9A",
    "destructive-foreground": "#0B1020",
    warm: "#F4B875",
    "warm-decorative": "#F4B875",
    "surface-hover": "#1A283E",
    "disabled-background": "#223049",
    "disabled-foreground": "#A9B6CA",
    "selection-background": "#56D9BA",
    "selection-foreground": "#0B1020",
  },
} as const;

export type Theme = keyof typeof THEMES;
const declarations = (mode: Theme) =>
  Object.entries(THEMES[mode])
    .map(([key, value]) => `--${key}:${value}`)
    .join(";");
export const THEME_CSS = `
  :root { ${declarations("light")}; color-scheme:light; }
  :root.dark, :root[data-theme="dark"] { ${declarations("dark")}; color-scheme:dark; }
  @media (prefers-color-scheme:dark) {
    :root:not([data-theme]) { ${declarations("dark")}; color-scheme:dark; }
  }
`;
