-- AlterTable
ALTER TABLE "Batch" ADD COLUMN     "formedAt" TIMESTAMP(3),
ADD COLUMN     "isFormed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "totalSeats" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "totalWeight" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "vedomostData" TEXT;

-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "stamp" TEXT,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'active';

-- AlterTable
ALTER TABLE "Counterparty" ADD COLUMN     "contactPhone" TEXT DEFAULT '';

-- AlterTable
ALTER TABLE "Expense" ADD COLUMN     "requestId" TEXT;

-- AlterTable
ALTER TABLE "Request" ADD COLUMN     "fullyCompletedAt" TIMESTAMP(3),
ADD COLUMN     "isFullyCompleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isPaid" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "paidAt" TIMESTAMP(3),
ADD COLUMN     "reEditedAfterCompletion" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Tariff" ADD COLUMN     "extraSum" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "isPrivate" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "weightRanges" JSONB;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "assignedCompanyId" TEXT,
ADD COLUMN     "contactPhone" TEXT;

-- CreateIndex
CREATE INDEX "Batch_isFormed_idx" ON "Batch"("isFormed");

-- CreateIndex
CREATE INDEX "Expense_requestId_idx" ON "Expense"("requestId");

-- CreateIndex
CREATE INDEX "Request_isPaid_idx" ON "Request"("isPaid");

-- CreateIndex
CREATE INDEX "Request_isFullyCompleted_idx" ON "Request"("isFullyCompleted");
