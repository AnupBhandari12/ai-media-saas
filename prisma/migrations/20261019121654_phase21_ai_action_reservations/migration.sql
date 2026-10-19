-- CreateEnum
CREATE TYPE "AiActionStatus" AS ENUM ('RESERVED', 'PROCESSING', 'COMPLETED', 'FAILED', 'UNKNOWN', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AiQuotaPeriod" AS ENUM ('DAY', 'MONTH');

-- AlterTable
ALTER TABLE "UsageEvent" ADD COLUMN     "aiActionRequestId" TEXT;

-- CreateTable
CREATE TABLE "AiActionRequest" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "idempotencyKey" VARCHAR(128) NOT NULL,
    "inputHash" CHAR(64) NOT NULL,
    "action" VARCHAR(40) NOT NULL,
    "status" "AiActionStatus" NOT NULL DEFAULT 'RESERVED',
    "quotaCounted" BOOLEAN NOT NULL DEFAULT false,
    "quotaDayStart" TIMESTAMP(3) NOT NULL,
    "quotaMonthStart" TIMESTAMP(3) NOT NULL,
    "provider" VARCHAR(40),
    "model" VARCHAR(100),
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,
    "estimatedCostUsd" DECIMAL(18,9),
    "resultJson" JSONB,
    "reservationExpiresAt" TIMESTAMP(3),
    "dispatchedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiActionRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiQuotaBucket" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "quotaKey" VARCHAR(40) NOT NULL,
    "period" "AiQuotaPeriod" NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "used" INTEGER NOT NULL DEFAULT 0,
    "limitValue" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiQuotaBucket_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AiActionRequest_ownerId_status_createdAt_idx" ON "AiActionRequest"("ownerId", "status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AiActionRequest_ownerId_idempotencyKey_key" ON "AiActionRequest"("ownerId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "AiQuotaBucket_ownerId_periodStart_idx" ON "AiQuotaBucket"("ownerId", "periodStart");

-- CreateIndex
CREATE UNIQUE INDEX "AiQuotaBucket_ownerId_quotaKey_period_periodStart_key" ON "AiQuotaBucket"("ownerId", "quotaKey", "period", "periodStart");

-- CreateIndex
CREATE UNIQUE INDEX "UsageEvent_aiActionRequestId_key" ON "UsageEvent"("aiActionRequestId");

-- AddForeignKey
ALTER TABLE "UsageEvent" ADD CONSTRAINT "UsageEvent_aiActionRequestId_fkey" FOREIGN KEY ("aiActionRequestId") REFERENCES "AiActionRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Phase 21: database safety constraints

-- Token usage must never be negative.
ALTER TABLE "AiActionRequest"
ADD CONSTRAINT "AiActionRequest_tokens_nonnegative"
CHECK (
  ("inputTokens" IS NULL OR "inputTokens" >= 0)
  AND
  ("outputTokens" IS NULL OR "outputTokens" >= 0)
);

-- Estimated provider cost must never be negative.
ALTER TABLE "AiActionRequest"
ADD CONSTRAINT "AiActionRequest_cost_nonnegative"
CHECK (
  "estimatedCostUsd" IS NULL
  OR "estimatedCostUsd" >= 0
);

-- Quota counters and configured limits must be valid.
ALTER TABLE "AiQuotaBucket"
ADD CONSTRAINT "AiQuotaBucket_counts_nonnegative"
CHECK (
  "used" >= 0
  AND "limitValue" >= 0
);
