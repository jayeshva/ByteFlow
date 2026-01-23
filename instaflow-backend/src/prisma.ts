import dotenv from 'dotenv';
dotenv.config({ override: true });
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { Connector } from '@google-cloud/cloud-sql-connector';

/**
 * Prisma Client Singleton
 */

let prismaInstance: PrismaClient | null = null;
const connector = new Connector();

export const initPrisma = async () => {
    if (prismaInstance) return prismaInstance;

    const runMode = process.env.RUN_MODE;
    const dbUrl = process.env.DATABASE_URL;

    console.log(`[Prisma] Initializing in ${runMode} mode...`);

    let pool: Pool;

    if (runMode === 'cloud' && process.env.INSTANCE_CONNECTION_NAME) {
        const instanceName = process.env.INSTANCE_CONNECTION_NAME;
        const dbUser = process.env.DB_USER || 'instaflow';
        const dbName = process.env.DB_NAME || 'instaflow';

        console.log(`[Prisma] Cloud SQL Mode: ${instanceName} as ${dbUser}`);

        const clientOpts = await connector.getOptions({
            instanceConnectionName: instanceName,
            authType: 'iam' as any,
        });

        pool = new Pool({
            ...clientOpts,
            user: dbUser,
            database: dbName,
        });
    } else {
        console.log('[Prisma] Mode: Initializing with DATABASE_URL...');

        if (!dbUrl) {
            throw new Error('DATABASE_URL is missing in environment!');
        }

        pool = new Pool({ connectionString: dbUrl });
    }

    const adapter = new PrismaPg(pool);
    prismaInstance = new PrismaClient({
        adapter,
        log: ['info', 'warn', 'error']
    });

    // Verify connection
    try {
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
