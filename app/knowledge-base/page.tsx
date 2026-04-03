// "自动建库" - 极简紧凑的个人语言知识库展示页（前端数据驱动）
"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  Search,
  Zap
} from "lucide-react";

type UiLanguage = "zh" | "en";
type DataLanguage = "spanish" | "japanese" | "english" | "french" | "german";
type PartOfSpeech = "noun" | "verb" | "adjective" | "adverb" | "other";

interface Word {
  id: string;
  word: string;
  translation: string;
  language: DataLanguage;
  partOfSpeech: PartOfSpeech;
  category: string;
  addedDate: string;
  context: string;
}

type OptionLabel = { zh: string; en: string };

type LangOption = {
  value: string;
  label: OptionLabel;
  flag: string;
};

type CategoryOption = {
  value: string;
  label: OptionLabel;
  color: string;
  icon: string;
};

type PartOption = {
  value: string;
  label: OptionLabel;
  icon: string;
  color?: string;
};

type AutoKbWord = {
  word: string;
  meaning?: string;
};

type AutoKbSubCategory = {
  name_en: string;
  name_zh: string;
  words: AutoKbWord[];
};

type AutoKbCategory = {
  name_en: string;
  name_zh: string;
  subcategories: AutoKbSubCategory[];
};

type AutoKbResponse = {
  categories: AutoKbCategory[];
};

