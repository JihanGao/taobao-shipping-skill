import OpenAI from "openai";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { Locale } from "@/lib/types";
import {
  extractGrammarSummaryBullets,
  extractShortVocabularyExplanation,
  getMistakeDisplayTitle,
  getVocabularyDisplayTerm
} from "@/lib/utils";

export type InsightsRangeKey = "today" | "last7" | "last30" | "custom";

export type AutomaticInsightSummary = {
  keyGrammarPoints: Array<{
    title: string;
    count: number;
    summary: string;
    relatedItemIds: number[];
  }>;
  repeatedMistakePatterns: Array<{
    title: string;
    count: number;
    summary: string;
    relatedItemIds: number[];
  }>;
};

export type CustomInsightResponse = {
  directAnswer: string;
  keyFindings: string[];
  supportingExamples: string[];
  suggestedNextSteps: string[];
};

type ProcessedRecord = {
  id: number;
  language: string;
  kind: "mistake" | "vocabulary";
  title: string;
  prompt: string;
  createdAt: string;
  summary: string;
  errorType?: string;
  bullets: string[];
};

export type ProcessedInsightsPayload = {
  rangeLabel: string;
  totalMistakes: number;
  totalVocabulary: number;
  totalRecords: number;
  repeatedGrammarTags: Array<{
    title: string;
    count: number;
    relatedItemIds: number[];
    examples: string[];
  }>;
  repeatedErrorTypes: Array<{
    title: string;
    count: number;
    relatedItemIds: number[];
    examples: string[];
  }>;
  repeatedTopics: Array<{
    title: string;
    count: number;
    relatedItemIds: number[];
  }>;
  vocabularyThemes: Array<{
    theme: string;
    words: string[];
    relatedItemIds: number[];
  }>;
  representativeMistakes: ProcessedRecord[];
  representativeVocabulary: ProcessedRecord[];
};

const automaticSummarySchema = z.object({
  keyGrammarPoints: z.array(
    z.object({
      title: z.string(),
      count: z.number(),
      summary: z.string(),
      relatedItemIds: z.array(z.number())
    })
  ),
  repeatedMistakePatterns: z.array(
    z.object({
      title: z.string(),
      count: z.number(),
      summary: z.string(),
      relatedItemIds: z.array(z.number())
    })
  )
});

const customSummarySchema = z.object({
  directAnswer: z.string(),
  keyFindings: z.array(z.string()),
  supportingExamples: z.array(z.string()),
  suggestedNextSteps: z.array(z.string())
});

const themeMatchers: Array<{ theme: string; test: RegExp }> = [
  { theme: "Daily routines", test: /wake|sleep|lav|almorz|routine|daily|mañana|ayer|today|daily|早|洗|起床|睡/i },
  { theme: "Food and meals", test: /comer|almorz|cenar|desayun|food|meal|lunch|dinner|eat|午饭|吃/i },
  { theme: "Body and self-care", test: /cara|mano|pelo|body|wash|face|hands|self|洗脸|手|头发/i },
  { theme: "Travel and places", test: /bank|airport|centro|学校|station|city|hotel|viaje|旅|place|银行/i },
  { theme: "Politeness and social expressions", test: /please|polite|よろしく|よろしい|礼貌|formal|客气/i }
];

