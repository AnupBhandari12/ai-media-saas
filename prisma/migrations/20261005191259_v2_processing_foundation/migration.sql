-- CreateEnum
CREATE TYPE "ProcessingJobStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateTable
CREATE TABLE "GeneratedAsset" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "sourceMediaId" TEXT,
    "jobId" TEXT,
    "kind" TEXT NOT NULL,
    "format" TEXT,
    "mimeType" TEXT,
    "bytes" INTEGER,
    "width" INTEGER,
    "height" INTEGER,
    "duration" DOUBLE PRECISION,
    "pages" INTEGER,
    "storageProvider" TEXT,
    "storageKey" TEXT,
    "secureUrl" TEXT,
    "expiresAt" TIMESTAMP(3),
    "saved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GeneratedAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcessingJob" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "toolId" TEXT,
    "workflowId" TEXT,
    "status" "ProcessingJobStatus" NOT NULL DEFAULT 'PENDING',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "inputRefs" JSONB,
    "resultRefs" JSONB,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProcessingJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsageEvent" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "quotaKey" TEXT NOT NULL,
    "units" INTEGER NOT NULL DEFAULT 1,
    "toolId" TEXT,
    "jobId" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UsageEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GeneratedAsset_ownerId_idx" ON "GeneratedAsset"("ownerId");

-- CreateIndex
CREATE INDEX "GeneratedAsset_sourceMediaId_idx" ON "GeneratedAsset"("sourceMediaId");

-- CreateIndex
CREATE INDEX "GeneratedAsset_jobId_idx" ON "GeneratedAsset"("jobId");

-- CreateIndex
CREATE INDEX "GeneratedAsset_ownerId_createdAt_idx" ON "GeneratedAsset"("ownerId", "createdAt");

-- CreateIndex
CREATE INDEX "ProcessingJob_ownerId_idx" ON "ProcessingJob"("ownerId");

-- CreateIndex
CREATE INDEX "ProcessingJob_ownerId_status_idx" ON "ProcessingJob"("ownerId", "status");

-- CreateIndex
CREATE INDEX "ProcessingJob_toolId_idx" ON "ProcessingJob"("toolId");

-- CreateIndex
CREATE INDEX "ProcessingJob_workflowId_idx" ON "ProcessingJob"("workflowId");

-- CreateIndex
CREATE INDEX "ProcessingJob_createdAt_idx" ON "ProcessingJob"("createdAt");

-- CreateIndex
CREATE INDEX "UsageEvent_ownerId_idx" ON "UsageEvent"("ownerId");

-- CreateIndex
CREATE INDEX "UsageEvent_quotaKey_idx" ON "UsageEvent"("quotaKey");

-- CreateIndex
CREATE INDEX "UsageEvent_toolId_idx" ON "UsageEvent"("toolId");

-- CreateIndex
CREATE INDEX "UsageEvent_jobId_idx" ON "UsageEvent"("jobId");

-- CreateIndex
CREATE INDEX "UsageEvent_ownerId_occurredAt_idx" ON "UsageEvent"("ownerId", "occurredAt");

-- AddForeignKey
ALTER TABLE "GeneratedAsset" ADD CONSTRAINT "GeneratedAsset_sourceMediaId_fkey" FOREIGN KEY ("sourceMediaId") REFERENCES "Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedAsset" ADD CONSTRAINT "GeneratedAsset_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "ProcessingJob"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsageEvent" ADD CONSTRAINT "UsageEvent_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "ProcessingJob"("id") ON DELETE SET NULL ON UPDATE CASCADE;
