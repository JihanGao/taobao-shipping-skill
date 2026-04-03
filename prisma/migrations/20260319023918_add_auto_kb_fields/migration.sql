-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_VocabularyEntry" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "language" TEXT NOT NULL,
    "learnerPrompt" TEXT NOT NULL DEFAULT '',
    "term" TEXT NOT NULL,
    "lemma" TEXT NOT NULL DEFAULT '',
    "aiAnswer" TEXT NOT NULL,
    "summaryJson" TEXT NOT NULL DEFAULT '{}',
    "chatTranscriptJson" TEXT NOT NULL DEFAULT '[]',
    "isSimpleWord" BOOLEAN NOT NULL DEFAULT true,
    "screenshotPath" TEXT,
    "partOfSpeech" TEXT NOT NULL DEFAULT 'other',
    "partOfSpeech_zh" TEXT NOT NULL DEFAULT '其他',
    "partOfSpeech_en" TEXT NOT NULL DEFAULT 'other',
    "themeCategory" TEXT NOT NULL DEFAULT 'misc',
    "themeCategory_zh" TEXT NOT NULL DEFAULT '其他',
    "themeCategory_en" TEXT NOT NULL DEFAULT 'misc',
    "subCategory" TEXT NOT NULL DEFAULT 'other',
    "subCategory_zh" TEXT NOT NULL DEFAULT '其他',
    "subCategory_en" TEXT NOT NULL DEFAULT 'other',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_VocabularyEntry" ("aiAnswer", "chatTranscriptJson", "createdAt", "id", "isSimpleWord", "language", "learnerPrompt", "screenshotPath", "summaryJson", "term", "updatedAt") SELECT "aiAnswer", "chatTranscriptJson", "createdAt", "id", "isSimpleWord", "language", "learnerPrompt", "screenshotPath", "summaryJson", "term", "updatedAt" FROM "VocabularyEntry";
DROP TABLE "VocabularyEntry";
ALTER TABLE "new_VocabularyEntry" RENAME TO "VocabularyEntry";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
