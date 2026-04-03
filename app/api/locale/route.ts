import { NextRequest, NextResponse } from "next/server";

import { LOCALE_COOKIE } from "@/lib/i18n";

export async function GET(request: NextRequest) {
  const locale = request.nextUrl.searchParams.get("locale");
  const redirectTo = request.nextUrl.searchParams.get("redirect") || "/";
  const response = NextResponse.redirect(new URL(redirectTo, request.url));

  response.cookies.set(LOCALE_COOKIE, locale === "zh" ? "zh" : "en", {
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365
  });

  return response;
}
