import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { SubscriptionTier, SubscriptionStatus } from '@prisma/client';
import { prisma } from '../prisma/client';
import { env } from '../config/env';
import {
    ConflictError,
    AuthenticationError,
    NotFoundError,
} from '../utils/AppError';
import type { RegisterInput, LoginInput } from '../schemas/auth.schema';

const BCRYPT_ROUNDS = 12;
const FREE_TIER_EXPIRY_YEARS = 100; // effectively indefinite for free tier

interface AuthTokens {
    accessToken: string;
    refreshToken: string;
}

interface AuthResult {
    user: { id: string; email: string; name: string; role: string };
    tokens: AuthTokens;
}

/**
 * Generates a JWT access token for a given user ID.
 */
function signAccessToken(payload: { sub: string; email: string; role: string }): string {
    return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
        expiresIn: env.JWT_ACCESS_EXPIRES_IN as jwt.SignOptions['expiresIn'],
    });
}

/**
 * Generates a JWT refresh token and persists it in the database.
 */
async function createRefreshToken(userId: string): Promise<string> {
    const token = jwt.sign({ sub: userId }, env.JWT_REFRESH_SECRET, {
        expiresIn: env.JWT_REFRESH_EXPIRES_IN as jwt.SignOptions['expiresIn'],
    });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await prisma.refreshToken.create({
        data: { token, userId, expiresAt },
    });

    return token;
}

/**
 * Registers a new user account with a FREE subscription.
 * Throws ConflictError if email already exists.
 */
export async function registerUser(
    input: RegisterInput,
    ipAddress?: string
): Promise<AuthResult> {
    const existing = await prisma.user.findUnique({
        where: { email: input.email },
        select: { id: true },
    });

    if (existing) {
        throw new ConflictError('An account with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(input.password, BCRYPT_ROUNDS);

    const freeExpiry = new Date();
    freeExpiry.setFullYear(freeExpiry.getFullYear() + FREE_TIER_EXPIRY_YEARS);

    // Use a transaction to ensure user + subscription are created atomically
    const user = await prisma.$transaction(async (tx) => {
        const newUser = await tx.user.create({
            data: {
                email: input.email,
                password: hashedPassword,
                name: input.name,
            },
            select: { id: true, email: true, name: true, role: true },
        });

        await tx.subscription.create({
            data: {
                userId: newUser.id,
                tier: SubscriptionTier.FREE,
                status: SubscriptionStatus.ACTIVE,
                expiresAt: freeExpiry,
            },
        });

        await tx.activityLog.create({
            data: {
                userId: newUser.id,
                action: 'USER_REGISTERED',
                metadata: { email: newUser.email },
                ipAddress,
            },
        });

        return newUser;
    });

    const tokens: AuthTokens = {
        accessToken: signAccessToken({ sub: user.id, email: user.email, role: user.role }),
        refreshToken: await createRefreshToken(user.id),
    };

    return { user, tokens };
}

/**
 * Authenticates a user with email + password.
 * Returns access + refresh tokens on success.
 * Uses a constant-time compare to prevent timing attacks.
 */
export async function loginUser(
    input: LoginInput,
    ipAddress?: string
): Promise<AuthResult> {
    const user = await prisma.user.findUnique({
        where: { email: input.email },
        select: { id: true, email: true, name: true, role: true, password: true },
    });

    // Use bcrypt.compare even if user not found to prevent timing-based user enumeration
    const passwordMatch = user
        ? await bcrypt.compare(input.password, user.password)
        : await bcrypt.compare(input.password, '$2b$12$invalidhashtopreventtimingattack..');

    if (!user || !passwordMatch) {
        throw new AuthenticationError('Invalid email or password');
    }

    await prisma.activityLog.create({
        data: {
            userId: user.id,
            action: 'USER_LOGGED_IN',
            ipAddress,
        },
    });

    const tokens: AuthTokens = {
        accessToken: signAccessToken({ sub: user.id, email: user.email, role: user.role }),
        refreshToken: await createRefreshToken(user.id),
    };

    return {
        user: { id: user.id, email: user.email, name: user.name, role: user.role },
        tokens,
    };
}

/**
 * Rotates a refresh token: validates the existing one, deletes it,
 * and issues a new access token + refresh token pair.
 */
export async function refreshAccessToken(
    refreshToken: string
): Promise<AuthTokens> {
    let decoded: { sub: string };
    try {
        decoded = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as { sub: string };
    } catch {
        throw new AuthenticationError('Invalid or expired refresh token');
    }

    const storedToken = await prisma.refreshToken.findUnique({
        where: { token: refreshToken },
        include: { user: { select: { id: true, email: true, role: true } } },
    });

    if (!storedToken || storedToken.userId !== decoded.sub) {
        throw new AuthenticationError('Refresh token not recognized');
    }

    if (storedToken.expiresAt < new Date()) {
        await prisma.refreshToken.delete({ where: { token: refreshToken } });
        throw new AuthenticationError('Refresh token has expired, please log in again');
    }

    // Rotate: delete old, issue new
    await prisma.refreshToken.delete({ where: { token: refreshToken } });

    const newRefreshToken = await createRefreshToken(storedToken.user.id);
    const newAccessToken = signAccessToken({
        sub: storedToken.user.id,
        email: storedToken.user.email,
        role: storedToken.user.role,
    });

    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
}

/**
 * Invalidates a refresh token (logout).
 */
export async function logoutUser(
    refreshToken: string,
    userId: string,
    ipAddress?: string
): Promise<void> {
    const stored = await prisma.refreshToken.findUnique({
        where: { token: refreshToken },
    });

    if (!stored || stored.userId !== userId) {
        throw new NotFoundError('Refresh token');
    }

    await prisma.$transaction([
        prisma.refreshToken.delete({ where: { token: refreshToken } }),
        prisma.activityLog.create({
            data: { userId, action: 'USER_LOGGED_OUT', ipAddress },
        }),
    ]);
}
