-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_VocabularyEntry" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "language" TEXT NOT NULL,
    "learnerPrompt" TEXT NOT NULL DEFAULT '',
    "term" TEXT NOT NULL,
    "aiAnswer" TEXT NOT NULL,
    "summaryJson" TEXT NOT NULL DEFAULT '{}',
    "chatTranscriptJson" TEXT NOT NULL DEFAULT '[]',
    "isSimpleWord" BOOLEAN NOT NULL DEFAULT true,
    "screenshotPath" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_VocabularyEntry" ("aiAnswer", "chatTranscriptJson", "createdAt", "id", "isSimpleWord", "language", "learnerPrompt", "screenshotPath", "term", "updatedAt") SELECT "aiAnswer", "chatTranscriptJson", "createdAt", "id", "isSimpleWord", "language", "learnerPrompt", "screenshotPath", "term", "updatedAt" FROM "VocabularyEntry";
DROP TABLE "VocabularyEntry";
ALTER TABLE "new_VocabularyEntry" RENAME TO "VocabularyEntry";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
