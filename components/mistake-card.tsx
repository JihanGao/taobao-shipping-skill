import Link from "next/link";
import Image from "next/image";
import { Mistake } from "@prisma/client";

import { StatusBadge } from "@/components/status-badge";
import { Locale } from "@/lib/types";
import {
  extractGrammarSummaryBullets,
  formatDateTime,
  getMistakeDisplayTitle,
  isGenericScreenshotPrompt,
  stripMarkdown
} from "@/lib/utils";

export function MistakeCard({
  mistake,
  locale,
  currentLanguage,
  currentStatus
}: {
  mistake: Mistake;
  locale: Locale;
  currentLanguage?: string;
  currentStatus?: string;
}) {
  const bullets = extractGrammarSummaryBullets(mistake.aiAnswer);
  const params = new URLSearchParams();

  if (currentLanguage) {
    params.set("language", currentLanguage);
  }

  if (currentStatus) {
    params.set("status", currentStatus);
  }

  const href = params.size > 0 ? `/mistakes/${mistake.id}?${params.toString()}` : `/mistakes/${mistake.id}`;
  const previewPrompt =
    mistake.learnerPrompt && !isGenericScreenshotPrompt(mistake.learnerPrompt)
      ? mistake.learnerPrompt
      : mistake.question && !isGenericScreenshotPrompt(mistake.question)
        ? mistake.question
        : "";

  return (
    <Link
      href={href}
      className="card block hover:-translate-y-1 hover:border-slate-200"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">
            {mistake.language}
          </p>
          <h3 className="mt-2 line-clamp-2 text-xl font-semibold text-ink">
            {getMistakeDisplayTitle(mistake, locale)}
          </h3>
          <p className="mt-2 text-xs text-slate-500">{formatDateTime(mistake.createdAt, locale)}</p>
        </div>
        <StatusBadge status={mistake.status} locale={locale} />
      </div>

      <div className="mt-5 flex gap-4">
        {mistake.screenshotPath ? (
          <div className="shrink-0 overflow-hidden rounded-2xl border border-slate-200">
            <Image
              src={mistake.screenshotPath}
              alt=""
              width={112}
              height={112}
              className="h-24 w-24 object-cover"
            />
          </div>
        ) : null}

        <div className="min-w-0 flex-1">
          {previewPrompt ? <p className="line-clamp-2 text-sm text-slate-600">{previewPrompt}</p> : null}
          {bullets.length > 0 ? (
            <ul className={`${previewPrompt ? "mt-3" : ""} space-y-2 text-sm text-slate-700`}>
              {bullets.map((bullet, index) => (
                <li key={`${mistake.id}-summary-${index}`} className="ml-5 list-disc">
                  {bullet}
                </li>
              ))}
            </ul>
          ) : (
            <p className={`${previewPrompt ? "mt-3" : ""} line-clamp-2 text-sm text-slate-600`}>
              {stripMarkdown(mistake.aiAnswer)}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}
