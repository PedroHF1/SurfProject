import { ClassMiddleware, Controller, Delete, Get, Post } from '@overnightjs/core';
import { Request, Response } from 'express';
import { Beach } from '@src/models/beach';
import { authMiddleware } from '@src/middlewares/auth';
import { BaseController } from '.';
import { cacheClient } from '@src/cache';
import logger from '@src/logger';

@Controller('beaches')
@ClassMiddleware(authMiddleware)
export class BeachesController extends BaseController {
  @Get('')
  public async getBeaches(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.decoded?.id;
      if (!userId) {
        this.sendErrorResponse(res, { code: 401, message: 'Não autorizado' });
        return;
      }

      const beaches = await Beach.find({ user: userId });
      res.status(200).send(beaches);
    } catch (error) {
      this.sendErrorResponse(res, { code: 500, message: 'Algo deu errado' });
    }
  }

  @Post('')
  public async create(req: Request, res: Response): Promise<void> {
    try {
      const beach = new Beach({... req.body, ... {user: req.decoded?.id}});
      const result = await beach.save();

      const userId = req.decoded?.id;
      if (userId) {
        try {
          const cacheKey = `forecast:${userId}`;
          await cacheClient.del(cacheKey);
          logger.info(`Invalidated forecast cache for user ${userId} after adding beach`);
        } catch (cacheError) {
          logger.error('Failed to invalidate forecast cache', cacheError);
        }
      }

      res.status(201).send(result);
    } catch (error) {
      this.sendCreateUpdateErrorResponse(res, error);
    }
  }

  @Delete(':name')
  public async delete(req: Request, res: Response): Promise<void> {
    try {
      const beachName = req.params.name;
      const userId = req.decoded?.id;

      if (!userId) {
        this.sendErrorResponse(res, { code: 401, message: 'Não autorizado' });
        return;
      }

      const beach = await Beach.findOne({ name: beachName, user: userId });
      
      if (!beach) {
        this.sendErrorResponse(res, { code: 404, message: 'Praia não encontrada' });
        return;
      }

      await Beach.deleteOne({ name: beachName, user: userId });

      try {
        const cacheKey = `forecast:${userId}`;
        await cacheClient.del(cacheKey);
        logger.info(`Invalidated forecast cache for user ${userId} after deleting beach`);
      } catch (cacheError) {
        logger.error('Failed to invalidate forecast cache', cacheError);
      }

      res.status(204).send();
    } catch (error) {
      this.sendErrorResponse(res, { code: 500, message: 'Algo deu errado' });
    }
  }
}