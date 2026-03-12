// Load env first — validates all vars and exits on failure
import './config/env';

import http from 'http';
import app from './app';
import { env } from './config/env';
import { logger } from './config/logger';
import { prisma } from './prisma/client';

const server = http.createServer(app);

async function startServer(): Promise<void> {
    // Verify database connection before accepting traffic
    try {
        await prisma.$connect();
        logger.info('✅ Database connection established');
    } catch (error) {
        logger.fatal({ error }, '❌ Failed to connect to database');
        process.exit(1);
    }

    server.listen(env.PORT, () => {
        logger.info(
            {
                port: env.PORT,
                env: env.NODE_ENV,
                docs: `http://localhost:${env.PORT}/api/docs`,
                health: `http://localhost:${env.PORT}/health`,
            },
            `🚀 GDG Subscription API running on port ${env.PORT}`
        );
    });
}

/**
 * Graceful shutdown handler.
 * Stops accepting new connections, waits for in-flight requests,
 * then disconnects Prisma cleanly.
 */
async function gracefulShutdown(signal: string): Promise<void> {
    logger.warn({ signal }, 'Received shutdown signal — closing gracefully');

    server.close(async (err) => {
        if (err) {
            logger.error({ err }, 'Error closing HTTP server');
            process.exit(1);
        }

        try {
            await prisma.$disconnect();
            logger.info('Prisma disconnected cleanly');
            logger.info('Shutdown complete');
            process.exit(0);
        } catch (disconnectErr) {
            logger.error({ err: disconnectErr }, 'Error disconnecting Prisma');
            process.exit(1);
        }
    });

    // Force exit if graceful shutdown takes too long
    setTimeout(() => {
        logger.error('Graceful shutdown timeout — forcing exit');
        process.exit(1);
    }, 10_000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Catch unhandled rejections — log and exit (programmer error = crash + restart)
process.on('unhandledRejection', (reason) => {
    logger.fatal({ reason }, 'Unhandled promise rejection — exiting');
    process.exit(1);
});

process.on('uncaughtException', (err) => {
    logger.fatal({ err }, 'Uncaught exception — exiting');
    process.exit(1);
});

startServer().catch((err) => {
    logger.fatal({ err }, 'Failed to start server');
    process.exit(1);
});
