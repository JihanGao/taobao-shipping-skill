"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { LOCALE_COOKIE } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import { isMistakeStatus } from "@/lib/utils";

export async function updateMistakeStatusAction(formData: FormData) {
  const id = Number(formData.get("id"));
  const status = String(formData.get("status"));

  if (!id || !isMistakeStatus(status)) {
    throw new Error("Missing mistake status payload.");
  }

  await prisma.mistake.update({
    where: { id },
    data: { status }
  });

  revalidatePath("/");
  revalidatePath("/mistakes");
  revalidatePath(`/mistakes/${id}`);
}

export async function setLocaleAction(formData: FormData) {
  const locale = String(formData.get("locale")) === "zh" ? "zh" : "en";
  const redirectTo = String(formData.get("redirectTo") || "/");
  const store = await cookies();
  store.set(LOCALE_COOKIE, locale, {
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365
  });

  redirect(redirectTo);
}
