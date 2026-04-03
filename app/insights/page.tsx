import { LearningInsights } from "@/components/learning-insights";
import { getLanguages, getVocabularyLanguages } from "@/lib/data";
import { getLocale } from "@/lib/locale";

export default async function InsightsPage() {
  const [locale, mistakeLanguages, vocabularyLanguages] = await Promise.all([
    getLocale(),
    getLanguages(),
    getVocabularyLanguages()
  ]);

  const languages = Array.from(new Set([...mistakeLanguages, ...vocabularyLanguages])).sort(
    (left, right) => left.localeCompare(right)
  );

  return <LearningInsights locale={locale} languages={languages} />;
}
