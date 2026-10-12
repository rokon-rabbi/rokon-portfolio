import { createPublicResume } from "../../lib/public-resume";
import { renderResumePDF } from "../../lib/resume-pdf";
import { CONFIG } from "../../data/config";
export const prerender = true;
// The downloaded copies carry the portfolio's address; the page itself is on it.
const resume = () =>
  createPublicResume(undefined, undefined, undefined, undefined, undefined, undefined, CONFIG.site.url);
export function GET() {
  return new Response(renderResumePDF(resume()), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="Rokon-Resume.pdf"',
    },
  });
}
