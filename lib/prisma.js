import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis;

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL_POOLED;

  if (!connectionString) {
    throw new Error("DATABASE_URL_POOLED is not configured.");
  }

  const adapter = new PrismaNeon({
    connectionString,
  });

  return new PrismaClient({
    adapter,
  });
}

const prisma =
  globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;