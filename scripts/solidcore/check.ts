import { solidcoreConfig, requireScheduleUrl } from "./config";
import { createSolidcoreContext } from "./browser";
import { getTargetMonthInfo, isExpectedReleaseWindow } from "./dates";
import { analyzeSchedulePage } from "./page-analysis";
import { sendPushoverNotification } from "./notify";
import { readSolidcoreState, writeSolidcoreState } from "./state";
import { applyStudioFilters } from "./studios";
import { writeJsonFile, writeTextFile } from "./fs";

function isSessionInvalid(pageText: string, currentUrl: string): boolean {
  const loggedInSignals = /(log out|home studio|payment methods|purchase history)/i.test(pageText);
  const loginSignals = /(log in|sign in|verification code|enter code|email code|sms code|2-step|two-step)/i.test(
    pageText,
  );
  const currentUrlSignals = /(login|signin|verify|verification)/i.test(currentUrl);

  return !loggedInSignals && (loginSignals || currentUrlSignals);
}

function shouldSendAuthAlert(lastAuthAlertAt: string | undefined): boolean {
  if (!lastAuthAlertAt) {
    return true;
  }

  const previous = new Date(lastAuthAlertAt).getTime();
  const threshold = solidcoreConfig.authAlertHours * 60 * 60 * 1000;
  return Number.isNaN(previous) || Date.now() - previous >= threshold;
}

function buildReleaseTitle(): string {
  return solidcoreConfig.studioName
    ? `solidcore open: ${solidcoreConfig.studioName}`
    : solidcoreConfig.targetStudios.length > 0
      ? `solidcore open: ${solidcoreConfig.targetStudios.join(", ")}`
    : "solidcore schedule opened";
}

function buildReleaseMessage(monthNameLong: string, year: number, matchedDays: number[]): string {
  const studioPrefix = solidcoreConfig.studioName
    ? `${solidcoreConfig.studioName}: `
    : solidcoreConfig.targetStudios.length > 0
      ? `${solidcoreConfig.targetStudios.join(", ")}: `
      : "";
  const dayPreview = matchedDays.length > 0 ? ` Days found: ${matchedDays.join(", ")}.` : "";
  return `${studioPrefix}${monthNameLong} ${year} classes are visible. Book now.${dayPreview}`;
}

async function main(): Promise<void> {
  const scheduleUrl = requireScheduleUrl();
  const targetMonth = getTargetMonthInfo();
  const { browser, context } = await createSolidcoreContext({
    headless: true,
    storageState: solidcoreConfig.storageStatePath,
  });

  try {
    const page = await context.newPage();
    await page.goto(scheduleUrl, { waitUntil: "domcontentloaded" });
    const selectedStudios = await applyStudioFilters(page, solidcoreConfig.targetStudios);

    const result = await analyzeSchedulePage(page, targetMonth);
    const screenshotPath = `${solidcoreConfig.debugDir}/latest-schedule.png`;
    await page.screenshot({ fullPage: true, path: screenshotPath });

    const currentUrl = page.url();
    const sessionInvalid = isSessionInvalid(result.pageText, currentUrl);
    const releaseDetected = result.matchedDays.length >= solidcoreConfig.requiredDateMatches;
    const state = await readSolidcoreState();
    const alreadyNotified = state.lastNotifiedTargetMonth === targetMonth.key;
    const authAlertDue = shouldSendAuthAlert(state.lastAuthAlertAt);

    await writeTextFile(`${solidcoreConfig.debugDir}/latest-page-text.txt`, result.pageText);
    await writeJsonFile(`${solidcoreConfig.debugDir}/latest-result.json`, {
      checkedAt: new Date().toISOString(),
      currentUrl,
      expectedReleaseWindow: isExpectedReleaseWindow(solidcoreConfig.expectedReleaseDays),
      releaseDetected,
      requiredDateMatches: solidcoreConfig.requiredDateMatches,
      scheduleUrl,
      screenshotPath,
      selectedStudios,
      sessionInvalid,
      ...result,
    });

    await writeSolidcoreState({
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
          title: solidcoreConfig.studioName
            ? `solidcore login needed: ${solidcoreConfig.studioName}`
            : "solidcore login needed",
          message: "Your solidcore session looks expired. Re-run `npm run solidcore:login` on your Mac and sign in again.",
          priority: 1,
          sound: solidcoreConfig.pushoverAuthSound,
          url: scheduleUrl,
          urlTitle: "Open solidcore schedule",
        });
        console.log("Sent re-login reminder.");
      }

      return;
    }

    if (!releaseDetected) {
      console.log(
        `No release detected for ${targetMonth.key}. Found ${result.matchedDays.length} target-month date matches.`,
      );
      if (result.candidateLines.length > 0) {
        console.log("Candidate lines:");
        for (const line of result.candidateLines) {
          console.log(`- ${line}`);
        }
      }
      return;
    }

    console.log(`Release detected for ${targetMonth.key}. Matched days: ${result.matchedDays.join(", ")}`);

    if (alreadyNotified) {
      console.log("Notification already sent for this target month.");
      return;
    }

    await sendPushoverNotification({
      title: buildReleaseTitle(),
      message: buildReleaseMessage(targetMonth.monthNameLong, targetMonth.year, result.matchedDays),
      priority: 2,
      sound: solidcoreConfig.pushoverReleaseSound,
      url: scheduleUrl,
      urlTitle: "Open solidcore schedule",
    });

    console.log("Pushover alert sent.");
  } finally {
    await context.close();
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
