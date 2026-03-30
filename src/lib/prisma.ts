import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

// Cache in ALL environments — critical for Vercel serverless to prevent
// "PostgreSQL connection closed" errors from spawning multiple PrismaClients
globalForPrisma.prisma = prisma;
