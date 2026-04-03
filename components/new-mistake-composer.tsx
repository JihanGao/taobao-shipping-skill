"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChangeEvent, ClipboardEvent, KeyboardEvent, useEffect, useRef, useState } from "react";

import { LightboxImage } from "@/components/lightbox-image";
import { MarkdownAnswer } from "@/components/markdown-answer";
import { Locale, TutorQualityMode, TutorResult, VocabPackItem as StructuredVocabPackItem } from "@/lib/types";
import { SUPPORTED_LANGUAGES, t } from "@/lib/i18n";
import {
  extractGrammarSummaryBullets,
  formatDateTime,
  getMistakeDisplayTitle,
  getVocabularyDisplayTerm,
  getVocabularySummary,
  stripMarkdown,
  cn
} from "@/lib/utils";

type NewMistakeComposerProps = {
  locale: Locale;
};

type SpeechRecognitionCtor = new () => {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
};

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type ChatTurn = {
  user: ChatMessage & { screenshotPaths?: string[] };
  assistant: ChatMessage;
};

type VocabPackItem = StructuredVocabPackItem;

/**
 * Only show "Add All to Vocabulary" when user explicitly asked for a list.
 * Do NOT show for: explanation, grammar, meaning, conjugation questions.
 */
function hasListIntent(userMessage: string): boolean {
  const text = (userMessage || "").trim().toLowerCase();
  if (!text) return false;

  const listPatterns = [
    // Chinese
    /帮我列出/,
    /给我一组/,
    /列一下/,
    /所有的/,
    /一到十/,
    /所有月份/,
    /所有方位词/,
    /列个表/,
    /列个清单/,
    /列举/,
    /列出.*(月份|数字|颜色|动物|方位)/,
    // English
    /\blist\b/,
    /\bgive me all\b/,
    /\bshow me a list of\b/,
    /\bgenerate vocabulary (for)?\b/,
    /\ball (the )?(months?|numbers?|colors?|directions?|animals?)\b/,
    // Japanese
    /一覧/,
    /リスト/,
    /全部\s*(の|を)?/,
    /まとめて/
  ];

  return listPatterns.some((p) => p.test(text));
}

