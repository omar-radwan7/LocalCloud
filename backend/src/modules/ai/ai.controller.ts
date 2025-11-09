import { Response } from 'express';

import { AuthRequest } from '../../middleware/auth';
import { errorResponse, successResponse } from '../../utils/response';
import { FileService } from '../files/file.service';
import { AIService } from './ai.service';

const fileService = new FileService();
const aiService = new AIService();

export class AIController {
  async reprocessFile(req: AuthRequest, res: Response) {
    try {
      if (!req.userId) {
        return errorResponse(res, 'Unauthorized', 401);
      }

      const { fileId } = req.params;
      if (!fileId) {
        return errorResponse(res, 'File ID is required', 400);
      }

      const file = await fileService.reprocessFile(fileId, req.userId);
      return successResponse(res, file, 'File reprocessed successfully');
    } catch (error: any) {
      return errorResponse(res, error.message, 400);
    }
  }

  async semanticSearch(req: AuthRequest, res: Response) {
    try {
      if (!req.userId) {
        return errorResponse(res, 'Unauthorized', 401);
      }

      const query = typeof req.query.q === 'string' ? req.query.q : '';
      if (!query.trim()) {
        return errorResponse(res, 'Search query is required', 400);
      }

      const results = await aiService.semanticSearch(req.userId, query);
      return successResponse(res, results, 'Semantic search completed');
    } catch (error: any) {
      return errorResponse(res, error.message, 400);
    }
  }

  async chat(req: AuthRequest, res: Response) {
    try {
      if (!req.userId) {
        return errorResponse(res, 'Unauthorized', 401);
      }

      const { question } = req.body;
      if (!question || typeof question !== 'string') {
        return errorResponse(res, 'Question is required', 400);
      }

      const response = await aiService.chat(req.userId, question);
      return successResponse(res, response, 'Chat completed');
    } catch (error: any) {
      return errorResponse(res, error.message, 400);
    }
  }
}
