import { User } from '@src/models/user';
import AuthService from '@src/services/auth';

describe('Users functional tests', () => {
  beforeEach(async () => {
    await User.deleteMany({});
  });
  describe('When creating a new user', () => {
    it('should successfully create a new user with encrypted password', async () => {
      const newUser = {
        name: 'John Doe',
        email: 'john@mail.com',
        password: '1234',
      };
      const response = await global.testRequest.post('/users').send(newUser);
      expect(response.status).toBe(201);
      await expect(
        AuthService.comparePasswords(newUser.password, response.body.password)
      ).resolves.toBeTruthy();
      expect(response.body).toEqual(
        expect.objectContaining({
          ...newUser,
          ...{ password: expect.any(String) },
        })
      );
    });

    it('Should return validation error when a field is missing', async () => {
      const newUser = {
        email: 'john@mail.com',
        password: '1234',
      };
      const response = await global.testRequest.post('/users').send(newUser);

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        code: 400,
        error: 'Bad Request',
        message: 'O campo name é obrigatório',
      });
    });

    it('Should return 409 when the email already exists', async () => {
      const newUser = {
        name: 'John Doe',
        email: 'john@mail.com',
        password: '1234',
      };
      await global.testRequest.post('/users').send(newUser);
      const response = await global.testRequest.post('/users').send(newUser);

      expect(response.status).toBe(409);
      expect(response.body).toEqual({
        code: 409,
        error: 'Conflict',
        message:
          'O registro já existe',
      });
    });
  });

  describe('when authenticating a user', () => {
    it('should generate a token for a valid user', async () => {
      const newUser = {
        name: 'John Doe',
        email: 'john@mail.com',
        password: '1234',
      };
      await new User(newUser).save();
      const response = await global.testRequest
        .post('/users/authenticate')
        .send({ email: newUser.email, password: newUser.password });

      expect(response.body).toEqual(
        expect.objectContaining({ token: expect.any(String) })
      );
    });
    it('Should return UNAUTHORIZED if the user with the given email is not found', async () => {
      const response = await global.testRequest
        .post('/users/authenticate')
        .send({ email: 'some-email@mail.com', password: '1234' });

      expect(response.status).toBe(400);
    });

    it('Should return ANAUTHORIZED if the user is found but the password does not match', async () => {
      const newUser = {
        name: 'John Doe',
        email: 'john@mail.com',
        password: '1234',
      };
      await new User(newUser).save();
      const response = await global.testRequest
        .post('/users/authenticate')
        .send({ email: newUser.email, password: 'different password' });

      expect(response.status).toBe(400);
    });
  });

  describe('When getting user profile info', () => {
    it(`Should return the token's owner profile information`, async () => {
      const newUser = {
        name: 'John Doe',
        email: 'john@mail.com',
        password: '1234',
      };
      const user = await new User(newUser).save();
      const token = AuthService.generateToken(user.toJSON());
      const { body, status } = await global.testRequest
        .get('/users/me')
        .set({ authorization: `Bearer ${token}` });

      expect(status).toBe(200);
      expect(body).toMatchObject(JSON.parse(JSON.stringify({ user })));
    });

    it(`Should return Not Found, when the user is not found`, async () => {
      const newUser = {
        name: 'John Doe',
        email: 'john@mail.com',
        password: '1234',
      };
      const user = new User(newUser);
      const token = AuthService.generateToken(user.toJSON());
      const { body, status } = await global.testRequest
        .get('/users/me')
        .set({ authorization: `Bearer ${token}` });

      expect(status).toBe(404);
      expect(body.message).toBe('Usuário não encontrado!');
    });
  });
});