import Link from "next/link";

import { FeatureCard } from "@/components/home/feature-card";
import { HomeFooter } from "@/components/home/home-footer";
import { t } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";
import { AlertCircle, Brain, BookOpen, Sparkles, Target, Zap } from "lucide-react";

export default async function Home() {
  const locale = await getLocale();
  const copy = t(locale);

  const language = locale === "zh" ? "zh" : "en";
  const stats = {
    mistakes: 5,
    vocabulary: 18
  };

  const aiFeatures = [
    {
      icon: Sparkles,
      title: { zh: "随时提问", en: "Ask Anytime" },
      description: {
        zh: "像聊天一样提问：文字、截图、语音都可以。",
        en: "Ask like chat: type, attach screenshots, or use voice."
      },
      gradient: "from-blue-500 to-blue-600",
      href: "/mistakes/new"
    },
    {
      icon: Brain,
      title: { zh: "智能分析", en: "AI Insights" },
      description: {
        zh: "洞察你的学习数据，发现规律与薄弱点。",
        en: "Discover patterns and weak spots from your learning data."
      },
      gradient: "from-indigo-500 via-purple-500 to-pink-500",
      href: "/insights"
    },
    {
      icon: Zap,
      title: { zh: "自动建库", en: "Auto Knowledge Base" },
      description: {
        zh: "把错题与单词沉淀为可复习、可检索的知识库。",
        en: "Turn notes into a searchable, reviewable knowledge base."
      },
      gradient: "from-pink-500 via-purple-500 to-blue-500",
      href: "/knowledge-base"
    }
  ] as const;

  const learningFeatures = [
    {
      icon: AlertCircle,
      title: { zh: "学习档案", en: "Learning Archive" },
      description: {
        zh: "回顾你和AI的每一次对话，积累你的语言知识库",
        en: "Review every conversation with AI and build your language knowledge base."
      },
      gradient: "from-red-500 to-red-600",
      href: "/mistakes",
      badge: { zh: `${stats.mistakes} 条新增`, en: `${stats.mistakes} new` },
      badgeClassName: "bg-red-100 text-red-700"
    },
    {
      icon: BookOpen,
      title: { zh: "单词簿", en: "Vocabulary Notebook" },
      description: {
        zh: "记录与管理新学的单词，随时复习巩固。",
        en: "Record vocabulary and review anytime."
      },
      gradient: "from-purple-500 to-purple-600",
      href: "/vocabulary",
      badge: { zh: `${stats.vocabulary} 个新增`, en: `${stats.vocabulary} new` },
      badgeClassName: "bg-purple-100 text-purple-700"
    }
  ] as const;

  const benefits = [
    { icon: Zap, text: { zh: "即问即答，学习不中断", en: "Instant answers, uninterrupted learning" } },
    { icon: Target, text: { zh: "精准定位弱点", en: "Pinpoint weaknesses" } },
    { icon: Brain, text: { zh: "构建长期记忆", en: "Build long-term memory" } }
  ] as const;

  return (
    <main className="space-y-14">
      {/* AI Assistant */}
      <section className="space-y-6">
        <div>
          <h3 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
            {language === "zh" ? "AI 助手" : "AI Assistant"}
          </h3>
          <p className="mt-2 text-sm text-slate-600 sm:text-base">
            {language === "zh" ? "智能提问、分析和知识整理" : "Smart questioning, analysis, and knowledge organization"}
          </p>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {aiFeatures.map((feature) => (
            <FeatureCard
              key={feature.href}
              href={feature.href}
              icon={feature.icon}
              title={feature.title[language]}
              description={feature.description[language]}
              gradientClassName={feature.gradient}
            />
          ))}
        </div>
      </section>

      {/* Learning Resources */}
      <section className="space-y-6">
        <div>
          <h3 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
            {language === "zh" ? "学习资源" : "Learning Resources"}
          </h3>
          <p className="mt-2 text-sm text-slate-600 sm:text-base">
            {language === "zh" ? "管理你的错题和单词库" : "Manage your mistakes and vocabulary"}
          </p>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          {learningFeatures.map((feature) => (
            <FeatureCard
              key={feature.href}
              href={feature.href}
              icon={feature.icon}
              title={feature.title[language]}
              description={feature.description[language]}
              gradientClassName={feature.gradient}
              badge={feature.badge[language]}
              badgeClassName={feature.badgeClassName}
            />
          ))}
        </div>
      </section>

      {/* Why choose */}
      <section className="rounded-[2rem] bg-gradient-to-br from-slate-950 via-ink to-blue-950 p-10 text-white shadow-card sm:p-12">
        <div className="text-center">
          <h3 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {language === "zh" ? "为什么选择 LinguaFlow？" : "Why Choose LinguaFlow?"}
          </h3>
          <p className="mt-3 text-sm text-white/70 sm:text-base">
            {language === "zh"
              ? "让每次提问，都能被整理、复盘、沉淀。"
              : "Every question becomes structured, reviewable, and memorable."}
          </p>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {benefits.map((benefit, idx) => {
            const Icon = benefit.icon;
            return (
              <div key={idx} className="flex items-center gap-4 rounded-2xl bg-white/10 p-6 backdrop-blur">
                <div className="flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-sun to-amber-600 text-ink shadow-lg">
                  <Icon className="size-6 text-ink" />
                </div>
                <p className="text-base font-medium text-white">{benefit.text[language]}</p>
              </div>
            );
          })}
        </div>
      </section>

      <HomeFooter locale={language} />
    </main>
  );
}
