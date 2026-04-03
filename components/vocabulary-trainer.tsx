"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { SUPPORTED_LANGUAGES, t } from "@/lib/i18n";
import { Locale } from "@/lib/types";
import { stripMarkdown } from "@/lib/utils";

type SpeechRecognitionCtor = new () => {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
};

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  }
}

type TrainerEntry = {
  id: number;
  language: string;
  term: string;
  learnerPrompt: string;
  aiAnswer: string;
};

function normalizeAnswer(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[¿?¡!.,/#!$%^&*;:{}=_`~()]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function extractClue(entry: TrainerEntry, locale: Locale) {
  const text = stripMarkdown(entry.aiAnswer);
  const quoted = text.match(/[“"「](.+?)[”"」]/);
  if (quoted?.[1]) {
    return quoted[1];
  }

  const firstSentence = text
    .split(/(?<=[。！？.!?])/)
    .map((line) => line.trim())
    .find(Boolean);

  if (firstSentence) {
    return firstSentence.slice(0, 70);
  }

  return locale === "zh" ? `和「${entry.term}」相关的含义` : `Meaning related to "${entry.term}"`;
}

export function VocabularyTrainer({
  locale,
  entries,
  initialLanguage
}: {
  locale: Locale;
  entries: TrainerEntry[];
  initialLanguage?: string;
}) {
  const copy = t(locale);
  const [selectedLanguage, setSelectedLanguage] = useState(initialLanguage || entries[0]?.language || "Spanish");
  const [queue, setQueue] = useState<number[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [draft, setDraft] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [resultState, setResultState] = useState<"idle" | "correct" | "incorrect">("idle");
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<InstanceType<SpeechRecognitionCtor> | null>(null);

  const languages = useMemo(
    () => Array.from(new Set(entries.map((entry) => entry.language))),
    [entries]
  );

  const filteredEntries = useMemo(
    () => entries.filter((entry) => entry.language === selectedLanguage),
    [entries, selectedLanguage]
  );

  useEffect(() => {
    setQueue(filteredEntries.map((entry) => entry.id));
    setCurrentIndex(0);
    setDraft("");
    setRevealed(false);
    setResultState("idle");
  }, [filteredEntries]);

  const currentEntry = filteredEntries.find((entry) => entry.id === queue[currentIndex]);
  const progressText = copy.trainerProgress
    .replace("{current}", String(Math.min(currentIndex + 1, Math.max(queue.length, 1))))
    .replace("{total}", String(Math.max(queue.length, 1)));

  function goNext(shouldRepeat: boolean) {
    if (!currentEntry) return;

    const remaining = queue.slice();
    const currentId = remaining.splice(currentIndex, 1)[0];

    if (shouldRepeat && currentId) {
      remaining.push(currentId);
    }

    setQueue(remaining);
    setCurrentIndex((nextIndex) => {
      if (remaining.length === 0) return 0;
      return Math.min(nextIndex, remaining.length - 1);
    });
    setDraft("");
    setRevealed(false);
    setResultState("idle");
  }

  function handleCheck() {
    if (!currentEntry || !draft.trim()) return;

    const isCorrect = normalizeAnswer(draft) === normalizeAnswer(currentEntry.term);
    setResultState(isCorrect ? "correct" : "incorrect");
    setRevealed(!isCorrect);

    window.setTimeout(() => {
      goNext(!isCorrect);
    }, isCorrect ? 700 : 1200);
  }

  function startVoiceInput() {
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }

    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) return;

    const recognition = new Recognition();
    recognition.lang =
      selectedLanguage === "Japanese" ? "ja-JP" : selectedLanguage === "Spanish" ? "es-ES" : "en-US";
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0]?.transcript || "")
        .join(" ")
        .trim();

      setDraft(transcript);
    };
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    setListening(true);
    recognition.start();
  }

  if (entries.length === 0) {
    return (
      <section className="card">
        <h3 className="section-title">{copy.trainerTitle}</h3>
        <p className="mt-3 text-sm text-slate-600">{copy.trainerEmpty}</p>
      </section>
    );
  }

  return (
    <section className="card overflow-hidden">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h3 className="section-title">{copy.trainerTitle}</h3>
          <p className="mt-3 text-sm text-slate-600">{copy.trainerDescription}</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            {copy.trainerChooseLanguage}
          </p>
          <select
            value={selectedLanguage}
            onChange={(event) => setSelectedLanguage(event.target.value)}
            className="mt-2 min-w-[12rem] border-0 bg-transparent px-0 py-0 text-base font-semibold text-ink shadow-none focus:ring-0"
          >
            {languages.map((language) => {
              const label = SUPPORTED_LANGUAGES.find((item) => item.value === language)?.label[locale] || language;
              return (
                <option key={language} value={language}>
                  {label}
                </option>
              );
            })}
          </select>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between text-sm text-slate-500">
        <span>{progressText}</span>
        <span>{currentEntry ? currentEntry.term.length : 0} letters</span>
      </div>

      {currentEntry ? (
        <div className="relative mt-6 min-h-[28rem]">
          <div className="absolute inset-x-10 top-6 h-[21rem] rounded-[2rem] bg-slate-100/70" />
          <div className="absolute inset-x-6 top-3 h-[23rem] rounded-[2rem] bg-slate-200/70" />

          <div
            className={`relative z-10 mx-auto min-h-[25rem] max-w-3xl rounded-[2.4rem] border px-8 py-8 shadow-lg transition-all ${
              resultState === "correct"
                ? "border-lime-300 bg-lime-50"
                : resultState === "incorrect"
                  ? "border-rose-300 bg-rose-50"
                  : "border-slate-200 bg-white"
            }`}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{copy.trainerClue}</p>
            <p className="mt-4 text-3xl font-semibold leading-tight text-ink">{extractClue(currentEntry, locale)}</p>

            <div className="mt-10 space-y-4">
              <label className="block text-sm font-semibold text-slate-800">{copy.trainerAnswer}</label>
              <input
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    handleCheck();
                  }
                }}
                placeholder={copy.trainerPlaceholder}
                className="w-full rounded-2xl border border-slate-200 px-4 py-4 text-lg text-slate-900 shadow-sm focus:border-sun focus:outline-none"
              />
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={startVoiceInput}
                className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-200"
              >
                {listening ? copy.trainerStopVoice : copy.trainerVoice}
              </button>
              <button
                type="button"
                onClick={handleCheck}
                className="rounded-2xl bg-ink px-5 py-3 text-sm font-semibold text-white hover:-translate-y-0.5"
              >
                {copy.trainerCheck}
              </button>
              <button
                type="button"
                onClick={() => setRevealed((current) => !current)}
                className="rounded-2xl bg-amber-100 px-4 py-3 text-sm font-semibold text-amber-800 hover:-translate-y-0.5"
              >
                {copy.trainerReveal}
              </button>
              {resultState !== "idle" ? (
                <span
                  className={`rounded-full px-3 py-2 text-xs font-semibold ${
                    resultState === "correct" ? "bg-lime-100 text-lime-800" : "bg-rose-100 text-rose-800"
                  }`}
                >
                  {resultState === "correct" ? copy.trainerCorrect : copy.trainerIncorrect}
                </span>
              ) : null}
            </div>

            {revealed ? (
              <div className="mt-8 rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  {copy.revealAnswer}
                </p>
                <p className="mt-3 text-3xl font-semibold text-slate-950">{currentEntry.term}</p>
                <p className="mt-3 text-sm leading-6 text-slate-600">{stripMarkdown(currentEntry.aiAnswer)}</p>
              </div>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="mt-6 rounded-3xl bg-lime-50 px-6 py-8">
          <h4 className="text-xl font-semibold text-ink">{copy.trainerDone}</h4>
          <p className="mt-3 text-sm text-slate-600">{copy.trainerDoneBody}</p>
        </div>
      )}
    </section>
  );
}
