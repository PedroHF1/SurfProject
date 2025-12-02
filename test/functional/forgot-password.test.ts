import { User } from '@src/models/user';
import AuthService from '@src/services/auth';
import { EmailService } from '@src/services/email';

describe('Forgot Password functional tests', () => {
  beforeEach(async () => {
    await User.deleteMany({});
    jest.spyOn(EmailService.prototype, 'sendPasswordResetEmail').mockResolvedValue();
  });

  describe('When requesting a password reset', () => {
    it('should send an email with the reset token', async () => {
      const user = {
        name: 'John Doe',
        email: 'john@mail.com',
        password: '1234',
      };
      await new User(user).save();

      const response = await global.testRequest
        .post('/users/forgot-password')
        .send({ email: user.email });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ message: 'E-mail de redefinição de senha enviado!' });
      expect(EmailService.prototype.sendPasswordResetEmail).toHaveBeenCalled();

      const updatedUser = await User.findOne({ email: user.email }).select(
        '+passwordResetToken +passwordResetExpires'
      );
      expect(updatedUser?.passwordResetToken).toBeDefined();
      expect(updatedUser?.passwordResetExpires).toBeDefined();
    });

    it('should return 404 if user is not found', async () => {
      const response = await global.testRequest
        .post('/users/forgot-password')
        .send({ email: 'notfound@mail.com' });

      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        code: 404,
        error: 'Not Found',
        message: 'Usuário não encontrado!',
      });
    });
  });

  describe('When resetting the password', () => {
    it('should update the password with a valid token', async () => {
      const user = {
        name: 'John Doe',
        email: 'john@mail.com',
        password: '1234',
      };
      const createdUser = await new User(user).save();
      createdUser.passwordResetToken = 'valid-token';
      createdUser.passwordResetExpires = new Date(Date.now() + 3600000);
      await createdUser.save();

      const response = await global.testRequest
        .post('/users/reset-password')
        .send({
          email: user.email,
          token: 'valid-token',
          password: 'new-password',
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ message: 'Senha atualizada!' });

      const updatedUser = await User.findOne({ email: user.email });
      const isMatch = await AuthService.comparePasswords(
        'new-password',
        updatedUser?.password || ''
      );
      expect(isMatch).toBe(true);
    });

    it('should return 400 if token is invalid', async () => {
      const user = {
        name: 'John Doe',
        email: 'john@mail.com',
        password: '1234',
      };
      const createdUser = await new User(user).save();
      createdUser.passwordResetToken = 'valid-token';
      createdUser.passwordResetExpires = new Date(Date.now() + 3600000);
      await createdUser.save();

      const response = await global.testRequest
        .post('/users/reset-password')
        .send({
          email: user.email,
          token: 'invalid-token',
          password: 'new-password',
        });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        code: 400,
        error: 'Bad Request',
        message: 'Token inválido!',
      });
    });

    it('should return 400 if token is expired', async () => {
      const user = {
        name: 'John Doe',
        email: 'john@mail.com',
        password: '1234',
      };
      const createdUser = await new User(user).save();
      createdUser.passwordResetToken = 'valid-token';
      createdUser.passwordResetExpires = new Date(Date.now() - 3600000); // Expired
      await createdUser.save();

      const response = await global.testRequest
        .post('/users/reset-password')
        .send({
          email: user.email,
          token: 'valid-token',
          password: 'new-password',
        });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        code: 400,
        error: 'Bad Request',
        message: 'Token expirado!',
      });
    });
  });
});
