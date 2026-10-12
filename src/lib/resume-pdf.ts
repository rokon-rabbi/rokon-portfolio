import {
  resumeContacts,
  resumeTitle,
  type PublicResume,
} from "./public-resume";

// Small dependency-free PDF export for the public English-language resume.
// Text stays selectable. /resume and the text export provide accessible alternatives.
const ascii = (value: string) =>
  value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[—–]/g, "-")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[^\x20-\x7e•]/g, " ");
// The bullet is the one character kept from outside ASCII: 225 in WinAnsi.
const escape = (value: string) =>
  ascii(value)
    .replace(/([\\()])/g, "\\$1")
    .replace(/•/g, "\\225");
const width = (text: string, size: number) =>
  [...ascii(text)].reduce(
    (total, char) =>
      total +
      (/^[MW@%]$/.test(char)
        ? 0.9
        : /^[ilI.,' :;!|•]$/.test(char)
          ? 0.28
          : /^[A-Z0-9]$/.test(char)
            ? 0.67
            : 0.54) *
        size,
    0,
  );

// Tight enough that a résumé of this length stays on one page.
const LEADING = 1.36;
// Ink, the quiet ink, the site's one red, and its hairline.
const INK = "0.07 0.07 0.07";
const MUTED = "0.4 0.37 0.33";
const ACCENT = "0.478 0.122 0.122";
const RULE = "0.91 0.88 0.82";

export function renderResumePDF(resume: PublicResume): Uint8Array<ArrayBuffer> {
  const pages: string[][] = [[]];
  let commands = pages[0];
  let y = 800;
  const draw = (
    text: string,
    size: number,
    bold = false,
    color = INK,
    indent = 0,
    /** Set on the first line, left of the indent: a bullet or a label. */
    lead?: { text: string; x: number; bold?: boolean },
  ) => {
    const lines: string[] = [];
    let current = "";
    for (const word of ascii(text).split(/\s+/)) {
      const next = current ? `${current} ${word}` : word;
      if (current && width(next, size) > 505 - indent) {
        lines.push(current);
        current = word;
      } else current = next;
    }
    if (current) lines.push(current);
    for (const [index, line] of lines.entries()) {
      if (y < 46) {
        commands = [];
        pages.push(commands);
        y = 800;
      }
      if (lead && index === 0)
        commands.push(
          `BT /${lead.bold ? "F2" : "F1"} ${size} Tf ${color} rg 1 0 0 1 ${45 + lead.x} ${y} Tm (${escape(lead.text)}) Tj ET`,
        );
      commands.push(
        `BT /${bold ? "F2" : "F1"} ${size} Tf ${color} rg 1 0 0 1 ${45 + indent} ${y} Tm (${escape(line)}) Tj ET`,
      );
      y -= size * LEADING;
    }
  };
  const section = (title: string) => {
    y -= 10;
    if (y < 90) {
      commands = [];
      pages.push(commands);
      y = 800;
    }
    draw(title, 9.5, true, ACCENT);
    commands.push(`${RULE} RG 0.5 w 45 ${y + 5} m 550 ${y + 5} l S`);
    y -= 7;
  };
  draw(resume.name, 21, true);
  draw(resumeTitle(resume), 11.5, false, ACCENT);
  y -= 4;
  // Email, portfolio and profiles share lines; an address is never broken.
  draw(resumeContacts(resume).join("   |   "), 9, false, MUTED);
  section("SUMMARY");
  draw(resume.summary, 9.5);
  section("TECHNICAL SKILLS");
  // Labels in one column, so the groups can be read down as well as across.
  resume.skills.forEach((group) =>
    draw(group.skills.join(", "), 9.2, false, INK, 130, {
      text: group.label,
      x: 0,
      bold: true,
    }),
  );
  section("EXPERIENCE");
  resume.experience.forEach((role, index) => {
    if (index) y -= 7;
    draw(`${role.title}, ${role.company}`, 10.2, true);
    draw(role.period, 8.8, false, MUTED);
    y -= 2;
    role.contributions.forEach((claim) =>
      draw(claim, 9.2, false, INK, 17, { text: "•", x: 7 }),
    );
  });
  if (resume.projects.length) {
    section("SELECTED PROJECTS");
    resume.projects.forEach((project, index) => {
      if (index) y -= 5;
      draw(project.title, 10.2, true);
      draw(project.summary, 9.2);
      draw(
        [project.technologies.join(", "), project.note, project.url]
          .filter(Boolean)
          .join("   |   "),
        8.8,
        false,
        MUTED,
      );
    });
  }
  section("EDUCATION");
  draw(resume.education.degree ?? resume.education.institution, 10.2, true);
  if (resume.education.degree) draw(resume.education.institution, 9.2);
  if (resume.education.period) draw(resume.education.period, 8.8, false, MUTED);

  const objects: string[] = [
    "",
    "",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>",
  ];
  const kids: string[] = [];
  pages.forEach((page, index) => {
    const pageId = objects.length + 1;
    const contentId = pageId + 1;
    kids.push(`${pageId} 0 R`);
    page.push(
      `BT /F1 8 Tf ${MUTED} rg 1 0 0 1 45 30 Tm (${escape(resume.name)} | Resume) Tj ET`,
    );
    page.push(
      `BT /F1 8 Tf ${MUTED} rg 1 0 0 1 530 30 Tm (${index + 1}) Tj ET`,
    );
    const stream = page.join("\n") + "\n";
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentId} 0 R >>`,
    );
    objects.push(`<< /Length ${stream.length} >>\nstream\n${stream}endstream`);
  });
  objects[0] = "<< /Type /Catalog /Pages 2 0 R /Lang (en) >>";
  objects[1] = `<< /Type /Pages /Kids [${kids.join(" ")}] /Count ${pages.length} >>`;
  objects.push(
    `<< /Title (${escape(`${resume.name} - Professional Resume`)}) /Author (${escape(resume.name)}) >>`,
  );
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R /Info ${objects.length} 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return new TextEncoder().encode(pdf);
}
