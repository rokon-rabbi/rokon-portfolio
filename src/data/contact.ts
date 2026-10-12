import { z } from "astro/zod";

/** Only user-supplied public destinations belong here. Null means omit the link. */
export const ContactDetailsSchema = z
  .object({
    email: z.email().nullable(),
    linkedin: z
      .url({ protocol: /^https$/, hostname: /^(www\.)?linkedin\.com$/ })
      .refine(
        (url) => /^\/in\/[a-zA-Z0-9_%.-]+\/?$/.test(new URL(url).pathname),
        "Use the exact professional profile URL",
      )
      .nullable(),
  })
  .strict();

// Both are the public destinations shown on Rokon's previous portfolio.
export const CONTACT_DETAILS = ContactDetailsSchema.parse({
  email: "rokonrabbi21@gmail.com",
  linkedin: "https://www.linkedin.com/in/rokon1/",
});

export function emailHref(email: string, subject = "") {
  return `mailto:${email}${subject ? `?subject=${encodeURIComponent(subject)}` : ""}`;
}
