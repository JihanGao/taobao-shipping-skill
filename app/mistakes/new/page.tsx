import { NewMistakeComposer } from "@/components/new-mistake-composer";
import { t } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";

export default async function NewMistakePage() {
  const locale = await getLocale();
  const copy = t(locale);

  return (
    <main className="mx-auto max-w-6xl space-y-6">
      <div className="space-y-2">
        <p className="text-sm uppercase tracking-[0.24em] text-slate-500">{copy.capture}</p>
        <h2 className="text-3xl font-semibold tracking-tight text-ink">{copy.askTitle}</h2>
        <p className="text-sm text-slate-600">{copy.askDescription}</p>
      </div>

      <NewMistakeComposer locale={locale} />
    </main>
  );
}
