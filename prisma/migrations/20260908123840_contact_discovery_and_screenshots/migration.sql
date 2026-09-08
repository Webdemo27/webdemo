-- AlterTable
ALTER TABLE "Demo" ADD COLUMN "afterScreenshotDesktopPath" TEXT;
ALTER TABLE "Demo" ADD COLUMN "afterScreenshotMobilePath" TEXT;

-- AlterTable
ALTER TABLE "Lead" ADD COLUMN "contactDiscoveryError" TEXT;
ALTER TABLE "Lead" ADD COLUMN "contactEmailConfidence" TEXT;
ALTER TABLE "Lead" ADD COLUMN "contactEmailFoundAt" DATETIME;
ALTER TABLE "Lead" ADD COLUMN "contactEmailSource" TEXT;
ALTER TABLE "Lead" ADD COLUMN "contactEmailSourceUrl" TEXT;
ALTER TABLE "Lead" ADD COLUMN "contactQualityScore" INTEGER;

-- AlterTable
ALTER TABLE "WebsiteAnalysis" ADD COLUMN "screenshotDesktopPath" TEXT;
ALTER TABLE "WebsiteAnalysis" ADD COLUMN "screenshotError" TEXT;
ALTER TABLE "WebsiteAnalysis" ADD COLUMN "screenshotMobilePath" TEXT;

-- CreateTable
CREATE TABLE "ContactEmail" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "leadId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "confidence" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "foundAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ContactEmail_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "ContactEmail_leadId_idx" ON "ContactEmail"("leadId");

-- CreateIndex
CREATE UNIQUE INDEX "ContactEmail_leadId_email_key" ON "ContactEmail"("leadId", "email");
