"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain,
  Sparkles,
  ChevronDown,
  ChevronUp,
  BookOpen,
  AlertCircle,
  Download,
  FileText,
  FileCode
} from "lucide-react";

import { Locale } from "@/lib/types";
import { cn } from "@/lib/utils";

type RangeKey = "today" | "last7" | "last30" | "custom";

type AutomaticSummary = {
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

type CustomSummary = {
  directAnswer: string;
  keyFindings: string[];
  supportingExamples: string[];
  suggestedNextSteps: string[];
};

type EvidenceItem = {
  id: number;
  title: string;
};

type InsightsResponse = {
  processed: {
    rangeLabel: string;
    totalMistakes: number;
    totalVocabulary: number;
    totalRecords: number;
  };
  automaticSummary: AutomaticSummary;
  customSummary: CustomSummary | null;
  evidence: {
    mistakes: EvidenceItem[];
    vocabulary: EvidenceItem[];
  };
};

const ranges = [
  { value: "today", en: "Today", zh: "今天" },
  { value: "last7", en: "Last 7 days", zh: "最近 7 天" },
  { value: "last30", en: "Last 30 days", zh: "最近 30 天" },
  { value: "custom", en: "Custom range", zh: "自定义" }
] as const;

function getCopy(locale: Locale) {
  return locale === "zh"
    ? {
        eyebrow: "洞察",
        title: "智能分析",
        description: "基于你的 AI 问答数据，帮你总结真正该复习的内容。",
        range: "时间范围",
        customFrom: "开始日期",
        customTo: "结束日期",
        language: "语言",
        allLanguages: "全部语言",
        generate: "生成报告",
        generating: "分析中...",
        lowDataTitle: "数据还不够多，但已经可以开始总结了",
        lowDataBody: "继续保存几条错题、单词或 AI 问答，智能分析会更准确。",
        grammar: "关键语法点",
        grammarCount: (n: number) => `${n} 个语法点`,
        patterns: "重复错误模式",
        patternsCount: (n: number) => `${n} 个错误模式`,
        customQuestion: "自定义 AI 总结",
        customPlaceholder: "比如：总结我最近一周最常犯的语法错误",
        ask: "提问",
        findings: "关键发现",
        examples: "支持例子",
        nextSteps: "下一步建议",
        quickPrompts: "快捷问题",
        quick1: "重复查询的单词",
        quick2: "重复查询的语法",
        quick3: "高频语法拓展表",
        quick4: "总结我今天学到的关键语法点",
        viewMistakes: "查看相关错题",
        viewWords: "查看相关单词",
        examplesLabel: "代表例子",
        countLabel: "出现",
        times: "次",
        noData: "当前时间范围内还没有足够的学习记录。",
        processed: "已分析",
        records: "条记录",
        aiSummaryTitle: "AI 智能总结",
        aiSummarySubtitle: (range: string, count: number) => `基于 ${range} 的 ${count} 条记录`,
        exportReport: "导出报告",
        exportMd: "Markdown (.md)",
        exportTxt: "纯文本 (.txt)",
        expand: "展开",
        collapse: "收起",
        focusArea: "问题主要集中在",
        errorPattern: "典型错误模式",
        learningTips: "学习建议"
      }
    : {
        eyebrow: "Insights",
        title: "Learning Insights",
        description: "Based on your AI Q&A data, we help summarize what you should review.",
        range: "Time range",
        customFrom: "From",
        customTo: "To",
        language: "Language",
        allLanguages: "All languages",
        generate: "Generate report",
        generating: "Analyzing...",
        lowDataTitle: "There is not much data yet, but we can still summarize the clearest signals",
        lowDataBody: "Save a few more mistakes, words, or AI answers and the insights will become much sharper.",
        grammar: "Key grammar points",
        grammarCount: (n: number) => `${n} grammar point${n !== 1 ? "s" : ""}`,
        patterns: "Repeated mistake patterns",
        patternsCount: (n: number) => `${n} pattern${n !== 1 ? "s" : ""}`,
        customQuestion: "Custom AI summary",
        customPlaceholder: "For example: What grammar areas do I struggle with most recently?",
        ask: "Ask",
        findings: "Key findings",
        examples: "Supporting examples",
        nextSteps: "Next review steps",
        quickPrompts: "Quick prompts",
        quick1: "Repeatedly searched words",
        quick2: "Repeatedly searched grammar",
        quick3: "Frequent grammar expansion table",
        quick4: "Summarize key grammar points learned today",
        viewMistakes: "View related mistakes",
        viewWords: "View related words",
        examplesLabel: "Representative examples",
        countLabel: "Seen",
        times: "times",
        noData: "There is not enough data in this range yet.",
        processed: "Analyzed",
        records: "records",
        aiSummaryTitle: "AI Smart Summary",
        aiSummarySubtitle: (range: string, count: number) => `Based on ${count} records from ${range}`,
        exportReport: "Export report",
        exportMd: "Markdown (.md)",
        exportTxt: "Plain text (.txt)",
        expand: "Expand",
        collapse: "Collapse",
        focusArea: "Focus areas",
        errorPattern: "Typical error patterns",
        learningTips: "Learning tips"
      };
}

export function LearningInsights({
  locale,
  languages
}: {
  locale: Locale;
  languages: string[];
}) {
  const copy = getCopy(locale);
  const [range, setRange] = useState<RangeKey>("last7");
  const [language, setLanguage] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [customQuestion, setCustomQuestion] = useState("");
  const [pendingQuestion, setPendingQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<InsightsResponse | null>(null);
  const [grammarExpanded, setGrammarExpanded] = useState(true);
  const [mistakesExpanded, setMistakesExpanded] = useState(true);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  const quickPrompts = useMemo(
    () => [copy.quick1, copy.quick2, copy.quick3, copy.quick4],
    [copy.quick1, copy.quick2, copy.quick3, copy.quick4]
  );

  async function loadInsights(question = pendingQuestion) {
    setLoading(true);
    try {
      const response = await fetch("/api/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locale,
          range,
          from: range === "custom" ? from : undefined,
          to: range === "custom" ? to : undefined,
          language: language || undefined,
          customQuestion: question || undefined
        })
      });
      const text = (await response.text()).trim();
      if (!text) {
        throw new Error(response.ok ? "Empty response" : `Request failed (${response.status})`);
      }
      let payload: InsightsResponse | { error: string };
      try {
        payload = JSON.parse(text) as InsightsResponse | { error: string };
      } catch {
        throw new Error(`Invalid response (${response.status})`);
      }
      if (!response.ok && "error" in payload) {
        throw new Error(payload.error);
      }
      setData(payload as InsightsResponse);
    } catch (err) {
      console.error("loadInsights error:", err);
      setData(null);
      alert(err instanceof Error ? err.message : "生成报告失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setShowExportMenu(false);
      }
    }
    if (showExportMenu) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showExportMenu]);

  const mistakeEvidence = new Map((data?.evidence.mistakes || []).map((item) => [item.id, item]));
  const vocabularyEvidence = new Map((data?.evidence.vocabulary || []).map((item) => [item.id, item]));

  function renderEvidence(ids: number[], kind: "mistakes" | "vocabulary", theme: "blue" | "red") {
    const items = ids
      .map((id) => (kind === "mistakes" ? mistakeEvidence.get(id) : vocabularyEvidence.get(id)))
      .filter((item): item is EvidenceItem => Boolean(item))
      .slice(0, 3);

    if (items.length === 0) return null;

    const bgClass = theme === "blue" ? "bg-blue-50 border-blue-100" : "bg-red-50 border-red-100";

    return (
      <div className="mt-4 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          {copy.examplesLabel}
        </p>
        <ul className={cn("space-y-2 rounded-lg border p-3 text-sm text-slate-700", bgClass)}>
          {items.map((item) => (
            <li key={`${kind}-${item.id}`}>{item.title}</li>
          ))}
        </ul>
        <Link
          href={kind === "mistakes" ? "/mistakes" : "/vocabulary"}
          className={cn(
            "inline-flex text-sm font-medium",
            theme === "blue" ? "text-blue-600 hover:text-blue-700 hover:underline" : "text-red-600 hover:text-red-700 hover:underline"
          )}
        >
          {kind === "mistakes" ? copy.viewMistakes : copy.viewWords} →
        </Link>
      </div>
    );
  }

  function buildExportContent(format: "md" | "txt") {
    if (!data) return "";
    const { automaticSummary, customSummary, processed } = data;
    const lines: string[] = [
      `# ${copy.aiSummaryTitle}`,
      `${copy.aiSummarySubtitle(processed.rangeLabel, processed.totalRecords)}`,
      ""
    ];
    if (automaticSummary.keyGrammarPoints.length) {
      lines.push(`## ${copy.grammar}`);
      automaticSummary.keyGrammarPoints.forEach((g) => {
        lines.push(`- **${g.title}** (${copy.countLabel} ${g.count} ${copy.times})`);
        lines.push(`  ${g.summary}`);
      });
      lines.push("");
    }
    if (automaticSummary.repeatedMistakePatterns.length) {
      lines.push(`## ${copy.patterns}`);
      automaticSummary.repeatedMistakePatterns.forEach((p) => {
        lines.push(`- **${p.title}** (${copy.countLabel} ${p.count} ${copy.times})`);
        lines.push(`  ${p.summary}`);
      });
      lines.push("");
    }
    if (customSummary) {
      lines.push(`## ${copy.customQuestion}`);
      lines.push(customSummary.directAnswer);
    }
    return format === "md" ? lines.join("\n") : lines.map((l) => l.replace(/^#+\s*/, "")).join("\n");
  }

  function handleExport(format: "md" | "txt") {
    const content = buildExportContent(format);
    const blob = new Blob([content], { type: format === "md" ? "text/markdown" : "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `learning-insights.${format === "md" ? "md" : "txt"}`;
    a.click();
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
  }

  return (
    <main className="space-y-8">
      {/* Page title with gradient Brain icon */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-2"
      >
        <div className="flex items-center gap-4">
          <div className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 shadow-lg">
            <Brain className="size-8 text-white" />
          </div>
          <div>
            <h2 className="text-4xl font-semibold tracking-tight text-ink">{copy.title}</h2>
            <p className="mt-1 text-sm text-slate-600">{copy.description}</p>
          </div>
        </div>
      </motion.div>

      {/* Filter section - white card, 3 columns */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
      >
        <div className="grid gap-4 md:grid-cols-3 md:items-end">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">{copy.range}</label>
            <select
              value={range}
              onChange={(e) => setRange(e.target.value as RangeKey)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
            >
              {ranges.map((item) => (
                <option key={item.value} value={item.value}>
                  {locale === "zh" ? item.zh : item.en}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">{copy.language}</label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
            >
              <option value="">{copy.allLanguages}</option>
              {languages.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>
          {range === "custom" ? (
            <div className="grid gap-4 md:grid-cols-2 md:col-span-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">{copy.customFrom}</label>
                <input
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">{copy.customTo}</label>
                <input
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
            </div>
          ) : null}
          <button
            type="button"
            onClick={() => void loadInsights()}
            disabled={loading}
            className="h-9 rounded-lg bg-slate-900 px-5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-70"
          >
            {loading ? copy.generating : copy.generate}
          </button>
        </div>
        {data ? (
          <div className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
            {copy.processed} {data.processed.totalRecords} {copy.records}
          </div>
        ) : null}
      </motion.section>

      {/* Custom AI summary */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
      >
        <h3 className="text-2xl font-semibold text-ink mb-4">{copy.customQuestion}</h3>
        <div className="flex flex-wrap gap-3 mb-4">
          {quickPrompts.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => {
                setCustomQuestion(prompt);
                setPendingQuestion(prompt);
                void loadInsights(prompt);
              }}
              className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              {prompt}
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <textarea
            rows={1}
            value={customQuestion}
            onChange={(e) => setCustomQuestion(e.target.value)}
            placeholder={copy.customPlaceholder}
            className="min-h-[40px] max-h-[80px] w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm md:min-h-[40px]"
          />
          <button
            type="button"
            onClick={() => {
              setPendingQuestion(customQuestion.trim());
              void loadInsights(customQuestion.trim());
            }}
            className="flex shrink-0 items-center justify-center whitespace-nowrap rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 md:self-auto"
          >
            {copy.ask}
          </button>
        </div>
      </motion.section>

      {data && !loading ? (
        <>
          {data.processed.totalRecords < 2 ? (
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
            >
              <h3 className="text-lg font-semibold text-ink">{copy.lowDataTitle}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">{copy.lowDataBody}</p>
            </motion.section>
          ) : (
            <>
              {/* AI Smart Summary card - gradient background + export */}
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="relative rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-8 shadow-sm"
              >
                {/* Export button - absolute top-right */}
                <div ref={exportMenuRef} className="absolute top-6 right-6">
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowExportMenu(!showExportMenu)}
                      className="flex items-center gap-2 rounded-lg border border-indigo-200 bg-white/90 px-4 py-2 text-sm font-medium text-indigo-700 shadow-sm hover:bg-white hover:shadow-md"
                    >
                      <Download className="size-4" />
                      {copy.exportReport}
                      {showExportMenu ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                    </button>
                    <AnimatePresence>
                      {showExportMenu && (
                        <motion.div
                          initial={{ opacity: 0, y: -10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -10, scale: 0.95 }}
                          className="absolute right-0 top-full z-10 mt-2 w-48 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl"
                        >
                          <button
                            type="button"
                            onClick={() => handleExport("md")}
                            className="flex w-full items-center gap-3 px-4 py-3 hover:bg-indigo-50"
                          >
                            <FileCode className="size-4 text-indigo-600" />
                            <div className="text-left">
                              <div className="text-sm font-medium text-gray-900">{copy.exportMd}</div>
                            </div>
                          </button>
                          <div className="h-px bg-gray-100" />
                          <button
                            type="button"
                            onClick={() => handleExport("txt")}
                            className="flex w-full items-center gap-3 px-4 py-3 hover:bg-indigo-50"
                          >
                            <FileText className="size-4 text-indigo-600" />
                            <div className="text-left">
                              <div className="text-sm font-medium text-gray-900">{copy.exportTxt}</div>
                            </div>
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                <div className="flex items-center gap-3 mb-6">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 shadow-md">
                    <Sparkles className="size-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-semibold text-ink">{copy.aiSummaryTitle}</h3>
                    <p className="text-sm text-slate-600">
                      {copy.aiSummarySubtitle(data.processed.rangeLabel, data.processed.totalRecords)}
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border border-white/50 bg-white/80 p-6 backdrop-blur-sm space-y-4">
                  <div>
                    <h4 className="mb-2 text-lg font-semibold text-gray-800">📍 {copy.focusArea}</h4>
                    <p className="text-sm leading-7 text-slate-700">
                      {data.automaticSummary.keyGrammarPoints.length > 0
                        ? `${data.automaticSummary.keyGrammarPoints[0].title}${data.automaticSummary.keyGrammarPoints[0].summary ? (locale === "zh" ? `，${data.automaticSummary.keyGrammarPoints[0].summary}` : `. ${data.automaticSummary.keyGrammarPoints[0].summary}`) : ""}${data.automaticSummary.keyGrammarPoints.length > 1 ? (locale === "zh" ? " 等。" : " etc.") : ""}`
                        : data.automaticSummary.repeatedMistakePatterns[0]?.summary || "-"}
                    </p>
                  </div>
                  <div>
                    <h4 className="mb-2 text-lg font-semibold text-gray-800">⚠️ {copy.errorPattern}</h4>
                    <p className="text-sm leading-7 text-slate-700">
                      {data.automaticSummary.repeatedMistakePatterns.length > 0
                        ? data.automaticSummary.repeatedMistakePatterns.map((p) => `${p.title} (${copy.countLabel} ${p.count} ${copy.times})`).join("；")
                        : "-"}
                    </p>
                  </div>
                  {(() => {
                    const tips = data.customSummary?.suggestedNextSteps?.length
                      ? data.customSummary.suggestedNextSteps
                      : (locale === "zh"
                        ? ["加强重复出现的语法点练习", "建立语法错误笔记", "通过实际对话巩固应用"]
                        : ["Practice the most repeated grammar points", "Keep a grammar mistake notebook", "Reinforce through real conversation"]);
                    return (
                      <div>
                        <h4 className="mb-2 text-lg font-semibold text-gray-800">💡 {copy.learningTips}</h4>
                        <ul className="space-y-2 text-sm leading-7 text-slate-700">
                          {tips.map((item) => (
                            <li key={item} className="ml-5 list-disc">{item}</li>
                          ))}
                        </ul>
                      </div>
                    );
                  })()}
                </div>
              </motion.section>

              {/* Collapsible Grammar card - blue theme */}
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
              >
                <button
                  type="button"
                  onClick={() => setGrammarExpanded(!grammarExpanded)}
                  className="flex w-full items-center justify-between p-6 text-left hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-blue-100">
                      <BookOpen className="size-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-ink">{copy.grammar}</h3>
                      <p className="text-sm text-gray-500">
                        {copy.grammarCount(data.automaticSummary.keyGrammarPoints.length)}
                      </p>
                    </div>
                  </div>
                  {grammarExpanded ? (
                    <ChevronUp className="size-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="size-5 text-gray-400" />
                  )}
                </button>
                <AnimatePresence>
                  {grammarExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="border-t border-gray-200 bg-gray-50 p-6"
                    >
                      <div className="space-y-4">
                        {data.automaticSummary.keyGrammarPoints.map((item) => (
                          <div
                            key={item.title}
                            className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <h4 className="font-semibold text-ink">{item.title}</h4>
                              <span className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-500">
                                {copy.countLabel} {item.count} {copy.times}
                              </span>
                            </div>
                            <p className="mt-2 text-sm leading-7 text-slate-600">{item.summary}</p>
                            {renderEvidence(item.relatedItemIds, "mistakes", "blue")}
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.section>

              {/* Collapsible Mistakes card - red theme */}
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
              >
                <button
                  type="button"
                  onClick={() => setMistakesExpanded(!mistakesExpanded)}
                  className="flex w-full items-center justify-between p-6 text-left hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-red-100">
                      <AlertCircle className="size-5 text-red-600" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-ink">{copy.patterns}</h3>
                      <p className="text-sm text-gray-500">
                        {copy.patternsCount(data.automaticSummary.repeatedMistakePatterns.length)}
                      </p>
                    </div>
                  </div>
                  {mistakesExpanded ? (
                    <ChevronUp className="size-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="size-5 text-gray-400" />
                  )}
                </button>
                <AnimatePresence>
                  {mistakesExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="border-t border-gray-200 bg-gray-50 p-6"
                    >
                      <div className="space-y-4">
                        {data.automaticSummary.repeatedMistakePatterns.map((item) => (
                          <div
                            key={item.title}
                            className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <h4 className="font-semibold text-ink">{item.title}</h4>
                              <span className="rounded-full bg-red-100 px-3 py-1 text-sm font-medium text-red-600">
                                {copy.countLabel} {item.count} {copy.times}
                              </span>
                            </div>
                            <p className="mt-2 text-sm leading-7 text-slate-600">{item.summary}</p>
                            {renderEvidence(item.relatedItemIds, "mistakes", "red")}
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.section>

              {data.customSummary && (
                <motion.section
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
                >
                  <h3 className="text-lg font-semibold text-ink">{copy.customQuestion}</h3>
                  <p className="mt-4 text-sm leading-8 text-slate-700">{data.customSummary.directAnswer}</p>
                  <div className="mt-6 grid gap-4 lg:grid-cols-3">
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <h4 className="font-semibold text-ink">{copy.findings}</h4>
                      <ul className="mt-3 space-y-2 text-sm leading-7 text-slate-600">
                        {data.customSummary.keyFindings.map((item) => (
                          <li key={item} className="ml-5 list-disc">{item}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <h4 className="font-semibold text-ink">{copy.examples}</h4>
                      <ul className="mt-3 space-y-2 text-sm leading-7 text-slate-600">
                        {data.customSummary.supportingExamples.map((item) => (
                          <li key={item} className="ml-5 list-disc">{item}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <h4 className="font-semibold text-ink">{copy.nextSteps}</h4>
                      <ul className="mt-3 space-y-2 text-sm leading-7 text-slate-600">
                        {data.customSummary.suggestedNextSteps.map((item) => (
                          <li key={item} className="ml-5 list-disc">{item}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </motion.section>
              )}
            </>
          )}
        </>
      ) : null}
    </main>
  );
}
