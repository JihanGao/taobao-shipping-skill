import { cookies } from "next/headers";

import { LOCALE_COOKIE } from "@/lib/i18n";
import { Locale } from "@/lib/types";

export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  const locale = store.get(LOCALE_COOKIE)?.value;
  return locale === "zh" ? "zh" : "en";
}
