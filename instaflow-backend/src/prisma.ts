import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { Connector } from '@google-cloud/cloud-sql-connector';

/**
 * Prisma Client Initialization with IAM Database Authentication
 */

let prismaInstance: PrismaClient;
const connector = new Connector();

const getPrisma = async () => {
    if (prismaInstance) return prismaInstance;

    if (process.env.RUN_MODE === 'cloud') {
        const clientOpts = await connector.getOptions({
            instanceConnectionName: process.env.INSTANCE_CONNECTION_NAME || '',
            authType: 'iam' as any,
        });

        const pool = new Pool({
            ...clientOpts,
            user: process.env.DB_USER,
            database: process.env.DB_NAME || 'instaflow',
        });

        const adapter = new PrismaPg(pool);
        prismaInstance = new PrismaClient({ adapter });
    } else {
        prismaInstance = new PrismaClient();
    }

    return prismaInstance;
};

// Exporting a proxy to maintain sync identity while using async init
export const prisma = new Proxy({} as PrismaClient, {
    get: (target, prop, receiver) => {
        // This is a simplified proxy. In a real app, you'd want to ensure 
        // the client is ready before returning methods.
        // However, for Prisma, most methods are async anyway.
        const instance = (prismaInstance as any);
        if (instance) {
            return Reflect.get(instance, prop, receiver);
        }

        // Return a function that awaits the instance before calling
        return async (...args: any[]) => {
            const client = await getPrisma();
            return (client as any)[prop](...args);
        };
    },
});

export default prisma;
