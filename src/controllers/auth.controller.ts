import { Request, Response, NextFunction } from 'express';
import * as AuthService from '../services/auth.service';
import { sendSuccess } from '../utils/response';

export const register = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const result = await AuthService.registerUser(req.body, req.ip);
        sendSuccess(res, result, 'Account created successfully', 201);
    } catch (err) {
        next(err);
    }
};

export const login = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const result = await AuthService.loginUser(req.body, req.ip);
        sendSuccess(res, result, 'Login successful');
    } catch (err) {
        next(err);
    }
};

export const refresh = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const tokens = await AuthService.refreshAccessToken(req.body.refreshToken);
        sendSuccess(res, tokens, 'Token refreshed successfully');
    } catch (err) {
        next(err);
    }
};

export const logout = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        await AuthService.logoutUser(req.body.refreshToken, req.user!.id, req.ip);
        sendSuccess(res, null, 'Logged out successfully');
    } catch (err) {
        next(err);
    }
};

export const me = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        sendSuccess(res, { user: req.user }, 'Authenticated user retrieved');
    } catch (err) {
        next(err);
    }
};
