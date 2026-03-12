import { Request, Response, NextFunction, RequestHandler } from 'express';

type AsyncRequestHandler = (
    req: Request,
    res: Response,
    next: NextFunction
) => Promise<void | Response>;

/**
 * Wraps an async Express route handler to automatically catch
 * unhandled promise rejections and forward them to the centralized
 * error handler via `next(err)`.
 *
 * Without this wrapper, unhandled async errors in Express 4 are
 * silently swallowed or crash the process without a proper response.
 *
 * @example
 * router.get('/resource', asyncHandler(async (req, res) => {
 *   const data = await someAsyncOperation();
 *   res.json(data);
 * }));
 */
export const asyncHandler =
    (fn: AsyncRequestHandler): RequestHandler =>
        (req: Request, res: Response, next: NextFunction): void => {
            Promise.resolve(fn(req, res, next)).catch(next);
        };
