import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const mistakeId = Number(id);

  if (!mistakeId) {
    return NextResponse.json({ error: "Invalid mistake id." }, { status: 400 });
  }

  const mistake = await prisma.mistake.findUnique({
    where: { id: mistakeId }
  });

  if (!mistake) {
    return NextResponse.json({ error: "Mistake not found." }, { status: 404 });
  }

  if (typeof body.isFavorite === "boolean") {
    const updated = await prisma.mistake.update({
      where: { id: mistakeId },
      data: { isFavorite: body.isFavorite }
    });
    return NextResponse.json({ ok: true, isFavorite: updated.isFavorite });
  }

  const existingTranscript = JSON.parse(mistake.chatTranscriptJson || "[]");
  const appendedTranscript = Array.isArray(body.appendedTranscript) ? body.appendedTranscript : [];
  const mergedTranscript = [...existingTranscript, ...appendedTranscript];
  const latestAssistantReply =
    [...mergedTranscript].reverse().find((message) => message?.role === "assistant")?.content || mistake.aiAnswer;

  const updated = await prisma.mistake.update({
    where: { id: mistakeId },
    data: {
      chatTranscriptJson: JSON.stringify(mergedTranscript),
      aiAnswer: latestAssistantReply,
      aiExplanationJson: JSON.stringify({
        assistantReply: latestAssistantReply
      })
    }
  });

  return NextResponse.json({ id: updated.id });
}
