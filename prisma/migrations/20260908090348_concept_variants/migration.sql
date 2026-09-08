-- AlterTable
ALTER TABLE "Demo" ADD COLUMN "concept" JSONB;
ALTER TABLE "Demo" ADD COLUMN "conceptVariant" TEXT;
ALTER TABLE "Demo" ADD COLUMN "variantHistory" JSONB;

-- AlterTable
ALTER TABLE "Lead" ADD COLUMN "specialty" TEXT;
