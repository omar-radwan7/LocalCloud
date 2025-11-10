import { Response } from 'express';
import { FileService } from './file.service';
import { FolderService } from './folder.service';
import { successResponse, errorResponse } from '../../utils/response';
import { AuthRequest } from '../../middleware/auth';
import { pythonService } from '../../services/pythonService';

const fileService = new FileService();
const folderService = new FolderService();

export class FileController {
  async uploadFile(req: AuthRequest, res: Response) {
    try {
      if (!req.userId) {
        return errorResponse(res, 'Unauthorized', 401);
      }

      if (!req.file) {
        return errorResponse(res, 'No file uploaded', 400);
      }

      const { folderId } = req.body;

      const result = await fileService.uploadFile(
        req.userId,
        req.file,
        false,
        undefined,
        folderId
      );

      return successResponse(res, result, 'File uploaded successfully', 201);
    } catch (error: any) {
      return errorResponse(res, error.message, 400);
    }
  }

  async deleteFolder(req: AuthRequest, res: Response) {
    try {
      if (!req.userId) {
        return errorResponse(res, 'Unauthorized', 401);
      }
      const { folderId } = req.params;
      if (!folderId) {
        return errorResponse(res, 'Folder ID is required', 400);
      }
      const result = await folderService.deleteFolder(req.userId, folderId);
      return successResponse(res, result, 'Folder deleted successfully');
    } catch (error: any) {
      return errorResponse(res, error.message, 400);
    }
  }

  async uploadVersion(req: AuthRequest, res: Response) {
    try {
      if (!req.userId) {
        return errorResponse(res, 'Unauthorized', 401);
      }

      if (!req.file) {
        return errorResponse(res, 'No file uploaded', 400);
      }

      const { fileId } = req.params;

      if (!fileId) {
        return errorResponse(res, 'File ID is required', 400);
      }

      const result = await fileService.uploadFile(req.userId, req.file, true, fileId);

      return successResponse(res, result, 'New version uploaded successfully', 201);
    } catch (error: any) {
      return errorResponse(res, error.message, 400);
    }
  }

  async getFiles(req: AuthRequest, res: Response) {
    try {
      if (!req.userId) {
        return errorResponse(res, 'Unauthorized', 401);
      }

      const { folderId } = req.query;

      const files = await fileService.getUserFiles(
        req.userId,
        false,
        typeof folderId === 'string' ? folderId : undefined
      );

      return successResponse(res, files, 'Files retrieved successfully');
    } catch (error: any) {
      return errorResponse(res, error.message, 400);
    }
  }

  async getFileById(req: AuthRequest, res: Response) {
    try {
      if (!req.userId) {
        return errorResponse(res, 'Unauthorized', 401);
      }

      const { fileId } = req.params;

      const file = await fileService.getFileById(fileId, req.userId);

      return successResponse(res, file, 'File retrieved successfully');
    } catch (error: any) {
      return errorResponse(res, error.message, 404);
    }
  }

