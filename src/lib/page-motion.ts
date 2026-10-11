import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { MOTION, allowParallax } from "../design/motion";

gsap.registerPlugin(ScrollTrigger);

/** One owner per page. No React hydration is needed for motion annotations. */
export function createPageMotion(
  root: HTMLElement,
  seen: WeakSet<Element>,
  restored = false,
) {
  const media = gsap.matchMedia();
  media.add(
    {
      wide: "(min-width: 64rem)",
      compact: "(max-width: 63.999rem)",
      fine: "(hover: hover) and (pointer: fine)",
      reduced: "(prefers-reduced-motion: reduce)",
    },
    (match) => {
      if (match.conditions?.reduced) return;
      const device = navigator as Navigator & {
        deviceMemory?: number;
        connection?: { saveData?: boolean };
      };
      const wide = !!match.conditions?.wide;
      const fine = !!match.conditions?.fine;
      const constrained =
        device.hardwareConcurrency <= 4 ||
        (device.deviceMemory !== undefined && device.deviceMemory <= 4) ||
        !!device.connection?.saveData;
      const preset = wide && !constrained ? MOTION.desktop : MOTION.compact;
      const contextCleanups: (() => void)[] = [];
      const context = gsap.context((scope) => {
        const select = (selector: string) =>
          Array.from(root.querySelectorAll<HTMLElement>(selector));
        const completed = (element: HTMLElement) => {
          seen.add(element);
        };
        const enter = (targets: HTMLElement[], hero = false) => {
          if (!targets.length) return;
          targets.forEach(completed);
          return gsap.fromTo(
            targets,
            {
              y: hero ? preset.heroDistance : preset.distance,
            },
            {
              y: 0,
              duration: preset.duration,
              stagger: preset.stagger,
              ease: MOTION.ease,
              // Return ownership to CSS after each one-shot entrance.
              clearProps: "transform",
            },
          );
        };
        const finishOnFocus = (
          element: HTMLElement,
          trigger?: ScrollTrigger,
        ) => {
          const finish = scope.add("finish", () => {
            trigger?.kill();
            gsap.killTweensOf(element);
            gsap.set(element, { clearProps: "transform" });
            completed(element);
          }) as () => void;
          element.addEventListener("focusin", finish);
          contextCleanups.push(() =>
            element.removeEventListener("focusin", finish),
          );
        };

        const intro = select(
          "[data-motion='hero'], [data-motion='intro']",
        ).filter((element) => {
          const bounds = element.getBoundingClientRect();
          const eligible =
            !seen.has(element) &&
            !restored &&
            !location.hash &&
            window.scrollY < 20;
          completed(element);
          return eligible && bounds.top < innerHeight && bounds.bottom > 0;
        });
        enter(intro, true);
        intro.forEach((element) => finishOnFocus(element));

        for (const element of select("[data-motion='reveal']")) {
          const bounds = element.getBoundingClientRect();
          if (
            seen.has(element) ||
            bounds.bottom <= 0 ||
            (restored && bounds.top < innerHeight)
          ) {
            completed(element);
            continue;
          }
          // Only apply the starting transform on entry. Offscreen content stays
          // completely readable, even if loading fails or a keyboard user jumps.
          const trigger = ScrollTrigger.create({
            trigger: element,
            start: "top 92%",
            once: true,
            onEnter: scope.add("entrance", () => {
              enter([element]);
            }) as () => void,
          });
          // Focusing a link/input must never wait for an entrance to finish.
          finishOnFocus(element, trigger);
        }

        if (wide && !constrained) {
          for (const track of select("[data-motion-track]")) {
            gsap.fromTo(
              track,
              { scaleY: 0 },
              {
                scaleY: 1,
                ease: "none",
                scrollTrigger: {
                  trigger: track.parentElement,
                  start: "top 75%",
                  end: "bottom 55%",
                  scrub: true,
                },
              },
            );
          }
        }

        if (
          allowParallax({
            wide,
            fine,
            cores: device.hardwareConcurrency,
            memory: device.deviceMemory,
            saveData: device.connection?.saveData,
          })
        ) {
          for (const decoration of select("[data-motion-parallax]")) {
            gsap.to(decoration, {
              y: -MOTION.parallaxDistance,
              ease: "none",
              scrollTrigger: {
                trigger: decoration.closest(".hero-stage"),
                start: "top top",
                end: "bottom top",
                scrub: true,
              },
            });
          }
        }
      }, root);
      return () => {
        contextCleanups.splice(0).forEach((cleanup) => cleanup());
        context.revert();
      };
    },
    root,
  );
  return () => media.revert();
}
