import { Router } from 'express';
import { Role } from '@prisma/client';
import * as AdminController from '../controllers/admin.controller';
import { authenticate } from '../middleware/authenticate';
import { authorizeRole } from '../middleware/authorizeRole';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

// All admin routes: must be authenticated AND have ADMIN role
router.use(authenticate, authorizeRole(Role.ADMIN));

/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: Admin-only endpoints for platform management
 */

/**
 * @swagger
 * /admin/logs:
 *   get:
 *     summary: Get all activity logs (admin only)
 *     description: |
 *       Returns a paginated list of all user activity across the platform.
 *       Optionally filter by `userId` or `action` (case-insensitive substring).
 *     tags: [Admin]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20, maximum: 100 }
 *       - in: query
 *         name: userId
 *         schema: { type: string }
 *         description: Filter by specific user ID
 *       - in: query
 *         name: action
 *         schema: { type: string }
 *         description: Filter by action substring (e.g. "LOGIN", "CONTENT")
 *     responses:
 *       200:
 *         description: Paginated activity logs with user info
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Admin role required
 */
router.get('/logs', asyncHandler(AdminController.getLogs));

/**
 * @swagger
 * /admin/users:
 *   get:
 *     summary: Get all users with subscription status (admin only)
 *     description: |
 *       Returns all registered users with their derived current subscription tier,
 *       status, and expiry. Tier is computed from the active Subscription record.
 *     tags: [Admin]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20, maximum: 100 }
 *     responses:
 *       200:
 *         description: Paginated user list with live subscription info
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Admin role required
 */
router.get('/users', asyncHandler(AdminController.getUsers));

/**
 * @swagger
 * /admin/report/csv:
 *   get:
 *     summary: Download monthly usage report as CSV (admin only)
 *     description: |
 *       Generates and streams a CSV file containing per-user monthly activity
 *       aggregates for the last 30 days (logins, content access, upgrades).
 *       Returns as a downloadable file attachment.
 *     tags: [Admin]
 *     produces:
 *       - text/csv
 *     responses:
 *       200:
 *         description: CSV file download
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 *               format: binary
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Admin role required
 */
router.get('/report/csv', asyncHandler(AdminController.downloadCsvReport));

export default router;
