import type { VisualProfile } from "./types";

export interface VisualReviewCheck {
  label: string;
  passed: boolean;
}

export interface VisualReviewResult {
  passed: boolean;
  checks: VisualReviewCheck[];
}

/** A deterministic, structural self-check run right after a demo is
 * built — not a fake "AI judged this beautiful" claim, but a real
 * verification that the build actually produced what Visual Director
 * step 9 requires (strong hero, visual depth, varied sections, real
 * typography/color applied, no leftover placeholder text). Failures
 * point at an actual generation bug, since the template is built to
 * satisfy every check by construction. */
export function reviewDemo(input: {
  profile: VisualProfile;
  assetCount: number;
  heroHasVisual: boolean;
  sectionCount: number;
  html: string;
}): VisualReviewResult {
  const checks: VisualReviewCheck[] = [
    { label: "Hero-Bereich hat ein starkes visuelles Element", passed: input.heroHasVisual },
    { label: "Ausreichend visuelle Tiefe (≥ 3 Assets)", passed: input.assetCount >= 3 },
    { label: "Mindestens 4 unterschiedliche Sektionen", passed: input.sectionCount >= 4 },
    {
      label: "Branchenspezifische Typografie eingebunden",
      passed: input.html.includes(input.profile.typography.heading),
    },
    {
      label: "Branchen-Farbwelt angewendet (nicht generisches Blau)",
      passed: input.html.includes(input.profile.colors.primary),
    },
    {
      label: "Kein sichtbarer interner Platzhaltertext",
      passed: !/\[.*(platzhalter|einfügen|todo|placeholder).*\]/i.test(input.html),
    },
    {
      label: "Responsive Viewport-Konfiguration vorhanden",
      passed: input.html.includes('name="viewport"'),
    },
    {
      label: "prefers-reduced-motion wird respektiert",
      passed: input.profile.motion === "none" || input.html.includes("prefers-reduced-motion"),
    },
  ];

  return { passed: checks.every((c) => c.passed), checks };
}
