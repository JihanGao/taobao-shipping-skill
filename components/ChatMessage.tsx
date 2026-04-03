"use client";

import { useMemo } from "react";
import { MarkdownAnswer } from "@/components/markdown-answer";

import { ActionButtons } from "@/components/ActionButtons";
import { VocabList, type VocabItem } from "@/components/VocabList";

type MessageType = "text" | "vocab_list";

export type ChatMessageInput = {
  role: "user" | "assistant";
  content: string;
  type?: MessageType;
  items?: VocabItem[];
};

function extractVocabItemsFromText(content: string): { items: VocabItem[]; remainingText: string } {
  const lines = content.split("\n");
  const items: VocabItem[] = [];
  const remaining: string[] = [];

  // Covers common patterns:
  // - "- word - meaning"
  // - "• word : meaning"
  // - "1. word - meaning"
  const bulletPattern =
    /^(?:\d+[.)]\s*)?(?:[-*•]\s*)?(.+?)\s*(?:-|—|–|:)\s*(.+?)\s*$/;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      remaining.push(rawLine);
      continue;
    }

    // Avoid capturing markdown headings/blockquote/code fences as vocab rows.
    if (/^(#{1,6}\s)|^```|^>/.test(line)) {
      remaining.push(rawLine);
      continue;
    }

    const match = line.match(bulletPattern);
    if (!match) {
      remaining.push(rawLine);
      continue;
    }

    const word = match[1]?.trim();
    const meaning = match[2]?.trim();
    if (!word || !meaning) {
      remaining.push(rawLine);
      continue;
    }

    // Simple sanity checks to avoid false positives.
    if (word.length > 40 || meaning.length > 120) {
      remaining.push(rawLine);
      continue;
    }

    items.push({ word, meaning });
  }

  return { items, remainingText: remaining.join("\n").trim() };
}

type ChatMessageProps = {
  message: ChatMessageInput;
  saveWordsToNotebook: (items: VocabItem[]) => Promise<void> | void;
  onSelectWords?: () => void;
};

export function ChatMessage({ message, saveWordsToNotebook, onSelectWords }: ChatMessageProps) {
  const { effectiveType, vocabItems, remainingText } = useMemo(() => {
    const explicitType = message.type;
    const explicitItems = message.items;
    const { items: extracted, remainingText: extractedRemaining } = extractVocabItemsFromText(message.content);

    const itemsToUse = explicitItems && explicitItems.length ? explicitItems : extracted;
    const shouldTreatAsVocab =
      explicitType === "vocab_list"
        ? itemsToUse.length > 0
        : explicitType === "text"
          ? false
          : itemsToUse.length >= 2;

    return {
      effectiveType: shouldTreatAsVocab ? "vocab_list" : "text",
      vocabItems: itemsToUse,
      remainingText: extractedRemaining
    };
  }, [message.content, message.items, message.type]);

  if (message.role === "user") {
    return <MarkdownAnswer content={message.content} />;
  }

  if (effectiveType === "vocab_list" && vocabItems.length) {
    return (
      <div>
        {remainingText ? <MarkdownAnswer content={remainingText} /> : null}
        <VocabList items={vocabItems} />
        <ActionButtons items={vocabItems} saveWordsToNotebook={saveWordsToNotebook} onSelectWords={onSelectWords} />
      </div>
    );
  }

  return <MarkdownAnswer content={message.content} />;
}

