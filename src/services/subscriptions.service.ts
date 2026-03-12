import { SubscriptionTier, SubscriptionStatus } from '@prisma/client';
import { prisma } from '../prisma/client';
import { ConflictError, NotFoundError } from '../utils/AppError';

const PREMIUM_DURATION_DAYS = 30;

/**
 * Returns the current active subscription for a user.
 * Derives tier from the database — never from a stored user field.
 */
export async function getSubscriptionStatus(userId: string) {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, name: true },
    });

    if (!user) throw new NotFoundError('User');

    const activeSubscription = await prisma.subscription.findFirst({
        where: {
            userId,
            status: SubscriptionStatus.ACTIVE,
            expiresAt: { gt: new Date() },
        },
        orderBy: { expiresAt: 'desc' },
        select: {
            id: true,
            tier: true,
            status: true,
            startDate: true,
            expiresAt: true,
        },
    });

    const now = new Date();
    const daysRemaining = activeSubscription
        ? Math.max(
            0,
            Math.ceil(
                (activeSubscription.expiresAt.getTime() - now.getTime()) /
                (1000 * 60 * 60 * 24)
            )
        )
        : 0;

    return {
        currentTier: activeSubscription?.tier ?? SubscriptionTier.FREE,
        subscription: activeSubscription,
        daysRemaining,
        isActive: !!activeSubscription,
    };
}

/**
 * Upgrades a user from FREE to PREMIUM.
 * Idempotent: rejects if there is already an active PREMIUM subscription.
 * Creates a new PREMIUM subscription record with a 30-day expiry.
 */
export async function upgradeSubscription(userId: string, ipAddress?: string) {
    const existingPremium = await prisma.subscription.findFirst({
        where: {
            userId,
            tier: SubscriptionTier.PREMIUM,
            status: SubscriptionStatus.ACTIVE,
            expiresAt: { gt: new Date() },
        },
    });

    if (existingPremium) {
        throw new ConflictError(
            `You already have an active PREMIUM subscription. ` +
            `It expires on ${existingPremium.expiresAt.toISOString()}.`
        );
    }

    const startDate = new Date();
    const expiresAt = new Date(startDate);
    expiresAt.setDate(expiresAt.getDate() + PREMIUM_DURATION_DAYS);

    const subscription = await prisma.$transaction(async (tx) => {
        // Expire any existing FREE subscription cleanly
        await tx.subscription.updateMany({
            where: {
                userId,
                tier: SubscriptionTier.FREE,
                status: SubscriptionStatus.ACTIVE,
            },
            data: { status: SubscriptionStatus.CANCELLED },
        });

        const newSub = await tx.subscription.create({
            data: {
                userId,
                tier: SubscriptionTier.PREMIUM,
                status: SubscriptionStatus.ACTIVE,
                startDate,
                expiresAt,
            },
        });

        await tx.activityLog.create({
            data: {
                userId,
                action: 'SUBSCRIPTION_UPGRADED',
                metadata: {
                    tier: SubscriptionTier.PREMIUM,
                    expiresAt: expiresAt.toISOString(),
                    durationDays: PREMIUM_DURATION_DAYS,
                },
                ipAddress,
            },
        });

        return newSub;
    });

    return subscription;
}

/**
 * Returns the full subscription history for a user (all records, all statuses).
 */
export async function getSubscriptionHistory(userId: string) {
    return prisma.subscription.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        select: {
            id: true,
            tier: true,
            status: true,
            startDate: true,
            expiresAt: true,
            createdAt: true,
        },
    });
}
