import { prisma } from '../prisma/client';

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

/**
 * Returns paginated activity logs for a specific user.
 * Users can only access their own activity — ownership enforced at controller level.
 */
export async function getUserActivity(
    userId: string,
    page = 1,
    limit = DEFAULT_PAGE_SIZE
) {
    const sanitizedLimit = Math.min(Math.max(1, limit), MAX_PAGE_SIZE);
    const skip = (Math.max(1, page) - 1) * sanitizedLimit;

    const [logs, total] = await prisma.$transaction([
        prisma.activityLog.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            skip,
            take: sanitizedLimit,
            select: {
                id: true,
                action: true,
                metadata: true,
                ipAddress: true,
                createdAt: true,
            },
        }),
        prisma.activityLog.count({ where: { userId } }),
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
