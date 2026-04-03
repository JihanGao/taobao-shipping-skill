import OpenAI from "openai";
import { z } from "zod";

import { ChatMessage, Locale, TutorQualityMode, TutorResult } from "@/lib/types";

const tutorSchema = z.object({
  assistantReply: z.string().optional(),
  title: z.string().optional(),
  suggestedTerm: z.string().optional(),
  suggestedReading: z.string().optional(),
  suggestedPartOfSpeech: z.enum(["noun", "verb", "adjective", "adverb", "other"]).optional(),
  isSimpleWord: z.boolean().optional(),
  summaryZh: z.string().optional(),
  summaryEn: z.string().optional(),
  vocabPack: z
    .object({
      type: z.literal("vocab_pack"),
      title: z.string().min(1),
      items: z
        .array(
          z.object({
            word: z.string().min(1),
            reading: z.string().optional(),
            meaning: z.string().min(1)
          })
        )
        .min(1)
        .max(40)
    })
    .nullable()
    .optional(),
  answerMode: z.enum(["word_explain", "grammar_point", "correction", "screenshot_explain"]).optional(),
  errorType: z.string().nullable().optional(),
  detectedLanguage: z.enum(["English", "Japanese", "Spanish"]).optional(),
  teachingTemplate: z
    .object({
      encouragement: z.string().optional(),
      wrongForm: z.string().optional(),
      wrongReason: z.string().optional(),
      correctForm: z.string().optional(),
      translation: z.string().optional(),
      grammarTitle: z.string().optional(),
      grammarPoints: z.array(z.string()).min(1).max(4).optional(),
      cantSayForm: z.string().optional(),
      cantSayReason: z.string().optional(),
      formulaTitle: z.string().optional(),
      formula: z.string().optional(),
      recapRows: z
        .array(
          z.union([
            z.object({
              label: z.string(),
              meaning: z.string(),
              example: z.string()
            }),
            z.string()
          ])
        )
        .min(1)
        .max(4)
        .optional(),
      stageComment: z.string().optional(),
      followUpOffer: z.string().optional()
    })
    .nullable()
    .optional()
});

function normalizeRecapRow(row: string | { label: string; meaning: string; example: string }) {
  if (typeof row !== "string") {
    return row;
  }

  const parts = row.split(/[:：\-]/).map((part) => part.trim()).filter(Boolean);

  return {
    label: parts[0] || row,
    meaning: parts[1] || "",
    example: parts.slice(2).join(" / ") || row
  };
}

function renderTeachingTemplate(template: NonNullable<z.infer<typeof tutorSchema>["teachingTemplate"]>) {
  const grammarPoints = (template.grammarPoints || []).map((point) => `- ${point}`).join("\n");
  const recapRows = (template.recapRows || [])
    .map(normalizeRecapRow)
    .map((row) => `| ${row.label} | ${row.meaning} | ${row.example} |`)
    .join("\n");

  return `${template.encouragement}

---

## ❌ 你写的是：
**${template.wrongForm}**

问题：
👉 ${template.wrongReason}

---

## ✅ 正确句子：
**${template.correctForm}**

👉 ${template.translation}

---

## 🔥 重点语法
**${template.grammarTitle}**

${grammarPoints}

---

## ⚠️ 为什么不能说：
**${template.cantSayForm}**

因为：
${template.cantSayReason}

---

## 🧠 ${template.formulaTitle}
**${template.formula}**

| 结构 | 意思 | 例子 |
| --- | --- | --- |
${recapRows}

---

${template.stageComment}

${template.followUpOffer}`;
}

function hasCompleteTeachingTemplate(template?: z.infer<typeof tutorSchema>["teachingTemplate"] | null) {
  return Boolean(
    template?.encouragement &&
      template?.wrongForm &&
      template?.wrongReason &&
      template?.correctForm &&
      template?.translation &&
      template?.grammarTitle &&
      template?.grammarPoints?.length &&
      template?.cantSayForm &&
      template?.cantSayReason &&
      template?.formulaTitle &&
      template?.formula &&
      template?.recapRows?.length &&
      template?.stageComment &&
      template?.followUpOffer
  );
}

function looksLikeSpanishCorrectionQuestion(params: {
  language: string;
  locale: Locale;
  messages: ChatMessage[];
  screenshotDataUrls?: string[];
}) {
  if (params.language !== "Spanish" || params.locale !== "zh") {
    return false;
  }

  const latestUserMessage =
    [...params.messages].reverse().find((message) => message.role === "user")?.content.toLowerCase() || "";

  return (
    latestUserMessage.includes("为什么") ||
    latestUserMessage.includes("为啥") ||
    latestUserMessage.includes("不能说") ||
    latestUserMessage.includes("为什么这个题") ||
    latestUserMessage.includes("而不是") ||
    latestUserMessage.includes("不对") ||
    latestUserMessage.includes("错") ||
    latestUserMessage.includes("为什么不用")
  );
}

