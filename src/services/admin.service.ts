import Papa from 'papaparse';
import { prisma } from '../prisma/client';
import { SubscriptionStatus } from '@prisma/client';

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

/**
 * Returns paginated activity logs for ALL users (admin view).
 * Optionally filter by userId or action via query params.
 */
export async function getAllLogs(
    page = 1,
    limit = DEFAULT_PAGE_SIZE,
    filters: { userId?: string; action?: string } = {}
) {
    const sanitizedLimit = Math.min(Math.max(1, limit), MAX_PAGE_SIZE);
    const skip = (Math.max(1, page) - 1) * sanitizedLimit;

    const where = {
        ...(filters.userId ? { userId: filters.userId } : {}),
        ...(filters.action ? { action: { contains: filters.action, mode: 'insensitive' as const } } : {}),
    };

    const [logs, total] = await prisma.$transaction([
        prisma.activityLog.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip,
            take: sanitizedLimit,
            select: {
                id: true,
                action: true,
                metadata: true,
                ipAddress: true,
                createdAt: true,
                user: { select: { id: true, email: true, name: true } },
            },
        }),
        prisma.activityLog.count({ where }),
    ]);

    return {
        logs,
        pagination: {
            total,
            page: Math.max(1, page),
            limit: sanitizedLimit,
            totalPages: Math.ceil(total / sanitizedLimit),
            hasNext: skip + sanitizedLimit < total,
            hasPrev: page > 1,
        },
    };
}

/**
 * Returns all users with their current active subscription status.
 * Derives tier from the active Subscription record — not a user field.
 */
export async function getAllUsers(page = 1, limit = DEFAULT_PAGE_SIZE) {
    const sanitizedLimit = Math.min(Math.max(1, limit), MAX_PAGE_SIZE);
    const skip = (Math.max(1, page) - 1) * sanitizedLimit;

    const [users, total] = await prisma.$transaction([
        prisma.user.findMany({
            orderBy: { createdAt: 'desc' },
            skip,
            take: sanitizedLimit,
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                createdAt: true,
                subscriptions: {
                    where: {
                        status: SubscriptionStatus.ACTIVE,
                        expiresAt: { gt: new Date() },
                    },
                    orderBy: { expiresAt: 'desc' },
                    take: 1,
                    select: {
                        tier: true,
                        status: true,
                        expiresAt: true,
                    },
                },
            },
        }),
        prisma.user.count(),
    ]);

    const enriched = users.map((u) => ({
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role,
        createdAt: u.createdAt,
        currentTier: u.subscriptions[0]?.tier ?? 'FREE',
        subscriptionStatus: u.subscriptions[0]?.status ?? 'NONE',
        subscriptionExpiresAt: u.subscriptions[0]?.expiresAt ?? null,
    }));

    return {
        users: enriched,
        pagination: {
            total,
            page: Math.max(1, page),
            limit: sanitizedLimit,
            totalPages: Math.ceil(total / sanitizedLimit),
            hasNext: skip + sanitizedLimit < total,
            hasPrev: page > 1,
        },
    };
}

/**
 * Generates a monthly usage CSV report.
 * Aggregates activity log counts and subscription upgrades per user per month.
 */
export async function generateMonthlyReportCsv(): Promise<string> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Fetch all activity + upgrades in the last 30 days
    const logs = await prisma.activityLog.findMany({
        where: { createdAt: { gte: thirtyDaysAgo } },
        select: {
            action: true,
            createdAt: true,
            user: { select: { id: true, email: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
    });

    // Aggregate by user + month
    const aggregated: Record<
        string,
        {
            userId: string;
            email: string;
            name: string;
            month: string;
            totalActions: number;
            logins: number;
            contentAccess: number;
            upgrades: number;
        }
    > = {};

    logs.forEach((log) => {
        const month = log.createdAt.toISOString().slice(0, 7); // YYYY-MM
        const key = `${log.user.id}::${month}`;

        if (!aggregated[key]) {
            aggregated[key] = {
                userId: log.user.id,
                email: log.user.email,
                name: log.user.name,
                month,
                totalActions: 0,
                logins: 0,
                contentAccess: 0,
                upgrades: 0,
            };
        }

        aggregated[key].totalActions++;
        if (log.action === 'USER_LOGGED_IN') aggregated[key].logins++;
        if (log.action === 'CONTENT_ACCESSED') aggregated[key].contentAccess++;
        if (log.action === 'SUBSCRIPTION_UPGRADED') aggregated[key].upgrades++;
    });

    const rows = Object.values(aggregated).sort(
        (a, b) => b.month.localeCompare(a.month) || a.email.localeCompare(b.email)
    );

    return Papa.unparse(rows, {
        header: true,
        columns: [
            'month',
            'userId',
            'email',
            'name',
            'totalActions',
            'logins',
            'contentAccess',
            'upgrades',
        ],
    });
}
