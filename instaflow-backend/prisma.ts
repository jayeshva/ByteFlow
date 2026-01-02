import { PrismaClient } from "./generated/prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

// Postgres connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Prisma adapter
const adapter = new PrismaPg(pool);

// Single Prisma Client instance
export const prisma = new PrismaClient({
  adapter,
});