function inferAnswerMode(params: {
  language: string;
  locale: Locale;
  messages: ChatMessage[];
  screenshotDataUrls?: string[];
}) {
  const latestUserMessage =
    [...params.messages].reverse().find((message) => message.role === "user")?.content.toLowerCase() || "";

  const correctionSignals = [
    "为什么",
    "为啥",
    "不能说",
    "为什么这个题",
    "而不是",
    "不对",
    "错",
    "为什么不用",
    "why is this wrong",
    "why not",
    "instead of"
  ];

  const wordSignals = [
    "什么意思",
    "是什么意",
    "meaning",
    "what does",
    "what is",
    "怎么读",
    "怎么念",
    "怎么翻译"
  ];

  const screenshotSignals = [
    "截图",
    "screenshot",
    "duolingo ai explanation",
    "解释这张图",
    "解释这张截图"
  ];

  if (correctionSignals.some((signal) => latestUserMessage.includes(signal))) {
    return "correction" as const;
  }

  if (
    wordSignals.some((signal) => latestUserMessage.includes(signal)) ||
    params.messages.filter((message) => message.role === "user").length === 1 &&
      latestUserMessage.trim().split(/\s+/).length <= 3 &&
      !params.screenshotDataUrls?.length
  ) {
    return "word_explain" as const;
  }

  if (params.screenshotDataUrls?.length || screenshotSignals.some((signal) => latestUserMessage.includes(signal))) {
    return "screenshot_explain" as const;
  }

  return "grammar_point" as const;
}

function shouldUseTeachingTemplate(
  params: {
    language: string;
    locale: Locale;
    messages: ChatMessage[];
    screenshotDataUrls?: string[];
  },
  parsed: z.infer<typeof tutorSchema>
) {
  if (!hasCompleteTeachingTemplate(parsed.teachingTemplate)) {
    return false;
  }

  const answerMode = parsed.answerMode || inferAnswerMode(params);
  if (answerMode !== "correction") {
    return false;
  }

  const wrongForm = parsed.teachingTemplate!.wrongForm!.trim();

  if (
    wrongForm === "无" ||
    wrongForm.includes("没有错误") ||
    wrongForm.includes("句子没有错") ||
    wrongForm.includes("截图句子没有错误")
  ) {
    return false;
  }

  return looksLikeSpanishCorrectionQuestion(params) || answerMode === "correction";
}

function normalizeTutorPayload(
  raw: unknown,
  params: {
    language: string;
    locale: Locale;
    messages: ChatMessage[];
    screenshotDataUrls?: string[];
  }
) {
  const parsed = tutorSchema.safeParse(raw);
  const data = parsed.success ? parsed.data : ((raw || {}) as Partial<z.infer<typeof tutorSchema>>);
  const firstUserMessage = params.messages.find((message) => message.role === "user")?.content?.trim() || "";
  const fallbackTitle = firstUserMessage || (params.locale === "zh" ? "语法问题" : "Grammar question");
  const fallbackTerm = firstUserMessage.split(/\s+/)[0] || fallbackTitle;

  return {
    assistantReply:
      typeof data.assistantReply === "string" && data.assistantReply.trim()
        ? data.assistantReply.trim()
        : params.locale === "zh"
          ? "我读到了你的问题，但这次结构化结果不完整。请再试一次。"
          : "I read your question, but this structured response was incomplete. Please try again.",
    title: typeof data.title === "string" && data.title.trim() ? data.title.trim() : fallbackTitle,
    suggestedTerm:
      typeof data.suggestedTerm === "string" && data.suggestedTerm.trim()
        ? data.suggestedTerm.trim()
        : fallbackTerm,
    suggestedReading:
      typeof data.suggestedReading === "string" && data.suggestedReading.trim()
        ? data.suggestedReading.trim()
        : "",
    suggestedPartOfSpeech: ["noun", "verb", "adjective", "adverb", "other"].includes(
      data.suggestedPartOfSpeech as string
    )
      ? (data.suggestedPartOfSpeech as "noun" | "verb" | "adjective" | "adverb" | "other")
      : undefined,
    isSimpleWord: typeof data.isSimpleWord === "boolean" ? data.isSimpleWord : inferAnswerMode(params) === "word_explain",
    summaryZh: typeof data.summaryZh === "string" ? data.summaryZh.trim() : "",
    summaryEn: typeof data.summaryEn === "string" ? data.summaryEn.trim() : "",
    vocabPack: data.vocabPack ?? null,
    answerMode: data.answerMode,
    errorType: typeof data.errorType === "string" ? data.errorType : "grammar help",
    detectedLanguage: data.detectedLanguage,
    teachingTemplate: data.teachingTemplate
  };
}

/** Remove stray JSON code blocks from markdown (model sometimes includes structured data) */
function stripJsonCodeBlocksFromMarkdown(content: string): string {
  if (!content?.trim()) return content;
  const stripped = content.replace(/```json\s*[\s\S]*?```/gi, "").replace(/\n{3,}/g, "\n\n").trim();
  if (stripped.length < 50) return content;
  return stripped;
}

function extractJsonCandidate(content: string) {
  const fenced = content.match(/```json\s*([\s\S]*?)```/i)?.[1];
  if (fenced) {
    return fenced.trim();
  }

  const firstBrace = content.indexOf("{");
  const lastBrace = content.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return content.slice(firstBrace, lastBrace + 1);
  }

  return null;
}

