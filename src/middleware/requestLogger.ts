import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { createChildLogger } from '../config/logger';

// Augment Express Request to carry correlationId and child logger
declare global {
    namespace Express {
        interface Request {
            correlationId: string;
            log: ReturnType<typeof createChildLogger>;
        }
    }
}

/**
 * Attaches a unique correlation ID to every incoming request.
 * Reads from X-Correlation-Id header if provided (for distributed tracing),
 * otherwise generates a new UUID v4.
 *
 * Also attaches a pino child logger bound to this correlationId, so every
 * log line within the request lifecycle is automatically tagged.
 */
export const requestLogger = (
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    const correlationId =
        (req.headers['x-correlation-id'] as string) ?? uuidv4();

    req.correlationId = correlationId;
    req.log = createChildLogger(correlationId);

    res.setHeader('X-Correlation-Id', correlationId);

    const startTime = Date.now();

    req.log.info(
        {
            method: req.method,
            url: req.originalUrl,
            ip: req.ip,
            userAgent: req.get('user-agent'),
        },
        'Incoming request'
    );

    res.on('finish', () => {
        const duration = Date.now() - startTime;
        const logFn =
            res.statusCode >= 500
                ? req.log.error.bind(req.log)
                : res.statusCode >= 400
                    ? req.log.warn.bind(req.log)
                    : req.log.info.bind(req.log);

        logFn(
            {
                method: req.method,
                url: req.originalUrl,
                statusCode: res.statusCode,
                durationMs: duration,
            },
            'Request completed'
        );
    });

    next();
};
