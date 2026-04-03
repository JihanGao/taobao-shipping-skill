import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import "dotenv/config";
import { chromium } from "playwright";

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const localDir = path.join(rootDir, ".local");
const debugDir = path.join(localDir, "debug");
const stateFilePath = path.join(localDir, "state.json");
const storageStatePath = path.join(localDir, "storage-state.json");

function parseNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseNumberList(value, fallback) {
  if (!value) {
    return fallback;
  }

  const values = value
    .split(",")
    .map((part) => Number(part.trim()))
    .filter((part) => Number.isInteger(part));

  return values.length > 0 ? values : fallback;
}

function parseStringList(value) {
  if (!value) {
    return [];
  }

  return value
    .split("|")
    .map((part) => part.trim())
    .filter(Boolean);
}

const config = {
  authAlertHours: parseNumber(process.env.SOLIDCORE_AUTH_ALERT_HOURS, 12),
  expectedReleaseDays: parseNumberList(process.env.SOLIDCORE_EXPECTED_RELEASE_DAYS, [23, 24]),
  loginUrl: process.env.SOLIDCORE_LOGIN_URL || "https://solidcore.co/",
  pushoverAppToken: process.env.PUSHOVER_APP_TOKEN || "",
  pushoverAuthSound: process.env.PUSHOVER_AUTH_SOUND || "falling",
  pushoverReleaseSound: process.env.PUSHOVER_RELEASE_SOUND || "siren",
  pushoverUserKey: process.env.PUSHOVER_USER_KEY || "",
  requiredDateMatches: parseNumber(process.env.SOLIDCORE_REQUIRED_DATE_MATCHES, 2),
  scheduleUrl: process.env.SOLIDCORE_SCHEDULE_URL || "",
  targetStudios: parseStringList(process.env.SOLIDCORE_TARGET_STUDIOS),
  studioName: process.env.SOLIDCORE_STUDIO_NAME || "",
};

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function readJsonFile(filePath) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch (error) {
    if (error && error.code === "ENOENT") {
      return null;
    }

    throw error;
  }
}

async function writeJsonFile(filePath, value) {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, JSON.stringify(value, null, 2));
}

async function writeTextFile(filePath, value) {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, value, "utf8");
}

function getTargetMonthInfo(now = new Date()) {
  const year = now.getMonth() === 11 ? now.getFullYear() + 1 : now.getFullYear();
  const monthIndex = (now.getMonth() + 1) % 12;
  const start = new Date(year, monthIndex, 1);
  const end = new Date(year, monthIndex + 1, 0);

  return {
    end,
    key: `${year}-${String(monthIndex + 1).padStart(2, "0")}`,
    monthIndex,
    monthNameLong: start.toLocaleString("en-US", { month: "long" }),
    monthNameShort: start.toLocaleString("en-US", { month: "short" }),
    start,
    year,
  };
}

function isExpectedReleaseWindow(days, now = new Date()) {
  return days.includes(now.getDate());
}

