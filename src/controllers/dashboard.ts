import { ClassMiddleware, Controller, Get } from '@overnightjs/core';
import { Request, Response } from 'express';
import { Beach } from '@src/models/beach';
import { Forecast } from '@src/services/forecast';
import { DashboardService } from '@src/services/dashboard';
import { authMiddleware } from '@src/middlewares/auth';
import logger from '@src/logger';
import { BaseController } from '.';
import { cacheClient } from '@src/cache';

const forecast = new Forecast();
const dashboardService = new DashboardService();

@Controller('dashboard')
@ClassMiddleware(authMiddleware)
export class DashboardController extends BaseController {
  @Get('stats')
  public async getStats(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.decoded?.id;
      if (!userId) {
        this.sendErrorResponse(res, { code: 401, message: 'Unauthorized' });
        return;
      }

      const forecastData = await this.getForecastData(userId);
      const stats = dashboardService.calculateStats(forecastData);

      res.status(200).send(stats);
    } catch (error) {
      logger.error(error);
      this.sendErrorResponse(res, { code: 500, message: 'Something went wrong' });
    }
  }

  @Get('wave-forecast')
  public async getWaveForecast(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.decoded?.id;
      if (!userId) {
        this.sendErrorResponse(res, { code: 401, message: 'Unauthorized' });
        return;
      }

      const forecastData = await this.getForecastData(userId);
      const waveForecast = dashboardService.getWaveForecastData(forecastData);

      res.status(200).send(waveForecast);
    } catch (error) {
      logger.error(error);
      this.sendErrorResponse(res, { code: 500, message: 'Something went wrong' });
    }
  }

  @Get('conditions')
  public async getConditions(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.decoded?.id;
      if (!userId) {
        this.sendErrorResponse(res, { code: 401, message: 'Unauthorized' });
        return;
      }

      const forecastData = await this.getForecastData(userId);
      const conditions = dashboardService.getConditionsData(forecastData);

      res.status(200).send(conditions);
    } catch (error) {
      logger.error(error);
      this.sendErrorResponse(res, { code: 500, message: 'Something went wrong' });
    }
  }

  @Get('rating-distribution')
  public async getRatingDistribution(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.decoded?.id;
      if (!userId) {
        this.sendErrorResponse(res, { code: 401, message: 'Unauthorized' });
        return;
      }

      const forecastData = await this.getForecastData(userId);
      const distribution = dashboardService.getRatingDistribution(forecastData);

      res.status(200).send(distribution);
    } catch (error) {
      logger.error(error);
      this.sendErrorResponse(res, { code: 500, message: 'Something went wrong' });
    }
  }

  private async getForecastData(userId: string) {
    const cacheKey = `forecast:${userId}`;

    try {
      const cachedData = await cacheClient.get(cacheKey);
      if (cachedData) {
        logger.info(`Cache hit for user ${userId}`);
        return JSON.parse(cachedData);
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

    return forecastData;
  }
}