function buildLooseOpenAIResult(
  content: string,
  params: {
    language: string;
    locale: Locale;
    messages: ChatMessage[];
    screenshotDataUrls?: string[];
  }
) {
  const firstUserMessage = params.messages.find((message) => message.role === "user")?.content?.trim() || "";
  const inferredMode = inferAnswerMode(params);
  const jpToken = firstUserMessage.match(/[\u3040-\u30ff\u4e00-\u9fafー]{2,30}/)?.[0]?.trim();
  const fallbackTitle = jpToken || firstUserMessage || (params.locale === "zh" ? "语法问题" : "Grammar question");

  return {
    assistantReply: stripJsonCodeBlocksFromMarkdown(content.trim()),
    title: fallbackTitle,
    suggestedTerm: jpToken || firstUserMessage.split(/\s+/)[0] || fallbackTitle,
    suggestedReading: "",
    suggestedPartOfSpeech: undefined,
    isSimpleWord: inferredMode === "word_explain",
    summaryZh: "",
    summaryEn: "",
    errorType: "grammar help",
    detectedLanguage: undefined as "English" | "Japanese" | "Spanish" | undefined,
    provider: "openai" as const
  };
}

/** Reasoning models count internal reasoning toward max_completion_tokens; a small cap often yields empty assistant text. */
function modelLikelyUsesReasoningBudget(model: string): boolean {
  return /\b(gpt-5|o3|o1)\b/i.test(model);
}

async function requestTutorCompletion(
  openai: OpenAI,
  options: {
    model: string;
    reasoningEffort?: "low" | "medium" | "high";
    maxTokens: number;
    messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[];
  }
) {
  return openai.chat.completions.create({
    model: options.model,
    ...(options.reasoningEffort ? { reasoning_effort: options.reasoningEffort } : {}),
    max_completion_tokens: options.maxTokens,
    response_format: { type: "json_object" },
    messages: options.messages
  });
}

let client: OpenAI | null = null;

function getClient() {
  if (!process.env.OPENAI_API_KEY) {
    return null;
  }

  client ??= new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return client;
}

