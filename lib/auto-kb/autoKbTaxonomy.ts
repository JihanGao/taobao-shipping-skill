export type PartOfSpeechKey = "noun" | "verb" | "adjective" | "adverb" | "other";

export type ThemeCategoryKey =
  | "time"
  | "travel"
  | "emotion"
  | "life"
  | "food"
  | "shopping"
  | "nature"
  | "study"
  | "work"
  | "society"
  | "misc";

export type AutoKbSubCategoryKey =
  | "numbers"
  | "date"
  | "frequency"
  | "age"
  | "direction"
  | "places"
  | "transportation"
  | "travel"
  | "feelings"
  | "emotions"
  | "relationships"
  | "family"
  | "body"
  | "housing"
  | "furniture"
  | "health"
  | "sports"
  | "hobbies"
  | "food"
  | "drinks"
  | "restaurant"
  | "dining"
  | "shopping"
  | "colors"
  | "clothing"
  | "animals"
  | "plants"
  | "weather"
  | "space"
  | "nature"
  | "school"
  | "language"
  | "learning_tools"
  | "jobs"
  | "office"
  | "business"
  | "politics"
  | "religion"
  | "law"
  | "events"
  | "other";

export const PART_OF_SPEECH_LABELS: Record<PartOfSpeechKey, { zh: string; en: string }> = {
  noun: { zh: "名词", en: "noun" },
  verb: { zh: "动词", en: "verb" },
  adjective: { zh: "形容词", en: "adjective" },
  adverb: { zh: "副词", en: "adverb" },
  other: { zh: "其他", en: "other" }
};

export const THEME_CATEGORY_LABELS: Record<ThemeCategoryKey, { zh: string; en: string }> = {
  time: { zh: "时间", en: "time" },
  travel: { zh: "出行", en: "travel" },
  emotion: { zh: "情感", en: "emotion" },
  life: { zh: "生活", en: "life" },
  food: { zh: "饮食", en: "food" },
  shopping: { zh: "购物", en: "shopping" },
  nature: { zh: "自然", en: "nature" },
  study: { zh: "学习", en: "study" },
  work: { zh: "工作", en: "work" },
  society: { zh: "社会", en: "society" },
  misc: { zh: "其他", en: "misc" }
};

export const SUB_CATEGORY_LABELS: Record<AutoKbSubCategoryKey, { zh: string; en: string }> = {
  // time
  numbers: { zh: "数字", en: "numbers" },
  date: { zh: "日期", en: "date" },
  frequency: { zh: "频率", en: "frequency" },
  age: { zh: "年龄", en: "age" },

  // travel
  direction: { zh: "方位", en: "direction" },
  places: { zh: "地点", en: "places" },
  transportation: { zh: "交通", en: "transportation" },
  travel: { zh: "旅游", en: "travel" },

  // emotion
  feelings: { zh: "心情", en: "feelings" },
  emotions: { zh: "情绪", en: "emotions" },
  relationships: { zh: "关系", en: "relationships" },

  // life
  family: { zh: "家人", en: "family" },
  body: { zh: "身体", en: "body" },
  housing: { zh: "居住", en: "housing" },
  furniture: { zh: "家具", en: "furniture" },
  health: { zh: "健康", en: "health" },
  sports: { zh: "运动", en: "sports" },
  hobbies: { zh: "爱好", en: "hobbies" },

  // food
  food: { zh: "食物", en: "food" },
  drinks: { zh: "饮品", en: "drinks" },
  restaurant: { zh: "餐馆", en: "restaurant" },
  dining: { zh: "用餐", en: "dining" },

  // shopping
  shopping: { zh: "购物", en: "shopping" },
  colors: { zh: "颜色", en: "colors" },
  clothing: { zh: "衣物", en: "clothing" },

  // nature
  animals: { zh: "动物", en: "animals" },
  plants: { zh: "植物", en: "plants" },
  weather: { zh: "天气", en: "weather" },
  space: { zh: "宇宙", en: "space" },
  nature: { zh: "自然", en: "nature" },

  // study
  school: { zh: "学校", en: "school" },
  language: { zh: "语言", en: "language" },
  learning_tools: { zh: "学习用品", en: "learning_tools" },

  // work
  jobs: { zh: "职业", en: "jobs" },
  office: { zh: "办公", en: "office" },
  business: { zh: "商务", en: "business" },

  // society
  politics: { zh: "政治", en: "politics" },
  religion: { zh: "宗教", en: "religion" },
  law: { zh: "法律", en: "law" },
  events: { zh: "事件", en: "events" },

  // misc
  other: { zh: "其他", en: "other" }
};

export const THEME_CATEGORY_KEYS: ThemeCategoryKey[] = [
  "time",
  "travel",
  "emotion",
  "life",
  "food",
  "shopping",
  "nature",
  "study",
  "work",
  "society",
  "misc"
];

export const POS_KEYS: PartOfSpeechKey[] = ["noun", "verb", "adjective", "adverb", "other"];

const SUBS_BY_THEME: Record<ThemeCategoryKey, AutoKbSubCategoryKey[]> = {
  time: ["numbers", "date", "frequency", "age"],
  travel: ["direction", "places", "transportation", "travel"],
  emotion: ["feelings", "emotions", "relationships"],
  life: ["family", "body", "housing", "furniture", "health", "sports", "hobbies"],
  food: ["food", "drinks", "restaurant", "dining"],
  shopping: ["shopping", "colors", "clothing"],
  nature: ["animals", "plants", "weather", "space", "nature"],
  study: ["school", "language", "learning_tools"],
  work: ["jobs", "office", "business"],
  society: ["politics", "religion", "law", "events"],
  misc: ["other"]
};

export const ALL_SUBCATEGORIES: AutoKbSubCategoryKey[] = Object.keys(SUB_CATEGORY_LABELS) as AutoKbSubCategoryKey[];

export function isValidThemeCategoryKey(value: string): value is ThemeCategoryKey {
  return (THEME_CATEGORY_KEYS as string[]).includes(value);
}

export function isValidPosKey(value: string): value is PartOfSpeechKey {
  return (POS_KEYS as string[]).includes(value);
}

export function isValidSubCategoryKey(value: string): value is AutoKbSubCategoryKey {
  return (ALL_SUBCATEGORIES as string[]).includes(value);
}

export function allowedSubcategoriesForTheme(theme: ThemeCategoryKey): Set<AutoKbSubCategoryKey> {
  return new Set(SUBS_BY_THEME[theme]);
}

