"use client";

import { usePathname, useSearchParams } from "next/navigation";

import { Locale } from "@/lib/types";
import { cn } from "@/lib/utils";

type LocaleSwitcherProps = {
  locale: Locale;
  labelEn: string;
  labelZh: string;
};

export function LocaleSwitcher({ locale, labelEn, labelZh }: LocaleSwitcherProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function buildHref(nextLocale: Locale) {
    const params = new URLSearchParams(searchParams.toString());
    const qs = params.toString();
    const redirect = qs ? `${pathname}?${qs}` : pathname;
    return `/api/locale?locale=${nextLocale}&redirect=${encodeURIComponent(redirect)}`;
  }

  return (
    <div className="inline-flex items-center rounded-full border border-white/15 bg-white/10 p-1 text-white backdrop-blur">
      <a
        href={buildHref("en")}
        className={cn(
          "rounded-full px-3 py-1.5 text-xs font-semibold tracking-wide transition-colors",
          locale === "en"
            ? "bg-white text-ink"
            : "text-white/80 hover:bg-white/10 hover:text-white"
        )}
      >
        {labelEn}
      </a>
      <a
        href={buildHref("zh")}
        className={cn(
          "rounded-full px-3 py-1.5 text-xs font-semibold tracking-wide transition-colors",
          locale === "zh"
            ? "bg-white text-ink"
            : "text-white/80 hover:bg-white/10 hover:text-white"
        )}
      >
        {labelZh}
      </a>
    </div>
  );
}
