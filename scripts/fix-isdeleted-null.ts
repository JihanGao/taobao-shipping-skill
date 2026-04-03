/**
 * One-time script to fix existing records where isDeleted is NULL.
 * Run with: npx tsx scripts/fix-isdeleted-null.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const fixMistakes = prisma.$executeRawUnsafe(
    `UPDATE Mistake SET isDeleted = 0 WHERE isDeleted IS NULL`
  );
  const fixVocabulary = prisma.$executeRawUnsafe(
    `UPDATE VocabularyEntry SET isDeleted = 0 WHERE isDeleted IS NULL`
  );
  const [m, v] = await Promise.all([fixMistakes, fixVocabulary]);
  console.log(`Fixed ${m} Mistake rows, ${v} VocabularyEntry rows`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
