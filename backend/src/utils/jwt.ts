import jwt, { SignOptions, Secret } from 'jsonwebtoken';

const JWT_SECRET: Secret = process.env.JWT_SECRET || 'fallback-secret';
const JWT_EXPIRES_IN: SignOptions['expiresIn'] =
  (process.env.JWT_EXPIRES_IN || '7d') as SignOptions['expiresIn'];

export interface JwtPayload {
  userId: string;
  email: string;
}

export const generateToken = (payload: JwtPayload): string => {
  const options: SignOptions = {
    expiresIn: JWT_EXPIRES_IN,
  };
  return jwt.sign(payload, JWT_SECRET, options);
};

export const verifyToken = (token: string): JwtPayload => {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
};

