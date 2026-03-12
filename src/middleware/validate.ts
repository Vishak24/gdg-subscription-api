import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { ValidationError } from '../utils/AppError';

type ValidatedFields = 'body' | 'params' | 'query';

/**
 * Request validation middleware factory using Zod.
 * Validates the specified field of the request against a Zod schema.
 * On failure, throws a ValidationError (400) with structured field-level messages.
 *
 * Usage:
 *   router.post('/register', validate(registerSchema), handler)
 *   router.get('/:id', validate(idParamSchema, 'params'), handler)
 *
 * @param schema - Zod schema to validate against
 * @param field  - Which part of the request to validate (default: 'body')
 */
export const validate =
    (schema: ZodSchema, field: ValidatedFields = 'body') =>
        (req: Request, _res: Response, next: NextFunction): void => {
            try {
                const parsed = schema.safeParse(req[field]);

                if (!parsed.success) {
                    const details = formatZodErrors(parsed.error);
                    throw new ValidationError('Validation failed', details);
                }

                // Replace with parsed (and potentially transformed) data
                req[field] = parsed.data;
                next();
            } catch (err) {
                next(err);
            }
        };

/**
 * Formats Zod errors into a field-keyed object for clean API responses.
 * e.g. { email: ['Invalid email address'], password: ['Must be at least 8 characters'] }
 */
function formatZodErrors(error: ZodError): Record<string, string[]> {
    return error.issues.reduce<Record<string, string[]>>((acc, issue) => {
        const path = issue.path.join('.') || 'root';
        if (!acc[path]) acc[path] = [];
        acc[path].push(issue.message);
        return acc;
    }, {});
}