function buildMockTutorResult(params: {
  language: string;
  locale: Locale;
  messages: ChatMessage[];
  mode?: "missing_key" | "api_error";
}): TutorResult {
  const latestUserMessage =
    [...params.messages].reverse().find((message) => message.role === "user")?.content || "";
  const lower = latestUserMessage.toLowerCase();

  if (params.locale === "zh" && params.language === "Spanish" && lower.includes("dejamos")) {
    return {
      title: "Dejamos",
      suggestedTerm: "Dejamos",
      suggestedReading: "",
      suggestedPartOfSpeech: "verb",
      isSimpleWord: true,
      errorType: "word meaning",
      provider: "mock",
      assistantReply: `“Dejamos” 来自动词 “dejar”。

常见中文意思有：
- 留下
- 离开
- 让
- 停止

它常见的理解要看上下文，因为 “dejamos” 既可能是现在时，也可能是简单过去时：
- 现在时：nosotros dejamos = 我们留下 / 我们让
- 简单过去时：nosotros dejamos = 我们留下了 / 我们离开了

你可以先这样记变位：
- yo dejo
- tu dejas
- el/ella deja
- nosotros dejamos

常见造句：
- Dejamos las llaves en casa. = 我们把钥匙留在家里。
- Dejamos de hablar. = 我们停止说话了。
- Dejamos a los niños con su abuela. = 我们把孩子留给奶奶照顾。

如果你愿意，我还可以继续帮你区分 dejar / salir / irse 这几个在 Duolingo 里最容易混的词。`
    };
  }

  if (params.locale === "zh" && params.language === "Japanese" && /^ぴったり(\s|$|是什么意思|的意思|\?|？)/.test(latestUserMessage.trim())) {
    return {
      title: "ぴったり",
      suggestedTerm: "ぴったり",
      suggestedReading: "ぴったり",
      suggestedPartOfSpeech: "adverb",
      isSimpleWord: true,
      errorType: "word meaning",
      provider: "mock",
      assistantReply: `「ぴったり」是一个**副词**，表示刚好合适、正好、匹配。

来源与形式：
- 拟声拟态词，通常用作副词，也可作形容动词（ぴったりだ）
- 修饰动词或与だ连接

常见用法与示例：
- **サイズがぴったり合う**（尺寸正合适）
- **時間にぴったり到着した**（准时到达）
- **彼の説明はぴったりだった**（他的解释很到位）`
    };
  }

  if (params.locale === "zh" && params.language === "Japanese" && /^ようし(\s|$|是什么意思|的意思|\?|？)/.test(latestUserMessage.trim())) {
    return {
      title: "ようし",
      suggestedTerm: "用紙",
      suggestedReading: "ようし",
      suggestedPartOfSpeech: "noun",
      isSimpleWord: true,
      errorType: "word meaning",
      provider: "mock",
      assistantReply: `「ようし」可能有多种写法，最常见的是 **用紙（ようし）**，意思是 **用纸、表格、填写用的纸张** 📄。

来源与形式：
- 用（よう）+ 紙（し）→ 用紙
- 名词，常用于填表、申请、办公等场景

常见用法与示例：
- **申請用紙を記入する**（填写申请表）
- **この用紙に名前を書いてください**（请在这张表格上写名字）

另外，ようし 也可能是 **要旨（ようし）**，意为要点、主旨，多用于正式文书。日常填表、办公场景优先考虑 用紙。`
    };
  }

  if (params.locale === "zh" && params.language === "Japanese" && /こぎって|こぎて/.test(latestUserMessage)) {
    return {
      title: "こぎって",
      suggestedTerm: "小切手",
      suggestedReading: "こぎって",
      suggestedPartOfSpeech: "noun",
      isSimpleWord: true,
      errorType: "word meaning",
      provider: "mock",
      assistantReply: `「こぎって」最常见的写法是 **小切手（こぎって）**，意思是 **支票**（check / cheque）🧾。

来源与形式：
- 小（こ）+ 切手（きって）→ 小切手
- 名词，常用于银行、付款等场景

常见用法与示例：
- **銀行で小切手を振り出す**（在银行签发支票）
- **小切手で支払う**（用支票支付）

另外，こぎって 也可能是动词 **漕ぐ（こぐ）** 的て形 **漕ぎて**，意为划船、蹬车。如果用户没有提供句子，优先考虑名词 小切手。`
    };
  }

  if (params.locale === "zh" && params.language === "Japanese" && latestUserMessage.includes("しらへ")) {
    return {
      title: "しらへ",
      suggestedTerm: "調べる",
      suggestedReading: "しらべる",
      suggestedPartOfSpeech: "verb",
      isSimpleWord: true,
      errorType: "spelling",
      provider: "mock",
      assistantReply: `你写的 “しらへ” 多半是想说 “しらべ”，把「べ」写成了「へ」很常见。

对应常见词有：

1. 調べ（しらべ）
名词：调查 / 查询 / 检查 / 研究 / 结果

例：
- 詳しい調べ = 详细调查
- 警察の調べ = 警方调查 / 审讯

2. 調べる（しらべる）
动词：调查、查一下、检索

例：
- 意味を調べる = 查意思
- 原因を調べる = 调查原因

如果你是想表达“我查一下 / 帮你查”，最自然的是：
- 調べるね。
- 調べてみる。

如果你确认你想写的就是 “しらへ” 而不是 “しらべ”，把原句发我，我可以按上下文继续帮你判断。`
    };
  }

  return {
    title: latestUserMessage.slice(0, 40) || "Grammar question",
    suggestedTerm: latestUserMessage.split(/\s+/)[0] || latestUserMessage.slice(0, 20) || "term",
    suggestedReading: "",
    suggestedPartOfSpeech: undefined,
    isSimpleWord: latestUserMessage.trim().split(/\s+/).length <= 3,
    errorType: "configuration",
    provider: "mock",
    assistantReply:
      params.locale === "zh"
        ? params.mode === "missing_key"
          ? `当前这条回答不是实时 ChatGPT 结果，因为本地还没有配置 \`OPENAI_API_KEY\`。

所以我现在不能可靠地像 ChatGPT 一样对 “${latestUserMessage}” 给出准确词义、时态、变位和例句，不然很容易误导你。

请先在项目的 [\`.env\`](/Users/jihangao/Documents/Playground/.env) 里配置：

\`\`\`env
OPENAI_API_KEY="你的 OpenAI key"
OPENAI_MODEL_DEFAULT="gpt-5-mini"
OPENAI_MODEL_HIGH_QUALITY="gpt-5.4"
\`\`\`

然后重启：

\`\`\`bash
npm run dev
\`\`\`

配置好以后，这里就会返回真正的 OpenAI 实时讲解，而不是当前的 mock fallback。`
          : `这次已经不是“没配 API key”的问题了，而是 OpenAI 返回结果的格式没有完全匹配本地解析器，所以系统临时退回了 fallback。

也就是说：你的 API key 已经被读到了，但这次响应在结构化解析时失败了。

我已经在本地继续兼容这种返回格式。刷新后再试一次，通常就会恢复成真正的 OpenAI 讲解。`
        : params.mode === "missing_key"
          ? `This is not a real ChatGPT-style explanation yet because \`OPENAI_API_KEY\` is not configured locally.

I don't want to fake a confident explanation for "${latestUserMessage}" without the OpenAI call, because that would be unreliable.

Please add this to [\`.env\`](/Users/jihangao/Documents/Playground/.env):

\`\`\`env
OPENAI_API_KEY="your OpenAI key"
OPENAI_MODEL_DEFAULT="gpt-5-mini"
OPENAI_MODEL_HIGH_QUALITY="gpt-5.4"
\`\`\`

Then restart:

\`\`\`bash
npm run dev
\`\`\`

After that, this panel will return a real OpenAI explanation instead of the fallback response.`
          : `This is not a missing API key issue. OpenAI did return a response, but the local structured parser could not fully validate that payload, so the app temporarily fell back to a mock explanation.

Your API key is being read. This fallback happened because the response format did not fully match the local schema.`
  };
}

