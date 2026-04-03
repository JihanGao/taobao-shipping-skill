import { Mistake } from "@prisma/client";

import { Locale, MistakeAnalysis, MistakeStatus } from "@/lib/types";
import { t } from "@/lib/i18n";

export const MISTAKE_STATUSES: MistakeStatus[] = ["new", "needs_review", "mastered"];

export function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

const POS_ABBREV: Record<string, string> = {
  noun: "n.",
  verb: "v.",
  adjective: "adj.",
  adverb: "adv.",
  other: "other",
  名词: "n.",
  动词: "v.",
  形容词: "adj.",
  副词: "adv.",
  副詞: "adv.",
  其他: "other"
};

export function getPartOfSpeechAbbrev(
  pos: string | null | undefined
): string | null {
  if (!pos || !pos.trim()) return null;
  const key = pos.trim().toLowerCase();
  const direct = POS_ABBREV[pos.trim()] ?? POS_ABBREV[key];
  if (direct) return direct;
  if (/^noun$/i.test(pos)) return "n.";
  if (/^verb$/i.test(pos)) return "v.";
  if (/^adjective$/i.test(pos)) return "adj.";
  if (/^adverb$/i.test(pos)) return "adv.";
  return null;
}

export function parseExplanation(value: string): MistakeAnalysis {
  return JSON.parse(value) as MistakeAnalysis;
}

export function inferErrorTypeFromPrompt(prompt: string) {
  const content = prompt.toLowerCase();

  if (content.includes("gustar")) return "verb structure";
  if (content.includes("tense") || content.includes("yesterday")) return "verb tense";
  if (content.includes("particle") || /[はをがにで]/.test(content)) return "particle choice";
  if (content.includes("preposition")) return "preposition";

  return "grammar";
}

export function buildMockAnalysis(params: {
  language: string;
  learnerPrompt: string;
}): MistakeAnalysis {
  return {
    inferredQuestion: params.learnerPrompt,
    inferredUserAnswer: "Not provided",
    inferredCorrectAnswer: "Not provided",
    errorType: inferErrorTypeFromPrompt(params.learnerPrompt),
    grammarConcept: `${params.language} grammar explanation`,
    whyUserAnswerIsWrong:
      "The original answer or sentence likely does not match the grammar pattern the exercise expects.",
    whyCorrectAnswerIsCorrect:
      "The corrected version uses a more natural structure for this grammar point and matches the intended meaning.",
    shortRule:
      "Focus on the sentence pattern, then verify the verb form, word order, and any particles or prepositions.",
    exampleSentences: [
      `Question: ${params.learnerPrompt}`,
      `Tip: Compare your version with the target structure.`
    ],
    practiceQuestion: `Rewrite or explain this idea correctly in ${params.language}.`
  };
}

export function getStatusLabel(status: MistakeStatus, locale: Locale) {
  const copy = t(locale);

  if (status === "mastered") return copy.statusMastered;
  if (status === "needs_review") return copy.statusNeedsReview;
  return copy.statusNew;
}

export function getStatusClasses(status: MistakeStatus) {
  if (status === "mastered") return "bg-lime-100 text-lime-800";
  if (status === "needs_review") return "bg-amber-100 text-amber-800";
  return "bg-sky-100 text-sky-800";
}

export function isMistakeStatus(value: string): value is MistakeStatus {
  return MISTAKE_STATUSES.includes(value as MistakeStatus);
}

export function getMistakeTitle(mistake: Pick<Mistake, "learnerPrompt" | "question">, locale: Locale) {
  return mistake.question || mistake.learnerPrompt || t(locale).recentPromptFallback;
}

export function isKnownAnswer(value: string, locale: Locale) {
  const copy = t(locale);
  return Boolean(value) && value !== "Not provided" && value !== copy.unknownAnswer;
}

