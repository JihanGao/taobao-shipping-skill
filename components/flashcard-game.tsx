"use client";

import { useState } from "react";

import { Locale } from "@/lib/types";
import { t } from "@/lib/i18n";

export function FlashcardGame({
  locale,
  front,
  back
}: {
  locale: Locale;
  front: string;
  back: string;
}) {
  const copy = t(locale);
  const [revealed, setRevealed] = useState(false);

  return (
    <section className="card">
      <h3 className="section-title">{copy.flashcards}</h3>
      <p className="mt-3 text-sm text-slate-600">{copy.flashcardPrompt}</p>
      <div className="mt-5 rounded-3xl bg-amber-50 p-6">
        <p className="text-lg font-semibold text-slate-900">{front}</p>
        {revealed ? <p className="mt-4 whitespace-pre-wrap text-sm text-slate-700">{back}</p> : null}
      </div>
      <button
        type="button"
        onClick={() => setRevealed((current) => !current)}
        className="mt-4 rounded-2xl bg-ink px-4 py-3 text-sm font-semibold text-white"
      >
        {copy.revealAnswer}
      </button>
    </section>
  );
}
