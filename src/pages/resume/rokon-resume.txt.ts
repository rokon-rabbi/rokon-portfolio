import { createPublicResume, resumeText } from "../../lib/public-resume";
export const prerender = true;
export function GET() {
  return new Response(resumeText(createPublicResume()), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": 'attachment; filename="Rokon-Resume.txt"',
    },
  });
}
