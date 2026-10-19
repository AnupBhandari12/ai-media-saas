-- REVIEW ONLY. NOT PART OF prisma/migrations; NOT EXECUTED BY INSTALLER.
-- THIS IS A PROPOSED POSTGRES SCHEMA FOR FUTURE OPERATOR APPROVAL.
-- Must be reconciled with EXISTING Prisma schema and shared AiQuotaBucket.
-- Do NOT apply to the production Neon branch without a separate rollout plan.

CREATE TABLE "BgCreditBucket" (
  "id" TEXT PRIMARY KEY,
  "scope" TEXT NOT NULL CHECK ("scope" IN ('OWNER', 'POOL')),
  "scopeId" TEXT NOT NULL,
  "period" TEXT NOT NULL CHECK ("period" IN ('DAY', 'MONTH')),
  "periodKey" TEXT NOT NULL,
  "committed" INTEGER NOT NULL DEFAULT 0 CHECK ("committed" >= 0),
  "ceiling" INTEGER NOT NULL CHECK ("ceiling" > 0 AND "ceiling" <= 1000000),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BgCreditBucket_budget" CHECK ("committed" <= "ceiling"),
  CONSTRAINT "BgCreditBucket_unique_period" UNIQUE ("scope", "scopeId", "period", "periodKey")
);

CREATE TABLE "BgCreditReservation" (
  "requestId" TEXT PRIMARY KEY,
  "ownerId" TEXT NOT NULL,
  "imageSha256" CHAR(64) NOT NULL,
  "status" TEXT NOT NULL CHECK ("status" IN ('RESERVED', 'PROCESSING', 'UNKNOWN', 'COMPLETED', 'CANCELLED')),
  "creditsReserved" INTEGER NOT NULL DEFAULT 1 CHECK ("creditsReserved" = 1),
  "quotaDayStart" TEXT NOT NULL,
  "quotaMonthStart" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "dispatchedAt" TIMESTAMPTZ NULL
);
CREATE INDEX "BgCreditReservation_owner_createdAt_idx" ON "BgCreditReservation"("ownerId", "createdAt");

-- Provision 2 OWNER + 2 POOL budget rows only with explicit approved limits.
-- The local ledger is NOT the vendor's authoritative credit balance.
-- A budget reservation is NOT permission to call a paid provider.
-- Next steps: Prisma schema alignment; run migration on an isolated DB;
-- test SERIALIZABLE conflicts and multi-instance behavior; reconcile shared
-- AI quota counters and vendor billing; request paid-spend authorization.
