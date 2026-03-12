import { Request, Response, NextFunction } from 'express';
import { SubscriptionTier, SubscriptionStatus } from '@prisma/client';
import { AuthenticationError, AuthorizationError } from '../utils/AppError';
import { prisma } from '../prisma/client';

// Augment Express Request with active subscription context
declare global {
    namespace Express {
        interface Request {
            subscription?: {
                id: string;
                tier: SubscriptionTier;
                expiresAt: Date;
            } | null;
        }
    }
}

/**
 * Authorization middleware factory.
 * Derives the user's current tier from the database — NEVER from a cached
 * user field. Queries for an active, non-expired subscription.
 *
 * Usage:
 *   router.get('/premium', authenticate, authorize('PREMIUM'), handler)
 *
 * Returns 401 if `req.user` is absent (authenticate not called first).
 * Returns 403 if the user's active subscription tier doesn't meet the requirement.
 *
 * @param requiredTier - The minimum tier required to access the route.
 */
export const authorize =
    (requiredTier: SubscriptionTier) =>
        async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
            try {
                if (!req.user) {
                    throw new AuthenticationError();
                }

                // Derive tier from the active subscription record
                const activeSubscription = await prisma.subscription.findFirst({
                    where: {
                        userId: req.user.id,
                        status: SubscriptionStatus.ACTIVE,
                        expiresAt: { gt: new Date() },
                    },
                    orderBy: { expiresAt: 'desc' },
                    select: { id: true, tier: true, expiresAt: true },
                });

                // Attach subscription context for downstream handlers
                req.subscription = activeSubscription;

                const tierHierarchy: Record<SubscriptionTier, number> = {
                    [SubscriptionTier.FREE]: 1,
                    [SubscriptionTier.PREMIUM]: 2,
                };

                const userTier = activeSubscription?.tier ?? SubscriptionTier.FREE;
                const userTierLevel = tierHierarchy[userTier];
                const requiredTierLevel = tierHierarchy[requiredTier];

                if (userTierLevel < requiredTierLevel) {
                    throw new AuthorizationError(
                        `This content requires a ${requiredTier} subscription. ` +
                        `Your current tier is ${userTier}. Upgrade at POST /api/subscriptions/upgrade.`
                    );
                }

                next();
            } catch (err) {
                next(err);
            }
        };
