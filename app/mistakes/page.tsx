import { Suspense } from "react";
import { getLanguages, getMistakes } from "@/lib/data";
import { getLocale } from "@/lib/locale";
import { MistakesPageContent } from "@/components/mistakes-page-content";

type MistakesPageProps = {
  searchParams: Promise<{ language?: string; favorites?: string }>;
};

export default async function MistakesPage({ searchParams }: MistakesPageProps) {
  const params = await searchParams;
  const locale = await getLocale();
  const [languages, mistakes] = await Promise.all([
    getLanguages(),
    getMistakes({
      language: params.language,
      favorites: params.favorites === "1" || undefined
    })
  ]);

  return (
    <Suspense fallback={<div className="animate-pulse space-y-6 py-8" />}>
      <MistakesPageContent
        mistakes={mistakes}
        languages={languages}
        locale={locale}
      />
    </Suspense>
  );
}
