import 'dotenv/config';
import app from './src/app';
import { config } from './src/config';
import logger from './src/utils/logger';
import prisma, { initPrisma } from './src/prisma';

const PORT = config.PORT || 4000;

const start = async () => {
  try {
    await initPrisma();
    logger.info('Connected to database');

    if (config.RUN_MODE === 'local') {
      logger.info('Starting workers in local mode...');
      require('./src/workers');

      const { registerBullMQUI } = require('./src/bullmq');
      registerBullMQUI(app);
    }

    app.listen(PORT, () => {
      logger.info(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    logger.error({ err: error }, 'Failed to start server');
    process.exit(1);
  }
};

start();
