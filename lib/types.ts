export type Locale = "en" | "zh";

export type MistakeStatus = "new" | "needs_review" | "mastered";

export type ExplanationPayload = {
  grammarConcept: string;
  whyUserAnswerIsWrong: string;
  whyCorrectAnswerIsCorrect: string;
  shortRule: string;
  exampleSentences: [string, string] | string[];
  practiceQuestion: string;
};

export type MistakeAnalysis = ExplanationPayload & {
  inferredQuestion: string;
  inferredUserAnswer: string;
  inferredCorrectAnswer: string;
  errorType: string;
};

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type TutorQualityMode = "fast" | "high";

export type VocabPackItem = {
  word: string;
  reading?: string;
  meaning: string;
};

export type VocabPack = {
  type: "vocab_pack";
  title: string;
  items: VocabPackItem[];
};

export type TutorResult = {
  assistantReply: string;
  title: string;
  suggestedTerm: string;
  suggestedReading?: string;
  suggestedPartOfSpeech?: "noun" | "verb" | "adjective" | "adverb" | "other";
  isSimpleWord: boolean;
  errorType: string;
  summaryZh?: string;
  summaryEn?: string;
  vocabPack?: VocabPack | null;
  detectedLanguage?: "English" | "Japanese" | "Spanish";
  screenshotPath?: string | null;
  screenshotPaths?: string[] | null;
  newScreenshotPaths?: string[] | null;
  provider?: "openai" | "mock";
};