  async downloadFile(req: AuthRequest, res: Response) {
    try {
      if (!req.userId) {
        return errorResponse(res, 'Unauthorized', 401);
      }

      const { fileId } = req.params;

      const file = await fileService.downloadFile(fileId, req.userId);

      res.setHeader('Content-Type', file.mimeType || 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.originalName)}"`);
      res.setHeader('Content-Length', file.size.toString());
      res.send(Buffer.from(file.content));
    } catch (error: any) {
      return errorResponse(res, error.message, 404);
    }
  }

  async deleteFile(req: AuthRequest, res: Response) {
    try {
      if (!req.userId) {
        return errorResponse(res, 'Unauthorized', 401);
      }

      const { fileId } = req.params;
      const { permanent } = req.query;

      const result = await fileService.deleteFile(
        fileId,
        req.userId,
        permanent === 'true'
      );

      return successResponse(
        res,
        result,
        permanent === 'true' ? 'File permanently deleted' : 'File moved to recycle bin'
      );
    } catch (error: any) {
      return errorResponse(res, error.message, 400);
    }
  }

  async restoreFile(req: AuthRequest, res: Response) {
    try {
      if (!req.userId) {
        return errorResponse(res, 'Unauthorized', 401);
      }

      const { fileId } = req.params;

      const file = await fileService.restoreFile(fileId, req.userId);

      return successResponse(res, file, 'File restored successfully');
    } catch (error: any) {
      return errorResponse(res, error.message, 404);
    }
  }

  async getRecycleBin(req: AuthRequest, res: Response) {
    try {
      if (!req.userId) {
        return errorResponse(res, 'Unauthorized', 401);
      }

      const files = await fileService.getRecycleBin(req.userId);

      return successResponse(res, files, 'Recycle bin retrieved successfully');
    } catch (error: any) {
      return errorResponse(res, error.message, 400);
    }
  }

  async getFileVersions(req: AuthRequest, res: Response) {
    try {
      if (!req.userId) {
        return errorResponse(res, 'Unauthorized', 401);
      }

      const { fileId } = req.params;

      const versions = await fileService.getFileVersions(fileId, req.userId);

      return successResponse(res, versions, 'Versions retrieved successfully');
    } catch (error: any) {
      return errorResponse(res, error.message, 404);
    }
  }

  async downloadVersion(req: AuthRequest, res: Response) {
    try {
      if (!req.userId) {
        return errorResponse(res, 'Unauthorized', 401);
      }

      const { versionId } = req.params;

      const version = await fileService.downloadVersion(versionId, req.userId);

      const filename = `${version.file.originalName}-v${version.version}`;
      res.setHeader('Content-Type', version.mimeType || 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
      res.setHeader('Content-Length', version.size.toString());
      res.send(Buffer.from(version.content));
    } catch (error: any) {
      return errorResponse(res, error.message, 404);
    }
  }

  async createFolder(req: AuthRequest, res: Response) {
    try {
      if (!req.userId) {
        return errorResponse(res, 'Unauthorized', 401);
      }

      const { name, parentId } = req.body;
      const folder = await folderService.createFolder(
        req.userId,
        name,
        parentId || undefined
      );

      return successResponse(res, folder, 'Folder created successfully', 201);
    } catch (error: any) {
      return errorResponse(res, error.message, 400);
    }
  }

  async getFolderTree(req: AuthRequest, res: Response) {
    try {
      if (!req.userId) {
        return errorResponse(res, 'Unauthorized', 401);
      }

      const tree = await folderService.getFolderTree(req.userId);
      return successResponse(res, tree, 'Folders retrieved successfully');
    } catch (error: any) {
      return errorResponse(res, error.message, 400);
    }
  }

  async getStorageStats(req: AuthRequest, res: Response) {
    try {
      if (!req.userId) {
        return errorResponse(res, 'Unauthorized', 401);
      }

      const stats = await fileService.getStorageStats(req.userId);

      return successResponse(res, stats, 'Storage stats retrieved successfully');
    } catch (error: any) {
      return errorResponse(res, error.message, 400);
    }
  }

  async analyzeFile(req: AuthRequest, res: Response) {
    try {
      if (!req.userId) {
        return errorResponse(res, 'Unauthorized', 401);
      }

      const { fileId } = req.params;

      // Get file from database
      const file = await fileService.downloadFile(fileId, req.userId);

      if (!file || !file.content) {
        return errorResponse(res, 'File not found', 404);
      }

      // Check if Python service is available
      const isAvailable = await pythonService.isServiceAvailable();
      if (!isAvailable) {
        return errorResponse(
          res,
          'Python analysis service is not available. Please ensure it is running.',
          503
        );
      }

      // Analyze file using Python service
      const analysis = await pythonService.analyzeFile(
        Buffer.from(file.content),
        file.originalName
      );

      if (!analysis) {
        return errorResponse(res, 'Failed to analyze file', 500);
      }

      return successResponse(res, analysis, 'File analyzed successfully');
    } catch (error: any) {
      return errorResponse(res, error.message, 400);
    }
  }

  async checkPythonService(req: AuthRequest, res: Response) {
    try {
      const isAvailable = await pythonService.isServiceAvailable();
      return successResponse(
        res,
        {
          available: isAvailable,
          url: process.env.PYTHON_SERVICE_URL || 'http://localhost:8000',
        },
        isAvailable ? 'Python service is available' : 'Python service is not available'
      );
    } catch (error: any) {
      return errorResponse(res, error.message, 400);
    }
  }

  async findDuplicates(req: AuthRequest, res: Response) {
    try {
      if (!req.userId) {
        return errorResponse(res, 'Unauthorized', 401);
      }

      const duplicates = await fileService.findDuplicates(req.userId);
      return successResponse(res, duplicates, 'Duplicate files retrieved successfully');
    } catch (error: any) {
      return errorResponse(res, error.message, 400);
    }
  }

  async listDeletedFolders(req: AuthRequest, res: Response) {
    try {
      if (!req.userId) {
        return errorResponse(res, 'Unauthorized', 401);
      }
      const folders = await folderService.listDeletedFolders(req.userId);
      return successResponse(res, folders);
    } catch (error: any) {
      return errorResponse(res, error.message, 400);
    }
  }

  async restoreFolder(req: AuthRequest, res: Response) {
    try {
      if (!req.userId) {
        return errorResponse(res, 'Unauthorized', 401);
      }

      const { folderId } = req.params;
      const result = await folderService.restoreFolder(folderId, req.userId);
      return successResponse(res, result, 'Folder restored successfully');
    } catch (error: any) {
      return errorResponse(res, error.message, 400);
    }
  }
}

