import Link from "next/link";
import { notFound } from "next/navigation";

import { ChatTranscript } from "@/components/chat-transcript";
import { TutorFollowUp } from "@/components/tutor-follow-up";
import { getVocabularyById } from "@/lib/data";
import { t } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";
import { getVocabularyDisplayTerm, getVocabularySummary } from "@/lib/utils";

type VocabularyDetailProps = {
  params: Promise<{ id: string }>;
};

export default async function VocabularyDetailPage({ params }: VocabularyDetailProps) {
  const { id } = await params;
  const locale = await getLocale();
  const copy = t(locale);
  const entry = await getVocabularyById(Number(id));

  if (!entry) {
    notFound();
  }

  const transcript =
    (JSON.parse(entry.chatTranscriptJson || "[]") as Array<{
      role: "user" | "assistant";
      content: string;
      screenshotPaths?: string[];
    }>) ||
    [
      { role: "user", content: entry.learnerPrompt || entry.term },
      { role: "assistant", content: entry.aiAnswer }
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
      : entry.screenshotPath
        ? [entry.screenshotPath]
        : [];

  return (
    <main className="space-y-6">
      <Link href="/vocabulary" className="text-sm font-semibold text-ink hover:text-sun">
        {copy.navVocabulary}
      </Link>

      <section className="card">
        <p className="text-sm uppercase tracking-[0.2em] text-slate-500">{entry.language}</p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight text-ink">
          {getVocabularyDisplayTerm(entry)}
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          {getVocabularySummary(entry, locale)}
        </p>
        <div className="mt-6">
          <ChatTranscript locale={locale} messages={transcript} screenshotPaths={fallbackScreenshotPaths} />
        </div>
      </section>

      <TutorFollowUp
        locale={locale}
        language={entry.language}
        screenshotPaths={fallbackScreenshotPaths}
        initialMessages={transcript.length > 0 ? transcript : [
          { role: "user", content: entry.learnerPrompt || entry.term },
          { role: "assistant", content: entry.aiAnswer }
        ]}
      />
    </main>
  );
}
