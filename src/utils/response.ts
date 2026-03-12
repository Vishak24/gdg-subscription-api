import { Response } from 'express';

interface SuccessResponse<T> {
    success: true;
    data: T;
    message: string;
    timestamp: string;
}

interface ErrorResponseBody {
    success: false;
    error: string;
    message: string;
    timestamp: string;
}

/**
 * Sends a standardized success response.
 * All API responses conform to: { success, data, message, timestamp }
 */
export const sendSuccess = <T>(
    res: Response,
    data: T,
    message: string,
    statusCode = 200
): Response<SuccessResponse<T>> => {
    return res.status(statusCode).json({
        success: true,
        data,
        message,
        timestamp: new Date().toISOString(),
    });
};

/**
 * Sends a standardized error response.
 * Used only outside the centralized error handler (e.g., direct route logic).
 * Prefer throwing an AppError and letting errorHandler.ts handle it.
 */
export const sendError = (
    res: Response,
    message: string,
    statusCode = 500,
    error = 'Internal Server Error'
): Response<ErrorResponseBody> => {
    return res.status(statusCode).json({
        success: false,
        error,
        message,
        timestamp: new Date().toISOString(),
    });
};
