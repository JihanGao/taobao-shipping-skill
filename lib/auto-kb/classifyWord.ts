import OpenAI from "openai";

import {
  THEME_CATEGORY_LABELS,
  allowedSubcategoriesForTheme,
  isValidPosKey,
  isValidSubCategoryKey,
  isValidThemeCategoryKey,
  SUB_CATEGORY_LABELS
} from "./autoKbTaxonomy";

import type { AutoKbSubCategoryKey, PartOfSpeechKey, ThemeCategoryKey } from "./autoKbTaxonomy";

type ClassifyInput = {
  term: string;
  learnerPrompt: string;
  aiAnswer: string;
  summaryZh?: string;
  summaryEn?: string;
  isSimpleWord: boolean;
  errorType?: string;
  locale: "zh" | "en";
};

export type ClassifiedWord = {
  partOfSpeech: PartOfSpeechKey;
  partOfSpeech_zh: string;
  partOfSpeech_en: string;
  themeCategory: ThemeCategoryKey;
  themeCategory_zh: string;
  themeCategory_en: string;
  subCategory: AutoKbSubCategoryKey;
  subCategory_zh: string;
  subCategory_en: string;
};

const POS_LABELS: Record<PartOfSpeechKey, { zh: string; en: string }> = {
  noun: { zh: "名词", en: "noun" },
  verb: { zh: "动词", en: "verb" },
  adjective: { zh: "形容词", en: "adjective" },
  adverb: { zh: "副词", en: "adverb" },
  other: { zh: "其他", en: "other" }
};

const DEFAULT_RESULT: ClassifiedWord = {
  partOfSpeech: "other",
  partOfSpeech_zh: "其他",
  partOfSpeech_en: "other",
  themeCategory: "misc",
  themeCategory_zh: "其他",
  themeCategory_en: "misc",
  subCategory: "other",
  subCategory_zh: "其他",
  subCategory_en: "other"
};

function normalizeLemma(term: string) {
  const trimmed = (term || "").trim();
  const firstSlash = trimmed.split(/[／/]/)[0]?.trim() || trimmed;
  const firstToken = firstSlash.split(/\s+/)[0]?.trim() || firstSlash;
  return firstToken;
}

function ruleInferPOS(inputText: string, isSimpleWord: boolean): PartOfSpeechKey {
  if (!isSimpleWord) return "other";

  const text = inputText.toLowerCase();
  if (/(名词|noun)/.test(text) || /[机物]名词/.test(text)) return "noun";
  if (/(形容动词|な形容词|na-adjective)/.test(text)) return "adjective";
  if (/(副词|adverb|副詞)/.test(text)) return "adverb";
  if (/(动词|verb)/.test(text) && !/形容动词/.test(text)) return "verb";
  if (/(形容词|adjective)/.test(text)) return "adjective";
  if (/指的是|意为|意思是/.test(text) && !/(动词|verb)/.test(text)) return "noun";
  return "other";
}

