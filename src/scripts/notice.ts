// One short line at the foot of the window, saying what just happened. The
// element is a polite live region that Layout always renders, so the same
// words reach a screen reader.
let timer: ReturnType<typeof setTimeout> | undefined;

export function notice(message: string) {
  const line = document.querySelector<HTMLElement>("[data-notice]");
  if (!line) return;
  clearTimeout(timer);
  line.textContent = message;
  line.dataset.show = "";
  timer = setTimeout(() => {
    delete line.dataset.show;
  }, 2200);
}

/** Resolves to whether the text reached the clipboard. */
export async function copyText(text: string) {
  try {
    if (!navigator.clipboard?.writeText) return false;
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
