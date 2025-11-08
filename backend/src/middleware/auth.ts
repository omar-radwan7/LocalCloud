import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import { errorResponse } from '../utils/response';

export interface AuthRequest extends Request {
  userId?: string;
  userEmail?: string;
}

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return errorResponse(res, 'No token provided', 401);
    }

    const token = authHeader.substring(7);

    const decoded = verifyToken(token);
    req.userId = decoded.userId;
    req.userEmail = decoded.email;

    next();
  } catch (error) {
    return errorResponse(res, 'Invalid or expired token', 401);
  }
};

