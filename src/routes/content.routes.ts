import { Router } from 'express';
import { SubscriptionTier } from '@prisma/client';
import * as ContentController from '../controllers/content.controller';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { freeLimiter, premiumLimiter } from '../middleware/rateLimiter';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Content
 *   description: Free and premium content access endpoints
 */

/**
 * @swagger
 * /content/free:
 *   get:
 *     summary: Get free content catalog
 *     description: |
 *       Returns articles available to all authenticated users.
 *       Rate limited to 20 requests per 15 minutes.
 *     tags: [Content]
 *     responses:
 *       200:
 *         description: Free content catalog
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
 *                         tier:
 *                           type: string
 *                           example: FREE
 *                         totalItems:
 *                           type: integer
 *                         items:
 *                           type: array
 *       401:
 *         description: Not authenticated
 *       429:
 *         description: Rate limit exceeded
 */
router.get(
    '/free',
    authenticate,
    freeLimiter,
    asyncHandler(ContentController.getFreeContent)
);

/**
 * @swagger
 * /content/premium:
 *   get:
 *     summary: Get premium content catalog
 *     description: |
 *       Returns exclusive premium articles. Requires an active PREMIUM subscription.
 *       Tier is derived from the database at request time — not from the JWT.
 *       Rate limited to 200 requests per 15 minutes.
 *     tags: [Content]
 *     responses:
 *       200:
 *         description: Premium content catalog with full article bodies
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Active PREMIUM subscription required
 *       429:
 *         description: Rate limit exceeded
 */
router.get(
    '/premium',
    authenticate,
    authorize(SubscriptionTier.PREMIUM),
    premiumLimiter,
    asyncHandler(ContentController.getPremiumContent)
);

export default router;
