import { type Page } from "playwright";

import { type TargetMonthInfo } from "./dates";

export type MatchResult = {
  candidateLines: string[];
  pageText: string;
  matchedDays: number[];
  targetMonth: TargetMonthInfo;
};

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function collectMonthRegexes(targetMonth: TargetMonthInfo): RegExp[] {
  const monthNumber = targetMonth.monthIndex + 1;
  const paddedMonth = String(monthNumber).padStart(2, "0");
  const year = targetMonth.year;
  const fullMonth = escapeRegex(targetMonth.monthNameLong);
  const shortMonth = escapeRegex(targetMonth.monthNameShort);

  return [
    new RegExp(`\\b${fullMonth}\\s+([0-3]?\\d)(?:,\\s*${year})?\\b`, "gi"),
    new RegExp(`\\b${shortMonth}\\.?\\s+([0-3]?\\d)(?:,\\s*${year})?\\b`, "gi"),
    new RegExp(`\\b([0-3]?\\d)\\s+${fullMonth}\\b`, "gi"),
    new RegExp(`\\b${monthNumber}/([0-3]?\\d)/(?:${year}|\\d{2})\\b`, "gi"),
    new RegExp(`\\b${paddedMonth}/([0-3]?\\d)/(?:${year}|\\d{2})\\b`, "gi"),
    new RegExp(`\\b${year}-${paddedMonth}-([0-3]\\d)\\b`, "gi"),
  ];
}

function collectMonthHints(targetMonth: TargetMonthInfo): RegExp {
  const monthNumber = targetMonth.monthIndex + 1;
  const paddedMonth = String(monthNumber).padStart(2, "0");

  return new RegExp(
    [targetMonth.monthNameLong, targetMonth.monthNameShort, `${targetMonth.year}-${paddedMonth}`, `${monthNumber}/`]
      .map(escapeRegex)
      .join("|"),
    "i",
  );
}

function extractMatchesFromText(text: string, targetMonth: TargetMonthInfo): number[] {
  const matches: number[] = [];

  for (const regex of collectMonthRegexes(targetMonth)) {
    for (const match of text.matchAll(regex)) {
      const day = Number(match[1]);
      if (Number.isInteger(day) && day >= 1 && day <= 31) {
        matches.push(day);
      }
    }
  }

  return unique(matches).sort((left, right) => left - right);
}

export async function analyzeSchedulePage(page: Page, targetMonth: TargetMonthInfo): Promise<MatchResult> {
  await page.waitForTimeout(1500);

  const pageText = await page.locator("body").innerText();
  const normalizedLines = pageText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const monthHintRegex = collectMonthHints(targetMonth);
  const candidateLines = unique(normalizedLines.filter((line) => monthHintRegex.test(line))).slice(0, 30);
  const matchedDays = extractMatchesFromText(pageText, targetMonth);

  return {
    candidateLines,
    pageText,
    matchedDays,
    targetMonth,
  };
}
