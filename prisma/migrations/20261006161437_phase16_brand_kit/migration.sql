-- CreateTable
CREATE TABLE "BrandKit" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "brandName" TEXT,
    "primaryColor" TEXT NOT NULL DEFAULT '#4f46e5',
    "secondaryColor" TEXT NOT NULL DEFAULT '#0891b2',
    "logoPublicId" TEXT,
    "logoSecureUrl" TEXT,
    "logoFormat" TEXT,
    "logoWidth" INTEGER,
    "logoHeight" INTEGER,
    "defaultWatermarkType" TEXT NOT NULL DEFAULT 'TEXT',
    "defaultWatermarkText" TEXT,
    "defaultWatermarkOpacity" INTEGER NOT NULL DEFAULT 25,
    "defaultWatermarkSize" INTEGER NOT NULL DEFAULT 20,
    "defaultWatermarkPosition" TEXT NOT NULL DEFAULT 'BOTTOM_RIGHT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrandKit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BrandKit_ownerId_key" ON "BrandKit"("ownerId");
