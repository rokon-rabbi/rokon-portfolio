import { commandScore } from "../design/commands";
import { copyText, notice } from "./notice";

// The command menu: a modal dialog holding a search field and a list of the
// site's pages and actions. Focus stays in the field; the arrow keys move a
// selection through the list (the combobox pattern), and Enter presses the
// selected entry, which is a real link or button.
const dialog = document.querySelector<HTMLDialogElement>("[data-command]");
const input = dialog?.querySelector<HTMLInputElement>("[data-command-input]");
const list = dialog?.querySelector<HTMLElement>("[data-command-list]");

if (dialog && input && list && typeof dialog.showModal === "function") {
  const options = Array.from(
    list.querySelectorAll<HTMLElement>('[role="option"]'),
  ).map((element) => ({
    element,
    label:
      element.querySelector("[data-command-label]")?.textContent ??
      element.textContent ??
      "",
    keywords: element.dataset.keywords ?? "",
  }));
  const groups = list.querySelectorAll<HTMLElement>("[data-command-group]");
  const empty = list.querySelector<HTMLElement>("[data-command-empty]");
  const triggers = document.querySelectorAll<HTMLButtonElement>(
    "[data-command-open]",
  );
  let active: HTMLElement | undefined;

  const visible = () =>
    options.filter((option) => !option.element.hidden).map((o) => o.element);
  function select(element: HTMLElement | undefined, scroll = true) {
    active?.setAttribute("aria-selected", "false");
    active = element;
    if (!element) {
      input!.removeAttribute("aria-activedescendant");
      return;
    }
    element.setAttribute("aria-selected", "true");
    input!.setAttribute("aria-activedescendant", element.id);
    if (scroll) element.scrollIntoView({ block: "nearest" });
  }
  // The list keeps its order and its groups; a query hides what does not
  // match and selects the entry that answers it best.
  function filter() {
    let best: { element: HTMLElement; score: number } | undefined;
    for (const option of options) {
      const score = commandScore(option.label, option.keywords, input!.value);
      option.element.hidden = score === null;
      if (score !== null && (!best || score < best.score))
        best = { element: option.element, score };
    }
    groups.forEach((group) => {
      group.hidden = !group.querySelector('[role="option"]:not([hidden])');
    });
    if (empty) empty.hidden = !!best;
    list!.scrollTop = 0;
    select(best?.element, false);
  }
  function open() {
    if (dialog!.open) return;
    input!.value = "";
    filter();
    dialog!.showModal();
    input!.focus();
    triggers.forEach((trigger) => trigger.setAttribute("aria-expanded", "true"));
  }
  const close = () => {
    if (dialog!.open) dialog!.close();
  };

  // What an action entry does. Each one runs after the menu has closed and
  // the browser has handed focus back to the page.
  const actions: Record<string, (option: HTMLElement) => void> = {
    "copy-email": async (option) => {
      const address = option.dataset.copy;
      if (!address) return;
      notice(
        (await copyText(address))
          ? "Email address copied"
          : `Copying is unavailable here. The address is ${address}`,
      );
    },
    "toggle-theme": () =>
      document.querySelector<HTMLElement>("[data-theme-toggle]")?.click(),
    appearance: () =>
      document.querySelector<HTMLElement>("[data-settings-toggle]")?.click(),
  };

  input.addEventListener("input", filter);
  input.addEventListener("keydown", (event) => {
    const shown = visible();
    const at = active ? shown.indexOf(active) : -1;
    const move = (index: number) => {
      event.preventDefault();
      if (shown.length) select(shown[(index + shown.length) % shown.length]);
    };
    if (event.key === "ArrowDown") move(at + 1);
    else if (event.key === "ArrowUp") move(at <= 0 ? shown.length - 1 : at - 1);
    else if (event.key === "Home" && shown.length) move(0);
    else if (event.key === "End" && shown.length) move(shown.length - 1);
    else if (event.key === "Enter" && !event.isComposing) {
      event.preventDefault();
      // A modifier held with Enter opens a link the way the browser would.
      active?.dispatchEvent(
        new MouseEvent("click", {
          bubbles: true,
          cancelable: true,
          ctrlKey: event.ctrlKey,
          metaKey: event.metaKey,
          shiftKey: event.shiftKey,
        }),
      );
    }
  });
  list.addEventListener("pointermove", (event) => {
    const option = (event.target as Element).closest<HTMLElement>(
      '[role="option"]',
    );
    if (option && option !== active) select(option, false);
  });
  list.addEventListener("click", (event) => {
    const option = (event.target as Element).closest<HTMLElement>(
      '[role="option"]',
    );
    if (!option) return;
    const run = option.dataset.commandAction
      ? actions[option.dataset.commandAction]
      : undefined;
    close();
    if (run) setTimeout(() => run(option), 0);
  });
  // A press on the dimmed page behind the menu closes it, and the page
  // holds still under a wheel or a finger that is on it.
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) close();
  });
  for (const type of ["wheel", "touchmove"] as const)
    dialog.addEventListener(
      type,
      (event) => {
        if (event.target === dialog) event.preventDefault();
      },
      { passive: false },
    );
  dialog.addEventListener("close", () => {
    select(undefined);
    triggers.forEach((trigger) => trigger.setAttribute("aria-expanded", "false"));
  });

  // Ctrl+K or ⌘K, from anywhere on the page, opens it and closes it again.
  document.addEventListener("keydown", (event) => {
    if (event.defaultPrevented || event.altKey || event.shiftKey) return;
    if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "k")
      return;
    event.preventDefault();
    if (dialog.open) close();
    else open();
  });

  // The header button names the shortcut as this device types it.
  const apple = /mac|iphone|ipad/i.test(
    (navigator as Navigator & { userAgentData?: { platform?: string } })
      .userAgentData?.platform ?? navigator.platform,
  );
  triggers.forEach((trigger) => {
    const key = trigger.querySelector("[data-command-key]");
    if (key && apple) key.textContent = "⌘K";
    trigger.hidden = false;
    trigger.addEventListener("click", open);
  });
}
