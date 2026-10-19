-- Phase 21 real AI. ADDITIVE ONLY: no DROP, reset, truncate, or existing-row update.
-- Must be reviewed and explicitly approved BEFORE any execution against production Neon.
CREATE TABLE "AiGlobalBudget" (
  "id" TEXT NOT NULL,
  "ceilingMicros" INTEGER NOT NULL DEFAULT 0,
  "committedMicros" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AiGlobalBudget_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AiGlobalBudget_ceiling_nonnegative" CHECK ("ceilingMicros" >= 0),
  CONSTRAINT "AiGlobalBudget_committed_nonnegative" CHECK ("committedMicros" >= 0),
  CONSTRAINT "AiGlobalBudget_committed_within_ceiling" CHECK ("committedMicros" <= "ceilingMicros")
);
CREATE TABLE "AiSpendReservation" (
  "id" TEXT NOT NULL,
  "requestId" TEXT NOT NULL,
  "ownerId" TEXT NOT NULL,
  "reservedMicros" INTEGER NOT NULL,
  "actualMicros" INTEGER,
  "status" TEXT NOT NULL DEFAULT 'RESERVED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AiSpendReservation_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AiSpendReservation_reserved_positive" CHECK ("reservedMicros" > 0),
  CONSTRAINT "AiSpendReservation_actual_nonnegative" CHECK ("actualMicros" IS NULL OR "actualMicros" >= 0),
  CONSTRAINT "AiSpendReservation_actual_within_reservation" CHECK ("actualMicros" IS NULL OR "actualMicros" <= "reservedMicros")
);
CREATE UNIQUE INDEX "AiSpendReservation_requestId_key" ON "AiSpendReservation"("requestId");
CREATE INDEX "AiSpendReservation_ownerId_createdAt_idx" ON "AiSpendReservation"("ownerId", "createdAt");
ALTER TABLE "AiSpendReservation" ADD CONSTRAINT "AiSpendReservation_requestId_fkey"
  FOREIGN KEY ("requestId") REFERENCES "AiActionRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
-- Budget row is NOT automatically created or funded. Default = paid feature OFF.
