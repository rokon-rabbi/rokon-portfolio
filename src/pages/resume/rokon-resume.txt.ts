import { createPublicResume, resumeText } from "../../lib/public-resume";
import { CONFIG } from "../../data/config";
export const prerender = true;
// The downloaded copies carry the portfolio's address; the page itself is on it.
const resume = () =>
  createPublicResume(undefined, undefined, undefined, undefined, undefined, undefined, CONFIG.site.url);
export function GET() {
  return new Response(resumeText(resume()), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": 'attachment; filename="Rokon-Resume.txt"',
    },
  });
}
