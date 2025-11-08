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
      where: { userId },
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
}
