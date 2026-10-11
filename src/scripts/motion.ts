/** Lazy, progressive enhancement. The HTML/CSS baseline is always visible. */
const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
const seen = new WeakSet<Element>();
const listeners = new AbortController();
const options = { signal: listeners.signal };
let dispose: (() => void) | undefined;
let generation = 0;
let active = false;

function stop() {
  generation++;
  active = false;
  dispose?.();
  dispose = undefined;
}

async function start(restored = false) {
  if (active || reduced.matches || document.visibilityState === "hidden")
    return;
  const root = document.getElementById("main-content");
  if (!root?.querySelector("[data-motion]")) return;
  const ticket = ++generation;
  active = true;
  try {
    const { createPageMotion } = await import("../lib/page-motion");
    await document.fonts.ready;
    // Let native fragment/history scroll restoration settle before measuring.
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );
    if (ticket !== generation || reduced.matches || !root.isConnected) return;
    dispose = createPageMotion(root, seen, restored);
  } catch (error) {
    if (ticket === generation) stop();
    console.warn(
      "Motion enhancement unavailable; static content remains visible.",
      error,
    );
  }
}

const historyRestore = performance
  .getEntriesByType("navigation")
  .some(
    (entry) => (entry as PerformanceNavigationTiming).type === "back_forward",
  );
void start(historyRestore || !!location.hash);
window.addEventListener("pagehide", stop, options);
window.addEventListener(
  "pageshow",
  (event) => {
    if (event.persisted) void start(true);
  },
  options,
);
document.addEventListener(
  "visibilitychange",
  () => {
    if (document.visibilityState === "visible") void start(true);
  },
  options,
);
reduced.addEventListener(
  "change",
  () => {
    stop();
    if (!reduced.matches) void start(true);
  },
  options,
);
// These also protect a future Astro ClientRouter integration.
document.addEventListener("astro:before-swap", stop, options);
document.addEventListener(
  "astro:page-load",
  () => {
    void start(true);
  },
  options,
);
if (import.meta.hot)
  import.meta.hot.dispose(() => {
    stop();
    listeners.abort();
  });
