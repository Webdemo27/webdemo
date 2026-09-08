-- AlterTable
ALTER TABLE "Demo" ADD COLUMN "visualProfile" JSONB;

-- CreateTable
CREATE TABLE "DemoAsset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "demoId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "altText" TEXT NOT NULL,
    "localPath" TEXT,
    "sourceUrl" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "aspectRatio" TEXT NOT NULL,
    "formats" JSONB,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DemoAsset_demoId_fkey" FOREIGN KEY ("demoId") REFERENCES "Demo" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "DemoAsset_demoId_idx" ON "DemoAsset"("demoId");
