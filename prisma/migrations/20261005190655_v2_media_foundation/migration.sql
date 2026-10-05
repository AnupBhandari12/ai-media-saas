-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "MediaType" ADD VALUE 'AUDIO';
ALTER TYPE "MediaType" ADD VALUE 'PDF';
ALTER TYPE "MediaType" ADD VALUE 'DOCUMENT';
ALTER TYPE "MediaType" ADD VALUE 'OTHER';

-- AlterTable
ALTER TABLE "Media" ADD COLUMN     "mimeType" TEXT,
ADD COLUMN     "sourceSize" INTEGER,
ADD COLUMN     "storageProvider" TEXT;
