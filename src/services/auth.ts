import { User } from '@src/models/user';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

export interface DecodeUser extends Omit<User, '_id'> {
    id: string;
}

export default class AuthService {
    public static async hashPassword(password: string, salt = 10): Promise<string> {
        return await bcrypt.hash(password, salt);
    }
      
    public static async comparePasswords(password: string, hashPassword:string): Promise<boolean> {
        return await bcrypt.compare(password, hashPassword);
    }

    public static generateToken(payload: object): string {
        return jwt.sign(payload, 'some-key', {
            expiresIn: 100000000,
        });
    }

    public static decodeToken(token: string): DecodeUser {
        return jwt.verify(token, 'some-key') as DecodeUser;
    }
}

