import logger from './logger';

export const blacklistToken = async (token: string) => {
    logger.info({ token }, 'Simulating token blacklisting');
};
