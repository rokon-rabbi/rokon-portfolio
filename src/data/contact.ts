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

export const CONTACT_DETAILS = ContactDetailsSchema.parse({
  email: null,
  linkedin: null,
});

export function emailHref(email: string, subject = "") {
  return `mailto:${email}${subject ? `?subject=${encodeURIComponent(subject)}` : ""}`;
}
