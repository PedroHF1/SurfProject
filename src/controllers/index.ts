import logger from '@src/logger';
import { CUSTOM_VALIDATION } from '@src/models/user';
import ApiError, { APIError } from '@src/util/errors/api-error';
import { Response } from 'express'
import mongoose from 'mongoose';

export abstract class BaseController {
    protected sendCreateUpdateErrorResponse(res: Response, error: mongoose.Error.ValidationError | Error): void {
        if (error instanceof mongoose.Error.ValidationError) {
            const clienErrors = this.handleClientErrors(error);
                res.status(clienErrors.code).send(ApiError.format({ code: clienErrors.code, message: clienErrors.error }));
        } else {
            logger.error(error);
            res.status(500).send(ApiError.format({ code: 500, message: 'Something went wrong!' }));
        }
    }

    private handleClientErrors(error: mongoose.Error.ValidationError): {code: number, error: string} {
        const duplicatedKindErrors = Object.values(error.errors).filter(
            (err) => err.kind === CUSTOM_VALIDATION.DUPLICATED
        );   
        if(duplicatedKindErrors.length) {
            return { code: 409, error: 'O registro já existe' };
        } else {
            const errors = Object.values(error.errors).map((err) => {
                if (err.kind === 'required') {
                    return `O campo ${err.path} é obrigatório`;
                }
                if (err.name === 'CastError') {
                    return `O campo ${err.path} tem um formato inválido`;
                }
                return err.message;
            });
            return { code: 400, error: errors.join(', ') };
        }
    }

    protected sendErrorResponse(res: Response, apiError: APIError): Response {
        return res.status(apiError.code).send(ApiError.format(apiError));
    }
}