// Fallback-only: best-effort extraction for older/non-structured answers.
// Prefer structured `result.vocabPack` from the backend.
function extractVocabPackItems(source: string, learningLanguage: string): VocabPackItem[] {
  const lines = String(source || "").split("\n");
  const items: VocabPackItem[] = [];
  const twoColumnPattern = /^(?:\d+[.)]\s*)?(?:[-*•]\s*)?(.+?)\s*(?:-|—|–|:)\s*(.+?)\s*$/;
  const listItemPattern = /^(?:\d+[.)]\s*)?(?:[-*•]\s+)(.+?)\s*$/;
  const numberedItemPattern = /^(?:\d+[.)]\s+)(.+?)\s*$/;
  const tableRowPattern = /^\s*\|(.+)\|\s*$/;
  const metaLinePattern =
    /^(小提示|提示|记住|说明|注|例如|比如|总结|结论|你想|需要|可以|希望|如果|这些|它们|学会|在日语中|在西班牙语中|在英语中)/;

  function isLikelyMetaLine(text: string) {
    const t = text.trim();
    if (!t) return true;
    if (metaLinePattern.test(t)) return true;
    // Common “category header” bullets
    if (/^(西班牙语|日语|英语)\b/.test(t)) return true;
    if (/(月份|数字|颜色|动物|植物|天气|发音|读音|写法|文字形式)/.test(t) && t.length <= 12) return true;
    return false;
  }

  function matchesLanguageHint(word: string) {
    const w = word.trim();
    if (!w) return false;
    if (learningLanguage === "Japanese") {
      return /[\u3040-\u30ff\u4e00-\u9faf]/.test(w);
    }
    if (learningLanguage === "Spanish") {
      return /[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/.test(w);
    }
    if (learningLanguage === "English") {
      return /[A-Za-z]/.test(w);
    }
    // Unknown language: allow, but still avoid pure punctuation.
    return /[A-Za-z\u3040-\u30ff\u4e00-\u9faf]/.test(w);
  }

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    if (/^(#{1,6}\s)|^```|^>/.test(line)) continue;

    // Support markdown tables like:
    // | 月份 | 日语发音 | 文字形式 |
    // | --- | --- | --- |
    // | 1月 | いちがつ (Ichigatsu) | 一月 |
    const tableMatch = line.match(tableRowPattern);
    if (tableMatch) {
      // Skip separator rows.
      if (/^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)+\|?\s*$/.test(line)) {
        continue;
      }
      const cells = tableMatch[1]
        .split("|")
        .map((c) => c.trim())
        .filter(Boolean);
      if (cells.length >= 2) {
        // Skip header-ish rows.
        const joined = cells.join(" ").toLowerCase();
        if (/(月份|month|pronunciation|发音|读音|reading|文字形式|written)/i.test(joined)) {
          continue;
        }
        // Heuristic: use 2nd column as the main vocab "word" when present.
        const wordCandidate = (cells[1] || cells[0] || "").trim();
        const meaningCandidate = (cells[0] || "").trim();
        if (
          wordCandidate &&
          wordCandidate.length <= 80 &&
          !isLikelyMetaLine(wordCandidate) &&
          matchesLanguageHint(wordCandidate) &&
          meaningCandidate
        ) {
          items.push({ word: wordCandidate, meaning: meaningCandidate });
        }
      }
      continue;
    }

    const twoCol = line.match(twoColumnPattern);
    if (twoCol) {
      const word = twoCol[1]?.trim();
      const meaning = twoCol[2]?.trim();
      if (!word || !meaning) continue;
      if (word.length > 60 || meaning.length > 180) continue;
      if (isLikelyMetaLine(word)) continue;
      if (!matchesLanguageHint(word)) continue;
      items.push({ word, meaning });
      continue;
    }

    // Support single-column vocab lists like:
    // - 1月（いちがつ）
    // 1. 1月（いちがつ）
    const single =
      line.match(listItemPattern)?.[1]?.trim() ?? line.match(numberedItemPattern)?.[1]?.trim() ?? null;
    if (!single) continue;

    // Avoid capturing long explanatory sentences.
    if (single.length > 80) continue;
    // Avoid capturing items that look like full sentences.
    if (/[。！？.!?]\s*$/.test(single) && single.split(/\s+/).length >= 6) continue;
    if (isLikelyMetaLine(single)) continue;

    // Split "diez 10" into { word: diez, meaning: 10 } for Latin-script languages.
    if (learningLanguage === "Spanish" || learningLanguage === "English") {
      const numTail = single.match(/^(.+?)\s+(\d{1,4})\s*$/);
      if (numTail) {
        const word = numTail[1].trim();
        const meaning = numTail[2].trim();
        if (word && matchesLanguageHint(word) && meaning) {
          items.push({ word, meaning });
        }
        continue;
      }
    }

    if (!matchesLanguageHint(single)) continue;
    // Without a meaning, we don't treat it as a vocab item in fallback mode.
  }

  // Avoid false positives on tiny lists.
  return items.length >= 3 ? items : [];
}

/** Confirmation words: short replies like 好/要/想 = follow-up, not new topic */
const CONFIRMATION_WORDS = /^(好|要|想|继续|再来|那|嗯|行|再|给|要的|好的|ok|okay|yes)$/i;

/** User is asking what a word means = new topic (fresh word lookup) */
function isWordMeaningQuestion(input: string): boolean {
  const t = input.trim();
  if (!t || t.length > 80) return false;
  return (
    /是什么意思|什么意思|是什么意|怎么读|怎么念|怎么翻译|是什么$/.test(t) ||
    /what does .+ mean|what is .+ mean|what\'?s .+ mean|meaning of/i.test(t) ||
    /how do you say|how to say .+ in/i.test(t)
  );
}

function isNewTopicTurn(params: {
  userInput: string;
  files: File[];
  turns: ChatTurn[];
  currentSegmentRoot: TutorResult | null;
}) {
  if (params.turns.length === 0) return true;
  if (params.files.length > 0) return true;

  const trimmed = params.userInput.trim();
  if (!trimmed) return false;

  if (isWordMeaningQuestion(trimmed)) return true;

  const wordCount = trimmed.split(/\s+/).filter(Boolean).length;
  const isSingleWord = wordCount === 1;
  const isConfirmationWord = CONFIRMATION_WORDS.test(trimmed);

  if (isSingleWord && !isConfirmationWord) return true;

  return false;
}

type OverviewItem = {
  id: number;
  learnerPrompt: string;
  question?: string;
  term?: string;
  aiAnswer: string;
  summaryJson?: string;
  createdAt?: string;
};

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  }
}

const languageMap = {
  English: "English",
  Japanese: "Japanese",
  Spanish: "Espanol"
} as const;

const languageDetectionPatterns: Array<{ language: "English" | "Japanese" | "Spanish"; test: RegExp }> = [
  // Japanese: require hiragana/katakana OR explicit Japanese keyword (avoid Chinese-only → Japanese)
  {
    language: "Japanese",
    test: /[\u3040-\u30ff]|(日语|日文|假名|平假名|片假名|ひらがな|カタカナ)/
  },
  { language: "Spanish", test: /[áéíóúñ¿¡]|\b(por qué|estás|reunirse|gustar|duolingo|español)\b/i },
  { language: "English", test: /\b(why|what|how|using|shampoo|explain|grammar)\b/i }
];

