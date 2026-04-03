import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  const isFavorite = body.isFavorite;

  if (typeof isFavorite !== "boolean") {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  await prisma.vocabularyEntry.update({
    where: { id },
    data: { isFavorite }
  });

  return NextResponse.json({ ok: true, isFavorite });
}
