/**
 * Homepage motion. One ease and one pace for everything that enters, so the
 * page moves like one thing; scrubbed sequences are linear because the
 * scrollbar is already the easing.
 *
 * Nothing here is needed to read the page. Everything is created inside one
 * GSAP context and undone by the function this returns.
 */
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { resetStagePose, type StagePose } from "./stage-pose";

gsap.registerPlugin(ScrollTrigger, SplitText);

const EASE = "expo.out";
const PACE = 1.1;

export interface HomeMotionOptions {
  /** The visit is a return (back/forward, or a link to a section): no entrance. */
  restored: boolean;
}

export function createHomeMotion(root: HTMLElement, pose: StagePose, options: HomeMotionOptions): () => void {
  const cleanups: Array<() => void> = [];
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const one = <T extends Element = HTMLElement>(selector: string) => root.querySelector<T>(selector);
  const all = <T extends Element = HTMLElement>(selector: string) => Array.from(root.querySelectorAll<T>(selector));
  const listen = <K extends keyof HTMLElementEventMap>(target: HTMLElement, type: K, handler: (event: HTMLElementEventMap[K]) => void) => {
    target.addEventListener(type, handler, { passive: true });
    cleanups.push(() => target.removeEventListener(type, handler));
  };

  const context = gsap.context(() => {
    const hero = one("[data-hero]");
    const title = one("[data-hero-title]");

    // ---- Entrance: the sentence arrives a line at a time, its three small
    // pictures land after their words, and the braces open around the facts.
    if (hero && title) {
      const notes = all("[data-hero] [data-intro]");
      const tokens = all("[data-hero-title] .token");
      const facts = all("[data-hero-facts] > div");
      if (options.restored) {
        gsap.set([title, ...notes], { opacity: 1 });
      } else {
        gsap.set(pose.hero, { scale: 0, open: -1, turn: -1.2 });
        gsap.set(title, { opacity: 1 });
        const timeline = gsap.timeline({ defaults: { ease: EASE, duration: PACE } });
        SplitText.create(title, {
          type: "lines",
          mask: "lines",
          linesClass: "line",
          aria: "none",
          onSplit: (self) => {
            timeline.from(self.lines, { yPercent: 108, stagger: 0.085 }, 0.05);
            // Hand the sentence back to the page once it has arrived, so it
            // wraps freely at any width.
            timeline.call(() => self.revert(), undefined, ">");
          },
        });
        timeline
          .from(tokens, { scale: 0, rotate: "-=30", duration: 0.75, ease: "back.out(2.2)", stagger: 0.12, clearProps: "scale,rotate" }, 0.55)
          .fromTo(notes, { y: 22, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.1, clearProps: "transform" }, 0.5)
          .to(pose.hero, { scale: 1, turn: 0, duration: 0.95, ease: "back.out(1.4)" }, 0.5)
          .to(pose.hero, { open: 0, duration: 1.15 }, 0.8)
          // The facts appear in the space the braces open.
          .fromTo(facts, { y: 12, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, stagger: 0.07, clearProps: "transform" }, 1.15);
      }

      // ---- Leaving the first screen, the braces turn edge-on to let the
      // page through.
      gsap.to(pose.hero, {
        away: 1,
        ease: "none",
        scrollTrigger: { trigger: hero, start: "top top", end: "bottom top", scrub: 0.6 },
      });
    }

    // ---- Headings arrive a line at a time, from behind their own baseline.
    all("[data-lines]").forEach((heading) => {
      SplitText.create(heading, {
        type: "lines",
        mask: "lines",
        linesClass: "line",
        aria: "none",
        autoSplit: true,
        onSplit: (self) =>
          gsap.from(self.lines, {
            yPercent: 108,
            duration: PACE,
            ease: EASE,
            stagger: 0.09,
            scrollTrigger: { trigger: heading, start: "top 88%", once: true },
          }),
      });
    });

    // ---- The about paragraph fills in as it is read.
    const statement = one("[data-words]");
    if (statement) {
      const split = SplitText.create(statement, { type: "words", aria: "none" });
      gsap.fromTo(
        split.words,
        { opacity: 0.18 },
        { opacity: 1, ease: "none", stagger: 0.12, scrollTrigger: { trigger: statement, start: "top 82%", end: "bottom 55%", scrub: 0.5 } },
      );
    }

    // ---- Everything else rises into place; rules draw from the left.
    const rises = all("[data-rise]");
    gsap.set(rises, { y: 28, opacity: 0 });
    ScrollTrigger.batch(rises, {
      start: "top 92%",
      once: true,
      onEnter: (batch) => gsap.to(batch, { y: 0, opacity: 1, duration: PACE, ease: EASE, stagger: 0.07, overwrite: true, clearProps: "transform" }),
    });
    all("[data-rule]").forEach((rule) => {
      gsap.from(rule, { scaleX: 0, duration: 1.4, ease: EASE, scrollTrigger: { trigger: rule, start: "top 94%", once: true } });
    });

    // ---- Windows open upward as they come into view.
    all(".featured-projects .project-visual").forEach((frame) => {
      gsap.from(frame, {
        clipPath: "inset(100% 0% 0% 0% round 14px)",
        y: 48,
        duration: 1.35,
        ease: EASE,
        clearProps: "clipPath,transform",
        scrollTrigger: { trigger: frame, start: "top 90%", once: true },
      });
    });

    // ---- Last screen: the braces come in from the wings and close around
    // the invitation.
    const closing = one("[data-closing]");
    if (closing) {
      gsap.set(pose.closing, { spread: 1.1, turn: 2.2, scale: 0.7 });
      gsap.to(pose.closing, {
        spread: 0,
        turn: 0,
        scale: 1,
        ease: "power2.out",
        scrollTrigger: { trigger: closing, start: "top 85%", end: "top 22%", scrub: 0.7 },
      });
      const invitation = one("[data-closing-word]");
      if (invitation) {
        const letters = SplitText.create(invitation, { type: "chars", mask: "chars", aria: "none" });
        gsap.from(letters.chars, {
          yPercent: 108,
          duration: 1.2,
          ease: EASE,
          stagger: { each: 0.04, from: "center" },
          scrollTrigger: { trigger: closing, start: "top 62%", once: true },
        });
      }
      gsap.from(all("[data-closing-rise]"), { y: 26, opacity: 0, duration: PACE, ease: EASE, stagger: 0.12, scrollTrigger: { trigger: closing, start: "top 55%", once: true } });
    }

    // ---- The main actions lean toward the pointer.
    if (finePointer) {
      all("[data-magnetic]").forEach((button) => {
        const x = gsap.quickTo(button, "x", { duration: 0.5, ease: "power3.out" });
        const y = gsap.quickTo(button, "y", { duration: 0.5, ease: "power3.out" });
        listen(button, "pointermove", (event) => {
          const box = button.getBoundingClientRect();
          x((event.clientX - box.left - box.width / 2) * 0.22);
          y((event.clientY - box.top - box.height / 2) * 0.3);
        });
        listen(button, "pointerleave", () => {
          gsap.to(button, { x: 0, y: 0, duration: 0.9, ease: "elastic.out(1, 0.45)", overwrite: true });
        });
      });
    }
  }, root);

  // Images and web fonts both move things after the first measure.
  const refresh = () => ScrollTrigger.refresh();
  window.addEventListener("load", refresh, { once: true });
  cleanups.push(() => window.removeEventListener("load", refresh));

  return () => {
    cleanups.forEach((cleanup) => cleanup());
    context.revert();
    resetStagePose(pose);
  };
}
