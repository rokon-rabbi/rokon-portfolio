// The head bootstrap and this controller share saved choice > system preference.
const root = document.documentElement;
const system = window.matchMedia("(prefers-color-scheme: dark)");
let saved: "light" | "dark" | null = null;
try {
  const value = localStorage.getItem("theme");
  if (value === "light" || value === "dark") saved = value;
} catch {
  /* Preference still works for this visit. */
}
const controls = document.querySelectorAll<HTMLButtonElement>(
  "[data-theme-toggle]",
);
function apply() {
  // Change theme atomically: hover color transitions must not interpolate
  // between a light foreground and the already-switched dark canvas.
  root.dataset.themeChanging = "";
  const mode = saved ?? (system.matches ? "dark" : "light");
  root.dataset.theme = mode;
  root.classList.toggle("dark", mode === "dark");
  root.style.colorScheme = mode;
  controls.forEach((control) => {
    control.hidden = false;
    control.setAttribute("aria-pressed", String(mode === "dark"));
    control.setAttribute(
      "aria-label",
      `Use ${mode === "dark" ? "light" : "dark"} theme`,
    );
  });
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      delete root.dataset.themeChanging;
    }),
  );
}
controls.forEach((control) =>
  control.addEventListener("click", () => {
    saved = root.dataset.theme === "dark" ? "light" : "dark";
    try {
      localStorage.setItem("theme", saved);
    } catch {
      /* Keep the in-memory choice. */
    }
    apply();
  }),
);
system.addEventListener("change", () => {
  if (!saved) apply();
});
window.addEventListener("storage", (event) => {
  if (event.key !== "theme" && event.key !== null) return;
  saved =
    event.newValue === "light" || event.newValue === "dark"
      ? event.newValue
      : null;
  apply();
});
apply();
