"use server";

import { revalidatePath } from "next/cache";
import { deleteDemo, type DeleteDemoOutcome } from "@/lib/publishing";

export async function deleteDemoAction(demoId: string): Promise<DeleteDemoOutcome> {
  const result = await deleteDemo(demoId);
  revalidatePath("/demos");
  revalidatePath("/leads");
  revalidatePath("/");
  return result;
}
