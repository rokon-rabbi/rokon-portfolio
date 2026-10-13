// What a visitor may change about how the site looks: its palette, its text
// face, the size of the text and the space between lines. The head bootstrap
// and the controller both read their rules from here, so first paint and the
// appearance panel can never disagree about what a saved choice means.
import { THEME_SCHEME, type Theme } from "./tokens";

export type ThemeChoice = Theme | "auto";

// Paper is the site as designed. Auto follows the device's own setting.
export const THEME_OPTIONS = [
  { id: "light", label: "Paper" },
  { id: "snow", label: "Snow" },
  { id: "sepia", label: "Sepia" },
  { id: "dark", label: "Ink" },
  { id: "midnight", label: "Midnight" },
  { id: "auto", label: "Auto" },
] as const satisfies readonly { id: ThemeChoice; label: string }[];

// `family` is the face's real name, for a tooltip. The faces themselves are
// declared in global.css under the same ids.
export const FONT_OPTIONS = [
  { id: "geist", label: "Geist", family: "Geist" },
  { id: "serif", label: "Serif", family: "Source Serif 4" },
  { id: "legible", label: "Legible", family: "Atkinson Hyperlegible Next" },
  { id: "mono", label: "Mono", family: "JetBrains Mono" },
  { id: "system", label: "System", family: "Your device’s own font" },
] as const;
export type FontChoice = (typeof FONT_OPTIONS)[number]["id"];

// Percent of the size the site is designed at. The page and footer scale as
// one piece; the header and the panel itself stay as they are.
export const TEXT_SIZES = [90, 100, 110, 120, 130] as const;
export type TextSize = (typeof TEXT_SIZES)[number];

export const SPACING_OPTIONS = [
  { id: "compact", label: "Compact" },
  { id: "normal", label: "Normal" },
  { id: "relaxed", label: "Relaxed" },
] as const;
export type SpacingChoice = (typeof SPACING_OPTIONS)[number]["id"];

export interface Preferences {
  theme: ThemeChoice;
  font: FontChoice;
  size: TextSize;
  spacing: SpacingChoice;
}
export type PreferenceField = keyof Preferences;

export const DEFAULTS: Preferences = {
  theme: "light",
  font: "geist",
  size: 100,
  spacing: "normal",
};

// localStorage keys. "theme" is the key the site has always used.
export const STORAGE_KEYS: Record<PreferenceField, string> = {
  theme: "theme",
  font: "font",
  size: "text-size",
  spacing: "line-spacing",
};

const ids = <Id extends string>(options: readonly { id: Id }[]) =>
  options.map((option) => option.id);
const oneOf = <Id extends string>(
  options: readonly { id: Id }[],
  value: unknown,
  fallback: Id,
) => ids(options).find((id) => id === value) ?? fallback;

// Anything not on the lists above falls back to the default for that field.
export function parsePreferences(
  raw: Partial<Record<PreferenceField, string | null>>,
): Preferences {
  return {
    theme: oneOf(THEME_OPTIONS, raw.theme, DEFAULTS.theme),
    font: oneOf(FONT_OPTIONS, raw.font, DEFAULTS.font),
    size: TEXT_SIZES.find((size) => String(size) === raw.size) ?? DEFAULTS.size,
    spacing: oneOf(SPACING_OPTIONS, raw.spacing, DEFAULTS.spacing),
  };
}

export const resolveTheme = (choice: ThemeChoice, systemDark: boolean): Theme =>
  choice === "auto" ? (systemDark ? "dark" : "light") : choice;

// The script for <head>. It runs before the first paint, so it is written
// out by hand as plain ES5 and given the lists above as data. A default is
// left as no attribute at all: the stylesheet already describes it.
export const PREFERENCES_BOOTSTRAP = `(function(c){var r=document.documentElement;function get(k){try{return localStorage.getItem(k)}catch(_){return null}}var t=get(c.keys.theme);if(t==="auto")t=window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";if(!Object.prototype.hasOwnProperty.call(c.schemes,t))t=c.defaults.theme;r.dataset.theme=t;r.classList.toggle("dark",c.schemes[t]==="dark");r.style.colorScheme=c.schemes[t];var f=get(c.keys.font);if(c.fonts.indexOf(f)>=0&&f!==c.defaults.font)r.dataset.font=f;var z=get(c.keys.size);if(c.sizes.indexOf(z)>=0&&z!==String(c.defaults.size))r.dataset.textSize=z;var s=get(c.keys.spacing);if(c.spacings.indexOf(s)>=0&&s!==c.defaults.spacing)r.dataset.spacing=s})(${JSON.stringify(
  {
    keys: STORAGE_KEYS,
    schemes: THEME_SCHEME,
    fonts: ids(FONT_OPTIONS),
    sizes: TEXT_SIZES.map(String),
    spacings: ids(SPACING_OPTIONS),
    defaults: DEFAULTS,
  },
)});`;
