import { Router } from 'express';
import * as ActivityController from '../controllers/activity.controller';
import { authenticate } from '../middleware/authenticate';
import { freeLimiter } from '../middleware/rateLimiter';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: Activity
 *   description: User activity audit log
 */

/**
 * @swagger
 * /activity:
 *   get:
 *     summary: Get authenticated user's activity log
 *     description: |
 *       Returns a paginated list of the authenticated user's actions
 *       (logins, content access, subscription upgrades, etc.).
 *       Users can only access their own activity.
 *     tags: [Activity]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           maximum: 100
 *         description: Items per page
 *     responses:
 *       200:
 *         description: Paginated activity log with pagination metadata
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
 *                         logs:
 *                           type: array
 *                         pagination:
 *                           type: object
 *                           properties:
 *                             total:
 *                               type: integer
 *                             page:
 *                               type: integer
 *                             totalPages:
 *                               type: integer
 *                             hasNext:
 *                               type: boolean
 *       401:
 *         description: Not authenticated
 */
router.get('/', freeLimiter, asyncHandler(ActivityController.getActivity));

export default router;
