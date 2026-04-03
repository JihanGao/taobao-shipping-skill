"use client";

import { FormEvent } from "react";
import { usePathname, useRouter } from "next/navigation";

import { Locale } from "@/lib/types";
import { t } from "@/lib/i18n";
import { getStatusLabel, MISTAKE_STATUSES, serializeMistakeFilters } from "@/lib/utils";

type FilterFormProps = {
  action: string;
  languages: string[];
  currentLanguage?: string;
  currentStatus?: string;
  locale: Locale;
};

export function FilterForm({
  action,
  languages,
  currentLanguage,
  currentStatus,
  locale
}: FilterFormProps) {
  const copy = t(locale);
  const router = useRouter();
  const pathname = usePathname();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const language = String(formData.get("language") || "");
    const rawStatus = String(formData.get("status") || "all");
    const status = rawStatus === "all" ? "" : rawStatus;
    const params = new URLSearchParams();

    if (language) {
      params.set("language", language);
    }

    if (status) {
      params.set("status", status);
    }

    document.cookie = `linguaflow_mistake_filters=${serializeMistakeFilters({
      language,
      status
    })}; path=/; max-age=2592000; samesite=lax`;

    const targetPath = action || pathname || "/mistakes";
    const href = params.size > 0 ? `${targetPath}?${params.toString()}` : targetPath;
    router.push(href);
  }

  return (
    <form action={action} onSubmit={handleSubmit} className="card flex flex-col gap-4 md:flex-row md:items-end">
      <div className="flex-1">
        <label className="mb-2 block text-sm font-medium text-slate-700">{copy.filterLanguage}</label>
        <select name="language" defaultValue={currentLanguage || ""}>
          <option value="">{copy.allLanguages}</option>
          {languages.map((language) => (
            <option key={language} value={language}>
              {language}
            </option>
          ))}
        </select>
      </div>
      <div className="flex-1">
        <label className="mb-2 block text-sm font-medium text-slate-700">{copy.filterStatus}</label>
        <select name="status" defaultValue={currentStatus || "all"}>
          <option value="all">{copy.allStatuses}</option>
          {MISTAKE_STATUSES.map((status) => (
            <option key={status} value={status}>
              {getStatusLabel(status, locale)}
            </option>
          ))}
        </select>
      </div>
      <button
        type="submit"
        className="rounded-2xl bg-ink px-5 py-3 text-sm font-semibold text-white hover:-translate-y-0.5 hover:bg-slate-800"
      >
        {copy.applyFilters}
      </button>
    </form>
  );
}
