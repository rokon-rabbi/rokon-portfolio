import { scenePolicy, type SceneTier } from "../design/hero-scene";
import type { ScenePalette, SystemsScene } from "./systems-scene";

type SceneModule = {
  createSystemsScene: typeof import("./systems-scene").createSystemsScene;
};
type Device = Navigator & {
  deviceMemory?: number;
  connection?: EventTarget & { saveData?: boolean; effectiveType?: string };
};

export function supportsHeroWebGL() {
  if (typeof WebGL2RenderingContext === "undefined") return false;
  try {
    const context = document.createElement("canvas").getContext("webgl2", {
      failIfMajorPerformanceCaveat: true,
      powerPreference: "low-power",
      antialias: false,
    });
    if (!context) return false;
    context.getExtension("WEBGL_lose_context")?.loseContext();
    return true;
  } catch {
    return false;
  }
}

/** One disposable owner per SSR shell; Three.js is imported only after eligibility. */
export class SystemsHeroController {
  private readonly viewport: HTMLElement;
  private readonly pause: HTMLButtonElement;
  private readonly abort = new AbortController();
  private readonly reduced = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  );
  private readonly compact = window.matchMedia("(max-width: 63.999rem)");
  private readonly fine = window.matchMedia(
    "(hover: hover) and (pointer: fine)",
  );
  private readonly intersection: IntersectionObserver;
  private readonly resize: ResizeObserver;
  private readonly theme: MutationObserver;
  private readonly enabled: MutationObserver;
  private scene?: SystemsScene;
  private requestedTier?: SceneTier;
  private visible = false;
  private suspended = false;
  private paused = false;
  private failed = "";
  private webgl?: boolean;
  private disposed = false;
  private loading = false;
  private generation = 0;
  private idle?: number;

  constructor(
    private readonly host: HTMLElement,
    private readonly load: () => Promise<SceneModule> = () =>
      import("./systems-scene"),
    private readonly probe: () => boolean = supportsHeroWebGL,
  ) {
    const viewport = host.querySelector<HTMLElement>("[data-hero-viewport]");
    const pause = host.querySelector<HTMLButtonElement>("[data-hero-pause]");
    if (!viewport || !pause)
      throw new Error("Systems hero shell is incomplete");
    this.viewport = viewport;
    this.pause = pause;
    const options = { signal: this.abort.signal };
    this.intersection = new IntersectionObserver(
      (entries) => {
        this.visible = entries.some(
          (entry) => entry.isIntersecting && entry.intersectionRatio > 0,
        );
        this.reconcile();
      },
      { threshold: [0, 0.01] },
    );
    this.intersection.observe(viewport);
    this.resize = new ResizeObserver(() => {
      this.scene?.resize();
    });
    this.resize.observe(viewport);
    this.theme = new MutationObserver(() => {
      this.scene?.setTheme(this.palette());
    });
    this.theme.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme", "class"],
    });
    this.enabled = new MutationObserver(() => this.reconcile());
    this.enabled.observe(host, {
      attributes: true,
      attributeFilter: ["data-hero-enabled"],
    });
    [this.reduced, this.compact, this.fine].forEach((query) =>
      query.addEventListener("change", () => this.reconcile(), options),
    );
    (navigator as Device).connection?.addEventListener?.(
      "change",
      () => this.reconcile(),
      options,
    );
    document.addEventListener(
      "visibilitychange",
      () => this.reconcile(),
      options,
    );
    window.addEventListener(
      "pagehide",
      () => {
        this.suspended = true;
        this.release("suspended");
      },
      options,
    );
    window.addEventListener(
      "pageshow",
      () => {
        this.suspended = false;
        this.reconcile();
      },
      options,
    );
    pause.addEventListener(
      "click",
      () => {
        this.paused = !this.paused;
        this.sync();
      },
      options,
    );
    viewport.addEventListener(
      "pointermove",
      (event) => {
        if (
          !this.fine.matches ||
          this.requestedTier !== "full" ||
          event.pointerType !== "mouse"
        )
          return;
        const bounds = viewport.getBoundingClientRect();
        this.scene?.setPointer(
          ((event.clientX - bounds.left) / bounds.width) * 2 - 1,
          ((event.clientY - bounds.top) / bounds.height) * 2 - 1,
        );
      },
      { ...options, passive: true },
    );
    viewport.addEventListener(
      "pointerleave",
      () => this.scene?.setPointer(0, 0),
      options,
    );
    this.reconcile();
  }

  private palette(): ScenePalette {
    const style = getComputedStyle(document.documentElement);
    const value = (name: string) => style.getPropertyValue(`--${name}`).trim();
    return {
      card: value("card"),
      muted: value("muted"),
      primary: value("primary"),
      secondary: value("secondary"),
      border: value("border"),
      input: value("input"),
      warm: value("warm-decorative"),
    };
  }
  private cancelLoad() {
    this.generation++;
    this.loading = false;
    if (this.idle !== undefined) {
      if (window.cancelIdleCallback) window.cancelIdleCallback(this.idle);
      else clearTimeout(this.idle);
      this.idle = undefined;
    }
  }
  private release(reason: string) {
    this.cancelLoad();
    this.scene?.dispose();
    this.scene = undefined;
    this.requestedTier = undefined;
    this.host.dataset.heroStatus = "static";
    this.host.dataset.heroReason = reason;
    this.host.dataset.heroActivity = "idle";
    delete this.host.dataset.heroTier;
    const focused = document.activeElement === this.pause;
    this.pause.hidden = true;
    if (focused)
      this.host
        .closest("#hero")
        ?.querySelector<HTMLAnchorElement>(".hero-actions a")
        ?.focus({ preventScroll: true });
  }
  private fallback(reason: string) {
    this.failed = reason;
    this.release(reason);
  }
  private sync() {
    if (!this.scene) return;
    const running =
      this.visible &&
      !this.suspended &&
      document.visibilityState === "visible" &&
      !this.paused;
    this.scene.setRunning(running);
    this.host.dataset.heroActivity = running ? "running" : "paused";
    this.pause.hidden = false;
    this.pause.setAttribute(
      "aria-label",
      this.paused ? "Resume scene motion" : "Pause scene motion",
    );
    const label = this.pause.querySelector("[data-hero-pause-label]");
    if (label) label.textContent = this.paused ? "Resume" : "Pause";
    const icon = this.pause.querySelector(".systems-pause-icon");
    if (icon) icon.setAttribute("data-state", this.paused ? "paused" : "running");
  }
  private reconcile() {
    if (this.disposed) return;
    const device = navigator as Device;
    const policy = scenePolicy({
      enabled: this.host.dataset.heroEnabled !== "false",
      reduced: this.reduced.matches,
      compact: this.compact.matches,
      fine: this.fine.matches,
      cores: device.hardwareConcurrency,
      memory: device.deviceMemory,
      saveData: device.connection?.saveData,
      connection: device.connection?.effectiveType,
    });
    if (policy.tier === "static" || this.failed || this.suspended) {
      this.release(
        this.failed || (this.suspended ? "suspended" : policy.reason),
      );
      return;
    }
    if (this.scene && this.requestedTier !== policy.tier)
      this.release("responsive-change");
    if (!this.visible || document.visibilityState !== "visible") {
      if (this.loading) this.cancelLoad();
      this.sync();
      return;
    }
    if (this.scene) {
      this.sync();
      return;
    }
    if (this.loading) return;
    this.webgl ??= this.probe();
    if (!this.webgl) {
      this.fallback("webgl-unavailable");
      return;
    }
    const ticket = ++this.generation;
    this.loading = true;
    this.host.dataset.heroStatus = "loading";
    const start = () => {
      this.idle = undefined;
      void this.mount(ticket, policy.tier as SceneTier);
    };
    this.idle = window.requestIdleCallback
      ? window.requestIdleCallback(start, { timeout: 1500 })
      : window.setTimeout(start, 200);
  }
  private async mount(ticket: number, tier: SceneTier) {
    try {
      const module = await this.load();
      if (this.disposed || ticket !== this.generation || !this.host.isConnected)
        return;
      this.scene = module.createSystemsScene(
        this.viewport,
        tier,
        this.palette(),
        {
          fallback: (reason) => this.fallback(reason),
          tier: (next) => {
            this.host.dataset.heroTier = next;
          },
        },
      );
      this.requestedTier = tier;
      this.loading = false;
      this.host.dataset.heroStatus = "ready";
      this.host.dataset.heroReason = "eligible";
      this.host.dataset.heroTier = tier;
      this.sync();
    } catch {
      if (ticket === this.generation && !this.disposed)
        this.fallback("initialization-failed");
    }
  }
  diagnostics() {
    return {
      status: this.host.dataset.heroStatus,
      reason: this.host.dataset.heroReason,
      disposed: this.disposed,
      loading: this.loading,
      paused: this.paused,
      scene: this.scene?.diagnostics() ?? null,
    };
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.release("disposed");
    this.abort.abort();
    this.intersection.disconnect();
    this.resize.disconnect();
    this.theme.disconnect();
    this.enabled.disconnect();
  }
}
