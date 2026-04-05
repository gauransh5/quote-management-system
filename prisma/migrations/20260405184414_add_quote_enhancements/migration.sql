-- AlterTable
ALTER TABLE "Quote" ADD COLUMN     "expectedCompletionDate" TIMESTAMP(3),
ADD COLUMN     "leadSource" TEXT NOT NULL DEFAULT 'website',
ADD COLUMN     "projectAddress" TEXT;

-- CreateTable
CREATE TABLE "QuoteSection" (
    "id" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "heading" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuoteSection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "QuoteSection_quoteId_idx" ON "QuoteSection"("quoteId");

-- CreateIndex
CREATE INDEX "Quote_leadSource_idx" ON "Quote"("leadSource");

-- AddForeignKey
ALTER TABLE "QuoteSection" ADD CONSTRAINT "QuoteSection_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE CASCADE ON UPDATE CASCADE;
