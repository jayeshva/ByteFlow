import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

/**
 * Prisma Client Singleton
 */

let prismaInstance: PrismaClient | null = null;

export const initPrisma = async () => {
    if (prismaInstance) return prismaInstance;

    const dbUrl = process.env.DATABASE_URL;

    if (!dbUrl) {
        throw new Error('DATABASE_URL is missing in environment!');
    }

    console.log(`[Prisma] Initializing connection with DATABASE_URL...`);

    const pool = new Pool({ connectionString: dbUrl });
    const adapter = new PrismaPg(pool);

    prismaInstance = new PrismaClient({
        adapter,
        log: ['info', 'warn', 'error']
    });

    // Verify connection
    try {
        await prismaInstance.$connect();
        await prismaInstance.$queryRaw`SELECT 1`;
        console.log('[Prisma] ✅ Database connection verified successfully');
    } catch (error: any) {
        console.error('[Prisma] ❌ Database connection failed:', error.message);
        throw error;
    }

    return prismaInstance;
};

// Proxy to allow importing 'prisma' directly while ensuring it's initialized
export const prisma = new Proxy({} as PrismaClient, {
    get: (target, prop, receiver) => {
        if (!prismaInstance) {
            throw new Error(`Prisma accessed before initialization. Ensure initPrisma() is awaited at startup.`);
        }
        return Reflect.get(prismaInstance, prop, receiver);
    },
});

export default prisma;
