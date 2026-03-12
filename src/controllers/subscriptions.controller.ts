import { Request, Response, NextFunction } from 'express';
import * as SubscriptionsService from '../services/subscriptions.service';
import { sendSuccess } from '../utils/response';

export const getStatus = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const status = await SubscriptionsService.getSubscriptionStatus(req.user!.id);
        sendSuccess(res, status, 'Subscription status retrieved');
    } catch (err) {
        next(err);
    }
};

export const upgrade = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const subscription = await SubscriptionsService.upgradeSubscription(
            req.user!.id,
            req.ip
        );
        sendSuccess(res, { subscription }, 'Successfully upgraded to PREMIUM', 201);
    } catch (err) {
        next(err);
    }
};

export const getHistory = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const history = await SubscriptionsService.getSubscriptionHistory(req.user!.id);
        sendSuccess(res, { history }, 'Subscription history retrieved');
    } catch (err) {
        next(err);
    }
};
