import { PrismaClient } from '@prisma/client';
import { logger } from '../config/logger';

const logConfig = [
    { emit: 'event' as const, level: 'query' as const },
    { emit: 'event' as const, level: 'error' as const },
    { emit: 'event' as const, level: 'warn' as const },
];

type LoggingPrismaClient = PrismaClient<{ log: typeof logConfig }>;

declare global {
    // eslint-disable-next-line no-var
    var __prisma: LoggingPrismaClient | undefined;
}

/**
 * Singleton Prisma client.
 * In development, reuse the global instance across hot-reloads to avoid
 * exhausting the database connection pool.
 */
export const prisma: LoggingPrismaClient =
    global.__prisma ??
    new PrismaClient({ log: logConfig });

if (process.env.NODE_ENV === 'development') {
    global.__prisma = prisma;

    // Log slow queries in development
    prisma.$on('query', (e) => {
        if (e.duration > 500) {
            logger.warn({ query: e.query, duration: e.duration }, 'Slow query detected');
        }
    });
}

prisma.$on('error', (e) => {
    logger.error({ target: e.target }, 'Prisma error');
});
