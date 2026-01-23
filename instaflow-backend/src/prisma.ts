import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { Connector } from '@google-cloud/cloud-sql-connector';

/**
 * Prisma Client Initialization with IAM Database Authentication
 */

let prismaInstance: PrismaClient;
const connector = new Connector();

export const initPrisma = async () => {
    if (prismaInstance) return prismaInstance;

    const runMode = process.env.RUN_MODE;
    console.log(`[Prisma] Initializing in ${runMode} mode...`);

    if (runMode === 'cloud') {
        const instanceName = process.env.INSTANCE_CONNECTION_NAME;
        const dbUser = process.env.DB_USER;
        const dbName = process.env.DB_NAME || 'instaflow';

        console.log(`[Prisma] Setting up Cloud SQL connection: user=${dbUser}, instance=${instanceName}, db=${dbName}`);

        if (!instanceName || !dbUser) {
            throw new Error('Missing database configuration: INSTANCE_CONNECTION_NAME or DB_USER');
        }

        const clientOpts = await connector.getOptions({
            instanceConnectionName: instanceName,
            authType: 'iam' as any,
        });

        const pool = new Pool({
            ...clientOpts,
            user: dbUser,
            database: dbName,
        });

        const adapter = new PrismaPg(pool);
        prismaInstance = new PrismaClient({
            adapter,
            log: ['query', 'info', 'warn', 'error'],
        });
    } else {
        console.log('[Prisma] Setting up standard connection (DATABASE_URL)');
        const pool = new Pool({
            connectionString: process.env.DATABASE_URL,
        });
        const adapter = new PrismaPg(pool);
        prismaInstance = new PrismaClient({
            adapter,
            log: ['info', 'warn', 'error'],
        });
    }

    // Test connection immediately
    try {
        await prismaInstance.$connect();
        console.log('[Prisma] Database connection established successfully');
    } catch (error) {
        console.error('[Prisma] Failed to connect to database during initialization:', error);
        throw error;
    }

    return prismaInstance;
};

// Fail-safe proxy: exports the prisma object but throws if used before initPrisma()
export const prisma = new Proxy({} as PrismaClient, {
    get: (target, prop, receiver) => {
        if (!prismaInstance) {
            // During some initialization phases or tests, this might be called.
            // But main app code should wait for initPrisma().
            throw new Error(`Prisma property "${String(prop)}" accessed before initPrisma() was called and finished.`);
        }
        return Reflect.get(prismaInstance, prop, receiver);
    },
});

export default prisma;
