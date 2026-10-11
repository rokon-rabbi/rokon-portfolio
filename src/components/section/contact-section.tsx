import type { PortfolioData } from "@/data/resume";
import { CONTACT_DETAILS, emailHref } from "@/data/contact";
export default function ContactSection({
  contacts,
  content,
}: {
  contacts: PortfolioData["contacts"];
  content: PortfolioData["sections"]["contact"];
}) {
  return (
    <div className="contact-panel" data-motion="reveal">
      <div>
        <p className="eyebrow mb-4">07 / {content.label}</p>
        <h2 id="contact-heading">
          Let’s connect
          <br />
          <span className="text-primary">the dots.</span>
        </h2>
      </div>
      <div>
        <span className="contact-signal" aria-hidden="true">
          <i />
          <span />
          <i />
        </span>
        <p className="contact-description">{content.text}</p>
        <div className="profile-actions">
          <a href={CONTACT_DETAILS.email ? emailHref(CONTACT_DETAILS.email) : "/contact"} className="button button-primary">
            {CONTACT_DETAILS.email ? "Email me" : "Let’s connect"} <span aria-hidden="true">↗</span>
          </a>
        {contacts.map((contact) => (
          <a
            key={contact.id}
            href={contact.url}
            target="_blank"
            rel="noopener noreferrer"
            className="button button-outline"
          >
            Find me on {contact.label} <span aria-hidden="true">↗</span>
          </a>
        ))}
        </div>
      </div>
    </div>
  );
}
