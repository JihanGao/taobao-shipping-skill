import { Suspense } from "react";
import { getVocabulary, getVocabularyLanguages } from "@/lib/data";
import { getLocale } from "@/lib/locale";
import { VocabularyPageContent } from "@/components/vocabulary-page-content";

type VocabularyPageProps = {
  searchParams: Promise<{ language?: string; favorites?: string }>;
};

export default async function VocabularyPage({ searchParams }: VocabularyPageProps) {
  const params = await searchParams;
  const locale = await getLocale();
  const [vocabulary, languages] = await Promise.all([
    getVocabulary({
      language: params.language,
      favorites: params.favorites === "1" || undefined
    }),
    getVocabularyLanguages()
  ]);

  return (
    <Suspense fallback={<div className="animate-pulse space-y-6 py-8" />}>
      <VocabularyPageContent
        vocabulary={vocabulary}
        languages={languages}
        locale={locale}
      />
    </Suspense>
  );
}