function getClient() {
  if (!process.env.OPENAI_API_KEY) {
    return null;
  }

  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

function normalizeKey(value: string) {
  return value.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();
}

function incrementBucket<T extends { count: number; relatedItemIds: number[]; examples?: string[] }>(
  bucket: Map<string, T>,
  key: string,
  seed: T,
  example?: string
) {
  const current = bucket.get(key);
  if (!current) {
    bucket.set(key, {
      ...seed,
      examples: seed.examples || (example ? [example] : undefined)
    });
    return;
  }

  current.count += 1;
  current.relatedItemIds = Array.from(new Set([...current.relatedItemIds, ...seed.relatedItemIds]));
  if (example && current.examples && current.examples.length < 3 && !current.examples.includes(example)) {
    current.examples.push(example);
  }
}

export function getInsightsDateRange(params: {
  range: InsightsRangeKey;
  from?: string;
  to?: string;
}) {
  const now = new Date();
  const start = new Date(now);
  const end = new Date(now);

  if (params.range === "today") {
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
  } else if (params.range === "last7") {
    start.setDate(start.getDate() - 6);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
  } else if (params.range === "last30") {
    start.setDate(start.getDate() - 29);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
  } else {
    const customStart = params.from ? new Date(params.from) : now;
    const customEnd = params.to ? new Date(params.to) : now;
    customStart.setHours(0, 0, 0, 0);
    customEnd.setHours(23, 59, 59, 999);
    return { start: customStart, end: customEnd };
  }

  return { start, end };
}

function getRangeLabel(locale: Locale, range: InsightsRangeKey) {
  if (locale === "zh") {
    if (range === "today") return "今天";
    if (range === "last7") return "最近 7 天";
    if (range === "last30") return "最近 30 天";
    return "自定义时间段";
  }

  if (range === "today") return "today";
  if (range === "last7") return "the last 7 days";
  if (range === "last30") return "the last 30 days";
  return "the selected custom range";
}

export async function buildProcessedInsights(params: {
  locale: Locale;
  range: InsightsRangeKey;
  from?: string;
  to?: string;
  language?: string;
}) {
  const { start, end } = getInsightsDateRange(params);
  const mistakeWhere = {
    isDeleted: false,
    createdAt: { gte: start, lte: end },
    ...(params.language ? { language: params.language } : {})
  };
  const vocabularyWhere = {
    isDeleted: false,
    createdAt: { gte: start, lte: end },
    ...(params.language ? { language: params.language } : {})
  };

  const [mistakes, vocabulary] = await Promise.all([
    prisma.mistake.findMany({
      where: mistakeWhere,
      orderBy: { createdAt: "desc" }
    }),
    prisma.vocabularyEntry.findMany({
      where: vocabularyWhere,
      orderBy: { createdAt: "desc" }
    })
  ]);

  const grammarMap = new Map<
    string,
    { title: string; count: number; relatedItemIds: number[]; examples: string[] }
  >();
  const errorMap = new Map<
    string,
    { title: string; count: number; relatedItemIds: number[]; examples: string[] }
  >();
  const topicMap = new Map<string, { title: string; count: number; relatedItemIds: number[] }>();
  const themeMap = new Map<string, { theme: string; words: string[]; relatedItemIds: number[] }>();

  const representativeMistakes: ProcessedRecord[] = mistakes.slice(0, 8).map((item) => {
    const title = getMistakeDisplayTitle(item, params.locale);
    const bullets = extractGrammarSummaryBullets(item.aiAnswer);

    incrementBucket(
      grammarMap,
      normalizeKey(title),
      {
        title,
        count: 1,
        relatedItemIds: [item.id],
        examples: bullets.length > 0 ? [bullets[0]] : [item.learnerPrompt || item.question]
      },
      bullets[0] || item.learnerPrompt || item.question
    );

    incrementBucket(
      errorMap,
      normalizeKey(item.errorType || "grammar help"),
      {
        title: item.errorType || "grammar help",
        count: 1,
        relatedItemIds: [item.id],
        examples: [title]
      },
      title
    );

    const topicKey = normalizeKey(title);
    const currentTopic = topicMap.get(topicKey);
    if (!currentTopic) {
      topicMap.set(topicKey, { title, count: 1, relatedItemIds: [item.id] });
    } else {
      currentTopic.count += 1;
      currentTopic.relatedItemIds = Array.from(new Set([...currentTopic.relatedItemIds, item.id]));
    }

    return {
      id: item.id,
      language: item.language,
      kind: "mistake",
      title,
      prompt: item.learnerPrompt || item.question,
      createdAt: item.createdAt.toISOString(),
      summary: bullets[0] || item.aiAnswer,
      errorType: item.errorType,
      bullets
    };
  });

  const representativeVocabulary: ProcessedRecord[] = vocabulary.slice(0, 8).map((item) => {
    const title = getVocabularyDisplayTerm(item);
    const summary = extractShortVocabularyExplanation(item.aiAnswer, params.locale);
    const theme =
      themeMatchers.find((matcher) => matcher.test.test(`${item.term} ${item.aiAnswer} ${item.learnerPrompt}`))
        ?.theme || (params.locale === "zh" ? "零散新词" : "Mixed vocabulary");

    const currentTheme = themeMap.get(theme);
    if (!currentTheme) {
      themeMap.set(theme, {
        theme,
        words: [title],
        relatedItemIds: [item.id]
      });
    } else {
      if (currentTheme.words.length < 8 && !currentTheme.words.includes(title)) {
        currentTheme.words.push(title);
      }
      currentTheme.relatedItemIds = Array.from(new Set([...currentTheme.relatedItemIds, item.id]));
    }

    return {
      id: item.id,
      language: item.language,
      kind: "vocabulary",
      title,
      prompt: item.learnerPrompt || item.term,
      createdAt: item.createdAt.toISOString(),
      summary,
      bullets: [summary]
    };
  });

  return {
    rangeLabel: getRangeLabel(params.locale, params.range),
    totalMistakes: mistakes.length,
    totalVocabulary: vocabulary.length,
    totalRecords: mistakes.length + vocabulary.length,
    repeatedGrammarTags: Array.from(grammarMap.values()).sort((a, b) => b.count - a.count).slice(0, 5),
    repeatedErrorTypes: Array.from(errorMap.values()).sort((a, b) => b.count - a.count).slice(0, 5),
    repeatedTopics: Array.from(topicMap.values()).sort((a, b) => b.count - a.count).slice(0, 5),
    vocabularyThemes: Array.from(themeMap.values())
      .sort((a, b) => b.relatedItemIds.length - a.relatedItemIds.length)
      .slice(0, 5),
    representativeMistakes,
    representativeVocabulary
  } satisfies ProcessedInsightsPayload;
}

function buildMockAutomaticInsights(
  processed: ProcessedInsightsPayload,
  locale: Locale
): AutomaticInsightSummary {
  const topGrammar = processed.repeatedGrammarTags.slice(0, 3).map((item) => ({
    title: item.title,
    count: item.count,
    summary:
      item.examples[0] ||
      (locale === "zh" ? "这个语法点在最近记录里多次出现。" : "This grammar point showed up repeatedly."),
    relatedItemIds: item.relatedItemIds
  }));

  const repeatedMistakePatterns = processed.repeatedErrorTypes.slice(0, 3).map((item) => ({
    title: item.title,
    count: item.count,
    summary:
      locale === "zh"
        ? `最近这类问题出现了 ${item.count} 次，值得优先回看。`
        : `This pattern appeared ${item.count} times recently and is worth reviewing first.`,
    relatedItemIds: item.relatedItemIds
  }));

  return {
    keyGrammarPoints: topGrammar,
    repeatedMistakePatterns
  };
}

function buildMockCustomSummary(params: {
  locale: Locale;
  processed: ProcessedInsightsPayload;
  question: string;
}): CustomInsightResponse {
  const topPattern = params.processed.repeatedErrorTypes[0];
  const topGrammar = params.processed.repeatedGrammarTags[0];

  return {
    directAnswer:
      params.locale === "zh"
        ? topPattern
          ? `这段时间你最常重复的是「${topPattern.title}」，其次是「${topGrammar?.title || "基础语法结构"}」。`
          : "当前时间段的数据还比较少，我先总结了已经出现过的重点。"
        : topPattern
          ? `Your most repeated recent issue is "${topPattern.title}", followed by "${topGrammar?.title || "core grammar structure"}".`
          : "There is limited data in this range, so I focused on the strongest available signals.",
    keyFindings: [
      ...(topPattern ? [params.locale === "zh" ? `重复最多的模式：${topPattern.title}` : `Most repeated pattern: ${topPattern.title}`] : []),
      ...(topGrammar ? [params.locale === "zh" ? `高频语法点：${topGrammar.title}` : `Most visible grammar point: ${topGrammar.title}`] : []),
      ...(params.processed.vocabularyThemes[0]
        ? [
            params.locale === "zh"
              ? `新词主题偏向：${params.processed.vocabularyThemes[0].theme}`
              : `Recent vocabulary theme: ${params.processed.vocabularyThemes[0].theme}`
          ]
        : [])
    ],
    supportingExamples: [
      ...params.processed.representativeMistakes.slice(0, 2).map((item) => item.title),
      ...params.processed.representativeVocabulary.slice(0, 1).map((item) => item.title)
    ],
    suggestedNextSteps:
      params.locale === "zh"
        ? [
            "先复习重复出现次数最高的语法点。",
            "把代表性例句再手动改写一遍。",
            "把新词按主题一起复习，而不是分散记忆。"
          ]
        : [
            "Review the most repeated grammar pattern first.",
            "Rewrite the representative examples in your own words.",
            "Review new words by theme instead of one by one."
          ]
  };
}

async function generateAutomaticInsightsWithAI(params: {
  locale: Locale;
  processed: ProcessedInsightsPayload;
}) {
  const client = getClient();
  if (!client) {
    return buildMockAutomaticInsights(params.processed, params.locale);
  }

  const defaultModel = process.env.OPENAI_MODEL_DEFAULT || "gpt-4.1-mini";
  const prompt = `You are an AI language learning coach.

The user has local learning records from ${params.processed.rangeLabel}.
You must analyze ONLY the provided processed data.
Do not invent patterns not supported by the data.
Be concise, practical, supportive, and actionable.
If the data is limited, say so clearly.

Return JSON with exactly these keys:
keyGrammarPoints, repeatedMistakePatterns.

Processed data:
${JSON.stringify(params.processed, null, 2)}`;

  const completion = await client.chat.completions.create({
    model: defaultModel,
    max_completion_tokens: 1600,
    response_format: { type: "json_object" },
    messages: [
      { role: "developer", content: prompt },
      { role: "user", content: "Generate the learning insights summary." }
    ]
  });

  const content = completion.choices[0]?.message?.content?.trim() || "";
  if (!content) {
    return buildMockAutomaticInsights(params.processed, params.locale);
  }
  try {
    const parsed = automaticSummarySchema.safeParse(JSON.parse(content));
    return parsed.success ? parsed.data : buildMockAutomaticInsights(params.processed, params.locale);
  } catch {
    return buildMockAutomaticInsights(params.processed, params.locale);
  }
}

async function generateCustomInsightsWithAI(params: {
  locale: Locale;
  processed: ProcessedInsightsPayload;
  question: string;
}) {
  const client = getClient();
  if (!client) {
    return buildMockCustomSummary(params);
  }

  const defaultModel = process.env.OPENAI_MODEL_DEFAULT || "gpt-4.1-mini";
  const prompt = `You are an AI language learning coach.

Answer the user's custom summary question using ONLY the provided processed learning records.
Focus only on ${params.processed.rangeLabel}.
Be concise, supportive, and actionable.
Do not invent patterns that are not supported by the data.

Return JSON with exactly these keys:
directAnswer, keyFindings, supportingExamples, suggestedNextSteps.

Processed data:
${JSON.stringify(params.processed, null, 2)}`;

  const completion = await client.chat.completions.create({
    model: defaultModel,
    max_completion_tokens: 1200,
    response_format: { type: "json_object" },
    messages: [
      { role: "developer", content: prompt },
      { role: "user", content: params.question }
    ]
  });

  const content = completion.choices[0]?.message?.content?.trim() || "";
  if (!content) {
    return buildMockCustomSummary(params);
  }
  try {
    const parsed = customSummarySchema.safeParse(JSON.parse(content));
    return parsed.success ? parsed.data : buildMockCustomSummary(params);
  } catch {
    return buildMockCustomSummary(params);
  }
}

export async function buildInsightsResponse(params: {
  locale: Locale;
  range: InsightsRangeKey;
  from?: string;
  to?: string;
  language?: string;
  customQuestion?: string;
}) {
  const processed = await buildProcessedInsights(params);
  const automaticSummary = await generateAutomaticInsightsWithAI({
    locale: params.locale,
    processed
  });

  const customSummary =
    params.customQuestion?.trim()
      ? await generateCustomInsightsWithAI({
          locale: params.locale,
          processed,
          question: params.customQuestion.trim()
        })
      : null;

  return {
    processed,
    automaticSummary,
    customSummary,
    evidence: {
      mistakes: processed.representativeMistakes.map((item) => ({
        id: item.id,
        title: item.title
      })),
      vocabulary: processed.representativeVocabulary.map((item) => ({
        id: item.id,
        title: item.title
      }))
    }
  };
}
