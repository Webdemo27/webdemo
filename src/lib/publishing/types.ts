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
 * sites. Implemented today by `CloudflarePagesPublisher` and called from
 * `publishDemoPublicly()` (src/lib/publishing/publish-demo.ts), wired to
 * the "Öffentlich bereitstellen" button on the lead detail page. */
export interface DemoPublisher {
  publish(input: PublishInput): Promise<PublishResult>;
}