export default function KnowledgeBasePage() {
  const router = useRouter();

  // UI language (page labels)
  const [language] = useState<UiLanguage>("zh");

  const [autoKb, setAutoKb] = useState<AutoKbResponse | null>(null);
  const [status, setStatus] = useState<"loading" | "error" | "ready">("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");
  // subCategory cards are clickable filters (Option B)
  const [selectedSubCategory, setSelectedSubCategory] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      setStatus("loading");
      setErrorMessage("");
      try {
        const res = await fetch("/api/library/auto-knowledge-base?locale=zh", {
          method: "GET",
          cache: "no-store"
        });
        if (!res.ok) {
          throw new Error(`Request failed: ${res.status}`);
        }
        const json = (await res.json()) as AutoKbResponse;
        if (!alive) return;
        setAutoKb(json);
        setStatus("ready");
      } catch (e) {
        if (!alive) return;
        setStatus("error");
        setErrorMessage(e instanceof Error ? e.message : "Unknown error");
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // Data filters (UI)
  const [selectedLanguage, setSelectedLanguage] = useState<string>("all");
  const [filterMode, setFilterMode] = useState<"partOfSpeech" | "category">("category");
  const [selectedPartOfSpeech, setSelectedPartOfSpeech] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Expand/collapse (default only first group expanded)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => new Set(["0"]));

  const toggleGroup = (groupIndex: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupIndex)) next.delete(groupIndex);
      else next.add(groupIndex);
      return next;
    });
  };

  // Mock data (auto knowledge base)
  const knowledgeWords: Word[] = useMemo(
    () => [
      {
        id: "1",
        word: "biblioteca",
        translation: "图书馆",
        language: "spanish",
        partOfSpeech: "noun",
        category: "旅游",
        addedDate: "2026-03-17",
        context: "从AI提问自动添加"
      },
      {
        id: "2",
        word: "comer",
        translation: "吃",
        language: "spanish",
        partOfSpeech: "verb",
        category: "日常",
        addedDate: "2026-03-17",
        context: "从单词薄自动添加"
      },
      {
        id: "3",
        word: "hermoso",
        translation: "美丽的",
        language: "spanish",
        partOfSpeech: "adjective",
        category: "心情",
        addedDate: "2026-03-16",
        context: "从AI提问自动添加"
      },
      {
        id: "4",
        word: "図書館",
        translation: "图书馆",
        language: "japanese",
        partOfSpeech: "noun",
        category: "旅游",
        addedDate: "2026-03-16",
        context: "从错题集自动添加"
      },
      {
        id: "5",
        word: "走る",
        translation: "跑",
        language: "japanese",
        partOfSpeech: "verb",
        category: "运动",
        addedDate: "2026-03-15",
        context: "从AI提问自动添加"
      },
      {
        id: "6",
        word: "beautiful",
        translation: "美丽的",
        language: "english",
        partOfSpeech: "adjective",
        category: "心情",
        addedDate: "2026-03-15",
        context: "从单词薄自动添加"
      },
      {
        id: "7",
        word: "ropa",
        translation: "衣服",
        language: "spanish",
        partOfSpeech: "noun",
        category: "衣服",
        addedDate: "2026-03-14",
        context: "从AI提问自动添加"
      },
      {
        id: "8",
        word: "trabajo",
        translation: "工作",
        language: "spanish",
        partOfSpeech: "noun",
        category: "工作",
        addedDate: "2026-03-14",
        context: "从单词薄自动添加"
      },
      {
        id: "9",
        word: "上",
        translation: "上方",
        language: "japanese",
        partOfSpeech: "noun",
        category: "方位",
        addedDate: "2026-03-13",
        context: "从AI提问自动添加"
      },
      {
        id: "10",
        word: "morning",
        translation: "早晨",
        language: "english",
        partOfSpeech: "noun",
        category: "时间",
        addedDate: "2026-03-13",
        context: "从错题集自动添加"
      }
    ],
    []
  );

  const languages: LangOption[] = useMemo(
    () => [
      { value: "all", label: { zh: "全部语言", en: "All Languages" }, flag: "🌐" },
      { value: "spanish", label: { zh: "西班牙语", en: "Spanish" }, flag: "🇪🇸" },
      { value: "japanese", label: { zh: "日语", en: "Japanese" }, flag: "🇯🇵" },
      { value: "english", label: { zh: "英语", en: "English" }, flag: "🇬🇧" },
      { value: "french", label: { zh: "法语", en: "French" }, flag: "🇫🇷" },
      { value: "german", label: { zh: "德语", en: "German" }, flag: "🇩🇪" }
    ],
    []
  );

  const partsOfSpeech: PartOption[] = useMemo(
    () => [
      { value: "all", label: { zh: "全部词性", en: "All Parts" }, icon: "📚" },
      { value: "noun", label: { zh: "名词", en: "Noun" }, icon: "📦" },
      { value: "verb", label: { zh: "动词", en: "Verb" }, icon: "⚡" },
      { value: "adjective", label: { zh: "形容词", en: "Adjective" }, icon: "🎨" },
      { value: "adverb", label: { zh: "副词", en: "Adverb" }, icon: "🔄" }
    ],
    []
  );

  const categories: CategoryOption[] = useMemo(
    () => [
      { value: "all", label: { zh: "全部分类", en: "All Categories" }, color: "from-gray-500 to-gray-600", icon: "📁" },
      { value: "时间", label: { zh: "时间", en: "time" }, color: "from-orange-500 to-orange-600", icon: "⏰" },
      { value: "出行", label: { zh: "出行", en: "travel" }, color: "from-blue-500 to-blue-600", icon: "✈️" },
      { value: "情感", label: { zh: "情感", en: "emotion" }, color: "from-pink-500 to-pink-600", icon: "💖" },
      { value: "生活", label: { zh: "生活", en: "life" }, color: "from-emerald-500 to-emerald-600", icon: "🏠" },
      { value: "饮食", label: { zh: "饮食", en: "food" }, color: "from-yellow-500 to-yellow-600", icon: "🍽️" },
      { value: "购物", label: { zh: "购物", en: "shopping" }, color: "from-purple-500 to-purple-600", icon: "🛍️" },
      { value: "自然", label: { zh: "自然", en: "nature" }, color: "from-green-500 to-green-600", icon: "🌿" },
      { value: "学习", label: { zh: "学习", en: "study" }, color: "from-indigo-500 to-indigo-600", icon: "📚" },
      { value: "工作", label: { zh: "工作", en: "work" }, color: "from-slate-500 to-slate-600", icon: "💼" },
      { value: "社会", label: { zh: "社会", en: "society" }, color: "from-stone-500 to-stone-600", icon: "🏛️" },
      { value: "其他", label: { zh: "其他", en: "misc" }, color: "from-gray-500 to-gray-600", icon: "🧩" }
    ],
    []
  );

  // Local mock filters (kept for UI compatibility), but final rendering is driven by backend data.
  const filteredWords = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return knowledgeWords.filter((word) => {
      const matchesSearch = q
        ? word.word.toLowerCase().includes(q) || word.translation.toLowerCase().includes(q)
        : true;

      const matchesLanguage = selectedLanguage === "all" || word.language === selectedLanguage;

      if (filterMode === "category") {
        const matchesCategory = selectedCategory === "all" || word.category === selectedCategory;
        return matchesSearch && matchesLanguage && matchesCategory;
      }

      const matchesPartOfSpeech =
        selectedPartOfSpeech === "all" || word.partOfSpeech === (selectedPartOfSpeech as PartOfSpeech);
      return matchesSearch && matchesLanguage && matchesPartOfSpeech;
    });
  }, [filterMode, knowledgeWords, searchQuery, selectedCategory, selectedLanguage, selectedPartOfSpeech]);

  const groupedByCategory = useMemo(() => {
    return categories
      .filter((cat) => cat.value !== "all")
      .map((cat) => ({
        key: cat.value,
        emoji: cat.icon,
        title: cat.label[language],
        words: filteredWords.filter((w) => w.category === cat.value)
      }))
      .filter((g) => g.words.length > 0);
  }, [categories, filteredWords, language]);

  const groupedByPartOfSpeech = useMemo(() => {
    return partsOfSpeech
      .filter((pos) => pos.value !== "all")
      .map((pos) => ({
        key: pos.value,
        emoji: pos.icon,
        title: pos.label[language],
        words: filteredWords.filter((w) => w.partOfSpeech === (pos.value as PartOfSpeech))
      }))
      .filter((g) => g.words.length > 0);
  }, [filteredWords, language, partsOfSpeech]);

  const groups = filterMode === "category" ? groupedByCategory : groupedByPartOfSpeech;

  const resultCountText =
    language === "zh" ? `共找到 ${filteredWords.length} 个单词` : `Found ${filteredWords.length} words`;

  const normalizedSearch = searchQuery.trim().toLowerCase();

  const visibleAutoKbCategories = useMemo(() => {
    if (!autoKb?.categories) return [];

    const categoryFiltered =
      filterMode === "category" && selectedCategory !== "all"
        ? autoKb.categories.filter((c) => c.name_zh === selectedCategory)
        : autoKb.categories;

    const subFiltered = categoryFiltered.map((c) => {
      const subs = selectedSubCategory
        ? c.subcategories.filter((s) => s.name_en === selectedSubCategory)
        : c.subcategories;

      const subsWithWords = subs
        .map((s) => {
          const words =
            normalizedSearch.length === 0
              ? s.words
              : s.words.filter((w) => {
                  const hitWord = w.word.toLowerCase().includes(normalizedSearch);
                  const hitMeaning = (w.meaning || "").toLowerCase().includes(normalizedSearch);
                  return hitWord || hitMeaning;
                });
          return { ...s, words };
        })
        .filter((s) => s.words.length > 0);

      return { ...c, subcategories: subsWithWords };
    });

    return subFiltered.filter((c) => c.subcategories.length > 0);
  }, [autoKb, filterMode, normalizedSearch, selectedCategory, selectedSubCategory]);

  const visibleWordsCount = useMemo(() => {
    return visibleAutoKbCategories.reduce((sum, c) => {
      return sum + c.subcategories.reduce((s, sub) => s + sub.words.length, 0);
    }, 0);
  }, [visibleAutoKbCategories]);

  const emptyAfterFilter = status === "ready" && (visibleAutoKbCategories.length === 0 || visibleWordsCount === 0);

  return (
    <div className="relative min-h-screen">
      {/* Full-viewport background to avoid the beige shell showing around the page */}
      <div className="fixed inset-0 -z-10 bg-gradient-to-b from-blue-50 via-white to-purple-50" />

      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Page header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between gap-4 mb-4">
            <button
              type="button"
              onClick={() => router.push("/")}
              className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-white/70"
            >
              <ArrowLeft className="w-4 h-4" />
              {language === "zh" ? "返回首页" : "Back to Home"}
            </button>

            {/* (removed) top-right EN / 中文 language toggle */}
          </div>

          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-pink-500 via-purple-500 to-blue-500 rounded-2xl flex items-center justify-center shadow-lg">
              <Zap className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl mb-1">{language === "zh" ? "自动建库" : "Auto Knowledge Base"}</h1>
              <p className="text-gray-600">
                {language === "zh"
                  ? "AI 自动整理你的语言知识，按类别智能分类"
                  : "AI automatically organizes your language knowledge"}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Filters (restore UI) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 mb-8"
        >
          {/* Search */}
          <div className="mb-6">
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400">
                <Search className="w-5 h-5" />
              </div>
              <input
                type="text"
                placeholder={language === "zh" ? "搜索单词或翻译..." : "Search words or translation..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20"
              />
            </div>
          </div>

          {/* Language select */}
          <div className="space-y-4 mb-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                {language === "zh" ? "语言" : "Language"}
              </label>
              <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm outline-none focus:ring-2 focus:ring-purple-500/20"
              >
                {languages.map((lang) => (
                  <option key={lang.value} value={lang.value}>
                    {lang.flag} {lang.label[language]}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter mode toggle */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                {language === "zh" ? "分类方式" : "Filter By"}
              </label>
              <div className="flex gap-2 bg-gray-100 rounded-lg p-1">
                <button
                  type="button"
                  onClick={() => {
                    setFilterMode("category");
                  }}
                  className={[
                    "flex-1 px-4 py-2 rounded-md transition-all text-sm font-medium",
                    filterMode === "category" ? "bg-white text-purple-600 shadow-sm" : "text-gray-600 hover:text-gray-900"
                  ].join(" ")}
                >
                  {language === "zh" ? "按主题" : "By Category"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFilterMode("partOfSpeech");
                  }}
                  className={[
                    "flex-1 px-4 py-2 rounded-md transition-all text-sm font-medium",
                    filterMode === "partOfSpeech" ? "bg-white text-purple-600 shadow-sm" : "text-gray-600 hover:text-gray-900"
                  ].join(" ")}
                >
                  {language === "zh" ? "按词性" : "By Part of Speech"}
                </button>
              </div>
            </div>

            {/* Conditional filter */}
            {filterMode === "category" ? (
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  {language === "zh" ? "主题" : "Category"}
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm outline-none focus:ring-2 focus:ring-purple-500/20"
                >
                  {categories.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.icon} {cat.label[language]}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  {language === "zh" ? "词性" : "Part of Speech"}
                </label>
                <select
                  value={selectedPartOfSpeech}
                  onChange={(e) => setSelectedPartOfSpeech(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm outline-none focus:ring-2 focus:ring-purple-500/20"
                >
                  {partsOfSpeech.map((pos) => (
                    <option key={pos.value} value={pos.value}>
                      {pos.icon} {pos.label[language]}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="text-sm text-gray-500">{language === "zh" ? `共找到 ${visibleWordsCount} 个单词` : `Found ${visibleWordsCount} words`}</div>
        </motion.div>

        {/* Auto Knowledge Base */}
        {status === "loading" ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
              <div className="h-5 w-40 bg-gray-100 rounded mb-3" />
              <div className="h-4 w-64 bg-gray-100 rounded mb-2" />
              <div className="h-4 w-56 bg-gray-100 rounded" />
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
              <div className="h-5 w-32 bg-gray-100 rounded mb-3" />
              <div className="h-4 w-60 bg-gray-100 rounded mb-2" />
              <div className="h-4 w-52 bg-gray-100 rounded" />
            </div>
          </motion.div>
        ) : status === "error" ? (
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 text-sm text-red-600">
            {language === "zh" ? "加载失败：" : "Failed to load:"} {errorMessage}
          </div>
        ) : !emptyAfterFilter ? (
          <div className="space-y-5 pb-10">
            {visibleAutoKbCategories.map((cat) => (
              <section key={cat.name_en} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-200">
                <h3 className="text-lg font-semibold text-ink">{cat.name_zh}</h3>

                <div className="mt-4 space-y-3">
                  {cat.subcategories.map((sub) => (
                    <div
                      key={sub.name_en}
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        setSelectedSubCategory((prev) => (prev === sub.name_en ? null : sub.name_en));
                      }}
                      className="rounded-xl border border-gray-200 bg-white p-4 cursor-pointer"
                    >
                      <div className="flex items-baseline justify-between gap-3">
                        <h4 className="text-sm font-semibold text-ink">{sub.name_zh}</h4>
                        <span className="text-xs text-gray-500">
                          {sub.words.length} {language === "zh" ? "个" : ""}
                        </span>
                      </div>
                      <ul className="mt-2 list-disc pl-5 space-y-2">
                        {sub.words.map((w, idx) => (
                          <li key={`${w.word}-${idx}`}>
                            <div className="text-sm font-medium text-slate-900">{w.word}</div>
                            {w.meaning ? <div className="text-xs text-gray-500 leading-snug">{w.meaning}</div> : null}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
            <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">
              {language === "zh" ? "没有找到相关单词" : "No matching words"}
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}

