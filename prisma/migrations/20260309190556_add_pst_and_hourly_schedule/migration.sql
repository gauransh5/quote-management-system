-- AlterTable
ALTER TABLE "Quote" ADD COLUMN     "pstAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "pstRate" DECIMAL(5,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "QuoteItem" ADD COLUMN     "itemType" TEXT NOT NULL DEFAULT 'standard',
ADD COLUMN     "schedule" JSONB;
