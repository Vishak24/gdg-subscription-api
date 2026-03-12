import { Router } from 'express';
import * as SubscriptionsController from '../controllers/subscriptions.controller';
import { authenticate } from '../middleware/authenticate';
import { freeLimiter } from '../middleware/rateLimiter';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

// All subscription routes require authentication
router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: Subscriptions
 *   description: Subscription status, upgrade simulation, and history
 */

/**
 * @swagger
 * /subscriptions/status:
 *   get:
 *     summary: Get current subscription status
 *     description: Returns the user's active subscription tier (derived from DB records), expiry date, and days remaining.
 *     tags: [Subscriptions]
 *     responses:
 *       200:
 *         description: Current subscription details
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         currentTier:
 *                           type: string
 *                           enum: [FREE, PREMIUM]
 *                         daysRemaining:
 *                           type: integer
 *                         isActive:
 *                           type: boolean
 *       401:
 *         description: Not authenticated
 */
router.get('/status', asyncHandler(SubscriptionsController.getStatus));

/**
 * @swagger
 * /subscriptions/upgrade:
 *   post:
 *     summary: Upgrade to PREMIUM subscription
 *     description: |
 *       Simulates a subscription upgrade. Idempotent — returns 409 if user
 *       already has an active PREMIUM subscription. Creates a 30-day
 *       PREMIUM subscription and cancels the FREE tier.
 *     tags: [Subscriptions]
 *     responses:
 *       201:
 *         description: Successfully upgraded to PREMIUM
 *       401:
 *         description: Not authenticated
 *       409:
 *         description: Already has an active PREMIUM subscription
 *       429:
 *         description: Rate limit exceeded
 */
router.post(
    '/upgrade',
    freeLimiter,
    asyncHandler(SubscriptionsController.upgrade)
);

/**
 * @swagger
 * /subscriptions/history:
 *   get:
 *     summary: Get full subscription history
 *     description: Returns all subscription records (active, expired, cancelled) in reverse chronological order.
 *     tags: [Subscriptions]
 *     responses:
 *       200:
 *         description: Full subscription history
 *       401:
 *         description: Not authenticated
 */
router.get('/history', asyncHandler(SubscriptionsController.getHistory));

export default router;
