// The only source of theme colors. Layout emits these as shadcn CSS variables;
// Tailwind utilities and contrast checks consume the same values.
//
// The palette is paper and ink with one oxblood accent, taken from the colour
// theme Rokon asked for (bazlur.com): its page, three inks, hairline, code
// surface and link colour are used unchanged in both modes.
export const THEMES = {
  light: {
    background: "#FFFCF5",
    foreground: "#111111",
    card: "#FFFFFF",
    "card-foreground": "#111111",
    popover: "#FFFFFF",
    "popover-foreground": "#111111",
    primary: "#7A1F1F",
    "primary-foreground": "#FFFCF5",
    "primary-hover": "#5C1515",
    secondary: "#111111",
    "secondary-foreground": "#FFFCF5",
    "secondary-hover": "#2E2A25",
    muted: "#F5F1E7",
    "muted-foreground": "#655F55",
    accent: "#F5F1E7",
    "accent-foreground": "#111111",
    border: "#E8E1D2",
    input: "#857D70",
    ring: "#7A1F1F",
    destructive: "#B3261E",
    "destructive-foreground": "#FFFFFF",
    warm: "#855014",
    "warm-decorative": "#E3B778",
    "surface-hover": "#F0EBDD",
    "disabled-background": "#ECE6D8",
    "disabled-foreground": "#5C564D",
    "selection-background": "#7A1F1F",
    "selection-foreground": "#FFFCF5",
    // Reference inks, as given: body copy, and the quiet third ink for
    // large or incidental text on the page colour only.
    "soft-foreground": "#4A4640",
    faint: "#746D62",
    // The brace objects: lit side, body and shadow side.
    "brace-light": "#B04A3F",
    brace: "#7A1F1F",
    "brace-shade": "#3F0E10",
  },
  dark: {
    background: "#161412",
    foreground: "#ECE6DA",
    card: "#1C1916",
    "card-foreground": "#ECE6DA",
    popover: "#201D19",
    "popover-foreground": "#ECE6DA",
    primary: "#E0836F",
    "primary-foreground": "#161412",
    "primary-hover": "#EDA493",
    secondary: "#ECE6DA",
    "secondary-foreground": "#161412",
    "secondary-hover": "#FFFCF5",
    muted: "#201D19",
    "muted-foreground": "#A9A092",
    accent: "#26221D",
    "accent-foreground": "#ECE6DA",
    border: "#2C2824",
    input: "#7F776B",
    ring: "#E0836F",
    destructive: "#FF8E80",
    "destructive-foreground": "#161412",
    warm: "#E3B778",
    "warm-decorative": "#E3B778",
    "surface-hover": "#26221D",
    "disabled-background": "#2A2622",
    "disabled-foreground": "#A9A092",
    "selection-background": "#E0836F",
    "selection-foreground": "#161412",
    "soft-foreground": "#B1A99B",
    faint: "#A1988A",
    "brace-light": "#F3A996",
    brace: "#E0836F",
    "brace-shade": "#8A3B2E",
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
`;
