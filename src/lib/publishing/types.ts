export interface StagedDemo {
  slug: string;
  /** Absolute path to the demo's output directory (index.html plus its
   * assets/ subfolder) — the whole tree gets uploaded, not just the HTML
   * file, so generated images actually load on the published URL. */
  directory: string;
}

export interface PublishInput extends StagedDemo {
  /** Every OTHER demo that is currently published.
   *
   * The shared Pages project deploys one directory containing every
   * published lead, so a deploy always republishes all of them — which
   * means their staged copies have to be refreshed from source too, not
   * just the one being published now. Leaving them untouched made the
   * staged tree accumulate: other leads kept going live with whatever
   * they looked like on the day THEY were published, and one legacy file
   * that had since grown past a Cloudflare limit blocked every future
   * publish of every lead (real incident 2026-09-11 — a 39.9 MiB video
   * that had already been re-encoded to 22.9 MiB at the source). */
  alsoPublished?: StagedDemo[];
}

export interface PublishResult {
  ok: boolean;
  publicUrl?: string;
  error?: string;
  /** Slugs that were sitting in the staged tree without being published
   * — left behind by failed publishes — and have now been taken out of
   * the deployment. Worth surfacing: they were publicly reachable. */
  removedFromDeployment?: string[];
}

/** Provider-agnostic "make this demo publicly reachable" abstraction, so
 * a different host could replace Cloudflare later without touching call
 * sites. Implemented today by `CloudflarePagesPublisher` and called from
 * `publishDemoPublicly()` (src/lib/publishing/publish-demo.ts), wired to
 * the "Öffentlich bereitstellen" button on the lead detail page. */
export interface DemoPublisher {
  publish(input: PublishInput): Promise<PublishResult>;
}
