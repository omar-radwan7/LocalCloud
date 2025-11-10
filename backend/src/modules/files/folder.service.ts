import prisma from '../../config/database';

export interface FolderNode {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: Date;
  updatedAt: Date;
  fileCount: number;
  children: FolderNode[];
}

export class FolderService {
  async createFolder(userId: string, name: string, parentId?: string | null) {
    const trimmedName = name.trim();
    if (!trimmedName) {
      throw new Error('Folder name is required');
    }

    if (parentId) {
      const parent = await prisma.folder.findFirst({
        where: { id: parentId, userId },
      });

      if (!parent) {
        throw new Error('Parent folder not found');
      }
    }

    try {
      const folder = await prisma.folder.create({
        data: {
          name: trimmedName,
          userId,
          parentId: parentId || null,
        },
      });

      return folder;
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new Error('A folder with this name already exists at this level');
      }
      throw error;
    }
  }

  async getFolderTree(userId: string): Promise<FolderNode[]> {
    const folders = await prisma.folder.findMany({
      where: { userId, isDeleted: false },
      orderBy: { createdAt: 'asc' },
    });

    const fileCounts = await prisma.file.groupBy({
      by: ['folderId'],
      where: { userId, isDeleted: false },
      _count: { _all: true },
    });

    const countMap = new Map<string, number>();
    fileCounts.forEach((group) => {
      if (group.folderId) {
        countMap.set(group.folderId, group._count._all);
      }
    });

    const map = new Map<string, FolderNode>();
    const roots: FolderNode[] = [];

    folders.forEach((folder) => {
      map.set(folder.id, {
        id: folder.id,
        name: folder.name,
        parentId: folder.parentId,
        createdAt: folder.createdAt,
        updatedAt: folder.updatedAt,
        fileCount: countMap.get(folder.id) ?? 0,
        children: [],
      });
    });

    map.forEach((node) => {
      if (node.parentId) {
        const parent = map.get(node.parentId);
        if (parent) {
          parent.children.push(node);
        }
      } else {
        roots.push(node);
      }
    });

    return roots;
  }

  async deleteFolder(userId: string, folderId: string) {
    const folder = await prisma.folder.findFirst({
      where: { id: folderId, userId, isDeleted: false },
      select: { id: true },
    });
    if (!folder) {
      throw new Error('Folder not found');
    }

    // Get all descendant folders
    const allFolders = await prisma.folder.findMany({
      where: { userId, isDeleted: false },
      select: { id: true, parentId: true },
    });

    const collectSubtree = (rootId: string): string[] => {
      const children = allFolders.filter((f) => f.parentId === rootId);
      return [rootId, ...children.flatMap((child) => collectSubtree(child.id))];
    };

    const subtreeIds = collectSubtree(folderId);

    // Soft delete all files in the folder subtree
    await prisma.file.updateMany({
      where: {
        userId,
        folderId: { in: subtreeIds },
        isDeleted: false,
      },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
      },
    });

    // Soft delete folder subtree
    await prisma.folder.updateMany({
      where: { userId, id: { in: subtreeIds } },
      data: { isDeleted: true, deletedAt: new Date() },
    });

    return { success: true };
  }

  async listDeletedFolders(userId: string): Promise<Array<{ id: string; name: string; deletedAt: Date }>> {
    const folders = await prisma.folder.findMany({
      where: { userId, isDeleted: true },
      select: { id: true, name: true, deletedAt: true },
      orderBy: { deletedAt: 'desc' },
    });
    return folders.map((f) => ({
      id: f.id,
      name: f.name,
      deletedAt: f.deletedAt || new Date(0),
    }));
  }

  async restoreFolder(folderId: string, userId: string): Promise<any> {
    // Verify folder exists and is deleted
    const folder = await prisma.folder.findFirst({
      where: { id: folderId, userId, isDeleted: true },
    });

    if (!folder) {
      throw new Error('Folder not found in recycle bin');
    }

    // Get all folders (including deleted ones) to find descendants
    const allFolders = await prisma.folder.findMany({
      where: { userId },
      select: { id: true, parentId: true, isDeleted: true },
    });

    const collectSubtree = (rootId: string): string[] => {
      const children = allFolders.filter((f) => f.parentId === rootId);
      return [rootId, ...children.flatMap((child) => collectSubtree(child.id))];
    };

    const subtreeIds = collectSubtree(folderId);

    // Restore all files in the folder subtree
    await prisma.file.updateMany({
      where: { userId, folderId: { in: subtreeIds }, isDeleted: true },
      data: {
        isDeleted: false,
        deletedAt: null,
      },
    });

    // Restore folder subtree
    await prisma.folder.updateMany({
      where: { userId, id: { in: subtreeIds } },
      data: { isDeleted: false, deletedAt: null },
    });

    return folder;
  }
}
