import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as ActivityService from '../services/activity.service';
import { sendSuccess } from '../utils/response';

const paginationSchema = z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
});

export const getActivity = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { page, limit } = paginationSchema.parse(req.query);
        const result = await ActivityService.getUserActivity(req.user!.id, page, limit);
        sendSuccess(res, result, 'Activity log retrieved');
    } catch (err) {
        next(err);
    }
};
