"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  BookOpen,
  BookMarked,
  MessageCircle,
  Menu,
  X,
  Database,
  BarChart3,
  Sparkles
} from "lucide-react";
import { Locale } from "@/lib/types";
import { cn } from "@/lib/utils";

type HeaderProps = {
  locale: Locale;
  labelEn: string;
  labelZh: string;
};

const navItems = [
  { id: "mistakes", icon: BookOpen, label: { zh: "学习档案", en: "Learning Archive" }, path: "/mistakes" },
  { id: "vocabulary", icon: BookMarked, label: { zh: "单词簿", en: "Vocabulary" }, path: "/vocabulary" },
  { id: "knowledge", icon: Database, label: { zh: "自动建库", en: "Knowledge Base" }, path: "/knowledge-base" },
  { id: "insights", icon: BarChart3, label: { zh: "智能分析", en: "AI Insights" }, path: "/insights" }
];

export function Header({ locale, labelEn, labelZh }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function buildLocaleHref(nextLocale: Locale) {
    const params = new URLSearchParams(searchParams.toString());
    const qs = params.toString();
    const redirect = qs ? `${pathname}?${qs}` : pathname;
    return `/api/locale?locale=${nextLocale}&redirect=${encodeURIComponent(redirect)}`;
  }

  return (
    <header className="relative">
      <div className="bg-gradient-to-r from-[#0b1f3f] via-[#163a8a] to-[#0b1f3f] text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex min-h-14 items-center justify-between pt-6 pb-10">
            {/* Left: Logo & Menu */}
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="relative z-[60] flex items-center gap-3 hover:opacity-80 transition-opacity group"
              >
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-orange-400 to-orange-600 shadow-lg">
                  <Sparkles className="size-5 text-white" strokeWidth={2} />
                </div>
                <div className="flex flex-col justify-center">
                  <div className="text-sm font-bold tracking-wide text-white">LinguaFlow</div>
                  <div className="text-xs text-blue-200">
                    {locale === "zh" ? "AI 语言学习助手" : "AI Language Assistant"}
                  </div>
                </div>
              </Link>

              {/* Menu Dropdown - hover */}
              <div
                className="relative"
                onMouseEnter={() => setMenuOpen(true)}
                onMouseLeave={() => setMenuOpen(false)}
              >
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="p-2.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-all flex items-center gap-2"
                  title={locale === "zh" ? "功能菜单" : "Menu"}
                >
                  <Menu className="size-5" />
                </button>

                {menuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute left-0 top-full pt-2 z-50"
                  >
                    <div className="w-56 bg-white rounded-xl shadow-2xl overflow-hidden border border-gray-100">
                      {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive =
                          pathname === item.path || pathname.startsWith(`${item.path}/`);
                        return (
                          <Link
                            key={item.id}
                            href={item.path}
                            onClick={() => setMenuOpen(false)}
                            className={cn(
                              "flex items-center gap-3 px-4 py-3 transition-colors",
                              isActive
                                ? "bg-orange-50 text-orange-700"
                                : "text-gray-700 hover:bg-gray-50"
                            )}
                          >
                            <Icon className="size-5 shrink-0" />
                            <span className="font-medium">{item.label[locale]}</span>
                          </Link>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </div>
            </div>

            {/* Right: Language + Ask */}
            <div className="flex items-center gap-4">
              {/* Compact Language Toggle: no border, transparent, smaller */}
              <div className="flex items-center gap-0.5 bg-transparent">
                <a
                  href={buildLocaleHref("en")}
                  className={cn(
                    "rounded px-1 py-0.5 text-[11px] font-medium transition-all",
                    locale === "en" ? "text-white" : "text-white/50 hover:text-white/80"
                  )}
                >
                  {labelEn}
                </a>
                <span className="text-white/30 text-[11px]">|</span>
                <a
                  href={buildLocaleHref("zh")}
                  className={cn(
                    "rounded px-1 py-0.5 text-[11px] font-medium transition-all",
                    locale === "zh" ? "text-white" : "text-white/50 hover:text-white/80"
                  )}
                >
                  {labelZh}
                </a>
              </div>

              <Link
                href="/mistakes/new"
                className="inline-flex items-center gap-2 rounded-full bg-orange-500 px-4 py-1.5 text-sm font-semibold text-white shadow-md hover:bg-orange-400 transition-colors"
              >
                <MessageCircle className="size-4" />
                <span className="hidden sm:inline">{locale === "zh" ? "提问" : "Ask"}</span>
              </Link>

              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 hover:bg-white/10 rounded-lg transition-colors"
                aria-label="Menu"
              >
                {mobileMenuOpen ? <X className="size-6" /> : <Menu className="size-6" />}
              </button>
            </div>
          </div>
        </div>

        <div className="pointer-events-none absolute bottom-0 left-0 w-full">
          <svg
            className="block h-12 w-full text-paper"
            viewBox="0 0 1200 48"
            preserveAspectRatio="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M0,25 C120,19 320,19 500,25 C650,27 800,30 950,27 C1050,28 1150,26 1200,25 L1200,48 L0,48 Z"
              fill="currentColor"
            />
          </svg>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="md:hidden bg-slate-900 border-t border-white/10 absolute w-full z-50 shadow-xl"
        >
          <div className="px-4 py-4 space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                pathname === item.path || pathname.startsWith(`${item.path}/`);
              return (
                <Link
                  key={item.id}
                  href={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                    isActive
                      ? "bg-white/20 text-white"
                      : "text-gray-300 hover:bg-white/10 hover:text-white"
                  )}
                >
                  <Icon className="size-5" />
                  <span>{item.label[locale]}</span>
                </Link>
              );
            })}
          </div>
        </motion.div>
      )}
    </header>
  );
}
