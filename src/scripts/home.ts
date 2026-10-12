/**
 * Homepage enhancement. The page is complete without any of this. GSAP and
 * three.js are fetched only when motion is welcome; the entrance waits a
 * moment for the scene so both start together, and goes ahead without it if
 * the scene is slow or unavailable.
 */
import { createStagePose } from "../lib/stage-pose";
import type { BraceScene } from "../lib/brace-scene";

const root = document.documentElement;
const page = document.getElementById("main-content");
const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
const pose = createStagePose();
let scene: BraceScene | undefined;
let disposeMotion: (() => void) | undefined;
let generation = 0;

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
const returning =
  !!location.hash || performance.getEntriesByType("navigation").some((entry) => (entry as PerformanceNavigationTiming).type === "back_forward");

function dropScene() {
  scene?.dispose();
  scene = undefined;
  root.classList.remove("stage-live");
}

/** Resolves once the scene has drawn, or straight away if there is none. */
async function startScene(ticket: number) {
  const host = document.querySelector<HTMLElement>("[data-stage]");
  const figure = document.querySelector<HTMLElement>("[data-anchor='figure']");
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  if (!host || !figure || !host.dataset.photo || connection?.saveData) return;
  try {
    const { createBraceScene } = await import("../lib/brace-scene");
    if (ticket !== generation || reduced.matches) return;
    await new Promise<void>((resolve) => {
      scene = createBraceScene(host, {
        figure,
        closing: document.querySelector<HTMLElement>("[data-anchor='closing']"),
        photo: host.dataset.photo!,
        pose,
        onReady: () => {
          if (ticket === generation) root.classList.add("stage-live");
          resolve();
        },
        onUnavailable: () => {
          dropScene();
          resolve();
        },
      });
      if (!scene) resolve();
    });
  } catch (error) {
    console.warn("The scene is unavailable; the page shows its own picture.", error);
    dropScene();
  }
}

async function start(restored: boolean) {
  if (!page || reduced.matches) {
    root.classList.remove("intro-pending");
    return;
  }
  const ticket = ++generation;
  try {
    const sceneReady = startScene(ticket);
    const [{ createHomeMotion }] = await Promise.all([import("../lib/home-motion"), document.fonts.ready, Promise.race([sceneReady, wait(1200)])]);
    if (ticket !== generation || reduced.matches) return;
    disposeMotion = createHomeMotion(page, pose, { restored });
  } catch (error) {
    console.warn("Motion unavailable; the finished page remains.", error);
  } finally {
    root.classList.remove("intro-pending");
  }
}

function stop() {
  generation++;
  disposeMotion?.();
  disposeMotion = undefined;
  dropScene();
}

void start(returning);
reduced.addEventListener("change", () => {
  stop();
  void start(true);
});
window.addEventListener("pagehide", stop);
window.addEventListener("pageshow", (event) => {
  if (event.persisted) void start(true);
});
if (import.meta.hot) import.meta.hot.dispose(stop);
