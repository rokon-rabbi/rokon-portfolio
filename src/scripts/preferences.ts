import {
  DEFAULTS,
  STORAGE_KEYS,
  TEXT_SIZES,
  parsePreferences,
  resolveTheme,
  type PreferenceField,
} from "../design/preferences";
import { THEME_SCHEME } from "../design/tokens";

// The head bootstrap and this controller share one rule: a saved choice,
// otherwise the site as designed. Light is the default whatever the device
// prefers; following the device is the "Auto" choice a visitor makes.
const root = document.documentElement;
const system = window.matchMedia("(prefers-color-scheme: dark)");
const fields = Object.keys(STORAGE_KEYS) as PreferenceField[];

const stored = (field: PreferenceField) => {
  try {
    return localStorage.getItem(STORAGE_KEYS[field]);
  } catch {
    return null; /* Preferences still work for this visit. */
  }
};
let prefs = parsePreferences({
  theme: stored("theme"),
  font: stored("font"),
  size: stored("size"),
  spacing: stored("spacing"),
});
const raw = () => ({ ...prefs, size: String(prefs.size) });
const isDefault = () => fields.every((field) => prefs[field] === DEFAULTS[field]);

const toggles = document.querySelectorAll<HTMLButtonElement>(
  "[data-theme-toggle]",
);
const choices = document.querySelectorAll<HTMLInputElement>("[data-pref]");
const steps = document.querySelectorAll<HTMLButtonElement>("[data-size-step]");
const sizeValue = document.querySelector<HTMLElement>("[data-size-value]");
const autoHint = document.querySelector<HTMLElement>("[data-auto-hint]");
const reset = document.querySelector<HTMLButtonElement>(
  "[data-settings-reset]",
);

// A default is the absence of an attribute, as the stylesheet expects.
function mark(name: string, value: string, fallback: string) {
  if (value === fallback) delete root.dataset[name];
  else root.dataset[name] = value;
}
function apply() {
  // Change everything atomically: hover color transitions must not
  // interpolate between one palette's ink and the next palette's page.
  root.dataset.themeChanging = "";
  const theme = resolveTheme(prefs.theme, system.matches);
  const scheme = THEME_SCHEME[theme];
  root.dataset.theme = theme;
  root.classList.toggle("dark", scheme === "dark");
  root.style.colorScheme = scheme;
  mark("font", prefs.font, DEFAULTS.font);
  mark("textSize", String(prefs.size), String(DEFAULTS.size));
  mark("spacing", prefs.spacing, DEFAULTS.spacing);

  toggles.forEach((control) => {
    control.hidden = false;
    control.setAttribute("aria-pressed", String(scheme === "dark"));
    control.setAttribute(
      "aria-label",
      `Use ${scheme === "dark" ? "light" : "dark"} theme`,
    );
  });
  const values = raw();
  choices.forEach((input) => {
    input.checked = values[input.dataset.pref as PreferenceField] === input.value;
  });
  const index = TEXT_SIZES.indexOf(prefs.size);
  steps.forEach((button) => {
    const next = TEXT_SIZES[index + Number(button.dataset.sizeStep)];
    button.setAttribute("aria-disabled", String(next === undefined));
  });
  if (sizeValue) sizeValue.textContent = `${prefs.size}%`;
  if (autoHint) autoHint.hidden = prefs.theme !== "auto";
  reset?.setAttribute("aria-disabled", String(isDefault()));
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      delete root.dataset.themeChanging;
    }),
  );
}
function choose(change: Partial<Record<PreferenceField, string>>) {
  prefs = parsePreferences({ ...raw(), ...change });
  try {
    for (const field of Object.keys(change) as PreferenceField[])
      localStorage.setItem(STORAGE_KEYS[field], String(prefs[field]));
  } catch {
    /* Keep the in-memory choice. */
  }
  apply();
}

// The header's sun and moon: one press between the two palettes the site
// was designed in, whichever palette is showing.
toggles.forEach((control) =>
  control.addEventListener("click", () => {
    const showing = resolveTheme(prefs.theme, system.matches);
    choose({ theme: THEME_SCHEME[showing] === "dark" ? "light" : "dark" });
  }),
);
choices.forEach((input) =>
  input.addEventListener("change", () => {
    const field = input.dataset.pref as PreferenceField;
    if (input.checked) choose({ [field]: input.value });
  }),
);
steps.forEach((button) =>
  button.addEventListener("click", () => {
    const next =
      TEXT_SIZES[TEXT_SIZES.indexOf(prefs.size) + Number(button.dataset.sizeStep)];
    if (next !== undefined) choose({ size: String(next) });
  }),
);
reset?.addEventListener("click", () => {
  prefs = { ...DEFAULTS };
  try {
    fields.forEach((field) => localStorage.removeItem(STORAGE_KEYS[field]));
  } catch {
    /* Nothing was stored. */
  }
  apply();
});
system.addEventListener("change", () => {
  if (prefs.theme === "auto") apply();
});
// Another tab changed a choice, or cleared the storage.
window.addEventListener("storage", (event) => {
  if (event.key === null) prefs = { ...DEFAULTS };
  else {
    const field = fields.find((name) => STORAGE_KEYS[name] === event.key);
    if (!field) return;
    prefs = parsePreferences({ ...raw(), [field]: event.newValue });
  }
  apply();
});
apply();

// ---- The panel: a small, non-modal dialog under the header ---------------
const panel = document.querySelector<HTMLElement>("[data-settings]");
const trigger = document.querySelector<HTMLButtonElement>(
  "[data-settings-toggle]",
);
if (panel && trigger) {
  const isOpen = () => !panel.hidden;
  const setOpen = (open: boolean, restoreFocus = false) => {
    if (isOpen() === open) return;
    panel.hidden = !open;
    trigger.setAttribute("aria-expanded", String(open));
    if (open)
      (
        panel.querySelector<HTMLElement>('[data-pref="theme"]:checked') ?? panel
      ).focus({ preventScroll: true });
    else if (restoreFocus) trigger.focus();
  };
  const inside = (node: EventTarget | null) =>
    node instanceof Node && (panel.contains(node) || trigger.contains(node));
  trigger.hidden = false;
  trigger.addEventListener("click", () => setOpen(!isOpen()));
  panel
    .querySelector("[data-settings-close]")
    ?.addEventListener("click", () => setOpen(false, true));
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") setOpen(false, inside(document.activeElement));
  });
  document.addEventListener("click", (event) => {
    if (!inside(event.target)) setOpen(false);
  });
  // Wait until native Tab navigation has completed before testing containment.
  // A press on the panel's own surface leaves focus on the body: still open.
  panel.addEventListener("focusout", () => {
    setTimeout(() => {
      const focus = document.activeElement;
      if (focus !== document.body && !inside(focus)) setOpen(false);
    }, 0);
  });

  const fullscreen = panel.querySelector<HTMLButtonElement>(
    "[data-fullscreen-toggle]",
  );
  if (fullscreen && document.fullscreenEnabled) {
    const label = fullscreen.querySelector("[data-fullscreen-label]");
    const sync = () => {
      const on = document.fullscreenElement !== null;
      fullscreen.setAttribute("aria-pressed", String(on));
      if (label) label.textContent = on ? "Exit full screen" : "Full screen";
    };
    fullscreen.hidden = false;
    fullscreen.addEventListener("click", () => {
      const change = document.fullscreenElement
        ? document.exitFullscreen()
        : root.requestFullscreen();
      change.catch(() => {
        /* The browser declined; the page stays as it is. */
      });
    });
    document.addEventListener("fullscreenchange", sync);
    sync();
  }
}
