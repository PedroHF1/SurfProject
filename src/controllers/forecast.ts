import { ClassMiddleware, Controller, Get, Middleware } from '@overnightjs/core';
import { Request, Response } from 'express';
import { Beach } from '@src/models/beach';
import { Forecast } from '@src/services/forecast';
import { authMiddleware } from '@src/middlewares/auth';
import logger from '@src/logger';
import { BaseController } from '.';
import rateLimit from 'express-rate-limit';
import ApiError from '@src/util/errors/api-error';
import { cacheClient } from '@src/cache';

const forecast = new Forecast();

const rateLimiter = rateLimit({
  windowMs: 1*60 * 1000,
  max: 10,
  keyGenerator(req: Request): string {
    if(req.ip) {
      return req.ip;
    }
    return '';
  },
  handler(_, res: Response): void {
    res.status(429).send(ApiError.format({code: 429, message: 'Muitas requisições para o endpoint /forecast'}))
  }
});

@Controller('forecast')
@ClassMiddleware(authMiddleware)
export class ForecastController extends BaseController {
  @Get('')
  @Middleware(rateLimiter)
  public async getForecastForgeLoggedUser(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const userId = req.decoded?.id;
      if (!userId) {
        this.sendErrorResponse(res, { code: 401, message: 'Não autorizado' });
        return;
      }

      const cacheKey = `forecast:${userId}`;

      try {
        const cachedData = await cacheClient.get(cacheKey);
        if (cachedData) {
          logger.info(`Cache hit for user ${userId}`);
          res.status(200).send(JSON.parse(cachedData));
          return;
        }
      } catch (cacheError) {
        logger.debug('Cache get failed, fetching fresh data', cacheError);
      }

      logger.info(`Cache miss for user ${userId}`);
      const beaches = await Beach.find({ user: userId });
      const forecastData = await forecast.processForecastForBeaches(beaches);

      try {
        await cacheClient.set(cacheKey, JSON.stringify(forecastData), 172800);
        logger.info(`Cached forecast data for user ${userId}`);
      } catch (cacheError) {
        logger.debug('Cache set failed, continuing without cache', cacheError);
      }

      res.status(200).send(forecastData);
    } catch (error) {
      logger.error(error);
      this.sendErrorResponse(res, { code: 500, message: 'Algo deu errado' });
    }
  }
}