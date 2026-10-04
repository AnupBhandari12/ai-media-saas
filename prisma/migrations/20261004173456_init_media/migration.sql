-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('IMAGE', 'VIDEO');

-- CreateEnum
CREATE TYPE "MediaStatus" AS ENUM ('PENDING', 'READY', 'FAILED');

-- CreateTable
CREATE TABLE "Media" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "type" "MediaType" NOT NULL,
    "status" "MediaStatus" NOT NULL DEFAULT 'PENDING',
    "originalFilename" TEXT NOT NULL,
    "cloudinaryPublicId" TEXT NOT NULL,
    "secureUrl" TEXT NOT NULL,
    "format" TEXT,
    "bytes" INTEGER,
    "width" INTEGER,
    "height" INTEGER,
    "duration" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Media_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Media_cloudinaryPublicId_key" ON "Media"("cloudinaryPublicId");

-- CreateIndex
CREATE INDEX "Media_ownerId_idx" ON "Media"("ownerId");

-- CreateIndex
CREATE INDEX "Media_ownerId_createdAt_idx" ON "Media"("ownerId", "createdAt");
