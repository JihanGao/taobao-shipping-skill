import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

import { NextRequest, NextResponse } from "next/server";

import { runTutorConversation } from "@/lib/openai";
import { Locale, TutorQualityMode } from "@/lib/types";

async function saveScreenshot(file: File) {
  const bytes = Buffer.from(await file.arrayBuffer());
  const uploadsDir = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadsDir, { recursive: true });

  const ext = path.extname(file.name) || ".png";
  const filename = `${Date.now()}-${randomUUID()}${ext}`;
  await writeFile(path.join(uploadsDir, filename), bytes);

  return {
    publicPath: `/uploads/${filename}`,
    dataUrl: `data:${file.type || "image/png"};base64,${bytes.toString("base64")}`
  };
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const language = String(formData.get("language") || "");
  const locale = (String(formData.get("locale") || "en") === "zh" ? "zh" : "en") as Locale;
  const qualityMode = (String(formData.get("qualityMode") || "fast") === "high"
    ? "high"
    : "fast") as TutorQualityMode;
  const messages = JSON.parse(String(formData.get("messages") || "[]"));
  const existingScreenshotPaths = JSON.parse(String(formData.get("existingScreenshotPaths") || "[]")) as string[];
  const screenshots = formData.getAll("screenshots");

  const screenshotPaths = [...existingScreenshotPaths];
  const newScreenshotPaths: string[] = [];
  const screenshotDataUrls: string[] = [];

  for (const screenshot of screenshots) {
    if (screenshot instanceof File && screenshot.size > 0) {
      const saved = await saveScreenshot(screenshot);
      screenshotPaths.push(saved.publicPath);
      newScreenshotPaths.push(saved.publicPath);
      screenshotDataUrls.push(saved.dataUrl);
    }
  }

  try {
    const result = await runTutorConversation({
      language,
      locale,
      qualityMode,
      messages,
      screenshotDataUrls: screenshotDataUrls.length > 0 ? screenshotDataUrls : undefined
    });

    return NextResponse.json({
      ...result,
      screenshotPath: screenshotPaths[0] || null,
      screenshotPaths,
      newScreenshotPaths
    });
  } catch (error) {
    console.error("Tutor API error:", error);
    return NextResponse.json(
      { error: "Tutor request failed", details: String(error) },
      { status: 500 }
    );
  }
}
