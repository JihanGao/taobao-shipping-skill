import Link from "next/link";

import { Locale } from "@/lib/types";
import { t } from "@/lib/i18n";

export function EmptyState({ locale }: { locale: Locale }) {
  const copy = t(locale);

  return (
    <div className="card text-center">
      <h3 className="text-xl font-semibold text-ink">{copy.noMistakes}</h3>
      <p className="mt-3 text-sm text-slate-600">{copy.emptyDescription}</p>
      <Link
        href="/mistakes/new"
        className="mt-5 inline-flex rounded-2xl bg-sun px-5 py-3 text-sm font-semibold text-ink hover:-translate-y-0.5"
      >
        {copy.addFirst}
      </Link>
    </div>
  );
}
