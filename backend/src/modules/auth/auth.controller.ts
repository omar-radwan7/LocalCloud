import { Response } from 'express';
import { AuthService } from './auth.service';
import { successResponse, errorResponse } from '../../utils/response';
import { AuthRequest } from '../../middleware/auth';

const authService = new AuthService();

export class AuthController {
  async register(req: AuthRequest, res: Response) {
    try {
      const { email, password, name } = req.body;

      if (!email || !password) {
        return errorResponse(res, 'Email and password are required', 400);
      }

      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return errorResponse(res, 'Invalid email format', 400);
      }

      // Password strength validation
      if (password.length < 6) {
        return errorResponse(res, 'Password must be at least 6 characters', 400);
      }

      const result = await authService.register({ email, password, name });

      return successResponse(res, result, 'User registered successfully', 201);
    } catch (error: any) {
      return errorResponse(res, error.message, 400);
    }
  }

  async login(req: AuthRequest, res: Response) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return errorResponse(res, 'Email and password are required', 400);
      }

      const result = await authService.login({ email, password });

      return successResponse(res, result, 'Login successful');
    } catch (error: any) {
      return errorResponse(res, error.message, 401);
    }
  }

  async getProfile(req: AuthRequest, res: Response) {
    try {
      if (!req.userId) {
        return errorResponse(res, 'Unauthorized', 401);
      }

      const user = await authService.getProfile(req.userId);

      return successResponse(res, user, 'Profile retrieved successfully');
    } catch (error: any) {
      return errorResponse(res, error.message, 404);
    }
  }

  async updateProfile(req: AuthRequest, res: Response) {
    try {
      if (!req.userId) {
        return errorResponse(res, 'Unauthorized', 401);
      }

      const { name } = req.body;

      const user = await authService.updateProfile(req.userId, { name });

      return successResponse(res, user, 'Profile updated successfully');
    } catch (error: any) {
      return errorResponse(res, error.message, 400);
    }
  }
}