export async function runTutorConversation(params: {
  language: string;
  locale: Locale;
  qualityMode: TutorQualityMode;
  messages: ChatMessage[];
  screenshotDataUrls?: string[];
}): Promise<TutorResult> {
  const openai = getClient();

  if (!openai) {
    return buildMockTutorResult({ ...params, mode: "missing_key" });
  }

  try {
    const chatMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      {
        role: "developer",
        content: `You are LinguaFlow, a warm language-learning tutor.
Return JSON only with keys assistantReply, title, suggestedTerm, suggestedReading, suggestedPartOfSpeech, isSimpleWord, summaryZh, summaryEn, vocabPack, answerMode, errorType, detectedLanguage, teachingTemplate.
assistantReply must contain ONLY the user-facing markdown explanation. Do NOT include JSON, code blocks with structured data, or meta information in assistantReply.
ONLY when the learner EXPLICITLY asks for a list (e.g. "帮我列出...", "list the...", "give me all months", "一覧", etc.), return a structured vocabPack. Do NOT return vocabPack for: single-word explanation, grammar breakdown, conjugation explanation, or when the answer incidentally contains multiple forms. If the user asked "xxx 是什么意思" or "what does xxx mean", do NOT include vocabPack.
{
  "type": "vocab_pack",
  "title": "<short topic title>",
  "items": [
    { "word": "<main word (kanji/base form)>", "reading": "<pronunciation if applicable>", "meaning": "<localized meaning>" }
  ]
}
Rules for vocabPack:
- Each item represents ONE semantic word. Do NOT output separate entries for reading/script variants.
- For Japanese: "word" MUST be the Kanji form when it exists (e.g. 領収, 桜). "reading" = hiragana for kanji words (りょうしゅう), or katakana for loanwords (サクラ). If user asked "サクラ", output word: "桜", reading: "サクラ". If user asked "領収", output word: "領収", reading: "りょうしゅう".
- For non-Japanese: "word" = main/base form, "reading" = pronunciation if applicable.
- "meaning" MUST match the learner's UI language: when locale is zh (user interface in Chinese), use Chinese meaning only (e.g., 一, 二, 十月, 十一月, 东, 南); when locale is en, use English meaning (e.g., one, two, October, November, east, south). Do NOT use English when the user asked in Chinese.
- Deduplicate items: merge duplicates by word/meaning and keep the best reading.
answerMode must be one of:
- word_explain
- grammar_point
- correction
- screenshot_explain
detectedLanguage must be the TARGET language being learned/asked about (one of: English, Japanese, Spanish). It is the language of the vocabulary or grammar in the question, NOT the language the user typed in. Example: if the user asks "帮我列出日语月份" in Chinese, detectedLanguage must be "Japanese" (they are learning Japanese), never "Chinese".
CRITICAL when the user attaches screenshot(s): Infer detectedLanguage from the LANGUAGE DISPLAYED IN THE IMAGE (the sentence, exercise, vocabulary, or Duolingo card shown). Ignore the user's question language (e.g. Chinese "为什么用su")—the target language is what appears IN THE SCREENSHOT. Do NOT introduce comparisons to other languages unless the screenshot or question clearly involves them.
CRITICAL for conjugated verb forms (supiste, pude, eran, almorcé, etc.) in English/Spanish: always include a subject-conjugation paradigm table (yo, tú, él/ella/usted, nosotros, ellos/ellas/ustedes) in the relevant tense. Learners need the full paradigm, not just one form—prioritize this over verb-vs-verb contrast tables.
Reply in ${params.locale === "zh" ? "Simplified Chinese" : "English"}.
summaryZh must be one short natural Chinese explanation for the saved title/term, with no emoji, no labels, no markdown.
summaryEn must be one short natural English explanation for the saved title/term, with no emoji, no labels, no markdown.
Your answer should feel close to a strong ChatGPT teaching answer: encouraging, lively, step-by-step, and confidence-building.
Use markdown hierarchy intentionally: one main heading-sized question or takeaway, then smaller bold subsections, bullets, and compact tables.
Use emphasis with a mix of:
- larger markdown headings like ## or ### for the main confusion
- bold keyword lines like **✅ reunirse（反身动词）**
- occasional emojis like 🔥 ✅ 💡 👉 🧠 🎯 only when they help the learner scan
If the learner asks about a single word or small spelling issue, include meaning, likely source verb, possible tense/forms, and useful examples.
If the learner asks about grammar, explain the rule clearly with examples and comparisons.
For Chinese replies, write like a skilled Chinese-speaking language tutor: direct, concrete, well-structured, and generous with examples.
When useful, format the explanation with short sections, divider lines, numbered points, and example sentences.
Use a lively but clear tutoring style similar to a strong ChatGPT teaching answer. It is okay to use a few emojis like 🔥 ✅ 💡 👉 to guide the explanation.
Do not sound dry or textbook-heavy. Make the explanation feel like a smart tutor walking the learner through the exact confusion.
If the learner asks about a Spanish word form, explain likely meanings, source verb, possible tense/person interpretations, conjugation reasoning, and common sentence patterns.
If the learner asks whether two structures are both valid, answer that question first, then explain why.
If an image is attached, explicitly explain both the screenshot content and the learner's typed question together.
If multiple images are attached, explicitly structure the answer around all of them together.
For Chinese screenshot explanations with 2 images, use a natural opening such as:
- 很好，这两张图我们一起讲清楚 👇
Then walk through them in order with natural section labels such as:
- ✅ 第一张：...
- ✅ 第二张：...
- 🔥 你今天学到的重点
Avoid awkward or stiff headings like:
- 今天我们来讲两大重点
- 小小总结
- 关键点解释
The tone should feel natural, teacher-like, and closer to a strong ChatGPT answer.
For Chinese explanations of correction-style grammar questions, you MUST fill the teachingTemplate object with the exact fields below unless the learner is clearly asking only for a single-word meaning:

teachingTemplate fields:
- encouragement
- wrongForm
- wrongReason
- correctForm
- translation
- grammarTitle
- grammarPoints (2-4 short bullet-ready strings)
- cantSayForm
- cantSayReason
- formulaTitle
- formula
- recapRows (1-4 rows with label / meaning / example)
- stageComment
- followUpOffer

Important:
- For correction-style grammar questions, assistantReply can be brief because the app will render from teachingTemplate.
- If the screenshot shows a wrong answer, infer the wrong answer and the correct answer and fill the template above.
- stageComment should sound like "你现在开始进入现在进行时阶段了 👏"
- followUpOffer should sound like "要不要我给你做一个「现在进行时一页总结」？这个以后会超级常用。"
Prefer this structure for Chinese grammar explanations when relevant:
1. one-line encouragement
2. short direct answer
3. original sentence with translation
4. key point 1
5. key point 2
6. if helpful, a clean table for conjugation / contrast
7. mini summary or tip
8. end with one proactive follow-up offer such as asking whether the learner wants a comparison table, quick summary sheet, or more examples
Write assistantReply in markdown, not plain text.
When you include a table, output a real markdown table with 2-4 columns max, short cells, and a short heading above it such as "## 小总结" or "## 变位对比".
Keep table cells short and aligned around one idea per column.
For English and Spanish grammar explanations (conjugation, tense, structure, register, etc.): when the content naturally fits a table—e.g. conjugation paradigm, A vs B contrast, when-to-use comparison—include a compact markdown table in assistantReply. Don't reserve tables for correction-style only; use them generically when they add value (verb paradigm, tense contrast, structure comparison).
First classify the learner's intent:
- word_explain: asking what a word or short phrase means / how it is used
- grammar_point: asking to explain a grammar rule or structure
- correction: asking why one form is wrong and another is right
- screenshot_explain: asking to explain the language point shown in a screenshot without necessarily correcting a learner mistake

For word_explain questions, do NOT open with generic praise like "问得非常好 👏" unless it is truly a confusing grammar contrast.
For simple word/meaning questions, start directly and naturally, for example:
"你应该是想问「もよろしい」是什么意思。"
Then organize the reply like this:
- one short answer line
- a "来源与形式" subsection with bullet points
- a "常见用法与示例" subsection with bullet points
- an optional "口语对比" or "小总结" subsection with bullet points
Avoid long prose under these subsections. Prefer bullets for readability.
For JAPANESE word_explain specifically:
- If the user asks about a KANJI word (e.g. 領収): always provide the hiragana reading in parentheses in your reply, e.g. 領収（りょうしゅう）, 領収書（りょうしゅうしょ）. Set suggestedTerm = the kanji form, suggestedReading = the hiragana reading.
- If the user asks about HIRAGANA (e.g. りょうしゅう): provide the corresponding kanji in your reply (領収), and set suggestedTerm = the kanji form, suggestedReading = the hiragana.
- If the user asks about KATAKANA (e.g. サクラ): if there is a kanji (桜), provide it in your reply and set suggestedTerm = 桜, suggestedReading = サクラ. For loanwords with no kanji, suggestedTerm = the katakana, suggestedReading = empty.
- Vocabulary book will display as 漢字(reading), so always return both for consistency.
- HOMOPHONE DISAMBIGUATION (critical for hiragana-only questions): Japanese has many homophones. When the user asks about a hiragana-only word with NO sentence context:
  1. Consider ALL plausible kanji interpretations.
  2. Prioritize by learner usefulness: (1) everyday/practical nouns 日常生活名词 (用紙、小切手、領収書) > (2) verb forms 动词活用 (漕ぎて) > (3) formal/academic 正式/学术词 (要旨).
  3. Response structure: open with "「xxx」可能有多种写法：" then list interpretations, lead with the most useful one, expand it with 来源与形式 + 常见用法与示例, then briefly mention others.
  4. Known pairs: こぎって → 小切手(支票) preferred over 漕ぎて(划船); ようし → 用紙(用纸/表格) preferred over 要旨(要点). Set suggestedTerm/suggestedReading to the prioritized kanji form.
- PART OF SPEECH (required for word_explain): Always set suggestedPartOfSpeech to the exact grammatical category of the word. Use one of: noun | verb | adjective | adverb | other. Distinguish: 副词(adverb) vs 形容动词(adjectival noun → adjective). E.g. ぴったり is adverb, きれい is adjective. If the word can be both (e.g. ぴったり as adverb or な-adjective), prefer the primary use.
For grammar_point questions, do not force a correction format. Use a cleaner lesson-note structure:
- one short direct answer
- 2 to 4 compact teaching subsections
- bullets under each subsection
- one tiny recap or memory tip at the end
For screenshot_explain questions, first decide whether the learner needs:
- translation first, then grammar
- or grammar rule first, then expansion
Default rule:
- if the screenshot looks like a full sentence, Duolingo exercise, dialogue bubble, or sentence-response card, start with a clean translation and one-line overall meaning first, then explain grammar
- if the screenshot already looks like a grammar note or explanation card, summarize the rule first, then expand it with examples
Do not invent a wrong learner sentence unless the screenshot clearly shows an error.
For Chinese screenshot_explain replies:
- prefer one natural opening sentence
- if the screenshot is a full sentence, Duolingo prompt, or dialogue card, first explain the sentence meaning in simple Chinese, then explain the grammar
- if the screenshot contains both a sentence and a prompt bubble, first give one concise translation of the sentence before naming the grammar points
- if the screenshot is already a grammar explanation card, first summarize the rule the card is teaching, then expand it with extra examples
- then explain each screenshot one by one in order
- under each screenshot, use short subsections like 句子 / 意思 / 是什么 / 为什么 / 变位
- under each screenshot, give at least 2 short bullet examples or related forms when useful
- if the screenshot contains a conjugated verb, include a full subject-conjugation paradigm table (yo, tú, él/ella, nosotros, ellos) for that verb in the relevant tense—e.g. for supiste show supe/supiste/supo/supimos/supieron
- when giving examples or related forms, prefer tables or bullet lists instead of plain paragraphs
- for verb forms, use a markdown table with columns 主语 | 变位 (or Subject | Form), not just 2–3 bullet lines
- avoid awkward openings like "今天我们来讲两大重点"
- for two screenshots, a natural opening is: "很好，这两张图我们一起讲清楚 👇"
- when helpful, label them like:
  - ✅ 第一张：关于 "almorcé"
  - ✅ 第二张：关于 "te lavaste"
- after each screenshot label, prefer this order when the screenshot contains a sentence:
  1. 句子
  2. 意思
  3. 是什么 / 变位 / 结构
  4. 2+ bullet examples or nearby forms
- under each screenshot, add one extra teaching step beyond the screenshot itself:
  - a mini yo / tú / él paradigm
  - or a me / te / se paradigm
  - or 2 bullet examples that generalize the rule
- end with a short section titled "总结" or "🔥 你今天学到的重点"
- do not use awkward subtitles such as "小小总结"
If the screenshots are grammar explanation cards rather than wrong-answer cards, do NOT force a correction format.
For multi-image grammar explanations, do not stop at paraphrasing the screenshot. Add one layer of teaching expansion:
- one concise explanation of what the form is
- one small paradigm, bullet list, or compact table
- one or two natural example sentences
- then a final takeaway section
For Spanish grammar confusions like reunirse / reunir or nos reunimos / reunimos, explicitly contrast the two meanings side by side and use a compact table when useful.
When a screenshot contains a wrong sentence, infer the likely intended correct sentence and format the answer as correction tutoring rather than a generic explanation.
Bad style example to avoid: one long block with "关键点解释 / 具体分析 / 小总结" but no clear correction sections.
Good style to imitate: explicit correction cards with ❌ / ✅ / 🔥 / ⚠️ / 🧠 and one final encouraging line.
Avoid giant dense paragraphs. Prefer short chunks, bullets, and clear mini-sections.
isSimpleWord rules (CRITICAL):
- isSimpleWord must be FALSE when: fill-in-blank/correction shows WRONG vs CORRECT form of the SAME verb (e.g. espera vs espere, reunir vs reunirse). That is GRAMMAR (conjugation, formal/informal register), not vocabulary.
- isSimpleWord must be FALSE when: the question involves verb conjugation, tense, mood, particle choice, sentence structure, or formal vs informal forms.
- isSimpleWord should be TRUE only when: the learner explicitly asks "what does X mean" or "how do you say X" or spelling/reading of a single word—i.e. word-meaning lookup, not grammar.`
      }
    ];

    if (params.qualityMode === "high" && looksLikeSpanishCorrectionQuestion(params)) {
      chatMessages.push({
        role: "developer",
        content: `This is a high-priority Spanish correction tutoring turn.
Treat it like a premium teaching answer for a Chinese-speaking learner studying Spanish.
Do not give a generic explanation.
You should behave like a Spanish grammar coach correcting one specific learner mistake step by step.

Extra rules for this turn:
- Fill teachingTemplate.
- Make wrongForm and correctForm concrete, not abstract.
- grammarTitle should be short and explicit, e.g. "estar + 现在分词（现在进行时）" or "reunirse（反身动词）".
- grammarPoints should be practical, not academic.
- cantSayReason should explicitly answer "为什么不能这样说".
- recapRows should be genuinely useful and easy to memorize.
- stageComment should feel encouraging and specific to the grammar stage the learner is entering.
- followUpOffer should propose one very useful next artifact, such as "一页总结", "超清晰对比表", or "常见混淆清单".

Imitate the feel of a very clear ChatGPT teaching answer:
1. first correct the learner
2. then explain the key rule
3. then contrast the wrong form vs right form
4. then give a compact memory aid
5. then encourage the learner's progress`
      });
    }

    const latestUserMessageIndex = (() => {
      for (let index = params.messages.length - 1; index >= 0; index -= 1) {
        if (params.messages[index]?.role === "user") {
          return index;
        }
      }

      return -1;
    })();

    for (const [index, message] of params.messages.entries()) {
      if (message.role === "assistant") {
        chatMessages.push({
          role: "assistant",
          content: message.content
        });
        continue;
      }

      const hasScreenshot =
        index === latestUserMessageIndex && params.screenshotDataUrls?.length;
      const rawContent = (message.content || "").trim();
      const userText = hasScreenshot
        ? rawContent
          ? `Infer the target language from the screenshot(s).\n${message.content}`
          : params.locale === "zh"
            ? "Infer the target language from the screenshot(s). 请完整解释截图中的语言点（语法、错误纠正、用法说明）。不要只回复语言识别。"
            : "Infer the target language from the screenshot(s). Explain the language point in full: grammar, wrong vs correct forms if visible, and usage. Do not reply with only language identification."
        : message.content;
      chatMessages.push({
        role: "user",
        content:
          hasScreenshot
            ? [
                { type: "text" as const, text: userText },
                ...params.screenshotDataUrls!.map((url) => ({
                  type: "image_url" as const,
                  image_url: { url }
                }))
              ]
            : message.content
      });
    }

    const defaultModel = process.env.OPENAI_MODEL_DEFAULT || "gpt-4.1-mini";
    const highQualityModel =
      process.env.OPENAI_MODEL_HIGH_QUALITY || process.env.OPENAI_MODEL || "gpt-5.4";
    const model = params.qualityMode === "high" ? highQualityModel : defaultModel;
    const reasoningEffort =
      params.qualityMode === "high"
        ? process.env.OPENAI_REASONING_HIGH_QUALITY || "medium"
        : process.env.OPENAI_REASONING_DEFAULT || "low";

    const usesReasoningBudget = modelLikelyUsesReasoningBudget(model);
    const firstPassMaxTokens = usesReasoningBudget
      ? params.qualityMode === "high"
        ? 3600
        : 3200
      : params.qualityMode === "high"
        ? 900
        : 600;

    let response = await requestTutorCompletion(openai, {
      model,
      ...(usesReasoningBudget ? { reasoningEffort: reasoningEffort as "low" | "medium" | "high" } : {}),
      maxTokens: firstPassMaxTokens,
      messages: chatMessages
    });

    const trimMessageContent = (r: Awaited<ReturnType<typeof requestTutorCompletion>>) =>
      String(r.choices[0]?.message?.content ?? "").trim();

    let resolvedContent = trimMessageContent(response);
    if (!resolvedContent) {
      const finishReason = response.choices[0]?.finish_reason;
      console.error("OpenAI returned no message content", {
        model,
        finishReason,
        choice: response.choices[0]?.message
      });

      const fallbackModel = process.env.OPENAI_MODEL_FALLBACK || "gpt-4.1-mini";
      try {
        const retryResponse = await requestTutorCompletion(openai, {
          model: fallbackModel,
          maxTokens: params.qualityMode === "high" ? 2400 : 2000,
          messages: chatMessages
        });
        const retryText = trimMessageContent(retryResponse);
        if (retryText) {
          console.log("OpenAI retry succeeded with model:", fallbackModel);
          response = retryResponse;
          resolvedContent = retryText;
        } else {
          console.error("OpenAI retry also returned no content", {
            fallbackModel,
            finishReason: retryResponse.choices[0]?.finish_reason,
            choice: retryResponse.choices[0]?.message
          });
          return buildMockTutorResult({ ...params, mode: "api_error" });
        }
      } catch (retryErr) {
        console.error("OpenAI retry failed:", retryErr);
        return buildMockTutorResult({ ...params, mode: "api_error" });
      }
    }

    console.log("OpenAI raw content preview:", resolvedContent.slice(0, 600));

    let parsedSource: unknown;
    try {
      parsedSource = JSON.parse(resolvedContent);
    } catch {
      const candidate = extractJsonCandidate(resolvedContent);
      if (candidate) {
        try {
          parsedSource = JSON.parse(candidate);
        } catch {
          return buildLooseOpenAIResult(resolvedContent, params);
        }
      } else {
        return buildLooseOpenAIResult(resolvedContent, params);
      }
    }

    const parsed = normalizeTutorPayload(parsedSource, params);

    // Override isSimpleWord when errorType indicates grammar (e.g. conjugation, verb form, particle)
    // Exclude "grammar help" - it's a generic fallback, not a strong grammar signal
    const grammarErrorTypes = /verb (conjugation|form|tense|structure)|conjugation|particle|grammar|formal|informal|register|confusion of|object pronoun|possessive/i;
    const isGrammarByErrorType =
      typeof parsed.errorType === "string" &&
      parsed.errorType !== "grammar help" &&
      grammarErrorTypes.test(parsed.errorType);
    let isSimpleWord = isGrammarByErrorType ? false : parsed.isSimpleWord;

    // Single-word question with no grammar/correction signals → treat as word meaning lookup
    if (!isGrammarByErrorType && isSimpleWord === false) {
      const latestUserContent =
        [...params.messages].reverse().find((m) => m.role === "user")?.content?.trim() ?? "";
      const wordCount = latestUserContent.split(/\s+/).filter(Boolean).length;
      const hasCorrectionSignal = [
        "为什么",
        "为啥",
        "不能说",
        "而不是",
        "不对",
        "错",
        "为什么不用",
        "why is this wrong",
        "why not",
        "instead of"
      ].some((s) => latestUserContent.includes(s));
      if (wordCount <= 2 && !hasCorrectionSignal && !params.screenshotDataUrls?.length) {
        isSimpleWord = true;
      }
    }

  const rawReply = shouldUseTeachingTemplate(params, parsed)
    ? renderTeachingTemplate(parsed.teachingTemplate!)
    : parsed.assistantReply;

  return {
    assistantReply: stripJsonCodeBlocksFromMarkdown(rawReply),
    title: parsed.title,
    suggestedTerm: parsed.suggestedTerm,
    suggestedReading: parsed.suggestedReading,
    suggestedPartOfSpeech: parsed.suggestedPartOfSpeech,
    isSimpleWord,
      summaryZh: parsed.summaryZh,
      summaryEn: parsed.summaryEn,
      vocabPack: parsed.vocabPack ?? null,
      errorType: parsed.errorType || "grammar help",
      detectedLanguage: parsed.detectedLanguage,
      provider: "openai"
    };
  } catch (error) {
    console.error("Falling back to mock tutor result:", error);
    return buildMockTutorResult({ ...params, mode: "api_error" });
  }
}
