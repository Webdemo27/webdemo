import Link from "next/link";
import { CaretUp, CaretDown } from "@phosphor-icons/react/dist/ssr";
import { Th } from "@/components/ui/table";

export function SortableTh({
  field,
  label,
  currentSort,
  currentDir,
  buildHref,
}: {
  field: string;
  label: string;
  currentSort: string;
  currentDir: "asc" | "desc";
  buildHref: (sort: string, dir: "asc" | "desc") => string;
}) {
  const active = currentSort === field;
  const nextDir: "asc" | "desc" = active && currentDir === "desc" ? "asc" : "desc";

  return (
    <Th aria-sort={active ? (currentDir === "asc" ? "ascending" : "descending") : "none"}>
      <Link
        href={buildHref(field, nextDir)}
        className="inline-flex items-center gap-1 hover:text-foreground"
      >
        {label}
        {active ? (
          currentDir === "asc" ? (
            <CaretUp size={12} weight="bold" aria-hidden="true" />
          ) : (
            <CaretDown size={12} weight="bold" aria-hidden="true" />
          )
        ) : null}
      </Link>
    </Th>
  );
}
