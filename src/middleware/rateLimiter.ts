import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

const createRateLimitHandler = (tier: string) => (_req: Request, res: Response) => {
    res.status(429).json({
        success: false,
        error: 'Too Many Requests',
        message: `Rate limit exceeded for ${tier}. Please slow down and try again later.`,
        timestamp: new Date().toISOString(),
    });
};

/**
 * Strict limiter for auth endpoints (login, register).
 * Protects against brute-force and credential stuffing attacks.
 * 5 requests per 15 minutes per IP.
 */
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    handler: createRateLimitHandler('authentication'),
    keyGenerator: (req) => req.ip ?? 'unknown',
});

/**
 * Rate limiter for free-tier users.
 * Keyed by user ID (when authenticated) or IP address (anonymous).
 * 20 requests per 15 minutes.
 */
export const freeLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    handler: createRateLimitHandler('free tier'),
    keyGenerator: (req) => req.user?.id ?? req.ip ?? 'unknown',
});

/**
 * Rate limiter for premium-tier users.
 * Keyed by user ID for fair accounting.
 * 200 requests per 15 minutes.
 */
export const premiumLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    handler: createRateLimitHandler('premium tier'),
    keyGenerator: (req) => req.user?.id ?? req.ip ?? 'unknown',
});
