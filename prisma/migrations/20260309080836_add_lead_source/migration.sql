-- AlterTable
ALTER TABLE "QuoteRequest" ADD COLUMN     "leadSource" TEXT NOT NULL DEFAULT 'website';

-- CreateIndex
CREATE INDEX "QuoteRequest_leadSource_idx" ON "QuoteRequest"("leadSource");
