"use client";

import { MarkdownAnswer } from "@/components/markdown-answer";
import { LightboxImage } from "@/components/lightbox-image";
import { t } from "@/lib/i18n";
import { Locale } from "@/lib/types";

export type TranscriptMessage = {
  role: "user" | "assistant";
  content: string;
  screenshotPaths?: string[];
};

export function ChatTranscript({
  locale,
  messages,
  screenshotPaths
}: {
  locale: Locale;
  messages: TranscriptMessage[];
  screenshotPaths?: string[];
}) {
  const legacyScreenshots = screenshotPaths || [];

  return (
    <div className="space-y-4">
      {messages.map((message, index) => (
        <div
          key={`${message.role}-${index}`}
          className={`flex ${message.role === "assistant" ? "justify-start" : "justify-end"}`}
        >
          <div
            className={`rounded-3xl p-5 text-sm leading-7 ${
              message.role === "assistant"
                ? "max-w-[92%] bg-mist text-slate-800"
                : "w-fit max-w-[min(34rem,80%)] bg-ink text-white"
            }`}
          >
            {message.role === "user" &&
            ((message.screenshotPaths && message.screenshotPaths.length > 0) ||
              (index === 0 && legacyScreenshots.length > 0)) ? (
              <div className="mb-3">
                <div className="flex flex-wrap gap-3">
                  {(message.screenshotPaths?.length ? message.screenshotPaths : legacyScreenshots).map((path, imageIndex) => (
                    <LightboxImage
                      key={`${path}-${imageIndex}`}
                      src={path}
                      alt=""
                      thumbClassName="h-28 w-28 rounded-2xl border border-white/20 object-cover"
                    />
                  ))}
                </div>
              </div>
            ) : null}
            {message.role === "assistant" ? (
              <MarkdownAnswer content={message.content} />
            ) : (
              <p className="whitespace-pre-wrap">{message.content}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