function ruleInferThemeCategory(inputText: string): ThemeCategoryKey {
  const text = inputText.toLowerCase();

  // time
  if (
    /(today|tomorrow|yesterday|morning|evening|night|week|month|year|\btime\b|\bdate\b|\bage\b|frequency|often|usually|sometimes)/i.test(
      text
    ) ||
    /今天|明天|昨天|早上|晚上|周|月|年|日期|频率|年龄|时刻/.test(text)
  ) {
    return "time";
  }

  // travel
  if (
    /(travel|trip|hotel|airport|station|train|bus|subway|metro|taxi|plane|flight|direction|north|south|east|west)/i.test(
      text
    ) ||
    /出行|旅行|车站|机场|地铁|公交|火车|飞机|方向|方位|去往/.test(text)
  ) {
    return "travel";
  }

  // emotion
  if (/(love|hate|happy|sad|angry|feel|emotion|relationship|friend)/i.test(text) || /爱|喜欢|难过|生气|情感|关系|情绪/.test(text)) {
    return "emotion";
  }

  // food
  if (/(eat|food|drink|coffee|tea|bread|water|restaurant|dinner|lunch|meal)/i.test(text) || /吃|食物|喝|饮品|餐馆|用餐|午餐|晚餐/.test(text)) {
    return "food";
  }

  // shopping
  if (/(shopping|buy|sell|color|red|blue|green|black|white|clothes|shirt|pants|dress)/i.test(text) || /购物|买|颜色|红色|蓝色|衣服|衬衫|裤子|裙子/.test(text)) {
    return "shopping";
  }

  // nature
  if (/(animal|plant|tree|flower|weather|rain|snow|sun|moon|space|universe)/i.test(text) || /动物|植物|树|花|天气|雨|雪|太阳|月亮|宇宙|自然/.test(text)) {
    return "nature";
  }

  // study
  if (/(school|class|learn|language|homework|study|textbook|notebook|lesson)/i.test(text) || /学校|学习|语言|作业|课本|笔记本/.test(text)) {
    return "study";
  }

  // work
  if (/(job|work|office|company|business|businessman)/i.test(text) || /工作|职业|办公|公司|商务/.test(text)) {
    return "work";
  }

  // society
  if (/(politics|government|religion|law|court|event|festival)/i.test(text) || /政治|宗教|法律|事件|节日/.test(text)) {
    return "society";
  }

  // life
  if (/(family|mother|father|brother|sister|home|house|room|health|body|furniture|sport|hobby)/i.test(text) || /家人|身体|居住|家具|健康|运动|爱好|家/.test(text)) {
    return "life";
  }

  return "misc";
}

function ruleInferSubCategory(theme: ThemeCategoryKey, inputText: string): AutoKbSubCategoryKey | null {
  const text = inputText.toLowerCase();

  const has = (r: RegExp) => r.test(text);

  switch (theme) {
    case "time":
      if (has(/age|years old|年龄/)) return "age";
      if (has(/frequency|often|usually|sometimes|rarely|每天|每周|频率/)) return "frequency";
      if (has(/today|tomorrow|yesterday|date|month|day|week|年|月|日|日期/)) return "date";
      if (has(/number|one|two|three|four|five|六|七|八|九|十|数字/)) return "numbers";
      return null;
    case "travel":
      if (has(/north|south|east|west|direction|方位|上方|下方|左|右|东|西|南|北/)) return "direction";
      if (has(/place|city|town|park|hotel|museum|library|地点|地点|城市|公园|图书馆/)) return "places";
      if (has(/train|bus|subway|metro|taxi|plane|flight|car|地铁|公交|火车|飞机|汽车|出租车/)) return "transportation";
      if (has(/travel|trip|tour|旅游|出行/)) return "travel";
      return null;
    case "emotion":
      if (has(/relationship|friend|partner|关系/)) return "relationships";
      if (has(/love|hate|happy|sad|angry|feel|emotion|情感|喜欢|爱|难过|生气|情绪/)) {
        // rough mapping: feelings for sentiment, emotions for emotion words
        return /情绪|emotion/.test(text) ? "emotions" : "feelings";
      }
      return null;
    case "life":
      if (has(/family|mother|father|brother|sister|friend|家人/)) return "family";
      if (has(/body|health|sick|healthy|身体|健康/)) return "health";
      if (has(/home|house|apartment|room|居住|家|房间/)) return "housing";
      if (has(/furniture|table|chair|sofa|家具/)) return "furniture";
      if (has(/sport|sports|run|jog|运动|跑/)) return "sports";
      if (has(/hobby|music|reading|game|爱好/)) return "hobbies";
      return null;
    case "food":
      if (has(/restaurant|cafe|dining hall|餐馆|餐厅/)) return "restaurant";
      if (has(/dinner|lunch|meal|用餐|吃饭/)) return "dining";
      if (has(/drink|tea|coffee|water|饮品|喝/)) return "drinks";
      if (has(/food|eat|bread|fruit|vegetable|食物|吃/)) return "food";
      return null;
    case "shopping":
      if (has(/color|red|blue|green|black|white|颜色|红色|蓝色/)) return "colors";
      if (has(/clothes|shirt|pants|dress|jacket|衣服|衬衫|裤子|裙子/)) return "clothing";
      if (has(/shopping|buy|sell|market|购物|买/)) return "shopping";
      return null;
    case "nature":
      if (has(/animal|cat|dog|bird|animal|动物|宠物/)) return "animals";
      if (has(/plant|tree|flower|vegetable|植物|花|树/)) return "plants";
      if (has(/weather|rain|snow|sun|cloud|weather|天气|雨|雪|太阳/)) return "weather";
      if (has(/space|universe|宇宙|太空/)) return "space";
      if (has(/nature|自然/)) return "nature";
      return null;
    case "study":
      if (has(/school|class|university|学校|课堂/)) return "school";
      if (has(/language|语言|word|vocab|学习词/)) return "language";
      if (has(/book|notebook|pen|pencil|homework|textbook|笔记|作业|学习用品/)) return "learning_tools";
      return null;
    case "work":
      if (has(/job|doctor|teacher|engineer|职业|工作岗位/)) return "jobs";
      if (has(/office|company|workplace|办公|办公室|公司/)) return "office";
      if (has(/business|商/)) return "business";
      return null;
    case "society":
      if (has(/law|court|法律/)) return "law";
      if (has(/religion|church|temple|宗教/)) return "religion";
      if (has(/politics|government|election|政治/)) return "politics";
      if (has(/event|festival|party|发生|事件|节日/)) return "events";
      return null;
    case "misc":
      return "other";
  }
}

