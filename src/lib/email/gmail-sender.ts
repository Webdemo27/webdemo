import { OAuth2Client } from "google-auth-library";
import type { EmailSender, EmailSendResult, OutgoingEmail } from "./types";

/** True once real Gmail OAuth2 credentials are present in the
 * environment (.env, never committed — see .env.example). Used by the
 * Settings page to show integration status, and by GmailSender to fail
 * closed instead of silently no-op'ing. */
export function isGmailConfigured(): boolean {
  return Boolean(
    process.env.GMAIL_CLIENT_ID &&
      process.env.GMAIL_CLIENT_SECRET &&
      process.env.GMAIL_REFRESH_TOKEN &&
      process.env.GMAIL_SENDER_ADDRESS
  );
}

function encodeMimeMessage(from: string, email: OutgoingEmail): string {
  const encodedSubject = `=?UTF-8?B?${Buffer.from(email.subject, "utf8").toString("base64")}?=`;
  const message = [
    `From: ${from}`,
    `To: ${email.to}`,
    `Subject: ${encodedSubject}`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=UTF-8",
    "",
    email.body,
  ].join("\r\n");

  return Buffer.from(message, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * Real Gmail API integration via OAuth2 (never a stored password — a
 * refresh token from env only, per the security rules in CLAUDE.md).
 *
 * This class is intentionally NOT wired into any dashboard button or
 * pipeline step yet. Phase 10 of the roadmap asks for the architecture
 * only; actually sending requires the user to complete Google's OAuth
 * consent flow themselves (an external-authentication step outside
 * this project's control) and then explicitly ask for a "Send" action
 * to be added to the UI. Until GMAIL_CLIENT_ID/SECRET/REFRESH_TOKEN are
 * set, every call fails closed with a clear error rather than doing
 * nothing silently.
 */
export class GmailSender implements EmailSender {
  async send(email: OutgoingEmail): Promise<EmailSendResult> {
    if (!isGmailConfigured()) {
      return {
        ok: false,
        error:
          "Gmail ist nicht konfiguriert (GMAIL_CLIENT_ID/GMAIL_CLIENT_SECRET/GMAIL_REFRESH_TOKEN/GMAIL_SENDER_ADDRESS fehlen in .env).",
      };
    }

    try {
      const oauth2Client = new OAuth2Client(
        process.env.GMAIL_CLIENT_ID,
        process.env.GMAIL_CLIENT_SECRET
      );
      oauth2Client.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN });

      const { token } = await oauth2Client.getAccessToken();
      if (!token) {
        return { ok: false, error: "Konnte kein Gmail-Zugriffstoken beziehen." };
      }

      const raw = encodeMimeMessage(process.env.GMAIL_SENDER_ADDRESS as string, email);

      const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ raw }),
      });

      if (!res.ok) {
        const text = await res.text();
        return { ok: false, error: `Gmail API Fehler: HTTP ${res.status} — ${text}` };
      }

      const data = (await res.json()) as { id?: string };
      return { ok: true, messageId: data.id };
    } catch (e) {
      return {
        ok: false,
        error: e instanceof Error ? e.message : "Unbekannter Fehler beim Gmail-Versand.",
      };
    }
  }
}
