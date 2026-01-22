/**
 * Worker Entry Point
 * 
 * Runs the background worker independently from the API server.
 * Supports both BullMQ (local) and Pub/Sub (cloud) modes.
 * 
 * Usage:
 *   - Local: npm run start:worker (uses BullMQ + Redis)
 *   - Cloud: RUN_MODE=cloud npm run start:worker (uses Pub/Sub)
 */

import 'dotenv/config';
import express from 'express';
import { prisma } from './prisma';

const PORT = process.env.PORT || 8080;
const app = express();

app.get('/health', (req, res) => res.status(200).send('OK'));
app.get('/', (req, res) => res.status(200).send('Worker is active'));

const RUN_MODE = process.env.RUN_MODE || 'local';

async function startWorker() {
    console.log(`🚀 Starting worker in ${RUN_MODE} mode...`);

    // Connect to database
    try {
        await prisma.$connect();
        console.log('✅ Connected to database');
    } catch (err) {
        console.error('❌ DB connection error:', err);
        process.exit(1);
    }

    if (RUN_MODE === 'cloud') {
        // Cloud mode: Use Pub/Sub via unified worker
        console.log('☁️ Using GCP Pub/Sub for job processing');
        const { startUnifiedWorker } = await import('./workers/unified.worker');
        await startUnifiedWorker();

        // Also start retry worker in cloud mode to process overflow/delayed jobs
        await import('./workers/retry.worker');
        console.log('✅ Retry worker started (Cloud)');
    } else {
        // Local mode: Use BullMQ via unified worker
        const { startUnifiedWorker } = await import('./workers/unified.worker');
        await startUnifiedWorker();

        await import('./workers/retry.worker');
        console.log('✅ BullMQ workers started (Local)');
    }

    app.listen(PORT, () => {
        console.log(`🌐 Health check server listening on port ${PORT}`);
    });
}

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('📛 SIGTERM received, shutting down...');
    await prisma.$disconnect();
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('📛 SIGINT received, shutting down...');
    await prisma.$disconnect();
    process.exit(0);
});

startWorker().catch(err => {
    console.error('❌ Worker failed to start:', err);
    process.exit(1);
});