function shouldUseAI(args: {
  partOfSpeech: PartOfSpeechKey;
  themeCategory: ThemeCategoryKey;
  subCategory: AutoKbSubCategoryKey;
}) {
  if (args.partOfSpeech === "other") return true;
  const miscKey = "misc" as ThemeCategoryKey;
  if (args.themeCategory === miscKey) return true;
  if (args.subCategory === "other" && args.themeCategory !== miscKey) return true;
  return false;
}

const POS_ALIASES: Record<string, PartOfSpeechKey> = {
  noun: "noun",
  verb: "verb",
  adjective: "adjective",
  adverb: "adverb",
  other: "other",
  名词: "noun",
  名詞: "noun",
  动词: "verb",
  動詞: "verb",
  形容词: "adjective",
  形容詞: "adjective",
  副词: "adverb",
  副詞: "adverb"
};

function normalizeClassification(input: {
  partOfSpeech: string;
  themeCategory: string;
  subCategory: string;
}): ClassifiedWord {
  const posRaw = (input.partOfSpeech || "").trim().toLowerCase();
  const partOfSpeech = isValidPosKey(posRaw)
    ? posRaw
    : (POS_ALIASES[posRaw] ?? POS_ALIASES[input.partOfSpeech?.trim() ?? ""] ?? "other");

  const themeCategory: ThemeCategoryKey = isValidThemeCategoryKey(input.themeCategory)
    ? input.themeCategory
    : "misc";

  const subFromAI = isValidSubCategoryKey(input.subCategory) ? input.subCategory : "other";
  const validSubs = allowedSubcategoriesForTheme(themeCategory);

  let subCategory: AutoKbSubCategoryKey = subFromAI;
  if (!validSubs.has(subCategory)) {
    subCategory = themeCategory === "misc" ? "other" : "other";
  }

  // Enforce rule: if themeCategory is known but subCategory cannot be determined => other
  if (themeCategory !== "misc" && subCategory !== "other" && !validSubs.has(subCategory)) {
    subCategory = "other";
  }
  if (themeCategory === "misc") subCategory = "other";

  const partLabels = POS_LABELS[partOfSpeech];
  const themeLabels = THEME_CATEGORY_LABELS[themeCategory];
  const subLabels = SUB_CATEGORY_LABELS[subCategory];

  return {
    partOfSpeech,
    partOfSpeech_zh: partLabels.zh,
    partOfSpeech_en: partLabels.en,
    themeCategory,
    themeCategory_zh: themeLabels.zh,
    themeCategory_en: themeLabels.en,
    subCategory,
    subCategory_zh: subLabels.zh,
    subCategory_en: subLabels.en
  };
}

