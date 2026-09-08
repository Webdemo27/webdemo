"use server";

import { revalidatePath } from "next/cache";
import { runResearch, overpassSource } from "@/lib/research";
import type { ResearchSummary } from "@/lib/research";

export async function runResearchAction(params: {
  location: string;
  category: string;
  limit: number;
}): Promise<ResearchSummary> {
  const summary = await runResearch(overpassSource, {
    location: params.location,
    category: params.category,
    limit: params.limit,
  });

  revalidatePath("/leads");
  revalidatePath("/");
  return summary;
}
