"use server";

import { revalidatePath } from "next/cache";
import { deleteLeads } from "@/lib/db";

export async function deleteLeadsAction(leadIds: string[]): Promise<{ deleted: number }> {
  const deleted = await deleteLeads(leadIds);
  revalidatePath("/leads");
  revalidatePath("/");
  return { deleted };
}
