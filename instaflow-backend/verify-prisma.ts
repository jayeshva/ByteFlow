import * as dotenv from 'dotenv';
dotenv.config();
import { prisma, initPrisma } from './src/prisma';

async function main() {
    try {
        await initPrisma();
        const count = await prisma.user.count();
        console.log('Successfully connected to database. User count:', count);
        process.exit(0);
    } catch (error) {
        console.error('Failed to connect to database or Prisma error:', error);
        process.exit(1);
    }
}

main();
