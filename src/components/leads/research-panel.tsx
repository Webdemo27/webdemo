"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input, Select, Label } from "@/components/ui/input";
import { MagnifyingGlass } from "@phosphor-icons/react";
import type { ResearchSummary } from "@/lib/research";
import { OSM_CATEGORIES } from "@/lib/research/osm-categories";

export function ResearchPanel({
  action,
}: {
  action: (params: { location: string; category: string; limit: number }) => Promise<ResearchSummary>;
}) {
  const [open, setOpen] = useState(false);
  const [location, setLocation] = useState("");
  const [category, setCategory] = useState(OSM_CATEGORIES[0].key);
  const [pending, startTransition] = useTransition();
  const [summary, setSummary] = useState<ResearchSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <MagnifyingGlass size={14} aria-hidden="true" />
        Neue Leads recherchieren
      </Button>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[200px]">
          <Label htmlFor="research-location">Ort</Label>
          <Input
            id="research-location"
            placeholder="z. B. Frankfurt am Main"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
        </div>
        <div className="min-w-[180px]">
          <Label htmlFor="research-category">Branche</Label>
          <Select id="research-category" value={category} onChange={(e) => setCategory(e.target.value)}>
            {OSM_CATEGORIES.map((c) => (
              <option key={c.key} value={c.key}>
                {c.label}
              </option>
            ))}
          </Select>
        </div>
        <Button
          size="sm"
          disabled={pending || !location.trim()}
          onClick={() => {
            setError(null);
            setSummary(null);
            startTransition(async () => {
              try {
                const result = await action({ location, category, limit: 15 });
                setSummary(result);
              } catch (e) {
                setError(e instanceof Error ? e.message : "Fehler bei der Recherche.");
              }
            });
          }}
        >
          {pending ? "Suche läuft…" : "Starten"}
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setOpen(false)} disabled={pending}>
          Schließen
        </Button>
      </div>

      {error ? <p className="mt-3 text-xs text-destructive">{error}</p> : null}
      {summary ? (
        <p className="mt-3 text-xs text-muted-foreground">
          {summary.found} gefunden · <span className="text-success font-medium">{summary.created} neu angelegt</span> ·{" "}
          {summary.duplicates} bereits vorhanden
          {summary.excludedChains > 0 ? ` · ${summary.excludedChains} Filialketten ausgeschlossen` : ""}
          {summary.errors.length > 0 ? ` · ${summary.errors.length} Fehler` : ""}
        </p>
      ) : null}
    </div>
  );
}
