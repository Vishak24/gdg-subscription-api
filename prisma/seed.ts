import bcrypt from 'bcrypt';
import { PrismaClient, Role, SubscriptionTier, SubscriptionStatus } from '@prisma/client';

const prisma = new PrismaClient();

const BCRYPT_ROUNDS = 12;

async function main() {
    console.log('🌱 Seeding database...');

    // ── Admin User ────────────────────────────────────────────────────────────
    const adminPassword = await bcrypt.hash('Admin@123', BCRYPT_ROUNDS);

    const adminFreeExpiry = new Date();
    adminFreeExpiry.setFullYear(adminFreeExpiry.getFullYear() + 100);

    const admin = await prisma.user.upsert({
        where: { email: 'admin@gdg.com' },
        update: {},
        create: {
            email: 'admin@gdg.com',
            password: adminPassword,
            name: 'GDG Admin',
            role: Role.ADMIN,
            subscriptions: {
                create: {
                    tier: SubscriptionTier.PREMIUM,
                    status: SubscriptionStatus.ACTIVE,
                    expiresAt: adminFreeExpiry,
                },
            },
        },
    });

    console.log(`✅ Admin user: ${admin.email} (role: ${admin.role})`);

    // ── Premium Test User ─────────────────────────────────────────────────────
    const premiumPassword = await bcrypt.hash('Test@123', BCRYPT_ROUNDS);

    const premiumExpiry = new Date();
    premiumExpiry.setDate(premiumExpiry.getDate() + 30);

    const premiumUser = await prisma.user.upsert({
        where: { email: 'premium@gdg.com' },
        update: {},
        create: {
            email: 'premium@gdg.com',
            password: premiumPassword,
            name: 'Premium Tester',
            role: Role.USER,
            subscriptions: {
                create: {
                    tier: SubscriptionTier.PREMIUM,
                    status: SubscriptionStatus.ACTIVE,
                    expiresAt: premiumExpiry,
                },
            },
        },
    });

    console.log(`✅ Premium user: ${premiumUser.email} (tier: PREMIUM, expires in 30 days)`);

    // ── Seed Activity Logs ────────────────────────────────────────────────────
    // Create some sample activity so the admin CSV report has data
    await prisma.activityLog.createMany({
        data: [
            { userId: admin.id, action: 'USER_LOGGED_IN', ipAddress: '127.0.0.1' },
            { userId: admin.id, action: 'CONTENT_ACCESSED', metadata: { tier: 'PREMIUM' }, ipAddress: '127.0.0.1' },
            { userId: premiumUser.id, action: 'USER_LOGGED_IN', ipAddress: '127.0.0.1' },
            { userId: premiumUser.id, action: 'SUBSCRIPTION_UPGRADED', metadata: { tier: 'PREMIUM' }, ipAddress: '127.0.0.1' },
            { userId: premiumUser.id, action: 'CONTENT_ACCESSED', metadata: { tier: 'PREMIUM' }, ipAddress: '127.0.0.1' },
        ],
        skipDuplicates: false,
    });

    console.log('✅ Sample activity logs seeded');
    console.log('\n📋 Evaluator credentials:');
    console.log('  Admin  → email: admin@gdg.com    | password: Admin@123');
    console.log('  Premium → email: premium@gdg.com | password: Test@123');
}

main()
    .catch((e) => {
        console.error('❌ Seed failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
