"use client";

import { useState } from "react";
import { Check, Copy } from "@phosphor-icons/react";
import { cn } from "@/lib/utils/cn";

/** Small, self-contained copy-to-clipboard affordance — icon swaps to a
 * checkmark for 1.6s on success so the click has visible confirmation,
 * per the microinteraction requirement for "Copy URL" actions. */
export function CopyUrlButton({ url, className }: { url: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-md border border-border bg-card p-1.5 text-muted-foreground transition-all hover:bg-muted hover:text-foreground active:scale-90 cursor-pointer",
        className
      )}
      aria-label={copied ? "URL kopiert" : "URL kopieren"}
      onClick={async () => {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
      }}
    >
      {copied ? (
        <Check size={14} weight="bold" className="text-success" aria-hidden="true" />
      ) : (
        <Copy size={14} aria-hidden="true" />
      )}
    </button>
  );
}
