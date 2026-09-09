import type { LeadData } from "../types";

const PhoneIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.362 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.338 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
);

const MailIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path d="m22 6-10 7L2 6" />
  </svg>
);

const PinIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

export function ContactSection({ data }: { data: LeadData }) {
  const hasContact = Boolean(data.contactPhone || data.contactEmail);

  return (
    <section id="kontakt" className="contact">
      <h2>Kontakt</h2>
      <div className="contact-wrap">
        {hasContact ? (
          <div className="contact-details">
            {data.contactPhone && (
              <a className="contact-row" href={`tel:${data.contactPhone.replace(/\s+/g, "")}`}>
                <PhoneIcon />
                <span>{data.contactPhone}</span>
              </a>
            )}
            {data.contactEmail && (
              <a className="contact-row" href={`mailto:${data.contactEmail}`}>
                <MailIcon />
                <span>{data.contactEmail}</span>
              </a>
            )}
            {data.address && (
              <div className="contact-row">
                <PinIcon />
                <span>{data.address}</span>
              </div>
            )}
          </div>
        ) : (
          <form className="contact-form" onSubmit={(e) => e.preventDefault()}>
            <p className="form-hint">Kontaktformular (Demo-Konzept — im Livebetrieb funktionsfähig)</p>
            <input type="text" placeholder="Ihr Name" disabled />
            <input type="email" placeholder="Ihre E-Mail-Adresse" disabled />
            <textarea placeholder="Ihre Nachricht" rows={3} disabled />
            <button type="submit" disabled>
              Nachricht senden
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
