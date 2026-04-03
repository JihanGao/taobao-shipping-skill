import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Suspense } from "react";

import "@/app/globals.css";
import { Header } from "@/components/header";
import { t } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";

export const metadata: Metadata = {
  title: "LinguaFlow",
  description: "Local-first AI language learning copilot with grammar explanations."
};

export default async function RootLayout({
  children
}: Readonly<{
  children: ReactNode;
}>) {
  const locale = await getLocale();
  const copy = t(locale);

  return (
    <html lang={locale === "zh" ? "zh-CN" : "en"} suppressHydrationWarning>
      <body suppressHydrationWarning>
        <Suspense fallback={<div className="h-16 bg-gradient-to-r from-[#0b1f3f] via-[#163a8a] to-[#0b1f3f]" />}>
          <Header
            locale={locale}
            labelEn={copy.localeEn}
            labelZh={copy.localeZh}
          />
        </Suspense>

        <div className="bg-paper">
          <div className="shell">{children}</div>
        </div>
      </body>
    </html>
  );
}
