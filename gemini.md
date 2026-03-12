# Project Guidelines — GDG Subscription API

## Stack
- Runtime: Node.js with Express.js
- Language: TypeScript
- Database: PostgreSQL via Prisma ORM
- Auth: JWT (access token, 15min expiry + refresh token, 7 days)
- Docs: Swagger UI via swagger-jsdoc + swagger-ui-express
- Deployment: Railway (PostgreSQL plugin included)
- Container: Docker + docker-compose

## Architecture Rules
- Folder structure: /src/routes, /src/middleware, /src/controllers, /src/services, /src/prisma
- All business logic in services layer, NOT in controllers
- Middleware handles: auth verification, role checks, subscription status checks — separately
- All errors go through a central error handler middleware
- Environment variables via .env — never hardcoded

## Code Standards
- Every route must have a JSDoc comment for Swagger auto-generation
- HTTP status codes must be semantically correct (401 vs 403 vs 404)
- All inputs validated using Zod
- Passwords hashed with bcrypt (12 salt rounds)

## Response Format (ALL endpoints)
{
  "success": true/false,
  "data": {},
  "message": "string",
  "timestamp": "ISO string"
}
