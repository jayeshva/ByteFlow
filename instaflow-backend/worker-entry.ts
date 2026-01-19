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
        // Cloud mode: Use Pub/Sub
        console.log('☁️ Using GCP Pub/Sub for job processing');
        const { startPubSubWorker } = await import('./services/pubsub.worker');
        await startPubSubWorker();
    } else {
        await import('./workers/comment.worker');
        console.log('✅ BullMQ worker started');
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
