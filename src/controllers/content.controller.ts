import { Request, Response, NextFunction } from 'express';
import * as ContentService from '../services/content.service';
import { sendSuccess } from '../utils/response';

export const getFreeContent = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const content = await ContentService.getFreeContent(req.user!.id, req.ip);
        sendSuccess(res, content, 'Free content retrieved');
    } catch (err) {
        next(err);
    }
};

export const getPremiumContent = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const content = await ContentService.getPremiumContent(req.user!.id, req.ip);
        sendSuccess(res, content, 'Premium content retrieved');
    } catch (err) {
        next(err);
    }
};
