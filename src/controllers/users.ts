import { Controller, Post, Get, Put, Middleware } from '@overnightjs/core';
import { Response, Request } from 'express';
import { User } from '@src/models/user';
import AuthService from '@src/services/auth';
import { EmailService } from '@src/services/email';
import crypto from 'crypto';
import { BaseController } from './index';
import { authMiddleware } from '@src/middlewares/auth';

@Controller('users')
export class UsersController extends BaseController {
  @Post('')
  public async create(req: Request, res: Response): Promise<void> {
    try {
      const user = new User(req.body);
      const newUser = await user.save();
      res.status(201).send(newUser);
    } catch (error) {
      this.sendCreateUpdateErrorResponse(res, error);
    }
  }

  @Post('authenticate')
  public async authenticate(req: Request, res: Response): Promise<Response> {
    const user = await User.findOne({ email: req.body.email });
    if (!user) {
      return this.sendErrorResponse(res, {
        code: 400,
        message: 'Usuário não encontrado!',
        description: 'Tente verificar seu endereço de e-mail.',
      });
    }
    if (
      !(await AuthService.comparePasswords(req.body.password, user.password))
    ) {
      return this.sendErrorResponse(res, {
        code: 400,
        message: 'Senha incorreta!',
      });
    }
    const token = AuthService.generateToken(user.toJSON());

    return res.send({ ...user.toJSON(), ...{ token } });
  }

  @Get('me')
  @Middleware(authMiddleware)
  public async me(req: Request, res: Response): Promise<Response> {
    const email = req.decoded ? req.decoded.email : undefined;
    const user = await User.findOne({ email });
    if (!user) {
      return this.sendErrorResponse(res, {
        code: 404,
        message: 'Usuário não encontrado!',
      });
    }

    return res.send({ user });
  }

  @Put('')
  @Middleware(authMiddleware)
  public async update(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.decoded?.id;
      if (!userId) {
        this.sendErrorResponse(res, { code: 401, message: 'Não autorizado' });
        return;
      }

      const allowedUpdates = ['name', 'address', 'city', 'state'];
      const updates: Partial<typeof req.body> = {};

      allowedUpdates.forEach((field) => {
        if (req.body[field] !== undefined) {
          updates[field] = req.body[field];
        }
      });

      if (Object.keys(updates).length === 0) {
        this.sendErrorResponse(res, {
          code: 400,
          message: 'Nenhum campo válido para atualizar',
        });
        return;
      }

      const user = await User.findByIdAndUpdate(
        userId,
        { $set: updates },
        { new: true, runValidators: true }
      );

      if (!user) {
        this.sendErrorResponse(res, {
          code: 404,
          message: 'Usuário não encontrado',
        });
        return;
      }

      res.status(200).send(user);
    } catch (error) {
      this.sendCreateUpdateErrorResponse(res, error);
    }
  }

  @Post('forgot-password')
  public async forgotPassword(req: Request, res: Response): Promise<void> {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      this.sendErrorResponse(res, {
        code: 404,
        message: 'Usuário não encontrado!',
      });
      return;
    }

    const token = crypto.randomBytes(20).toString('hex');

    user.passwordResetToken = token;
    user.passwordResetExpires = new Date(Date.now() + 3600000); // 1 hora

    await user.save();

    const emailService = new EmailService();
    await emailService.sendPasswordResetEmail(email, token);

    res.status(200).send({ message: 'E-mail de redefinição de senha enviado!' });
  }

  @Post('reset-password')
  public async resetPassword(req: Request, res: Response): Promise<void> {
    const { email, token, password } = req.body;
    const user = await User.findOne({ email }).select(
      '+passwordResetToken +passwordResetExpires'
    );

    if (!user) {
      this.sendErrorResponse(res, {
        code: 404,
        message: 'Usuário não encontrado!',
      });
      return;
    }

    if (token !== user.passwordResetToken) {
      this.sendErrorResponse(res, {
        code: 400,
        message: 'Token inválido!',
      });
      return;
    }

    if (
      !user.passwordResetExpires ||
      new Date() > user.passwordResetExpires
    ) {
      this.sendErrorResponse(res, {
        code: 400,
        message: 'Token expirado!',
      });
      return;
    }

    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;

    await user.save();

    res.status(200).send({ message: 'Senha atualizada!' });
  }
}