function unique(values) {
  return [...new Set(values)];
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function collectMonthRegexes(targetMonth) {
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

function collectMonthHints(targetMonth) {
  const monthNumber = targetMonth.monthIndex + 1;
  const paddedMonth = String(monthNumber).padStart(2, "0");

  return new RegExp(
    [targetMonth.monthNameLong, targetMonth.monthNameShort, `${targetMonth.year}-${paddedMonth}`, `${monthNumber}/`]
      .map(escapeRegex)
      .join("|"),
    "i",
  );
}

function extractMatchesFromText(text, targetMonth) {
  const matches = [];

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

async function analyzeSchedulePage(page, targetMonth) {
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

function isSessionInvalid(pageText, currentUrl) {
  const loggedInSignals = /(log out|home studio|payment methods|purchase history)/i.test(pageText);
  const loginSignals = /(log in|sign in|verification code|enter code|email code|sms code|2-step|two-step)/i.test(
    pageText,
  );
  const currentUrlSignals = /(login|signin|verify|verification)/i.test(currentUrl);

  return !loggedInSignals && (loginSignals || currentUrlSignals);
}

function shouldSendAuthAlert(lastAuthAlertAt) {
  if (!lastAuthAlertAt) {
    return true;
  }

  const previous = new Date(lastAuthAlertAt).getTime();
  const threshold = config.authAlertHours * 60 * 60 * 1000;
  return Number.isNaN(previous) || Date.now() - previous >= threshold;
}

function buildReleaseTitle() {
  return config.studioName
    ? `solidcore open: ${config.studioName}`
    : config.targetStudios.length > 0
      ? `solidcore open: ${config.targetStudios.join(", ")}`
      : "solidcore schedule opened";
}

function buildReleaseMessage(monthNameLong, year, matchedDays) {
  const studioPrefix = config.studioName
    ? `${config.studioName}: `
    : config.targetStudios.length > 0
      ? `${config.targetStudios.join(", ")}: `
      : "";
  const dayPreview = matchedDays.length > 0 ? ` Days found: ${matchedDays.join(", ")}.` : "";
  return `${studioPrefix}${monthNameLong} ${year} classes are visible. Book now.${dayPreview}`;
}

function studioAliasVariants(studio) {
  const variants = new Set([studio]);

  if (studio.includes("Tyson's")) {
    variants.add(studio.replace("Tyson's", "Tysons"));
  }

  if (studio.includes("Tysons")) {
    variants.add(studio.replace("Tysons", "Tyson's"));
  }

  return [...variants];
}

async function clickFirstVisibleText(page, candidates) {
  for (const candidate of candidates) {
    const locator = page.getByText(candidate, { exact: true }).first();
    if (await locator.count()) {
      await locator.click();
      return true;
    }
  }

  return false;
}

async function applyStudioFilters(page, targetStudios) {
  if (targetStudios.length === 0) {
    return [];
  }

  const selectedStudios = [];

  await page.getByRole("button", { name: /home studio/i }).click();
  await page.waitForTimeout(300);

  const viewAllStudios = page.getByText("View All Studios", { exact: true });
  if (await viewAllStudios.count()) {
    await viewAllStudios.click();
    await page.waitForTimeout(500);
  }

  const clearButton = page.getByText("Clear", { exact: true }).first();
  if (await clearButton.count()) {
    await clearButton.click();
    await page.waitForTimeout(200);
  }

  for (const studio of targetStudios) {
    const clicked = await clickFirstVisibleText(page, studioAliasVariants(studio));
    if (clicked) {
      selectedStudios.push(studio);
      await page.waitForTimeout(200);
    }
  }

  const selectButton = page.getByText(/Select \(\d+\)/).first();
  if (await selectButton.count()) {
    await selectButton.click();
    await page.waitForTimeout(1500);
  }

  return selectedStudios;
}

async function sendPushoverNotification({ message, priority = 0, sound = "persistent", title, url, urlTitle }) {
  if (!config.pushoverAppToken || !config.pushoverUserKey) {
    throw new Error("Missing PUSHOVER_USER_KEY or PUSHOVER_APP_TOKEN in .env");
  }

  const body = new URLSearchParams({
    token: config.pushoverAppToken,
    user: config.pushoverUserKey,
    title,
    message,
    priority: String(priority),
    sound,
  });

  if (url) {
    body.set("url", url);
  }

  if (urlTitle) {
    body.set("url_title", urlTitle);
  }

  if (priority === 2) {
    body.set("retry", "60");
    body.set("expire", "1800");
  }

  const response = await fetch("https://api.pushover.net/1/messages.json", {
    body,
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(`Pushover request failed (${response.status}): ${await response.text()}`);
  }
}

async function main() {
  if (!config.scheduleUrl) {
    throw new Error("Missing SOLIDCORE_SCHEDULE_URL in .env");
  }

  await ensureDir(debugDir);

  const targetMonth = getTargetMonthInfo();
  const browser = await chromium.launch({
    channel: "chrome",
    headless: true,
  });
  const context = await browser.newContext({
    storageState: storageStatePath,
    viewport: { width: 1440, height: 1200 },
  });

  try {
    const page = await context.newPage();
    await page.goto(config.scheduleUrl, { waitUntil: "domcontentloaded" });
    const selectedStudios = await applyStudioFilters(page, config.targetStudios);

    const result = await analyzeSchedulePage(page, targetMonth);
    const screenshotPath = path.join(debugDir, "latest-schedule.png");
    await page.screenshot({ fullPage: true, path: screenshotPath });

    const currentUrl = page.url();
    const sessionInvalid = isSessionInvalid(result.pageText, currentUrl);
    const releaseDetected = result.matchedDays.length >= config.requiredDateMatches;
    const state = (await readJsonFile(stateFilePath)) ?? {};
    const alreadyNotified = state.lastNotifiedTargetMonth === targetMonth.key;
    const authAlertDue = shouldSendAuthAlert(state.lastAuthAlertAt);

    await writeTextFile(path.join(debugDir, "latest-page-text.txt"), result.pageText);
    await writeJsonFile(path.join(debugDir, "latest-result.json"), {
      checkedAt: new Date().toISOString(),
      currentUrl,
      expectedReleaseWindow: isExpectedReleaseWindow(config.expectedReleaseDays),
      releaseDetected,
      requiredDateMatches: config.requiredDateMatches,
      scheduleUrl: config.scheduleUrl,
      screenshotPath,
      selectedStudios,
      sessionInvalid,
      ...result,
    });

    await writeJsonFile(stateFilePath, {
      ...state,
      lastAuthAlertAt: sessionInvalid && authAlertDue ? new Date().toISOString() : state.lastAuthAlertAt,
      lastCheckAt: new Date().toISOString(),
      lastResult: {
        candidateLines: result.candidateLines,
        matchedDays: result.matchedDays,
        releaseDetected,
        selectedStudios,
        sessionInvalid,
        targetMonth: targetMonth.key,
      },
      lastNotifiedTargetMonth: alreadyNotified || !releaseDetected ? state.lastNotifiedTargetMonth : targetMonth.key,
    });

    if (sessionInvalid) {
      console.log(`Saved login appears invalid. Current URL: ${currentUrl}`);

      if (authAlertDue) {
        await sendPushoverNotification({
          title: config.studioName ? `solidcore login needed: ${config.studioName}` : "solidcore login needed",
          message: "Your solidcore session looks expired. Re-run `npm run solidcore:login` on your Mac and sign in again.",
          priority: 1,
          sound: config.pushoverAuthSound,
          url: config.scheduleUrl,
          urlTitle: "Open solidcore schedule",
        });
        console.log("Sent re-login reminder.");
      }

      return;
    }

    if (!releaseDetected) {
      console.log(`No release detected for ${targetMonth.key}. Found ${result.matchedDays.length} target-month date matches.`);
      return;
    }

    console.log(`Release detected for ${targetMonth.key}. Matched days: ${result.matchedDays.join(", ")}`);

    if (!alreadyNotified) {
      await sendPushoverNotification({
        title: buildReleaseTitle(),
        message: buildReleaseMessage(targetMonth.monthNameLong, targetMonth.year, result.matchedDays),
        priority: 2,
        sound: config.pushoverReleaseSound,
        url: config.scheduleUrl,
        urlTitle: "Open solidcore schedule",
      });
      console.log("Pushover alert sent.");
    }
  } finally {
    await context.close();
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
