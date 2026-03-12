import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { AppError, ValidationError } from '../utils/AppError';
import { logger } from '../config/logger';
import { env } from '../config/env';

/**
 * Centralized Express error handling middleware.
 * Must be registered LAST in the middleware chain (after all routes).
 *
 * Handles:
 * - AppError subclasses (operational errors) → structured response with correct status
 * - Prisma known errors → mapped to HTTP semantics (e.g., unique constraint = 409)
 * - ZodError (if thrown directly) → 400 with field details
 * - Unknown errors → 500, stack trace suppressed in production
 *
 * NEVER leaks stack traces or internal error details in production.
 */
export const errorHandler = (
    err: unknown,
    req: Request,
    res: Response,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _next: NextFunction
): void => {
    const correlationId = req.correlationId ?? 'unknown';

    // ── Operational AppErrors ──────────────────────────────────────────────
    if (err instanceof AppError) {
        if (!err.isOperational) {
            // Programmer error — log full details, respond with generic 500
            logger.error({ err, correlationId }, 'Non-operational AppError');
            res.status(500).json(genericError(correlationId));
            return;
        }

        req.log?.warn({ statusCode: err.statusCode, message: err.message }, 'Operational error');

        const body: Record<string, unknown> = {
            success: false,
            error: err.constructor.name,
            message: err.message,
            timestamp: new Date().toISOString(),
            correlationId,
        };

        if (err instanceof ValidationError && err.details) {
            body['details'] = err.details;
        }

        res.status(err.statusCode).json(body);
        return;
    }

    // ── Prisma Known Request Errors ────────────────────────────────────────
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
        req.log?.warn({ code: err.code, correlationId }, 'Prisma known error');

        switch (err.code) {
            case 'P2002': // Unique constraint violation
                res.status(409).json({
                    success: false,
                    error: 'ConflictError',
                    message: 'A record with this value already exists',
                    timestamp: new Date().toISOString(),
                    correlationId,
                });
                return;

            case 'P2025': // Record not found
                res.status(404).json({
                    success: false,
                    error: 'NotFoundError',
                    message: 'The requested record was not found',
                    timestamp: new Date().toISOString(),
                    correlationId,
                });
                return;

            default:
                logger.error({ err, correlationId }, 'Unhandled Prisma error');
                res.status(500).json(genericError(correlationId));
                return;
        }
    }

    // ── Zod Errors (thrown directly, not via validate middleware) ──────────
    if (err instanceof ZodError) {
        res.status(400).json({
            success: false,
            error: 'ValidationError',
            message: 'Validation failed',
            details: err.flatten().fieldErrors,
            timestamp: new Date().toISOString(),
            correlationId,
        });
        return;
    }

    // ── Unknown / Programmer Errors ────────────────────────────────────────
    logger.error({ err, correlationId }, 'Unhandled server error');
    res.status(500).json(genericError(correlationId));
};

function genericError(correlationId: string) {
    return {
        success: false,
        error: 'InternalServerError',
        message: 'An unexpected error occurred. Please try again later.',
        timestamp: new Date().toISOString(),
        correlationId,
    };
}

/**
 * Catches unhandled route paths (404).
 * Register before errorHandler but after all routes.
 */
export const notFoundHandler = (req: Request, _res: Response, next: NextFunction): void => {
    const { AppError: AE } = require('../utils/AppError');
    next(new AE(`Route ${req.method} ${req.originalUrl} not found`, 404));
};
