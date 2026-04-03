"use client";

import { ChangeEvent, ClipboardEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { MarkdownAnswer } from "@/components/markdown-answer";
import { LightboxImage } from "@/components/lightbox-image";
import { Locale } from "@/lib/types";
import { t } from "@/lib/i18n";

type Message = {
  role: "user" | "assistant";
  content: string;
  screenshotPaths?: string[];
};

type TutorFollowUpProps = {
  locale: Locale;
  language: string;
  initialMessages: Message[];
  screenshotPaths?: string[];
  persistMistakeId?: number;
};

export function TutorFollowUp({
  locale,
  language,
  initialMessages,
  screenshotPaths = [],
  persistMistakeId
}: TutorFollowUpProps) {
  const copy = t(locale);
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [followUps, setFollowUps] = useState<Message[]>([]);
  const [saveMessage, setSaveMessage] = useState("");
  const [screenshotFiles, setScreenshotFiles] = useState<File[]>([]);
  const [screenshotPreviews, setScreenshotPreviews] = useState<string[]>([]);
  const [allScreenshotPaths, setAllScreenshotPaths] = useState<string[]>(screenshotPaths);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setAllScreenshotPaths(screenshotPaths);
  }, [screenshotPaths]);

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

  async function submitFollowUp() {
    if (!draft.trim() && screenshotFiles.length === 0) return;

    const userMessage = {
      role: "user" as const,
      content: draft.trim()
    };
    const nextMessages = [...messages, userMessage];
    setLoading(true);

    const formData = new FormData();
    formData.append("language", language);
    formData.append("locale", locale);
    formData.append("messages", JSON.stringify(nextMessages));
    if (allScreenshotPaths.length > 0) {
      formData.append("existingScreenshotPaths", JSON.stringify(allScreenshotPaths));
    }
    for (const file of screenshotFiles) {
      formData.append("screenshots", file);
    }

    const response = await fetch("/api/tutor", {
      method: "POST",
      body: formData
    });

    const data = await response.json();
    const assistantMessage = { role: "assistant" as const, content: data.assistantReply };
    const nextScreenshotPaths = Array.from(new Set([...allScreenshotPaths, ...(data.newScreenshotPaths || [])]));
    const enrichedUserMessage = {
      ...userMessage,
      screenshotPaths: data.newScreenshotPaths || []
    };
    setMessages([...nextMessages, assistantMessage]);
    setFollowUps((current) => [...current, enrichedUserMessage, assistantMessage]);
    setAllScreenshotPaths(nextScreenshotPaths);
    setDraft("");
    setScreenshotFiles([]);
    setScreenshotPreviews([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setSaveMessage("");
    setLoading(false);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submitFollowUp();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      void submitFollowUp();
    }
  }

  async function saveToCurrentMistake() {
    if (!persistMistakeId || followUps.length === 0) return;

    const response = await fetch(`/api/library/mistakes/${persistMistakeId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        appendedTranscript: followUps
      })
    });

    if (response.ok) {
      setFollowUps([]);
      setSaveMessage(copy.savedToCurrentMistake);
      router.refresh();
    }
  }

  function cancelFollowUps() {
    setMessages(initialMessages);
    setFollowUps([]);
    setDraft("");
    setSaveMessage("");
  }

  return (
    <section className="card">
      <h3 className="section-title">{copy.askAgain}</h3>
      {followUps.length > 0 ? (
        <div className="mt-4 space-y-3">
          {followUps.map((message, index) => (
            <div
              key={`${message.role}-${index}`}
              className={`flex ${message.role === "assistant" ? "justify-start" : "justify-end"}`}
            >
              <div
                className={`rounded-3xl p-4 text-sm leading-7 ${
                  message.role === "assistant"
                    ? "max-w-[92%] bg-mist text-slate-800"
                    : "w-fit max-w-[min(34rem,80%)] bg-ink text-white"
                }`}
              >
                {message.role === "assistant" ? (
                  <MarkdownAnswer content={message.content} />
                ) : (
                  <div className="space-y-3">
                    {message.screenshotPaths && message.screenshotPaths.length > 0 ? (
                      <div className="flex flex-wrap gap-3">
                        {message.screenshotPaths.map((path, index) => (
                          <LightboxImage
                            key={`${path}-${index}`}
                            src={path}
                            alt={`${copy.screenshot} ${index + 1}`}
                            thumbClassName="h-24 w-24 rounded-2xl border border-white/20 object-cover"
                          />
                        ))}
                      </div>
    ) : null}
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : null}
      <form onSubmit={handleSubmit} className="mt-4 space-y-3">
        <textarea
          rows={3}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onPaste={handlePaste}
          onKeyDown={handleKeyDown}
          placeholder={copy.followUpPlaceholder}
        />
        {screenshotPreviews.length > 0 ? (
          <div className="flex flex-wrap gap-3">
            {screenshotPreviews.map((preview, index) => (
              <div key={`${preview}-${index}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-2">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-600">{copy.imageReady}</span>
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white text-sm font-semibold text-slate-500 hover:bg-slate-200 hover:text-slate-700"
                  >
                    x
                  </button>
                </div>
                <img src={preview} alt={`${copy.screenshot} ${index + 1}`} className="h-24 w-24 rounded-xl object-cover" />
              </div>
            ))}
          </div>
        ) : null}
        <div className="flex flex-wrap items-center gap-3">
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
          {screenshotFiles.length > 0 ? (
            <span className="rounded-full bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-800">
              {copy.imageReady}
            </span>
          ) : null}
        </div>
        <button
          type="submit"
          disabled={loading}
          className="rounded-2xl bg-ink px-4 py-3 text-sm font-semibold text-white hover:-translate-y-0.5 disabled:opacity-70"
        >
          {copy.followUpButton}
        </button>
      </form>
      {followUps.length > 0 && persistMistakeId ? (
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={saveToCurrentMistake}
            className="rounded-2xl bg-sky-100 px-4 py-3 text-sm font-semibold text-sky-800 hover:-translate-y-0.5"
          >
            {copy.saveToCurrentMistake}
          </button>
          <button
            type="button"
            onClick={cancelFollowUps}
            className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700 hover:-translate-y-0.5"
          >
            {copy.cancel}
          </button>
        </div>
      ) : null}
      {saveMessage ? <p className="mt-3 text-sm text-sage">{saveMessage}</p> : null}
    </section>
  );
}
