import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import pg from "pg"; // Import the base pg driver

const connectionString = `${process.env.DATABASE_URL}`;

// 1. Setup the connection pool
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);

// 2. Singleton logic for development
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
