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
import type { StagePose } from "./stage-pose";

gsap.registerPlugin(ScrollTrigger, SplitText);

const EASE = "expo.out";
const PACE = 1.15;

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
    const cover = one("[data-cover]");
    const word = one("[data-cover-word]");
    const figure = one("[data-cover-figure]");
    const glow = one("[data-cover-glow]");

    // ---- Entrance: the name rises letter by letter from the middle out, he
    // steps up into it, and the braces swing open either side of him.
    if (cover && word && figure) {
      const letters = SplitText.create(word, { type: "chars", mask: "chars", aria: "none" });
      const notes = all(".cover [data-intro]");
      if (options.restored) {
        gsap.set([word, figure, glow, ...notes], { opacity: 1 });
      } else {
        gsap.set(pose.hero, { scale: 0, open: -0.26, turn: -2.6, figure: 0 });
        gsap
          .timeline({ defaults: { ease: EASE, duration: PACE } })
          .set([word, figure], { opacity: 1 })
          .from(letters.chars, { yPercent: 108, duration: 1.3, stagger: { each: 0.04, from: "center" } }, 0.05)
          .fromTo(glow, { opacity: 0, scale: 0.7 }, { opacity: 1, scale: 1, duration: 1.8 }, 0.1)
          .from(figure, { y: () => figure.offsetHeight * 0.08, duration: 1.4 }, 0.3)
          .from(".cover-photo, .cover-brace", { autoAlpha: 0, duration: 0.9, ease: "power2.out" }, 0.3)
          .to(pose.hero, { figure: 1, duration: 0.9, ease: "power2.out" }, 0.3)
          .to(pose.hero, { scale: 1, duration: 1.2, ease: "back.out(1.5)" }, 0.5)
          .to(pose.hero, { open: 0, turn: 0, duration: 1.6 }, 0.5)
          .fromTo(notes, { y: 28, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.07 }, 0.75);
      }

      // ---- Leaving the cover: the name climbs away, he lags behind the
      // scroll, and the braces part and turn as if to let the page through.
      gsap
        .timeline({ defaults: { ease: "none" }, scrollTrigger: { trigger: cover, start: "top top", end: "bottom top", scrub: 0.6 } })
        .to(word, { yPercent: -34 }, 0)
        .to(figure, { yPercent: 10 }, 0)
        .to(pose.hero, { away: 1 }, 0)
        .to(".cover-notes, .cover-scroll", { yPercent: -30, autoAlpha: 0, duration: 0.45 }, 0)
        .to(glow, { scale: 1.3 }, 0);
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
            yPercent: 110,
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
        { opacity: 0.16 },
        { opacity: 1, ease: "none", stagger: 0.12, scrollTrigger: { trigger: statement, start: "top 80%", end: "bottom 52%", scrub: 0.5 } },
      );
    }

    // ---- Everything else rises into place; rules draw from the left.
    const rises = all("[data-rise]");
    gsap.set(rises, { y: 34, opacity: 0 });
    ScrollTrigger.batch(rises, {
      start: "top 90%",
      once: true,
      onEnter: (batch) => gsap.to(batch, { y: 0, opacity: 1, duration: PACE, ease: EASE, stagger: 0.08, overwrite: true }),
    });
    all("[data-rule]").forEach((rule) => {
      gsap.from(rule, { scaleX: 0, duration: 1.5, ease: EASE, scrollTrigger: { trigger: rule, start: "top 92%", once: true } });
    });

    // ---- Code windows wipe open, then lean toward the pointer.
    all("[data-tilt]").forEach((wrap) => {
      const panel = wrap.querySelector<HTMLElement>("[data-window]");
      if (!panel) return;
      gsap.from(panel, {
        clipPath: "inset(100% 0% 0% 0% round 18px)",
        y: 56,
        duration: 1.4,
        ease: EASE,
        clearProps: "clipPath",
        scrollTrigger: { trigger: wrap, start: "top 86%", once: true },
      });
      if (!finePointer) return;
      const turn = gsap.quickTo(panel, "rotationY", { duration: 0.7, ease: "power3.out" });
      const tip = gsap.quickTo(panel, "rotationX", { duration: 0.7, ease: "power3.out" });
      listen(wrap, "pointermove", (event) => {
        const box = wrap.getBoundingClientRect();
        const x = (event.clientX - box.left) / box.width;
        const y = (event.clientY - box.top) / box.height;
        turn((x - 0.5) * 9);
        tip((0.5 - y) * 7);
        panel.style.setProperty("--light-x", `${(x * 100).toFixed(1)}%`);
        panel.style.setProperty("--light-y", `${(y * 100).toFixed(1)}%`);
      });
      listen(wrap, "pointerleave", () => {
        turn(0);
        tip(0);
      });
    });

    // ---- The two lines of names drift past each other; scrolling pushes
    // them along and scrolling back reverses them.
    const marquee = one("[data-marquee]");
    if (marquee) {
      const loops = all("[data-marquee-row]").map((row) => {
        const forward = row.dataset.direction !== "-1";
        const third = -100 / 3;
        const loop = gsap.fromTo(row, { xPercent: forward ? 0 : third }, { xPercent: forward ? third : 0, duration: 46, ease: "none", repeat: -1 });
        // Room to run backwards without reaching the start.
        loop.totalTime(loop.duration() * 50);
        return loop;
      });
      let heading = 1;
      let speed = 1;
      const drift = () => {
        speed += (heading - speed) * 0.045;
        loops.forEach((loop) => loop.timeScale(speed));
      };
      gsap.ticker.add(drift);
      cleanups.push(() => gsap.ticker.remove(drift));
      ScrollTrigger.create({
        trigger: marquee,
        start: "top bottom",
        end: "bottom top",
        onToggle: (self) => loops.forEach((loop) => (self.isActive ? loop.resume() : loop.pause())),
        onUpdate: (self) => {
          const velocity = self.getVelocity();
          heading = velocity < 0 ? -1 : 1;
          speed = heading * (1 + Math.min(Math.abs(velocity) / 320, 7));
        },
      });
    }

    // ---- Principles stack: each card settles back as the next one lands.
    const cards = all("[data-card]");
    cards.slice(0, -1).forEach((card, index) => {
      const face = card.querySelector<HTMLElement>("[data-card-face]");
      const next = cards[index + 1];
      if (!face || !next) return;
      gsap.to(face, {
        scale: 0.93,
        ease: "none",
        scrollTrigger: { trigger: next, start: "top bottom", end: () => `top ${card.getBoundingClientRect().height * 0.2 + 80}px`, scrub: true, invalidateOnRefresh: true },
      });
    });

    // ---- Last screen: the braces come in from the wings and close around
    // the invitation.
    const closing = one("[data-closing]");
    if (closing) {
      gsap.set(pose.closing, { open: 1.15, turn: 2.2, scale: 0.7 });
      gsap.to(pose.closing, {
        open: 0,
        turn: 0,
        scale: 1,
        ease: "power2.out",
        scrollTrigger: { trigger: closing, start: "top 85%", end: "top 12%", scrub: 0.7 },
      });
      const inner = one("[data-closing-inner]");
      // It was underneath the whole time; it rises as the sheet uncovers it.
      if (inner) gsap.from(inner, { yPercent: -22, ease: "none", scrollTrigger: { trigger: closing, start: "top bottom", end: "top top", scrub: true } });
      const invitation = one("[data-closing-word]");
      if (invitation) {
        const letters = SplitText.create(invitation, { type: "chars", mask: "chars", aria: "none" });
        gsap.from(letters.chars, {
          yPercent: 108,
          duration: 1.3,
          ease: EASE,
          stagger: { each: 0.045, from: "center" },
          scrollTrigger: { trigger: closing, start: "top 55%", once: true },
        });
      }
      const rest = all("[data-closing-rise]");
      gsap.from(rest, { y: 30, opacity: 0, duration: PACE, ease: EASE, stagger: 0.12, scrollTrigger: { trigger: closing, start: "top 50%", once: true } });
    }

    // ---- The main actions lean toward the pointer.
    if (finePointer) {
      all("[data-magnetic]").forEach((button) => {
        const x = gsap.quickTo(button, "x", { duration: 0.5, ease: "power3.out" });
        const y = gsap.quickTo(button, "y", { duration: 0.5, ease: "power3.out" });
        listen(button, "pointermove", (event) => {
          const box = button.getBoundingClientRect();
          x((event.clientX - box.left - box.width / 2) * 0.28);
          y((event.clientY - box.top - box.height / 2) * 0.36);
        });
        listen(button, "pointerleave", () => {
          gsap.to(button, { x: 0, y: 0, duration: 0.9, ease: "elastic.out(1, 0.45)", overwrite: true });
        });
      });
    }
  }, root);

  // Sticky cards and web fonts both move things after the first measure.
  const refresh = () => ScrollTrigger.refresh();
  window.addEventListener("load", refresh, { once: true });
  cleanups.push(() => window.removeEventListener("load", refresh));

  return () => {
    cleanups.forEach((cleanup) => cleanup());
    context.revert();
    Object.assign(pose.hero, { scale: 1, open: 0, turn: 0, away: 0, figure: 1 });
    Object.assign(pose.closing, { scale: 1, open: 0, turn: 0 });
  };
}
