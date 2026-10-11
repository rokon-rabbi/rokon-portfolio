import { SystemsHeroController } from "../lib/systems-hero";

type HeroHost = HTMLElement & { systemsHero?: SystemsHeroController };
const owners = new Map<HeroHost, SystemsHeroController>();
const listeners = new AbortController();
function mount() {
  if (
    !("IntersectionObserver" in window) ||
    !("ResizeObserver" in window) ||
    !("MutationObserver" in window)
  )
    return;
  document.querySelectorAll<HeroHost>("[data-system-hero]").forEach((host) => {
    if (owners.has(host)) return;
    const owner = new SystemsHeroController(host);
    host.systemsHero = owner;
    owners.set(host, owner);
  });
}
function dispose() {
  owners.forEach((owner, host) => {
    owner.dispose();
    delete host.systemsHero;
  });
  owners.clear();
}
mount();
document.addEventListener("astro:before-swap", dispose, {
  signal: listeners.signal,
});
document.addEventListener("astro:page-load", mount, {
  signal: listeners.signal,
});
if (import.meta.hot)
  import.meta.hot.dispose(() => {
    dispose();
    listeners.abort();
  });
