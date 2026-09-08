import { prisma } from "./client";
import { toJson } from "./json";

export async function logActivity(
  leadId: string,
  type: string,
  message: string,
  metadata?: Record<string, unknown>
) {
  await prisma.activityLog.create({
    data: {
      leadId,
      type,
      message,
      metadata: metadata ? toJson(metadata) : undefined,
    },
  });
}
