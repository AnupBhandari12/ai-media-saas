-- Phase 23: voluntary user-owned prompt/workflow metadata; separate from permanent Media/GeneratedAsset.
CREATE TABLE "WorkspaceHistory" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "prompt" VARCHAR(500) NOT NULL,
    "workflowId" VARCHAR(16) NOT NULL,
    "variantId" VARCHAR(32) NOT NULL,
    "taskStatus" VARCHAR(16) NOT NULL DEFAULT 'SAVED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "WorkspaceHistory_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "WorkspaceHistory_ownerId_createdAt_idx" ON "WorkspaceHistory"("ownerId", "createdAt");
