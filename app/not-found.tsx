import Link from "next/link";
import { t } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";

export default async function NotFound() {
  const locale = await getLocale();
  const copy = t(locale);

  return (
    <main className="card mx-auto max-w-2xl text-center">
      <h2 className="text-3xl font-semibold text-ink">{copy.mistakNotFound}</h2>
      <p className="mt-3 text-sm text-slate-600">{copy.notFoundDescription}</p>
      <Link
        href="/mistakes"
        className="mt-6 inline-flex rounded-2xl bg-ink px-5 py-3 text-sm font-semibold text-white"
      >
        {copy.returnToMistakes}
      </Link>
    </main>
  );
}
