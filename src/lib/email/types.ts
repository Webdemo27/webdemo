export interface OutgoingEmail {
  to: string;
  subject: string;
  body: string;
}

export interface EmailSendResult {
  ok: boolean;
  messageId?: string;
  error?: string;
}

/** Provider-agnostic sending abstraction. A concrete sender (Gmail today,
 * another provider later) only needs to implement `send`. Nothing in
 * this project calls `send` without the message having gone through
 * human approval first — see the guard in requireApprovedMessage(). */
export interface EmailSender {
  send(email: OutgoingEmail): Promise<EmailSendResult>;
}
