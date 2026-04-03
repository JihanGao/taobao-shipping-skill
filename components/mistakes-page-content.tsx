"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { MessageCircle, Search } from "lucide-react";
import { MistakeList } from "@/components/mistake-list";
import { getMistakeDisplayTitle } from "@/lib/utils";
import { Locale } from "@/lib/types";
import { t } from "@/lib/i18n";

type MistakeItem = {
  id: number;
  language: string;
  learnerPrompt?: string | null;
  question: string;
  errorType: string;
  aiAnswer: string;
  screenshotPath?: string | null;
  createdAt?: Date | string | null;
  isFavorite?: boolean;
};

type MistakesPageContentProps = {
  mistakes: MistakeItem[];
  languages: string[];
  locale: Locale;
};

function matchesSearch(
  item: MistakeItem,
  query: string,
  locale: Locale
): boolean {
  if (!query.trim()) return true;
  try {
    const q = query.trim().toLowerCase();
    const title = getMistakeDisplayTitle(
      {
        learnerPrompt: item.learnerPrompt ?? "",
        question: item.question ?? "",
        aiAnswer: item.aiAnswer ?? ""
      },
      locale
    ).toLowerCase();
    const answer = (item.aiAnswer || "").toLowerCase();
    return title.includes(q) || answer.includes(q);
  } catch {
    return true;
  }
}

export function MistakesPageContent({
  mistakes,
  languages,
  locale
}: MistakesPageContentProps) {
  const copy = t(locale);
  const router = useRouter();
  const searchParams = useSearchParams();
  const languageFilter = searchParams.get("language") || "";
  const favoritesActive = searchParams.get("favorites") === "1";

  const handleFavoritesToggle = () => {
    const params = new URLSearchParams(searchParams.toString());
    if (params.get("favorites") === "1") params.delete("favorites");
    else params.set("favorites", "1");
    router.push(`/mistakes${params.toString() ? `?${params}` : ""}`);
  };

  const [searchQuery, setSearchQuery] = useState("");

  const filteredItems = useMemo(() => {
    let list = mistakes;
    if (languageFilter) {
      list = list.filter((i) => i.language === languageFilter);
    }
    return list.filter((i) => matchesSearch(i, searchQuery, locale));
  }, [mistakes, languageFilter, searchQuery, locale]);

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set("language", value);
    else params.delete("language");
    router.push(`/mistakes${params.toString() ? `?${params}` : ""}`);
  };

  return (
    <main className="space-y-8 pt-4">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700"
      >
        <span>←</span>
        {copy.archiveBackToHome}
      </Link>

      <div className="flex items-start gap-4">
        <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-blue-600 shadow-md">
          <MessageCircle className="size-7 text-white" strokeWidth={2} />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            {copy.archiveTitle}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {copy.archiveDescription}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={copy.archiveSearchPlaceholder}
            className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-12 pr-4 text-sm text-gray-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-purple-300 focus:ring-2 focus:ring-purple-100"
          />
        </div>
        <select
          value={languageFilter}
          onChange={handleLanguageChange}
          className="w-full shrink-0 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm outline-none transition focus:border-purple-300 focus:ring-2 focus:ring-purple-100 sm:w-48"
        >
          <option value="">{copy.allLanguages}</option>
          {languages.map((lang) => (
            <option key={lang} value={lang}>
              {lang}
            </option>
          ))}
        </select>
      </div>

      <MistakeList
        initialItems={filteredItems}
        locale={locale}
        languageFilter={languageFilter}
        filterKey={`${searchQuery}|${languageFilter}|${favoritesActive}`}
        favoritesActive={favoritesActive}
        onFavoritesFilterClick={handleFavoritesToggle}
      />
    </main>
  );
}
