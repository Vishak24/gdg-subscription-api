import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { AuthenticationError, AuthorizationError } from '../utils/AppError';

/**
 * Role-based authorization middleware factory.
 * Checks that the authenticated user has the required role.
 * Must be used AFTER authenticate middleware.
 *
 * Usage:
 *   router.get('/admin/logs', authenticate, authorizeRole('ADMIN'), handler)
 *
 * Returns 401 if req.user is absent (authenticate not called first).
 * Returns 403 if the user's role does not match.
 */
export const authorizeRole =
    (requiredRole: Role) =>
        (req: Request, _res: Response, next: NextFunction): void => {
            if (!req.user) {
                return next(new AuthenticationError());
            }

            if (req.user.role !== requiredRole) {
                return next(
                    new AuthorizationError(
                        `This endpoint requires the ${requiredRole} role. Your role is ${req.user.role}.`
                    )
                );
            }

            next();
        };
