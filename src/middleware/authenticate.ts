import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AuthenticationError } from '../utils/AppError';
import { prisma } from '../prisma/client';

export interface JwtPayload {
    sub: string;      // user ID
    email: string;
    role: string;
    iat: number;
    exp: number;
}

// Augment Express Request with authenticated user context
declare global {
    namespace Express {
        interface Request {
            user?: {
                id: string;
                email: string;
                role: string;
            };
        }
    }
}

/**
 * Verifies the Bearer JWT access token from the Authorization header.
 * On success, attaches `req.user` with the decoded payload.
 * Returns 401 on any failure — missing token, invalid signature, or expiry.
 *
 * Does NOT check subscription tier — that is the responsibility of authorize.ts.
 */
export const authenticate = async (
    req: Request,
    _res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader?.startsWith('Bearer ')) {
            throw new AuthenticationError('Missing or malformed Authorization header');
        }

        const token = authHeader.split(' ')[1];

        let decoded: JwtPayload;
        try {
            decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtPayload;
        } catch (err) {
            if (err instanceof jwt.TokenExpiredError) {
                throw new AuthenticationError('Access token has expired');
            }
            if (err instanceof jwt.JsonWebTokenError) {
                throw new AuthenticationError('Invalid access token');
            }
            throw err;
        }

        // Verify user still exists in the database (handles deleted accounts)
        const user = await prisma.user.findUnique({
            where: { id: decoded.sub },
            select: { id: true, email: true, role: true },
        });

        if (!user) {
            throw new AuthenticationError('User account no longer exists');
        }

        req.user = {
            id: user.id,
            email: user.email,
            role: user.role,
        };

        next();
    } catch (err) {
        next(err);
    }
};
