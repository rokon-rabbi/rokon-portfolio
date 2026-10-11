const mounted = new Map<HTMLElement, () => void>();
function mount() {
  document
    .querySelectorAll<HTMLElement>(".publication-article")
    .forEach((article) => {
      if (mounted.has(article)) return;
      const abort = new AbortController();
      const timers = new Set<ReturnType<typeof setTimeout>>();
      const buttons =
        article.querySelectorAll<HTMLButtonElement>("[data-copy-code]");
      buttons.forEach((button) => {
        button.hidden = false;
      });
      article.addEventListener(
        "click",
        async (event) => {
          const button = (event.target as Element)?.closest<HTMLButtonElement>(
            "[data-copy-code]",
          );
          if (!button || !article.contains(button)) return;
          const block = button.closest<HTMLElement>("[data-code-block]")!;
          const status =
            block.querySelector<HTMLElement>("[data-copy-status]")!;
          const text = block.querySelector("code")?.textContent;
          if (!text) return;
          button.disabled = true;
          try {
            if (!navigator.clipboard?.writeText)
              throw new Error("Clipboard unavailable");
            await navigator.clipboard.writeText(text);
            if (abort.signal.aborted) return;
            button.textContent = "Copied";
            status.textContent = "Code copied to clipboard.";
          } catch {
            if (abort.signal.aborted) return;
            button.textContent = "Select code";
            status.textContent =
              "Copy unavailable. Select the code and copy it manually.";
          }
          button.disabled = false;
          const timer = setTimeout(() => {
            button.textContent = "Copy code";
            status.textContent = "";
            timers.delete(timer);
          }, 2500);
          timers.add(timer);
        },
        { signal: abort.signal },
      );
      mounted.set(article, () => {
        abort.abort();
        timers.forEach(clearTimeout);
      });
    });
}
function dispose() {
  mounted.forEach((cleanup) => cleanup());
  mounted.clear();
}
mount();
document.addEventListener("astro:before-swap", dispose);
document.addEventListener("astro:page-load", mount);
if (import.meta.hot) import.meta.hot.dispose(dispose);
