import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const language = url.searchParams.get("language") || "";
  const favorites = url.searchParams.get("favorites") === "1";
  const where: Record<string, unknown> = { isDeleted: false };
  if (language) where.language = language;
  if (favorites) where.isFavorite = true;
  const list = await prisma.mistake.findMany({
    where,
    orderBy: { createdAt: "desc" }
  });
  return NextResponse.json(list);
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  const mistake = await prisma.mistake.create({
    data: {
      language: body.language,
      learnerPrompt: body.learnerPrompt,
      question: body.title || body.learnerPrompt,
      userAnswer: "Not provided",
      correctAnswer: "Not provided",
      errorType: body.errorType || "grammar help",
      aiAnswer: body.aiAnswer,
      aiExplanationJson: JSON.stringify({
        assistantReply: body.aiAnswer
      }),
      chatTranscriptJson: JSON.stringify(body.chatTranscript || []),
      screenshotPath: body.screenshotPath || null,
      status: "new"
    }
  });

  return NextResponse.json({ id: mistake.id });
}

export async function DELETE(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const ids = Array.isArray(body.ids) ? body.ids : body.id != null ? [Number(body.id)] : [];
  const numericIds = ids.filter((id: unknown) => typeof id === "number" && id > 0);
  if (numericIds.length === 0) {
    return NextResponse.json({ ok: false, count: 0 }, { status: 400 });
  }
  const now = new Date();
  const result = await prisma.mistake.updateMany({
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
  const result = await prisma.mistake.updateMany({
    where: { id: { in: numericIds } },
    data: { isDeleted: false, deletedAt: null }
  });
  return NextResponse.json({ ok: true, count: result.count });
}
