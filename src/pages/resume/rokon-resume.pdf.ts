import { createPublicResume } from "../../lib/public-resume";
import { renderResumePDF } from "../../lib/resume-pdf";
export const prerender = true;
export function GET() {
  return new Response(renderResumePDF(createPublicResume()), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="Rokon-Resume.pdf"',
    },
  });
}