async function classifyWordWithAI(args: {
  term: string;
  learnerPrompt: string;
  aiAnswer: string;
  summaryZh?: string;
  summaryEn?: string;
  locale: "zh" | "en";
}): Promise<{
  partOfSpeech: string;
  themeCategory: string;
  subCategory: string;
} | null> {
  if (!process.env.OPENAI_API_KEY) return null;

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const model = process.env.OPENAI_MODEL_DEFAULT || "gpt-4.1-mini";

  const term = args.term.slice(0, 80);
  const learnerPrompt = args.learnerPrompt.slice(0, 400);
  const aiAnswer = args.aiAnswer.slice(0, 900);
  const summaryZh = (args.summaryZh || "").slice(0, 220);
  const summaryEn = (args.summaryEn || "").slice(0, 220);

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    {
      role: "developer",
      content: `You are classifying a vocabulary term into a fixed taxonomy for LinguaFlow Auto Knowledge Base.
Return JSON only, with exactly these keys:
partOfSpeech: one of noun | verb | adjective | adverb | other
themeCategory: one of time | travel | emotion | life | food | shopping | nature | study | work | society | misc
subCategory: one of the allowed subcategory keys in the taxonomy

IMPORTANT: You MUST use these exact English keys for partOfSpeech: noun, verb, adjective, adverb, other.
Do NOT use Chinese (名词, 动词, etc.) or Japanese (名詞, 動詞, etc.) - use English only.

Rules:
- If you cannot confidently determine subCategory but you can determine themeCategory, set subCategory = "other".
- If you cannot determine themeCategory, set themeCategory = "misc" and subCategory = "other".
- Do not output labels, only keys.
`
    },
    {
      role: "user",
      content: JSON.stringify({
        term,
        learnerPrompt,
        summaryZh,
        summaryEn,
        aiAnswer
      })
    }
  ];

  try {
    const completion = await openai.chat.completions.create({
      model,
      max_completion_tokens: 120,
      response_format: { type: "json_object" },
      messages
    });

    const text = completion.choices[0]?.message?.content || "";
    const parsed = JSON.parse(text) as { partOfSpeech: string; themeCategory: string; subCategory: string };
    return parsed;
  } catch {
    return null;
  }
}

export async function classifyWord(input: ClassifyInput): Promise<ClassifiedWord> {
  const combinedText = [input.term, input.learnerPrompt, input.summaryZh, input.summaryEn, input.aiAnswer].filter(Boolean).join("\n");

  const posRule = ruleInferPOS(combinedText, input.isSimpleWord);
  const themeRule = ruleInferThemeCategory(combinedText);
  const subRule = themeRule === "misc" ? "other" : ruleInferSubCategory(themeRule, combinedText) || "other";

  let result = normalizeClassification({
    partOfSpeech: posRule,
    themeCategory: themeRule,
    subCategory: subRule
  });

  if (!shouldUseAI({ partOfSpeech: result.partOfSpeech, themeCategory: result.themeCategory, subCategory: result.subCategory })) {
    return result;
  }

  const ai = await classifyWordWithAI({
    term: input.term,
    learnerPrompt: input.learnerPrompt,
    aiAnswer: input.aiAnswer,
    summaryZh: input.summaryZh,
    summaryEn: input.summaryEn,
    locale: input.locale
  });

  if (!ai) return result;

  result = normalizeClassification(ai);
  return result;
}

