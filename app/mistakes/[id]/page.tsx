import Link from "next/link";
import { notFound } from "next/navigation";

import { ChatTranscript } from "@/components/chat-transcript";
import { TutorFollowUp } from "@/components/tutor-follow-up";
import { getAdjacentMistakeIds, getMistakeById } from "@/lib/data";
import { t } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";
import { getMistakeDisplayTitle } from "@/lib/utils";

type MistakeDetailProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ language?: string }>;
};

export default async function MistakeDetailPage({ params, searchParams }: MistakeDetailProps) {
  const { id } = await params;
  const rawFilters = await searchParams;
  const filters = { language: rawFilters.language };
  const locale = await getLocale();
  const copy = t(locale);
  const mistake = await getMistakeById(Number(id));

  if (!mistake) {
    notFound();
  }

  const adjacent = await getAdjacentMistakeIds(mistake.id, filters);
  const query = new URLSearchParams();
  if (filters.language) {
    query.set("language", filters.language);
  }
  const suffix = query.size > 0 ? `?${query.toString()}` : "";

  const transcript =
    (JSON.parse(mistake.chatTranscriptJson || "[]") as Array<{
      role: "user" | "assistant";
      content: string;
      screenshotPaths?: string[];
    }>) ||
    [
      { role: "user", content: mistake.learnerPrompt || mistake.question },
      { role: "assistant", content: mistake.aiAnswer }
    ];
  const transcriptScreenshotPaths = Array.from(
    new Set(
      transcript
        .flatMap((message) => message.screenshotPaths || [])
        .filter((path): path is string => Boolean(path))
    )
  );
  const fallbackScreenshotPaths =
    transcriptScreenshotPaths.length > 0
      ? transcriptScreenshotPaths
      : mistake.screenshotPath
        ? [mistake.screenshotPath]
        : [];

  return (
    <main className="space-y-6">
      <Link href={`/mistakes${suffix}`} className="text-sm font-semibold text-slate-500 hover:text-slate-700">
        ← {copy.archiveBackToList}
      </Link>

      <section className="card">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-slate-500">{mistake.language}</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-ink">
              {getMistakeDisplayTitle(mistake, locale)}
            </h2>
            <p className="mt-3 text-sm text-slate-500">
              {copy.errorType}: {mistake.errorType}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {adjacent.previousId ? (
              <Link
                href={`/mistakes/${adjacent.previousId}${suffix}`}
                className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700 hover:-translate-y-0.5"
              >
                {copy.previousMistake}
              </Link>
            ) : null}
            {adjacent.nextId ? (
              <Link
                href={`/mistakes/${adjacent.nextId}${suffix}`}
                className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700 hover:-translate-y-0.5"
              >
                {copy.nextMistake}
              </Link>
            ) : null}
          </div>
        </div>
        <div className="mt-8">
          <ChatTranscript locale={locale} messages={transcript} screenshotPaths={fallbackScreenshotPaths} />
        </div>
      </section>

      <TutorFollowUp
        locale={locale}
        language={mistake.language}
        screenshotPaths={fallbackScreenshotPaths}
        persistMistakeId={mistake.id}
        initialMessages={transcript.length > 0 ? transcript : [
          { role: "user", content: mistake.learnerPrompt || mistake.question },
          { role: "assistant", content: mistake.aiAnswer }
        ]}
      />

      {(adjacent.previousId || adjacent.nextId) ? (
        <div className="flex justify-center gap-3 pb-2">
          {adjacent.previousId ? (
            <Link
              href={`/mistakes/${adjacent.previousId}${suffix}`}
              className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700 hover:-translate-y-0.5"
            >
              {copy.previousMistake}
            </Link>
          ) : null}
          {adjacent.nextId ? (
            <Link
              href={`/mistakes/${adjacent.nextId}${suffix}`}
              className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700 hover:-translate-y-0.5"
            >
              {copy.nextMistake}
            </Link>
          ) : null}
        </div>
      ) : null}
    </main>
  );
}
