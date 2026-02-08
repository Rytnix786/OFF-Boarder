// Prisma Client singleton for Server Components and Server Actions
// Force reload after schema update - v2
import "server-only";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function createPrismaClient() {
  // Use direct database URL for driver adapter, not Accelerate
  const connectionString = process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL;
  
  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is not set");
  }
  
  const poolMax = Number(process.env.PG_POOL_MAX ?? 10);
  const poolIdleTimeoutMs = Number(process.env.PG_POOL_IDLE_TIMEOUT_MS ?? 30000);
  const poolConnectionTimeoutMs = Number(process.env.PG_POOL_CONNECTION_TIMEOUT_MS ?? 15000);
  const poolMaxUses = Number(process.env.PG_POOL_MAX_USES ?? 500);

    const pool = new Pool({ 
      connectionString,
      max: poolMax,
      idleTimeoutMillis: poolIdleTimeoutMs,
      connectionTimeoutMillis: poolConnectionTimeoutMs,
      maxUses: poolMaxUses,
    });
  const adapter = new PrismaPg(pool, {
    schema: "public",
  });
  
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;
