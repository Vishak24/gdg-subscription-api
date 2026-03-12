import { prisma } from '../prisma/client';

interface ContentItem {
    id: string;
    title: string;
    description: string;
    category: string;
    publishedAt: string;
    readMinutes: number;
    tags: string[];
}

interface PremiumContentItem extends ContentItem {
    fullContent: string;
    author: string;
    exclusiveResources: string[];
}

const FREE_CONTENT: ContentItem[] = [
    {
        id: 'free-001',
        title: 'Introduction to Cloud Architecture',
        description: 'Learn the fundamentals of designing scalable cloud systems.',
        category: 'Cloud',
        publishedAt: '2024-01-15',
        readMinutes: 8,
        tags: ['cloud', 'architecture', 'beginner'],
    },
    {
        id: 'free-002',
        title: 'REST API Design Best Practices',
        description: 'How to design clean, intuitive REST APIs that developers love.',
        category: 'Backend',
        publishedAt: '2024-02-01',
        readMinutes: 10,
        tags: ['api', 'rest', 'backend'],
    },
    {
        id: 'free-003',
        title: 'Getting Started with Git',
        description: 'Branching, merging, rebasing, and CI/CD workflows explained.',
        category: 'Dev Tools',
        publishedAt: '2024-02-20',
        readMinutes: 6,
        tags: ['git', 'workflow', 'devops'],
    },
    {
        id: 'free-004',
        title: 'Understanding HTTP Status Codes',
        description: '401 vs 403, 200 vs 201 — when to use each and why it matters.',
        category: 'Backend',
        publishedAt: '2024-03-05',
        readMinutes: 5,
        tags: ['http', 'api', 'fundamentals'],
    },
];

const PREMIUM_CONTENT: PremiumContentItem[] = [
    {
        id: 'prem-001',
        title: 'Production-Grade Microservices with Kubernetes',
        description: 'Deep dive into deploying, scaling, and observing microservices at scale.',
        category: 'DevOps',
        publishedAt: '2024-03-01',
        readMinutes: 35,
        tags: ['kubernetes', 'microservices', 'devops', 'production'],
        fullContent:
            'Kubernetes has become the de facto standard for container orchestration. In this exclusive ' +
            'guide, we cover StatefulSets, HPA auto-scaling, custom metrics with Prometheus, and ' +
            'zero-downtime rolling deployments using readiness probes...',
        author: 'GDG Cloud Team',
        exclusiveResources: [
            'https://resources.gdg.dev/k8s-helm-charts',
            'https://resources.gdg.dev/observability-stack',
        ],
    },
    {
        id: 'prem-002',
        title: 'Advanced PostgreSQL: Indexing & Query Optimization',
        description: 'Move beyond EXPLAIN to write queries that stay fast at 100M records.',
        category: 'Database',
        publishedAt: '2024-03-15',
        readMinutes: 40,
        tags: ['postgresql', 'database', 'performance', 'advanced'],
        fullContent:
            'Partial indexes, covering indexes, and index-only scans can reduce query time by orders ' +
            'of magnitude. We walk through real-world slow query logs and show how BRIN indexes can ' +
            'slash storage on time-series tables...',
        author: 'GDG DB Guild',
        exclusiveResources: [
            'https://resources.gdg.dev/pg-index-advisor',
            'https://resources.gdg.dev/query-plans-cheatsheet',
        ],
    },
    {
        id: 'prem-003',
        title: 'Designing Zero-Downtime Database Migrations',
        description: 'Migrate schemas on live databases without alerts going off at 3am.',
        category: 'Database',
        publishedAt: '2024-04-01',
        readMinutes: 28,
        tags: ['database', 'migrations', 'production', 'patterns'],
        fullContent:
            'Expand-contract migrations, shadow tables, and online schema change tools like pt-osc and ' +
            'gh-ost. We cover how to safely rename columns, add NOT NULL constraints, and backfill data ' +
            'in batches — all without downtime...',
        author: 'GDG Backend Team',
        exclusiveResources: ['https://resources.gdg.dev/migration-runbooks'],
    },
];

/**
 * Returns the free content catalog and logs the access.
 */
export async function getFreeContent(userId: string, ipAddress?: string) {
    await prisma.activityLog.create({
        data: {
            userId,
            action: 'CONTENT_ACCESSED',
            metadata: { tier: 'FREE', itemCount: FREE_CONTENT.length },
            ipAddress,
        },
    });

    return {
        tier: 'FREE',
        totalItems: FREE_CONTENT.length,
        items: FREE_CONTENT,
    };
}

/**
 * Returns the premium content catalog and logs the access.
 * Authorization is enforced by the authorize middleware upstream.
 */
export async function getPremiumContent(userId: string, ipAddress?: string) {
    await prisma.activityLog.create({
        data: {
            userId,
            action: 'CONTENT_ACCESSED',
            metadata: { tier: 'PREMIUM', itemCount: PREMIUM_CONTENT.length },
            ipAddress,
        },
    });

    return {
        tier: 'PREMIUM',
        totalItems: PREMIUM_CONTENT.length,
        items: PREMIUM_CONTENT,
        accessGrantedAt: new Date().toISOString(),
    };
}