function getPromptPlaceholder(language: string, locale: Locale, fallback: string) {
  if (locale === "zh" && language === "Spanish") {
    return "为什么这个题用 reunise 而不是 se reunen";
  }

  if (locale === "zh" && language === "Japanese") {
    return "比如：しらへ 是不是其实想写 しらべ？";
  }

  return fallback;
}

function detectLanguageFromDraft(input: string) {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const matched = languageDetectionPatterns.find((pattern) => pattern.test.test(trimmed));
  return matched?.language ?? null;
}

export function NewMistakeComposer({ locale }: NewMistakeComposerProps) {
  const copy = t(locale);
  const router = useRouter();
  const [selectedLanguage, setSelectedLanguage] = useState("Spanish");
  const [languageLocked, setLanguageLocked] = useState(false);
  const [qualityMode, setQualityMode] = useState<TutorQualityMode>("fast");
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [result, setResult] = useState<TutorResult | null>(null);
  const [segmentRootResult, setSegmentRootResult] = useState<TutorResult | null>(null);
  const [segmentStartTurnIndex, setSegmentStartTurnIndex] = useState(0);
  const [screenshotFiles, setScreenshotFiles] = useState<File[]>([]);
  const [screenshotPaths, setScreenshotPaths] = useState<string[]>([]);
  const [screenshotPreviews, setScreenshotPreviews] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceError, setVoiceError] = useState("");
  const [saveMessage, setSaveMessage] = useState("");
  const [vocabPackSavingByTurn, setVocabPackSavingByTurn] = useState<Record<number, boolean>>({});
  const [vocabPackAddedByTurn, setVocabPackAddedByTurn] = useState<Record<number, boolean>>({});
  const [savedState, setSavedState] = useState({ mistake: false, vocabulary: false });
  const [overview, setOverview] = useState<{ mistakes: OverviewItem[]; vocabulary: OverviewItem[] }>({
    mistakes: [],
    vocabulary: []
  });
  const recognitionRef = useRef<InstanceType<SpeechRecognitionCtor> | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let active = true;

    async function loadOverview() {
      const response = await fetch(`/api/library/overview?language=${encodeURIComponent(selectedLanguage)}`);
      const data = await response.json();
      if (active) {
        setOverview(data);
      }
    }

    loadOverview();

    return () => {
      active = false;
    };
  }, [selectedLanguage]);

  useEffect(() => {
    const detected = detectLanguageFromDraft(draft);
    if (!languageLocked && detected && detected !== selectedLanguage) {
      setSelectedLanguage(detected);
    }
  }, [draft, selectedLanguage, languageLocked]);

  async function askTutor(
    nextMessages: ChatMessage[],
    files: File[] = [],
    options?: {
      startsNewTopic?: boolean;
      existingPaths?: string[];
      baseTurns?: ChatTurn[];
    }
  ) {
    setIsLoading(true);
    setSaveMessage("");

    try {
      const formData = new FormData();
      formData.append("language", selectedLanguage);
      formData.append("locale", locale);
      formData.append("qualityMode", qualityMode);
      formData.append("messages", JSON.stringify(nextMessages));
      const pathsForRequest = options?.existingPaths ?? screenshotPaths;
      if (pathsForRequest.length > 0) {
        formData.append("existingScreenshotPaths", JSON.stringify(pathsForRequest));
      }
      for (const file of files) {
        formData.append("screenshots", file);
      }

      const response = await fetch("/api/tutor", {
        method: "POST",
        body: formData
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error("Tutor API error:", response.status, errText);
        setSaveMessage(locale === "zh" ? "请求失败，请稍后重试" : "Request failed, please try again");
        return;
      }

      const data = (await response.json()) as TutorResult;
    const updatedMessages = [...nextMessages, { role: "assistant" as const, content: data.assistantReply }];
    const latestUserMessage = nextMessages[nextMessages.length - 1];
    const turnScreenshotPaths = files.length > 0 ? data.newScreenshotPaths || data.screenshotPaths || [] : [];
    const startsNewTopic = options?.startsNewTopic ?? false;
    const baseTurns = options?.baseTurns ?? turns;

    setMessages(updatedMessages);
    if (latestUserMessage?.role === "user") {
      const nextTurn = {
        user: {
          role: "user" as const,
          content: latestUserMessage.content,
          screenshotPaths: turnScreenshotPaths
        },
        assistant: {
          role: "assistant" as const,
          content: data.assistantReply
        }
      };
      setTurns(startsNewTopic ? [nextTurn] : [...baseTurns, nextTurn]);
    }
    setResult(data);
    if (startsNewTopic || !segmentRootResult) {
      setSegmentRootResult(data);
      setSegmentStartTurnIndex(0);
    }
    // Only accept detectedLanguage if it's a valid learning language (avoids "Chinese" → undefined)
    const validDetected =
      data.detectedLanguage && data.detectedLanguage in languageMap
        ? data.detectedLanguage
        : null;
    if (!languageLocked && validDetected && validDetected !== selectedLanguage) {
      setSelectedLanguage(validDetected);
    }
    setScreenshotPaths(startsNewTopic ? turnScreenshotPaths : data.screenshotPaths || []);
    setSavedState({ mistake: false, vocabulary: false });
    } catch (err) {
      console.error("askTutor error:", err);
      setSaveMessage(locale === "zh" ? "请求失败，请检查网络或稍后重试" : "Request failed, check network or try again");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleAsk() {
    const trimmedDraft = draft.trim();
    if (!trimmedDraft && screenshotFiles.length === 0) return;

    const userMessage = { role: "user" as const, content: trimmedDraft };
    const startsNewTopic = isNewTopicTurn({
      userInput: userMessage.content,
      files: screenshotFiles,
      turns,
      currentSegmentRoot: segmentRootResult
    });
    const nextMessages = startsNewTopic ? [userMessage] : [...messages, userMessage];
    await askTutor(nextMessages, screenshotFiles, {
      startsNewTopic,
      existingPaths: startsNewTopic ? [] : screenshotPaths,
      baseTurns: startsNewTopic ? [] : turns
    });
    setDraft("");
    setScreenshotFiles([]);
    setScreenshotPreviews([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function saveToCollection(kind: "mistakes" | "vocabulary") {
    if (!result || turns.length === 0) return;

    setIsSaving(true);
    const latestTurn = turns[turns.length - 1];
    const currentSegmentTurns = turns.slice(segmentStartTurnIndex);
    const segmentFirstTurn = currentSegmentTurns[0] || latestTurn;
    const titleForSave = kind === "vocabulary" ? result.title : segmentRootResult?.title || result.title;
    const termForSave =
      kind === "vocabulary" ? result.suggestedTerm : segmentRootResult?.suggestedTerm || result.suggestedTerm;
    const answerForSave =
      kind === "vocabulary" ? result.assistantReply : segmentRootResult?.assistantReply || result.assistantReply;
    const summaryZhForSave =
      kind === "vocabulary" ? result.summaryZh || "" : segmentRootResult?.summaryZh || result.summaryZh || "";
    const summaryEnForSave =
      kind === "vocabulary" ? result.summaryEn || "" : segmentRootResult?.summaryEn || result.summaryEn || "";
    const response = await fetch(`/api/library/${kind}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        language: selectedLanguage,
        learnerPrompt: latestTurn.user.content || result.title,
        title: titleForSave,
        term: termForSave,
        reading: result.suggestedReading ?? "",
        suggestedPartOfSpeech: result.suggestedPartOfSpeech ?? undefined,
        aiAnswer: answerForSave,
        summaryZh: summaryZhForSave,
        summaryEn: summaryEnForSave,
        screenshotPath: segmentFirstTurn.user.screenshotPaths?.[0] || latestTurn.user.screenshotPaths?.[0] || null,
        isSimpleWord: result.isSimpleWord,
        errorType: result.errorType,
        chatTranscript: currentSegmentTurns.flatMap((turn) => [turn.user, turn.assistant])
      })
    });

    if (response.ok) {
      const refreshed = await fetch(
        `/api/library/overview?language=${encodeURIComponent(selectedLanguage)}`
      ).then((res) => res.json());
      setOverview(refreshed);
      setSavedState((current) => ({
        ...current,
        [kind === "mistakes" ? "mistake" : "vocabulary"]: true
      }));
      setSaveMessage(kind === "mistakes" ? copy.savedToMistakes : copy.savedToVocabulary);
    }

    setIsSaving(false);
  }

  async function saveVocabPack(turnIndex: number, items: VocabPackItem[]) {
    if (items.length === 0) return;
    if (vocabPackSavingByTurn[turnIndex]) return;

    setVocabPackSavingByTurn((prev) => ({ ...prev, [turnIndex]: true }));
    try {
      const seen = new Set<string>();
      const deduped = items.filter((it) => {
        const key = `${it.word}||${it.reading || ""}||${it.meaning}`.trim().toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      // IMPORTANT: save sequentially to avoid overloading Next dev HMR (we observed missing .next chunks with concurrent writes).
      for (const item of deduped) {
        try {
          await fetch(`/api/library/vocabulary`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              language: selectedLanguage,
              learnerPrompt: item.word,
              title: item.word,
              term: item.word,
              reading: item.reading || "",
              aiAnswer: item.meaning || "",
              summaryZh: locale === "zh" ? item.meaning || "" : "",
              summaryEn: locale === "en" ? item.meaning || "" : "",
              screenshotPath: null,
              isSimpleWord: true,
              errorType: "vocab_pack",
              chatTranscript: []
            })
          });
        } catch {
          // best-effort: continue
        }
      }
      setVocabPackAddedByTurn((prev) => ({ ...prev, [turnIndex]: true }));
      setSaveMessage(locale === "zh" ? "已加入单词簿。" : "Added to vocabulary.");
      setSavedState((current) => ({ ...current, vocabulary: true }));
      // Re-fetch overview so vocabulary list updates immediately
      const refreshed = await fetch(
        `/api/library/overview?language=${encodeURIComponent(selectedLanguage)}`
      ).then((res) => res.json());
      setOverview(refreshed);
    } finally {
      setVocabPackSavingByTurn((prev) => ({ ...prev, [turnIndex]: false }));
    }
  }

  function resetComposer() {
    setDraft("");
    setMessages([]);
    setTurns([]);
    setResult(null);
    setSegmentRootResult(null);
    setSegmentStartTurnIndex(0);
    setScreenshotFiles([]);
    setScreenshotPreviews([]);
    setScreenshotPaths([]);
    setLanguageLocked(false);
    setSaveMessage("");
    setSavedState({ mistake: false, vocabulary: false });
  }

  function handleNewQuestion() {
    const message =
      savedState.mistake || savedState.vocabulary
        ? copy.newQuestionConfirmSaved
        : copy.newQuestionConfirmUnsaved;

    if (window.confirm(message)) {
      resetComposer();
    }
  }

  function appendImages(files: File[]) {
    if (files.length === 0) return;

    setScreenshotFiles((current) => [...current, ...files]);
    setScreenshotPreviews((current) => [...current, ...files.map((file) => URL.createObjectURL(file))]);
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    appendImages(Array.from(event.target.files || []));
  }

  function handlePaste(event: ClipboardEvent<HTMLTextAreaElement>) {
    const items = Array.from(event.clipboardData.items || []);
    const imageFiles = items
      .filter((item) => item.type.startsWith("image/"))
      .map((item) => item.getAsFile())
      .filter((file): file is File => Boolean(file));

    appendImages(imageFiles);
  }

  function removeImage(indexToRemove: number) {
    setScreenshotFiles((current) => current.filter((_, index) => index !== indexToRemove));
    setScreenshotPreviews((current) => current.filter((_, index) => index !== indexToRemove));
  }

  function hasUnsavedConversation() {
    return messages.length > 0 && !savedState.mistake && !savedState.vocabulary;
  }

  function confirmLeaveCurrentConversation() {
    if (!hasUnsavedConversation()) {
      return true;
    }

    return window.confirm(copy.leavePageConfirmUnsaved);
  }

  function handleDraftKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      void handleAsk();
    }
  }

  function handleOverviewNavigate(path: string) {
    if (confirmLeaveCurrentConversation()) {
      router.push(path);
    }
  }

  function startVoiceInput() {
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }

    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!Recognition) {
      setVoiceError(copy.browserUnsupported);
      return;
    }

    setVoiceError("");
    const recognition = new Recognition();
    recognition.lang = locale === "zh" ? "zh-CN" : "en-US";
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0]?.transcript || "")
        .join(" ")
        .trim();

      setDraft((current) => [current, transcript].filter(Boolean).join(current ? "\n" : ""));
    };
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    setListening(true);
    recognition.start();
  }

  const hasVocabPack =
    (result?.vocabPack?.type === "vocab_pack" && (result.vocabPack?.items?.length ?? 0) > 0) ||
    (!!result?.assistantReply && extractVocabPackItems(result.assistantReply, selectedLanguage).length > 0);
  // Only disable both when user explicitly asked for a list (Add All is the primary action)
  const latestUserContent =
    [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
  const listOnlyMode = hasVocabPack && hasListIntent(latestUserContent);
  const isVerbForm = result?.suggestedPartOfSpeech === "verb";
  // Spanish infinitives (avisar, poder) = word meaning → disable mistakes; conjugated forms (pude, eran) = enable both
  const isSpanishVerbInfinitive =
    selectedLanguage.toLowerCase().includes("spanish") &&
    isVerbForm &&
    /(ar|er|ir)$/i.test(result?.suggestedTerm?.trim() ?? "");
  const isConjugatedVerbForm = isVerbForm && !isSpanishVerbInfinitive;
  const mistakesDisabled =
    !result ||
    listOnlyMode ||
    isSpanishVerbInfinitive ||
    (result.isSimpleWord && !isConjugatedVerbForm);
  const vocabDisabled =
    !result ||
    listOnlyMode ||
    (!isSpanishVerbInfinitive && (!result.isSimpleWord && !isConjugatedVerbForm));
  const vocabLabel =
    languageMap[selectedLanguage as keyof typeof languageMap] ?? selectedLanguage ?? "—";
  const chatMode = messages.length > 0;

  return (
    <div className="space-y-6">
      <div className="card overflow-hidden p-0">
        <div className="border-b border-slate-200 px-6 py-5">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-slate-500">{copy.liveAnswer}</p>
              <h3 className="mt-1 text-2xl font-semibold text-ink">{copy.askTitle}</h3>
            </div>
            <div className="flex flex-wrap gap-3">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  {copy.targetLanguage}
                </p>
                <select
                  value={selectedLanguage}
                  onChange={(event) => {
                    setSelectedLanguage(event.target.value);
                    setLanguageLocked(true);
                  }}
                  className="mt-2 min-w-[12rem] border-0 bg-transparent px-0 py-0 text-base font-semibold text-ink shadow-none focus:ring-0"
                >
                  {SUPPORTED_LANGUAGES.map((language) => (
                    <option key={language.value} value={language.value}>
                      {language.label[locale]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  {copy.qualityMode}
                </p>
                <select
                  value={qualityMode}
                  onChange={(event) => setQualityMode(event.target.value as TutorQualityMode)}
                  className="mt-2 min-w-[14rem] border-0 bg-transparent px-0 py-0 text-base font-semibold text-ink shadow-none focus:ring-0"
                >
                  <option value="fast">{copy.qualityFast}</option>
                  <option value="high">{copy.qualityHigh}</option>
                </select>
                <p className="mt-2 text-xs text-slate-500">
                  {qualityMode === "high" ? copy.qualityHighHint : copy.qualityFastHint}
                </p>
              </div>
            </div>
          </div>
        </div>

          {result?.provider === "mock" ? (
            <div className="border-b border-amber-200 bg-amber-50 px-6 py-3 text-sm text-amber-900">
              {copy.mockWarning}
            </div>
          ) : null}

        <div className={`${chatMode ? "min-h-[16rem]" : "min-h-[4rem]"} space-y-4 bg-white px-6 py-4`}>
          {messages.length === 0 ? (
            <div className="rounded-2xl bg-slate-50 px-5 py-4 text-sm leading-6 text-slate-600">
              {copy.chatEmptyHint}
            </div>
          ) : (
            turns.map((turn, index) => (
              <div key={`turn-${index}`} className="space-y-4">
                <div className="flex justify-end">
                  <div className="w-fit max-w-[min(34rem,80%)] rounded-3xl bg-ink p-5 text-sm leading-7 text-white">
                    {turn.user.screenshotPaths && turn.user.screenshotPaths.length > 0 ? (
                      <div className="mb-3 flex flex-wrap gap-3">
                        {turn.user.screenshotPaths.map((path, imageIndex) => (
                          <LightboxImage
                            key={`${path}-${imageIndex}`}
                            src={path}
                            alt={`${copy.screenshot} ${imageIndex + 1}`}
                            thumbClassName="h-28 w-28 rounded-2xl border border-white/20 object-cover"
                          />
                        ))}
                      </div>
                    ) : null}
                    <p className="whitespace-pre-wrap">{turn.user.content}</p>
                  </div>
                </div>
                <div className="flex justify-start">
                  <div className="max-w-[92%] rounded-3xl bg-mist p-5 text-sm leading-7 text-slate-800">
                    <MarkdownAnswer content={turn.assistant.content} />
                    {(() => {
                      if (!hasListIntent(turn.user.content)) return null;
                      const structured = (result?.vocabPack?.type === "vocab_pack" ? result.vocabPack : null);
                      const items =
                        structured?.items?.length
                          ? structured.items
                          : extractVocabPackItems(turn.assistant.content, selectedLanguage);
                      if (items.length === 0) return null;

                      const added = Boolean(vocabPackAddedByTurn[index]);
                      const saving = Boolean(vocabPackSavingByTurn[index]);

                      return (
                        <div className="mt-4 rounded-2xl border border-slate-200 bg-white/70 p-4 shadow-sm">
                          <div className="flex items-baseline justify-between gap-3">
                            <p className="text-sm font-semibold text-slate-900">
                              {structured?.title
                                ? `${structured.title}（${items.length}）`
                                : locale === "zh"
                                  ? `词汇包（检测到 ${items.length} 个）`
                                  : `Vocab pack (${items.length} detected)`}
                            </p>
                            <button
                              type="button"
                              disabled={saving || added}
                              onClick={() => saveVocabPack(index, items)}
                              className={cn(
                                "rounded-2xl px-4 py-2 text-sm font-semibold transition",
                                added
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-amber-100 text-amber-800 hover:-translate-y-0.5 hover:bg-amber-200",
                                saving || added ? "cursor-not-allowed opacity-70" : ""
                              )}
                            >
                              {added
                                ? locale === "zh"
                                  ? "已加入"
                                  : "Added"
                                : saving
                                  ? locale === "zh"
                                    ? "加入中..."
                                    : "Adding..."
                                  : "Add All to Vocabulary"}
                            </button>
                          </div>

                          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-800">
                            {items.map((it, itemIndex) => (
                              <li key={`${it.word}-${itemIndex}`}>
                                <span className="font-semibold">
                                  {it.word}
                                  {it.reading ? `（${it.reading}）` : ""}
                                </span>
                                <span className="ml-3 text-xs font-normal text-slate-600">- {it.meaning}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>
            ))
          )}

          {isLoading ? (
            <div className="mr-auto inline-flex rounded-3xl bg-mist px-5 py-4 text-sm text-slate-700">
              <span className="animate-pulse">{copy.typingLabel}</span>
            </div>
          ) : null}

        </div>

        <div className="border-t border-slate-200 px-6 py-5">
          <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm">
            {screenshotPreviews.length > 0 ? (
              <div className="mb-4 flex flex-wrap gap-3">
                {screenshotPreviews.map((preview, index) => (
                  <div
                    key={`${preview}-${index}`}
                    className="inline-flex max-w-[11rem] flex-col rounded-2xl border border-slate-200 bg-slate-50 p-2"
                  >
                    <div className="mb-2 flex items-center justify-between gap-2 px-1">
                      <span className="text-xs font-semibold text-slate-600">{copy.imageReady}</span>
                      <button
                        type="button"
                        onClick={() => {
                          removeImage(index);
                          if (fileInputRef.current && screenshotPreviews.length === 1) {
                            fileInputRef.current.value = "";
                          }
                        }}
                        className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white text-sm font-semibold text-slate-500 hover:bg-slate-200 hover:text-slate-700"
                        aria-label={copy.removeImage}
                      >
                        x
                      </button>
                    </div>
                    <img
                      src={preview}
                      alt={`${copy.screenshot} ${index + 1}`}
                      className="h-24 w-full rounded-xl object-cover"
                    />
                  </div>
                ))}
              </div>
            ) : null}

            <textarea
              rows={chatMode ? 3 : 4}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onPaste={handlePaste}
              onKeyDown={handleDraftKeyDown}
              placeholder={getPromptPlaceholder(selectedLanguage, locale, copy.learnerPromptPlaceholder)}
              className="min-h-[5.5rem] border-0 px-1 py-1 text-base leading-7 shadow-none focus:border-0 focus:ring-0"
            />

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleFileChange}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-2xl font-semibold text-slate-700 hover:bg-slate-200"
              >
                +
              </button>
              <button
                type="button"
                onClick={startVoiceInput}
                className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700 hover:-translate-y-0.5 hover:bg-slate-200"
              >
                {listening ? copy.stopRecording : copy.voiceInput}
              </button>
              {screenshotFiles.length > 0 ? (
                <span className="rounded-full bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-800">
                  {copy.imageReady}
                </span>
              ) : null}
              <div className="ml-auto flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleAsk}
                  disabled={isLoading}
                  className="rounded-2xl bg-ink px-5 py-3 text-sm font-semibold text-white hover:-translate-y-0.5 disabled:opacity-70"
                >
                  {chatMode ? copy.followUpButton : copy.askTutorButton}
                </button>
              </div>
            </div>
          </div>

          {voiceError ? <p className="mt-3 text-sm text-rose-600">{voiceError}</p> : null}

          {chatMode ? (
            <div className="mt-4 flex flex-wrap gap-3">
              <span className="group relative inline-flex">
                <button
                  type="button"
                  disabled={isSaving || mistakesDisabled}
                  onClick={() => saveToCollection("mistakes")}
                  className="rounded-2xl bg-sky-100 px-4 py-3 text-sm font-semibold text-sky-800 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {copy.addToMistakes.replace("{language}", vocabLabel)}
                </button>
                {mistakesDisabled ? (
                  <span className="pointer-events-none absolute -top-12 left-1/2 hidden w-max max-w-[24rem] -translate-x-1/2 whitespace-nowrap rounded-xl bg-slate-900 px-4 py-2 text-xs font-medium text-white shadow-lg group-hover:block">
                    {hasVocabPack ? copy.vocabBulkHint : copy.mistakeDisabledHintStrong}
                  </span>
                ) : null}
              </span>
              <span className="group relative inline-flex">
                <button
                  type="button"
                  disabled={isSaving || vocabDisabled}
                  onClick={() => saveToCollection("vocabulary")}
                  className="rounded-2xl bg-amber-100 px-4 py-3 text-sm font-semibold text-amber-800 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {copy.addToVocabulary.replace("{language}", vocabLabel)}
                </button>
                {vocabDisabled ? (
                  <span className="pointer-events-none absolute -top-12 left-1/2 hidden w-max max-w-[24rem] -translate-x-1/2 whitespace-nowrap rounded-xl bg-slate-900 px-4 py-2 text-xs font-medium text-white shadow-lg group-hover:block">
                    {hasVocabPack ? copy.vocabBulkHint : copy.vocabDisabledHintStrong}
                  </span>
                ) : null}
              </span>
              <button
                type="button"
                onClick={handleNewQuestion}
                className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700 hover:-translate-y-0.5"
              >
                {copy.newQuestion}
              </button>
            </div>
          ) : null}

          {saveMessage ? <p className="mt-3 text-sm text-sage">{saveMessage}</p> : null}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card">
            <div className="flex items-center justify-between">
            <h3 className="section-title">{copy.recentMistakesFor.replace("{language}", vocabLabel)}</h3>
            <button
              type="button"
              onClick={() => handleOverviewNavigate(`/mistakes?language=${encodeURIComponent(selectedLanguage)}`)}
              className="text-sm font-semibold text-ink hover:text-sun"
            >
              {copy.viewAll}
            </button>
          </div>
          <div className="mt-4 space-y-3">
            {overview.mistakes.length === 0 ? (
              <p className="text-sm text-slate-500">{copy.noRecentMistakes}</p>
            ) : (
              overview.mistakes.slice(0, 5).map((item) => (
                (() => {
                  const bullets = extractGrammarSummaryBullets(item.aiAnswer);

                  return (
                    <Link
                      key={item.id}
                      href={`/mistakes/${item.id}`}
                      className="block rounded-2xl bg-slate-50 p-4 hover:bg-slate-100"
                    >
                      <p className="font-semibold text-slate-900">
                        {getMistakeDisplayTitle(
                          {
                            learnerPrompt: item.learnerPrompt,
                            question: item.question || "",
                            aiAnswer: item.aiAnswer
                          },
                          locale
                        )}
                      </p>
                      {item.createdAt ? (
                        <p className="mt-1 text-xs text-slate-500">{formatDateTime(item.createdAt, locale)}</p>
                      ) : null}
                      {bullets.length > 0 ? (
                        <ul className="mt-3 space-y-2 text-sm text-slate-600">
                          {bullets.map((bullet, index) => (
                            <li key={`${item.id}-bullet-${index}`} className="ml-5 list-disc">
                              {bullet}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-3 line-clamp-3 text-sm text-slate-600">{stripMarkdown(item.aiAnswer)}</p>
                      )}
                    </Link>
                  );
                })()
              ))
            )}
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <h3 className="section-title">
              {copy.recentVocabularyFor.replace("{language}", vocabLabel)}
            </h3>
            <button
              type="button"
              onClick={() => handleOverviewNavigate(`/vocabulary?language=${encodeURIComponent(selectedLanguage)}`)}
              className="text-sm font-semibold text-ink hover:text-sun"
            >
              {copy.viewAll}
            </button>
          </div>
          <div className="mt-4 space-y-3">
            {overview.vocabulary.length === 0 ? (
              <p className="text-sm text-slate-500">{copy.noRecentVocabulary}</p>
            ) : (
              overview.vocabulary.slice(0, 20).map((item) => (
                <Link
                  key={item.id}
                  href={`/vocabulary/${item.id}`}
                  className="block rounded-2xl bg-slate-50 p-4 hover:bg-slate-100"
                >
                  <p className="font-semibold text-slate-900">
                    {getVocabularyDisplayTerm(item)}
                  </p>
                  <p className="mt-2 line-clamp-2 text-sm text-slate-600">
                    {getVocabularySummary(item, locale)}
                  </p>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
