/**
 * Base class for all operational API errors.
 * Operational errors are expected, handled gracefully, and safe to expose
 * to clients. Programmer errors (bugs) should crash and restart.
 */
export class AppError extends Error {
    public readonly statusCode: number;
    public readonly isOperational: boolean;

    constructor(message: string, statusCode: number, isOperational = true) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        Object.setPrototypeOf(this, new.target.prototype);
        Error.captureStackTrace(this, this.constructor);
    }
}

/**
 * 400 Bad Request — malformed request body, failed validation.
 */
export class ValidationError extends AppError {
    public readonly details?: Record<string, string[]>;

    constructor(message: string, details?: Record<string, string[]>) {
        super(message, 400);
        this.details = details;
    }
}

/**
 * 401 Unauthorized — missing or invalid authentication credentials.
 * Use this when the client is not authenticated (not "who are you?").
 */
export class AuthenticationError extends AppError {
    constructor(message = 'Authentication required') {
        super(message, 401);
    }
}

/**
 * 403 Forbidden — authenticated but lacks permission.
 * Use this when the client is authenticated but not authorized.
 */
export class AuthorizationError extends AppError {
    constructor(message = 'You do not have permission to access this resource') {
        super(message, 403);
    }
}

/**
 * 404 Not Found — resource does not exist.
 */
export class NotFoundError extends AppError {
    constructor(resource = 'Resource') {
        super(`${resource} not found`, 404);
    }
}

/**
 * 409 Conflict — request conflicts with current state (e.g., duplicate email).
 */
export class ConflictError extends AppError {
    constructor(message: string) {
        super(message, 409);
    }
}

/**
 * 429 Too Many Requests — rate limit exceeded.
 */
export class RateLimitError extends AppError {
    constructor(message = 'Too many requests, please try again later') {
        super(message, 429);
    }
}
