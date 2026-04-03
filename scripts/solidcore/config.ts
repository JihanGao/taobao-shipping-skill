import "dotenv/config";

import path from "node:path";

const rootDir = process.cwd();
const localDir = path.join(rootDir, ".local", "solidcore");

function parseNumber(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseNumberList(value: string | undefined, fallback: number[]): number[] {
  if (!value) {
    return fallback;
  }

  const values = value
    .split(",")
    .map((part) => Number(part.trim()))
    .filter((part) => Number.isInteger(part));

  return values.length > 0 ? values : fallback;
}

function parseStringList(value: string | undefined): string[] {
  if (!value) {
    return [];
  }

  return value
    .split("|")
    .map((part) => part.trim())
    .filter(Boolean);
}

export const solidcoreConfig = {
  loginUrl: process.env.SOLIDCORE_LOGIN_URL || "https://solidcore.co/",
  scheduleUrl: process.env.SOLIDCORE_SCHEDULE_URL || "",
  targetStudios: parseStringList(process.env.SOLIDCORE_TARGET_STUDIOS),
  studioName: process.env.SOLIDCORE_STUDIO_NAME || "",
  expectedReleaseDays: parseNumberList(process.env.SOLIDCORE_EXPECTED_RELEASE_DAYS, [23, 24]),
  requiredDateMatches: parseNumber(process.env.SOLIDCORE_REQUIRED_DATE_MATCHES, 2),
  checkIntervalSeconds: parseNumber(process.env.SOLIDCORE_CHECK_INTERVAL_SECONDS, 300),
  authAlertHours: parseNumber(process.env.SOLIDCORE_AUTH_ALERT_HOURS, 12),
  pushoverUserKey: process.env.PUSHOVER_USER_KEY || "",
  pushoverAppToken: process.env.PUSHOVER_APP_TOKEN || "",
  pushoverReleaseSound: process.env.PUSHOVER_RELEASE_SOUND || "siren",
  pushoverAuthSound: process.env.PUSHOVER_AUTH_SOUND || "falling",
  storageStatePath: path.join(localDir, "storage-state.json"),
  stateFilePath: path.join(localDir, "state.json"),
  debugDir: path.join(localDir, "debug"),
};

export function requireScheduleUrl(): string {
  if (!solidcoreConfig.scheduleUrl) {
    throw new Error("Missing SOLIDCORE_SCHEDULE_URL in .env");
  }

  return solidcoreConfig.scheduleUrl;
}

export function requirePushoverConfig(): { appToken: string; userKey: string } {
  if (!solidcoreConfig.pushoverAppToken || !solidcoreConfig.pushoverUserKey) {
    throw new Error("Missing PUSHOVER_USER_KEY or PUSHOVER_APP_TOKEN in .env");
  }

  return {
    appToken: solidcoreConfig.pushoverAppToken,
    userKey: solidcoreConfig.pushoverUserKey,
  };
}
