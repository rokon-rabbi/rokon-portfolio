import DOMPurify from "dompurify";
import { marked } from "marked";
import { BLOG_TOPICS, readingMinutes } from "../lib/blog-publication";
import {
  createDraft, exportMdx, parseWorkspace, slugFromTitle, WRITING_STORAGE_KEY,
  type WritingDraft, type WritingWorkspace,
} from "../lib/writing-editor";

const host = document.querySelector<HTMLElement>("[data-writing-studio]");
if (host) mount(host);

function mount(host: HTMLElement) {
  const get = <T extends Element>(selector: string) => {
    const element = host.querySelector<T>(selector);
    if (!element) throw new Error(`Writing desk element missing: ${selector}`);
    return element;
  };
  const form = get<HTMLFormElement>("[data-draft-form]");
  const draftsSelect = get<HTMLSelectElement>("[data-drafts]");
  const bodyInput = get<HTMLTextAreaElement>("#studio-body");
  const status = get<HTMLElement>("[data-save-status]");
  const warning = get<HTMLElement>("[data-studio-warning]");
  const error = get<HTMLElement>("[data-studio-error]");
  const author = host.dataset.author || "Md. Rokonuzzaman";
  const first = createDraft(author);
  let workspace: WritingWorkspace = { version: 1, activeId: first.id, drafts: [first] };
  let saveTimer: ReturnType<typeof setTimeout> | undefined;
  let previewTimer: ReturnType<typeof setTimeout> | undefined;
  let dirty = false;
  let persistenceBlocked = false;
  let previousRaw: string | null = null;
  let pendingRestore: WritingWorkspace | null = null;

  function showWarning(message: string) {
    warning.textContent = message;
    warning.hidden = false;
  }
  function showError(message: string) {
    error.textContent = message;
    error.hidden = false;
    error.focus();
  }
  function clearError() { error.hidden = true; error.textContent = ""; }
  function current() { return workspace.drafts.find((draft) => draft.id === workspace.activeId)!; }
  function input(name: string) { return form.elements.namedItem(name) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement; }

  try {
    previousRaw = localStorage.getItem(WRITING_STORAGE_KEY);
    if (previousRaw) workspace = parseWorkspace(previousRaw);
  } catch {
    persistenceBlocked = !!previousRaw;
    showWarning(previousRaw
      ? "Your previous saved data couldn’t be read. It has been preserved. Download it below before restoring a backup. New writing stays in memory until you restore a valid backup."
      : "Browser storage is unavailable. Download your writing or a backup to keep it.");
    get<HTMLButtonElement>("[data-recover-storage]").hidden = !previousRaw;
  }

  // The site permits local images. Keep other image URLs out of the preview
  // rather than triggering blocked requests or disclosing a draft to a host.
  DOMPurify.addHook("uponSanitizeAttribute", (node, data) => {
    if (node.nodeName !== "IMG" || data.attrName !== "src") return;
    try {
      const url = new URL(data.attrValue, location.origin);
      if (url.origin !== location.origin && !/^data:image\/(png|jpeg|webp|avif);base64,/i.test(data.attrValue)) {
        data.keepAttr = false;
      }
    } catch { data.keepAttr = false; }
  });

  function updateDraftList() {
    draftsSelect.replaceChildren(...workspace.drafts.map((draft) => {
      const option = document.createElement("option");
      option.value = draft.id;
      option.textContent = draft.title.trim() || "Untitled draft";
      return option;
    }));
    draftsSelect.value = workspace.activeId;
  }

  function renderPreview() {
    const draft = current();
    get<HTMLElement>("[data-preview-title]").textContent = draft.title.trim() || "Untitled note";
    get<HTMLElement>("[data-preview-description]").textContent = draft.description;
    get<HTMLElement>("[data-preview-topic]").textContent = BLOG_TOPICS[draft.topic];
    const date = Number.isFinite(Date.parse(`${draft.date}T00:00:00Z`))
      ? new Date(`${draft.date}T00:00:00Z`).toLocaleDateString("en", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })
      : "Choose a date";
    get<HTMLElement>("[data-preview-byline]").textContent = `${draft.author} · ${date} · ${readingMinutes(draft.body)} min read`;
    const words = draft.body.match(/[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu)?.length || 0;
    get<HTMLElement>("[data-word-count]").textContent = `${words} ${words === 1 ? "word" : "words"}`;
    const preview = get<HTMLElement>("[data-preview-body]");
    if (!draft.body.trim()) {
      const placeholder = document.createElement("p");
      placeholder.className = "studio-placeholder";
      placeholder.textContent = "Your writing will appear here.";
      preview.replaceChildren(placeholder);
      return;
    }
    const html = marked.parse(draft.body, { async: false, gfm: true });
    const fragment = DOMPurify.sanitize(html, {
      RETURN_DOM_FRAGMENT: true,
      ALLOWED_TAGS: ["p", "br", "h1", "h2", "h3", "h4", "h5", "h6", "strong", "em", "del", "a", "ul", "ol", "li", "blockquote", "pre", "code", "hr", "table", "thead", "tbody", "tr", "th", "td", "img"],
      ALLOWED_ATTR: ["href", "src", "alt", "title", "start"],
    });
    fragment.querySelectorAll("a").forEach((link) => {
      if (!link.getAttribute("href")?.startsWith("#")) {
        link.target = "_blank";
        link.rel = "noopener noreferrer";
      }
    });
    fragment.querySelectorAll("h1").forEach((heading) => {
      const sectionHeading = document.createElement("h2");
      sectionHeading.append(...heading.childNodes);
      heading.replaceWith(sectionHeading);
    });
    fragment.querySelectorAll("table").forEach((table) => {
      const wrapper = document.createElement("div");
      wrapper.className = "article-table";
      wrapper.tabIndex = 0;
      wrapper.setAttribute("role", "region");
      wrapper.setAttribute("aria-label", "Article table; scroll horizontally if needed");
      table.replaceWith(wrapper);
      wrapper.append(table);
    });
    preview.replaceChildren(fragment);
  }

  function populate() {
    const draft = current();
    for (const name of ["title", "description", "slug", "author", "date", "tags", "topic", "body"] as const) {
      input(name).value = draft[name];
    }
    for (const name of ["featured", "published"] as const) {
      (input(name) as HTMLInputElement).checked = draft[name];
    }
    updateDraftList();
    clearError();
    renderPreview();
  }

  function capture() {
    const draft = current();
    for (const name of ["title", "description", "slug", "author", "date", "tags", "body"] as const) draft[name] = input(name).value;
    draft.topic = input("topic").value as WritingDraft["topic"];
    draft.featured = (input("featured") as HTMLInputElement).checked;
    draft.published = (input("published") as HTMLInputElement).checked;
    draft.updatedAt = new Date().toISOString();
    dirty = true;
    updateDraftList();
  }

  function save() {
    clearTimeout(saveTimer);
    if (persistenceBlocked) { status.textContent = "In memory only — download to keep a copy."; return false; }
    try {
      localStorage.setItem(WRITING_STORAGE_KEY, JSON.stringify(workspace));
      dirty = false;
      status.textContent = `Saved in this browser · ${new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
      if (!persistenceBlocked) warning.hidden = true;
      return true;
    } catch {
      status.textContent = "Not saved in this browser.";
      showWarning("Browser storage is unavailable or full. Download your draft or a backup to keep your writing.");
      return false;
    }
  }

  form.addEventListener("submit", (event) => event.preventDefault());
  form.addEventListener("input", (event) => {
    if (event.target === input("slug")) current().slugEdited = !!input("slug").value;
    if (event.target === input("title") && !current().slugEdited) input("slug").value = slugFromTitle(input("title").value);
    capture();
    clearError();
    status.textContent = "Saving…";
    clearTimeout(saveTimer);
    saveTimer = setTimeout(save, 450);
    clearTimeout(previewTimer);
    previewTimer = setTimeout(renderPreview, 120);
  });
  form.addEventListener("change", () => { capture(); renderPreview(); save(); });

  get<HTMLButtonElement>("[data-save-draft]").addEventListener("click", () => { capture(); save(); });
  draftsSelect.addEventListener("change", () => { save(); workspace.activeId = draftsSelect.value; populate(); save(); });
  get<HTMLButtonElement>("[data-new-draft]").addEventListener("click", () => {
    if (workspace.drafts.length >= 100) { showError("Back up and remove some drafts before adding another."); return; }
    capture();
    const draft = createDraft(author);
    workspace.drafts.unshift(draft);
    workspace.activeId = draft.id;
    populate();
    save();
    host.dataset.view = "write";
    setView("write");
    input("title").focus();
  });

  function setView(view: string) {
    host.dataset.view = view;
    host.querySelectorAll<HTMLButtonElement>("[data-view-button]").forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.viewButton === view)));
    if (view === "preview") renderPreview();
  }
  host.querySelectorAll<HTMLButtonElement>("[data-view-button]").forEach((button) => button.addEventListener("click", () => setView(button.dataset.viewButton!)));

  host.querySelectorAll<HTMLButtonElement>("[data-format]").forEach((button) => button.addEventListener("click", () => {
    const start = bodyInput.selectionStart;
    const end = bodyInput.selectionEnd;
    const selected = bodyInput.value.slice(start, end);
    const lineBreak = start > 0 && bodyInput.value[start - 1] !== "\n" ? "\n" : "";
    const formats: Record<string, string> = {
      heading: `${lineBreak}## ${selected || "Section heading"}\n`,
      bold: `**${selected || "bold text"}**`, italic: `*${selected || "italic text"}*`,
      link: `[${selected || "link text"}](https://example.com)`,
      list: `${lineBreak}${(selected || "List item").split("\n").map((line) => `- ${line}`).join("\n")}\n`,
      code: `${lineBreak}\n\`\`\`text\n${selected || "Your code here"}\n\`\`\`\n`,
    };
    bodyInput.setRangeText(formats[button.dataset.format!], start, end, "select");
    bodyInput.focus();
    bodyInput.dispatchEvent(new Event("input", { bubbles: true }));
  }));

  function download(text: string, filename: string, type: string) {
    const url = URL.createObjectURL(new Blob([text], { type }));
    const link = document.createElement("a");
    link.href = url; link.download = filename;
    document.body.append(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  get<HTMLButtonElement>("[data-download-mdx]").addEventListener("click", async (event) => {
    const button = event.currentTarget as HTMLButtonElement;
    capture(); save(); clearError();
    button.disabled = true; button.textContent = "Checking…";
    try {
      const snapshot = structuredClone(current());
      const mdx = exportMdx(snapshot);
      const [{ compile }, { default: remarkGfm }] = await Promise.all([import("@mdx-js/mdx"), import("remark-gfm")]);
      const sectionHeadings = () => (tree: unknown) => {
        function walk(node: unknown) {
          if (!node || typeof node !== "object") return;
          if ("type" in node && node.type === "heading" && "depth" in node && node.depth === 1) {
            throw new Error("The title is already the main heading. Use ## for section headings in your article.");
          }
          if ("children" in node && Array.isArray(node.children)) node.children.forEach(walk);
        }
        walk(tree);
      };
      await compile(snapshot.body, { remarkPlugins: [remarkGfm, sectionHeadings] });
      download(mdx, `${snapshot.slug}.mdx`, "text/markdown;charset=utf-8");
      status.textContent = snapshot.published ? "MDX downloaded — ready to add to your site." : "Draft MDX downloaded.";
    } catch (problem) {
      showError(problem instanceof Error ? problem.message : "The article couldn’t be exported. Check its details and Markdown.");
    } finally { button.disabled = false; button.textContent = "Download MDX"; }
  });

  get<HTMLButtonElement>("[data-backup-drafts]").addEventListener("click", () => {
    capture(); save();
    download(JSON.stringify(workspace, null, 2), `rokon-drafts-${new Date().toISOString().slice(0, 10)}.json`, "application/json");
  });
  get<HTMLButtonElement>("[data-recover-storage]").addEventListener("click", () => {
    if (previousRaw) download(previousRaw, "rokon-saved-data-recovery.json", "application/json");
  });

  const restoreDialog = get<HTMLDialogElement>("[data-restore-dialog]");
  get<HTMLInputElement>("[data-import-backup]").addEventListener("change", async (event) => {
    const fileInput = event.currentTarget as HTMLInputElement;
    const file = fileInput.files?.[0];
    if (!file) return;
    clearError();
    try {
      if (file.size > 5_000_000) throw new Error("Choose a draft backup smaller than 5 MB.");
      pendingRestore = parseWorkspace(await file.text());
      restoreDialog.showModal();
    } catch { showError("This isn’t a valid writing-desk backup, or it is too large. Your current drafts are unchanged."); }
    finally { fileInput.value = ""; }
  });
  get<HTMLButtonElement>("[data-restore-cancel]").addEventListener("click", () => { pendingRestore = null; restoreDialog.close(); });
  get<HTMLButtonElement>("[data-restore-confirm]").addEventListener("click", () => {
    if (!pendingRestore) return;
    workspace = pendingRestore; pendingRestore = null;
    persistenceBlocked = false;
    get<HTMLButtonElement>("[data-recover-storage]").hidden = true;
    populate(); save(); restoreDialog.close();
  });

  const deleteDialog = get<HTMLDialogElement>("[data-delete-dialog]");
  get<HTMLButtonElement>("[data-delete-draft]").addEventListener("click", () => deleteDialog.showModal());
  get<HTMLButtonElement>("[data-delete-cancel]").addEventListener("click", () => deleteDialog.close());
  get<HTMLButtonElement>("[data-delete-confirm]").addEventListener("click", () => {
    clearTimeout(saveTimer); clearTimeout(previewTimer);
    workspace.drafts = workspace.drafts.filter((draft) => draft.id !== workspace.activeId);
    if (!workspace.drafts.length) workspace.drafts.push(createDraft(author));
    workspace.activeId = workspace.drafts[0].id;
    populate(); save(); deleteDialog.close();
  });

  document.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
      event.preventDefault(); capture(); save();
    }
  });
  window.addEventListener("pagehide", () => { if (dirty) save(); });
  document.addEventListener("visibilitychange", () => { if (document.hidden && dirty) save(); });
  window.addEventListener("beforeunload", (event) => { if (dirty && !save()) event.preventDefault(); });

  populate();
  get<HTMLElement>("[data-studio-unavailable]").hidden = true;
  get<HTMLFieldSetElement>("[data-editor-fields]").disabled = false;
  host.querySelectorAll<HTMLButtonElement | HTMLInputElement | HTMLSelectElement>("[disabled]").forEach((control) => { control.disabled = false; });
  save();
}
