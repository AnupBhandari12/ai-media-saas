-- ADDITIVE ONLY. No credit allocations, no existing-row modification, no vendor dispatch.
-- Review backup and prior migration status before separately approving production deploy.
CREATE TABLE "BgCreditBucket" (
 "id" TEXT NOT NULL,
 "scope" VARCHAR(10) NOT NULL,
 "scopeId" VARCHAR(256) NOT NULL,
 "period" VARCHAR(10) NOT NULL,
 "periodKey" VARCHAR(10) NOT NULL,
 "committed" INTEGER NOT NULL DEFAULT 0,
 "ceiling" INTEGER NOT NULL DEFAULT 0,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "BgCreditBucket_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "BgCreditBucket_nonnegative" CHECK ("committed" >= 0 AND "ceiling" >= 0 AND "committed" <= "ceiling"),
 CONSTRAINT "BgCreditBucket_valid_scope" CHECK ("scope" IN ('OWNER', 'POOL')),
 CONSTRAINT "BgCreditBucket_valid_period" CHECK ("period" IN ('DAY', 'MONTH'))
);
CREATE UNIQUE INDEX "BgCreditBucket_scope_scopeId_period_periodKey_key" ON "BgCreditBucket"("scope", "scopeId", "period", "periodKey");
CREATE INDEX "BgCreditBucket_scope_scopeId_idx" ON "BgCreditBucket"("scope", "scopeId");

CREATE TABLE "BgCreditReservation" (
 "id" TEXT NOT NULL,
 "requestId" UUID NOT NULL,
 "ownerId" TEXT NOT NULL,
 "imageSha256" CHAR(64) NOT NULL,
 "status" VARCHAR(20) NOT NULL DEFAULT 'RESERVED',
 "creditsReserved" INTEGER NOT NULL DEFAULT 1,
 "dispatchedAt" TIMESTAMP(3),
 "quotaDayStart" VARCHAR(10) NOT NULL,
 "quotaMonthStart" VARCHAR(7) NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "BgCreditReservation_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "BgCreditReservation_credit_unit" CHECK ("creditsReserved" = 1),
 CONSTRAINT "BgCreditReservation_valid_status" CHECK ("status" IN ('RESERVED','PROCESSING','UNKNOWN','FAILED','COMPLETED','CANCELLED'))
);
CREATE UNIQUE INDEX "BgCreditReservation_requestId_key" ON "BgCreditReservation"("requestId");
CREATE INDEX "BgCreditReservation_ownerId_createdAt_idx" ON "BgCreditReservation"("ownerId", "createdAt");

CREATE TABLE "BgStoredAsset" (
 "id" TEXT NOT NULL,
 "requestId" UUID NOT NULL,
 "ownerId" TEXT NOT NULL,
 "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
 "storageKey" VARCHAR(300) NOT NULL,
 "outputSha256" CHAR(64) NOT NULL,
 "originalSha256" CHAR(64) NOT NULL,
 "bytes" INTEGER NOT NULL,
 "width" INTEGER NOT NULL,
 "height" INTEGER NOT NULL,
 "expiresAt" TIMESTAMP(3) NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "BgStoredAsset_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "BgStoredAsset_valid_status" CHECK ("status" IN ('PENDING','STORED_VERIFIED')),
 CONSTRAINT "BgStoredAsset_positive_dimensions" CHECK ("bytes" > 0 AND "bytes" <= 20971520 AND "width" > 0 AND "height" > 0 AND "width" * "height" <= 8000000)
);
CREATE UNIQUE INDEX "BgStoredAsset_requestId_key" ON "BgStoredAsset"("requestId");
CREATE UNIQUE INDEX "BgStoredAsset_storageKey_key" ON "BgStoredAsset"("storageKey");
CREATE INDEX "BgStoredAsset_ownerId_createdAt_idx" ON "BgStoredAsset"("ownerId", "createdAt");
CREATE INDEX "BgStoredAsset_ownerId_expiresAt_idx" ON "BgStoredAsset"("ownerId", "expiresAt");
ALTER TABLE "BgStoredAsset" ADD CONSTRAINT "BgStoredAsset_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "BgCreditReservation"("requestId") ON DELETE RESTRICT ON UPDATE CASCADE;
