export interface PublishInput {
  slug: string;
  html: string;
}

export interface PublishResult {
  ok: boolean;
  publicUrl?: string;
  error?: string;
}

/** Provider-agnostic "make this demo publicly reachable" abstraction, so
 * a different host could replace Cloudflare later without touching call
 * sites. Nothing in this project calls a DemoPublisher yet — Phase 11
 * is architecture preparation only. */
export interface DemoPublisher {
  publish(input: PublishInput): Promise<PublishResult>;
}
