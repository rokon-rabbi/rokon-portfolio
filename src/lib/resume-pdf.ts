import type { PublicResume } from "./public-resume";

// Small dependency-free PDF export for the public English-language resume.
// Text stays selectable. /resume and the text export provide accessible alternatives.
const ascii = (value: string) =>
  value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[—–]/g, "-")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[^\x20-\x7e]/g, " ");
const escape = (value: string) => ascii(value).replace(/([\\()])/g, "\\$1");
const width = (text: string, size: number) =>
  [...ascii(text)].reduce(
    (total, char) =>
      total +
      (/^[MW@%]$/.test(char)
        ? 0.9
        : /^[ilI.,' :;!|]$/.test(char)
          ? 0.28
          : /^[A-Z0-9]$/.test(char)
            ? 0.67
            : 0.54) *
        size,
    0,
  );

export function renderResumePDF(resume: PublicResume): Uint8Array<ArrayBuffer> {
  const pages: string[][] = [[]];
  let commands = pages[0];
  let y = 791;
  const draw = (
    text: string,
    size: number,
    bold = false,
    color = "0.12 0.17 0.22",
    indent = 0,
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
    for (const line of lines) {
      if (y < 55) {
        commands = [];
        pages.push(commands);
        y = 791;
      }
      commands.push(
        `BT /${bold ? "F2" : "F1"} ${size} Tf ${color} rg 1 0 0 1 ${45 + indent} ${y} Tm (${escape(line)}) Tj ET`,
      );
      y -= size * 1.45;
    }
  };
  const section = (title: string) => {
    y -= 16;
    if (y < 100) {
      commands = [];
      pages.push(commands);
      y = 791;
    }
    draw(title, 10, true, "0.02 0.38 0.34");
    commands.push(`0.78 0.82 0.82 RG 0.5 w 45 ${y + 5} m 550 ${y + 5} l S`);
    y -= 8;
  };
  draw(resume.name, 24, true);
  draw(resume.headline, 12, false, "0.02 0.38 0.34");
  y -= 7;
  if (resume.email) draw(resume.email, 9);
  resume.links.forEach((link) => draw(`${link.label}: ${link.url}`, 9));
  section("PROFILE");
  draw(resume.summary, 10);
  section("EXPERIENCE");
  resume.experience.forEach((role, index) => {
    if (index) y -= 10;
    draw(role.title, 11, true);
    draw(role.company, 10);
    draw(role.period, 9, false, "0.3 0.35 0.4");
    y -= 4;
    role.contributions.forEach((claim) =>
      draw(`- ${claim}`, 9.5, false, undefined, 8),
    );
  });
  section("TECHNICAL SKILLS");
  resume.skills.forEach((group) =>
    draw(`${group.label}: ${group.skills.join(", ")}`, 9.5),
  );
  section("EDUCATION");
  draw(resume.education.institution, 11, true);
  if (resume.education.degree) draw(resume.education.degree, 10);
  if (resume.education.period) draw(resume.education.period, 9);

  const objects: string[] = [
    "",
    "",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
  ];
  const kids: string[] = [];
  pages.forEach((page, index) => {
    const pageId = objects.length + 1;
    const contentId = pageId + 1;
    kids.push(`${pageId} 0 R`);
    page.push(
      `BT /F1 8 Tf 0.3 0.35 0.4 rg 1 0 0 1 45 30 Tm (${escape(resume.name)} | Professional resume) Tj ET`,
    );
    page.push(
      `BT /F1 8 Tf 0.3 0.35 0.4 rg 1 0 0 1 530 30 Tm (${index + 1}) Tj ET`,
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
