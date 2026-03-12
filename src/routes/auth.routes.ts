import { Router } from 'express';
import * as AuthController from '../controllers/auth.controller';
import { authenticate } from '../middleware/authenticate';
import { validate } from '../middleware/validate';
import { authLimiter } from '../middleware/rateLimiter';
import { asyncHandler } from '../utils/asyncHandler';
import {
    registerSchema,
    loginSchema,
    refreshTokenSchema,
    logoutSchema,
} from '../schemas/auth.schema';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Authentication
 *   description: User registration, login, token refresh, and logout
 */

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Authentication]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password]
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Alex Johnson"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "alex@example.com"
 *               password:
 *                 type: string
 *                 minLength: 8
 *                 example: "SecurePass1!"
 *     responses:
 *       201:
 *         description: Account created. Returns user info and auth tokens.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: Validation error
 *       409:
 *         description: Email already registered
 *       429:
 *         description: Too many registration attempts
 */
router.post(
    '/register',
    authLimiter,
    validate(registerSchema),
    asyncHandler(AuthController.register)
);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login with email and password
 *     tags: [Authentication]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful. Returns accessToken and refreshToken.
 *       401:
 *         description: Invalid credentials
 *       429:
 *         description: Too many login attempts
 */
router.post(
    '/login',
    authLimiter,
    validate(loginSchema),
    asyncHandler(AuthController.login)
);

/**
 * @swagger
 * /auth/refresh:
 *   post:
 *     summary: Rotate access token using a refresh token
 *     tags: [Authentication]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: New accessToken and refreshToken pair issued.
 *       401:
 *         description: Invalid or expired refresh token
 */
router.post(
    '/refresh',
    validate(refreshTokenSchema),
    asyncHandler(AuthController.refresh)
);

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Logout and invalidate the refresh token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Successfully logged out
 *       401:
 *         description: Not authenticated
 */
router.post(
    '/logout',
    authenticate,
    validate(logoutSchema),
    asyncHandler(AuthController.logout)
);

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Get current authenticated user info
 *     tags: [Authentication]
 *     responses:
 *       200:
 *         description: Authenticated user profile
 *       401:
 *         description: Not authenticated
 */
router.get('/me', authenticate, asyncHandler(AuthController.me));

export default router;
