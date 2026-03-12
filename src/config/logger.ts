import pino from 'pino';
import { env } from './env';

export const logger = pino({
    level: env.LOG_LEVEL,
    transport:
        env.NODE_ENV === 'development'
            ? {
                target: 'pino-pretty',
                options: {
                    colorize: true,
                    translateTime: 'SYS:standard',
                    ignore: 'pid,hostname',
                },
            }
            : undefined,
    base: {
        service: 'gdg-subscription-api',
        env: env.NODE_ENV,
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    redact: {
        paths: ['req.headers.authorization', 'body.password', 'body.refreshToken'],
        censor: '[REDACTED]',
    },
});

/**
 * Creates a child logger bound to a specific correlation ID.
 * Use this inside request handlers to keep logs traceable.
 */
export const createChildLogger = (correlationId: string) =>
    logger.child({ correlationId });
