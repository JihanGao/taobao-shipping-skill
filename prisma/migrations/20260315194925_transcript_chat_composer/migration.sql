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
    "chatTranscriptJson" TEXT NOT NULL DEFAULT '[]',
    "screenshotPath" TEXT,
    "status" TEXT NOT NULL DEFAULT 'new',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Mistake" ("aiAnswer", "aiExplanationJson", "correctAnswer", "createdAt", "errorType", "id", "language", "learnerPrompt", "question", "screenshotPath", "status", "updatedAt", "userAnswer") SELECT "aiAnswer", "aiExplanationJson", "correctAnswer", "createdAt", "errorType", "id", "language", "learnerPrompt", "question", "screenshotPath", "status", "updatedAt", "userAnswer" FROM "Mistake";
DROP TABLE "Mistake";
ALTER TABLE "new_Mistake" RENAME TO "Mistake";
CREATE TABLE "new_VocabularyEntry" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "language" TEXT NOT NULL,
    "learnerPrompt" TEXT NOT NULL DEFAULT '',
    "term" TEXT NOT NULL,
    "aiAnswer" TEXT NOT NULL,
    "chatTranscriptJson" TEXT NOT NULL DEFAULT '[]',
    "isSimpleWord" BOOLEAN NOT NULL DEFAULT true,
    "screenshotPath" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_VocabularyEntry" ("aiAnswer", "createdAt", "id", "isSimpleWord", "language", "learnerPrompt", "screenshotPath", "term", "updatedAt") SELECT "aiAnswer", "createdAt", "id", "isSimpleWord", "language", "learnerPrompt", "screenshotPath", "term", "updatedAt" FROM "VocabularyEntry";
DROP TABLE "VocabularyEntry";
ALTER TABLE "new_VocabularyEntry" RENAME TO "VocabularyEntry";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
