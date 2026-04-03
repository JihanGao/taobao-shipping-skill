-- CreateTable
CREATE TABLE "VocabularyEntry" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "language" TEXT NOT NULL,
    "learnerPrompt" TEXT NOT NULL DEFAULT '',
    "term" TEXT NOT NULL,
    "aiAnswer" TEXT NOT NULL,
    "isSimpleWord" BOOLEAN NOT NULL DEFAULT true,
    "screenshotPath" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Mistake" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "language" TEXT NOT NULL,
    "learnerPrompt" TEXT NOT NULL DEFAULT '',
    "question" TEXT NOT NULL,
    "userAnswer" TEXT NOT NULL,
    "correctAnswer" TEXT NOT NULL,
    "errorType" TEXT NOT NULL,
    "aiAnswer" TEXT NOT NULL DEFAULT '',
    "aiExplanationJson" TEXT NOT NULL,
    "screenshotPath" TEXT,
    "status" TEXT NOT NULL DEFAULT 'new',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Mistake" ("aiExplanationJson", "correctAnswer", "createdAt", "errorType", "id", "language", "learnerPrompt", "question", "screenshotPath", "status", "updatedAt", "userAnswer") SELECT "aiExplanationJson", "correctAnswer", "createdAt", "errorType", "id", "language", "learnerPrompt", "question", "screenshotPath", "status", "updatedAt", "userAnswer" FROM "Mistake";
DROP TABLE "Mistake";
ALTER TABLE "new_Mistake" RENAME TO "Mistake";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
