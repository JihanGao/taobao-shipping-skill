import { MistakeStatus, Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { isMistakeStatus } from "@/lib/utils";

const mistakeNotDeleted = { isDeleted: false };

export async function getLanguages() {
  const rows = await prisma.mistake.findMany({
    where: mistakeNotDeleted,
    distinct: ["language"],
    select: { language: true },
    orderBy: { language: "asc" }
  });

  return rows.map((row) => row.language);
}

export async function getSummary() {
  const [total, needsReview, mastered, recent, vocabularyCount] = await Promise.all([
    prisma.mistake.count({ where: mistakeNotDeleted }),
    prisma.mistake.count({ where: { ...mistakeNotDeleted, status: "needs_review" } }),
    prisma.mistake.count({ where: { ...mistakeNotDeleted, status: "mastered" } }),
    prisma.mistake.findMany({
      where: mistakeNotDeleted,
      orderBy: { createdAt: "desc" },
      take: 5
    }),
    prisma.vocabularyEntry.count({
      where: vocabularyNotDeleted
    })
  ]);

  return { total, needsReview, mastered, recent, vocabularyCount };
}

export async function getMistakes(filters?: {
  language?: string;
  status?: string;
  limit?: number;
  favorites?: boolean;
}) {
  const where: Prisma.MistakeWhereInput = { ...mistakeNotDeleted };

  if (filters?.language) {
    where.language = filters.language;
  }

  if (filters?.status && isMistakeStatus(filters.status)) {
    where.status = filters.status as MistakeStatus;
  }

  if (filters?.favorites === true) {
    where.isFavorite = true;
  }

  return prisma.mistake.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: filters?.limit
  });
}

export async function getMistakeById(id: number) {
  return prisma.mistake.findFirst({
    where: { id, ...mistakeNotDeleted }
  });
}

export async function getAdjacentMistakeIds(
  id: number,
  filters?: {
    language?: string;
    status?: string;
  }
) {
  const where: Prisma.MistakeWhereInput = { ...mistakeNotDeleted };

  if (filters?.language) {
    where.language = filters.language;
  }

  if (filters?.status && isMistakeStatus(filters.status)) {
    where.status = filters.status as MistakeStatus;
  }

  const rows = await prisma.mistake.findMany({
    where,
    select: { id: true },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }]
  });

  const index = rows.findIndex((row) => row.id === id);

  return {
    previousId: index > 0 ? rows[index - 1]?.id ?? null : null,
    nextId: index >= 0 && index < rows.length - 1 ? rows[index + 1]?.id ?? null : null
  };
}

export async function getRecentMistakesByLanguage(language: string) {
  const since = new Date();
  since.setDate(since.getDate() - 7);

  return prisma.mistake.findMany({
    where: {
      ...mistakeNotDeleted,
      language,
      createdAt: {
        gte: since
      }
    },
    orderBy: { createdAt: "desc" },
    take: 20
  });
}

const vocabularyNotDeleted = { isDeleted: false };

export async function getVocabulary(filters?: {
  language?: string;
  limit?: number;
  favorites?: boolean;
}) {
  return prisma.vocabularyEntry.findMany({
    where: {
      ...vocabularyNotDeleted,
      ...(filters?.language ? { language: filters.language } : {}),
      ...(filters?.favorites === true ? { isFavorite: true } : {})
    },
    orderBy: { createdAt: "desc" },
    take: filters?.limit
  });
}

export async function getVocabularyLanguages() {
  const rows = await prisma.vocabularyEntry.findMany({
    where: vocabularyNotDeleted,
    distinct: ["language"],
    select: { language: true },
    orderBy: { language: "asc" }
  });

  return rows.map((row) => row.language);
}

export async function getVocabularyById(id: number) {
  return prisma.vocabularyEntry.findFirst({
    where: { id, ...vocabularyNotDeleted }
  });
}
