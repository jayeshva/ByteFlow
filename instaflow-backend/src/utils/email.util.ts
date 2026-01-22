import logger from './logger';

export const sendEmail = async (to: string, subject: string, body: string) => {
    logger.info({ to, subject }, 'Simulating email sending');
};
