import AuthService from "@src/services/auth";
import { Request, Response, NextFunction } from "express";

export function authMiddleware(req: Partial<Request>, res: Partial<Response>, next: NextFunction): void {
    try {
        const token = req.headers?.authorization?.split('Bearer ')[1];
        const decoded = AuthService.decodeToken(token as string);
        req.decoded = decoded;
        next();
    } catch (err) {
        if(err instanceof Error) {
            res.status?.(401).send({ code: 401, error: err.message })
        } else {
            res.status?.(401).send({ code: 401, error: 'Unknown auth error' })
        }
    }
} 