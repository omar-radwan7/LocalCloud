import prisma from '../../config/database';
import crypto from 'crypto';

const MB_IN_BYTES = 1024 * 1024;
const defaultLimitMb = Number(process.env.DEFAULT_STORAGE_LIMIT_MB || '5120');

const sanitizeSegment = (segment: string) =>
  segment.replace(/[^a-zA-Z0-9-_]/g, '_').trim() || 'folder';

export class FileService {
  private resolveUserLimitBytes = async (userId: string): Promise<number | null> => {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { storageLimitMb: true },
    });
    const limitMb = user?.storageLimitMb ?? defaultLimitMb;
    if (!limitMb || limitMb <= 0) {
      return null;
    }
    return limitMb * MB_IN_BYTES;
  };

  private async getUserUsageBytes(userId: string): Promise<number> {
    const fileTotals = await prisma.file.aggregate({
      where: { userId },
      _sum: { size: true },
    });

    const versionTotals = await prisma.fileVersion.aggregate({
      where: { file: { userId } },
      _sum: { size: true },
    });

    return (fileTotals._sum.size ?? 0) + (versionTotals._sum.size ?? 0);
  }

  private async ensureStorageAvailable(userId: string, bytesToAdd: number) {
    if (bytesToAdd <= 0) {
      return;
    }

    const limitBytes = await this.resolveUserLimitBytes(userId);
    if (!limitBytes) {
      return;
    }

    const usage = await this.getUserUsageBytes(userId);
    if (usage + bytesToAdd > limitBytes) {
      const available = Math.max(limitBytes - usage, 0);
      throw new Error(
        `Storage limit exceeded. Available ${(available / MB_IN_BYTES).toFixed(2)} MB, attempted to add ${(bytesToAdd / MB_IN_BYTES).toFixed(2)} MB.`
      );
    }
  }

  private async validateFolderOwnership(userId: string, folderId: string | null | undefined): Promise<string | null> {
    if (!folderId || folderId === 'null' || folderId === '' || folderId.trim() === '') {
      return null;
    }

    const folder = await prisma.folder.findFirst({
      where: { id: folderId, userId },
      select: { id: true },
    });

    if (!folder) {
      throw new Error(`Folder not found or you don't have access to it`);
    }

    return folder.id;
  }

  private calculateContentHash(buffer: Buffer): string {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  async uploadFile(
    userId: string,
    file: Express.Multer.File,
    isVersion = false,
    parentFileId?: string,
    folderId?: string | null
  ) {
    if (!file.buffer) {
      throw new Error('File buffer not available');
    }

    if (isVersion && parentFileId) {
      const existingFile = await prisma.file.findFirst({
        where: { id: parentFileId, userId },
        select: {
          id: true,
          folderId: true,
          content: true,
          size: true,
          originalName: true,
          name: true,
          mimeType: true,
        },
      });

      if (!existingFile) {
        throw new Error('Parent file not found');
      }

      await this.ensureStorageAvailable(userId, file.size);

      const versionNumber =
        (await prisma.fileVersion.count({ where: { fileId: parentFileId } })) + 1;

      await prisma.fileVersion.create({
        data: {
          fileId: parentFileId,
          content: existingFile.content,
          size: existingFile.size,
          version: versionNumber,
          mimeType: existingFile.mimeType,
        },
      });

      const updatedFile = await prisma.file.update({
        where: { id: parentFileId },
        data: {
          name: sanitizeSegment(file.originalname) || existingFile.name,
          originalName: file.originalname,
          size: file.size,
          mimeType: file.mimetype,
          content: Buffer.from(file.buffer),
          updatedAt: new Date(),
        },
      });

      return { file: updatedFile };
    }

    await this.ensureStorageAvailable(userId, file.size);

    const targetFolderId = await this.validateFolderOwnership(userId, folderId);
    const contentHash = this.calculateContentHash(file.buffer);

    const createdFile = await prisma.file.create({
      data: {
        userId,
        folderId: targetFolderId,
        name: sanitizeSegment(file.originalname),
        originalName: file.originalname,
        size: file.size,
        mimeType: file.mimetype,
        content: Buffer.from(file.buffer),
        contentHash,
      },
    });

    return { file: createdFile };
  }

  async getUserFiles(userId: string, includeDeleted = false, folderId?: string) {
    const files = await prisma.file.findMany({
      where: {
        userId,
        isDeleted: includeDeleted ? undefined : false,
        folderId: folderId || undefined,
      },
      orderBy: {
        updatedAt: 'desc',
      },
      select: {
        id: true,
        name: true,
        originalName: true,
        folderId: true,
        size: true,
        mimeType: true,
        isDeleted: true,
        deletedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return files;
  }

  async getFileById(fileId: string, userId: string) {
    const file = await prisma.file.findFirst({
      where: {
        id: fileId,
        userId,
      },
      select: {
        id: true,
        name: true,
        originalName: true,
        size: true,
        mimeType: true,
        createdAt: true,
        updatedAt: true,
        folderId: true,
        versions: {
          orderBy: {
            createdAt: 'desc',
          },
          select: {
            id: true,
            version: true,
            size: true,
            createdAt: true,
            mimeType: true,
          },
        },
      },
    });

    if (!file) {
      throw new Error('File not found');
    }

    return file;
  }

  async downloadFile(fileId: string, userId: string) {
    const file = await prisma.file.findFirst({
      where: { id: fileId, userId },
      select: {
        id: true,
        originalName: true,
        mimeType: true,
        content: true,
        size: true,
      },
    });

    if (!file) {
      throw new Error('File not found');
    }

    return file;
  }

  async deleteFile(fileId: string, userId: string, permanent = false) {
    const file = await prisma.file.findFirst({
      where: { id: fileId, userId },
      include: { versions: true },
    });

    if (!file) {
      throw new Error('File not found');
    }

    if (permanent) {
      await prisma.fileVersion.deleteMany({ where: { fileId } });
      await prisma.file.delete({ where: { id: fileId } });
      return { message: 'File permanently deleted' };
    }

    const deletedFile = await prisma.file.update({
      where: { id: fileId },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
      },
    });

    return deletedFile;
  }

  async restoreFile(fileId: string, userId: string) {
    const file = await prisma.file.findFirst({
      where: {
        id: fileId,
        userId,
        isDeleted: true,
      },
    });

    if (!file) {
      throw new Error('Deleted file not found');
    }

    const restoredFile = await prisma.file.update({
      where: { id: fileId },
      data: {
        isDeleted: false,
        deletedAt: null,
      },
    });

    return restoredFile;
  }

  async getRecycleBin(userId: string) {
    const deletedFiles = await prisma.file.findMany({
      where: { userId, isDeleted: true },
      orderBy: { deletedAt: 'desc' },
      select: {
        id: true,
        name: true,
        originalName: true,
        size: true,
        mimeType: true,
        deletedAt: true,
      },
    });

    return deletedFiles;
  }

  async getFileVersions(fileId: string, userId: string) {
    await this.getFileById(fileId, userId); // ensure ownership
    const versions = await prisma.fileVersion.findMany({
      where: { fileId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        version: true,
        size: true,
        createdAt: true,
        mimeType: true,
      },
    });

    return versions;
  }

  async downloadVersion(versionId: string, userId: string) {
    const version = await prisma.fileVersion.findUnique({
      where: { id: versionId },
      select: {
        id: true,
        version: true,
        size: true,
        mimeType: true,
        content: true,
        file: {
          select: {
            originalName: true,
            userId: true,
          },
        },
      },
    });

    if (!version || version.file.userId !== userId) {
      throw new Error('Version not found');
    }

    return version;
  }

  async getStorageStats(userId: string) {
    const usage = await this.getUserUsageBytes(userId);
    const limitBytes = await this.resolveUserLimitBytes(userId);

    const totalFiles = await prisma.file.count({ where: { userId } });
    const totalVersions = await prisma.fileVersion.count({
      where: { file: { userId } },
    });

    const filesSize = await prisma.file.aggregate({
      where: { userId },
      _sum: { size: true },
    });

    const versionsSize = await prisma.fileVersion.aggregate({
      where: { file: { userId } },
      _sum: { size: true },
    });

    return {
      totalFiles,
      totalVersions,
      totalSize: filesSize._sum.size ?? 0,
      versionSize: versionsSize._sum.size ?? 0,
      combinedSize: usage,
      storageLimit: limitBytes,
    };
  }

  async findDuplicates(userId: string) {
    // Get all files with their folder information
    const files = await prisma.file.findMany({
      where: {
        userId,
        isDeleted: false,
        contentHash: { not: null },
      },
      select: {
        id: true,
        name: true,
        originalName: true,
        size: true,
        mimeType: true,
        contentHash: true,
        createdAt: true,
        updatedAt: true,
        folderId: true,
        folder: {
          select: {
            id: true,
            name: true,
            parentId: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // Helper function to build folder path
    const buildFolderPath = async (folderId: string | null): Promise<string> => {
      if (!folderId) return '/All Files';

      const folders: string[] = [];
      let currentFolderId: string | null = folderId;

      while (currentFolderId) {
        const folder: { name: string; parentId: string | null } | null =
          await prisma.folder.findUnique({
            where: { id: currentFolderId },
            select: { name: true, parentId: true },
          });

        if (!folder) break;
        folders.unshift(folder.name);
        currentFolderId = folder.parentId;
      }

      return '/' + folders.join(' / ');
    };

    // Group files by content hash
    const hashGroups = new Map<string, typeof files>();
    
    for (const file of files) {
      if (!file.contentHash) continue;
      
      const group = hashGroups.get(file.contentHash) || [];
      group.push(file);
      hashGroups.set(file.contentHash, group);
    }

    // Filter to only groups with duplicates (more than 1 file)
    const duplicateGroups = Array.from(hashGroups.entries())
      .filter(([_, group]) => group.length > 1)
      .map(([hash, group]) => ({ hash, files: group }));

    // Build folder paths for each file
    const duplicatesWithPaths = await Promise.all(
      duplicateGroups.map(async (group) => {
        const filesWithPaths = await Promise.all(
          group.files.map(async (file) => ({
            id: file.id,
            name: file.name,
            originalName: file.originalName,
            size: file.size,
            mimeType: file.mimeType,
            createdAt: file.createdAt,
            updatedAt: file.updatedAt,
            folderPath: await buildFolderPath(file.folderId),
          }))
        );

        return {
          hash: group.hash,
          count: group.files.length,
          files: filesWithPaths,
          totalWastedSpace: group.files.slice(1).reduce((sum, f) => sum + f.size, 0),
        };
      })
    );

    const totalWastedSpace = duplicatesWithPaths.reduce(
      (sum, group) => sum + group.totalWastedSpace,
      0
    );

    return {
      duplicateGroups: duplicatesWithPaths,
      totalGroups: duplicatesWithPaths.length,
      totalWastedSpace,
    };
  }
}

