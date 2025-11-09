import prisma from '../../config/database';
import { pythonService } from '../../services/pythonService';

const baseFileSelect = {
  id: true,
  name: true,
  originalName: true,
  folderId: true,
  size: true,
  mimeType: true,
  summary: true,
  tags: true,
  updatedAt: true,
} as const;

const parseTags = (tags: string | null): string[] => {
  if (!tags) return [];
  try {
    const parsed = JSON.parse(tags);
    return Array.isArray(parsed) ? parsed.map((tag) => String(tag)) : [];
  } catch (error) {
    return [];
  }
};

export class AIService {
  async semanticSearch(userId: string, query: string) {
    const response = await pythonService.semanticSearch(query);
    if (!response?.success || !Array.isArray(response.results)) {
      return [];
    }

    const filteredResults = response.results.filter((entry: any) => {
      const metadata = entry.metadata || {};
      return !metadata.user_id || metadata.user_id === userId;
    });

    const ids = filteredResults.map((entry: any) => entry.file_id).filter(Boolean);

    if (!ids.length) {
      return [];
    }

    const files = await prisma.file.findMany({
      where: {
        id: { in: ids },
        userId,
        isDeleted: false,
      },
      select: baseFileSelect,
    });

    const fileMap = new Map(files.map((file) => [file.id, file]));

    return filteredResults
      .map((entry: any) => {
        const file = fileMap.get(entry.file_id);
        if (!file) return null;
        return {
          file,
          score: entry.score,
          tags: parseTags(file.tags),
        };
      })
      .filter(Boolean);
  }

  async chat(userId: string, question: string) {
    const response = await pythonService.chat(question);
    if (!response?.success) {
      return {
        answer: 'The AI assistant is not available right now.',
        references: [],
      };
    }

    const references = Array.isArray(response.references) ? response.references : [];
    const ids = references
      .filter((ref: any) => !ref.metadata || !ref.metadata.user_id || ref.metadata.user_id === userId)
      .map((ref: any) => ref.file_id)
      .filter(Boolean);

    const files = ids.length
      ? await prisma.file.findMany({ where: { id: { in: ids }, userId }, select: baseFileSelect })
      : [];

    const fileMap = new Map(files.map((file) => [file.id, file]));

    const formattedRefs = references
      .map((ref: any) => {
        const file = fileMap.get(ref.file_id);
        if (!file) return null;
        return {
          file,
          score: ref.score,
          tags: parseTags(file.tags),
        };
      })
      .filter(Boolean);

    return {
      answer: response.answer,
      references: formattedRefs,
    };
  }
}
