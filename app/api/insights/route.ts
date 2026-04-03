import { NextRequest, NextResponse } from "next/server";

import { buildInsightsResponse, InsightsRangeKey } from "@/lib/insights";
import { Locale } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }
    const locale = (body.locale === "zh" ? "zh" : "en") as Locale;
    const range = (["today", "last7", "last30", "custom"].includes(body.range)
      ? body.range
      : "last7") as InsightsRangeKey;

    const data = await buildInsightsResponse({
      locale,
      range,
      from: typeof body.from === "string" ? body.from : undefined,
      to: typeof body.to === "string" ? body.to : undefined,
      language: typeof body.language === "string" && body.language ? body.language : undefined,
      customQuestion: typeof body.customQuestion === "string" ? body.customQuestion : undefined
    });

    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
