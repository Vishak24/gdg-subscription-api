import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import { env } from './config/env';
import { swaggerSpec } from './config/swagger';
import { requestLogger } from './middleware/requestLogger';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

// Route imports
import authRoutes from './routes/auth.routes';
import subscriptionsRoutes from './routes/subscriptions.routes';
import contentRoutes from './routes/content.routes';
import activityRoutes from './routes/activity.routes';
import adminRoutes from './routes/admin.routes';

const app: Application = express();

// ── Security Headers ──────────────────────────────────────────────────────
app.use(
    helmet({
        contentSecurityPolicy: env.NODE_ENV === 'production',
    })
);

// ── CORS ──────────────────────────────────────────────────────────────────
app.use(
    cors({
        origin: env.CORS_ORIGIN,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Correlation-Id'],
        exposedHeaders: ['X-Correlation-Id'],
        credentials: true,
    })
);

// ── Body parsing ──────────────────────────────────────────────────────────
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// ── Request Logging + Correlation IDs ─────────────────────────────────────
app.use(requestLogger);

// ── Health Check (no auth, no rate limit) ─────────────────────────────────
app.get('/health', (_req, res) => {
    res.status(200).json({
        success: true,
        data: {
            status: 'healthy',
            uptime: process.uptime(),
            timestamp: new Date().toISOString(),
            version: process.env.npm_package_version ?? '1.0.0',
        },
        message: 'Service is running',
        timestamp: new Date().toISOString(),
    });
});

// ── API Routes ────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/subscriptions', subscriptionsRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/admin', adminRoutes);

// ── Swagger UI (disable in production if desired) ─────────────────────────
app.use(
    '/api/docs',
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
        customSiteTitle: 'GDG Subscription API – Docs',
        customCss: `
      .swagger-ui .topbar { background-color: #1a1a2e; }
      .swagger-ui .topbar .topbar-wrapper .link span { color: #4285F4; }
      .swagger-ui .btn.authorize { background-color: #4285F4; border-color: #4285F4; }
      .swagger-ui .opblock.opblock-post .opblock-summary-method { background: #4285F4; }
    `,
        swaggerOptions: {
            persistAuthorization: true,
            displayRequestDuration: true,
            filter: true,
        },
    })
);

// Expose raw OpenAPI spec for tooling
app.get('/api/docs.json', (_req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
});

// ── 404 + Error Handlers (must be last) ───────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
