import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getVocabularySummary } from "@/lib/utils";
import type { Locale } from "@/lib/types";

import { allowedSubcategoriesForTheme, THEME_CATEGORY_KEYS, THEME_CATEGORY_LABELS } from "@/lib/auto-kb/autoKbTaxonomy";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const localeParam = url.searchParams.get("locale");
  const locale: Locale = localeParam === "zh" ? "zh" : "en";

  const entries = await prisma.vocabularyEntry.findMany({
    where: { isDeleted: false },
    select: {
      id: true,
      term: true,
      aiAnswer: true,
      summaryJson: true,
      themeCategory: true,
      themeCategory_zh: true,
      themeCategory_en: true,
      subCategory: true,
      subCategory_zh: true,
      subCategory_en: true,
      createdAt: true
    },
    orderBy: { createdAt: "desc" },
    take: 500
  });

  const categories: Array<{
    name_en: string;
    name_zh: string;
    subcategories: Array<{ name_en: string; name_zh: string; words: Array<{ word: string; meaning: string }> }>;
  }> = [];

  for (const themeKey of THEME_CATEGORY_KEYS) {
    const themeEntries = entries.filter((e) => e.themeCategory === themeKey);
    if (themeEntries.length === 0) continue;

    const subMap = new Map<
      string,
      { name_en: string; name_zh: string; words: Array<{ word: string; meaning: string }> }
    >();

    for (const entry of themeEntries) {
      const meaning = getVocabularySummary(
        { aiAnswer: entry.aiAnswer, summaryJson: entry.summaryJson },
        locale
      );

      const subKey = String(entry.subCategory);
      if (!subMap.has(subKey)) {
        subMap.set(subKey, {
          name_en: entry.subCategory_en,
          name_zh: entry.subCategory_zh,
          words: []
        });
      }
      subMap.get(subKey)!.words.push({
        word: entry.term,
        meaning
      });
    }

    const allowedSubs = allowedSubcategoriesForTheme(themeKey);
    const orderedSubs = Array.from(subMap.entries()).sort(([aKey], [bKey]) => {
      const aAllowed = allowedSubs.has(aKey as any);
      const bAllowed = allowedSubs.has(bKey as any);
      if (aAllowed && !bAllowed) return -1;
      if (!aAllowed && bAllowed) return 1;
      return 0;
    });

    categories.push({
      name_en: THEME_CATEGORY_LABELS[themeKey].en,
      name_zh: THEME_CATEGORY_LABELS[themeKey].zh,
      subcategories: orderedSubs.map(([, sub]) => ({
        name_en: sub.name_en,
        name_zh: sub.name_zh,
        words: sub.words
      }))
    });
  }

  return NextResponse.json({ categories });
}