export function stripMarkdown(source: string) {
  return source
    .replace(/!\[[^\]]*\]\([^)]+\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[`*_>#]/g, " ")
    .replace(/\|/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stripMarkdownPreserveLines(source: string) {
  return source
    .replace(/!\[[^\]]*\]\([^)]+\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[`*_>#]/g, " ")
    .replace(/\|/g, " ")
    .split(/\n/)
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

export function isGenericScreenshotPrompt(value?: string | null) {
  if (!value) return false;

  const normalized = value.trim().toLowerCase();

  return [
    "请解释这张截图里的语言点。",
    "请解释这张截图里的语言点",
    "请一起解释这些截图里的语言点。",
    "请一起解释这些截图里的语言点",
    "please explain this screenshot.",
    "please explain this screenshot",
    "please explain the language point in this screenshot.",
    "please explain the language point in this screenshot",
    "please explain the language points across these screenshots.",
    "please explain the language points across these screenshots"
  ].includes(normalized);
}

function stripMarkdownLine(source: string) {
  return source
    .replace(/^[-*]\s+/, "")
    .replace(/^#+\s*/, "")
    .replace(/^\d+\.\s+/, "")
    .replace(/\*\*/g, "")
    .trim();
}

function isGenericPromptTitle(value?: string | null) {
  if (!value) return true;

  const normalized = value.trim().toLowerCase();

  return [
    "解释一下",
    "请一起解释这些截图里的语言点。",
    "请一起解释这些截图里的语言点",
    "help explain this",
    ...[
      "请解释这张截图里的语言点。",
      "请解释这张截图里的语言点",
      "please explain the language point in this screenshot.",
      "please explain the language point in this screenshot"
    ],
    "grammar question",
    "语法问题"
  ].includes(normalized);
}

function normalizeTitleCandidate(value: string) {
  return value
    .replace(/^[#\s]+/, "")
    .replace(/^[❌✅🔥⚠️🧠👉💡📌🎯]+\s*/, "")
    .replace(/[:：]\s*$/, "")
    .trim();
}

export function extractTitleFromAnswer(source: string, locale: Locale) {
  if (!source?.trim()) return null;

  // Prefer grammarTitle from "## 🔥 重点语法" section: the next **bold** line
  const grammarSectionMatch = source.match(
    /##\s*🔥\s*重点语法\s*\n\*\*([^*]+)\*\*/i
  ) ?? source.match(/##\s*Key Grammar\s*\n\*\*([^*]+)\*\*/i);
  if (grammarSectionMatch?.[1]) {
    const candidate = grammarSectionMatch[1].trim();
    if (candidate.length >= 4) return candidate;
  }

  const lines = source
    .split("\n")
    .map((line) => stripMarkdownLine(line))
    .map((line) => normalizeTitleCandidate(line))
    .filter(Boolean);

  const disallowedStarts =
    locale === "zh"
      ? ["问得非常好", "很好", "非常棒", "这是一个", "你现在开始", "如果你想", "需要的话", "问题"]
      : ["great question", "nice catch", "this is a", "if you want", "need", "question"];

  const preferred = lines.find((line) => {
    const lower = line.toLowerCase();
    if (disallowedStarts.some((start) => lower.startsWith(start.toLowerCase()))) return false;
    if (line.length < 6) return false;

    return (
      /用法|区分|为什么|表达|时态|语法|句型|表示|difference|usage|grammar|when to|why|命令式|imperative/i.test(line) &&
      !/^你写的是|^正确句子|^重点语法|^为什么不能说|^记住公式/.test(line)
    );
  });

  return preferred || null;
}

export function getMistakeDisplayTitle(
  mistake: Pick<Mistake, "learnerPrompt" | "question" | "aiAnswer">,
  locale: Locale
) {
  if (!isGenericPromptTitle(mistake.question)) {
    return mistake.question!;
  }

  return (
    extractTitleFromAnswer(mistake.aiAnswer, locale) ||
    mistake.learnerPrompt ||
    mistake.question ||
    t(locale).recentPromptFallback
  );
}

function cleanSummaryLine(line: string) {
  return stripMarkdownLine(line)
    .replace(/^[❌✅🔥⚠️🧠👉💡📌🎯]+/, "")
    .replace(/^(你写的是|正确句子|重点语法|为什么不能说|记住公式|问题|小总结|核心区别)[:：]?\s*/u, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Exclude table headers, stageComment, followUpOffer, and other non-teaching content */
function isJunkBulletLine(line: string): boolean {
  const t = line.trim();
  if (t.length < 8) return true;
  // Table header / schema
  if (/^\|\s*结构\s*\|\s*意思\s*\|\s*例子\s*\|?$/.test(t)) return true;
  if (/^\|\s*[-—]+\s*\|/.test(t)) return true;
  if (/^[|｜]\s*[^|]+\s*[|｜]\s*[^|]+\s*[|｜]\s*[^|]+\s*[|｜]?$/.test(t) && t.length < 50) return true;
  // Stage comment / encouragement
  if (/^(你现在开始进入|你已经开始|你正在进入)/.test(t)) return true;
  // Follow-up offer
  if (/^(要不要我帮你|要不要我给你|要不要我为你|想不想要|do you want me to|would you like me to)/i.test(t)) return true;
  if (/^(问得非常好|很好|非常棒|这是一个很多人会混的点)/.test(t)) return true;
  if (/^(great question|nice catch|if you want)/i.test(t)) return true;
  if (/^(无（?截图句子没有错误）?$)/.test(t)) return true;
  if (/^(你写的是|正确句子|重点语法|为什么不能说|记住公式)$/u.test(t)) return true;
  return false;
}

export function extractGrammarSummaryBullets(source: string): string[] {
  if (!source?.trim()) return [];

  const bullets: string[] = [];
  const lines = source.split("\n");

  // 1. Try to extract grammarPoints from "## 🔥 重点语法" section (teachingTemplate format)
  const grammarSectionIdx = lines.findIndex(
    (l) => /##\s*🔥\s*重点语法|##\s*Key Grammar/i.test(l)
  );
  if (grammarSectionIdx >= 0) {
    // Collect "- " bullet lines until next ## or ---
    for (let i = grammarSectionIdx + 1; i < lines.length; i++) {
      const line = lines[i];
      if (/^---\s*$/.test(line) || /^##\s+/.test(line)) break;
      const cleaned = cleanSummaryLine(line);
      if (cleaned && cleaned.startsWith("-")) {
        const content = cleaned.replace(/^-\s*/, "").trim();
        if (content.length >= 8 && !isJunkBulletLine(content)) {
          bullets.push(content);
        }
      } else if (/^\*\*[^*]+\*\*/.test(line)) {
        // Skip the grammarTitle line (bold)
        continue;
      }
    }

    // 2. Optionally add wrongForm → correctForm from ❌ and ✅ sections
    const wrongMatch = source.match(/\*\*❌\s*你写的是[：:]\s*\*\*\s*\*\*([^*]+)\*\*/);
    const correctMatch = source.match(/\*\*✅\s*正确句子[：:]\s*\*\*\s*\*\*([^*]+)\*\*/);
    if (wrongMatch?.[1] && correctMatch?.[1]) {
      const wrong = wrongMatch[1].trim();
      const correct = correctMatch[1].trim();
      if (wrong && correct && wrong !== correct) {
        const correctionLine = `❌ ${wrong} → ✅ ${correct}`;
        if (!bullets.includes(correctionLine) && bullets.length < 3) {
          bullets.push(correctionLine);
        }
      }
    }

    const unique = Array.from(new Set(bullets));
    if (unique.length > 0) return unique.slice(0, 3);
  }

  // 3. Fallback: filter by keyword (improved exclusions)
  const rawLines = lines
    .map((line) => cleanSummaryLine(line))
    .filter(Boolean);

  const filtered = rawLines.filter((line) => {
    if (isJunkBulletLine(line)) return false;
    return /表示|必须|不能|公式|用法|意思|区分|表达|时态|搭配|相当于|means|must|cannot|pattern|structure|usage|difference|命令式|imperative|虚拟式|敬语/i.test(
      line
    );
  });

  const unique = Array.from(new Set(filtered));
  return unique.slice(0, 3);
}

export function formatDateTime(value: Date | string, locale: Locale) {
  return new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en-US", {
    month: "numeric",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

export function formatDateOnly(value: Date | string | null | undefined, locale: Locale) {
  if (value == null) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function extractFirstTranscriptUserMessage(chatTranscriptJson?: string | null) {
  try {
    const parsed = JSON.parse(chatTranscriptJson || "[]") as Array<{ role?: string; content?: string }>;
    return parsed.find((message) => message.role === "user")?.content?.trim() || "";
  } catch {
    return "";
  }
}

function extractQuotedHeadword(source: string) {
  const match = source.match(/[「“"]([^」”"]{1,30})[」”"]/);
  return match?.[1]?.trim() || "";
}

function extractJapaneseLikeToken(source: string) {
  const matches = source.match(/[\u3040-\u30ff\u4e00-\u9fafー]{2,30}/g) || [];
  return matches[0] || "";
}

function extractJapaneseReadingFromAiAnswer(aiAnswer: string, term: string): string {
  if (!aiAnswer || !term) return "";
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parenMatch = aiAnswer.match(new RegExp(`${escaped}\\s*[（(]([ぁ-んァ-ンー]+)[）)]`));
  return parenMatch?.[1]?.trim() || "";
}

/**
 * For Japanese: always display as 漢字(reading) when both exist.
 * - Kanji asked (領収) → term=領収, reading=りょうしゅう → 領収(りょうしゅう)
 * - Hiragana asked (りょうしゅう) → term=領収, reading=りょうしゅう → 領収(りょうしゅう)
 * - Katakana asked (サクラ) → term=桜, reading=サクラ → 桜(サクラ)
 */
export function getVocabularyDisplayTerm(entry: {
  term?: string | null;
  reading?: string | null;
  language?: string | null;
  learnerPrompt?: string | null;
  aiAnswer: string;
  summaryJson?: string | null;
  chatTranscriptJson?: string | null;
}) {
  const term = entry.term || "";
  let reading = entry.reading?.trim() || "";
  const firstPrompt = extractFirstTranscriptUserMessage(entry.chatTranscriptJson) || entry.learnerPrompt || "";
  const quotedHeadword = extractQuotedHeadword(entry.aiAnswer || "");
  const promptToken = extractJapaneseLikeToken(firstPrompt);
  const looksAsciiOnly = /^[\x00-\x7F\s./-]+$/.test(term);

  let base: string;
  if (entry.language === "Japanese" && term && reading) {
    base = term;
  } else if (promptToken && (entry.language === "Japanese" || looksAsciiOnly)) {
    base = promptToken;
  } else if (term.includes("/") || term.includes("／")) {
    base = term.split(/[／/]/)[0].trim() || quotedHeadword || promptToken || term;
  } else {
    base = term || quotedHeadword || promptToken || firstPrompt;
  }

  if (entry.language === "Japanese" && !reading && base) {
    reading = extractJapaneseReadingFromAiAnswer(entry.aiAnswer || "", base);
  }

  if (reading && base) {
    return `${base}（${reading}）`;
  }
  return base;
}

export function extractShortVocabularyExplanation(aiAnswer: string | null | undefined, locale: Locale) {
  if (!aiAnswer || typeof aiAnswer !== "string") {
    return locale === "zh" ? "保存的单词解释。" : "Saved vocabulary note.";
  }
  const cleaned = stripMarkdown(aiAnswer)
    .replace(/主要结论（?快速记忆）?[:：]?\s*/gi, "")
    .replace(/main summary\s*\(quick memory\)[:：]?\s*/gi, "")
    .replace(/[✅❌🔥⚠️🧠👉💡📌🎯]/g, "")
    .replace(/问得非常好[^。！？.!?]*[。！？.!?]?/g, "")
    .replace(/很好[^。！？.!?]*[。！？.!?]?/g, "")
    .replace(/this is a very good question[^.?!]*[.?!]?/gi, "")
    .replace(/great question[^.?!]*[.?!]?/gi, "")
    .replace(/nice catch[^.?!]*[.?!]?/gi, "")
    .replace(/^(短答|short answer|来源与形式|original form|常见用法与示例|common usage examples)[:：]?\s*/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  const firstSentence = cleaned
    .split(/(?<=[。！？.!?])/)
    .map((part) => part.trim())
    .find(Boolean);

  if (firstSentence) {
    return firstSentence;
  }

  return locale === "zh" ? "保存的单词解释。" : "Saved vocabulary note.";
}

export function getVocabularySummary(
  entry: {
    aiAnswer: string;
    summaryJson?: string | null;
  },
  locale: Locale
) {
  try {
    const parsed = JSON.parse(entry.summaryJson || "{}") as {
      zh?: string;
      en?: string;
    };

    const localized = locale === "zh" ? parsed.zh : parsed.en;
    if (localized?.trim()) {
      return localized.trim();
    }
  } catch {
    // ignore malformed saved summaries and fall back to extraction
  }

  return extractShortVocabularyExplanation(entry.aiAnswer || "", locale);
}

function looksLikeSentence(wordPart: string): boolean {
  if (wordPart.length < 8) return false;
  return (
    /[をでにがはとから][\s\u4e00-\u9faf\u3040-\u30ff]/.test(wordPart) ||
    /(て|る|た|ます|ください|ましょう|ません)([\s。]|$)/.test(wordPart)
  );
}

function looksLikeWordWithReadingOnly(line: string): boolean {
  return /^[\u4e00-\u9faf\u3040-\u30ff]+（[\u3040-\u30ff]+）\s*$/.test(line);
}

/**
 * Extract example sentence + translation from AI tutor's aiAnswer.
 * Prefer actual usage examples (e.g. from 常见用法与示例) over definitions/summaries.
 * Supports: 銀行で両替をする（在银行兑换货币）, 「フォームに名前を記入してください。请在表格上填写名字。」
 */
export function extractVocabularyExample(
  aiAnswer: string | null | undefined
): { sentence: string; translation: string } | null {
  if (!aiAnswer || typeof aiAnswer !== "string") return null;
  const lines = stripMarkdownPreserveLines(aiAnswer);
  const exampleSectionHints = /常见用法与示例|常见用法|示例|Example|例子/;

  // Strategy -1: 「Japanese。Chinese。」format (highest priority)
  // e.g. 「フォームに名前を記入してください。请在表格上填写名字。」
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].replace(/^[-*•\d.)]\s*/, "").trim();
    const match = line.match(/「([^」]+)。([\u4e00-\u9fff][^。」]{2,80})」/);
    if (!match) continue;
    const sentence = match[1].trim();
    const translation = match[2].trim();
    if (sentence.length < 8 || sentence.length > 120) continue;
    if (translation.length < 2 || translation.length > 120) continue;
    if (!looksLikeSentence(sentence)) continue;
    if (/^短答|^Short answer|^意思|^翻译|^Summary|^小总结|^用于|^指/.test(translation)) continue;
    return { sentence, translation };
  }

  // Strategy 0: 常见用法与示例 - sentence（translation）on same line
  let inExampleSection = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].replace(/^[-*•\d.)]\s*/, "").trim();
    if (exampleSectionHints.test(line)) {
      inExampleSection = true;
      continue;
    }
    if (!inExampleSection) continue;
    const match = line.match(/^(.+?)[（(]([\u4e00-\u9fff][^）)]{2,80})[）)]\s*$/);
    if (!match) continue;
    const sentence = match[1].trim();
    const translation = match[2].trim();
    if (sentence.length < 4 || sentence.length > 120) continue;
    if (/^短答|^Short answer|^意思|^翻译|^Summary/i.test(sentence)) continue;
    if (/^[\u4e00-\u9fff\s]+$/.test(sentence) && !/[\u3040-\u30ff]/.test(sentence)) continue;
    return { sentence, translation };
  }

  for (const line of lines) {
    const clean = line.replace(/^[-*•\d.)]\s*/, "").trim();
    const match = clean.match(/^(.+?)[（(]([\u4e00-\u9fff][^）)]{2,80})[）)]\s*$/);
    if (!match) continue;
    const sentence = match[1].trim();
    const translation = match[2].trim();
    if (sentence.length < 4 || sentence.length > 120) continue;
    if (/^短答|^Short answer|^意思|^翻译|^Summary|^小总结/i.test(sentence)) continue;
    if (/^[\u4e00-\u9fff\s]+$/.test(sentence) && !/[\u3040-\u30ff]/.test(sentence)) continue;
    return { sentence, translation };
  }

  // Strategy 1: Quoted sentence - handle 「Japanese。Chinese。」inside quote
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const quoted = line.match(/「([^」]{8,120})」/);
    if (!quoted) continue;
    const inner = quoted[1].trim();
    const dotSplit = inner.split(/。/);
    if (dotSplit.length >= 2) {
      const before = dotSplit[0].trim();
      const after = dotSplit.slice(1).join("。").trim();
      if (
        before.length >= 8 &&
        before.length <= 120 &&
        looksLikeSentence(before) &&
        after.length >= 2 &&
        after.length <= 120 &&
        /[\u4e00-\u9fff]/.test(after) &&
        !/^短答|^Short answer|^意思|^翻译|^Summary|^小总结|^用于|^指/.test(after)
      ) {
        return { sentence: before, translation: after };
      }
    }
    const sentence = inner;
    if (sentence.length < 3 || sentence.length > 120) continue;
    const afterQuote = line.slice(line.indexOf(quoted[0]) + quoted[0].length);
    const dashMatch = afterQuote.match(/[\s—–-]+(.+)/);
    const colonMatch = afterQuote.match(/[\s:：]+(.+)/);
    const translation = (dashMatch?.[1] || colonMatch?.[1] || "").trim();
    if (translation && translation.length > 1 && translation.length < 150) {
      return { sentence, translation };
    }
    const nextLine = lines[i + 1]?.replace(/^[-*•\d.)]\s*/, "").trim();
    if (nextLine && nextLine.length > 1 && nextLine.length < 150 && /[\u4e00-\u9fff]/.test(nextLine)) {
      return { sentence, translation: nextLine };
    }
  }

  // Strategy 2: 例：/Example:/句子
  for (let i = 0; i < lines.length - 1; i++) {
    const line = lines[i];
    const exampleMatch = line.match(
      /(?:例|例子|例句|Example|句子)[:：]\s*["\u201C\u201D]?([^"\u201C\u201D\n]{4,100})["\u201C\u201D]?/
    );
    if (!exampleMatch) continue;
    const sentence = exampleMatch[1].replace(/^「|」$/g, "").trim();
    if (sentence.length < 4) continue;
    const nextLine = lines[i + 1].replace(/^[-*•\d.)]\s*/, "").replace(/^(?:意思|翻译|Translation)[:：]?\s*/, "").trim();
    if (nextLine.length > 2 && nextLine.length < 150 && /[\u4e00-\u9fff]/.test(nextLine)) {
      return { sentence, translation: nextLine };
    }
    if (sentence.includes("。")) {
      const [jp, zh] = sentence.split(/。/).map((s) => s.trim());
      if (jp && zh && looksLikeSentence(jp) && /[\u4e00-\u9fff]/.test(zh)) {
        return { sentence: jp, translation: zh };
      }
    }
  }

  // Strategy 3: Bullet = foreign, next = Chinese (with exclusions)
  for (let i = 0; i < lines.length - 1; i++) {
    const line = lines[i].replace(/^[-*•\d.)]\s*/, "").trim();
    const nextLine = lines[i + 1].replace(/^[-*•\d.)]\s*/, "").trim();
    if (looksLikeWordWithReadingOnly(line)) continue;
    if (/^(简短解释|短答|来源与形式|来源)[:：]/.test(nextLine)) continue;
    if (line.length < 15 && !looksLikeSentence(line)) continue;
    const hasForeign = /[a-zA-Z\u00c0-\u024f\u1e00-\u1eff\u3040-\u30ff]/.test(line);
    const hasChinese = /[\u4e00-\u9fff]/.test(nextLine);
    if (
      hasForeign &&
      hasChinese &&
      line.length >= 8 &&
      line.length <= 120 &&
      nextLine.length >= 2 &&
      nextLine.length <= 150
    ) {
      const cleanLine = line.replace(/^["\u201C\u201D「]|["\u201C\u201D」]$/g, "").trim();
      if (cleanLine.length >= 8 && looksLikeSentence(cleanLine)) {
        if (!/^(简短解释|短答|記入指|両替指|領収指|指|表示|用于)/.test(nextLine)) {
          return { sentence: cleanLine, translation: nextLine };
        }
      }
    }
  }

  // Strategy 4: 意思/翻译/meaning pattern
  for (const line of lines) {
    const match = line.match(
      /^(.{5,80})[\s]*[（(]?(?:意思|翻译|Translation|meaning)[:：)]?\s*([\u4e00-\u9fff][^）)]{2,80})/
    );
    if (match) {
      const sentence = match[1].replace(/^["\u201C\u201D]|["\u201C\u201D]$/g, "").trim();
      const translation = match[2].trim();
      if (sentence.length >= 5) return { sentence, translation };
    }
  }

  return null;
}

export function serializeMistakeFilters(filters: { language?: string; status?: string }) {
  return encodeURIComponent(
    JSON.stringify({
      language: filters.language || "",
      status: filters.status || ""
    })
  );
}

export function parseMistakeFiltersCookie(value?: string | null) {
  if (!value) return {};

  try {
    const parsed = JSON.parse(decodeURIComponent(value)) as {
      language?: string;
      status?: string;
    };

    return {
      language: parsed.language || undefined,
      status: parsed.status || undefined
    };
  } catch {
    return {};
  }
}
