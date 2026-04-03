import { NextRequest, NextResponse } from "next/server";

import { getRecentMistakesByLanguage, getVocabulary } from "@/lib/data";

export async function GET(request: NextRequest) {
  const language = request.nextUrl.searchParams.get("language") || "Spanish";
  const [mistakes, vocabulary] = await Promise.all([
    getRecentMistakesByLanguage(language),
    getVocabulary({ language, limit: 20 })
  ]);

  return NextResponse.json({ mistakes: mistakes.slice(0, 5), vocabulary });
}
