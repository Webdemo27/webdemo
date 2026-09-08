import type { Prisma } from "@prisma/client";

/** Prisma's InputJsonValue requires plain index-signature objects; our
 * domain types are structurally identical JSON but TypeScript won't
 * infer that automatically. This documents the cast in one place. */
export function toJson<T>(value: T): Prisma.InputJsonValue {
  return value as unknown as Prisma.InputJsonValue;
}
