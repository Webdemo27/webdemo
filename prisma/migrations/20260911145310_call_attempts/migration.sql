-- AlterTable
ALTER TABLE "Lead" ADD COLUMN "lastCalledAt" DATETIME;

-- CreateTable
CREATE TABLE "CallAttempt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "leadId" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,
    "note" TEXT,
    "linkSentVia" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CallAttempt_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "CallAttempt_leadId_idx" ON "CallAttempt"("leadId");

-- CreateIndex
CREATE INDEX "CallAttempt_createdAt_idx" ON "CallAttempt"("createdAt");

-- CreateIndex
CREATE INDEX "Lead_lastCalledAt_idx" ON "Lead"("lastCalledAt");
