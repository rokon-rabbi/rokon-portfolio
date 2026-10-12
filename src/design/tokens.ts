// The only source of theme colors. Layout emits these as shadcn CSS variables;
// Tailwind utilities and contrast checks consume the same values.
//
// Three colours come from Rokon's own assets: the logo runs from mint (#6CDEB5)
// to teal (#078F9D), and the ink is the portrait's navy taken down to near
// black. `brand` and `brand-deep` are the logo ends and are fills only.
// `primary` is the teal darkened until it is safe as text.
//
// The `stage-*` values are the dark opening and closing screens. They do not
// change with the theme: the page always begins and ends on the stage.
const STAGE = {
  stage: "#080D1F",
  "stage-raised": "#101833",
  "stage-foreground": "#EEF3F0",
  "stage-muted": "#A3AEC9",
  "stage-line": "#26304F",
} as const;

export const THEMES = {
  light: {
    background: "#F3F5F1",
    foreground: "#0B1126",
    card: "#FFFFFF",
    "card-foreground": "#0B1126",
    popover: "#FFFFFF",
    "popover-foreground": "#0B1126",
    primary: "#086068",
    "primary-foreground": "#FFFFFF",
    "primary-hover": "#064E55",
    secondary: "#1D2748",
    "secondary-foreground": "#F1F6F3",
    "secondary-hover": "#131B36",
    link: "#086068",
    muted: "#E8ECE7",
    "muted-foreground": "#4A5468",
    accent: "#DCEFE8",
    "accent-foreground": "#0B1126",
    border: "#D3DAD4",
    input: "#62807C",
    ring: "#086068",
    destructive: "#A81C2A",
    "destructive-foreground": "#FFFFFF",
    warm: "#7D4A0B",
    "warm-decorative": "#F3B95F",
    "surface-hover": "#DEE6E0",
    "disabled-background": "#E1E6E1",
    "disabled-foreground": "#525C6E",
    "selection-background": "#6CDEB5",
    "selection-foreground": "#0B1126",
    brand: "#6CDEB5",
    "brand-deep": "#078F9D",
    "brand-ink": "#0B1126",
    navy: "#101833",
    "navy-foreground": "#EEF3F0",
    "navy-muted": "#A3AEC9",
    ...STAGE,
  },
  dark: {
    background: "#0D1429",
    foreground: "#E9F0EC",
    card: "#141D38",
    "card-foreground": "#E9F0EC",
    popover: "#1A2443",
    "popover-foreground": "#E9F0EC",
    primary: "#6CDEB5",
    "primary-foreground": "#0B1126",
    "primary-hover": "#8DE8C8",
    secondary: "#7FD3DA",
    "secondary-foreground": "#0B1126",
    "secondary-hover": "#9DE0E5",
    link: "#6CDEB5",
    muted: "#141D38",
    "muted-foreground": "#A3AEC9",
    accent: "#1B2645",
    "accent-foreground": "#E9F0EC",
    border: "#27324F",
    input: "#7C8BAE",
    ring: "#6CDEB5",
    destructive: "#FF8FA3",
    "destructive-foreground": "#0B1126",
    warm: "#F0BE6A",
    "warm-decorative": "#F3B95F",
    "surface-hover": "#212D50",
    "disabled-background": "#212D50",
    "disabled-foreground": "#A3AEC9",
    "selection-background": "#6CDEB5",
    "selection-foreground": "#0B1126",
    brand: "#6CDEB5",
    "brand-deep": "#1FA2A9",
    "brand-ink": "#0B1126",
    navy: "#101833",
    "navy-foreground": "#EEF3F0",
    "navy-muted": "#A3AEC9",
    ...STAGE,
  },
} as const;

export type Theme = keyof typeof THEMES;
const declarations = (mode: Theme) =>
  Object.entries(THEMES[mode])
    .map(([key, value]) => `--${key}:${value}`)
    .join(";");
// Light is the default. Dark applies only after the visitor chooses it.
export const THEME_CSS = `
  :root { ${declarations("light")}; color-scheme:light; }
  :root.dark, :root[data-theme="dark"] { ${declarations("dark")}; color-scheme:dark; }
`;
