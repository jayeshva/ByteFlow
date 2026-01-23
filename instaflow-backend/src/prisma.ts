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
    console.log(`[Prisma] Initializing in ${runMode} mode...`);

    let pool: Pool;

    if (runMode === 'cloud') {
        const instanceName = process.env.INSTANCE_CONNECTION_NAME;
        const dbUser = process.env.DB_USER;
        const dbName = process.env.DB_NAME || 'instaflow';

        console.log(`[Prisma] Cloud SQL Mode: ${instanceName} as ${dbUser}`);

        if (!instanceName || !dbUser) {
            throw new Error('Missing Cloud SQL configuration: INSTANCE_CONNECTION_NAME or DB_USER');
        }

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
        const dbUrl = process.env.DATABASE_URL;
        console.log('[Prisma] Local Mode: Initializing with adapter...');

        if (!dbUrl) {
            throw new Error('DATABASE_URL is missing in environment!');
        }

        // Explicitly parse the URL to ensure no environment variables override the credentials
        try {
            const url = new URL(dbUrl);
            const user = decodeURIComponent(url.username);
            const password = decodeURIComponent(url.password);
            const host = url.hostname;
            const port = parseInt(url.port || '5432');
            const database = decodeURIComponent(url.pathname.substring(1)) || 'instaflow';

            console.log(`[Prisma] Local Auth: user=${user}, host=${host}:${port}, db=${database}`);

            pool = new Pool({
                user,
                password,
                host,
                port,
                database,
                // SSL settings for local dev if needed, typically disabled
            });
        } catch (err: any) {
            console.error('[Prisma] Failed to parse DATABASE_URL:', err.message);
            // Fallback to simple connection string if URL parsing fails
            pool = new Pool({ connectionString: dbUrl });
        }
    }

    const adapter = new PrismaPg(pool);
    prismaInstance = new PrismaClient({
        adapter,
        log: ['info', 'warn', 'error']
    });

    // Verify connection with a real query
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
