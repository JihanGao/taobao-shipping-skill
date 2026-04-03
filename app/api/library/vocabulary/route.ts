import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { classifyWord } from "@/lib/auto-kb/classifyWord";
import { generateVocabularyExample } from "@/lib/auto-kb/generateVocabularyExample";
import { PART_OF_SPEECH_LABELS } from "@/lib/auto-kb/autoKbTaxonomy";
import type { PartOfSpeechKey } from "@/lib/auto-kb/autoKbTaxonomy";
import { extractVocabularyExample } from "@/lib/utils";
import { getVocabulary } from "@/lib/data";

const VALID_POS = ["noun", "verb", "adjective", "adverb", "other"] as const;

function inferVocabularyTerm(body: Record<string, unknown>) {
  const explicitTerm = String(body.term || "").trim();
  if (explicitTerm) return explicitTerm;

  const learnerPrompt = String(body.learnerPrompt || "").trim();
  const transcript = Array.isArray(body.chatTranscript)
    ? (body.chatTranscript as Array<{ role?: string; content?: string }>)
    : [];
  const firstUserPrompt =
    transcript.find((message) => message?.role === "user")?.content?.trim() || learnerPrompt;
  const suggestedTerm = String(body.title || firstUserPrompt || learnerPrompt).trim();

  const quoted = firstUserPrompt.match(/[「“"]([^」”"]{1,30})[」”"]/)?.[1]?.trim();
  const jpToken = firstUserPrompt.match(/[\u3040-\u30ff\u4e00-\u9fafー]{2,30}/)?.[0]?.trim();
  const firstSlashPart = suggestedTerm.split(/[／/]/)[0]?.trim();

  return quoted || jpToken || firstSlashPart || firstUserPrompt || suggestedTerm || learnerPrompt;
}

function inferLemmaFromTerm(term: string) {
  const trimmed = (term || "").trim();
  const firstSlash = trimmed.split(/[／/]/)[0]?.trim() || trimmed;
  return firstSlash.split(/\s+/)[0]?.trim() || firstSlash;
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const language = url.searchParams.get("language") || "";
  const favorites = url.searchParams.get("favorites") === "1";
  const list = await getVocabulary({
    language: language || undefined,
    favorites: favorites || undefined
  });
  return NextResponse.json(list);
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  const term = inferVocabularyTerm(body);
  const lemma = inferLemmaFromTerm(term);
  const reading = String(body.reading || "").trim();

  const entry = await prisma.vocabularyEntry.create({
    data: {
      language: body.language,
      learnerPrompt: body.learnerPrompt,
      lemma,
      term,
      reading,
      aiAnswer: body.aiAnswer,
      summaryJson: JSON.stringify({
        zh: body.summaryZh || "",
        en: body.summaryEn || ""
      }),
      chatTranscriptJson: JSON.stringify(body.chatTranscript || []),
      isSimpleWord: Boolean(body.isSimpleWord),
      screenshotPath: body.screenshotPath || null
    }
  });

  // Auto Knowledge Base classification (MVP)
  const tutorPos = String(body.suggestedPartOfSpeech || "").trim().toLowerCase();
  const useTutorPos = VALID_POS.includes(tutorPos as PartOfSpeechKey);

  try {
    const classified = await classifyWord({
      term: lemma,
      learnerPrompt: String(body.learnerPrompt || ""),
      aiAnswer: String(body.aiAnswer || ""),
      summaryZh: String(body.summaryZh || ""),
      summaryEn: String(body.summaryEn || ""),
      isSimpleWord: Boolean(body.isSimpleWord),
      errorType: String(body.errorType || ""),
      locale: "zh"
    });

    const partOfSpeech = useTutorPos ? (tutorPos as PartOfSpeechKey) : classified.partOfSpeech;
    const posLabels = PART_OF_SPEECH_LABELS[partOfSpeech];

    await prisma.vocabularyEntry.update({
      where: { id: entry.id },
      data: {
        partOfSpeech,
        partOfSpeech_zh: posLabels.zh,
        partOfSpeech_en: posLabels.en,
        themeCategory: classified.themeCategory,
        themeCategory_zh: classified.themeCategory_zh,
        themeCategory_en: classified.themeCategory_en,
        subCategory: classified.subCategory,
        subCategory_zh: classified.subCategory_zh,
        subCategory_en: classified.subCategory_en
      }
    });
  } catch (err) {
    if (useTutorPos) {
      const posLabels = PART_OF_SPEECH_LABELS[tutorPos as PartOfSpeechKey];
      await prisma.vocabularyEntry.update({
        where: { id: entry.id },
        data: {
          partOfSpeech: tutorPos as PartOfSpeechKey,
          partOfSpeech_zh: posLabels.zh,
          partOfSpeech_en: posLabels.en
        }
      });
    }
    console.error("[vocabulary] classifyWord or update failed:", err);
  }

  // Extract example from aiAnswer; if none found, generate via AI
  try {
    let example = extractVocabularyExample(String(body.aiAnswer || ""));
    if (!example) {
      example = await generateVocabularyExample({
        term: lemma,
        language: String(body.language || ""),
        summaryZh: String(body.summaryZh || ""),
        summaryEn: String(body.summaryEn || ""),
        aiAnswer: String(body.aiAnswer || "")
      });
    }
    if (example) {
      await prisma.vocabularyEntry.update({
        where: { id: entry.id },
        data: {
          exampleSentence: example.sentence,
          exampleTranslation: example.translation
        }
      });
    }
  } catch {
    // Best-effort; keep save flow stable.
  }

  return NextResponse.json({ id: entry.id });
}

export async function DELETE(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const ids = Array.isArray(body.ids) ? body.ids : body.id != null ? [Number(body.id)] : [];
  const numericIds = ids.filter((id: unknown) => typeof id === "number" && id > 0);

  if (numericIds.length === 0) {
    return NextResponse.json({ ok: false, count: 0 }, { status: 400 });
  }

  const now = new Date();
  const result = await prisma.vocabularyEntry.updateMany({
    where: { id: { in: numericIds } },
    data: { isDeleted: true, deletedAt: now }
  });

  return NextResponse.json({ ok: true, count: result.count });
}

export async function PATCH(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const ids = Array.isArray(body.ids) ? body.ids : body.id != null ? [Number(body.id)] : [];
  const numericIds = ids.filter((id: unknown) => typeof id === "number" && id > 0);

  if (numericIds.length === 0) {
    return NextResponse.json({ ok: false, count: 0 }, { status: 400 });
  }

  const result = await prisma.vocabularyEntry.updateMany({
    where: { id: { in: numericIds } },
    data: { isDeleted: false, deletedAt: null }
  });

  return NextResponse.json({ ok: true, count: result.count });
}
