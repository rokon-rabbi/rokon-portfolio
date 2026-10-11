import { filterArticles, type ArticleSummary } from "../lib/blog-publication";

const owners = new Map<HTMLElement, () => void>();
function mount() {
  document
    .querySelectorAll<HTMLElement>("[data-blog-archive]")
    .forEach((host) => {
      if (owners.has(host)) return;
      const form = host.querySelector<HTMLFormElement>("[data-blog-search]");
      if (!form) return;
      const abort = new AbortController();
      let timer: ReturnType<typeof setTimeout> | undefined;
      owners.set(host, () => {
        abort.abort();
        clearTimeout(timer);
      });
      void fetch("/blog/search-index.json", { signal: abort.signal })
        .then(async (response) => {
          if (!response.ok) throw new Error("Article index unavailable");
          const posts: ArticleSummary[] = await response.json();
          if (abort.signal.aborted || !host.isConnected) return;
          const query = form.querySelector<HTMLInputElement>("[name=q]")!;
          const topic = form.querySelector<HTMLSelectElement>("[name=topic]")!;
          const results = host.querySelector<HTMLElement>(
            "[data-blog-results]",
          )!;
          const initial = new URL(location.href).searchParams;
          query.value = (initial.get("q") ?? "").slice(0, 200);
          topic.value = initial.get("topic") ?? "";
          function apply(updateURL = true) {
            const matches = new Set(
              filterArticles(posts, {
                query: query.value,
                topic: topic.value,
                tag: host.dataset.baseTag,
              }).map((post) => post.id),
            );
            host
              .querySelectorAll<HTMLElement>("[data-blog-entry]")
              .forEach((entry) => {
                entry.hidden = !matches.has(entry.dataset.blogEntry!);
              });
            host
              .querySelectorAll<HTMLElement>("[data-archive-group]")
              .forEach((group) => {
                group.hidden = !group.querySelector(
                  "[data-blog-entry]:not([hidden])",
                );
              });
            host.querySelector<HTMLElement>("[data-search-empty]")!.hidden =
              matches.size !== 0;
            results.textContent = `${matches.size} ${matches.size === 1 ? "note" : "notes"}${query.value.trim() || topic.value ? " found" : ""}`;
            if (updateURL) {
              const url = new URL(location.href);
              query.value.trim()
                ? url.searchParams.set("q", query.value.trim())
                : url.searchParams.delete("q");
              topic.value
                ? url.searchParams.set("topic", topic.value)
                : url.searchParams.delete("topic");
              history.replaceState(history.state, "", url);
            }
          }
          form.hidden = false;
          apply(false);
          form.addEventListener(
            "submit",
            (event) => {
              event.preventDefault();
              clearTimeout(timer);
              apply();
            },
            { signal: abort.signal },
          );
          form.addEventListener(
            "input",
            () => {
              clearTimeout(timer);
              timer = setTimeout(() => apply(), 120);
            },
            { signal: abort.signal },
          );
          form.addEventListener(
            "change",
            () => {
              clearTimeout(timer);
              apply();
            },
            { signal: abort.signal },
          );
          const reset = () => {
            clearTimeout(timer);
            query.value = "";
            topic.value = "";
            apply();
          };
          form.addEventListener(
            "reset",
            (event) => {
              event.preventDefault();
              reset();
            },
            { signal: abort.signal },
          );
          host.querySelector("[data-search-reset]")?.addEventListener(
            "click",
            () => {
              reset();
              query.focus();
            },
            { signal: abort.signal },
          );
          window.addEventListener("pageshow", () => apply(false), {
            signal: abort.signal,
          });
        })
        .catch(() => {
          /* SSR cards and native tag links remain complete. */
        });
    });
}
function dispose() {
  owners.forEach((cleanup) => cleanup());
  owners.clear();
}
mount();
document.addEventListener("astro:before-swap", dispose);
document.addEventListener("astro:page-load", mount);
if (import.meta.hot) import.meta.hot.dispose(dispose);
