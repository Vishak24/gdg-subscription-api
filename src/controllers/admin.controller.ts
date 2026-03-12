import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as AdminService from '../services/admin.service';
import { sendSuccess } from '../utils/response';

const paginationSchema = z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
});

export const getLogs = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { page, limit } = paginationSchema.parse(req.query);
        const { userId, action } = req.query as { userId?: string; action?: string };
        const result = await AdminService.getAllLogs(page, limit, { userId, action });
        sendSuccess(res, result, 'Activity logs retrieved');
    } catch (err) {
        next(err);
    }
};

export const getUsers = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { page, limit } = paginationSchema.parse(req.query);
        const result = await AdminService.getAllUsers(page, limit);
        sendSuccess(res, result, 'Users retrieved');
    } catch (err) {
        next(err);
    }
};

export const downloadCsvReport = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const csv = await AdminService.generateMonthlyReportCsv();
        const filename = `gdg-usage-report-${new Date().toISOString().slice(0, 7)}.csv`;
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.status(200).send(csv);
    } catch (err) {
        next(err);
    }
};
