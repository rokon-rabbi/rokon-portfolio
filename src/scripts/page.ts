import { copyText } from "./notice";

// Small behaviours of the page itself. Each one adds to markup that already
// works: without this file the header is simply clear, the section list is a
// list of links, every section is visible and an address is a mail link.
const root = document.documentElement;
const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");

// ---- Where the page is: the header's veil, the section list's marker -----
const rail = document.querySelector<HTMLElement>("[data-rail]");
const stops = Array.from(
  rail?.querySelectorAll<HTMLAnchorElement>('a[href^="#"]') ?? [],
)
  .map((link) => ({
    link,
    target: document.getElementById(decodeURIComponent(link.hash.slice(1))),
  }))
  .filter(
    (stop): stop is { link: HTMLAnchorElement; target: HTMLElement } =>
      stop.target !== null,
  );

function measure() {
  root.toggleAttribute("data-scrolled", window.scrollY > 8);
  if (!stops.length) return;
  // A section is the current one once its top has passed a line a third of
  // the way down the window. Over the last half-screen of scrolling that
  // line sinks to the bottom edge, so the short sections that end the page
  // each get their turn before the scrolling runs out.
  const end = root.scrollHeight - window.innerHeight;
  const closing = Math.min(
    1,
    Math.max(0, 1 - (end - window.scrollY) / (window.innerHeight / 2)),
  );
  const line = window.innerHeight * (0.34 + 0.66 * closing * closing);
  let current = stops[0];
  for (const stop of stops)
    if (stop.target.getBoundingClientRect().top <= line) current = stop;
  for (const stop of stops) {
    if (stop === current) stop.link.setAttribute("aria-current", "location");
    else stop.link.removeAttribute("aria-current");
  }
}
let queued = false;
const schedule = () => {
  if (queued) return;
  queued = true;
  requestAnimationFrame(() => {
    queued = false;
    measure();
  });
};
window.addEventListener("scroll", schedule, { passive: true });
window.addEventListener("resize", schedule, { passive: true });
measure();

// ---- Sections below the first screen settle as they are reached ----------
// Nothing is held back or hidden for this. A section that was out of sight
// when the page opened plays a short rise at the moment it comes into view,
// so a page that is printed, captured whole or read without scripts shows
// everything it has.
const sections = document.querySelectorAll<HTMLElement>("[data-reveal]");
if (sections.length && !reduced.matches && "IntersectionObserver" in window) {
  const watcher = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      (entry.target as HTMLElement).dataset.reveal = "in";
      watcher.unobserve(entry.target);
    }
  });
  sections.forEach((section) => {
    if (section.getBoundingClientRect().top >= window.innerHeight)
      watcher.observe(section);
  });
}

// ---- A tool's name marks every place its role mentions it ----------------
// With a mouse only: the names are plain text, not controls, and this adds
// nothing a reader needs.
if (window.matchMedia("(hover: hover) and (pointer: fine)").matches)
  document
    .querySelectorAll<HTMLElement>("[data-tools-scope]")
    .forEach((scope) => {
      let lit: HTMLElement[] = [];
      const clear = () => {
        lit.forEach((element) => element.removeAttribute("data-lit"));
        lit = [];
      };
      scope.addEventListener("pointerover", (event) => {
        const name = (event.target as Element).closest<HTMLElement>(
          "[data-tool]",
        )?.dataset.tool;
        if (lit[0]?.dataset.tool === name) return;
        clear();
        if (!name) return;
        const same = Array.from(
          scope.querySelectorAll<HTMLElement>("[data-tool]"),
        ).filter((element) => element.dataset.tool === name);
        // A name that appears once has nothing to point to.
        if (same.length < 2) return;
        lit = same;
        lit.forEach((element) => element.setAttribute("data-lit", ""));
      });
      scope.addEventListener("pointerleave", clear);
    });

// ---- Copy buttons: shown only where the clipboard can be written ---------
// (a page served without HTTPS has no clipboard at all).
if ("clipboard" in navigator && navigator.clipboard)
  document
    .querySelectorAll<HTMLButtonElement>("button[data-copy-button]")
    .forEach((button) => {
      const label = button.querySelector<HTMLElement>("[data-copy-label]");
      const rest = label?.textContent ?? "";
      let timer: ReturnType<typeof setTimeout> | undefined;
      button.hidden = false;
      button.addEventListener("click", async () => {
        const copied = await copyText(button.dataset.copy ?? "");
        if (!label) return;
        clearTimeout(timer);
        label.textContent = copied ? "Copied" : "Not copied";
        button.toggleAttribute("data-copied", copied);
        timer = setTimeout(() => {
          label.textContent = rest;
          button.removeAttribute("data-copied");
        }, 1800);
      });
    });
