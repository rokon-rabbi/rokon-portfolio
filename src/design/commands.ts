// What the command menu offers, and how a typed query is matched against it.
// The menu itself is ordinary links and buttons rendered on the server; the
// controller in src/scripts/command-menu.ts only filters and moves through
// them, so this file is the one place that decides what is on the list.

export const COMMAND_GROUPS = [
  "Pages",
  "On the home page",
  "Actions",
  "Elsewhere",
] as const;
export type CommandGroup = (typeof COMMAND_GROUPS)[number];

// An action is something the page does in place, not somewhere it goes.
export type CommandAction = "copy-email" | "toggle-theme" | "appearance";

export interface Command {
  id: string;
  group: CommandGroup;
  label: string;
  // Other words a visitor might type for it. Never shown.
  keywords: string;
  href?: string;
  action?: CommandAction;
  external?: boolean;
  download?: string;
}

export interface CommandSources {
  email: string | null;
  emailHref: string | null;
  // Profiles on other sites, in the order they should be listed.
  profiles: readonly { label: string; url: string }[];
}

export function siteCommands({
  email,
  emailHref,
  profiles,
}: CommandSources): Command[] {
  const page = (label: string, href: string, keywords: string): Command => ({
    id: `page-${href === "/" ? "home" : href.slice(1)}`,
    group: "Pages",
    label,
    href,
    keywords,
  });
  const section = (label: string, id: string, keywords: string): Command => ({
    id: `section-${id}`,
    group: "On the home page",
    label,
    href: `/#${id}`,
    keywords,
  });
  return [
    page("Home", "/", "start intro overview index"),
    page("Work", "/work", "projects case studies portfolio code"),
    page("About", "/about", "bio profile background who"),
    page("Writing", "/blog", "blog notes articles posts"),
    page("Résumé", "/resume", "cv curriculum vitae experience"),
    page("Contact", "/contact", "email reach hire message talk"),
    section("Experience", "experience", "jobs roles career employment work history"),
    section("Stack", "stack", "skills tools technologies languages frameworks"),
    section("Projects", "projects", "work built open source"),
    section("Education", "education", "degree university study"),
    ...(email
      ? [
          {
            id: "action-copy-email",
            group: "Actions",
            label: "Copy email address",
            action: "copy-email",
            keywords: "mail contact clipboard",
          } satisfies Command,
        ]
      : []),
    {
      id: "action-resume-pdf",
      group: "Actions",
      label: "Download résumé as PDF",
      href: "/resume/rokon-resume.pdf",
      download: "Rokon-Resume.pdf",
      keywords: "cv save file",
    },
    {
      id: "action-toggle-theme",
      group: "Actions",
      label: "Switch between light and dark",
      action: "toggle-theme",
      keywords: "theme mode night colour color appearance",
    },
    {
      id: "action-appearance",
      group: "Actions",
      label: "Appearance settings",
      action: "appearance",
      keywords: "theme palette font text size spacing reading",
    },
    ...profiles.map(
      (profile): Command => ({
        id: `link-${profile.label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
        group: "Elsewhere",
        label: profile.label,
        href: profile.url,
        external: true,
        keywords: "profile social link",
      }),
    ),
    ...(emailHref
      ? [
          {
            id: "link-email",
            group: "Elsewhere",
            label: "Write an email",
            href: emailHref,
            keywords: "mail contact message hire",
          } satisfies Command,
        ]
      : []),
  ];
}

// Lower case and without accents, so "resume" finds "Résumé".
export const fold = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

// Where a term begins a word of the text: 0 for the first word, -1 for none.
const wordStart = (text: string, term: string) => {
  for (let at = text.indexOf(term); at >= 0; at = text.indexOf(term, at + 1))
    if (at === 0 || text[at - 1] === " ") return at;
  return -1;
};

/**
 * How well a command answers a query: lower is better, null is no match.
 * Every word typed must begin a word of the command. One that begins the
 * label counts most, then one that begins a later word of it, and last one
 * found only among the keywords. Letters from the middle of a word do not
 * count: "res" is the résumé, not the email address.
 */
export function commandScore(
  label: string,
  keywords: string,
  query: string,
): number | null {
  const terms = fold(query).split(/\s+/).filter(Boolean);
  const name = fold(label);
  const extra = fold(keywords);
  let score = 0;
  for (const term of terms) {
    const at = wordStart(name, term);
    if (at === 0) continue;
    if (at > 0) score += 1;
    else if (wordStart(extra, term) >= 0) score += 2;
    else return null;
  }
  return score;
}
